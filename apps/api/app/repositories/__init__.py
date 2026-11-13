import math
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models import (
    Category,
    CEFRLevel,
    Flashcard,
    GrammarTip,
    Language,
    LanguagePair,
    Quiz,
    Story,
    UserProgress,
    Vocabulary,
    Word,
)
from app.schemas import GeneratedStoryBundle


# ----------------- Languages Repo -----------------
class LanguageRepository:
    async def get_all_languages(self, session: AsyncSession) -> list[Language]:
        stmt = select(Language).order_by(Language.name)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_code(self, session: AsyncSession, code: str) -> Language | None:
        stmt = select(Language).where(Language.code == code)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_create_language(
        self,
        session: AsyncSession,
        code: str,
        name: str,
        native_name: str | None = None,
    ) -> Language:
        lang = await self.get_by_code(session, code)
        if not lang:
            lang = Language(code=code, name=name, native_name=native_name)
            session.add(lang)
            await session.commit()
            await session.refresh(lang)
        return lang

    async def get_all_pairs(self, session: AsyncSession) -> list[LanguagePair]:
        stmt = select(LanguagePair).options(
            joinedload(LanguagePair.origin_language),
            joinedload(LanguagePair.target_language),
        ).where(LanguagePair.is_active.is_(True))
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_pair_by_codes(
        self, session: AsyncSession, origin_code: str, target_code: str
    ) -> LanguagePair | None:
        stmt = (
            select(LanguagePair)
            .join(Language, LanguagePair.origin_language_id == Language.id)
            .where(Language.code == origin_code)
            .options(
                joinedload(LanguagePair.origin_language),
                joinedload(LanguagePair.target_language),
            )
        )
        result = await session.execute(stmt)
        for pair in result.scalars().all():
            if pair.target_language and pair.target_language.code == target_code:
                return pair
        return None

    async def get_or_create_pair(
        self, session: AsyncSession, origin_code: str, target_code: str
    ) -> LanguagePair:
        existing = await self.get_pair_by_codes(session, origin_code, target_code)
        if existing:
            return existing

        origin = await self.get_by_code(session, origin_code)
        if not origin:
            origin = Language(code=origin_code, name=origin_code.upper(), native_name=origin_code.upper())
            session.add(origin)
            await session.flush()

        target = await self.get_by_code(session, target_code)
        if not target:
            target = Language(code=target_code, name=target_code.upper(), native_name=target_code.upper())
            session.add(target)
            await session.flush()

        pair = LanguagePair(
            origin_language_id=origin.id,
            target_language_id=target.id,
            is_active=True,
        )
        session.add(pair)
        await session.commit()
        return await self.get_pair_by_codes(session, origin_code, target_code)

# ----------------- Category Repo -----------------
class CategoryRepository:
    async def get_all(self, session: AsyncSession) -> list[Category]:
        stmt = select(Category).order_by(Category.name)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_slug(self, session: AsyncSession, slug: str) -> Category | None:
        stmt = select(Category).where(Category.slug == slug)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

