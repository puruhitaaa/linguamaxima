import json
import logging
import os
import re
from typing import Optional, Tuple
from pydantic import ValidationError
import litellm
from app.core.config import settings
from app.models import CEFRLevel
from app.schemas import GeneratedStoryBundle, GeneratedVocabularyItem, GeneratedGrammarTip, GeneratedQuizQuestion

logger = logging.getLogger("linguamaxima.ai")

# Universal CEFR guidelines applicable to any target language
CEFR_GUIDELINES = {
    CEFRLevel.A1: {
        "grammar": "Basic present tense, fundamental verbs (be, have, do, go), simple sentence structures, basic affirmative and interrogative forms.",
        "vocab": "Extremely common everyday words: greetings, numbers, family, food, daily objects, basic time expressions.",
        "words": "80-120 words",
    },
    CEFRLevel.A2: {
        "grammar": "Basic past and present tenses, basic modal verbs, simple coordinating and subordinating conjunctions, routine questions and commands.",
        "vocab": "Routine daily activities, shopping, local geography, employment, hobbies, simple descriptive adjectives.",
        "words": "120-180 words",
    },
    CEFRLevel.B1: {
        "grammar": "Main and subordinate clauses, multiple past tenses, introduction to passive voice, conditional structures, comparative and superlative forms.",
        "vocab": "Work, school, leisure, travel, expressing thoughts and feelings, personal experiences, connective phrases.",
        "words": "180-250 words",
    },
    CEFRLevel.B2: {
        "grammar": "Complex syntax, nuanced modal expressions, relative clauses, indirect speech, subjunctive/conditional moods, discourse markers.",
        "vocab": "Abstract topics, technical and professional vocabulary, idiomatic expressions, thematic collocations.",
        "words": "250-350 words",
    },
    CEFRLevel.C1: {
        "grammar": "Full range of complex syntactic structures, stylistic variation, passive/causative subtleties, inversion, advanced discourse markers.",
        "vocab": "Advanced literary and academic vocabulary, subtle nuances and connotations, wide idiomatic mastery.",
        "words": "350-450 words",
    },
    CEFRLevel.C2: {
        "grammar": "Complete mastery of all grammatical nuances, stylistic subtleties, and register shifts with effortless precision.",
        "vocab": "Native-level expressive, figurative, rhetorical, and domain-specific vocabulary.",
        "words": "400-550 words",
    },
}

