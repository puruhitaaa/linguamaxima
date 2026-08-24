import asyncio
import logging
from typing import List, Optional, Tuple
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import CEFRLevel
from app.repositories import (
    category_repo,
    flashcard_repo,
    language_repo,
    progress_repo,
    story_repo,
)
from app.schemas import (
    FlashcardResponse,
    FlashcardReviewResponse,
    ProgressSummaryResponse,
    QuestionResult,
    QuizResponse,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
    StoryDetailResponse,
    StoryGenerateRequest,
    StoryListItemResponse,
    VocabularyResponse,
)
from app.services.ai_service import ai_service
from app.services.image_service import image_service
from app.services.srs_service import calculate_sm2
from app.services.tts_service import tts_service

logger = logging.getLogger("linguamaxima.services")

class StoryService:
    async def list_stories(
        self,
        session: AsyncSession,
        cefr_level: Optional[CEFRLevel] = None,
        category_slug: Optional[str] = None,
        search: Optional[str] = None,
        is_favorite: Optional[bool] = None,
        is_completed: Optional[bool] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[StoryListItemResponse], int]:
        offset = (page - 1) * limit
        stories, total = await story_repo.list_stories(
            session=session,
            cefr_level=cefr_level,
            category_slug=category_slug,
            search=search,
            is_favorite=is_favorite,
            is_completed=is_completed,
            limit=limit,
            offset=offset,
        )

        items = []
        for s in stories:
            prog = s.progress[0] if s.progress else None
            is_fav = prog.is_favorite if prog else False
            is_comp = prog.completed_at is not None if prog else False
            q_score = prog.quiz_score if prog else None

            items.append(
                StoryListItemResponse(
                    id=s.id,
                    title=s.title,
                    title_translated=s.title_translated,
                    summary=s.summary,
                    cefr_level=s.cefr_level,
                    category=s.category,
                    image_url=s.image_url,
                    audio_url=s.audio_url,
                    estimated_reading_minutes=s.estimated_reading_minutes,
                    word_count=s.word_count,
                    is_favorite=is_fav,
                    is_completed=is_comp,
                    quiz_score=q_score,
                    created_at=s.created_at,
                )
            )
        return items, total

    async def get_story_detail(self, session: AsyncSession, story_id: int) -> StoryDetailResponse:
        story = await story_repo.get_story_by_id(session, story_id)
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")

        prog = story.progress[0] if story.progress else None
        is_fav = prog.is_favorite if prog else False
        is_comp = prog.completed_at is not None if prog else False
        q_score = prog.quiz_score if prog else None

        # Build vocabulary items with saved flashcard check
        all_flashcards = await flashcard_repo.get_all_flashcards(session)
        saved_vocab_ids = {fc.vocabulary_id for fc in all_flashcards}

        vocab_responses = []
        for v in story.vocabulary:
            vocab_responses.append(
                VocabularyResponse(
                    id=v.id,
                    story_id=v.story_id,
                    word=v.word,
                    translation=v.translation,
                    part_of_speech=v.part_of_speech,
                    gender=v.gender,
                    example_sentence=v.example_sentence,
                    example_translation=v.example_translation,
                    pronunciation_url=v.pronunciation_url,
                    difficulty_rank=v.difficulty_rank,
                    is_saved_as_flashcard=(v.id in saved_vocab_ids),
                )
            )

        # Build quiz items formatting options
        quiz_responses = []
        for q in story.quizzes:
            options = [q.correct_answer] + (q.wrong_answers or [])
            # Simple deterministic shuffle based on question id
            options.sort(key=lambda opt: hash(f"{q.id}:{opt}"))
            quiz_responses.append(
                QuizResponse(
                    id=q.id,
                    story_id=q.story_id,
                    question_type=q.question_type,
                    question=q.question,
                    question_translated=q.question_translated,
                    options=options,
                    explanation=q.explanation,
                    sort_order=q.sort_order,
                )
            )

        return StoryDetailResponse(
            id=story.id,
            title=story.title,
            title_translated=story.title_translated,
            content=story.content,
            content_translated=story.content_translated,
            summary=story.summary,
            cefr_level=story.cefr_level,
            category=story.category,
            language_pair=story.language_pair,
            image_url=story.image_url,
            audio_url=story.audio_url,
            estimated_reading_minutes=story.estimated_reading_minutes,
            word_count=story.word_count,
            ai_model=story.ai_model,
            ai_provider=story.ai_provider,
            is_favorite=is_fav,
            is_completed=is_comp,
            quiz_score=q_score,
            vocabulary=vocab_responses,
            grammar_tips=story.grammar_tips,
            quizzes=quiz_responses,
            created_at=story.created_at,
        )

    async def generate_and_save_story(
        self, session: AsyncSession, req: StoryGenerateRequest
    ) -> StoryDetailResponse:
        category = await category_repo.get_by_slug(session, req.category_slug)
        category_name = category.name if category else req.category_slug.capitalize()
        category_id = category.id if category else None

        lang_pair = await language_repo.get_pair_by_codes(
            session, req.origin_language_code, req.target_language_code
        )
        lang_pair_id = lang_pair.id if lang_pair else None
        target_name = lang_pair.target_language.name if lang_pair else "German"
        origin_name = lang_pair.origin_language.name if lang_pair else "Indonesian"

        # 1. AI generation
        bundle, ai_model, ai_provider = await ai_service.generate_story(
            cefr_level=req.cefr_level,
            category=category_name,
            topic_hint=req.topic_hint,
            target_lang=target_name,
            origin_lang=origin_name,
        )

        # 2. Cover image fetch (in background/async)
        image_url = await image_service.fetch_story_image(
            category_slug=req.category_slug, query=bundle.title
        )

        # 3. Audio generation for full story
        audio_url = await tts_service.generate_audio(
            text=bundle.content,
            language=req.target_language_code,
        )

        # 4. Generate audio for vocabulary words
        async def populate_vocab_audio(item):
            audio_path = await tts_service.generate_audio(
                text=item.word,
                language=req.target_language_code,
            )
            # Attach generated audio url or keep None
            item.example_sentence = item.example_sentence or ""

        await asyncio.gather(*[populate_vocab_audio(v) for v in bundle.vocabulary], return_exceptions=True)

        # 5. Persist to DB
        saved_story = await story_repo.create_story_bundle(
            session=session,
            bundle=bundle,
            cefr_level=req.cefr_level,
            category_id=category_id,
            language_pair_id=lang_pair_id,
            image_url=image_url,
            audio_url=audio_url,
            ai_model=ai_model,
            ai_provider=ai_provider,
        )

        return await self.get_story_detail(session, saved_story.id)

    async def toggle_favorite(self, session: AsyncSession, story_id: int) -> bool:
        return await story_repo.toggle_favorite(session, story_id)

