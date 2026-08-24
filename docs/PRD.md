# LinguaMaxima — Product Requirements Document (PRD)

> **Version**: 1.0  
> **Date**: 2026-08-24  
> **Status**: Ready for Implementation  
> **Product**: LinguaMaxima — AI-powered language learning reader  
> **Reference**: [RESEARCH.md](./RESEARCH.md) · [DESIGN.md](./DESIGN.md)

---

## Problem Statement

Learning a new language through reading is one of the most effective methods for building vocabulary, grammar intuition, and comprehension, but the process has high friction. Existing apps like Readle provide CEFR-graded reading experiences with tap-to-translate, audio playback, quizzes, and spaced repetition, but they are closed ecosystems: content is hand-curated (slow to scale), language pairs are limited (no Indonesian as a source language), and premium features sit behind paywalls.

For a solo learner studying German from Indonesian (Bahasa Indonesia), no product on the market serves this specific language pair with Readle-quality UX. The learner is forced to cobble together dictionaries, separate flashcard apps, and ungraded reading materials, losing the tight feedback loop that makes Readle effective.

The core friction is threefold:

1. **No integrated German-from-Indonesian reader exists** — Readle supports German but only from English. Indonesian learners get no native-language translations, grammar explanations, or quizzes.
2. **Content creation bottleneck** — Traditional curated content is expensive and slow. Hundreds of stories across six CEFR levels and multiple categories are needed to sustain daily engagement.
3. **Tool fragmentation** — Without a single surface that combines reading, vocabulary, audio, grammar, quizzes, and spaced repetition, the learner context-switches constantly, reducing retention and motivation.

LinguaMaxima solves this by replicating Readle's proven UX patterns while replacing the human content pipeline with AI generation. Every story, vocabulary list, grammar explanation, quiz, and audio file is produced by swappable AI providers, enabling infinite content at zero marginal cost. The backend supports arbitrary language pairs from day one, so expanding beyond German/Indonesian later requires only configuration, not re-architecture.

---

## Solution

LinguaMaxima is a full-stack web application that delivers a Readle-style language learning experience powered entirely by AI-generated content. It ships as two services inside the existing pnpm/Nx monorepo: a React frontend (already scaffolded at `apps/web`) and a new FastAPI backend at `apps/api`, backed by PostgreSQL.

The product experience centers on a library of CEFR-graded short stories in German with Indonesian translations. Each story comes bundled with key vocabulary (with gender, part of speech, example sentences), contextual grammar tips, a comprehension quiz, and neural-quality audio. All of this is generated on demand by a single LLM call (via LiteLLM, defaulting to Gemini 2.5 Flash with Groq fallback) combined with free TTS (edge-tts). Story illustrations come from free stock photo APIs (Pixabay primary, Pexels fallback).

For the MVP, there is no authentication or payment. A single implicit user has their progress, flashcard deck, and quiz history tracked server-side. The backend data model supports multiple language pairs, so expanding to French, Spanish, or other targets later is a schema-level configuration, not a code change.

The frontend integrates with the backend via a versioned REST API (`/api/v1/`). The React app presents a story library with CEFR level and category filters, an interactive reading screen with tap-to-translate popups, inline audio playback at adjustable speed, tabbed vocabulary/grammar/quiz views, and a standalone flashcard review using the SM-2 spaced repetition algorithm.

---

## End-to-End User Flows

### Flow 1: Browse and Select a Story (Happy Path)

1. User opens the app at `localhost:3001`. The home screen displays a story library.
2. Stories are shown as cards with: title, category badge, CEFR level tag, cover image, estimated reading time, and word count.
3. User filters by CEFR level (A1–C2 tabs or dropdown) and optionally by category (Travel, Culture, Food, News, Technology, Science, Entertainment).
4. User taps a story card to navigate to the reading screen.

**Edge cases:**

