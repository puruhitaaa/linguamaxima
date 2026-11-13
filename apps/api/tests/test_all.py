from datetime import UTC, datetime, timedelta

import litellm
import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.rate_limit import generation_rate_limiter
from app.models import CEFRLevel, UserProgress
from app.repositories import _calculate_streak_days
from app.services.srs_service import calculate_sm2


@pytest.mark.asyncio
async def test_health_check(client):
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "database" in data
    assert "version" in data

@pytest.mark.asyncio
async def test_list_stories(client):
    res = await client.get("/api/v1/stories")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 3
    assert data[0]["title"] is not None
    assert data[0]["cefr_level"] in ["A1", "A2", "B1", "B2", "C1", "C2"]

@pytest.mark.asyncio
async def test_filter_stories_by_level(client):
    res = await client.get("/api/v1/stories?cefr_level=A1")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert all(item["cefr_level"] == "A1" for item in data)

@pytest.mark.asyncio
async def test_filter_stories_by_favorite_and_completed(client):
    stories_res = await client.get("/api/v1/stories")
    story_id = stories_res.json()[0]["id"]

    # Toggle favorite to true
    await client.patch(f"/api/v1/stories/{story_id}/favorite")

    # Filter by favorite
    fav_res = await client.get("/api/v1/stories?is_favorite=true")
    assert fav_res.status_code == 200
    fav_data = fav_res.json()
    assert any(s["id"] == story_id for s in fav_data)

    # Filter by completed
    comp_res = await client.get("/api/v1/stories?is_completed=true")
    assert comp_res.status_code == 200

@pytest.mark.asyncio
async def test_filter_flashcards_by_search(client):
    stories_res = await client.get("/api/v1/stories")
    story_id = stories_res.json()[0]["id"]
    detail = (await client.get(f"/api/v1/stories/{story_id}")).json()
    vocab = detail["vocabulary"][0]

    # Save to deck
    await client.post("/api/v1/flashcards", json={"vocabulary_id": vocab["id"]})

    # Search for this word
    search_res = await client.get(f"/api/v1/flashcards?search={vocab['word'][:3]}")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert len(search_data) >= 1
    assert any(fc["vocabulary_id"] == vocab["id"] for fc in search_data)

