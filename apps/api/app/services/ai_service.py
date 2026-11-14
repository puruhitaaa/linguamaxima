import json
import logging
import os
from typing import TypeVar

import litellm
from fastapi import HTTPException
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.models import CEFRLevel, JourneyStepType
from app.schemas import (
    ClarificationAnswerItem,
    ClarificationQuestionItem,
    GeneratedCheckpointQuestion,
    GeneratedClarificationResult,
    GeneratedGrammarTip,
    GeneratedJourneyCurriculum,
    GeneratedJourneyPhase,
    GeneratedJourneyStep,
    GeneratedJourneyVocabItem,
    GeneratedPromptSynthesis,
    GeneratedQuizQuestion,
    GeneratedStoryBundle,
    GeneratedVocabularyItem,
)

TModel = TypeVar("TModel", bound=BaseModel)

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
        topic_hint: str | None = None,
        target_lang: str = "German",
        origin_lang: str = "Indonesian",
        story_type: str = "auto",
        required_vocabulary: list[str] | None = None,
    ) -> tuple[str, str]:
        guidelines = CEFR_GUIDELINES.get(cefr_level, CEFR_GUIDELINES[CEFRLevel.A1])
        topic_clause = f" specifically about '{topic_hint}'" if topic_hint else ""
        vocab_clause = ""
        if required_vocabulary:
            vocab_joined = ", ".join(required_vocabulary[:12])
            vocab_clause = (
                f"\nMandatory Target Vocabulary Integration:\n"
                f"- You MUST naturally weave as many of these exact target words/phrases as possible into the story and vocabulary list: {vocab_joined}.\n"
            )

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
- Every single paragraph in "content" MUST start with the speaker's plain name (no markdown bolding `**` or bullets): `SpeakerName: Spoken text without quotes or third-person narration`.
- Strictly NO third-person narration, narrative summaries, or dialogue tags (e.g. do NOT write 'said Lukas' or 'she replied').
- Set "speaker_name" and "speaker_gender" to null, and populate "speaker_genders" mapping each exact SpeakerName to "male" or "female" (e.g. {"Lukas": "male", "Anna": "female"}).
- Parallel Translation: "content_translated" MUST mirror each dialogue turn with `SpeakerName: Translated text`.
"""
        elif story_type == "monologue":
            format_instructions = """
Format & Perspective Requirement:
- MANDATORY STORY FORMAT: **SOLO MONOLOGUE / PERSONAL REFLECTION**.
- The story MUST be a first-person personal story, journal entry, or inner monologue from a single character's perspective.
- Establish a clear character identity for the narrator. You MUST specify their name in "speaker_name" (e.g. "Leon", "Darren", "Sarah", "Elena") and their gender in "speaker_gender" ("male" or "female").
- Do NOT use speaker prefixes or script formatting. Write standard narrative paragraphs.
- Parallel Translation: "content_translated" MUST match the narrative paragraphs.
"""
        elif story_type == "informative":
            format_instructions = """
Format & Perspective Requirement:
- MANDATORY STORY FORMAT: **INFORMATIVE / FACTUAL ARTICLE**.
- The text MUST be an informative, educational article or factual overview (e.g. cultural background, nature, science, history, city guide, or interesting educational facts) written in an engaging, accessible third-person expository style.
- Strictly NO dialogue turns, speaker tags, or fictional character drama. Write well-structured, clear informational paragraphs.
- Set "speaker_name" and "speaker_gender" to null.
- Parallel Translation: "content_translated" MUST match the informative paragraphs.
"""
        else:
            format_instructions = """
Format & Perspective Guidelines:
- If the scenario involves 2 or more people communicating (conversations, ordering food, asking directions, meeting friends, travel exchanges, workplace/daily chats), format the story as a **conversational dialogue story**.
  - In a dialogue story, every paragraph represents a dialogue turn starting with the speaker's plain name (no markdown bolding `**`): `SpeakerName: Spoken text without quotes or third-person narration`.
  - Do NOT include third-person narration or dialogue tags (such as 'he said', 'she replied', 'said Marco') in dialogue stories. Keep it direct spoken conversational lines.
  - Choose natural, distinct names for the characters (e.g. 1 male, 1 female or named roles like 'Kellner' / 'Gast') and populate "speaker_genders" mapping each speaker to "male" or "female".
- If the scenario is a solitary experience, monologue, journal entry, or descriptive scene, write standard first-person or descriptive narrative paragraphs without speaker prefixes, and specify the narrator's name in "speaker_name" and gender in "speaker_gender" ("male" or "female").
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
{vocab_clause}{format_instructions}
Requirements:
1. "title": Story title in {target_lang}.
2. "title_translated": Story title translated into natural {origin_lang}.
3. "speaker_name": Name of the narrator / primary character (e.g. "Leon", "Darren", "Sarah") for monologues, or null if dialogue / third-person factual.
4. "speaker_gender": Gender of the monologue narrator ("male" or "female"), or null if dialogue / third-person factual.
5. "speaker_genders": Object mapping each dialogue speaker prefix to "male" or "female" (e.g. {{"Lukas": "male", "Anna": "female"}}), or null if monologue / third-person factual.
6. "content": The complete story in {target_lang}. Format into 3-6 clean paragraphs separated by double newlines (`\\n\\n`).
7. "content_translated": The full parallel translation in {origin_lang}, matching the paragraph structure.
8. "summary": A 1-2 sentence overview of the story in {origin_lang}.
9. "vocabulary": A list of 6-10 key {target_lang} vocabulary words from the story. Each item must contain:
   - "word": The word in {target_lang} (for nouns, do not include the article in this field).
   - "translation": Translation in {origin_lang}.
   - "part_of_speech": "noun", "verb", "adjective", "adverb", "preposition", or "phrase".
   - "gender": For nouns in languages with grammatical gender (e.g., German 'der/die/das', Spanish 'el/la', French 'le/la', Italian 'il/la/lo'), specify the appropriate article/gender. For non-nouns or languages without grammatical gender (e.g. English, Indonesian, Japanese), use null.
   - "example_sentence": A short {target_lang} sentence using the word.
   - "example_translation": The sentence translated into {origin_lang}.
   - "difficulty_rank": 1 (easy) to 3 (challenging).
10. "grammar_tips": 2-3 contextual grammar explanations relevant to structures found in this story.
   - "title": Short title explaining the target language rule in {origin_lang}.
   - "explanation": Clear, accessible grammar rule explained in {origin_lang}.
   - "explanation_translated": Same explanation summary in {origin_lang}.
   - "example": Sentence from or related to the story in {target_lang}.
   - "example_translation": Example translated into {origin_lang}.