- No stories exist yet → display empty state with a prompt to generate stories (admin/generate action).
- Filter combination yields zero results → display "No stories found" message with suggestion to broaden filters.
- Story image fails to load → fall back to a category-appropriate placeholder or gradient.

### Flow 2: Read a Story with Interactive Translation (Happy Path)

1. The reading screen loads the story text paragraph by paragraph in German.
2. User taps any German word in the text.
3. A popup appears showing: the Indonesian translation, part of speech, grammatical gender (der/die/das), and if available, a conjugation note.
4. The popup includes a "Save to Flashcards" button.
5. User can toggle a parallel Indonesian translation panel on/off for the full story.
6. Story view has tabs: **Story** | **Vocabulary** | **Grammar** | **Quiz**.

**Edge cases:**

- Tapped word is not in the pre-generated vocabulary list → the popup shows the word with a "translation unavailable" message. Future improvement: on-demand LLM lookup.
- Compound German words (e.g., "Handschuh") → attempt to match the full compound first, then longest prefix.
- Punctuation attached to word → strip punctuation before vocabulary lookup.

### Flow 3: Listen to Story Audio (Happy Path)

1. On the reading screen, an audio player bar is visible at the top or bottom.
2. User presses play → full story audio begins (generated by edge-tts in `de-DE-ConradNeural`).
3. User can switch playback speed between 1x and 0.75x.
4. User can tap individual sentences to hear just that sentence.
5. In the Vocabulary tab, each word has a small speaker icon → taps play the individual word pronunciation.

**Edge cases:**

