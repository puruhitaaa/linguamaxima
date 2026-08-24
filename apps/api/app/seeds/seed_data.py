import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import (
    CEFRLevel,
    Category,
    GrammarTip,
    Language,
    LanguagePair,
    Quiz,
    Story,
    UserProgress,
    Vocabulary,
)

logger = logging.getLogger("linguamaxima.seed")

CATEGORIES = [
    {"name": "Travel", "slug": "travel", "icon": "Plane"},
    {"name": "Culture", "slug": "culture", "icon": "Landmark"},
    {"name": "Food", "slug": "food", "icon": "Utensils"},
    {"name": "News", "slug": "news", "icon": "Newspaper"},
    {"name": "Technology", "slug": "technology", "icon": "Cpu"},
    {"name": "Science", "slug": "science", "icon": "FlaskConical"},
    {"name": "Entertainment", "slug": "entertainment", "icon": "Film"},
    {"name": "Daily Life", "slug": "daily-life", "icon": "Coffee"},
    {"name": "History", "slug": "history", "icon": "Hourglass"},
    {"name": "Nature", "slug": "nature", "icon": "Trees"},
]

SAMPLE_STORIES = [
    {
        "cefr_level": CEFRLevel.A1,
        "category_slug": "travel",
        "title": "Eine Reise nach München",
        "title_translated": "Perjalanan ke Munich",
        "summary": "Lukas melakukan perjalanan naik kereta api ke Munich untuk mengunjungi temannya Sarah dan menjelajahi Marienplatz.",
        "content": (
            "Lukas fährt mit dem Zug nach München. Der Zug ist sehr modern und schnell.\n\n"
            "Am Hauptbahnhof wartet seine Freundin Sarah. Sie begrüßen sich herzlich und gehen zusammen in die Innenstadt.\n\n"
            "Auf dem Marienplatz sehen sie das berühmte Rathaus. Das Wetter ist sonnig und alle Menschen lächeln."
        ),
        "content_translated": (
            "Lukas pergi naik kereta api ke Munich. Keretanya sangat modern dan cepat.\n\n"
            "Di stasiun pusat, temannya Sarah sudah menunggu. Mereka saling menyapa dengan hangat dan pergi bersama ke pusat kota.\n\n"
            "Di Marienplatz mereka melihat balai kota yang terkenal. Cuacanya cerah dan semua orang tersenyum."
        ),
        "image_url": "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&auto=format&fit=crop&q=80",
        "vocabulary": [
            {
                "word": "Zug",
                "translation": "Kereta api",
                "part_of_speech": "noun",
                "gender": "der",
                "example_sentence": "Der Zug fährt pünktlich ab.",
                "example_translation": "Kereta api berangkat tepat waktu.",
                "difficulty_rank": 1,
            },
            {
                "word": "Hauptbahnhof",
                "translation": "Stasiun kereta api utama",
                "part_of_speech": "noun",
                "gender": "der",
                "example_sentence": "Wir treffen uns am Hauptbahnhof.",
                "example_translation": "Kita bertemu di stasiun utama.",
                "difficulty_rank": 1,
            },
            {
                "word": "Rathaus",
                "translation": "Balai kota",
                "part_of_speech": "noun",
                "gender": "das",
                "example_sentence": "Das neue Rathaus ist wunderschön.",
                "example_translation": "Balai kota baru sangat indah.",
                "difficulty_rank": 2,
            },
            {
                "word": "warten",
                "translation": "Menunggu",
                "part_of_speech": "verb",
                "gender": None,
                "example_sentence": "Sarah wartet am Bahnsteig.",
                "example_translation": "Sarah menunggu di peron.",
                "difficulty_rank": 1,
            },
            {
                "word": "sonnig",
                "translation": "Cerah / Bersinar matahari",
                "part_of_speech": "adjective",
                "gender": None,
                "example_sentence": "Heute ist ein sonniger Tag.",
                "example_translation": "Hari ini adalah hari yang cerah.",
                "difficulty_rank": 1,
            },
        ],
        "grammar_tips": [
            {
                "title": "Preposisi 'mit' selalu menggunakan Dativ",
                "explanation": "Preposisi 'mit' (dengan / naik) selalu diikuti oleh kasus Dativ. Maskulin/Netral 'der/das' berubah menjadi 'dem'. Contoh: 'mit dem Zug' (bukan 'mit der Zug').",
                "explanation_translated": "Preposisi mit menuntut kasus dativ pada nomina berikutnya.",
                "example": "Lukas fährt mit dem Zug nach München.",
                "example_translation": "Lukas bepergian dengan kereta api ke Munich.",
                "sort_order": 0,
            },
            {
                "title": "Kata Kerja Terpisah (Trennbares Verb)",
                "explanation": "Beberapa kata kerja memiliki awalan yang terpisah saat dikonjugasikan, seperti 'abfahren' (berangkat) -> 'Der Zug fährt ab'.",
                "explanation_translated": "Awalan kata kerja berpisah dan diletakkan di akhir klausa.",
                "example": "Der Zug fährt um acht Uhr ab.",
                "example_translation": "Kereta berangkat pada jam delapan.",
                "sort_order": 1,
            },
        ],
        "quiz_questions": [
            {
                "question_type": "multiple_choice",
                "question": "Wie reist Lukas nach München?",
                "question_translated": "Bagaimana Lukas bepergian ke Munich?",
                "correct_answer": "Mit dem Zug",
                "wrong_answers": ["Mit dem Flugzeug", "Mit dem Bus", "Mit dem Fahrrad"],
                "explanation": "Kalimat pertama menyatakan 'Lukas fährt mit dem Zug nach München'.",
                "sort_order": 0,
            },
            {
                "question_type": "article",
                "question": "Welcher Artikel gehört zu 'Rathaus'?",
                "question_translated": "Apa artikel yang tepat untuk 'Rathaus'?",
                "correct_answer": "das",
                "wrong_answers": ["der", "die", "den"],
                "explanation": "Rathaus adalah kata benda netral (das Rathaus).",
                "sort_order": 1,
            },
            {
                "question_type": "fill_blank",
                "question": "Auf dem Marienplatz sehen sie das berühmte ___.",
                "question_translated": "Di Marienplatz mereka melihat ___ yang terkenal.",
                "correct_answer": "Rathaus",
                "wrong_answers": ["Museum", "Flughafen", "Schloss"],
                "explanation": "Mereka melihat balai kota (Rathaus) di Marienplatz.",
                "sort_order": 2,
            },
            {
                "question_type": "true_false",
                "question": "Sarah wartet am Flughafen auf Lukas.",
                "question_translated": "Sarah menunggu Lukas di bandara.",
                "correct_answer": "Falsch",
                "wrong_answers": ["Richtig"],
                "explanation": "Sarah menunggu di stasiun kereta utama (Hauptbahnhof), bukan bandara.",
                "sort_order": 3,
            },
        ],
    },
    {
        "cefr_level": CEFRLevel.A2,
        "category_slug": "food",
        "title": "Ein traditionelles deutsches Frühstück",
        "title_translated": "Sarapan Tradisional Jerman",
        "summary": "Mengenal budaya sarapan orang Jerman di akhir pekan, lengkap dengan roti gulung renyah, keju, selai, dan kopi segar.",
        "content": (
            "Am Sonntagmorgen frühstücken viele deutsche Familien ganz gemütlich.\n\n"
            "Auf dem Tisch stehen frische Brötchen vom Bäcker, verschiedene Käsesorten, Wurst, Butter und süße Marmelade.\n\n"
            "Herr Müller kocht zwei weiche Eier im Topf. Dazu trinkt die Familie heißen schwarzen Kaffee oder Orangensaft. Für Deutsche ist ein ausgiebiges Frühstück der beste Start in den Tag."
        ),
        "content_translated": (
            "Pada Minggu pagi, banyak keluarga Jerman menikmati sarapan dengan sangat santai dan nyaman.\n\n"
            "Di atas meja tersaji roti gulung segar dari toko roti, berbagai jenis keju, sosis, mentega, dan selai manis.\n\n"
            "Pak Müller merebus dua telur setengah matang di dalam panci. Selain itu keluarga meminum kopi hitam panas atau jus jeruk. Bagi orang Jerman, sarapan yang melimpah adalah awal terbaik untuk memulai hari."
        ),
        "image_url": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80",
        "vocabulary": [
            {
                "word": "Brötchen",
                "translation": "Roti gulung / Roti kecil",
                "part_of_speech": "noun",
                "gender": "das",
                "example_sentence": "Ich esse ein Brötchen mit Käse.",
                "example_translation": "Saya makan roti gulung dengan keju.",
                "difficulty_rank": 1,
            },
            {
                "word": "Bäcker",
                "translation": "Tukang roti / Toko roti",
                "part_of_speech": "noun",
                "gender": "der",
                "example_sentence": "Der Bäcker öffnet um sechs Uhr morgens.",
                "example_translation": "Toko roti buka pukul enam pagi.",
                "difficulty_rank": 1,
            },
            {
                "word": "gemütlich",
                "translation": "Nyaman / Santai",
                "part_of_speech": "adjective",
                "gender": None,
                "example_sentence": "Das Wohnzimmer ist sehr gemütlich.",
                "example_translation": "Ruang tamu ini sangat nyaman.",
                "difficulty_rank": 2,
            },
            {
                "word": "Marmelade",
                "translation": "Selai",
                "part_of_speech": "noun",
                "gender": "die",
                "example_sentence": "Sie mag Erdbeermarmelade.",
                "example_translation": "Dia suka selai stroberi.",
                "difficulty_rank": 1,
            },
        ],
        "grammar_tips": [
            {
                "title": "Diminutif '-chen' selalu bergender netral (das)",
                "explanation": "Kata benda dalam bahasa Jerman yang berakhiran akhiran diminutif '-chen' atau '-lein' selalu berartikel 'das', terlepas dari arti kata aslinya. Contoh: das Brot -> das Brötchen, das Mädchen.",
                "explanation_translated": "Akhiran diminutif -chen selalu menghasilkan nomina netral.",
                "example": "Das Brötchen schmeckt lecker.",
                "example_translation": "Roti kecil itu terasa lezat.",
                "sort_order": 0,
            },
        ],
        "quiz_questions": [
            {
                "question_type": "multiple_choice",
                "question": "Wann frühstücken deutsche Familien besonders gemütlich?",
                "question_translated": "Kapan keluarga Jerman sarapan dengan sangat santai?",
                "correct_answer": "Am Sonntagmorgen",
                "wrong_answers": ["Am Montagabend", "In der Nacht", "Am Freitagnachmittag"],
                "explanation": "Cerita menyebutkan 'Am Sonntagmorgen frühstücken viele deutsche Familien...'.",
                "sort_order": 0,
            },
            {
                "question_type": "article",
                "question": "Welcher Artikel gehört zu 'Marmelade'?",
                "question_translated": "Apa artikel yang tepat untuk 'Marmelade'?",
                "correct_answer": "die",
                "wrong_answers": ["das", "der", "den"],
                "explanation": "'Marmelade' adalah kata benda feminin (die Marmelade).",
                "sort_order": 1,
            },
            {
                "question_type": "true_false",
                "question": "Herr Müller kocht zwei harte Eier.",
                "question_translated": "Pak Müller memasak dua telur rebus matang keras.",
                "correct_answer": "Falsch",
                "wrong_answers": ["Richtig"],
                "explanation": "Cerita menyebutkan 'zwei weiche Eier' (dua telur setengah matang/lembut).",
                "sort_order": 2,
            },
        ],
    },
    {
        "cefr_level": CEFRLevel.B1,
        "category_slug": "technology",
        "title": "Künstliche Intelligenz im Alltag",
        "title_translated": "Kecerdasan Buatan dalam Kehidupan Sehari-hari",
        "summary": "Bagaimana teknologi AI mengubah cara orang belajar bahasa dan bekerja secara efisien di era modern.",
        "content": (
            "Künstliche Intelligenz verändert die Art und Weise, wie wir Sprachen lernen und im Beruf kommunizieren.\n\n"
            "Moderne Sprachmodelle können Texte in Sekundenschnelle übersetzen, individuelle Übungen erstellen und grammatikalische Strukturen verständlich erklären.\n\n"
            "Obwohl viele Experten die rasante Entwicklung loben, betonen Sprachwissenschaftler, dass der menschliche Austausch und echte Gespräche für flüssiges Sprechen unverzichtbar bleiben."
        ),
        "content_translated": (
            "Kecerdasan buatan mengubah cara kita belajar bahasa dan berkomunikasi di tempat kerja.\n\n"
            "Model bahasa modern dapat menerjemahkan teks dalam hitungan detik, membuat latihan individual, dan menjelaskan struktur tata bahasa secara mudah dipahami.\n\n"
            "Meskipun banyak pakar memuji perkembangan pesat ini, ahli bahasa menegaskan bahwa interaksi manusia dan percakapan nyata tetap tak tergantikan untuk kefasihan berbicara."
        ),
        "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
        "vocabulary": [
            {
                "word": "Künstliche Intelligenz",
                "translation": "Kecerdasan Buatan (AI)",
                "part_of_speech": "noun",
                "gender": "die",
                "example_sentence": "Die Künstliche Intelligenz entwickelt sich schnell.",
                "example_translation": "Kecerdasan buatan berkembang dengan cepat.",
                "difficulty_rank": 2,
            },
            {
                "word": "unverzichtbar",
                "translation": "Sangat penting / Tak tergantikan",
                "part_of_speech": "adjective",
                "gender": None,
                "example_sentence": "Wasser ist unverzichtbar für das Leben.",
                "example_translation": "Air sangat penting bagi kehidupan.",
                "difficulty_rank": 3,
            },
            {
                "word": "verändern",
                "translation": "Mengubah",
                "part_of_speech": "verb",
                "gender": None,
                "example_sentence": "Technologie verändert unsere Welt.",
                "example_translation": "Teknologi mengubah dunia kita.",
                "difficulty_rank": 2,
            },
        ],
        "grammar_tips": [
            {
                "title": "Klausa Konsesif dengan 'obwohl' (Meskipun)",
                "explanation": "Konjungsi subordinatif 'obwohl' memperkenalkan klausa konsesif di mana kata kerja terkonjugasi harus berada di posisi paling akhir klausa.",
                "explanation_translated": "Obwohl mengirim kata kerja ke posisi paling akhir anak kalimat.",
                "example": "Obwohl viele Experten die Entwicklung loben, betonen Sprachwissenschaftler die Grenzen.",
                "example_translation": "Meskipun banyak ahli memuji perkembangannya, ahli bahasa menekankan batasannya.",
                "sort_order": 0,
            },
        ],
        "quiz_questions": [
            {
                "question_type": "multiple_choice",
                "question": "Was bleibt laut Sprachwissenschaftlern für flüssiges Sprechen unverzichtbar?",
                "question_translated": "Apa yang menurut ahli bahasa tetap tak tergantikan untuk kelancaran berbicara?",
                "correct_answer": "Echte menschliche Gespräche",
                "wrong_answers": ["Schnellere Computer", "Mehr Grammatikbücher", "Nur Textnachrichten"],
                "explanation": "Teks menyatakan bahwa 'der menschliche Austausch und echte Gespräche ... unverzichtbar bleiben'.",
                "sort_order": 0,
            },
            {
                "question_type": "article",
                "question": "Welcher Artikel gehört zu 'Entwicklung'?",
                "question_translated": "Apa artikel yang tepat untuk 'Entwicklung'?",
                "correct_answer": "die",
                "wrong_answers": ["der", "das", "dem"],
                "explanation": "Kata benda berakhiran '-ung' selalu bergender feminin (die Entwicklung).",
                "sort_order": 1,
            },
        ],
    },
]