11. "quiz_questions": 4-5 comprehension and grammar questions. Must include a mix of:
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
  "speaker_name": "...",
  "speaker_gender": "male" or "female",
  "speaker_genders": {{"Lukas": "male", "Anna": "female"}},
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

    def _configure_provider_env(self) -> None:
        if settings.gemini_api_key:
            os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
        if settings.groq_api_key:
            os.environ["GROQ_API_KEY"] = settings.groq_api_key
        if settings.openai_api_key:
            os.environ["OPENAI_API_KEY"] = settings.openai_api_key

    async def _call_llm_json(
        self,
        system_prompt: str,
        user_prompt: str,
        schema_cls: type[TModel],
        temperature: float = 0.5,
        task_label: str = "generation",
    ) -> tuple[TModel | None, str, str]:
        """Calls LiteLLM with primary/fallback models, 1-shot JSON repair, and validates against schema_cls."""
        self._configure_provider_env()
        models_to_try = [
            (settings.default_ai_model, "gemini"),
            (settings.fallback_ai_model, "groq"),
        ]

        for model_name, provider in models_to_try:
            try:
                logger.info(f"Attempting {task_label} with model {model_name}...")
                response = await litellm.acompletion(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=temperature,
                    timeout=settings.ai_timeout_seconds,
                )
                content_raw = response.choices[0].message.content
                cleaned_json = self._clean_json_response(content_raw)
                try:
                    data = json.loads(cleaned_json)
                    validated = schema_cls.model_validate(data)
                except (json.JSONDecodeError, ValidationError) as parse_err:
                    logger.warning(
                        f"Malformed JSON from {model_name} during {task_label}, retrying repair: {parse_err}"
                    )
                    repair_response = await litellm.acompletion(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                            {"role": "assistant", "content": content_raw or ""},
                            {
                                "role": "user",
                                "content": (
                                    f"Your previous JSON failed schema validation ({parse_err}). "
                                    "Return ONLY a valid JSON object matching the exact schema."
                                ),
                            },
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.2,
                        timeout=settings.ai_timeout_seconds,
                    )
                    repaired_raw = repair_response.choices[0].message.content
                    repaired_data = json.loads(self._clean_json_response(repaired_raw))
                    validated = schema_cls.model_validate(repaired_data)
                return validated, model_name, provider
            except Exception as e:
                logger.warning(f"{task_label} attempt with {model_name} failed: {e}")

        return None, "template/fallback-engine", "internal"

    async def generate_story(
        self,
        cefr_level: CEFRLevel = CEFRLevel.A1,
        category: str = "travel",
        topic_hint: str | None = None,
        target_lang: str = "German",
        origin_lang: str = "Indonesian",
        story_type: str = "auto",
        required_vocabulary: list[str] | None = None,
    ) -> tuple[GeneratedStoryBundle, str, str]:
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
            required_vocabulary=required_vocabulary,
        )

        bundle, model_name, provider = await self._call_llm_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            schema_cls=GeneratedStoryBundle,
            temperature=0.7,
            task_label=f"story generation ({target_lang}<-{origin_lang})",
        )
        if bundle is not None:
            logger.info(f"Story generation succeeded with {model_name} ({bundle.title})")
            return bundle, model_name, provider

        if not settings.allow_ai_mock_fallback:
            logger.error("All LLM providers failed and mock fallback is disabled.")
            raise HTTPException(
                status_code=503,
                detail="Story generation is temporarily unavailable. Please verify AI provider configuration or try again shortly.",
            )

        # Explicitly enabled fallback for offline tests/local demo mode
        logger.warning("All LLM providers failed or unconfigured. Falling back to default template.")
        fallback_bundle = self._get_curated_fallback(cefr_level, category, topic_hint, target_lang, origin_lang, story_type)
        return fallback_bundle, "template/fallback-engine", "internal"

    def _get_curated_fallback(
        self,
        cefr_level: CEFRLevel,
        category: str,
        topic_hint: str | None = None,
        target_lang: str = "German",
        origin_lang: str = "Indonesian",
        story_type: str = "auto",
    ) -> GeneratedStoryBundle:
        """Returns a high-quality educational fallback bundle for offline/mock operation tailored to the target language."""
        target_clean = target_lang.lower().strip()

        # Monologue fallback for German / General
        if story_type == "monologue" and target_clean in ["german", "deutsch", "de"]:
            return GeneratedStoryBundle(
                title="Mein sonniger Tag in Berlin",
                title_translated="Hari Cerahku di Berlin",
                speaker_name="Leon",
                speaker_gender="male",
                content=(
                    "Heute ist ein wunderschöner Tag in Berlin. Ich wache früh auf und trinke einen frischen Kaffee auf meinem Balkon.\n\n"
                    "Die Sonne scheint herrlich über der Stadt. Ich packe meinen Rucksack und gehe gemütlich durch den großen Park spazieren.\n\n"
                    "Später am Nachmittag möchte ich das berühmte Kunstmuseum im Zentrum besuchen und den Tag mit Freunden genießen."
                ),
                content_translated=(
                    "Hari ini adalah hari yang sangat indah di Berlin. Aku bangun pagi-pagi dan minum kopi segar di balkonku.\n\n"
                    "Matahari bersinar indah di atas kota. Aku mengemas ranselku dan berjalan santai menyusuri taman yang luas.\n\n"
                    "Nanti sore aku ingin mengunjungi museum seni terkenal di pusat kota dan menikmati hari bersama teman-teman."
                ),
                summary="Leon menceritakan hari santainya di Berlin, menikmati kopi di balkon, berjalan di taman, dan mengunjungi museum seni.",
                vocabulary=[
                    GeneratedVocabularyItem(
                        word="Balkon",
                        translation="Balkon",
                        part_of_speech="noun",
                        gender="der",
                        example_sentence="Ich trinke Kaffee auf meinem Balkon.",
                        example_translation="Aku minum kopi di balkonku.",
                        difficulty_rank=1,
                    ),
                    GeneratedVocabularyItem(
                        word="spazieren",
                        translation="Berjalan-jalan santai",
                        part_of_speech="verb",
                        gender=None,
                        example_sentence="Ich gehe im Park spazieren.",
                        example_translation="Aku berjalan-jalan di taman.",
                        difficulty_rank=1,
                    ),
                    GeneratedVocabularyItem(
                        word="wunderschön",
                        translation="Sangat indah",
                        part_of_speech="adjective",
                        gender=None,
                        example_sentence="Heute ist ein wunderschöner Tag.",
                        example_translation="Hari ini adalah hari yang sangat indah.",
                        difficulty_rank=2,
                    ),
                ],
                grammar_tips=[
                    GeneratedGrammarTip(
                        title="Präsens (Present Tense) dalam Narasi",
                        explanation="Bentuk waktu sekarang (Präsens) digunakan untuk menceritakan rutinitas harian dan peristiwa yang sedang berlangsung.",
                        explanation_translated="Penggunaan Präsens untuk narasi monolog orang pertama.",
                        example="Ich wache früh auf und packe meinen Rucksack.",
                        example_translation="Aku bangun pagi-pagi dan mengemas ranselku.",
                    ),
                ],
                quiz_questions=[
                    GeneratedQuizQuestion(
                        question_type="multiple_choice",
                        question="Wo trinkt Leon seinen Kaffee?",
                        question_translated="Di mana Leon meminum kopinya?",
                        correct_answer="Auf seinem Balkon",
                        wrong_answers=["Im Restaurant", "Im Bus", "Im Büro"],
                        explanation="Leon erwähnt: 'Ich trinke einen frischen Kaffee auf meinem Balkon'.",
                    ),
                    GeneratedQuizQuestion(
                        question_type="true_false",
                        question="Leon geht durch den Park spazieren.",
                        question_translated="Leon berjalan-jalan melalui taman.",
                        correct_answer="Richtig",
                        wrong_answers=["Falsch"],
                        explanation="Leon packt seinen Rucksack und geht durch den großen Park spazieren.",
                    ),
                ],
            )

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
                    "Carlos: Hello Sofia! What a lovely day in Madrid.\n\n"
                    "Sofia: Hello Carlos! Yes, it is very sunny today. Shall we drink coffee in Retiro Park?\n\n"
                    "Carlos: Great idea! Afterwards we can visit the new art museum.\n\n"
                    "Sofia: Perfect. I will buy the tickets online and you order the coffees."
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
                    "Oliver: Good morning Emily! The sun is shining brightly today.\n\n"
                    "Emily: Good morning Oliver! Yes, it is wonderful. Would you like to get a coffee in the park?\n\n"
                    "Oliver: That sounds lovely! We can also visit the modern art gallery later.\n\n"
                    "Emily: Great idea. I will book our tickets online right now."
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

    # ----------------- Goal-Driven Learning Journey AI -----------------

    async def evaluate_journey_clarification(
        self,
        purpose: str,
        answers: list[ClarificationAnswerItem],
        round_num: int,
        target_lang: str = "German",
        origin_lang: str = "Indonesian",
    ) -> GeneratedClarificationResult:
        """Evaluates whether the user's learning purpose needs follow-up clarification questions."""
        qa_block = "\n".join(
            f"- {a.question}: {a.answer}" for a in answers if a.answer.strip()
        ) or "None yet."

        system_prompt = (
            f"You are a curriculum designer helping an {origin_lang}-speaking learner prepare a personalized {target_lang} learning journey. "
            f"All questions, hints, options, and summaries shown to the learner MUST be written in natural {origin_lang}. "
            f"Respond ONLY with valid raw JSON."
        )

        user_prompt = f"""
Evaluate whether the learner's stated purpose is thorough enough to generate a highly tailored, domain-specific {target_lang} curriculum.

Learner's Initial Purpose: "{purpose}"
Clarification Round: {round_num} (maximum 2 rounds)
Previous Q&A:
{qa_block}

Rules:
- If the purpose is broad (e.g., "Ausbildung", "FSJ", "work in Germany", "study", "travel") and round == 1 and there are no detailed answers yet, set "is_sufficient": false and generate 2-3 crisp follow-up questions with suggested clickable option chips (e.g., sector/industry, primary situations like interview vs daily shift vs vocational school, and focus areas).
- If round >= 2 OR the learner already specified sector/role/context clearly (e.g., "Ausbildung in hospitality sector focusing on hotel reception and guest complaints"), set "is_sufficient": true, leave "questions": [], and provide a concise "synthesized_prompt".
- Keep questions short, practical, and tailored to {purpose}. Provide 4-6 realistic "suggested_options" per question when input_type is "chips" or "multi_chips".

Return JSON strictly matching:
{{
  "is_sufficient": true or false,
  "confidence_reason": "Brief explanation in {origin_lang}",
  "questions": [
    {{
      "id": "sector",
      "question": "Question in {origin_lang}",
      "hint": "Optional helper hint in {origin_lang}",
      "input_type": "chips" | "multi_chips" | "text",
      "suggested_options": ["Option 1", "Option 2", "Option 3", "Option 4"]
    }}
  ],
  "draft_summary": "1-2 sentence summary in {origin_lang} of what we know so far",
  "recommended_sector_tag": "Short 1-3 word English/universal tag e.g. Hospitality, Healthcare FSJ, IT Career, Daily Travel",
  "synthesized_prompt": "Detailed curriculum generation prompt in English if is_sufficient is true, else null"
}}
"""

        result, _, _ = await self._call_llm_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            schema_cls=GeneratedClarificationResult,
            temperature=0.4,
            task_label="journey clarification",
        )
        if result is not None:
            # Guard against endless loops on round >= 2
            if round_num >= 2 and not result.is_sufficient:
                result.is_sufficient = True
                result.questions = []
                if not result.synthesized_prompt:
                    result.synthesized_prompt = self._build_fallback_prompt(purpose, answers, None, target_lang, origin_lang)
            return result

        return self._fallback_clarification(purpose, answers, round_num, target_lang, origin_lang)

    async def synthesize_learning_prompt(
        self,
        purpose: str,
        clarifications: list[ClarificationAnswerItem],
        cefr_level: CEFRLevel,
        target_lang: str = "German",
        origin_lang: str = "Indonesian",
    ) -> GeneratedPromptSynthesis:
        """Synthesizes a thorough CEFR-calibrated master learning prompt from user inputs."""
        qa_block = "\n".join(f"- {a.question}: {a.answer}" for a in clarifications if a.answer.strip()) or "General focus."
        guidelines = CEFR_GUIDELINES.get(cefr_level, CEFR_GUIDELINES[CEFRLevel.B1])

        system_prompt = (
            "You are an expert instructional designer. Synthesize a crisp, thorough master curriculum prompt "
            "that will drive AI generation of a structured language learning tree. Respond ONLY with valid JSON."
        )
        user_prompt = f"""
Goal: {purpose}
Target Language: {target_lang}
Learner Native Language: {origin_lang}
Selected CEFR Level: {cefr_level.value} (Grammar: {guidelines['grammar']}; Vocabulary scope: {guidelines['vocab']})
Clarifications:
{qa_block}

Return JSON strictly matching:
{{
  "synthesized_prompt": "A comprehensive, actionable 4-6 sentence curriculum instruction specifying the domain, workplace/real-life scenarios, key vocabulary clusters, grammar priorities at {cefr_level.value}, and progressive milestone goals.",
  "summary": "A friendly 1-2 sentence summary in {origin_lang} explaining what this journey covers.",
  "recommended_sector_tag": "Short 1-3 word tag e.g. Hospitality, Healthcare FSJ, Engineering, Travel"
}}
"""
        result, _, _ = await self._call_llm_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            schema_cls=GeneratedPromptSynthesis,
            temperature=0.4,
            task_label="prompt synthesis",
        )
        if result is not None:
            return result

        return GeneratedPromptSynthesis(
            synthesized_prompt=self._build_fallback_prompt(purpose, clarifications, cefr_level, target_lang, origin_lang),
            summary=f"Jalur belajar {target_lang} level {cefr_level.value} yang difokuskan untuk tujuan: {purpose}.",
            recommended_sector_tag=self._infer_sector_tag(purpose, clarifications),
        )

    async def generate_journey_curriculum(
        self,
        synthesized_prompt: str,
        purpose: str,
        cefr_level: CEFRLevel,
        target_lang: str = "German",
        origin_lang: str = "Indonesian",
    ) -> tuple[GeneratedJourneyCurriculum, str, str]:
        """Generates the complete phased curriculum tree with all target domain vocabularies."""
        guidelines = CEFR_GUIDELINES.get(cefr_level, CEFR_GUIDELINES[CEFRLevel.B1])

        system_prompt = (
            f"You are a master curriculum architect teaching {target_lang} to native {origin_lang} speakers. "
            f"Design a deeply practical, goal-driven Learning Experience Tree organized into 3 progressive Phases. "
            f"Every phase MUST follow the pedagogical progression: "
            f"1) a 'vocab_pack' step with 8-10 essential domain vocabularies, "
            f"2) a 'story_lesson' step whose scenario puts those exact words into realistic dialogue/context, and "
            f"3) a 'checkpoint' step with 4 situational/vocabulary assessment questions. "
            f"All translations, explanations, and phase descriptions for the learner MUST be in {origin_lang}. "
            f"All target words, example sentences, and quiz questions MUST be in {target_lang}. "
            f"Respond ONLY with valid raw JSON."
        )

        user_prompt = f"""
Master Learning Prompt:
{synthesized_prompt}

Parameters:
- Original Goal: {purpose}
- Target Language: {target_lang}
- Native Language (Translations & Explanations): {origin_lang}
- CEFR Level: {cefr_level.value}
- Grammar scope: {guidelines['grammar']}
- Vocabulary scope: {guidelines['vocab']}

Requirements:
1. Create exactly 3 progressive Phases (Phase 1: Core Foundations & Essentials, Phase 2: Practical Scenarios & Interaction, Phase 3: Real-World Mastery & Edge Cases).
2. Each Phase must contain 3 ordered steps in this exact cycle:
   - Step A: step_type = "vocab_pack", containing 8-10 "vocabularies" items (each with word, translation in {origin_lang}, part_of_speech, gender/article if applicable e.g. der/die/das, phonetic/IPA if helpful, example_sentence in {target_lang}, example_translation in {origin_lang}).
   - Step B: step_type = "story_lesson", containing a detailed "story_topic_prompt" describing the scene/dialogue to generate later, "story_type" ("dialogue", "monologue", or "informative"), and "grammar_focus".
   - Step C: step_type = "checkpoint", containing 4 "checkpoint_questions" (id like "p1_q1", question_type "multiple_choice" or "fill_blank" or "article", question in {target_lang}, question_translated in {origin_lang}, correct_answer, 3 wrong_answers, explanation in {origin_lang}).

Return valid JSON matching:
{{
  "title": "Concise Journey Title (e.g. 'Ausbildung Hotellerie: Hospitality German')",
  "sector_tag": "Short 1-3 word category tag",
  "summary": "2-sentence overview in {origin_lang}",
  "phases": [
    {{
      "phase_number": 1,
      "title": "Phase Title",
      "title_translated": "Phase Title in {origin_lang}",
      "description": "What the learner achieves in this phase ({origin_lang})",
      "milestone_goal": "Concrete milestone ability ({origin_lang})",
      "steps": [
        {{
          "step_type": "vocab_pack",
          "title": "...",
          "title_translated": "...",
          "description": "...",
          "grammar_focus": null,
          "story_topic_prompt": null,
          "story_type": "dialogue",
          "vocabularies": [...],
          "checkpoint_questions": []
        }},
        {{
          "step_type": "story_lesson",
          "title": "...",
          "title_translated": "...",
          "description": "...",
          "grammar_focus": "...",
          "story_topic_prompt": "...",
          "story_type": "dialogue",
          "vocabularies": [],
          "checkpoint_questions": []
        }},
        {{
          "step_type": "checkpoint",
          "title": "...",
          "title_translated": "...",
          "description": "...",
          "grammar_focus": null,
          "story_topic_prompt": null,
          "story_type": "dialogue",
          "vocabularies": [],
          "checkpoint_questions": [...]
        }}
      ]
    }}
  ]
}}
"""

        curriculum, model_name, provider = await self._call_llm_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            schema_cls=GeneratedJourneyCurriculum,
            temperature=0.6,
            task_label=f"journey curriculum ({purpose} {cefr_level.value})",
        )
        if curriculum is not None and curriculum.phases:
            return curriculum, model_name, provider

        logger.warning("Using curated fallback journey curriculum template.")
        fallback = self._get_curated_journey_fallback(
            purpose=purpose,
            synthesized_prompt=synthesized_prompt,
            cefr_level=cefr_level,
            target_lang=target_lang,
            origin_lang=origin_lang,
        )
        return fallback, "template/fallback-engine", "internal"

    def _infer_sector_tag(self, purpose: str, answers: list[ClarificationAnswerItem]) -> str:
        combined = f"{purpose} {' '.join(a.answer for a in answers)}".lower()
        if any(k in combined for k in ["hospitality", "hotel", "gastron", "restaurant", "perhotelan"]):
            return "Hospitality"
        if any(k in combined for k in ["fsj", "pflege", "nurse", "health", "kesehatan", "sozial"]):
            return "Healthcare & Social"
        if any(k in combined for k in ["it", "software", "tech", "informatik", "developer"]):
            return "Technology & IT"
        if any(k in combined for k in ["ausbildung", "vocational", "work", "kerja", "job"]):
            return "Vocational & Career"
        if any(k in combined for k in ["uni", "studium", "study", "kuliah", "campus"]):
            return "Academic Study"
        return "Custom Goal"

    def _build_fallback_prompt(
        self,
        purpose: str,
        answers: list[ClarificationAnswerItem],
        cefr_level: CEFRLevel | None,
        target_lang: str,
        origin_lang: str,
    ) -> str:
        lvl = cefr_level.value if cefr_level else "B1"
        details = "; ".join(f"{a.question}: {a.answer}" for a in answers if a.answer.strip())
        detail_clause = f" Learner specifics: {details}." if details else ""
        return (
            f"Design a structured {target_lang} learning journey at CEFR level {lvl} for a native {origin_lang} speaker "
            f"whose goal is '{purpose}'.{detail_clause} "
            f"Prioritize high-frequency domain vocabulary, realistic workplace/situational dialogues, "
            f"contextual grammar tips, and milestone comprehension checkpoints."
        )

    def _fallback_clarification(
        self,
        purpose: str,
        answers: list[ClarificationAnswerItem],
        round_num: int,
        target_lang: str,
        origin_lang: str,
    ) -> GeneratedClarificationResult:
        p_lower = purpose.lower()
        already_answered = {a.question_id for a in answers}

        if round_num >= 2 or (len(answers) >= 2 and all(a.answer.strip() for a in answers)):
            return GeneratedClarificationResult(
                is_sufficient=True,
                confidence_reason="Konteks tujuan dan skenario belajar sudah cukup spesifik untuk menyusun kurikulum.",
                questions=[],
                draft_summary=f"Jalur belajar {target_lang} untuk '{purpose}' siap disusun berdasarkan detail yang diberikan.",
                recommended_sector_tag=self._infer_sector_tag(purpose, answers),
                synthesized_prompt=self._build_fallback_prompt(purpose, answers, None, target_lang, origin_lang),
            )

        if "ausbildung" in p_lower and "sector" not in already_answered:
            return GeneratedClarificationResult(
                is_sufficient=False,
                confidence_reason="Ausbildung mencakup berbagai bidang industri dengan kosakata kerja yang berbeda.",
                questions=[
                    ClarificationQuestionItem(
                        id="sector",
                        question="Bidang atau sektor Ausbildung apa yang ingin Anda tuju?",
                        hint="Pilih salah satu atau tulis sektor spesifik Anda.",
                        input_type="chips",
                        suggested_options=[
                            "Hospitality & Hotellerie",
                            "Pflege / Healthcare",
                            "Gastronomy & Culinary",
                            "IT & Software",
                            "Mechatronics / Engineering",
                        ],
                    ),
                    ClarificationQuestionItem(
                        id="situations",
                        question="Situasi komunikasi apa yang paling ingin Anda kuasai terlebih dahulu?",
                        hint="Bisa pilih lebih dari satu.",
                        input_type="multi_chips",
                        suggested_options=[
                            "Wawancara Kerja (Vorstellungsgespräch)",
                            "Komunikasi Harian di Tempat Kerja",
                            "Melayani Tamu / Pelanggan",
                            "Sekolah Vokasi (Berufsschule)",
                        ],
                    ),
                ],
                draft_summary="Memperjelas sektor Ausbildung dan situasi komunikasi prioritas.",
                recommended_sector_tag="Vocational & Career",
                synthesized_prompt=None,
            )

        if ("fsj" in p_lower or "bfd" in p_lower) and "fsj_field" not in already_answered:
            return GeneratedClarificationResult(
                is_sufficient=False,
                confidence_reason="Program FSJ memiliki penempatan yang beragam (klinik, panti lansia, sekolah, atau sosial).",
                questions=[
                    ClarificationQuestionItem(
                        id="fsj_field",
                        question="Di bidang penempatan FSJ mana Anda berencana bertugas?",
                        hint="Pilih tempat penempatan yang paling sesuai.",
                        input_type="chips",
                        suggested_options=[
                            "Klinik / Rumah Sakit",
                            "Panti Lansia (Altenheim)",
                            "Taman Kanak-kanak / Sekolah",
                            "Komunitas Sosial & Budaya",
                        ],
                    ),
                    ClarificationQuestionItem(
                        id="focus",
                        question="Fokus komunikasi utama yang dibutuhkan?",
                        input_type="multi_chips",
                        suggested_options=[
                            "Berinteraksi dengan Pasien / Penghuni",
                            "Koordinasi dengan Tim & Supervisor",
                            "Situasi Darurat & Instruksi Harian",
                            "Adaptasi Kehidupan Sehari-hari di Jerman",
                        ],
                    ),
                ],
                draft_summary="Menyesuaikan kosakata FSJ sesuai lokasi penempatan dan kebutuhan interaksi.",
                recommended_sector_tag="Healthcare & Social",
                synthesized_prompt=None,
            )

        # Generic thorough clarification when goal is short or broad
        if len(purpose.split()) < 5 and len(answers) == 0:
            return GeneratedClarificationResult(
                is_sufficient=False,
                confidence_reason="Menambahkan konteks situasi spesifik akan membuat daftar kosakata jauh lebih tepat sasaran.",
                questions=[
                    ClarificationQuestionItem(
                        id="context",
                        question="Dalam situasi apa Anda paling sering akan menggunakan bahasa ini?",
                        hint="Pilih situasi utama atau ketik detail Anda.",
                        input_type="multi_chips",
                        suggested_options=[
                            "Pekerjaan & Profesional",
                            "Kuliah / Akademik",
                            "Percakapan Sehari-hari",
                            "Wawancara & Dokumen Resmi",
                        ],
                    ),
                    ClarificationQuestionItem(
                        id="priority",
                        question="Aspek apa yang ingin paling ditekankan di awal?",
                        input_type="chips",
                        suggested_options=[
                            "Kosakata Teknis & Istilah Inti",
                            "Dialog Praktis & Roleplay",
                            "Etika Bicara Formal & Sopan",
                        ],
                    ),
                ],
                draft_summary=f"Menajamkan fokus penggunaan bahasa untuk tujuan '{purpose}'.",
                recommended_sector_tag=self._infer_sector_tag(purpose, answers),
                synthesized_prompt=None,
            )

        return GeneratedClarificationResult(
            is_sufficient=True,
            confidence_reason="Informasi tujuan belajar sudah cukup lengkap.",
            questions=[],
            draft_summary=f"Kurikulum {target_lang} untuk '{purpose}' siap disusun.",
            recommended_sector_tag=self._infer_sector_tag(purpose, answers),
            synthesized_prompt=self._build_fallback_prompt(purpose, answers, None, target_lang, origin_lang),
        )

    def _get_curated_journey_fallback(
        self,
        purpose: str,
        synthesized_prompt: str,
        cefr_level: CEFRLevel,
        target_lang: str,
        origin_lang: str,
    ) -> GeneratedJourneyCurriculum:
        combined = f"{purpose} {synthesized_prompt}".lower()
        is_hospitality = any(k in combined for k in ["hospitality", "hotel", "gastron", "perhotelan"])
        is_fsj = any(k in combined for k in ["fsj", "pflege", "klinik", "lansia", "health", "sozial"])

        if is_hospitality:
            return GeneratedJourneyCurriculum(
                title=f"Ausbildung Hotellerie ({cefr_level.value})",
                sector_tag="Hospitality",
                summary=f"Jalur belajar terstruktur bahasa {target_lang} level {cefr_level.value} untuk persiapan Ausbildung di sektor perhotelan dan layanan tamu.",
                phases=[
                    GeneratedJourneyPhase(
                        phase_number=1,
                        title="Empfang & Erste Begegnungen",
                        title_translated="Resepsionis & Sapaan Profesional",
                        description="Menguasai kosakata dasar meja depan hotel, check-in tamu, dan etika sapaan formal.",
                        milestone_goal="Mampu menyambut tamu hotel dan memproses check-in dasar dengan sopan.",
                        steps=[
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.VOCAB_PACK,
                                title="Kosakata Inti Resepsionis & Check-in",
                                title_translated="Kosakata Inti Resepsionis & Check-in",
                                description="8 istilah penting untuk meja resepsionis, pemesanan kamar, dan identitas tamu.",
                                vocabularies=[
                                    GeneratedJourneyVocabItem(
                                        word="Rezeption",
                                        translation="Resepsionis / Meja depan",
                                        part_of_speech="noun",
                                        gender="die",
                                        phonetic="ʁet͡sɛpˈt͡si̯oːn",
                                        example_sentence="Die Rezeption ist rund um die Uhr geöffnet.",
                                        example_translation="Resepsionis buka 24 jam penuh.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Reservierung",
                                        translation="Reservasi / Pemesanan",
                                        part_of_speech="noun",
                                        gender="die",
                                        phonetic="ʁezɛʁˈviːʁʊŋ",
                                        example_sentence="Haben Sie eine Reservierung auf Ihren Namen?",
                                        example_translation="Apakah Anda memiliki reservasi atas nama Anda?",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Schlüsselkarte",
                                        translation="Kartu kunci kamar",
                                        part_of_speech="noun",
                                        gender="die",
                                        example_sentence="Hier ist Ihre Schlüsselkarte für Zimmer 204.",
                                        example_translation="Ini kartu kunci Anda untuk kamar 204.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Einzelzimmer",
                                        translation="Kamar single",
                                        part_of_speech="noun",
                                        gender="das",
                                        example_sentence="Wir haben ein ruhiges Einzelzimmer frei.",
                                        example_translation="Kami memiliki satu kamar single yang tenang tersedia.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Ausweis",
                                        translation="Kartu identitas / Paspor",
                                        part_of_speech="noun",
                                        gender="der",
                                        example_sentence="Darf ich bitte Ihren Ausweis sehen?",
                                        example_translation="Bolehkah saya melihat kartu identitas Anda?",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="begrüßen",
                                        translation="Menyambut / Menyapa",
                                        part_of_speech="verb",
                                        example_sentence="Wir begrüßen unsere Gäste immer freundlich.",
                                        example_translation="Kami selalu menyambut tamu dengan ramah.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Frühstück",
                                        translation="Sarapan",
                                        part_of_speech="noun",
                                        gender="das",
                                        example_sentence="Das Frühstück wird ab sieben Uhr serviert.",
                                        example_translation="Sarapan disajikan mulai pukul tujuh.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Aufenthalt",
                                        translation="Masa menginap",
                                        part_of_speech="noun",
                                        gender="der",
                                        example_sentence="Ich wünsche Ihnen einen angenehmen Aufenthalt.",
                                        example_translation="Semoga masa menginap Anda menyenangkan.",
                                    ),
                                ],
                            ),
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.STORY_LESSON,
                                title="Dialog: Willkommen im Grand Hotel",
                                title_translated="Dialog: Menyambut Tamu Check-in",
                                description="Simulasi percakapan resepsionis Azubi saat menyambut tamu yang baru tiba.",
                                grammar_focus="Kalimat tanya sopan dengan 'Könnten Sie / Darf ich' dan bentuk Sie",
                                story_topic_prompt="An Azubi trainee at a hotel reception desk in Munich welcoming a business guest for check-in, checking reservation and ID, handing over the keycard, and explaining breakfast hours.",
                                story_type="dialogue",
                            ),
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.CHECKPOINT,
                                title="Checkpoint 1: Front Desk Readiness",
                                title_translated="Evaluasi 1: Kesiapan Meja Depan",
                                description="Uji pemahaman kosakata resepsionis, artikel, dan respons sopan.",
                                checkpoint_questions=[
                                    GeneratedCheckpointQuestion(
                                        id="hosp_p1_q1",
                                        question_type="article",
                                        question="Welcher Artikel gehört zu 'Reservierung'?",
                                        question_translated="Apa artikel yang tepat untuk 'Reservierung'?",
                                        correct_answer="die",
                                        wrong_answers=["der", "das", "den"],
                                        explanation="Kata benda berakhiran '-ung' dalam bahasa Jerman selalu feminin ('die').",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="hosp_p1_q2",
                                        question_type="multiple_choice",
                                        question="Was fragt man höflich beim Check-in?",
                                        question_translated="Apa pertanyaan sopan yang tepat saat check-in?",
                                        correct_answer="Haben Sie eine Reservierung?",
                                        wrong_answers=["Gib mir deinen Pass!", "Warum bist du hier?", "Wo schläfst du?"],
                                        explanation="Bentuk sapaan profesional selalu menggunakan bentuk formal 'Sie'.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="hosp_p1_q3",
                                        question_type="fill_blank",
                                        question="Hier ist Ihre ___ für Zimmer 305.",
                                        question_translated="Ini ___ Anda untuk kamar 305.",
                                        correct_answer="Schlüsselkarte",
                                        wrong_answers=["Frühstück", "Rezeption", "Aufenthalt"],
                                        explanation="'Schlüsselkarte' berarti kartu kunci kamar hotel.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="hosp_p1_q4",
                                        question_type="multiple_choice",
                                        question="Was bedeutet 'angenehmen Aufenthalt'?",
                                        question_translated="Apa arti 'angenehmen Aufenthalt'?",
                                        correct_answer="Masa menginap yang menyenangkan",
                                        wrong_answers=["Sarapan pagi gratis", "Pembatalan kamar", "Kartu identitas tamu"],
                                        explanation="'Aufenthalt' adalah masa tinggal/menginap dan 'angenehm' berarti menyenangkan.",
                                    ),
                                ],
                            ),
                        ],
                    ),
                    GeneratedJourneyPhase(
                        phase_number=2,
                        title="Service, Küche & Gästewünsche",
                        title_translated="Layanan Kamar, Restoran & Permintaan Tamu",
                        description="Menangani pesanan restoran, layanan kamar, dan permintaan khusus tamu.",
                        milestone_goal="Mampu melayani pesanan makanan dan menjelaskan fasilitas hotel.",
                        steps=[
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.VOCAB_PACK,
                                title="Kosakata Layanan Restoran & Kamar",
                                title_translated="Kosakata Layanan Restoran & Kamar",
                                description="8 kata kunci seputar Zimmerservice, alergi makanan, dan permintaan tamu.",
                                vocabularies=[
                                    GeneratedJourneyVocabItem(
                                        word="Zimmerservice",
                                        translation="Layanan kamar",
                                        part_of_speech="noun",
                                        gender="der",
                                        example_sentence="Der Zimmerservice bringt das Abendessen.",
                                        example_translation="Layanan kamar mengantarkan makan malam.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Speisekarte",
                                        translation="Buku menu",
                                        part_of_speech="noun",
                                        gender="die",
                                        example_sentence="Darf ich Ihnen die Speisekarte bringen?",
                                        example_translation="Bolehkah saya membawakan buku menu untuk Anda?",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Handtuch",
                                        translation="Handuk",
                                        part_of_speech="noun",
                                        gender="das",
                                        example_sentence="Der Gast braucht ein frisches Handtuch.",
                                        example_translation="Tamu membutuhkan handuk bersih.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="empfehlen",
                                        translation="Merekomendasikan",
                                        part_of_speech="verb",
                                        example_sentence="Ich kann Ihnen die Tagessuppe empfehlen.",
                                        example_translation="Saya dapat merekomendasikan sup hari ini untuk Anda.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Allergie",
                                        translation="Alergi",
                                        part_of_speech="noun",
                                        gender="die",
                                        example_sentence="Haben Sie eine Lebensmittelallergie?",
                                        example_translation="Apakah Anda memiliki alergi makanan?",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Rechnung",
                                        translation="Tagihan / Bill",
                                        part_of_speech="noun",
                                        gender="die",
                                        example_sentence="Möchten Sie die Rechnung zusammen bezahlen?",
                                        example_translation="Apakah Anda ingin membayar tagihan sekaligus?",
                                    ),
                                ],
                            ),
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.STORY_LESSON,
                                title="Dialog: Im Hotelrestaurant",
                                title_translated="Dialog: Melayani Tamu di Restoran Hotel",
                                description="Melatih dialog antara Azubi pelayan dan tamu mengenai menu, alergi, dan rekomendasi.",
                                grammar_focus="Kata kerja 'möchten' & 'empfehlen' dengan objek Dativ",
                                story_topic_prompt="A hospitality apprentice taking dinner orders in a hotel restaurant, recommending a dish, checking for food allergies, and politely handling a request for fresh towels.",
                                story_type="dialogue",
                            ),
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.CHECKPOINT,
                                title="Checkpoint 2: Service & Hospitality",
                                title_translated="Evaluasi 2: Pelayanan Tamu",
                                description="Uji kemampuan merespons kebutuhan makan dan permintaan kamar.",
                                checkpoint_questions=[
                                    GeneratedCheckpointQuestion(
                                        id="hosp_p2_q1",
                                        question_type="multiple_choice",
                                        question="Was fragt man, bevor man ein Gericht vorschlägt?",
                                        question_translated="Apa yang penting ditanyakan sebelum menyarankan hidangan?",
                                        correct_answer="Haben Sie eine Allergie?",
                                        wrong_answers=["Wo ist Ihr Ausweis?", "Haben Sie ein Handtuch?", "Wie spät ist Check-out?"],
                                        explanation="Menanyakan alergi makanan adalah standar pelayanan restoran profesional.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="hosp_p2_q2",
                                        question_type="article",
                                        question="Welcher Artikel gehört zu 'Handtuch'?",
                                        question_translated="Apa artikel untuk 'Handtuch'?",
                                        correct_answer="das",
                                        wrong_answers=["der", "die", "dem"],
                                        explanation="'das Handtuch' adalah kata benda netral.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="hosp_p2_q3",
                                        question_type="fill_blank",
                                        question="Ich kann Ihnen dieses Gericht sehr ___.",
                                        question_translated="Saya sangat dapat ___ hidangan ini kepada Anda.",
                                        correct_answer="empfehlen",
                                        wrong_answers=["begrüßen", "bezahlen", "stornieren"],
                                        explanation="'empfehlen' berarti merekomendasikan.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="hosp_p2_q4",
                                        question_type="multiple_choice",
                                        question="Womit bezahlen die Gäste am Ende des Essens?",
                                        question_translated="Dokumen apa yang diminta tamu saat selesai makan?",
                                        correct_answer="Die Rechnung",
                                        wrong_answers=["Die Speisekarte", "Die Schlüsselkarte", "Das Einzelzimmer"],
                                        explanation="'Die Rechnung' berarti tagihan / struk pembayaran.",
                                    ),
                                ],
                            ),
                        ],
                    ),
                    GeneratedJourneyPhase(
                        phase_number=3,
                        title="Reklamationen & Teamkommunikation",
                        title_translated="Menangani Keluhan & Koordinasi Tim",
                        description="Menyelesaikan komplain tamu dengan tenang dan melapor ke supervisor.",
                        milestone_goal="Mampu menangani keluhan tamu dan berkoordinasi dalam tim hotel.",
                        steps=[
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.VOCAB_PACK,
                                title="Kosakata Komplain & Solusi Kerja",
                                title_translated="Kosakata Komplain & Solusi Kerja",
                                description="Kosakata profesional untuk meminta maaf, memperbaiki masalah, dan melapor ke Schichtleiter.",
                                vocabularies=[
                                    GeneratedJourneyVocabItem(
                                        word="Beschwerde",
                                        translation="Keluhan / Komplain",
                                        part_of_speech="noun",
                                        gender="die",
                                        example_sentence="Wir nehmen jede Beschwerde sehr ernst.",
                                        example_translation="Kami menanggapi setiap keluhan dengan sangat serius.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="entschuldigen",
                                        translation="Meminta maaf",
                                        part_of_speech="verb",
                                        example_sentence="Ich möchte mich für die Unannehmlichkeit entschuldigen.",
                                        example_translation="Saya ingin meminta maaf atas ketidaknyamanan ini.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Schichtplan",
                                        translation="Jadwal shift kerja",
                                        part_of_speech="noun",
                                        gender="der",
                                        example_sentence="Der neue Schichtplan hängt im Büro.",
                                        example_translation="Jadwal shift baru tergantung di kantor.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Lösung",
                                        translation="Solusi",
                                        part_of_speech="noun",
                                        gender="die",
                                        example_sentence="Wir finden sofort eine gute Lösung für Sie.",
                                        example_translation="Kami segera mencari solusi terbaik untuk Anda.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="stornieren",
                                        translation="Membatalkan (reservasi)",
                                        part_of_speech="verb",
                                        example_sentence="Kann ich die Buchung kostenlos stornieren?",
                                        example_translation="Bisakah saya membatalkan pemesanan secara gratis?",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Hausmeister",
                                        translation="Teknisi gedung / Maintenance",
                                        part_of_speech="noun",
                                        gender="der",
                                        example_sentence="Der Hausmeister repariert die Heizung sofort.",
                                        example_translation="Teknisi segera memperbaiki pemanas ruangan.",
                                    ),
                                ],
                            ),
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.STORY_LESSON,
                                title="Dialog: Eine schnelle Lösung finden",
                                title_translated="Dialog: Menyelesaikan Keluhan Kamar",
                                description="Skenario tamu mengeluhkan pemanas kamar yang rusak dan Azubi berkoordinasi dengan teknisi.",
                                grammar_focus="Konjunktiv II sopan ('Ich würde', 'Könnten wir') & kalimat sebab-akibat",
                                story_topic_prompt="A hotel guest complains at reception that the heating in their room is not working. The apprentice apologizes professionally, offers an upgrade or fast solution, and calls the building technician.",
                                story_type="dialogue",
                            ),
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.CHECKPOINT,
                                title="Final Milestone: Ausbildung Ready",
                                title_translated="Evaluasi Akhir: Siap Praktik Perhotelan",
                                description="Ujian akhir penanganan komplain dan etika kerja tim hotel.",
                                checkpoint_questions=[
                                    GeneratedCheckpointQuestion(
                                        id="hosp_p3_q1",
                                        question_type="multiple_choice",
                                        question="Wie reagiert man richtig auf eine Beschwerde?",
                                        question_translated="Bagaimana reaksi yang tepat saat menerima keluhan tamu?",
                                        correct_answer="Sich höflich entschuldigen und eine Lösung anbieten",
                                        wrong_answers=["Dem Gast die Schuld geben", "Sofort weglaufen", "Die Tür schließen"],
                                        explanation="Selalu minta maaf dengan tenang dan tawarkan solusi konkret.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="hosp_p3_q2",
                                        question_type="fill_blank",
                                        question="Der ___ überprüft die kaputte Heizung im Zimmer.",
                                        question_translated="___ memeriksa pemanas yang rusak di kamar.",
                                        correct_answer="Hausmeister",
                                        wrong_answers=["Schichtplan", "Ausweis", "Zimmerservice"],
                                        explanation="'Hausmeister' adalah petugas pemeliharaan/teknisi gedung.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="hosp_p3_q3",
                                        question_type="multiple_choice",
                                        question="Was bedeutet 'eine Buchung stornieren'?",
                                        question_translated="Apa arti 'eine Buchung stornieren'?",
                                        correct_answer="Membatalkan pemesanan",
                                        wrong_answers=["Memperpanjang masa tinggal", "Membayar tagihan", "Membersihkan kamar"],
                                        explanation="'stornieren' berarti membatalkan reservasi/pesanan.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="hosp_p3_q4",
                                        question_type="article",
                                        question="Welcher Artikel gehört zu 'Schichtplan'?",
                                        question_translated="Apa artikel untuk 'Schichtplan'?",
                                        correct_answer="der",
                                        wrong_answers=["die", "das", "den"],
                                        explanation="Kata majemuk mengambil artikel kata terakhir: 'der Plan' -> 'der Schichtplan'.",
                                    ),
                                ],
                            ),
                        ],
                    ),
                ],
            )

        if is_fsj:
            return GeneratedJourneyCurriculum(
                title=f"FSJ Sozial & Pflege ({cefr_level.value})",
                sector_tag="Healthcare & Social",
                summary=f"Kurikulum terstruktur bahasa {target_lang} level {cefr_level.value} untuk relawan FSJ di lingkungan perawatan dan sosial.",
                phases=[
                    GeneratedJourneyPhase(
                        phase_number=1,
                        title="Alltag & Unterstützung",
                        title_translated="Rutinitas Harian & Bantuan Dasar",
                        description="Kosakata dasar interaksi harian dengan pasien/penghuni dan tim perawatan.",
                        milestone_goal="Mampu menyapa penghuni/pasien dan menanyakan kondisi harian.",
                        steps=[
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.VOCAB_PACK,
                                title="Kosakata Inti Keseharian FSJ",
                                title_translated="Kosakata Inti Keseharian FSJ",
                                description="Istilah penting saat membantu lansia/pasien dan berkoordinasi di bangsal.",
                                vocabularies=[
                                    GeneratedJourneyVocabItem(
                                        word="Bewohner",
                                        translation="Penghuni (panti/fasilitas)",
                                        part_of_speech="noun",
                                        gender="der",
                                        example_sentence="Ich helfe dem Bewohner beim Spaziergang.",
                                        example_translation="Saya membantu penghuni saat berjalan santai.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="unterstützen",
                                        translation="Membantu / Mendukung",
                                        part_of_speech="verb",
                                        example_sentence="Heute unterstütze ich das Pflegeteam.",
                                        example_translation="Hari ini saya membantu tim perawat.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Rollstuhl",
                                        translation="Kursi roda",
                                        part_of_speech="noun",
                                        gender="der",
                                        example_sentence="Brauchen Sie heute den Rollstuhl?",
                                        example_translation="Apakah Anda membutuhkan kursi roda hari ini?",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Medikament",
                                        translation="Obat",
                                        part_of_speech="noun",
                                        gender="das",
                                        example_sentence="Die Krankenschwester gibt das Medikament.",
                                        example_translation="Perawat memberikan obat tersebut.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Station",
                                        translation="Bangsal / Unit perawatan",
                                        part_of_speech="noun",
                                        gender="die",
                                        example_sentence="Meine Schicht beginnt auf Station zwei.",
                                        example_translation="Shift saya dimulai di bangsal dua.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Schmerzen",
                                        translation="Rasa sakit / Nyeri",
                                        part_of_speech="noun",
                                        gender="die",
                                        example_sentence="Haben Sie heute irgendwo Schmerzen?",
                                        example_translation="Apakah hari ini ada bagian yang terasa sakit?",
                                    ),
                                ],
                            ),
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.STORY_LESSON,
                                title="Ein Morgen auf der Station",
                                title_translated="Pagi Hari Pertama di Bangsal FSJ",
                                description="Percakapan hangat relawan FSJ dengan penghuni panti dan perawat senior.",
                                grammar_focus="Kalimat sopan membantu ('Kann ich Ihnen helfen?') dan kata kerja berimbuhan terpisah",
                                story_topic_prompt="An FSJ volunteer starting their morning shift on a care ward, greeting an elderly resident, offering help with a wheelchair, and checking in with the head nurse.",
                                story_type="dialogue",
                            ),
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.CHECKPOINT,
                                title="Checkpoint 1: FSJ Basics",
                                title_translated="Evaluasi 1: Dasar Komunikasi FSJ",
                                description="Menguji kosakata dasar dan empati komunikasi perawatan.",
                                checkpoint_questions=[
                                    GeneratedCheckpointQuestion(
                                        id="fsj_p1_q1",
                                        question_type="article",
                                        question="Welcher Artikel gehört zu 'Rollstuhl'?",
                                        question_translated="Apa artikel untuk 'Rollstuhl'?",
                                        correct_answer="der",
                                        wrong_answers=["die", "das", "den"],
                                        explanation="'der Stuhl' maskulin, sehingga 'der Rollstuhl'.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="fsj_p1_q2",
                                        question_type="multiple_choice",
                                        question="Was fragt man freundlich am Morgen?",
                                        question_translated="Apa pertanyaan ramah yang tepat di pagi hari?",
                                        correct_answer="Wie fühlen Sie sich heute?",
                                        wrong_answers=["Warum bist du langsam?", "Geh sofort weg!", "Ich habe keine Zeit."],
                                        explanation="Menanyakan perasaan/kondisi ('Wie fühlen Sie sich?') menunjukkan empati.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="fsj_p1_q3",
                                        question_type="fill_blank",
                                        question="Ich ___ die Kollegen auf Station drei.",
                                        question_translated="Saya ___ rekan-rekan di bangsal tiga.",
                                        correct_answer="unterstütze",
                                        wrong_answers=["storniere", "verkaufe", "vergesse"],
                                        explanation="'unterstützen' berarti membantu atau mendukung.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="fsj_p1_q4",
                                        question_type="multiple_choice",
                                        question="Was bedeutet 'Schmerzen'?",
                                        question_translated="Apa arti 'Schmerzen'?",
                                        correct_answer="Rasa sakit / Nyeri",
                                        wrong_answers=["Makan siang", "Jadwal libur", "Kursi roda"],
                                        explanation="'Schmerzen' (biasanya bentuk jamak) berarti rasa nyeri/sakit.",
                                    ),
                                ],
                            ),
                        ],
                    ),
                    GeneratedJourneyPhase(
                        phase_number=2,
                        title="Aktivitäten & Teamarbeit",
                        title_translated="Aktivitas Sosial & Kerja Tim",
                        description="Mendampingi aktivitas rekreasi, waktu makan, dan komunikasi dengan rekan tim.",
                        milestone_goal="Mampu mendampingi aktivitas harian dan menyampaikan laporan singkat.",
                        steps=[
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.VOCAB_PACK,
                                title="Kosakata Aktivitas & Laporan Tim",
                                title_translated="Kosakata Aktivitas & Laporan Tim",
                                description="Kosakata pendampingan aktivitas dan koordinasi shift.",
                                vocabularies=[
                                    GeneratedJourneyVocabItem(
                                        word="Spaziergang",
                                        translation="Jalan santai",
                                        part_of_speech="noun",
                                        gender="der",
                                        example_sentence="Nach dem Mittagessen machen wir einen Spaziergang.",
                                        example_translation="Setelah makan siang kita berjalan santai.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Aufgabe",
                                        translation="Tugas",
                                        part_of_speech="noun",
                                        gender="die",
                                        example_sentence="Welche Aufgabe habe ich heute Vormittag?",
                                        example_translation="Tugas apa yang saya miliki pagi ini?",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Geduld",
                                        translation="Kesabaran",
                                        part_of_speech="noun",
                                        gender="die",
                                        example_sentence="In der Pflege braucht man viel Geduld.",
                                        example_translation="Dalam bidang perawatan dibutuhkan banyak kesabaran.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="zuhören",
                                        translation="Mendengarkan dengan saksama",
                                        part_of_speech="verb",
                                        example_sentence="Es ist wichtig, den Menschen ruhig zuzuhören.",
                                        example_translation="Penting untuk mendengarkan orang dengan tenang.",
                                    ),
                                    GeneratedJourneyVocabItem(
                                        word="Dienstplan",
                                        translation="Jadwal tugas / dinas",
                                        part_of_speech="noun",
                                        gender="der",
                                        example_sentence="Steht dein Name schon im Dienstplan?",
                                        example_translation="Apakah namamu sudah ada di jadwal dinas?",
                                    ),
                                ],
                            ),
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.STORY_LESSON,
                                title="Nachmittag im Garten",
                                title_translated="Sore Hari di Taman Bersama Penghuni",
                                description="Mengajak penghuni berjalan di taman dan mendengarkan cerita mereka.",
                                grammar_focus="Kata kerja terpisah ('zuhören', 'mitkommen') di kalimat utama",
                                story_topic_prompt="An FSJ volunteer accompanying residents for an afternoon walk in the garden, listening patiently to their stories, and checking the duty roster with a colleague.",
                                story_type="dialogue",
                            ),
                            GeneratedJourneyStep(
                                step_type=JourneyStepType.CHECKPOINT,
                                title="Checkpoint 2: Teamwork & Care",
                                title_translated="Evaluasi 2: Kerja Tim & Empati",
                                description="Evaluasi pemahaman aktivitas harian dan komunikasi rekan kerja.",
                                checkpoint_questions=[
                                    GeneratedCheckpointQuestion(
                                        id="fsj_p2_q1",
                                        question_type="multiple_choice",
                                        question="Was bedeutet 'aufmerksam zuhören'?",
                                        question_translated="Apa arti 'aufmerksam zuhören'?",
                                        correct_answer="Mendengarkan dengan penuh perhatian",
                                        wrong_answers=["Berlari cepat", "Mengambil obat", "Menulis jadwal"],
                                        explanation="'zuhören' berarti mendengarkan dengan saksama.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="fsj_p2_q2",
                                        question_type="article",
                                        question="Welcher Artikel gehört zu 'Aufgabe'?",
                                        question_translated="Apa artikel untuk 'Aufgabe'?",
                                        correct_answer="die",
                                        wrong_answers=["der", "das", "dem"],
                                        explanation="'die Aufgabe' adalah kata benda feminin.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="fsj_p2_q3",
                                        question_type="fill_blank",
                                        question="Ich schaue heute in den ___.",
                                        question_translated="Saya melihat ke ___ hari ini.",
                                        correct_answer="Dienstplan",
                                        wrong_answers=["Rollstuhl", "Spaziergang", "Schmerzen"],
                                        explanation="'Dienstplan' adalah jadwal kerja/dinas.",
                                    ),
                                    GeneratedCheckpointQuestion(
                                        id="fsj_p2_q4",
                                        question_type="multiple_choice",
                                        question="Welche Eigenschaft ist im FSJ besonders wichtig?",
                                        question_translated="Sifat apa yang sangat penting dalam FSJ?",
                                        correct_answer="Geduld",
                                        wrong_answers=["Ungeduld", "Hektik", "Angst"],
                                        explanation="'Geduld' berarti kesabaran.",
                                    ),
                                ],
                            ),
                        ],
                    ),
                ],
            )

        # General purpose fallback curriculum
        return GeneratedJourneyCurriculum(
            title=f"{purpose} ({cefr_level.value})",
            sector_tag=self._infer_sector_tag(purpose, []),
            summary=f"Kurikulum terstruktur bahasa {target_lang} level {cefr_level.value} untuk mencapai tujuan: {purpose}.",
            phases=[
                GeneratedJourneyPhase(
                    phase_number=1,
                    title="Core Foundations & Key Terms",
                    title_translated="Fondasi & Kosakata Inti",
                    description=f"Membangun kosakata dasar yang paling esensial untuk {purpose}.",
                    milestone_goal="Menguasai kata kunci dan ungkapan pembuka paling sering digunakan.",
                    steps=[
                        GeneratedJourneyStep(
                            step_type=JourneyStepType.VOCAB_PACK,
                            title=f"Kosakata Inti: {purpose}",
                            title_translated=f"Kosakata Inti: {purpose}",
                            description="Daftar kata dan frasa fondasi untuk langsung mulai berkomunikasi.",
                            vocabularies=[
                                GeneratedJourneyVocabItem(
                                    word="Vorbereitung",
                                    translation="Persiapan",
                                    part_of_speech="noun",
                                    gender="die",
                                    example_sentence="Eine gute Vorbereitung ist sehr wichtig.",
                                    example_translation="Persiapan yang baik sangat penting.",
                                ),
                                GeneratedJourneyVocabItem(
                                    word="Erfahrung",
                                    translation="Pengalaman",
                                    part_of_speech="noun",
                                    gender="die",
                                    example_sentence="Ich möchte neue Erfahrungen sammeln.",
                                    example_translation="Saya ingin mengumpulkan pengalaman baru.",
                                ),
                                GeneratedJourneyVocabItem(
                                    word="Termin",
                                    translation="Janji temu / Jadwal",
                                    part_of_speech="noun",
                                    gender="der",
                                    example_sentence="Wir haben morgen einen wichtigen Termin.",
                                    example_translation="Kita memiliki janji penting besok.",
                                ),
                                GeneratedJourneyVocabItem(
                                    word="verstehen",
                                    translation="Memahami / Mengerti",
                                    part_of_speech="verb",
                                    example_sentence="Können Sie das bitte langsamer erklären? Ich möchte alles verstehen.",
                                    example_translation="Bisakah Anda menjelaskannya lebih pelan? Saya ingin memahami semuanya.",
                                ),
                                GeneratedJourneyVocabItem(
                                    word="wichtig",
                                    translation="Penting",
                                    part_of_speech="adjective",
                                    example_sentence="Pünktlichkeit ist hier sehr wichtig.",
                                    example_translation="Ketepatan waktu sangat penting di sini.",
                                ),
                            ],
                        ),
                        GeneratedJourneyStep(
                            step_type=JourneyStepType.STORY_LESSON,
                            title=f"Situasi Nyata: {purpose}",
                            title_translated=f"Simulasi Percakapan: {purpose}",
                            description="Mempraktikkan kosakata inti dalam dialog realistis sesuai tujuan Anda.",
                            grammar_focus="Kalimat sopan & struktur pernyataan dasar",
                            story_topic_prompt=f"A practical {cefr_level.value} conversation focused on '{purpose}', naturally using key preparation and scheduling vocabulary.",
                            story_type="dialogue",
                        ),
                        GeneratedJourneyStep(
                            step_type=JourneyStepType.CHECKPOINT,
                            title="Checkpoint 1: Penguasaan Dasar",
                            title_translated="Evaluasi 1: Penguasaan Dasar",
                            description="Uji pemahaman kosakata dan struktur kalimat fase pertama.",
                            checkpoint_questions=[
                                GeneratedCheckpointQuestion(
                                    id="gen_p1_q1",
                                    question_type="article",
                                    question="Welcher Artikel gehört zu 'Termin'?",
                                    question_translated="Apa artikel untuk 'Termin'?",
                                    correct_answer="der",
                                    wrong_answers=["die", "das", "den"],
                                    explanation="'der Termin' adalah kata benda maskulin.",
                                ),
                                GeneratedCheckpointQuestion(
                                    id="gen_p1_q2",
                                    question_type="multiple_choice",
                                    question="Was bedeutet 'Erfahrung sammeln'?",
                                    question_translated="Apa arti 'Erfahrung sammeln'?",
                                    correct_answer="Mengumpulkan pengalaman",
                                    wrong_answers=["Membatalkan jadwal", "Membaca buku", "Pergi berbelanja"],
                                    explanation="'Erfahrung' adalah pengalaman dan 'sammeln' berarti mengumpulkan.",
                                ),
                            ],
                        ),
                    ],
                ),
            ],
        )

ai_service = AIService()
