import pytest

from app.services.ai_service import ai_service
from app.services.tts_service import tts_service


@pytest.fixture
def mock_offline_ai_and_tts(monkeypatch):
    async def no_llm(*args, **kwargs):
        return None, "template/fallback-engine", "internal"

    async def no_tts(*args, **kwargs):
        return None

    monkeypatch.setattr(ai_service, "_call_llm_json", no_llm)
    monkeypatch.setattr(tts_service, "generate_audio", no_tts)
    monkeypatch.setattr(tts_service, "generate_story_audio", no_tts)


@pytest.mark.asyncio
async def test_journey_clarify_preview_and_generate(client, mock_offline_ai_and_tts):
    # 1. Broad input "Ausbildung" triggers clarification questions
    clarify_res = await client.post(
        "/api/v1/journeys/clarify",
        json={
            "purpose": "Ausbildung",
            "origin_language_code": "id",
            "target_language_code": "de",
            "answers": [],
            "round": 1,
        },
    )
    assert clarify_res.status_code == 200
    c1 = clarify_res.json()
    assert c1["is_sufficient"] is False
    assert len(c1["questions"]) >= 1
    assert any("sector" in q["id"] for q in c1["questions"])

    # 2. Answering clarification round 2 yields sufficient + synthesized prompt
    clarify_res_2 = await client.post(
        "/api/v1/journeys/clarify",
        json={
            "purpose": "Ausbildung",
            "origin_language_code": "id",
            "target_language_code": "de",
            "answers": [
                {
                    "question_id": "sector",
                    "question": "Bidang atau sektor Ausbildung?",
                    "answer": "Hospitality & Hotellerie",
                },
                {
                    "question_id": "situations",
                    "question": "Situasi komunikasi?",
                    "answer": "Melayani Tamu / Pelanggan",
                },
            ],
            "round": 2,
        },
    )
    assert clarify_res_2.status_code == 200
    c2 = clarify_res_2.json()
    assert c2["is_sufficient"] is True
    assert c2["synthesized_prompt"]

    # 3. Preview prompt with CEFR B1
    preview_res = await client.post(
        "/api/v1/journeys/preview-prompt",
        json={
            "purpose": "Ausbildung",
            "clarifications": [
                {"question_id": "sector", "question": "Sector", "answer": "Hospitality & Hotellerie"}
            ],
            "cefr_level": "B1",
            "origin_language_code": "id",
            "target_language_code": "de",
        },
    )
    assert preview_res.status_code == 200
    preview = preview_res.json()
    assert "B1" in preview["synthesized_prompt"]
    assert preview["recommended_sector_tag"] == "Hospitality"

    # 4. Generate complete Learning Journey tree
    gen_res = await client.post(
        "/api/v1/journeys/generate",
        json={
            "purpose": "Ausbildung",
            "clarifications": [
                {"question_id": "sector", "question": "Sector", "answer": "Hospitality & Hotellerie"}
            ],
            "cefr_level": "B1",
            "origin_language_code": "id",
            "target_language_code": "de",
            "custom_prompt_override": preview["synthesized_prompt"],
        },
    )
    assert gen_res.status_code == 200
    journey = gen_res.json()
    assert journey["cefr_level"] == "B1"
    assert journey["sector_tag"] == "Hospitality"
    assert journey["status"] == "not_started"
    assert len(journey["phases"]) == 3
    assert journey["total_steps"] == 9
    assert journey["total_vocab_count"] >= 18
    assert journey["phases"][0]["steps"][0]["step_type"] == "vocab_pack"
    assert journey["phases"][0]["steps"][1]["step_type"] == "story_lesson"
    assert journey["phases"][0]["steps"][2]["step_type"] == "checkpoint"