- Audio file has not been generated yet (story was created without TTS) → show "Audio unavailable" with a generate button.
- edge-tts service is temporarily unreachable (it's an online service) → show "Audio generation failed, try again later" toast.
- Slow network → stream audio rather than waiting for full download; show loading spinner on play button.

### Flow 4: Take the Comprehension Quiz (Happy Path)

1. User navigates to the Quiz tab within a story.
2. Quiz presents 4–6 questions, one at a time:
   - Multiple choice comprehension (in German with Indonesian translation hint).
   - Article practice: pick der/die/das for a given noun.
   - Fill-in-the-blank vocabulary.
   - True/False comprehension.
3. User selects an answer → immediate feedback: correct (green) or incorrect (red) with explanation.
4. After all questions, a score summary shows: X/Y correct, percentage, and "Retry" button.
5. Quiz is retakeable unlimited times. Best score is recorded.

**Edge cases:**

- Quiz has zero questions (AI generation failed partially) → show "Quiz not available for this story."
- User navigates away mid-quiz → progress is not saved (quiz restarts on return). This is acceptable for MVP.
- All answers are wrong → encouraging message, link back to story to re-read.

### Flow 5: Review Flashcards with Spaced Repetition (Happy Path)

1. User navigates to a "Flashcards" section from the main navigation.
2. Cards due for review today are presented one at a time.
3. Front: German word. User mentally recalls the Indonesian translation.
4. User taps to reveal the back: Indonesian translation, part of speech, gender, example sentence.
5. User rates difficulty: Again (0) | Hard (3) | Good (4) | Easy (5).
6. SM-2 algorithm updates the card's ease factor, interval, and next review date.
7. Session ends when all due cards are reviewed → "All caught up!" screen.

**Edge cases:**

- No flashcards saved yet → empty state: "Save words from stories to build your deck."
- No cards due today → "All caught up! Next review in X days."
- User saves the same word from multiple stories → deduplicate by word text within the same language pair; link to latest occurrence.

### Flow 6: AI Story Generation (Admin/Background)

1. A backend endpoint accepts a generation request: language pair, CEFR level, category, and optional topic hint.
2. The service builds a structured prompt requesting a story with vocabulary, grammar tips, and quiz questions in a single JSON response.
3. LiteLLM calls Gemini 2.5 Flash (primary) or falls back to Groq Llama 4 Scout.
4. Response is parsed and validated against Pydantic schemas.
5. TTS is generated for the full story text and each vocabulary word via edge-tts.
6. A cover image is fetched from Pixabay using the story category/topic as search terms.
7. All data is persisted to PostgreSQL. Story is marked `is_published = true`.

**Edge cases:**

- LLM returns malformed JSON → retry once with a stricter prompt. If still malformed, log error and mark story as failed.
- LLM returns content in wrong language or wrong CEFR level → validate by checking vocabulary complexity heuristics (word frequency lists). Flag for manual review if suspicious.
- Pixabay returns zero image results → use a default category placeholder image.
- edge-tts fails for a specific word → skip that word's pronunciation; story is still publishable.
- Rate limit hit on primary provider → automatic fallback to Groq via LiteLLM Router.
- Duplicate story topic → no hard constraint; the LLM temperature ensures variation. Optional future: dedupe by title similarity.

### Flow 7: Track Progress (Happy Path)

1. Dashboard/home shows: total stories completed, words learned, current daily streak, best quiz scores.
2. Completing a quiz (any score) marks the story as "completed" in user_progress.
3. Favoriting a story adds it to a "Favorites" list.
4. Progress data is per the single implicit user (no auth for MVP).

**Edge cases:**

- Progress data is lost if database is reset → acceptable for personal MVP. Document backup procedure.
- Streak resets at midnight → define timezone in config (default: user's local tz or UTC).

### Error Handling (Cross-Cutting)

- **API unreachable from frontend** → toast notification "Cannot connect to server," retry button.
- **Database connection failure** → FastAPI returns 503 with structured error; frontend shows maintenance message.
- **Unexpected 500 errors** → structured JSON error response with correlation ID; frontend shows generic "Something went wrong."

---

## User Stories

1. As a learner, I want to browse a library of German stories organized by CEFR level (A1–C2), so that I can find reading material appropriate for my current proficiency.
2. As a learner, I want to filter stories by category (Travel, Culture, Food, News, Technology, Science, Entertainment), so that I can read about topics that interest me.
3. As a learner, I want to see story cards with title, category, level, cover image, reading time, and word count, so that I can quickly decide which story to read.
4. As a learner, I want to read a German story displayed paragraph-by-paragraph, so that I can focus on one section at a time without feeling overwhelmed.
5. As a learner, I want to tap any German word to see its Indonesian translation, part of speech, and grammatical gender in a popup, so that I can understand unfamiliar words without leaving the reading context.
6. As a learner, I want to save any word to my personal flashcard deck from the tap-to-translate popup, so that I can review it later with spaced repetition.
7. As a learner, I want to toggle a parallel Indonesian translation of the full story, so that I can check my overall comprehension.
8. As a learner, I want to listen to the full story read aloud by a neural TTS voice in German, so that I can train my listening comprehension and pronunciation awareness.
9. As a learner, I want to adjust audio playback speed between 1x and 0.75x, so that I can slow down difficult passages.
10. As a learner, I want to tap individual sentences to hear just that sentence, so that I can practice pronunciation at a granular level.
11. As a learner, I want to hear individual vocabulary words pronounced when I tap a speaker icon, so that I know the correct pronunciation.
12. As a learner, I want to see a vocabulary list for each story showing key words with translations, gender, part of speech, and example sentences, so that I can study the story's vocabulary systematically.
13. As a learner, I want to read grammar tips relevant to each story, so that I learn grammatical patterns in context rather than in isolation.
14. As a learner, I want to take a comprehension quiz after reading a story, so that I can test whether I understood the material.
15. As a learner, I want the quiz to include multiple choice, article practice (der/die/das), fill-in-the-blank, and true/false questions, so that I am tested on different aspects of comprehension.
16. As a learner, I want immediate feedback on each quiz answer with an explanation, so that I learn from my mistakes right away.
17. As a learner, I want to see my quiz score and be able to retake the quiz unlimited times, so that I can improve.
18. As a learner, I want to review my flashcards using spaced repetition, so that I efficiently memorize vocabulary over time.
19. As a learner, I want to rate each flashcard's difficulty (Again, Hard, Good, Easy), so that the system adjusts review intervals based on how well I know each word.
20. As a learner, I want to see "All caught up!" when no flashcards are due, so that I know I've completed my daily review.
21. As a learner, I want to see my overall progress: stories completed, words learned, daily streak, so that I feel motivated to continue.
22. As a learner, I want to favorite stories, so that I can easily return to ones I enjoyed or want to re-read.
23. As a learner, I want the app to work in dark mode, so that I can read comfortably at night.
24. As a content system, I want to generate a complete story bundle (text, translation, vocabulary, grammar tips, quiz) from a single LLM prompt, so that content creation is automated and atomic.
25. As a content system, I want to use Gemini 2.5 Flash as the primary LLM and Groq Llama 4 Scout as fallback, so that generation succeeds even if one provider is down or rate-limited.
26. As a content system, I want to generate neural TTS audio via edge-tts for both full stories and individual words, so that all content has accompanying audio at zero cost.
27. As a content system, I want to fetch a cover image from Pixabay based on the story topic, so that each story has a relevant illustration.
28. As a content system, I want to validate LLM JSON responses against Pydantic schemas, so that malformed content is caught before persistence.
29. As a content system, I want to record which AI model and provider generated each story, so that content quality can be traced and compared.
30. As the backend, I want to support arbitrary language pairs (origin + target) via a language_pairs table, so that adding new languages requires only data, not code changes.
31. As the backend, I want to serve content via a versioned REST API (/api/v1/), so that frontend and backend can evolve independently.
32. As the backend, I want to run PostgreSQL on Docker port 5433, so that it does not conflict with the host machine's PostgreSQL instance.
33. As the frontend, I want to consume the backend API via TanStack Query, so that I get caching, loading states, and error handling out of the box.
34. As the frontend, I want to use the existing shadcn/ui component library and design tokens from DESIGN.md, so that the UI is visually consistent with the established design system.
35. As a developer, I want AI providers to be swappable via a single config string using LiteLLM, so that I can experiment with different models without code changes.

---

## Implementation Decisions

### Backend — FastAPI Application (`apps/api`)

**Framework and runtime**: FastAPI with Uvicorn, Python 3.12+, managed by uv. The backend is a new application in the existing pnpm/Nx monorepo. It is not a pnpm workspace member — it is a standalone Python project with its own `pyproject.toml` and `uv.lock`, living at `apps/api`.

**Database layer**: PostgreSQL 16+ via Docker (host port 5433 → container port 5432). ORM is SQLAlchemy 2.0 async mode with asyncpg as the driver. Migrations via Alembic. Session management uses `async_sessionmaker` with `expire_on_commit=False`. Relationships use `lazy="raise"` to prevent accidental lazy loads in async contexts.

**Application structure**: Three-layer architecture — route handlers (thin, delegation only) → services (business logic, AI orchestration) → repositories (data access, SQLAlchemy queries). Route handlers receive validated Pydantic schemas and return Pydantic response models. No business logic in route handlers.

**AI content generation**: A single service (`ai_service`) builds a structured prompt requesting a complete story bundle as JSON. The prompt includes CEFR level constraints (vocabulary lists, sentence complexity guidelines), the target/origin language pair, the category, and a word count target. LiteLLM's `completion()` is called with `response_format={"type": "json_object"}`. The response is validated against a Pydantic model:

```python
class GeneratedStoryBundle(BaseModel):
    title: str
    title_translated: str
    content: str                     # Full story in target language
    content_translated: str          # Full parallel translation
    summary: str
    vocabulary: list[GeneratedVocabularyItem]
    grammar_tips: list[GeneratedGrammarTip]
    quiz_questions: list[GeneratedQuizQuestion]
```

**LLM provider configuration**: Primary model is `gemini/gemini-2.5-flash`. Fallback model is `groq/llama-4-scout`. Both are configured via environment variables. LiteLLM Router handles automatic fallback when the primary returns an error or hits rate limits. Provider API keys are set via `GEMINI_API_KEY` and `GROQ_API_KEY` environment variables.

**TTS service**: The `tts_service` wraps edge-tts (async). It generates audio for the full story text and for each vocabulary word individually. Audio files are stored on the local filesystem under a `media/audio/` directory and served via FastAPI's static file mount. Voice selections: `de-DE-ConradNeural` for German, `id-ID-ArdiNeural` for Indonesian.

**Image service**: The `image_service` calls Pixabay's REST API with the story category and topic as search terms. First matching image URL is stored in the story record. Images are cached locally per Pixabay's API terms (no hotlinking, cache responses for 24h). Pexels is available as a secondary source.

**Configuration**: Pydantic Settings reads from `.env` file and environment variables. Key settings: `DATABASE_URL`, `DEFAULT_AI_MODEL`, `FALLBACK_AI_MODEL`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `CORS_ORIGINS`, `TTS_PROVIDER`, voice selections.

**CORS**: Configured to allow `http://localhost:3001` (the frontend dev server).

**Database schema**: Seven tables — `languages`, `language_pairs`, `categories`, `stories`, `vocabulary`, `grammar_tips`, `quizzes`, `user_progress`, `flashcards`. CEFR level is a PostgreSQL enum. Quiz wrong answers stored as JSONB array. Flashcards implement SM-2 fields: `ease_factor`, `interval_days`, `repetitions`, `next_review`. No user table for MVP — a single implicit user is assumed across all progress and flashcard records.

**Seed data**: An Alembic data migration seeds: two language records (German `de`, Indonesian `id`), one language pair (Indonesian → German), and story categories (Travel, Culture, Food, News, Technology, Science, Entertainment, Daily Life, History, Nature).

### Frontend — React Application (`apps/web`)

**Existing stack is preserved**: React 19, TanStack Start (SSR), TanStack Router (file-based routing), TanStack Query, TailwindCSS v4, shadcn/ui, Lucide icons, Vite, dark mode via next-themes. No framework migration.

**New routes to add**:

- `/` — Home/story library with level filters and category filters.
- `/stories/:id` — Story reading screen with tabs: Story, Vocabulary, Grammar, Quiz.
- `/flashcards` — Flashcard review session.
- `/progress` — Progress dashboard.

**API client**: TanStack Query hooks wrapping `fetch` calls to `http://localhost:8000/api/v1/`. Query keys scoped by resource type and ID. Mutations for: save flashcard, submit quiz answer, update flashcard SRS rating, generate story.

**Tap-to-translate**: Story text is rendered with each word wrapped in an interactive `<span>`. On click/tap, a popover (shadcn/ui Popover) displays the vocabulary entry if it exists in the pre-generated list. The popover includes a "Save to Flashcards" button that fires a mutation.

**Audio player**: HTML5 `<audio>` element with custom controls. Playback rate toggled between 1.0 and 0.75 via `playbackRate` property. Full-story audio URL comes from the API. Sentence-level playback uses timestamp markers if available, or plays the full audio.

**Flashcard UI**: Card flip animation (CSS transform). Front shows the German word. Back reveals translation, gender, part of speech, example sentence. Four rating buttons map to SM-2 quality scores (0, 3, 4, 5) and fire a PATCH mutation.

**Design system adherence**: All new components use the design tokens from `DESIGN.md`: Inter font, dark theme colors (`#ffffff` text, `#959595` secondary, `#1d9bf0` accent, `#121212` background), border radii (7px control, 12px card, 33px pill), spacing scale. Components are built with shadcn/ui primitives.

### Infrastructure — Docker Compose

The existing `docker-compose.yml` is extended to add two new services: `api` (FastAPI) and `db` (PostgreSQL). The `web` service gains a dependency on `api`. PostgreSQL is exposed on host port 5433 (container port 5432) to avoid conflict with the host machine's PostgreSQL. A named volume `pgdata` persists data across restarts.

### API Contract (Key Endpoints)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/stories` | List stories with filters: `cefr_level`, `category_slug`, `language_pair_id`. Paginated. |
| GET | `/api/v1/stories/:id` | Full story with vocabulary, grammar_tips, and quiz questions. |
| POST | `/api/v1/stories/generate` | Trigger AI story generation. Body: `cefr_level`, `category_slug`, `topic_hint?`. |
| GET | `/api/v1/stories/:id/audio` | Stream story audio file. |
| GET | `/api/v1/categories` | List all story categories. |
| GET | `/api/v1/languages` | List supported languages. |
| GET | `/api/v1/language-pairs` | List active language pairs. |
| GET | `/api/v1/flashcards/due` | Get flashcards due for review today. |
| POST | `/api/v1/flashcards` | Save a vocabulary word to flashcard deck. Body: `vocabulary_id`. |
| PATCH | `/api/v1/flashcards/:id/review` | Submit SRS review rating. Body: `quality` (0–5). |
| POST | `/api/v1/quizzes/:story_id/submit` | Submit quiz answers. Body: array of `{question_id, answer}`. |
| GET | `/api/v1/progress` | Get user progress summary. |
| PATCH | `/api/v1/stories/:id/favorite` | Toggle favorite status. |
| GET | `/health` | Health check endpoint. |

---

## Testing Decisions

### Backend Testing Strategy

**Testing framework**: pytest with pytest-asyncio. HTTP testing via httpx's `AsyncClient` as an ASGI transport, allowing full request/response testing without a running server.

**Database testing**: Use a separate test database (`linguamaxima_test`). Each test function gets a fresh transaction that is rolled back after the test, ensuring isolation without the overhead of full database recreation.

**Key test scenarios**:

1. **Story CRUD endpoints**: Verify list, get-by-id, and filter behavior. Assert that vocabulary, grammar tips, and quiz questions are included in the story detail response. Verify pagination parameters.
2. **Story generation pipeline**: Mock the LiteLLM `completion()` call to return a known JSON fixture. Assert that the response is correctly parsed into Story, Vocabulary, GrammarTip, and Quiz database records. Assert that invalid JSON from the LLM triggers a retry and eventual error response.
3. **TTS generation**: Mock edge-tts to verify that the service calls it with the correct voice and text. Verify audio file paths are persisted on the story record.
4. **Flashcard SRS logic**: Test the SM-2 algorithm implementation with known inputs: verify that rating "Again" resets interval to 0, "Easy" increases interval and ease factor, and "Good" applies the standard formula. Verify `next_review` date calculation.
5. **Quiz submission**: Submit correct and incorrect answers; verify score calculation. Submit to a non-existent story; verify 404.
6. **Language pair support**: Verify that stories are correctly scoped to their language pair. Verify that creating a second language pair does not surface stories from the first.
7. **Health check**: Verify `/health` returns 200 when the database is reachable.

### Frontend Testing Strategy

**Testing framework**: Vitest (already available via Vite) with Testing Library React.

**Key test scenarios**:

1. **Story library rendering**: Given a mocked API response with stories, verify that story cards render with title, level badge, category, and reading time.
2. **Filter behavior**: Verify that selecting a CEFR level filter updates the query parameters and triggers a new API call.
3. **Tap-to-translate popup**: Render a story text, simulate clicking a word, verify the popover appears with the correct translation.
4. **Quiz flow**: Render quiz questions, simulate answer selection, verify correct/incorrect feedback, verify score summary at the end.
5. **Flashcard flip**: Verify card front shows German word, tap reveals back with translation. Verify rating buttons are present.

---

## Out of Scope

The following are explicitly excluded from this MVP implementation:

1. **Authentication and authorization** — No user accounts, login, registration, OAuth, or session management. A single implicit user is assumed.
2. **Payment and subscriptions** — No billing, Stripe integration, premium tiers, or paywalled content.
3. **Multi-user support** — No user isolation, separate progress tracking per user, or user settings.
4. **Mobile native apps** — Web-only. No React Native, Flutter, or native iOS/Android builds.
5. **Offline support** — No service worker, PWA caching, or offline-first architecture.
6. **Real-time features** — No WebSocket connections, live collaboration, or push notifications.
7. **Social features** — No leaderboards, friend lists, shared decks, or community content.
8. **Content moderation** — AI-generated content is assumed safe for personal use. No profanity filters, content review queues, or reporting mechanisms.
9. **Analytics and telemetry** — No usage tracking, event logging, or analytics dashboards beyond basic progress counters.
10. **CI/CD pipeline** — No GitHub Actions, deployment automation, or staging environments.
11. **Production deployment** — The app runs locally via Docker Compose. No cloud hosting, domain configuration, SSL, or CDN.
12. **Internationalized UI** — The app UI is in English. Only the learning content is bilingual (German/Indonesian).
13. **Additional language pairs beyond German/Indonesian** — The schema supports them but no content is generated for other pairs in MVP.
14. **Writing or speaking exercises** — Read-only learning. No text input exercises, speech recognition, or pronunciation scoring.
15. **Advanced AI features** — No conversation practice, AI tutor chat, adaptive difficulty, or personalized content recommendations.
16. **Image generation** — Story images come from stock photo APIs, not AI image generation (DALL-E, Stable Diffusion, etc.).
17. **Custom voice training** — Using pre-built edge-tts neural voices only. No voice cloning or custom voice models.
18. **Sentence-level audio timestamps** — MVP plays full story audio. Per-sentence sync requires audio timestamp extraction, which is deferred.

---

## Further Notes

### Security Considerations

- **API keys must never reach the frontend**. LLM provider keys (Gemini, Groq) and stock photo API keys (Pixabay) are server-side only, loaded from environment variables.
- **CORS is restricted** to `http://localhost:3001`. No wildcard origins.
- **SQL injection** is prevented by SQLAlchemy's parameterized queries. No raw SQL with string interpolation.
- **Rate limiting on generation endpoint**: The story generation endpoint (`POST /api/v1/stories/generate`) should have a simple in-memory rate limit (e.g., 5 requests per minute) to prevent accidental API key exhaustion.
- **Input validation**: All request bodies are validated by Pydantic. CEFR level is constrained to the enum. Category slug must match an existing record.

### Performance Requirements

- **Story list response**: < 200ms for up to 100 stories (paginated).
- **Story detail response**: < 300ms (single story with all related data, using joined eager loading).
- **Story generation**: 10–30 seconds is acceptable (AI generation + TTS + image fetch). Response should indicate progress or use a background task with polling.
- **Flashcard operations**: < 100ms (simple CRUD).
- **TTS audio serving**: Static file serving via FastAPI's `StaticFiles` mount, < 50ms for cached files.

### Future Extension Points

- **Authentication**: Add a `users` table, link `user_progress` and `flashcards` to `user_id`. Add JWT or session-based auth middleware. The current schema is designed so this is an additive change.
- **More language pairs**: Insert new records into `languages` and `language_pairs`. The AI prompt templates already parameterize the origin and target languages.
- **Premium TTS**: Swap `tts_provider` config to use Google Cloud TTS or Azure Speech for higher quality while keeping edge-tts as free fallback.
- **Sentence-level audio sync**: edge-tts supports SubMaker for subtitle/timing data. A future version can parse word boundaries for per-sentence playback.
- **Content scheduling**: Add a cron-based story generation task that produces N stories per day automatically, maintaining a content pipeline.
- **Export flashcards**: Export the flashcard deck to Anki-compatible format (`.apkg`) for users who want to study outside the app.
- **LLM quality feedback loop**: Store user quiz scores per AI model/provider. Use this data to compare which provider generates better educational content.
