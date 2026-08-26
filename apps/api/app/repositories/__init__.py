from datetime import datetime, timezone
import math
from typing import List, Optional, Tuple
from sqlalchemy import func, select, update, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from app.models import (
    CEFRLevel,
    Category,
    Flashcard,
    GrammarTip,
    Language,
    LanguagePair,
    ProficiencyFramework,
    Quiz,
    Story,
    UserProgress,
    Vocabulary,
    Word,
)
from app.schemas import (
    GeneratedGrammarTip,
    GeneratedQuizQuestion,
    GeneratedStoryBundle,
    GeneratedVocabularyItem,
)

# ----------------- Languages Repo -----------------
class LanguageRepository:
    async def get_all_languages(self, session: AsyncSession) -> List[Language]:
        stmt = select(Language).order_by(Language.name)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_code(self, session: AsyncSession, code: str) -> Optional[Language]:
        stmt = select(Language).where(Language.code == code)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_create_language(
        self,
        session: AsyncSession,
        code: str,
        name: str,
        native_name: Optional[str] = None,
    ) -> Language:
        lang = await self.get_by_code(session, code)
        if not lang:
            lang = Language(code=code, name=name, native_name=native_name)
            session.add(lang)
            await session.commit()
            await session.refresh(lang)
        return lang

    async def get_all_pairs(self, session: AsyncSession) -> List[LanguagePair]:
        stmt = select(LanguagePair).options(
            joinedload(LanguagePair.origin_language),
            joinedload(LanguagePair.target_language),
        ).where(LanguagePair.is_active.is_(True))
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_pair_by_codes(
        self, session: AsyncSession, origin_code: str, target_code: str
    ) -> Optional[LanguagePair]:
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
    async def get_all(self, session: AsyncSession) -> List[Category]:
        stmt = select(Category).order_by(Category.name)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_slug(self, session: AsyncSession, slug: str) -> Optional[Category]:
        stmt = select(Category).where(Category.slug == slug)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

# ----------------- Story Repo -----------------
class StoryRepository:
    async def list_stories(
        self,
        session: AsyncSession,
        cefr_level: Optional[CEFRLevel] = None,
        category_slug: Optional[str] = None,
        search: Optional[str] = None,
        origin_language_code: Optional[str] = None,
        target_language_code: Optional[str] = None,
        language_pair_id: Optional[int] = None,
        is_favorite: Optional[bool] = None,
        is_completed: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Story], int]:
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
                query = query.where(UserProgress.completed_at.is_(None))

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

    async def get_story_by_id(self, session: AsyncSession, story_id: int) -> Optional[Story]:
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
        category_id: Optional[int],
        language_pair_id: Optional[int],
        image_url: Optional[str],
        audio_url: Optional[str],
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
        now = datetime.now(timezone.utc)

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

# ----------------- Flashcard Repo -----------------
class FlashcardRepository:
    async def get_due_flashcards(
        self, session: AsyncSession, now: Optional[datetime] = None
    ) -> List[Flashcard]:
        if now is None:
            now = datetime.now(timezone.utc)
        stmt = (
            select(Flashcard)
            .where(Flashcard.next_review <= now)
            .options(
                joinedload(Flashcard.vocabulary).joinedload(Vocabulary.story),
                joinedload(Flashcard.word).joinedload(Word.language),
            )
            .order_by(Flashcard.next_review)
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())

    async def get_all_flashcards(
        self, session: AsyncSession, search: Optional[str] = None
    ) -> List[Flashcard]:
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
        stmt = (
            stmt.options(
                joinedload(Flashcard.vocabulary).joinedload(Vocabulary.story),
                joinedload(Flashcard.word).joinedload(Word.language),
            )
            .order_by(desc(Flashcard.created_at))
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())

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
            next_review=datetime.now(timezone.utc),
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
            next_review=datetime.now(timezone.utc),
        )
        session.add(flashcard)
        await session.commit()
        await session.refresh(flashcard)
        return flashcard

    async def get_by_id(self, session: AsyncSession, flashcard_id: int) -> Optional[Flashcard]:
        stmt = (
            select(Flashcard)
            .where(Flashcard.id == flashcard_id)
            .options(
                joinedload(Flashcard.vocabulary),
                joinedload(Flashcard.word),
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
    ) -> Optional[Flashcard]:
        flashcard = await self.get_by_id(session, flashcard_id)
        if not flashcard:
            return None
        flashcard.ease_factor = ease_factor
        flashcard.interval_days = interval_days
        flashcard.repetitions = repetitions
        flashcard.next_review = next_review
        flashcard.last_reviewed = datetime.now(timezone.utc)
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
        language_code: Optional[str] = None,
        normalized_level: Optional[CEFRLevel] = None,
        part_of_speech: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Word], int]:
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

    async def get_by_id(self, session: AsyncSession, word_id: int) -> Optional[Word]:
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
        for l in all_levels:
            if l in levels_map:
                final_levels.append(levels_map[l])
            else:
                final_levels.append({"key": l, "label": l, "count": 0})

        return {
            "language_code": lang.code,
            "language_name": lang.name,
            "proficiency_framework": lang.proficiency_framework,
            "total_words": total_words,
            "levels": final_levels,
            "parts_of_speech": pos_list,
        }

# ----------------- Progress Repo -----------------
class ProgressRepository:
    async def get_summary(self, session: AsyncSession):
        total_stories_stmt = select(func.count(Story.id)).where(Story.is_published.is_(True))
        total_stories = (await session.execute(total_stories_stmt)).scalar() or 0

        completed_stories_stmt = select(func.count(UserProgress.id)).where(UserProgress.completed_at.isnot(None))
        completed_stories = (await session.execute(completed_stories_stmt)).scalar() or 0

        total_words_stmt = select(func.count(Flashcard.id))
        total_words = (await session.execute(total_words_stmt)).scalar() or 0

        now = datetime.now(timezone.utc)
        due_flashcards_stmt = select(func.count(Flashcard.id)).where(Flashcard.next_review <= now)
        due_flashcards = (await session.execute(due_flashcards_stmt)).scalar() or 0

        avg_score_stmt = select(func.avg(UserProgress.quiz_score)).where(UserProgress.quiz_score.isnot(None))
        avg_score = (await session.execute(avg_score_stmt)).scalar() or 0.0

        return {
            "total_stories_read": completed_stories,
            "total_stories_available": total_stories,
            "total_words_learned": total_words,
            "flashcards_due_today": due_flashcards,
            "current_streak_days": 1 if completed_stories > 0 else 0,
            "average_quiz_score": round(float(avg_score), 1),
        }

language_repo = LanguageRepository()
category_repo = CategoryRepository()
story_repo = StoryRepository()
flashcard_repo = FlashcardRepository()
word_repo = WordRepository()
progress_repo = ProgressRepository()