class AIService:
    def _build_prompt(
        self,
        cefr_level: CEFRLevel,
        category: str,
        topic_hint: Optional[str] = None,
        target_lang: str = "German",
        origin_lang: str = "Indonesian",
        story_type: str = "auto",
    ) -> Tuple[str, str]:
        guidelines = CEFR_GUIDELINES.get(cefr_level, CEFR_GUIDELINES[CEFRLevel.A1])
        topic_clause = f" specifically about '{topic_hint}'" if topic_hint else ""

        system_prompt = (
            f"You are an expert language educator specializing in teaching {target_lang} to native {origin_lang} speakers. "
            f"You generate engaging, pedagogical CEFR-graded stories accompanied by structured vocabulary lists, grammar tips, and comprehension quizzes. "
            f"You MUST respond ONLY with valid JSON conforming exactly to the requested schema. Do not wrap output in markdown codeblocks if possible, just raw JSON."
        )

        if story_type == "dialogue":
            format_instructions = """
Format & Perspective Requirement:
- MANDATORY STORY FORMAT: **CONVERSATIONAL DIALOGUE**.
- The story MUST be a direct, engaging dialogue between 2 or more distinct characters (e.g. 1 male, 1 female, or named roles).
- Every single paragraph in "content" MUST start with the speaker's name: `SpeakerName: Spoken text without quotes or third-person narration`.
- Strictly NO third-person narration, narrative summaries, or dialogue tags (e.g. do NOT write 'said Lukas' or 'she replied').
- Parallel Translation: "content_translated" MUST mirror each dialogue turn with `SpeakerName: Translated text`.
"""
        elif story_type == "monologue":
            format_instructions = """
Format & Perspective Requirement:
- MANDATORY STORY FORMAT: **SOLO MONOLOGUE / PERSONAL REFLECTION**.
- The story MUST be a first-person personal story, journal entry, or inner monologue from a single character's perspective.
- Do NOT use speaker prefixes or script formatting. Write standard narrative paragraphs.
- Parallel Translation: "content_translated" MUST match the narrative paragraphs.
"""
        elif story_type == "informative":
            format_instructions = """
Format & Perspective Requirement:
- MANDATORY STORY FORMAT: **INFORMATIVE / FACTUAL ARTICLE**.
- The text MUST be an informative, educational article or factual overview (e.g. cultural background, nature, science, history, city guide, or interesting educational facts) written in an engaging, accessible third-person expository style.
- Strictly NO dialogue turns, speaker tags, or fictional character drama. Write well-structured, clear informational paragraphs.
- Parallel Translation: "content_translated" MUST match the informative paragraphs.
"""
        else:
            format_instructions = """
Format & Perspective Guidelines:
- If the scenario involves 2 or more people communicating (conversations, ordering food, asking directions, meeting friends, travel exchanges, workplace/daily chats), format the story as a **conversational dialogue story**.
  - In a dialogue story, every paragraph represents a dialogue turn starting with the speaker's name: `SpeakerName: Spoken text without quotes or third-person narration`.
  - Do NOT include third-person narration or dialogue tags (such as 'he said', 'she replied', 'said Marco') in dialogue stories. Keep it direct spoken conversational lines.
  - Choose natural, distinct names for the characters (e.g. 1 male, 1 female or named roles like 'Kellner' / 'Gast').
- If the scenario is a solitary experience, monologue, journal entry, or descriptive scene, write standard first-person or descriptive narrative paragraphs without speaker prefixes.
- Parallel Translation: "content_translated" MUST exactly match the paragraph structure of "content" (including matching `SpeakerName: Translated text` for dialogues, or translated narrative paragraphs for monologues).
"""

        user_prompt = f"""
Create a complete language-learning story package for CEFR level {cefr_level.value} in the category '{category}'{topic_clause}.
Target Language: {target_lang}
Learner's Native Language (Translations & Explanations): {origin_lang}

Constraints for CEFR Level {cefr_level.value}:
- Story length: {guidelines['words']}
- Grammar level: {guidelines['grammar']}
- Vocabulary complexity: {guidelines['vocab']}
{format_instructions}
Requirements:
1. "title": Story title in {target_lang}.
2. "title_translated": Story title translated into natural {origin_lang}.
3. "content": The complete story in {target_lang}. Format into 3-6 clean paragraphs separated by double newlines (`\\n\\n`).
4. "content_translated": The full parallel translation in {origin_lang}, matching the paragraph structure.
5. "summary": A 1-2 sentence overview of the story in {origin_lang}.
6. "vocabulary": A list of 6-10 key {target_lang} vocabulary words from the story. Each item must contain:
   - "word": The word in {target_lang} (for nouns, do not include the article in this field).
   - "translation": Translation in {origin_lang}.
   - "part_of_speech": "noun", "verb", "adjective", "adverb", "preposition", or "phrase".
   - "gender": For nouns in languages with grammatical gender (e.g., German 'der/die/das', Spanish 'el/la', French 'le/la', Italian 'il/la/lo'), specify the appropriate article/gender. For non-nouns or languages without grammatical gender (e.g. English, Indonesian, Japanese), use null.
   - "example_sentence": A short {target_lang} sentence using the word.
   - "example_translation": The sentence translated into {origin_lang}.
   - "difficulty_rank": 1 (easy) to 3 (challenging).
7. "grammar_tips": 2-3 contextual grammar explanations relevant to structures found in this story.
   - "title": Short title explaining the target language rule in {origin_lang}.
   - "explanation": Clear, accessible grammar rule explained in {origin_lang}.
   - "explanation_translated": Same explanation summary in {origin_lang}.
   - "example": Sentence from or related to the story in {target_lang}.
   - "example_translation": Example translated into {origin_lang}.
8. "quiz_questions": 4-5 comprehension and grammar questions. Must include a mix of:
   - "multiple_choice": Comprehension questions about the story events (questions in {target_lang}, explanation in {origin_lang}).
   - "article": Practice identifying grammatical gender/article for a noun if {target_lang} has grammatical gender, or a core grammar question if not.
   - "fill_blank": Sentence with a missing word in {target_lang}.
   - "true_false": True or False statement about the story in {target_lang}.
   Each question item must contain:
   - "question_type": "multiple_choice", "article", "fill_blank", or "true_false".
   - "question": Question in {target_lang}.
   - "question_translated": Question translated or hinted in {origin_lang}.
   - "correct_answer": The exact correct option string.
   - "wrong_answers": An array of 3 plausible wrong options (for true_false, only 1 wrong option).
   - "explanation": Brief explanation in {origin_lang} of why the correct answer is right.

Respond with valid JSON only matching the schema:
{{
  "title": "...",
  "title_translated": "...",
  "content": "...",
  "content_translated": "...",
  "summary": "...",
  "vocabulary": [...],
  "grammar_tips": [...],
  "quiz_questions": [...]
}}
"""
        return system_prompt, user_prompt

    def _clean_json_response(self, text: str) -> str:
        """Strips markdown code fences if present."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
        return cleaned

    async def generate_story(
        self,
        cefr_level: CEFRLevel = CEFRLevel.A1,
        category: str = "travel",
        topic_hint: Optional[str] = None,
        target_lang: str = "German",
        origin_lang: str = "Indonesian",
        story_type: str = "auto",
    ) -> Tuple[GeneratedStoryBundle, str, str]:
        """
        Generates a structured story bundle using LiteLLM.
        Returns (bundle, model_used, provider_used).
        """
        system_prompt, user_prompt = self._build_prompt(
            cefr_level=cefr_level,
            category=category,
            topic_hint=topic_hint,
            target_lang=target_lang,
            origin_lang=origin_lang,
            story_type=story_type,
        )

        models_to_try = [
            (settings.default_ai_model, "gemini"),
            (settings.fallback_ai_model, "groq"),
        ]

        # Set environment variables for litellm if present
        if settings.gemini_api_key:
            os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
        if settings.groq_api_key:
            os.environ["GROQ_API_KEY"] = settings.groq_api_key
        if settings.openai_api_key:
            os.environ["OPENAI_API_KEY"] = settings.openai_api_key

        last_error = None

        for model_name, provider in models_to_try:
            try:
                logger.info(f"Attempting story generation with model {model_name} for {target_lang} from {origin_lang}...")
                response = await litellm.acompletion(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.7,
                )

                content_raw = response.choices[0].message.content
                cleaned_json = self._clean_json_response(content_raw)
                data = json.loads(cleaned_json)
                bundle = GeneratedStoryBundle.model_validate(data)
                logger.info(f"Story generation succeeded with {model_name} ({bundle.title})")
                return bundle, model_name, provider
            except Exception as e:
                logger.warning(f"Generation attempt with {model_name} failed: {e}")
                last_error = e

        # If LLM API keys are not set or unavailable, return a rich mock story bundle
        logger.warning(f"All LLM providers failed or unconfigured. Falling back to default template. Error: {last_error}")
        fallback_bundle = self._get_curated_fallback(cefr_level, category, topic_hint, target_lang, origin_lang)
        return fallback_bundle, "template/fallback-engine", "internal"

    def _get_curated_fallback(
        self,
        cefr_level: CEFRLevel,
        category: str,
        topic_hint: Optional[str] = None,
        target_lang: str = "German",
        origin_lang: str = "Indonesian",
    ) -> GeneratedStoryBundle:
        """Returns a high-quality educational fallback bundle for offline/mock operation tailored to the target language."""
        target_clean = target_lang.lower().strip()

        # 1. Spanish Fallback Bundle (Conversational Dialogue)
        if target_clean in ["spanish", "español", "es"]:
            return GeneratedStoryBundle(
                title="Un café soleado en Madrid",
                title_translated=f"A Sunny Café in Madrid ({origin_lang} translation)",
                content=(
                    "Carlos: ¡Hola Sofía! Qué buen día hace en Madrid.\n\n"
                    "Sofía: ¡Hola Carlos! Sí, hace mucho sol hoy. ¿Tomamos un café en el parque del Retiro?\n\n"
                    "Carlos: ¡Buena idea! Después podemos visitar el nuevo museo de arte.\n\n"
                    "Sofía: Perfecto. Yo compro las entradas por internet y tú pides los cafés."
                ),
                content_translated=(
                    f"Carlos: Hello Sofia! What a lovely day in Madrid.\n\n"
                    f"Sofia: Hello Carlos! Yes, it is very sunny today. Shall we drink coffee in Retiro Park?\n\n"
                    f"Carlos: Great idea! Afterwards we can visit the new art museum.\n\n"
                    f"Sofia: Perfect. I will buy the tickets online and you order the coffees."
                ),
                summary="Carlos and Sofia meet on a sunny day in Madrid to drink coffee in Retiro Park and visit an art museum.",
                vocabulary=[
                    GeneratedVocabularyItem(
                        word="sol",
                        translation="Sun",
                        part_of_speech="noun",
                        gender="el",
                        example_sentence="Hoy hace mucho sol en Madrid.",
                        example_translation="Today it is very sunny in Madrid.",
                        difficulty_rank=1,
                    ),
                    GeneratedVocabularyItem(
                        word="parque",
                        translation="Park",
                        part_of_speech="noun",
                        gender="el",
                        example_sentence="Tomamos un café en el parque.",
                        example_translation="We drink coffee in the park.",
                        difficulty_rank=1,
                    ),
                    GeneratedVocabularyItem(
                        word="visitar",
                        translation="To visit",
                        part_of_speech="verb",
                        gender=None,
                        example_sentence="Podemos visitar el nuevo museo.",
                        example_translation="We can visit the new museum.",
                        difficulty_rank=2,
                    ),
                    GeneratedVocabularyItem(
                        word="entrada",
                        translation="Ticket / Entry pass",
                        part_of_speech="noun",
                        gender="la",
                        example_sentence="Yo compro las entradas por internet.",
                        example_translation="I buy the tickets online.",
                        difficulty_rank=2,
                    ),
                ],
                grammar_tips=[
                    GeneratedGrammarTip(
                        title="Artículos Definidos en Español (el / la)",
                        explanation="En español, los sustantivos masculinos suelen llevar el artículo 'el' y los femeninos 'la'.",
                        explanation_translated="Spanish nouns take 'el' for masculine and 'la' for feminine.",
                        example="El parque y la entrada.",
                        example_translation="The park and the ticket.",
                    ),
                    GeneratedGrammarTip(
                        title="Verbos de Clima (Hacer + sustantivo)",
                        explanation="Para describir el clima en presente, usamos el verbo 'hacer': 'hace sol', 'hace buen día'.",
                        explanation_translated="Weather expressions frequently use 'hacer'.",
                        example="Hoy hace mucho sol.",
                        example_translation="Today it is very sunny.",
                    ),
                ],
                quiz_questions=[
                    GeneratedQuizQuestion(
                        question_type="multiple_choice",
                        question="¿Dónde deciden tomar un café Carlos y Sofía?",
                        question_translated="Where do Carlos and Sofia decide to drink coffee?",
                        correct_answer="En el parque del Retiro",
                        wrong_answers=["En la estación de tren", "En la biblioteca", "En casa de Sofía"],
                        explanation="Sofía propone tomar un café en el parque del Retiro.",
                    ),
                    GeneratedQuizQuestion(
                        question_type="article",
                        question="¿Qué artículo corresponde al sustantivo 'parque'?",
                        question_translated="Which article matches 'parque'?",
                        correct_answer="el",
                        wrong_answers=["la", "los", "las"],
                        explanation="'Parque' es un sustantivo masculino (el parque).",
                    ),
                    GeneratedQuizQuestion(
                        question_type="fill_blank",
                        question="Sofía compra las ___ por internet.",
                        question_translated="Sofia buys the ___ online.",
                        correct_answer="entradas",
                        wrong_answers=["cafés", "mesas", "libros"],
                        explanation="Sofía compra las entradas para el museo.",
                    ),
                    GeneratedQuizQuestion(
                        question_type="true_false",
                        question="Carlos y Sofía van a visitar un museo.",
                        question_translated="Carlos and Sofia are going to visit a museum.",
                        correct_answer="Verdadero",
                        wrong_answers=["Falso"],
                        explanation="Ambos acuerdan visitar el nuevo museo de arte después del café.",
                    ),
                ],
            )

        # 2. English Fallback Bundle (Conversational Dialogue)
        if target_clean in ["english", "en"]:
            return GeneratedStoryBundle(
                title="A Sunny Morning in London",
                title_translated=f"A Sunny Morning in London ({origin_lang} translation)",
                content=(
                    "Oliver: Good morning Emily! The sun is shining brightly today.\n\n"
                    "Emily: Good morning Oliver! Yes, it is wonderful. Would you like to get a coffee in the park?\n\n"
                    "Oliver: That sounds lovely! We can also visit the modern art gallery later.\n\n"
                    "Emily: Great idea. I will book our tickets online right now."
                ),
                content_translated=(
                    f"Oliver: Good morning Emily! The sun is shining brightly today.\n\n"
                    f"Emily: Good morning Oliver! Yes, it is wonderful. Would you like to get a coffee in the park?\n\n"
                    f"Oliver: That sounds lovely! We can also visit the modern art gallery later.\n\n"
                    f"Emily: Great idea. I will book our tickets online right now."
                ),
                summary="Oliver and Emily meet on a bright morning in London, grabbing coffee in the park and booking gallery tickets.",
                vocabulary=[
                    GeneratedVocabularyItem(
                        word="brightly",
                        translation="Terang / Cemerlang",
                        part_of_speech="adverb",
                        gender=None,
                        example_sentence="The sun is shining brightly.",
                        example_translation="Matahari bersinar dengan terang.",
                        difficulty_rank=1,
                    ),
                    GeneratedVocabularyItem(
                        word="wonderful",
                        translation="Luar biasa / Sangat menyenangkan",
                        part_of_speech="adjective",
                        gender=None,
                        example_sentence="The weather is wonderful today.",
                        example_translation="Cuacanya sangat menyenangkan hari ini.",
                        difficulty_rank=1,
                    ),
                    GeneratedVocabularyItem(
                        word="gallery",
                        translation="Galeri seni",
                        part_of_speech="noun",
                        gender=None,
                        example_sentence="We can visit the modern art gallery.",
                        example_translation="Kita bisa mengunjungi galeri seni modern.",
                        difficulty_rank=2,
                    ),
                ],
                grammar_tips=[
                    GeneratedGrammarTip(
                        title="Present Continuous Tense",
                        explanation="Used for actions happening right now at the moment of speaking (e.g. 'the sun is shining').",
                        explanation_translated="Digunakan untuk menyatakan kejadian yang sedang berlangsung.",
                        example="The sun is shining brightly.",
                        example_translation="Matahari sedang bersinar terang.",
                    ),
                ],
                quiz_questions=[
                    GeneratedQuizQuestion(
                        question_type="multiple_choice",
                        question="What do Oliver and Emily decide to do first?",
                        question_translated="Apa yang Oliver dan Emily putuskan untuk dilakukan terlebih dahulu?",
                        correct_answer="Get a coffee in the park",
                        wrong_answers=["Go straight to sleep", "Buy a train ticket", "Visit the library"],
                        explanation="Emily invites Oliver to get coffee in the park first.",
                    ),
                    GeneratedQuizQuestion(
                        question_type="fill_blank",
                        question="Emily will book our ___ online right now.",
                        question_translated="Emily akan memesan ___ kita secara online sekarang.",
                        correct_answer="tickets",
                        wrong_answers=["coffees", "bicycles", "books"],
                        explanation="Emily offers to book the gallery tickets online.",
                    ),
                ],
            )

        # 3. Default German Fallback Bundle (Conversational Dialogue)
        return GeneratedStoryBundle(
            title="Ein sonniger Tag in Berlin",
            title_translated="Hari yang Cerah di Berlin",
            content=(
                "Lukas: Hallo Anna! Was für ein schöner Tag heute in Berlin!\n\n"
                "Anna: Hallo Lukas! Ja, die Sonne scheint so herrlich. Gehen wir in den Park und trinken einen Kaffee?\n\n"
                "Lukas: Sehr gerne! Danach können wir das berühmte Museum im Stadtzentrum besuchen.\n\n"
                "Anna: Eine tolle Idee! Ich kaufe schnell zwei Eintrittskarten auf meinem Handy."
            ),
            content_translated=(
                "Lukas: Halo Anna! Betapa indahnya hari ini di Berlin!\n\n"
                "Anna: Halo Lukas! Ya, matahari bersinar sangat indah. Mau pergi ke taman dan minum kopi?\n\n"
                "Lukas: Dengan senang hati! Setelah itu kita bisa mengunjungi museum terkenal di pusat kota.\n\n"
                "Anna: Ide yang bagus! Aku beli dua tiket masuk di ponselku sekarang."
            ),
            summary="Lukas dan temannya Anna menikmati hari yang cerah di Berlin, minum kopi di taman dan memesan tiket museum bersama.",
            vocabulary=[
                GeneratedVocabularyItem(
                    word="Sonne",
                    translation="Matahari",
                    part_of_speech="noun",
                    gender="die",
                    example_sentence="Die Sonne scheint so herrlich.",
                    example_translation="Matahari bersinar sangat indah.",
                    difficulty_rank=1,
                ),
                GeneratedVocabularyItem(
                    word="Park",
                    translation="Taman",
                    part_of_speech="noun",
                    gender="der",
                    example_sentence="Gehen wir in den Park?",
                    example_translation="Mau pergi ke taman?",
                    difficulty_rank=1,
                ),
                GeneratedVocabularyItem(
                    word="Eintrittskarte",
                    translation="Tiket masuk",
                    part_of_speech="noun",
                    gender="die",
                    example_sentence="Ich kaufe zwei Eintrittskarten.",
                    example_translation="Aku membeli dua tiket masuk.",
                    difficulty_rank=2,
                ),
                GeneratedVocabularyItem(
                    word="besuchen",
                    translation="Mengunjungi",
                    part_of_speech="verb",
                    gender=None,
                    example_sentence="Wir können das Museum besuchen.",
                    example_translation="Kita bisa mengunjungi museum itu.",
                    difficulty_rank=2,
                ),
            ],
            grammar_tips=[
                GeneratedGrammarTip(
                    title="Artikel Definit (der, die, das)",
                    explanation="Dalam bahasa Jerman, setiap kata benda memiliki gender gramatikal: maskulin (der), feminin (die), atau netral (das). Contoh: 'die Sonne' (feminin), 'der Park' (maskulin), 'das Museum' (netral).",
                    explanation_translated="Setiap nomina memiliki gender tertentu yang menentukan artikelnya.",
                    example="Die Sonne scheint und wir gehen in den Park.",
                    example_translation="Matahari bersinar dan kita pergi ke taman.",
                ),
                GeneratedGrammarTip(
                    title="Modalverb 'können' (Bisa / Dapat)",
                    explanation="Kata kerja modal 'können' digunakan untuk menyatakan kemampuan atau kemungkinan. Dalam kalimat, kata kerja utama ditempatkan di akhir dalam bentuk infinitif.",
                    explanation_translated="Struktur kalimat dengan kata kerja modal 'können'.",
                    example="Wir können das Museum besuchen.",
                    example_translation="Kita bisa mengunjungi museum itu.",
                ),
            ],
            quiz_questions=[
                GeneratedQuizQuestion(
                    question_type="multiple_choice",
                    question="Wohin möchten Lukas und Anna zuerst gehen?",
                    question_translated="Ke mana Lukas dan Anna ingin pergi terlebih dahulu?",
                    correct_answer="In den Park",
                    wrong_answers=["Zum Bahnhof", "Ins Kino", "Nach Hause"],
                    explanation="Anna schlägt vor: 'Gehen wir in den Park und trinken einen Kaffee?'.",
                ),
                GeneratedQuizQuestion(
                    question_type="article",
                    question="Welcher Artikel gehört zu 'Sonne'?",
                    question_translated="Apa artikel yang tepat untuk kata 'Sonne'?",
                    correct_answer="die",
                    wrong_answers=["der", "das", "dem"],
                    explanation="'Sonne' adalah kata benda feminin (die Sonne).",
                ),
                GeneratedQuizQuestion(
                    question_type="fill_blank",
                    question="Anna kauft zwei ___ auf ihrem Handy.",
                    question_translated="Anna membeli dua ___ di ponselnya.",
                    correct_answer="Eintrittskarten",
                    wrong_answers=["Kaffees", "Parks", "Bücher"],
                    explanation="Anna kauft zwei Eintrittskarten für das Museum.",
                ),
                GeneratedQuizQuestion(
                    question_type="true_false",
                    question="Lukas und Anna möchten ein Museum besuchen.",
                    question_translated="Lukas dan Anna ingin mengunjungi museum.",
                    correct_answer="Richtig",
                    wrong_answers=["Falsch"],
                    explanation="Lukas schlägt vor, das berühmte Museum im Stadtzentrum zu besuchen.",
                ),
            ],
        )

ai_service = AIService()