@pytest.mark.asyncio
async def test_get_story_detail(client):
    stories_res = await client.get("/api/v1/stories")
    story_id = stories_res.json()[0]["id"]

    res = await client.get(f"/api/v1/stories/{story_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["id"] == story_id
    assert "vocabulary" in detail
    assert len(detail["vocabulary"]) > 0
    assert "grammar_tips" in detail
    assert "quizzes" in detail

@pytest.mark.asyncio
async def test_toggle_favorite(client):
    stories_res = await client.get("/api/v1/stories")
    story_id = stories_res.json()[0]["id"]

    res1 = await client.patch(f"/api/v1/stories/{story_id}/favorite")
    assert res1.status_code == 200
    assert res1.json()["is_favorite"] is True

    res2 = await client.patch(f"/api/v1/stories/{story_id}/favorite")
    assert res2.status_code == 200
    assert res2.json()["is_favorite"] is False

@pytest.mark.asyncio
async def test_save_and_review_flashcard(client):
    # 1. Get a story and vocabulary id
    stories_res = await client.get("/api/v1/stories")
    story_id = stories_res.json()[0]["id"]
    detail = (await client.get(f"/api/v1/stories/{story_id}")).json()
    vocab_id = detail["vocabulary"][0]["id"]

    # 2. Save to flashcards
    save_res = await client.post("/api/v1/flashcards", json={"vocabulary_id": vocab_id})
    assert save_res.status_code == 200
    fc = save_res.json()
    assert fc["vocabulary_id"] == vocab_id
    assert fc["ease_factor"] == 2.5
    fc_id = fc["id"]

    # 3. Check due flashcards
    due_res = await client.get("/api/v1/flashcards/due")
    assert due_res.status_code == 200
    due_cards = due_res.json()
    assert any(card["id"] == fc_id for card in due_cards)

    # 4. Review flashcard with Good (4)
    rev_res = await client.patch(f"/api/v1/flashcards/{fc_id}/review", json={"quality": 4})
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert rev_data["repetitions"] == 1
    assert rev_data["interval_days"] == 1

@pytest.mark.asyncio
async def test_submit_quiz(client):
    stories_res = await client.get("/api/v1/stories")
    story_id = stories_res.json()[0]["id"]
    detail = (await client.get(f"/api/v1/stories/{story_id}")).json()
    quiz = detail["quizzes"][0]

    # Submit answer
    sub_res = await client.post(
        f"/api/v1/quizzes/{story_id}/submit",
        json={"answers": [{"question_id": quiz["id"], "selected_answer": "wrong"}]}
    )
    assert sub_res.status_code == 200
    result = sub_res.json()
    assert result["story_id"] == story_id
    assert result["total_questions"] >= 1
    assert len(result["results"]) >= 1

@pytest.mark.asyncio
async def test_progress_summary(client):
    res = await client.get("/api/v1/progress")
    assert res.status_code == 200
    summary = res.json()
    assert "total_stories_available" in summary
    assert "total_stories_read" in summary
    assert "total_words_learned" in summary

@pytest.mark.asyncio
async def test_story_generation(client):
    res = await client.post(
        "/api/v1/stories/generate",
        json={
            "cefr_level": "A1",
            "category_slug": "travel",
            "topic_hint": "Train ride",
            "target_language_code": "de",
            "origin_language_code": "id"
        }
    )
    assert res.status_code == 200
    new_story = res.json()
    assert new_story["title"] is not None
    assert len(new_story["vocabulary"]) > 0
    assert len(new_story["quizzes"]) > 0

def test_srs_sm2_algorithm():
    now = datetime(2026, 1, 1, tzinfo=UTC)

    # 1. First review with Perfect (5)
    r1 = calculate_sm2(quality=5, current_ease_factor=2.5, current_interval=0, current_repetitions=0, now=now)
    assert r1.repetitions == 1
    assert r1.interval_days == 1
    assert r1.ease_factor >= 2.5

    # 2. Second review with Good (4)
    r2 = calculate_sm2(quality=4, current_ease_factor=r1.ease_factor, current_interval=r1.interval_days, current_repetitions=r1.repetitions, now=now)
    assert r2.repetitions == 2
    assert r2.interval_days == 6

    # 3. Third review with Again (0) -> reset
    r3 = calculate_sm2(quality=0, current_ease_factor=r2.ease_factor, current_interval=r2.interval_days, current_repetitions=r2.repetitions, now=now)
    assert r3.repetitions == 0
    assert r3.interval_days == 1

@pytest.mark.asyncio
async def test_languages_endpoints(client):
    # Test list languages
    lang_res = await client.get("/api/v1/languages")
    assert lang_res.status_code == 200
    languages = lang_res.json()
    assert len(languages) >= 5
    codes = [lang["code"] for lang in languages]
    assert "de" in codes
    assert "id" in codes
    assert "en" in codes
    assert "es" in codes

    # Test list language pairs
    pairs_res = await client.get("/api/v1/languages/pairs")
    assert pairs_res.status_code == 200
    pairs = pairs_res.json()
    assert len(pairs) >= 1

    # Test create / get language pair on demand
    create_pair_res = await client.post(
        "/api/v1/languages/pairs",
        json={"origin_language_code": "en", "target_language_code": "es"}
    )
    assert create_pair_res.status_code == 200
    pair_data = create_pair_res.json()
    assert pair_data["origin_language"]["code"] == "en"
    assert pair_data["target_language"]["code"] == "es"

@pytest.mark.asyncio
async def test_filter_stories_by_language_codes(client):
    # Filter for target_language_code=de and origin_language_code=id
    res = await client.get("/api/v1/stories?target_language_code=de&origin_language_code=id")
    assert res.status_code == 200
    stories = res.json()
    assert len(stories) >= 1
    for s in stories:
        if s.get("language_pair"):
            assert s["language_pair"]["target_language"]["code"] == "de"
            assert s["language_pair"]["origin_language"]["code"] == "id"

def test_gender_detection_and_voice_matching():
    from app.services.tts_service import (
        detect_speaker_gender,
        detect_speaker_gender_from_content,
        tts_service,
    )

    # Test masculine and feminine name detection
    assert detect_speaker_gender("Anna") == "female"
    assert detect_speaker_gender("Leo") == "male"
    assert detect_speaker_gender("Leon") == "male"
    assert detect_speaker_gender("Darren") == "male"
    assert detect_speaker_gender("Sophie") == "female"
    assert detect_speaker_gender("Sarah") == "female"
    assert detect_speaker_gender("Lukas") == "male"
    assert detect_speaker_gender("Carlos") == "male"
    assert detect_speaker_gender("Emily") == "female"

    # Test dialogue actor voice assignment
    voices_map = tts_service.assign_voices_to_speakers(["Anna", "Leo"], "de")
    assert "Katja" in voices_map["Anna"]  # Female German voice
    assert "Killian" in voices_map["Leo"]  # Male German voice

    # Test language voice resolution by gender
    male_voice = tts_service.get_voice_for_language("de", gender="male")
    female_voice = tts_service.get_voice_for_language("de", gender="female")
    assert "Killian" in male_voice
    assert "Katja" in female_voice

    en_male = tts_service.get_voice_for_language("en", gender="male")
    en_female = tts_service.get_voice_for_language("en", gender="female")
    assert "Christopher" in en_male
    assert "Jenny" in en_female

    # Test monologue narrative content gender detection
    assert detect_speaker_gender_from_content("Hallo! Ich heiße Leon und wohne in Berlin.") == "male"
    assert detect_speaker_gender_from_content("Mein Name ist Sarah. Heute ist ein schöner Tag.") == "female"
    assert detect_speaker_gender_from_content("Hello! My name is Darren and I am a student.") == "male"
    assert detect_speaker_gender_from_content("¡Hola! Me llamo Carlos y vivo en Madrid.") == "male"

@pytest.mark.asyncio
async def test_monologue_story_bundle_fallback():
    from app.services.ai_service import ai_service
    bundle, _model, _provider = await ai_service.generate_story(
        cefr_level=CEFRLevel.A1,
        category="travel",
        target_lang="German",
        origin_lang="Indonesian",
        story_type="monologue",
    )
    assert bundle.speaker_name is not None
    assert bundle.speaker_gender in ("male", "female")
    assert bundle.content is not None

@pytest.mark.asyncio
async def test_list_words_and_filters(client):
    # 1. List German words
    res = await client.get("/api/v1/words?lang=de&page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "has_next" in data
    assert "has_prev" in data
    assert data["has_prev"] is False
    if data["total"] > 10:
        assert data["has_next"] is True
    assert data["total"] > 0
    assert len(data["items"]) > 0

    # Check word schema
    first_word = data["items"][0]
    assert "lemma" in first_word
    assert "normalized_level" in first_word
    assert "part_of_speech" in first_word
    assert "translation" in first_word

    # 2. Filter by POS (conjunction)
    res_pos = await client.get("/api/v1/words?lang=de&pos=conjunction")
    assert res_pos.status_code == 200
    pos_data = res_pos.json()
    assert all(w["part_of_speech"].lower() == "conjunction" for w in pos_data["items"])
    assert any(w["lemma"] in ["weil", "obwohl", "während"] for w in pos_data["items"])

    # 3. Filter by Level (B1)
    res_lvl = await client.get("/api/v1/words?lang=de&level=B1")
    assert res_lvl.status_code == 200
    lvl_data = res_lvl.json()
    assert all(w["normalized_level"] == "B1" for w in lvl_data["items"])

    # 4. Search word
    res_search = await client.get("/api/v1/words?lang=de&search=obwohl")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert len(search_data["items"]) >= 1
    assert search_data["items"][0]["lemma"] == "obwohl"

@pytest.mark.asyncio
async def test_word_filter_metadata(client):
    # Test German filter metadata
    res_de = await client.get("/api/v1/words/filters?lang=de")
    assert res_de.status_code == 200
    meta_de = res_de.json()
    assert meta_de["language_code"] == "de"
    assert meta_de["proficiency_framework"] == "cefr"
    assert len(meta_de["levels"]) == 6
    assert any(p["key"] == "conjunction" for p in meta_de["parts_of_speech"])

    # Test Japanese filter metadata (JLPT framework)
    res_ja = await client.get("/api/v1/words/filters?lang=ja")
    assert res_ja.status_code == 200
    meta_ja = res_ja.json()
    assert meta_ja["language_code"] == "ja"
    assert meta_ja["proficiency_framework"] == "jlpt"

@pytest.mark.asyncio
async def test_save_word_flashcard(client):
    # Get a word
    words_res = await client.get("/api/v1/words?lang=de&pos=conjunction")
    word = words_res.json()["items"][0]
    word_id = word["id"]

    # Save to flashcard via POST /api/v1/words/{id}/flashcard
    save_res = await client.post(f"/api/v1/words/{word_id}/flashcard")
    assert save_res.status_code == 200
    fc_data = save_res.json()
    assert fc_data["word_id"] == word_id

    # Verify word is returned with is_saved_as_flashcard = True
    words_after = (await client.get("/api/v1/words?lang=de&pos=conjunction")).json()
    saved_word = next(w for w in words_after["items"] if w["id"] == word_id)
    assert saved_word["is_saved_as_flashcard"] is True


@pytest.mark.asyncio
async def test_stories_pagination_headers_and_uncompleted_filter(client):
    res_page1 = await client.get("/api/v1/stories?page=1&limit=2")
    assert res_page1.status_code == 200
    assert int(res_page1.headers["x-total-count"]) >= 3
    assert res_page1.headers["x-page"] == "1"
    assert res_page1.headers["x-limit"] == "2"
    page1_ids = [item["id"] for item in res_page1.json()]
    assert len(page1_ids) == 2

    # Stories without a UserProgress row should still appear for is_completed=false
    uncompleted_res = await client.get("/api/v1/stories?is_completed=false&limit=50")
    assert uncompleted_res.status_code == 200
    uncompleted_ids = {item["id"] for item in uncompleted_res.json()}
    assert page1_ids[0] in uncompleted_ids

    # Mark first story completed explicitly
    complete_res = await client.post(f"/api/v1/stories/{page1_ids[0]}/complete")
    assert complete_res.status_code == 200
    assert complete_res.json()["is_completed"] is True

    # Verify it moves from is_completed=false to is_completed=true
    uncompleted_after = await client.get("/api/v1/stories?is_completed=false&limit=50")
    assert page1_ids[0] not in {item["id"] for item in uncompleted_after.json()}
    completed_after = await client.get("/api/v1/stories?is_completed=true&limit=50")
    assert page1_ids[0] in {item["id"] for item in completed_after.json()}


@pytest.mark.asyncio
async def test_quiz_check_inline_and_deterministic_option_order(client):
    stories_res = await client.get("/api/v1/stories")
    story_id = stories_res.json()[0]["id"]

    first_detail = (await client.get(f"/api/v1/stories/{story_id}")).json()
    second_detail = (await client.get(f"/api/v1/stories/{story_id}")).json()

    first_options = [q["options"] for q in first_detail["quizzes"]]
    second_options = [q["options"] for q in second_detail["quizzes"]]
    assert first_options == second_options

    first_q = first_detail["quizzes"][0]
    check_res = await client.post(
        f"/api/v1/quizzes/{story_id}/check",
        json={"question_id": first_q["id"], "selected_answer": first_q["options"][0]},
    )
    assert check_res.status_code == 200
    payload = check_res.json()
    assert payload["question_id"] == first_q["id"]
    assert isinstance(payload["is_correct"], bool)
    assert payload["correct_answer"]


@pytest.mark.asyncio
async def test_flashcards_language_scope_and_delete(client):
    stories_res = await client.get("/api/v1/stories?target_language_code=de")
    story_de_meta = stories_res.json()[0]
    de_detail = (await client.get(f"/api/v1/stories/{story_de_meta['id']}")).json()

    # Generate an English target story to test cross-language filtering
    en_story = (
        await client.post(
            "/api/v1/stories/generate",
            json={
                "cefr_level": "A1",
                "category": "daily-life",
                "origin_language_code": "id",
                "target_language_code": "en",
            },
        )
    ).json()

    fc_de = (
        await client.post(
            "/api/v1/flashcards",
            json={"vocabulary_id": de_detail["vocabulary"][0]["id"]},
        )
    ).json()
    fc_en = (
        await client.post(
            "/api/v1/flashcards",
            json={"vocabulary_id": en_story["vocabulary"][0]["id"]},
        )
    ).json()

    scoped_all = (
        await client.get("/api/v1/flashcards?target_language_code=de")
    ).json()
    scoped_all_ids = {c["id"] for c in scoped_all}
    assert fc_de["id"] in scoped_all_ids
    assert fc_en["id"] not in scoped_all_ids

    scoped_due = (
        await client.get("/api/v1/flashcards/due?target_language_code=de")
    ).json()
    scoped_due_ids = {c["id"] for c in scoped_due}
    assert fc_de["id"] in scoped_due_ids
    assert fc_en["id"] not in scoped_due_ids

    del_res = await client.delete(f"/api/v1/flashcards/{fc_de['id']}")
    assert del_res.status_code == 204
    missing_res = await client.delete(f"/api/v1/flashcards/{fc_de['id']}")
    assert missing_res.status_code == 404


@pytest.mark.asyncio
async def test_progress_language_scope_and_timezone_streak(client, db_session):
    stories_res = await client.get("/api/v1/stories?target_language_code=de")
    de_id = stories_res.json()[0]["id"]

    en_story = (
        await client.post(
            "/api/v1/stories/generate",
            json={
                "cefr_level": "A1",
                "category": "daily-life",
                "origin_language_code": "id",
                "target_language_code": "en",
            },
        )
    ).json()

    now_utc = datetime.now(UTC)
    for sid, completed_at, quiz_score in [
        (de_id, now_utc, 80),
        (en_story["id"], now_utc - timedelta(days=1), 60),
    ]:
        existing = (
            await db_session.execute(
                select(UserProgress).where(UserProgress.story_id == sid)
            )
        ).scalar_one_or_none()
        if existing:
            existing.completed_at = completed_at
            existing.quiz_score = quiz_score
            existing.last_accessed_at = completed_at
        else:
            db_session.add(
                UserProgress(
                    story_id=sid,
                    completed_at=completed_at,
                    quiz_score=quiz_score,
                    last_accessed_at=completed_at,
                )
            )
    await db_session.commit()

    de_summary = (
        await client.get("/api/v1/progress?origin_language_code=id&target_language_code=de")
    ).json()
    assert de_summary["total_stories_read"] == 1
    assert de_summary["average_quiz_score"] == 80.0

    # Global progress captures consecutive active days -> streak >= 2
    global_summary = (await client.get("/api/v1/progress?tz_offset_minutes=0")).json()
    assert global_summary["total_stories_read"] == 2
    assert global_summary["current_streak_days"] >= 2

    # Direct verification of timezone boundary handling on streak dates
    ref_today_utc = datetime.now(UTC)
    yesterday_late_utc = datetime(
        ref_today_utc.year, ref_today_utc.month, ref_today_utc.day, tzinfo=UTC
    ) - timedelta(minutes=30)
    prev_day_late_utc = yesterday_late_utc - timedelta(days=1)
    assert _calculate_streak_days([yesterday_late_utc, prev_day_late_utc], tz_offset_minutes=0) == 2
    assert _calculate_streak_days([yesterday_late_utc, prev_day_late_utc], tz_offset_minutes=60) == 2

    two_days_ago_early = datetime(
        ref_today_utc.year, ref_today_utc.month, ref_today_utc.day, tzinfo=UTC
    ) - timedelta(days=2) + timedelta(minutes=30)
    assert _calculate_streak_days([two_days_ago_early], tz_offset_minutes=0) == 0


@pytest.mark.asyncio
async def test_story_generation_strict_503_and_rate_limit(client, monkeypatch):
    async def fail_acompletion(*args, **kwargs):
        raise RuntimeError("Upstream provider down")

    monkeypatch.setattr(litellm, "acompletion", fail_acompletion)
    monkeypatch.setattr(settings, "allow_ai_mock_fallback", False)

    res_503 = await client.post(
        "/api/v1/stories/generate",
        json={"cefr_level": "A1", "category": "daily-life", "topic_hint": "Cafe"},
    )
    assert res_503.status_code == 503

    # Re-enable mock fallback and reset rate limiter to verify exact quota limit -> 429
    generation_rate_limiter.reset()
    monkeypatch.setattr(settings, "allow_ai_mock_fallback", True)
    monkeypatch.setattr(settings, "generation_rate_limit", 2)

    for _ in range(2):
        ok_res = await client.post(
            "/api/v1/stories/generate",
            json={"cefr_level": "A1", "category": "daily-life", "topic_hint": "Bakery"},
        )
        assert ok_res.status_code == 200

    res_429 = await client.post(
        "/api/v1/stories/generate",
        json={"cefr_level": "A1", "category": "daily-life", "topic_hint": "Bakery"},
    )
    assert res_429.status_code == 429