class QuizService:
    async def submit_quiz(
        self, session: AsyncSession, story_id: int, req: QuizSubmissionRequest
    ) -> QuizSubmissionResponse:
        story = await story_repo.get_story_by_id(session, story_id)
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")

        quiz_map = {q.id: q for q in story.quizzes}
        if not quiz_map:
            raise HTTPException(status_code=400, detail="No quiz available for this story")

        results = []
        correct_count = 0

        for submission in req.answers:
            quiz = quiz_map.get(submission.question_id)
            if not quiz:
                continue
            is_correct = submission.selected_answer.strip().lower() == quiz.correct_answer.strip().lower()
            if is_correct:
                correct_count += 1

            results.append(
                QuestionResult(
                    question_id=quiz.id,
                    question=quiz.question,
                    selected_answer=submission.selected_answer,
                    correct_answer=quiz.correct_answer,
                    is_correct=is_correct,
                    explanation=quiz.explanation,
                )
            )

        total_questions = len(quiz_map)
        score_pct = int(round((correct_count / max(1, total_questions)) * 100))
        passed = score_pct >= 70

        await story_repo.record_quiz_submission(session, story_id, score_pct)

        return QuizSubmissionResponse(
            story_id=story_id,
            total_questions=total_questions,
            correct_answers=correct_count,
            score_percentage=score_pct,
            passed=passed,
            results=results,
        )