# ----------------- Story Repo -----------------
class StoryRepository:
    async def list_stories(
        self,
        session: AsyncSession,
        cefr_level: CEFRLevel | None = None,
        category_slug: str | None = None,
        search: str | None = None,
        origin_language_code: str | None = None,
        target_language_code: str | None = None,
        language_pair_id: int | None = None,
        is_favorite: bool | None = None,
        is_completed: bool | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Story], int]:
        query = select(Story).where(Story.is_published.is_(True))

        if cefr_level:
            query = query.where(Story.cefr_level == cefr_level)
        if category_slug:
            query = query.join(Category).where(Category.slug == category_slug)
        if search:
            query = query.where(
                (Story.title.ilike(f"%{search}%")) | (Story.title_translated.ilike(f"%{search}%"))
            )

        if language_pair_id:
            query = query.where(Story.language_pair_id == language_pair_id)
        else:
            if origin_language_code:
                query = query.where(
                    Story.language_pair.has(
                        LanguagePair.origin_language.has(Language.code == origin_language_code)
                    )
                )
            if target_language_code:
                query = query.where(
                    Story.language_pair.has(
                        LanguagePair.target_language.has(Language.code == target_language_code)
                    )
                )

        if is_favorite is True or is_completed is True:
            query = query.join(UserProgress, UserProgress.story_id == Story.id)
            if is_favorite is True:
                query = query.where(UserProgress.is_favorite.is_(True))
            if is_completed is True:
                query = query.where(UserProgress.completed_at.isnot(None))
        elif is_favorite is False or is_completed is False:
            query = query.outerjoin(UserProgress, UserProgress.story_id == Story.id)
            if is_favorite is False:
                query = query.where((UserProgress.is_favorite.is_(False)) | (UserProgress.id.is_(None)))
            if is_completed is False:
                query = query.where((UserProgress.completed_at.is_(None)) | (UserProgress.id.is_(None)))

        # Count total
        count_stmt = select(func.count()).select_from(query.subquery())
        count_res = await session.execute(count_stmt)
        total = count_res.scalar() or 0

        # Fetch page with category and progress
        query = (
            query.options(
                joinedload(Story.category),
                joinedload(Story.language_pair),
                selectinload(Story.progress),
            )
            .order_by(desc(Story.created_at))
            .limit(limit)
            .offset(offset)
        )

        res = await session.execute(query)
        stories = list(res.scalars().all())
        return stories, total

    async def get_story_by_id(self, session: AsyncSession, story_id: int) -> Story | None:
        stmt = (
            select(Story)
            .where(Story.id == story_id)
            .options(
                joinedload(Story.category),
                joinedload(Story.language_pair),
                selectinload(Story.vocabulary),
                selectinload(Story.grammar_tips),
                selectinload(Story.quizzes),
                selectinload(Story.progress),
            )
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def create_story_bundle(
        self,
        session: AsyncSession,
        bundle: GeneratedStoryBundle,
        cefr_level: CEFRLevel,
        category_id: int | None,
        language_pair_id: int | None,
        image_url: str | None,
        audio_url: str | None,
        ai_model: str,
        ai_provider: str,
    ) -> Story:
        word_count = len(bundle.content.split())
        estimated_minutes = max(1, math.ceil(word_count / 80))

        story = Story(
            language_pair_id=language_pair_id,
            category_id=category_id,
            cefr_level=cefr_level,
            title=bundle.title,
            title_translated=bundle.title_translated,
            content=bundle.content,
            content_translated=bundle.content_translated,
            summary=bundle.summary,
            image_url=image_url,
            audio_url=audio_url,
            estimated_reading_minutes=estimated_minutes,
            word_count=word_count,
            ai_model=ai_model,
            ai_provider=ai_provider,
            is_published=True,
        )
        session.add(story)
        await session.flush()

        # Add vocabulary
        for item in bundle.vocabulary:
            vocab = Vocabulary(
                story_id=story.id,
                word=item.word,
                translation=item.translation,
                part_of_speech=item.part_of_speech,
                gender=item.gender,
                example_sentence=item.example_sentence,
                example_translation=item.example_translation,
                difficulty_rank=item.difficulty_rank,
                pronunciation_url=item.pronunciation_url,
            )
            session.add(vocab)

        # Add grammar tips
        for idx, tip in enumerate(bundle.grammar_tips):
            gt = GrammarTip(
                story_id=story.id,
                title=tip.title,
                explanation=tip.explanation,
                explanation_translated=tip.explanation_translated,
                example=tip.example,
                example_translation=tip.example_translation,
                sort_order=idx,
            )
            session.add(gt)

        # Add quizzes
        for idx, q in enumerate(bundle.quiz_questions):
            quiz = Quiz(
                story_id=story.id,
                question_type=q.question_type,
                question=q.question,
                question_translated=q.question_translated,
                correct_answer=q.correct_answer,
                wrong_answers=q.wrong_answers,
                explanation=q.explanation,
                sort_order=idx,
            )
            session.add(quiz)

        # Initialize user progress record
        progress = UserProgress(
            story_id=story.id,
            is_favorite=False,
            quiz_attempts=0,
        )
        session.add(progress)

        await session.commit()
        return await self.get_story_by_id(session, story.id)

    async def toggle_favorite(self, session: AsyncSession, story_id: int) -> bool:
        stmt = select(UserProgress).where(UserProgress.story_id == story_id)
        res = await session.execute(stmt)
        progress = res.scalar_one_or_none()
        if not progress:
            progress = UserProgress(story_id=story_id, is_favorite=True)
            session.add(progress)
            await session.commit()
            return True

        progress.is_favorite = not progress.is_favorite
        await session.commit()
        return progress.is_favorite

    async def record_quiz_submission(
        self, session: AsyncSession, story_id: int, score_percentage: int
    ) -> UserProgress:
        stmt = select(UserProgress).where(UserProgress.story_id == story_id)
        res = await session.execute(stmt)
        progress = res.scalar_one_or_none()
        now = datetime.now(UTC)

        if not progress:
            progress = UserProgress(
                story_id=story_id,
                completed_at=now,
                quiz_score=score_percentage,
                quiz_attempts=1,
                last_accessed_at=now,
            )
            session.add(progress)
        else:
            progress.completed_at = now
            progress.quiz_attempts = (progress.quiz_attempts or 0) + 1
            if progress.quiz_score is None or score_percentage > progress.quiz_score:
                progress.quiz_score = score_percentage
            progress.last_accessed_at = now

        await session.commit()
        await session.refresh(progress)
        return progress

    async def mark_story_completed(
        self, session: AsyncSession, story_id: int
    ) -> UserProgress | None:
        story_exists = (
            await session.execute(select(Story.id).where(Story.id == story_id))
        ).scalar_one_or_none()
        if not story_exists:
            return None

        stmt = select(UserProgress).where(UserProgress.story_id == story_id)
        progress = (await session.execute(stmt)).scalar_one_or_none()
        now = datetime.now(UTC)

        if not progress:
            progress = UserProgress(
                story_id=story_id,
                completed_at=now,
                last_accessed_at=now,
            )
            session.add(progress)
        else:
            if progress.completed_at is None:
                progress.completed_at = now
            progress.last_accessed_at = now

        await session.commit()
        await session.refresh(progress)
        return progress

# ----------------- Flashcard Repo -----------------
def _flashcard_language_condition(
    origin_language_code: str | None = None,
    target_language_code: str | None = None,
):
    """Build an OR condition matching flashcards from either story vocabulary or target-language dictionary words."""
    vocab_conds = []
    if target_language_code:
        vocab_conds.append(
            Story.language_pair.has(
                LanguagePair.target_language.has(Language.code == target_language_code)
            )
        )
    if origin_language_code:
        vocab_conds.append(
            Story.language_pair.has(
                LanguagePair.origin_language.has(Language.code == origin_language_code)
            )
        )

    branches = []
    if vocab_conds:
        branches.append(
            Flashcard.vocabulary.has(Vocabulary.story.has(and_(*vocab_conds)))
        )
    if target_language_code:
        branches.append(
            Flashcard.word.has(Word.language.has(Language.code == target_language_code))
        )
    elif origin_language_code:
        branches.append(Flashcard.word_id.isnot(None))

    return or_(*branches) if branches else None


class FlashcardRepository:
    async def get_due_flashcards(
        self,
        session: AsyncSession,
        now: datetime | None = None,
        origin_language_code: str | None = None,
        target_language_code: str | None = None,
    ) -> list[Flashcard]:
        if now is None:
            now = datetime.now(UTC)
        stmt = select(Flashcard).where(Flashcard.next_review <= now)
        lang_cond = _flashcard_language_condition(
            origin_language_code=origin_language_code,
            target_language_code=target_language_code,
        )
        if lang_cond is not None:
            stmt = stmt.where(lang_cond)
        stmt = (
            stmt.options(
                joinedload(Flashcard.vocabulary).joinedload(Vocabulary.story),
                joinedload(Flashcard.word).joinedload(Word.language),
            )
            .order_by(Flashcard.next_review)
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())

    async def get_all_flashcards(
        self,
        session: AsyncSession,
        search: str | None = None,
        origin_language_code: str | None = None,
        target_language_code: str | None = None,
    ) -> list[Flashcard]:
        stmt = (
            select(Flashcard)
            .outerjoin(Vocabulary, Flashcard.vocabulary_id == Vocabulary.id)
            .outerjoin(Word, Flashcard.word_id == Word.id)
        )
        if search:
            stmt = stmt.where(
                (Vocabulary.word.ilike(f"%{search}%"))
                | (Vocabulary.translation.ilike(f"%{search}%"))
                | (Word.lemma.ilike(f"%{search}%"))
                | (Word.translation.ilike(f"%{search}%"))
            )
        lang_cond = _flashcard_language_condition(
            origin_language_code=origin_language_code,
            target_language_code=target_language_code,
        )
        if lang_cond is not None:
            stmt = stmt.where(lang_cond)
        stmt = (
            stmt.options(
                joinedload(Flashcard.vocabulary).joinedload(Vocabulary.story),
                joinedload(Flashcard.word).joinedload(Word.language),
            )
            .order_by(desc(Flashcard.created_at))
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())

    async def get_saved_vocabulary_ids(
        self, session: AsyncSession, vocab_ids: list[int]
    ) -> set[int]:
        if not vocab_ids:
            return set()
        stmt = select(Flashcard.vocabulary_id).where(
            Flashcard.vocabulary_id.in_(vocab_ids)
        )
        res = await session.execute(stmt)
        return {row for row in res.scalars().all() if row is not None}

    async def get_saved_word_ids(
        self, session: AsyncSession, word_ids: list[int]
    ) -> set[int]:
        if not word_ids:
            return set()
        stmt = select(Flashcard.word_id).where(Flashcard.word_id.in_(word_ids))
        res = await session.execute(stmt)
        return {row for row in res.scalars().all() if row is not None}

    async def delete_by_id(self, session: AsyncSession, flashcard_id: int) -> bool:
        flashcard = (
            await session.execute(
                select(Flashcard).where(Flashcard.id == flashcard_id)
            )
        ).scalar_one_or_none()
        if not flashcard:
            return False
        await session.delete(flashcard)
        await session.commit()
        return True

    async def save_vocabulary_to_flashcard(
        self, session: AsyncSession, vocabulary_id: int
    ) -> Flashcard:
        stmt = select(Flashcard).where(Flashcard.vocabulary_id == vocabulary_id)
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        flashcard = Flashcard(
            vocabulary_id=vocabulary_id,
            word_id=None,
            ease_factor=2.5,
            interval_days=0,
            repetitions=0,
            next_review=datetime.now(UTC),
        )
        session.add(flashcard)
        await session.commit()
        await session.refresh(flashcard)
        return flashcard

    async def save_word_to_flashcard(
        self, session: AsyncSession, word_id: int
    ) -> Flashcard:
        stmt = select(Flashcard).where(Flashcard.word_id == word_id)
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        flashcard = Flashcard(
            vocabulary_id=None,
            word_id=word_id,
            ease_factor=2.5,
            interval_days=0,
            repetitions=0,
            next_review=datetime.now(UTC),
        )
        session.add(flashcard)
        await session.commit()
        await session.refresh(flashcard)
        return flashcard

    async def get_by_id(self, session: AsyncSession, flashcard_id: int) -> Flashcard | None:
        stmt = (
            select(Flashcard)
            .where(Flashcard.id == flashcard_id)
            .options(
                joinedload(Flashcard.vocabulary).joinedload(Vocabulary.story),
                joinedload(Flashcard.word).joinedload(Word.language),
            )
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def update_flashcard(
        self,
        session: AsyncSession,
        flashcard_id: int,
        ease_factor: float,
        interval_days: int,
        repetitions: int,
        next_review: datetime,
    ) -> Flashcard | None:
        flashcard = await self.get_by_id(session, flashcard_id)
        if not flashcard:
            return None
        flashcard.ease_factor = ease_factor
        flashcard.interval_days = interval_days
        flashcard.repetitions = repetitions
        flashcard.next_review = next_review
        flashcard.last_reviewed = datetime.now(UTC)
        await session.commit()
        await session.refresh(flashcard)
        return flashcard

# ----------------- Word Repo -----------------
POS_CANONICAL_MAP: dict[str, list[str]] = {
    "noun": ["noun"],
    "verb": ["verb"],
    "adjective": ["adjective", "adnominal"],
    "adverb": ["adverb"],
    "pronoun": ["pron", "pronoun"],
    "article": ["article", "det"],
    "preposition": ["preposition", "postp", "prep_phrase"],
    "conjunction": ["conjunction"],
    "particle": ["particle"],
    "numeral": ["num", "counter", "classifier"],
    "interjection": ["intj", "interjection"],
    "phrase": ["phrase", "idiom", "proverb"],
    "affix": ["prefix", "suffix", "infix", "interfix", "affix"],
}

RAW_TO_CANONICAL_POS: dict[str, str] = {
    raw: canonical
    for canonical, raw_list in POS_CANONICAL_MAP.items()
    for raw in raw_list
}

# ----------------- Word Repo -----------------
class WordRepository:
    async def list_words(
        self,
        session: AsyncSession,
        language_code: str | None = None,
        normalized_level: CEFRLevel | None = None,
        part_of_speech: str | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Word], int]:
        stmt = select(Word).join(Language, Word.language_id == Language.id)
        count_stmt = select(func.count(Word.id)).join(Language, Word.language_id == Language.id)

        conditions = []
        if language_code:
            conditions.append(Language.code == language_code)
        if normalized_level:
            conditions.append(Word.normalized_level == normalized_level)
        if part_of_speech and part_of_speech.lower() != "all":
            clean_pos = part_of_speech.strip().lower()
            if clean_pos in POS_CANONICAL_MAP:
                raw_tags = POS_CANONICAL_MAP[clean_pos]
                conditions.append(func.lower(Word.part_of_speech).in_(raw_tags))
            elif clean_pos in RAW_TO_CANONICAL_POS:
                canonical = RAW_TO_CANONICAL_POS[clean_pos]
                raw_tags = POS_CANONICAL_MAP[canonical]
                conditions.append(func.lower(Word.part_of_speech).in_(raw_tags))
            else:
                conditions.append(Word.part_of_speech.ilike(part_of_speech.strip()))
        if search and search.strip():
            term = f"%{search.strip()}%"
            conditions.append((Word.lemma.ilike(term)) | (Word.translation.ilike(term)))

        if conditions:
            stmt = stmt.where(and_(*conditions))
            count_stmt = count_stmt.where(and_(*conditions))

        stmt = stmt.options(joinedload(Word.language)).order_by(
            Word.normalized_level,
            Word.frequency_rank.nulls_last(),
            Word.lemma,
            Word.id,
        ).limit(limit).offset(offset)

        total_res = await session.execute(count_stmt)
        total = total_res.scalar() or 0

        res = await session.execute(stmt)
        words = list(res.scalars().all())

        return words, total

    async def get_by_id(self, session: AsyncSession, word_id: int) -> Word | None:
        stmt = select(Word).where(Word.id == word_id).options(joinedload(Word.language))
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_filter_meta(self, session: AsyncSession, language_code: str):
        lang = (
            await session.execute(select(Language).where(Language.code == language_code))
        ).scalar_one_or_none()
        if not lang:
            return None

        # Level counts
        level_stmt = (
            select(Word.normalized_level, Word.native_level, func.count(Word.id))
            .where(Word.language_id == lang.id)
            .group_by(Word.normalized_level, Word.native_level)
            .order_by(Word.normalized_level)
        )
        level_rows = (await session.execute(level_stmt)).all()

        # Group levels by normalized level
        levels_map = {}
        for norm_lvl, nat_lvl, cnt in level_rows:
            key = norm_lvl.value if hasattr(norm_lvl, "value") else str(norm_lvl)
            label = nat_lvl if nat_lvl else key
            if key not in levels_map:
                levels_map[key] = {"key": key, "label": label, "count": cnt}
            else:
                levels_map[key]["count"] += cnt

        # POS counts aggregated into canonical groups
        pos_stmt = (
            select(Word.part_of_speech, func.count(Word.id))
            .where(Word.language_id == lang.id)
            .group_by(Word.part_of_speech)
        )
        pos_rows = (await session.execute(pos_stmt)).all()

        canonical_counts: dict[str, int] = {}
        for raw_pos, cnt in pos_rows:
            if not raw_pos:
                continue
            raw_key = str(raw_pos).strip().lower()
            canonical_key = RAW_TO_CANONICAL_POS.get(raw_key, raw_key)
            canonical_counts[canonical_key] = canonical_counts.get(canonical_key, 0) + cnt

        pos_list = [
            {"key": k, "label": k.capitalize(), "count": v}
            for k, v in sorted(canonical_counts.items(), key=lambda item: item[1], reverse=True)
            if v > 0
        ]

        total_words_stmt = select(func.count(Word.id)).where(Word.language_id == lang.id)
        total_words = (await session.execute(total_words_stmt)).scalar() or 0

        # Fill any missing levels with 0 count
        all_levels = ["A1", "A2", "B1", "B2", "C1", "C2"]
        final_levels = []
        for lvl in all_levels:
            if lvl in levels_map:
                final_levels.append(levels_map[lvl])
            else:
                final_levels.append({"key": lvl, "label": lvl, "count": 0})

        return {
            "language_code": lang.code,
            "language_name": lang.name,
            "proficiency_framework": lang.proficiency_framework,
            "total_words": total_words,
            "levels": final_levels,
            "parts_of_speech": pos_list,
        }

# ----------------- Progress Repo -----------------
def _calculate_streak_days(
    timestamps: list[datetime], tz_offset_minutes: int = 0
) -> int:
    """Count consecutive active local dates ending today or yesterday."""
    offset = timedelta(minutes=tz_offset_minutes)
    active_dates = set()
    for ts in timestamps:
        if ts is None:
            continue
        ts_utc = ts.replace(tzinfo=UTC) if ts.tzinfo is None else ts.astimezone(UTC)
        active_dates.add((ts_utc + offset).date())

    if not active_dates:
        return 0

    today = (datetime.now(UTC) + offset).date()
    if today in active_dates:
        cursor = today
    elif (today - timedelta(days=1)) in active_dates:
        cursor = today - timedelta(days=1)
    else:
        return 0

    streak = 0
    while cursor in active_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


class ProgressRepository:
    async def get_summary(
        self,
        session: AsyncSession,
        origin_language_code: str | None = None,
        target_language_code: str | None = None,
        tz_offset_minutes: int = 0,
    ):
        story_lang_conds = []
        if origin_language_code:
            story_lang_conds.append(
                Story.language_pair.has(
                    LanguagePair.origin_language.has(Language.code == origin_language_code)
                )
            )
        if target_language_code:
            story_lang_conds.append(
                Story.language_pair.has(
                    LanguagePair.target_language.has(Language.code == target_language_code)
                )
            )

        total_stories_stmt = select(func.count(Story.id)).where(Story.is_published.is_(True))
        if story_lang_conds:
            total_stories_stmt = total_stories_stmt.where(and_(*story_lang_conds))
        total_stories = (await session.execute(total_stories_stmt)).scalar() or 0

        completed_stories_stmt = select(func.count(UserProgress.id)).where(
            UserProgress.completed_at.isnot(None)
        )
        if story_lang_conds:
            completed_stories_stmt = completed_stories_stmt.join(
                Story, UserProgress.story_id == Story.id
            ).where(and_(*story_lang_conds))
        completed_stories = (await session.execute(completed_stories_stmt)).scalar() or 0

        fc_lang_cond = _flashcard_language_condition(
            origin_language_code=origin_language_code,
            target_language_code=target_language_code,
        )

        total_words_stmt = select(func.count(Flashcard.id))
        if fc_lang_cond is not None:
            total_words_stmt = total_words_stmt.where(fc_lang_cond)
        total_words = (await session.execute(total_words_stmt)).scalar() or 0

        now = datetime.now(UTC)
        due_flashcards_stmt = select(func.count(Flashcard.id)).where(
            Flashcard.next_review <= now
        )
        if fc_lang_cond is not None:
            due_flashcards_stmt = due_flashcards_stmt.where(fc_lang_cond)
        due_flashcards = (await session.execute(due_flashcards_stmt)).scalar() or 0

        avg_score_stmt = select(func.avg(UserProgress.quiz_score)).where(
            UserProgress.quiz_score.isnot(None)
        )
        if story_lang_conds:
            avg_score_stmt = avg_score_stmt.join(
                Story, UserProgress.story_id == Story.id
            ).where(and_(*story_lang_conds))
        avg_score = (await session.execute(avg_score_stmt)).scalar() or 0.0

        # Streak reflects user activity across completed stories and flashcard reviews
        story_dates_stmt = select(UserProgress.completed_at).where(
            UserProgress.completed_at.isnot(None)
        )
        review_dates_stmt = select(Flashcard.last_reviewed).where(
            Flashcard.last_reviewed.isnot(None)
        )
        story_dates = list((await session.execute(story_dates_stmt)).scalars().all())
        review_dates = list((await session.execute(review_dates_stmt)).scalars().all())
        streak_days = _calculate_streak_days(
            story_dates + review_dates, tz_offset_minutes=tz_offset_minutes
        )

        return {
            "total_stories_read": completed_stories,
            "total_stories_available": total_stories,
            "total_words_learned": total_words,
            "flashcards_due_today": due_flashcards,
            "current_streak_days": streak_days,
            "average_quiz_score": round(float(avg_score), 1),
        }

language_repo = LanguageRepository()
category_repo = CategoryRepository()
story_repo = StoryRepository()
flashcard_repo = FlashcardRepository()
word_repo = WordRepository()
progress_repo = ProgressRepository()
