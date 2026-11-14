import asyncio
import logging
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    CEFRLevel,
    JourneyStatus,
    JourneyStep,
    JourneyStepType,
    LearningJourney,
)
from app.repositories import flashcard_repo, language_repo
from app.repositories.journey_repo import journey_repo
from app.schemas import (
    CheckpointQuestionItem,
    CheckpointQuestionResult,
    ClarificationAnswerItem,
    FlashcardResponse,
    JourneyBulkFlashcardResponse,
    JourneyClarifyRequest,
    JourneyClarifyResponse,
    JourneyDetailResponse,
    JourneyGenerateRequest,
    JourneyListItemResponse,
    JourneyPhaseResponse,
    JourneyPromptPreviewRequest,
    JourneyPromptPreviewResponse,
    JourneyStepCompleteRequest,
    JourneyStepCompleteResponse,
    JourneyStepPrepareResponse,
    JourneyStepResponse,
    JourneyVocabularyResponse,
    StoryGenerateRequest,
)
from app.services import flashcard_service, story_service
from app.services.ai_service import ai_service
from app.services.tts_service import tts_service

logger = logging.getLogger("linguamaxima.journeys")


class JourneyService:
    async def _resolve_language_names(
        self, session: AsyncSession, origin_code: str, target_code: str
    ) -> tuple[str, str]:
        pair = await language_repo.get_or_create_pair(session, origin_code, target_code)
        origin_name = (
            pair.origin_language.name
            if pair and pair.origin_language
            else origin_code.upper()
        )
        target_name = (
            pair.target_language.name
            if pair and pair.target_language
            else target_code.upper()
        )
        return origin_name, target_name

    def _format_step(
        self, step: JourneyStep, saved_vocab_ids: set[int]
    ) -> JourneyStepResponse:
        vocab_items = [
            JourneyVocabularyResponse(
                id=v.id,
                journey_id=v.journey_id,
                step_id=v.step_id,
                word=v.word,
                translation=v.translation,
                part_of_speech=v.part_of_speech,
                gender=v.gender,
                phonetic=v.phonetic,
                example_sentence=v.example_sentence,
                example_translation=v.example_translation,
                pronunciation_url=v.pronunciation_url,
                is_mastered=v.is_mastered,
                is_saved_as_flashcard=(v.id in saved_vocab_ids),
            )
            for v in (step.vocabularies or [])
        ]

        checkpoint_items: list[CheckpointQuestionItem] = []
        if step.checkpoint_questions_json:
            for q in step.checkpoint_questions_json:
                q_id = str(q.get("id", ""))
                correct = str(q.get("correct_answer", ""))
                wrongs = [str(w) for w in (q.get("wrong_answers") or [])]
                options = [correct] + wrongs
                options.sort(key=lambda opt: hash(f"{q_id}:{opt}"))
                checkpoint_items.append(
                    CheckpointQuestionItem(
                        id=q_id,
                        question_type=str(q.get("question_type", "multiple_choice")),
                        question=str(q.get("question", "")),
                        question_translated=q.get("question_translated"),
                        options=options,
                        explanation=q.get("explanation"),
                    )
                )

        return JourneyStepResponse(
            id=step.id,
            phase_id=step.phase_id,
            journey_id=step.journey_id,
            step_order=step.step_order,
            step_type=step.step_type,
            title=step.title,
            title_translated=step.title_translated,
            description=step.description,
            grammar_focus=step.grammar_focus,
            story_type=step.story_type,
            story_id=step.story_id,
            is_story_prepared=(step.story_id is not None),
            is_completed=step.is_completed,
            completed_at=step.completed_at,
            best_score=step.best_score,
            vocabularies=vocab_items,
            checkpoint_questions=checkpoint_items,
        )

    def _compute_journey_metrics(self, journey: LearningJourney) -> dict:
        all_steps: list[JourneyStep] = []
        for phase in journey.phases or []:
            all_steps.extend(phase.steps or [])
        all_steps.sort(key=lambda s: s.step_order)

        total_steps = journey.total_steps or len(all_steps)
        completed_steps = sum(1 for s in all_steps if s.is_completed)
        progress_pct = (
            int(round((completed_steps / total_steps) * 100)) if total_steps > 0 else 0
        )

        total_vocab = 0
        mastered_vocab = 0
        for s in all_steps:
            vocabs = s.vocabularies or []
            total_vocab += len(vocabs)
            mastered_vocab += sum(1 for v in vocabs if v.is_mastered)

        next_step = next((s for s in all_steps if not s.is_completed), None)
        return {
            "total_steps": total_steps,
            "completed_steps": completed_steps,
            "progress_percentage": progress_pct,
            "total_vocab_count": total_vocab,
            "mastered_vocab_count": mastered_vocab,
            "next_step_id": next_step.id if next_step else None,
            "next_step_title": next_step.title if next_step else None,
        }

    def _format_list_item(self, journey: LearningJourney) -> JourneyListItemResponse:
        metrics = self._compute_journey_metrics(journey)
        return JourneyListItemResponse(
            id=journey.id,
            title=journey.title,
            purpose_input=journey.purpose_input,
            sector_tag=journey.sector_tag,
            summary=journey.summary,
            cefr_level=journey.cefr_level,
            language_pair=journey.language_pair,
            status=journey.status,
            is_pinned=journey.is_pinned,
            total_steps=metrics["total_steps"],
            completed_steps=metrics["completed_steps"],
            progress_percentage=metrics["progress_percentage"],
            total_vocab_count=metrics["total_vocab_count"],
            mastered_vocab_count=metrics["mastered_vocab_count"],
            next_step_id=metrics["next_step_id"],
            next_step_title=metrics["next_step_title"],
            last_accessed_at=journey.last_accessed_at,
            created_at=journey.created_at,
        )

    def _format_detail(
        self, journey: LearningJourney, saved_vocab_ids: set[int]
    ) -> JourneyDetailResponse:
        metrics = self._compute_journey_metrics(journey)
        clarifications = [
            ClarificationAnswerItem.model_validate(c)
            for c in (journey.clarifications_json or [])
        ]
        phases_resp = [
            JourneyPhaseResponse(
                id=phase.id,
                journey_id=phase.journey_id,
                phase_number=phase.phase_number,
                title=phase.title,
                title_translated=phase.title_translated,
                description=phase.description,
                milestone_goal=phase.milestone_goal,
                steps=[
                    self._format_step(step, saved_vocab_ids)
                    for step in (phase.steps or [])
                ],
            )
            for phase in (journey.phases or [])
        ]

        return JourneyDetailResponse(
            id=journey.id,
            title=journey.title,
            purpose_input=journey.purpose_input,
            sector_tag=journey.sector_tag,
            summary=journey.summary,
            cefr_level=journey.cefr_level,
            language_pair=journey.language_pair,
            status=journey.status,
            is_pinned=journey.is_pinned,
            total_steps=metrics["total_steps"],
            completed_steps=metrics["completed_steps"],
            progress_percentage=metrics["progress_percentage"],
            total_vocab_count=metrics["total_vocab_count"],
            mastered_vocab_count=metrics["mastered_vocab_count"],
            next_step_id=metrics["next_step_id"],
            next_step_title=metrics["next_step_title"],
            last_accessed_at=journey.last_accessed_at,
            created_at=journey.created_at,
            clarifications=clarifications,
            synthesized_prompt=journey.synthesized_prompt,
            ai_model=journey.ai_model,
            ai_provider=journey.ai_provider,
            phases=phases_resp,
        )

    async def clarify_purpose(
        self, session: AsyncSession, req: JourneyClarifyRequest
    ) -> JourneyClarifyResponse:
        origin_name, target_name = await self._resolve_language_names(
            session, req.origin_language_code, req.target_language_code
        )
        res = await ai_service.evaluate_journey_clarification(
            purpose=req.purpose.strip(),
            answers=req.answers,
            round_num=req.round,
            target_lang=target_name,
            origin_lang=origin_name,
        )
        return JourneyClarifyResponse(
            is_sufficient=res.is_sufficient,
            confidence_reason=res.confidence_reason,
            questions=res.questions,
            draft_summary=res.draft_summary,
            recommended_sector_tag=res.recommended_sector_tag,
            synthesized_prompt=res.synthesized_prompt,
        )

    async def preview_prompt(
        self, session: AsyncSession, req: JourneyPromptPreviewRequest
    ) -> JourneyPromptPreviewResponse:
        origin_name, target_name = await self._resolve_language_names(
            session, req.origin_language_code, req.target_language_code
        )
        synth = await ai_service.synthesize_learning_prompt(
            purpose=req.purpose.strip(),
            clarifications=req.clarifications,
            cefr_level=req.cefr_level,
            target_lang=target_name,
            origin_lang=origin_name,
        )
        return JourneyPromptPreviewResponse(
            synthesized_prompt=synth.synthesized_prompt,
            summary=synth.summary,
            recommended_sector_tag=synth.recommended_sector_tag,
            estimated_phases=3,
            estimated_vocab_count=24,
        )

    async def generate_journey(
        self, session: AsyncSession, req: JourneyGenerateRequest
    ) -> JourneyDetailResponse:
        pair = await language_repo.get_or_create_pair(
            session, req.origin_language_code, req.target_language_code
        )
        origin_name = (
            pair.origin_language.name
            if pair and pair.origin_language
            else req.origin_language_code.upper()
        )
        target_name = (
            pair.target_language.name
            if pair and pair.target_language
            else req.target_language_code.upper()
        )

        if req.custom_prompt_override and req.custom_prompt_override.strip():
            synthesized_prompt = req.custom_prompt_override.strip()
        else:
            synth = await ai_service.synthesize_learning_prompt(
                purpose=req.purpose.strip(),
                clarifications=req.clarifications,
                cefr_level=req.cefr_level,
                target_lang=target_name,
                origin_lang=origin_name,
            )
            synthesized_prompt = synth.synthesized_prompt

        curriculum, ai_model, ai_provider = await ai_service.generate_journey_curriculum(
            synthesized_prompt=synthesized_prompt,
            purpose=req.purpose.strip(),
            cefr_level=req.cefr_level,
            target_lang=target_name,
            origin_lang=origin_name,
        )

        journey = await journey_repo.create_journey_tree(
            session=session,
            language_pair_id=pair.id if pair else None,
            cefr_level=req.cefr_level,
            purpose_input=req.purpose.strip(),
            clarifications=req.clarifications,
            synthesized_prompt=synthesized_prompt,
            curriculum=curriculum,
            ai_model=ai_model,
            ai_provider=ai_provider,
        )
        saved_ids = await journey_repo.get_saved_flashcard_vocab_ids(session, journey.id)
        return self._format_detail(journey, saved_ids)

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
    ) -> list[JourneyListItemResponse]:
        journeys = await journey_repo.list_journeys(
            session=session,
            search=search,
            target_language_code=target_language_code,
            origin_language_code=origin_language_code,
            cefr_level=cefr_level,
            status=status,
            is_pinned=is_pinned,
            sort_by=sort_by,
        )
        return [self._format_list_item(j) for j in journeys]

    async def get_journey_detail(
        self, session: AsyncSession, journey_id: int
    ) -> JourneyDetailResponse:
        journey = await journey_repo.get_journey_by_id(session, journey_id)
        if not journey:
            raise HTTPException(status_code=404, detail="Learning journey not found")
        saved_ids = await journey_repo.get_saved_flashcard_vocab_ids(session, journey.id)
        return self._format_detail(journey, saved_ids)

    async def activate_journey(
        self, session: AsyncSession, journey_id: int
    ) -> JourneyListItemResponse:
        journey = await journey_repo.get_journey_by_id(session, journey_id)
        if not journey:
            raise HTTPException(status_code=404, detail="Learning journey not found")
        await journey_repo.mark_accessed(session, journey)
        refreshed = await journey_repo.get_journey_by_id(session, journey_id)
        return self._format_list_item(refreshed)

    async def toggle_pin(
        self, session: AsyncSession, journey_id: int
    ) -> bool:
        journey = await journey_repo.get_journey_by_id(session, journey_id)
        if not journey:
            raise HTTPException(status_code=404, detail="Learning journey not found")
        return await journey_repo.toggle_pin(session, journey)

    async def delete_journey(
        self, session: AsyncSession, journey_id: int
    ) -> None:
        journey = await journey_repo.get_journey_by_id(session, journey_id)
        if not journey:
            raise HTTPException(status_code=404, detail="Learning journey not found")
        await journey_repo.delete_journey(session, journey)

    async def prepare_step(
        self, session: AsyncSession, journey_id: int, step_id: int
    ) -> JourneyStepPrepareResponse:
        journey = await journey_repo.get_journey_by_id(session, journey_id)
        if not journey:
            raise HTTPException(status_code=404, detail="Learning journey not found")

        step = await journey_repo.get_step(session, journey_id, step_id)
        if not step:
            raise HTTPException(status_code=404, detail="Journey step not found")

        await journey_repo.mark_accessed(session, journey)

        target_code = (
            journey.language_pair.target_language.code
            if journey.language_pair and journey.language_pair.target_language
            else "de"
        )
        origin_code = (
            journey.language_pair.origin_language.code
            if journey.language_pair and journey.language_pair.origin_language
            else "id"
        )

        newly_generated = False
        if step.step_type == JourneyStepType.STORY_LESSON and step.story_id is None:
            phase_words = await journey_repo.get_phase_vocab_words(session, step.phase_id)
            story_req = StoryGenerateRequest(
                cefr_level=journey.cefr_level,
                category_slug="daily-life",
                topic_hint=step.story_topic_prompt or step.title,
                target_language_code=target_code,
                origin_language_code=origin_code,
                story_type=step.story_type or "dialogue",
            )
            generated_story = await story_service.generate_and_save_story(
                session=session,
                req=story_req,
                is_journey_story=True,
                required_vocabulary=phase_words,
            )
            step.story_id = generated_story.id
            await session.commit()
            newly_generated = True
        elif step.step_type == JourneyStepType.VOCAB_PACK and step.vocabularies:
            missing_audio = [v for v in step.vocabularies if not v.pronunciation_url]
            if missing_audio:
                async def populate_audio(v_item):
                    url = await tts_service.generate_audio(text=v_item.word, language=target_code)
                    if url:
                        v_item.pronunciation_url = url

                await asyncio.gather(*[populate_audio(v) for v in missing_audio], return_exceptions=True)
                await session.commit()

        refreshed_step = await journey_repo.get_step(session, journey_id, step_id)
        saved_ids = await journey_repo.get_saved_flashcard_vocab_ids(session, journey_id)
        return JourneyStepPrepareResponse(
            step=self._format_step(refreshed_step, saved_ids),
            story_id=refreshed_step.story_id,
            newly_generated=newly_generated,
        )

    async def complete_step(
        self,
        session: AsyncSession,
        journey_id: int,
        step_id: int,
        req: JourneyStepCompleteRequest,
    ) -> JourneyStepCompleteResponse:
        journey = await journey_repo.get_journey_by_id(session, journey_id)
        if not journey:
            raise HTTPException(status_code=404, detail="Learning journey not found")

        step = await journey_repo.get_step(session, journey_id, step_id)
        if not step:
            raise HTTPException(status_code=404, detail="Journey step not found")

        results: list[CheckpointQuestionResult] = []
        score_pct: int | None = None
        passed = True

        if step.step_type == JourneyStepType.CHECKPOINT and step.checkpoint_questions_json:
            q_map = {str(q.get("id", "")): q for q in step.checkpoint_questions_json}
            correct_count = 0
            for ans in req.quiz_answers:
                q_data = q_map.get(ans.question_id)
                if not q_data:
                    continue
                correct_ans = str(q_data.get("correct_answer", ""))
                is_correct = ans.selected_answer.strip().lower() == correct_ans.strip().lower()
                if is_correct:
                    correct_count += 1
                results.append(
                    CheckpointQuestionResult(
                        question_id=ans.question_id,
                        question=str(q_data.get("question", "")),
                        selected_answer=ans.selected_answer,
                        correct_answer=correct_ans,
                        is_correct=is_correct,
                        explanation=q_data.get("explanation"),
                    )
                )
            total_q = max(1, len(q_map))
            score_pct = int(round((correct_count / total_q) * 100))
            passed = score_pct >= 60
            if step.best_score is None or score_pct > step.best_score:
                step.best_score = score_pct

        if passed or step.step_type != JourneyStepType.CHECKPOINT:
            step.is_completed = True
            step.completed_at = datetime.now(UTC)
            for v in step.vocabularies or []:
                v.is_mastered = True

        await session.commit()
        updated_journey = await journey_repo.recalculate_journey_progress(session, journey)

        return JourneyStepCompleteResponse(
            step_id=step.id,
            is_completed=step.is_completed,
            score_percentage=score_pct,
            passed=passed,
            results=results,
            journey_completed_steps=updated_journey.completed_steps,
            journey_total_steps=updated_journey.total_steps,
            journey_status=updated_journey.status,
        )

    async def save_vocab_to_flashcard(
        self, session: AsyncSession, vocab_id: int
    ) -> FlashcardResponse:
        vocab = await journey_repo.get_vocab_by_id(session, vocab_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Journey vocabulary not found")
        return await flashcard_service.save_flashcard(
            session, journey_vocabulary_id=vocab_id
        )

    async def save_step_vocabs_bulk(
        self, session: AsyncSession, journey_id: int, step_id: int
    ) -> JourneyBulkFlashcardResponse:
        step = await journey_repo.get_step(session, journey_id, step_id)
        if not step:
            raise HTTPException(status_code=404, detail="Journey step not found")

        saved_count = 0
        already_saved_count = 0
        flashcard_ids: list[int] = []
        for vocab in step.vocabularies or []:
            fc, created = await flashcard_repo.save_journey_vocabulary_to_flashcard(
                session, vocab.id
            )
            flashcard_ids.append(fc.id)
            if created:
                saved_count += 1
            else:
                already_saved_count += 1

        return JourneyBulkFlashcardResponse(
            saved_count=saved_count,
            already_saved_count=already_saved_count,
            flashcard_ids=flashcard_ids,
        )


journey_service = JourneyService()