class FlashcardService:
    async def get_due_flashcards(self, session: AsyncSession) -> List[FlashcardResponse]:
        flashcards = await flashcard_repo.get_due_flashcards(session)
        return [
            FlashcardResponse(
                id=fc.id,
                vocabulary_id=fc.vocabulary_id,
                vocabulary=VocabularyResponse(
                    id=fc.vocabulary.id,
                    story_id=fc.vocabulary.story_id,
                    word=fc.vocabulary.word,
                    translation=fc.vocabulary.translation,
                    part_of_speech=fc.vocabulary.part_of_speech,
                    gender=fc.vocabulary.gender,
                    example_sentence=fc.vocabulary.example_sentence,
                    example_translation=fc.vocabulary.example_translation,
                    pronunciation_url=fc.vocabulary.pronunciation_url,
                    difficulty_rank=fc.vocabulary.difficulty_rank,
                    is_saved_as_flashcard=True,
                ),
                ease_factor=fc.ease_factor,
                interval_days=fc.interval_days,
                repetitions=fc.repetitions,
                next_review=fc.next_review,
                last_reviewed=fc.last_reviewed,
                created_at=fc.created_at,
            )
            for fc in flashcards
        ]

    async def get_all_flashcards(
        self, session: AsyncSession, search: Optional[str] = None
    ) -> List[FlashcardResponse]:
        flashcards = await flashcard_repo.get_all_flashcards(session, search=search)
        return [
            FlashcardResponse(
                id=fc.id,
                vocabulary_id=fc.vocabulary_id,
                vocabulary=VocabularyResponse(
                    id=fc.vocabulary.id,
                    story_id=fc.vocabulary.story_id,
                    word=fc.vocabulary.word,
                    translation=fc.vocabulary.translation,
                    part_of_speech=fc.vocabulary.part_of_speech,
                    gender=fc.vocabulary.gender,
                    example_sentence=fc.vocabulary.example_sentence,
                    example_translation=fc.vocabulary.example_translation,
                    pronunciation_url=fc.vocabulary.pronunciation_url,
                    difficulty_rank=fc.vocabulary.difficulty_rank,
                    is_saved_as_flashcard=True,
                ),
                ease_factor=fc.ease_factor,
                interval_days=fc.interval_days,
                repetitions=fc.repetitions,
                next_review=fc.next_review,
                last_reviewed=fc.last_reviewed,
                created_at=fc.created_at,
            )
            for fc in flashcards
        ]

    async def save_flashcard(self, session: AsyncSession, vocabulary_id: int) -> FlashcardResponse:
        fc = await flashcard_repo.save_vocabulary_to_flashcard(session, vocabulary_id)
        # Reload with vocabulary
        loaded = await flashcard_repo.get_by_id(session, fc.id)
        return FlashcardResponse(
            id=loaded.id,
            vocabulary_id=loaded.vocabulary_id,
            vocabulary=VocabularyResponse(
                id=loaded.vocabulary.id,
                story_id=loaded.vocabulary.story_id,
                word=loaded.vocabulary.word,
                translation=loaded.vocabulary.translation,
                part_of_speech=loaded.vocabulary.part_of_speech,
                gender=loaded.vocabulary.gender,
                example_sentence=loaded.vocabulary.example_sentence,
                example_translation=loaded.vocabulary.example_translation,
                pronunciation_url=loaded.vocabulary.pronunciation_url,
                difficulty_rank=loaded.vocabulary.difficulty_rank,
                is_saved_as_flashcard=True,
            ),
            ease_factor=loaded.ease_factor,
            interval_days=loaded.interval_days,
            repetitions=loaded.repetitions,
            next_review=loaded.next_review,
            last_reviewed=loaded.last_reviewed,
            created_at=loaded.created_at,
        )

    async def review_flashcard(
        self, session: AsyncSession, flashcard_id: int, quality: int
    ) -> FlashcardReviewResponse:
        fc = await flashcard_repo.get_by_id(session, flashcard_id)
        if not fc:
            raise HTTPException(status_code=404, detail="Flashcard not found")

        srs_result = calculate_sm2(
            quality=quality,
            current_ease_factor=fc.ease_factor,
            current_interval=fc.interval_days,
            current_repetitions=fc.repetitions,
        )

        updated = await flashcard_repo.update_flashcard(
            session=session,
            flashcard_id=fc.id,
            ease_factor=srs_result.ease_factor,
            interval_days=srs_result.interval_days,
            repetitions=srs_result.repetitions,
            next_review=srs_result.next_review,
        )

        msg = (
            f"Card reviewed! Next review in {srs_result.interval_days} day(s)."
            if srs_result.interval_days > 0
            else "Card will be reviewed again today."
        )

        return FlashcardReviewResponse(
            id=updated.id,
            ease_factor=updated.ease_factor,
            interval_days=updated.interval_days,
            repetitions=updated.repetitions,
            next_review=updated.next_review,
            message=msg,
        )

class ProgressService:
    async def get_summary(self, session: AsyncSession) -> ProgressSummaryResponse:
        summary_dict = await progress_repo.get_summary(session)
        return ProgressSummaryResponse(**summary_dict)

story_service = StoryService()
quiz_service = QuizService()
flashcard_service = FlashcardService()
progress_service = ProgressService()
