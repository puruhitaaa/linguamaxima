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

CEFR_GUIDELINES = {
    CEFRLevel.A1: {
        "words": "80-120 words",
        "grammar": "Basic present tense (Präsens), simple sentence structures (SVO), fundamental verbs (sein, haben, gehen, etc.)",
        "vocab": "Extremely common everyday words: greetings, family, food, numbers, basic objects.",
    },
    CEFRLevel.A2: {
        "words": "120-180 words",
        "grammar": "Present and Perfekt tenses, separable verbs, basic modal verbs (können, müssen, wollen), simple coordinate conjunctions (und, aber, weil).",
        "vocab": "Routine daily activities, shopping, travel, simple descriptions.",
    },
    CEFRLevel.B1: {
        "words": "180-250 words",
        "grammar": "Subordinate clauses (weil, dass, wenn, obwohl), Präteritum of modal verbs, passive voice basics, comparative and superlative adjectives.",
        "vocab": "Work, hobbies, feelings, personal experiences, current events.",
    },
    CEFRLevel.B2: {
        "words": "250-350 words",
        "grammar": "Complex syntax, Konjunktiv II, relative clauses, extended noun phrases, prepositional objects.",
        "vocab": "Abstract topics, technical and professional vocabulary, idioms.",
    },
    CEFRLevel.C1: {
        "words": "350-450 words",
        "grammar": "Full range of complex German syntax, stylistic nuances, nominal style (Nominalstil), subjunctive forms.",
        "vocab": "Advanced literary and academic vocabulary, subtle distinctions, idiomatic mastery.",
    },
    CEFRLevel.C2: {
        "words": "400-550 words",
        "grammar": "Mastery of all German grammatical nuances and stylistic subtleties.",
        "vocab": "Native-level expressive, figurative, and sophisticated vocabulary.",
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
    ) -> Tuple[str, str]:
        guidelines = CEFR_GUIDELINES.get(cefr_level, CEFR_GUIDELINES[CEFRLevel.A1])
        topic_clause = f" specifically about '{topic_hint}'" if topic_hint else ""

        system_prompt = (
            f"You are an expert language educator specializing in teaching {target_lang} to native {origin_lang} speakers. "
            f"You generate engaging, pedagogical CEFR-graded stories accompanied by structured vocabulary lists, grammar tips, and comprehension quizzes. "
            f"You MUST respond ONLY with valid JSON conforming exactly to the requested schema. Do not wrap output in markdown codeblocks if possible, just raw JSON."
        )

        user_prompt = f"""
Create a complete language-learning story package for CEFR level {cefr_level.value} in the category '{category}'{topic_clause}.
Target Language: {target_lang}
Learner's Native Language (Translations & Explanations): {origin_lang}

Constraints for CEFR Level {cefr_level.value}:
- Story length: {guidelines['words']}
- Grammar level: {guidelines['grammar']}
- Vocabulary complexity: {guidelines['vocab']}

Requirements:
1. "title": Story title in {target_lang}.
2. "title_translated": Story title translated into natural {origin_lang}.
3. "content": The complete story in {target_lang}. Format into 3-5 clean paragraphs separated by double newlines (`\\n\\n`).
4. "content_translated": The full parallel translation in {origin_lang}, matching the paragraph structure.
5. "summary": A 1-2 sentence overview of the story in {origin_lang}.
6. "vocabulary": A list of 6-10 key {target_lang} vocabulary words from the story. Each item must contain:
   - "word": The word in {target_lang} (for nouns, do not include the article in this field, e.g. "Flughafen", "Kaffee").
   - "translation": Translation in {origin_lang}.
   - "part_of_speech": "noun", "verb", "adjective", "adverb", "preposition", or "phrase".
   - "gender": For {target_lang} nouns ONLY, specify "der", "die", or "das". For non-nouns, use null.
   - "example_sentence": A short {target_lang} sentence using the word.
   - "example_translation": The sentence translated into {origin_lang}.
   - "difficulty_rank": 1 (easy) to 3 (challenging).
7. "grammar_tips": 2-3 contextual grammar explanations relevant to structures found in this story.
   - "title": Short title (e.g. "Penggunaan Akkusativ dengan Verba", "Aturan Pemakaian Artikel 'der/die/das'").
   - "explanation": Clear, accessible grammar rule explained in {origin_lang}.
   - "explanation_translated": Same explanation summary.
   - "example": Sentence from or related to the story in {target_lang}.
   - "example_translation": Example translated into {origin_lang}.
8. "quiz_questions": 4-5 comprehension and grammar questions. Must include a mix of:
   - "multiple_choice": Comprehension questions about the story events.
   - "article": Practice identifying gender (der/die/das) for a noun from the story.
   - "fill_blank": Sentence with a missing word (e.g., "Ich gehe in ___ Supermarkt.").
   - "true_false": True or False statement about the story.
   Each question item must contain:
   - "question_type": "multiple_choice", "article", "fill_blank", or "true_false".
   - "question": Question in {target_lang}.
   - "question_translated": Question translated or hinted in {origin_lang}.
   - "correct_answer": The exact correct option string.
   - "wrong_answers": An array of 3 plausible wrong options (for true_false, only 1 wrong option "Falsch" or "Richtig").
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
    ) -> Tuple[GeneratedStoryBundle, str, str]:
        """
        Generates a structured story bundle using LiteLLM.
        Returns (bundle, model_used, provider_used).
        """
        system_prompt, user_prompt = self._build_prompt(
            cefr_level, category, topic_hint, target_lang, origin_lang
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
                logger.info(f"Attempting story generation with model {model_name}...")
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
        fallback_bundle = self._get_curated_fallback(cefr_level, category, topic_hint)
        return fallback_bundle, "template/fallback-engine", "internal"

    def _get_curated_fallback(
        self,
        cefr_level: CEFRLevel,
        category: str,
        topic_hint: Optional[str] = None
    ) -> GeneratedStoryBundle:
        """Returns a high-quality educational fallback bundle for offline/mock operation."""
        return GeneratedStoryBundle(
            title="Ein sonniger Tag in Berlin",
            title_translated="Hari yang Cerah di Berlin",
            content=(
                "Lukas wohnt in Berlin. Heute ist Samstag und die Sonne scheint hell am Himmel.\n\n"
                "Er geht in den Park und trifft seine beste Freundin Anna. Sie trinken zusammen einen Kaffee und sprechen über ihre Pläne für das Wochenende.\n\n"
                "Am Nachmittag besuchen sie ein interessantes Museum im Zentrum der Stadt. Lukas kauft zwei Eintrittskarten und sie lernen viel über die Geschichte von Deutschland."
            ),
            content_translated=(
                "Lukas tinggal di Berlin. Hari ini adalah hari Sabtu dan matahari bersinar terang di langit.\n\n"
                "Dia pergi ke taman dan bertemu dengan sahabatnya Anna. Mereka minum kopi bersama dan berbicara tentang rencana akhir pekan mereka.\n\n"
                "Di sore hari mereka mengunjungi museum menarik di pusat kota. Lukas membeli dua tiket masuk dan mereka belajar banyak tentang sejarah Jerman."
            ),
            summary="Lukas dan temannya Anna menikmati hari Sabtu di Berlin dengan berjalan-jalan di taman dan mengunjungi museum bersejarah.",
            vocabulary=[
                GeneratedVocabularyItem(
                    word="Sonne",
                    translation="Matahari",
                    part_of_speech="noun",
                    gender="die",
                    example_sentence="Die Sonne scheint hell.",
                    example_translation="Matahari bersinar terang.",
                    difficulty_rank=1
                ),
                GeneratedVocabularyItem(
                    word="Freundin",
                    translation="Teman perempuan / Sahabat",
                    part_of_speech="noun",
                    gender="die",
                    example_sentence="Anna ist seine beste Freundin.",
                    example_translation="Anna adalah sahabatnya.",
                    difficulty_rank=1
                ),
                GeneratedVocabularyItem(
                    word="treffen",
                    translation="Bertemu",
                    part_of_speech="verb",
                    gender=None,
                    example_sentence="Er trifft seine Freundin im Park.",
                    example_translation="Dia bertemu temannya di taman.",
                    difficulty_rank=2
                ),
                GeneratedVocabularyItem(
                    word="Eintrittskarte",
                    translation="Tiket masuk",
                    part_of_speech="noun",
                    gender="die",
                    example_sentence="Lukas kauft zwei Eintrittskarten.",
                    example_translation="Lukas membeli dua tiket masuk.",
                    difficulty_rank=2
                ),
                GeneratedVocabularyItem(
                    word="Geschichte",
                    translation="Sejarah / Cerita",
                    part_of_speech="noun",
                    gender="die",
                    example_sentence="Sie lernen viel über die Geschichte.",
                    example_translation="Mereka belajar banyak tentang sejarah.",
                    difficulty_rank=2
                ),
            ],
            grammar_tips=[
                GeneratedGrammarTip(
                    title="Artikel Definit (der, die, das)",
                    explanation="Dalam bahasa Jerman, setiap kata benda memiliki gender gramatikal: maskulin (der), feminin (die), atau netral (das). Contoh: 'die Sonne' (feminin), 'der Kaffee' (maskulin), 'das Museum' (netral).",
                    explanation_translated="Setiap nomina memiliki gender tertentu yang menentukan artikelnya.",
                    example="Die Sonne scheint und Lukas trinkt den Kaffee.",
                    example_translation="Matahari bersinar dan Lukas meminum kopi."
                ),
                GeneratedGrammarTip(
                    title="Posisi Kata Kerja (Verba) di Kalimat Utama",
                    explanation="Dalam kalimat deklaratif bahasa Jerman, kata kerja terkonjugasi selalu berada di posisi kedua (V2 rule). Contoh: 'Heute ist Samstag' (bukan 'Heute Samstag ist').",
                    explanation_translated="Aturan posisi verba kedua pada kalimat berita.",
                    example="Heute ist Samstag und er geht in den Park.",
                    example_translation="Hari ini hari Sabtu dan dia pergi ke taman."
                )
            ],
            quiz_questions=[
                GeneratedQuizQuestion(
                    question_type="multiple_choice",
                    question="Welcher Tag ist heute in der Geschichte?",
                    question_translated="Hari apa yang diceritakan dalam cerita?",
                    correct_answer="Samstag",
                    wrong_answers=["Montag", "Sonntag", "Freitag"],
                    explanation="Dalam paragraf pertama disebutkan 'Heute ist Samstag' (Hari ini hari Sabtu)."
                ),
                GeneratedQuizQuestion(
                    question_type="article",
                    question="Welcher Artikel gehört zu 'Sonne'?",
                    question_translated="Apa artikel yang tepat untuk kata 'Sonne'?",
                    correct_answer="die",
                    wrong_answers=["der", "das", "dem"],
                    explanation="'Sonne' adalah kata benda feminin sehingga menggunakan artikel 'die'."
                ),
                GeneratedQuizQuestion(
                    question_type="fill_blank",
                    question="Lukas kauft zwei ___ für das Museum.",
                    question_translated="Lukas membeli dua ___ untuk museum.",
                    correct_answer="Eintrittskarten",
                    wrong_answers=["Kaffee", "Parks", "Bücher"],
                    explanation="Lukas membeli dua tiket masuk (Eintrittskarten) untuk mengunjungi museum."
                ),
                GeneratedQuizQuestion(
                    question_type="true_false",
                    question="Lukas und Anna trinken zusammen einen Tee im Park.",
                    question_translated="Lukas dan Anna minum teh bersama di taman.",
                    correct_answer="Falsch",
                    wrong_answers=["Richtig"],
                    explanation="Mereka meminum kopi ('einen Kaffee'), bukan teh."
                )
            ]
        )

ai_service = AIService()