SUPPORTED_LANGUAGES = [
    {"code": "de", "name": "German", "native_name": "Deutsch"},
    {"code": "id", "name": "Indonesian", "native_name": "Bahasa Indonesia"},
    {"code": "en", "name": "English", "native_name": "English"},
    {"code": "es", "name": "Spanish", "native_name": "Español"},
    {"code": "fr", "name": "French", "native_name": "Français"},
    {"code": "it", "name": "Italian", "native_name": "Italiano"},
    {"code": "ja", "name": "Japanese", "native_name": "日本語"},
    {"code": "zh", "name": "Chinese", "native_name": "中文"},
    {"code": "ko", "name": "Korean", "native_name": "한국어"},
    {"code": "pt", "name": "Portuguese", "native_name": "Português"},
    {"code": "nl", "name": "Dutch", "native_name": "Nederlands"},
    {"code": "ru", "name": "Russian", "native_name": "Русский"},
    {"code": "ar", "name": "Arabic", "native_name": "العربية"},
]

POPULAR_PAIRS = [
    ("id", "de"),
    ("en", "de"),
    ("id", "en"),
    ("en", "es"),
    ("en", "fr"),
    ("en", "it"),
    ("en", "ja"),
    ("id", "ja"),
    ("id", "es"),
    ("id", "fr"),
    ("id", "zh"),
    ("en", "zh"),
    ("en", "ko"),
    ("en", "pt"),
]

