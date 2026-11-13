from datetime import UTC, datetime

from sqlalchemy import asc, desc, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models import (
    CEFRLevel,
    Flashcard,
    JourneyPhase,
    JourneyStatus,
    JourneyStep,
    JourneyVocabulary,
    Language,
    LanguagePair,
    LearningJourney,
)
from app.schemas import (
    ClarificationAnswerItem,
    GeneratedJourneyCurriculum,
)

CEFR_ORDER = {
    CEFRLevel.A1: 1,
    CEFRLevel.A2: 2,
    CEFRLevel.B1: 3,
    CEFRLevel.B2: 4,
    CEFRLevel.C1: 5,
    CEFRLevel.C2: 6,
}


class JourneyRepository:
    async def create_journey_tree(
        self,
        session: AsyncSession,
        language_pair_id: int | None,
        cefr_level: CEFRLevel,
        purpose_input: str,
        clarifications: list[ClarificationAnswerItem],
        synthesized_prompt: str,
        curriculum: GeneratedJourneyCurriculum,
        ai_model: str,
        ai_provider: str,
    ) -> LearningJourney:
        now = datetime.now(UTC)
        journey = LearningJourney(
            language_pair_id=language_pair_id,
            cefr_level=cefr_level,
            title=curriculum.title,
            purpose_input=purpose_input,
            clarifications_json=[c.model_dump() for c in clarifications],
            synthesized_prompt=synthesized_prompt,
            sector_tag=curriculum.sector_tag,
            summary=curriculum.summary,
            status=JourneyStatus.NOT_STARTED,
            is_pinned=False,
            total_steps=0,
            completed_steps=0,
            ai_model=ai_model,
            ai_provider=ai_provider,
            last_accessed_at=now,
        )
        session.add(journey)
        await session.flush()

        step_counter = 0
        for p_idx, phase_data in enumerate(curriculum.phases, start=1):
            phase = JourneyPhase(
                journey_id=journey.id,
                phase_number=phase_data.phase_number or p_idx,
                title=phase_data.title,
                title_translated=phase_data.title_translated,
                description=phase_data.description,
                milestone_goal=phase_data.milestone_goal,
            )
            session.add(phase)
            await session.flush()

            for step_data in phase_data.steps:
                step_counter += 1
                checkpoint_payload = (
                    [q.model_dump() for q in step_data.checkpoint_questions]
                    if step_data.checkpoint_questions
                    else None
                )
                step = JourneyStep(
                    phase_id=phase.id,
                    journey_id=journey.id,
                    step_order=step_counter,
                    step_type=step_data.step_type,
                    title=step_data.title,
                    title_translated=step_data.title_translated,
                    description=step_data.description,
                    grammar_focus=step_data.grammar_focus,
                    story_topic_prompt=step_data.story_topic_prompt,
                    story_type=step_data.story_type or "dialogue",
                    checkpoint_questions_json=checkpoint_payload,
                    is_completed=False,
                )
                session.add(step)
                await session.flush()

                for vocab_data in step_data.vocabularies:
                    jv = JourneyVocabulary(
                        journey_id=journey.id,
                        step_id=step.id,
                        word=vocab_data.word,
                        translation=vocab_data.translation,
                        part_of_speech=vocab_data.part_of_speech,
                        gender=vocab_data.gender,
                        phonetic=vocab_data.phonetic,
                        example_sentence=vocab_data.example_sentence,
                        example_translation=vocab_data.example_translation,
                        is_mastered=False,
                    )
                    session.add(jv)

        journey.total_steps = step_counter
        await session.commit()
        return await self.get_journey_by_id(session, journey.id)

    async def get_journey_by_id(
        self, session: AsyncSession, journey_id: int
    ) -> LearningJourney | None:
        stmt = (
            select(LearningJourney)
            .where(LearningJourney.id == journey_id)
            .options(
                joinedload(LearningJourney.language_pair).joinedload(LanguagePair.origin_language),
                joinedload(LearningJourney.language_pair).joinedload(LanguagePair.target_language),
                selectinload(LearningJourney.phases)
                .selectinload(JourneyPhase.steps)
                .selectinload(JourneyStep.vocabularies),
                selectinload(LearningJourney.phases)
                .selectinload(JourneyPhase.steps)
                .joinedload(JourneyStep.story),
            )
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_journeys(
        self,
        session: AsyncSession,
        search: str | None = None,
        target_language_code: str | None = None,
        origin_language_code: str | None = None,
        cefr_level: CEFRLevel | None = None,
        status: JourneyStatus | None = None,
        is_pinned: bool | None = None,
        sort_by: str = "recent",
    ) -> list[LearningJourney]:
        stmt = select(LearningJourney).options(
            joinedload(LearningJourney.language_pair).joinedload(LanguagePair.origin_language),
            joinedload(LearningJourney.language_pair).joinedload(LanguagePair.target_language),
            selectinload(LearningJourney.phases)
            .selectinload(JourneyPhase.steps)
            .selectinload(JourneyStep.vocabularies),
        )

        if search and search.strip():
            term = f"%{search.strip()}%"
            vocab_match = exists().where(
                (JourneyVocabulary.journey_id == LearningJourney.id)
                & (
                    JourneyVocabulary.word.ilike(term)
                    | JourneyVocabulary.translation.ilike(term)
                )
            )
            stmt = stmt.where(
                or_(
                    LearningJourney.title.ilike(term),
                    LearningJourney.purpose_input.ilike(term),
                    LearningJourney.sector_tag.ilike(term),
                    LearningJourney.summary.ilike(term),
                    vocab_match,
                )
            )

        if cefr_level:
            stmt = stmt.where(LearningJourney.cefr_level == cefr_level)
        if status:
            stmt = stmt.where(LearningJourney.status == status)
        if is_pinned is not None:
            stmt = stmt.where(LearningJourney.is_pinned.is_(is_pinned))

        if origin_language_code:
            stmt = stmt.where(
                LearningJourney.language_pair.has(
                    LanguagePair.origin_language.has(Language.code == origin_language_code)
                )
            )
        if target_language_code:
            stmt = stmt.where(
                LearningJourney.language_pair.has(
                    LanguagePair.target_language.has(Language.code == target_language_code)
                )
            )

        if sort_by == "newest":
            stmt = stmt.order_by(desc(LearningJourney.created_at), desc(LearningJourney.id))
        elif sort_by == "oldest":
            stmt = stmt.order_by(asc(LearningJourney.created_at), asc(LearningJourney.id))
        elif sort_by == "title_asc":
            stmt = stmt.order_by(asc(LearningJourney.title))
        else:
            stmt = stmt.order_by(desc(LearningJourney.last_accessed_at), desc(LearningJourney.id))

        res = await session.execute(stmt)
        journeys = list(res.scalars().unique().all())

        # Python-side deterministic sorts for derived metrics (progress %, CEFR order)
        if sort_by == "progress_desc":
            journeys.sort(
                key=lambda j: (
                    (j.completed_steps / j.total_steps) if j.total_steps > 0 else 0.0,
                    j.last_accessed_at or j.created_at,
                ),
                reverse=True,
            )
        elif sort_by == "progress_asc":
            journeys.sort(
                key=lambda j: (
                    (j.completed_steps / j.total_steps) if j.total_steps > 0 else 0.0,
                    -(j.id),
                )
            )
        elif sort_by == "level_asc":
            journeys.sort(key=lambda j: (CEFR_ORDER.get(j.cefr_level, 99), j.title.lower()))
        elif sort_by == "level_desc":
            journeys.sort(key=lambda j: (-CEFR_ORDER.get(j.cefr_level, 0), j.title.lower()))

        return journeys

    async def get_saved_flashcard_vocab_ids(
        self, session: AsyncSession, journey_id: int | None = None
    ) -> set[int]:
        stmt = select(Flashcard.journey_vocabulary_id).where(
            Flashcard.journey_vocabulary_id.isnot(None)
        )
        if journey_id is not None:
            stmt = stmt.join(
                JourneyVocabulary,
                Flashcard.journey_vocabulary_id == JourneyVocabulary.id,
            ).where(JourneyVocabulary.journey_id == journey_id)
        res = await session.execute(stmt)
        return {vid for vid in res.scalars().all() if vid is not None}

    async def mark_accessed(
        self, session: AsyncSession, journey: LearningJourney
    ) -> LearningJourney:
        journey.last_accessed_at = datetime.now(UTC)
        if journey.status == JourneyStatus.NOT_STARTED:
            journey.status = JourneyStatus.IN_PROGRESS
        await session.commit()
        await session.refresh(journey)
        return journey

    async def toggle_pin(
        self, session: AsyncSession, journey: LearningJourney
    ) -> bool:
        journey.is_pinned = not journey.is_pinned
        await session.commit()
        return journey.is_pinned

    async def delete_journey(
        self, session: AsyncSession, journey: LearningJourney
    ) -> None:
        await session.delete(journey)
        await session.commit()

    async def get_step(
        self, session: AsyncSession, journey_id: int, step_id: int
    ) -> JourneyStep | None:
        stmt = (
            select(JourneyStep)
            .where(JourneyStep.id == step_id, JourneyStep.journey_id == journey_id)
            .options(
                selectinload(JourneyStep.vocabularies),
                joinedload(JourneyStep.story),
            )
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_phase_vocab_words(
        self, session: AsyncSession, phase_id: int
    ) -> list[str]:
        stmt = (
            select(JourneyVocabulary.word)
            .join(JourneyStep, JourneyVocabulary.step_id == JourneyStep.id)
            .where(JourneyStep.phase_id == phase_id)
            .order_by(JourneyVocabulary.id)
        )
        res = await session.execute(stmt)
        return [w for w in res.scalars().all() if w]

    async def get_vocab_by_id(
        self, session: AsyncSession, vocab_id: int
    ) -> JourneyVocabulary | None:
        stmt = select(JourneyVocabulary).where(JourneyVocabulary.id == vocab_id)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def recalculate_journey_progress(
        self, session: AsyncSession, journey: LearningJourney
    ) -> LearningJourney:
        steps_stmt = select(JourneyStep).where(JourneyStep.journey_id == journey.id)
        steps = list((await session.execute(steps_stmt)).scalars().all())
        total = len(steps)
        completed = sum(1 for s in steps if s.is_completed)
        journey.total_steps = total
        journey.completed_steps = completed
        journey.last_accessed_at = datetime.now(UTC)
        if total > 0 and completed >= total:
            journey.status = JourneyStatus.COMPLETED
        elif completed > 0:
            journey.status = JourneyStatus.IN_PROGRESS
        await session.commit()
        return journey


journey_repo = JourneyRepository()