@pytest.mark.asyncio
async def test_multi_journey_non_blocking_switching_filters_and_sorting(client, mock_offline_ai_and_tts):
    # Create Journey 1: German B1 Ausbildung Hospitality
    j1 = (
        await client.post(
            "/api/v1/journeys/generate",
            json={
                "purpose": "Ausbildung",
                "clarifications": [
                    {"question_id": "sector", "question": "Sector", "answer": "Hospitality"}
                ],
                "cefr_level": "B1",
                "origin_language_code": "id",
                "target_language_code": "de",
            },
        )
    ).json()

    # Create Journey 2: German A2 FSJ (same language pair, different purpose & CEFR!)
    j2 = (
        await client.post(
            "/api/v1/journeys/generate",
            json={
                "purpose": "FSJ",
                "clarifications": [
                    {"question_id": "fsj_field", "question": "Field", "answer": "Klinik / Rumah Sakit"}
                ],
                "cefr_level": "A2",
                "origin_language_code": "id",
                "target_language_code": "de",
            },
        )
    ).json()

    # Both exist simultaneously and neither blocks the other
    all_res = await client.get("/api/v1/journeys")
    assert all_res.status_code == 200
    all_journeys = all_res.json()
    ids = {j["id"] for j in all_journeys}
    assert j1["id"] in ids
    assert j2["id"] in ids

    # Filter by CEFR level A2
    a2_res = await client.get("/api/v1/journeys?cefr_level=A2")
    assert a2_res.status_code == 200
    assert all(j["cefr_level"] == "A2" for j in a2_res.json())
    assert any(j["id"] == j2["id"] for j in a2_res.json())

    # Search by domain vocabulary inside Journey 1 ("Rezeption")
    vocab_search_res = await client.get("/api/v1/journeys?search=Rezeption")
    assert vocab_search_res.status_code == 200
    assert any(j["id"] == j1["id"] for j in vocab_search_res.json())

    # Pin Journey 1 and filter by pinned
    pin_res = await client.patch(f"/api/v1/journeys/{j1['id']}/pin")
    assert pin_res.status_code == 200
    assert pin_res.json()["is_pinned"] is True
    pinned_list = (await client.get("/api/v1/journeys?is_pinned=true")).json()
    assert len(pinned_list) == 1
    assert pinned_list[0]["id"] == j1["id"]

    # Switch easily back to Journey 1 via activate
    act_res = await client.patch(f"/api/v1/journeys/{j1['id']}/activate")
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "in_progress"

    # Sort by CEFR level ascending (A2 before B1)
    sorted_lvl = (await client.get("/api/v1/journeys?sort_by=level_asc")).json()
    levels = [j["cefr_level"] for j in sorted_lvl]
    assert levels.index("A2") < levels.index("B1")


@pytest.mark.asyncio
async def test_step_progression_story_hydration_and_flashcard_integration(client, mock_offline_ai_and_tts):
    journey = (
        await client.post(
            "/api/v1/journeys/generate",
            json={
                "purpose": "Ausbildung Hospitality",
                "clarifications": [],
                "cefr_level": "B1",
                "origin_language_code": "id",
                "target_language_code": "de",
            },
        )
    ).json()

    phase1_steps = journey["phases"][0]["steps"]
    vocab_step = phase1_steps[0]
    story_step = phase1_steps[1]
    checkpoint_step = phase1_steps[2]

    # 1. Soft-guided: can jump directly to story_step (or any step) without blocking
    prep_story_res = await client.post(
        f"/api/v1/journeys/{journey['id']}/steps/{story_step['id']}/prepare"
    )
    assert prep_story_res.status_code == 200
    prep_data = prep_story_res.json()
    assert prep_data["newly_generated"] is True
    assert prep_data["story_id"] is not None
    story_id = prep_data["story_id"]

    # 2. Journey story is hidden from default GET /api/v1/stories, shown when include_journey_stories=true
    default_stories = (await client.get("/api/v1/stories?limit=100")).json()
    assert all(s["id"] != story_id for s in default_stories)
    with_journey_stories = (
        await client.get("/api/v1/stories?include_journey_stories=true&limit=100")
    ).json()
    assert any(s["id"] == story_id for s in with_journey_stories)

    # 3. Bulk save vocab pack words to unified SM-2 Flashcard deck
    bulk_res = await client.post(
        f"/api/v1/journeys/{journey['id']}/steps/{vocab_step['id']}/flashcards/bulk"
    )
    assert bulk_res.status_code == 200
    assert bulk_res.json()["saved_count"] == len(vocab_step["vocabularies"])

    # Verify flashcards appear in unified /api/v1/flashcards and /due
    all_fc = (await client.get("/api/v1/flashcards")).json()
    assert any(fc["journey_vocabulary_id"] == vocab_step["vocabularies"][0]["id"] for fc in all_fc)

    # 4. Complete vocab_step and check journey progress updates
    comp_vocab = await client.post(
        f"/api/v1/journeys/{journey['id']}/steps/{vocab_step['id']}/complete",
        json={"quiz_answers": []},
    )
    assert comp_vocab.status_code == 200
    assert comp_vocab.json()["is_completed"] is True
    assert comp_vocab.json()["journey_completed_steps"] == 1

    # 5. Checkpoint quiz scoring
    assert len(checkpoint_step["checkpoint_questions"]) >= 1
    # Submit answers (check endpoint scoring behavior)
    answers_payload = [
        {"question_id": q["id"], "selected_answer": q["options"][0]}
        for q in checkpoint_step["checkpoint_questions"]
    ]
    comp_ckpt = await client.post(
        f"/api/v1/journeys/{journey['id']}/steps/{checkpoint_step['id']}/complete",
        json={"quiz_answers": answers_payload},
    )
    assert comp_ckpt.status_code == 200
    assert comp_ckpt.json()["score_percentage"] is not None
    assert len(comp_ckpt.json()["results"]) == len(checkpoint_step["checkpoint_questions"])