async def seed_database(session: AsyncSession) -> None:
    """Seeds initial languages, pairs, categories, and sample stories."""
    # 1. Seed languages
    lang_map = {}
    for lang_data in SUPPORTED_LANGUAGES:
        lang = (
            await session.execute(select(Language).where(Language.code == lang_data["code"]))
        ).scalar_one_or_none()
        if not lang:
            lang = Language(
                code=lang_data["code"],
                name=lang_data["name"],
                native_name=lang_data["native_name"],
            )
            session.add(lang)
            await session.flush()
        lang_map[lang_data["code"]] = lang

    await session.flush()

    # 2. Seed popular language pairs
    pair_map = {}
    for origin_code, target_code in POPULAR_PAIRS:
        origin = lang_map.get(origin_code)
        target = lang_map.get(target_code)
        if not origin or not target:
            continue

        pair = (
            await session.execute(
                select(LanguagePair).where(
                    LanguagePair.origin_language_id == origin.id,
                    LanguagePair.target_language_id == target.id,
                )
            )
        ).scalar_one_or_none()

        if not pair:
            pair = LanguagePair(
                origin_language_id=origin.id,
                target_language_id=target.id,
                is_active=True,
            )
            session.add(pair)
            await session.flush()
        pair_map[f"{origin_code}_{target_code}"] = pair

    pair = pair_map.get("id_de")

    # 3. Seed categories
    category_map = {}
    for cat_data in CATEGORIES:
        cat = (
            await session.execute(select(Category).where(Category.slug == cat_data["slug"]))
        ).scalar_one_or_none()
        if not cat:
            cat = Category(name=cat_data["name"], slug=cat_data["slug"], icon=cat_data["icon"])
            session.add(cat)
            await session.flush()
        category_map[cat_data["slug"]] = cat

    # 4. Seed sample stories if empty
    existing_stories_count = (await session.execute(select(Story))).scalars().all()
    if not existing_stories_count:
        logger.info("Seeding initial stories...")
        for story_data in SAMPLE_STORIES:
            cat = category_map.get(story_data["category_slug"])
            story = Story(
                language_pair_id=pair.id,
                category_id=cat.id if cat else None,
                cefr_level=story_data["cefr_level"],
                title=story_data["title"],
                title_translated=story_data["title_translated"],
                content=story_data["content"],
                content_translated=story_data["content_translated"],
                summary=story_data["summary"],
                image_url=story_data["image_url"],
                estimated_reading_minutes=3,
                word_count=len(story_data["content"].split()),
                ai_model="curated-seed",
                ai_provider="linguamaxima",
                is_published=True,
            )
            session.add(story)
            await session.flush()

            # Vocab
            for v_data in story_data["vocabulary"]:
                vocab = Vocabulary(
                    story_id=story.id,
                    word=v_data["word"],
                    translation=v_data["translation"],
                    part_of_speech=v_data["part_of_speech"],
                    gender=v_data["gender"],
                    example_sentence=v_data["example_sentence"],
                    example_translation=v_data["example_translation"],
                    difficulty_rank=v_data["difficulty_rank"],
                )
                session.add(vocab)

            # Grammar
            for gt_data in story_data["grammar_tips"]:
                gt = GrammarTip(
                    story_id=story.id,
                    title=gt_data["title"],
                    explanation=gt_data["explanation"],
                    explanation_translated=gt_data["explanation_translated"],
                    example=gt_data["example"],
                    example_translation=gt_data["example_translation"],
                    sort_order=gt_data["sort_order"],
                )
                session.add(gt)

            # Quizzes
            for q_data in story_data["quiz_questions"]:
                quiz = Quiz(
                    story_id=story.id,
                    question_type=q_data["question_type"],
                    question=q_data["question"],
                    question_translated=q_data["question_translated"],
                    correct_answer=q_data["correct_answer"],
                    wrong_answers=q_data["wrong_answers"],
                    explanation=q_data["explanation"],
                    sort_order=q_data["sort_order"],
                )
                session.add(quiz)

            # User progress
            progress = UserProgress(
                story_id=story.id,
                is_favorite=False,
                quiz_attempts=0,
            )
            session.add(progress)

    await session.commit()
    logger.info("Database seeding completed successfully.")
