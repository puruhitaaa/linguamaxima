# LinguaMaxima — MVP Research & Technical Specification

> **Date**: 2026-08-24  
> **Scope**: Personal language learning platform (German from Indonesian)  
> **MVP Constraints**: No auth, no payments, AI-generated content, swappable providers

---

## Table of Contents

1. [Readle UX Analysis](#1-readle-ux-analysis)
2. [AI Text Provider Comparison](#2-ai-text-provider-comparison)
3. [Asset Generation Options (Free/Low-Cost)](#3-asset-generation-options-freelow-cost)
4. [FastAPI Backend Tech Stack](#4-fastapi-backend-tech-stack)
5. [Existing Project Analysis](#5-existing-project-analysis)
6. [Recommended Architecture](#6-recommended-architecture)

---

## 1. Readle UX Analysis

### 1.1 What is Readle?

Readle (formerly Langster) is the **world's first CEFR-graded language-learning reader**. It supports German, French, Spanish, English, Japanese, and Chinese. It has 100,000+ users and 2,000+ stories.

### 1.2 Core User Flows

```
┌─────────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│  Home Feed  │───▶│ Story Select │───▶│ Reading Screen │───▶│  Quiz/Review │
│  (by level) │    │ (by category)│    │ (interactive)  │    │ (comprehend) │
└─────────────┘    └──────────────┘    └────────────────┘    └──────────────┘
       │                                       │                     │
       ▼                                       ▼                     ▼
┌─────────────┐                        ┌────────────────┐    ┌──────────────┐
│  Flashcard  │                        │ Vocab Sidebar  │    │  Progress    │
│   Review    │                        │ Grammar Helper │    │  Tracking    │
└─────────────┘                        └────────────────┘    └──────────────┘
```

### 1.3 Feature Breakdown

| Feature | Description | MVP Priority |
| --- | --- | --- |
| **CEFR-Graded Stories** | Stories organized by A1, A2, B1, B2, C1 levels | ✅ Must |
| **Tap-to-Translate** | Tap any word → instant translation + explanation | ✅ Must |
| **Audio Playback** | Native speaker audio, sentence-by-sentence. Speed: 1x / 0.75x | ✅ Must |
| **Vocabulary List** | Key vocabulary section per story with pronunciation | ✅ Must |
| **Flashcards (SRS)** | Spaced repetition flashcards from story vocabulary | ✅ Must |
| **Comprehension Quiz** | Multiple choice quiz after each story (grammar, vocab, articles) | ✅ Must |
| **Grammar Helper** | 200+ contextual grammar tips embedded in stories | 🟡 Should |
| **Story Categories** | Travel, Culture, Food, News, Tech, Science, Entertainment, etc. | ✅ Must |
| **Daily New Story** | Fresh content daily | 🟡 Should |
| **Progress Tracking** | Words learned, stories completed, streak | 🟡 Should |
| **Filter by Level** | Browse/filter stories by CEFR level | ✅ Must |
| **Story Library** | 2,000+ stories (we'll AI-generate these) | ✅ Must |

### 1.4 Reading Screen UX Details

1. **Story text** displayed paragraph-by-paragraph
2. **Tap any word** → popup with: translation, part of speech, conjugation info
3. **Save word** to personal flashcard deck
4. **Audio controls**: play full story, play per-sentence, 1x/0.75x speed
5. **Tabs within story**: Story | Vocabulary | Grammar | Quiz
6. **Translation toggle**: show/hide parallel translation

### 1.5 Quiz Types

- **Multiple choice** comprehension questions (in target language)
- **Article practice**: der/die/das (for German)
- **Fill-in-the-blank** vocabulary
- **True/False** comprehension
- Retakeable unlimited times

### 1.6 Gamification

- Daily reading streak
- Words learned counter
- Stories completed counter
- Level progression (A1 → C1)

---

## 2. AI Text Provider Comparison

### 2.1 Provider Pricing Overview (August 2026)

| Provider | Best Model | Input/1M | Output/1M | Free Tier | Multilingual (DE+ID) | JSON Mode |
| --- | --- | --- | --- | --- | --- | --- |
| **Google Gemini** | Gemini 2.5 Flash | $0.30 | $2.50 | ✅ Flash free: 10-15 RPM | ⭐ Excellent | ✅ |
| **Groq** | Llama 4 Scout | $0.11 | $0.34 | ✅ 30 RPM, 500K tok/day | 🟡 Good | ✅ |
| **Mistral** | Mistral Small 3.2 | $0.10 | $0.30 | ✅ 2 RPM, 1B tok/mo | 🟡 Good (EU focus) | ✅ |
| **DeepSeek** | DeepSeek V4 Flash | $0.14 | $0.28 | 🟡 5M tokens (one-time) | ⭐ Excellent | ✅ |
| **OpenAI** | GPT-4.1 nano | $0.10 | $0.40 | ❌ Minimal | ⭐ Excellent | ✅ |
| **Anthropic** | Claude Haiku 4.5 | $1.00 | $5.00 | ❌ Starter credit only | ⭐ Excellent | ✅ |
| **OpenRouter** | Multi-model | Varies | Varies | ✅ ~30 free models | Varies | ✅ |
| **xAI (Grok)** | Grok 4.1 Fast | $0.20 | $0.50 | ✅ $25 signup credits | 🟡 Good | ✅ |

### 2.2 Recommended Abstraction Layer: LiteLLM

**LiteLLM** is the clear winner for provider swapping. It provides a unified `completion()` interface for 100+ LLMs using the OpenAI format.

**Key features:**

- Single `completion()` function — change provider by changing model string
- OpenAI-compatible responses across all providers
- Built-in retry/fallback logic via Router
- Cost tracking per request
- Python SDK: `pip install litellm`

```python
from litellm import completion

# Switch providers by just changing the model string:
response = completion(model="gemini/gemini-2.5-flash", messages=[...])
response = completion(model="groq/llama-4-scout", messages=[...])
response = completion(model="openai/gpt-4.1-nano", messages=[...])
response = completion(model="deepseek/deepseek-v4-flash", messages=[...])
```

**Why LiteLLM over alternatives?**

- **vs LangChain**: LangChain is overkill for this use case — too many abstractions. LiteLLM is a thin, focused layer.
- **vs Instructor**: Instructor is for structured output extraction — can be used **alongside** LiteLLM, not a replacement.
- **vs direct SDKs**: Direct SDKs lock you into a single provider.

### 2.3 ✅ CONFIRMED: AI Provider Selection

| Role | Provider | Model String (LiteLLM) | Cost | Why |
| --- | --- | --- | --- | --- |
| **Primary** | Google Gemini | `gemini/gemini-2.5-flash` | **$0/mo** (free tier: 10-15 RPM) | Best multilingual quality, 1M context, excellent German + Indonesian |
| **Fallback** | Groq | `groq/llama-4-scout` | **$0/mo** (free tier: 30 RPM, 500K tok/day) | Blazing fast (594 tok/s), generous free tier |

**Total estimated monthly cost: $0**

> Decided on 2026-08-24. Both providers are swappable via LiteLLM — changing to any other provider requires only a config string change.

---

## 3. Asset Generation Options (Free/Low-Cost)

### 3.1 Text-to-Speech (TTS)

#### 🏆 Top Recommendation: edge-tts (FREE, unlimited)

| Option | Cost | German | Indonesian | Quality | Python SDK | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **edge-tts** | **FREE** ♾️ | ✅ de-DE voices | ✅ id-ID voices | ⭐⭐⭐⭐ Neural | `pip install edge-tts` | Uses Microsoft Edge's online TTS. No API key needed. Best free option. |
| **gTTS** | **FREE** ♾️ | ✅ de | ✅ id | ⭐⭐⭐ Good | `pip install gTTS` | Google Translate TTS. Lower quality than edge-tts. |
| **Piper TTS** | **FREE** (self-host) | ✅ de_DE voices | ❌ No ID voices | ⭐⭐⭐⭐ Good | `pip install piper-tts` | Offline, fast. German voices available (Thorsten). No Indonesian. |
| Google Cloud TTS | Free 1M chars/mo | ✅ de-DE | ✅ id-ID | ⭐⭐⭐⭐⭐ | `google-cloud-texttospeech` | Neural2/WaveNet free tier is permanent. Best quality. |
| Azure Speech | Free 500K chars/mo | ✅ de-DE | ✅ id-ID | ⭐⭐⭐⭐⭐ | `azure-cognitiveservices-speech` | 500+ voices, 140+ langs. Permanent free tier. |
| Amazon Polly | Free 1M chars/mo (yr1) | ✅ de-DE | ❌ No ID | ⭐⭐⭐⭐ | `boto3` | First 12 months only. No Indonesian. |
| OpenAI TTS | $15/M chars | ✅ | ✅ | ⭐⭐⭐⭐⭐ | `openai` | No free tier. 6 voices. |
| ElevenLabs | 10K chars/mo free | ✅ | ✅ | ⭐⭐⭐⭐⭐ | `elevenlabs` | Best quality but very limited free tier. |

**MVP Recommendation**: Use **edge-tts** as primary (completely free, neural quality, supports both German AND Indonesian). Fall back to **gTTS** as backup. If you want premium quality later, add **Google Cloud TTS** (permanent 1M chars/mo free).

**edge-tts usage example:**

```python
import edge_tts
import asyncio

async def generate_audio(text: str, voice: str, output: str):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output)

# German
asyncio.run(generate_audio("Hallo, wie geht es dir?", "de-DE-ConradNeural", "de.mp3"))
# Indonesian
asyncio.run(generate_audio("Halo, apa kabar?", "id-ID-ArdiNeural", "id.mp3"))
```

**Available edge-tts voices for our languages:**

- **German**: `de-DE-ConradNeural`, `de-DE-KatjaNeural`, `de-DE-AmalaNeural`, `de-DE-KillianNeural`
- **Indonesian**: `id-ID-ArdiNeural`, `id-ID-GadisNeural`

### 3.2 Images (Stock Photo APIs)

| Provider | Free Tier | Rate Limit | API | License | Quality |
| --- | --- | --- | --- | --- | --- |
| **Unsplash** | ✅ Free | Demo: 50 req/hr, Prod: 1,000 req/hr | REST JSON | Free for commercial use, attribute photographer | ⭐⭐⭐⭐⭐ |
| **Pexels** | ✅ Free | 200 req/hr, 20K req/mo | REST JSON | Free, attribute Pexels + photographer | ⭐⭐⭐⭐⭐ |
| **Pixabay** | ✅ Free | 100 req/min | REST JSON | Free commercial, no attribution required | ⭐⭐⭐⭐ |

**MVP Recommendation**: Use **Pixabay** (no attribution required, generous limits) for story illustrations. Use search terms from story topics to find relevant images. Supplement with **Pexels** for variety.

**Compliance reminders:**

- **Unsplash**: Must hotlink (don't rehost), fire download endpoint, UTM attribution
- **Pexels**: Show photographer + Pexels attribution
- **Pixabay**: Cache images locally (don't hotlink), cache API responses 24h

### 3.3 Icons & UI Assets

| Resource | Type | License | URL |
| --- | --- | --- | --- |
| **Lucide React** | Icon library (already in project) | MIT | lucide.dev |
| **Heroicons** | SVG icons | MIT | heroicons.com |
| **Noto Emoji** | Google emoji set | Apache 2.0 | fonts.google.com/noto/emoji |
| **Flagpack** | Country flag icons | MIT | flagpack.xyz |

### 3.4 Fonts

Both German and Indonesian use Latin script — any standard Latin font works.

| Font | Style | Notes |
| --- | --- | --- |
| **Inter** (already in project) | Sans-serif, clean | Perfect for UI. Already configured. |
| **Noto Sans** | Sans-serif | Google's universal font, explicit Indonesian support. |
| **Merriweather** | Serif | Good for story reading body text. |

### 3.5 Audio Effects & Sounds

| Resource | Type | License | URL |
| --- | --- | --- | --- |
| **Freesound.org** | Sound effects library | CC0/CC-BY | freesound.org |
| **Mixkit** | Sound effects + music | Free license | mixkit.co |
| **Pixabay Audio** | Music + SFX | Free commercial | pixabay.com/music |

---

## 4. FastAPI Backend Tech Stack

### 4.1 Recommended Stack (2026 Best Practices)

| Layer | Technology | Why |
| --- | --- | --- |
| **Framework** | FastAPI (latest) | Async-first, auto OpenAPI docs, Pydantic v2 validation |
| **Database** | PostgreSQL 16+ (Docker, port 5433) | Robust, proven, JSON support |
| **ORM** | SQLAlchemy 2.0+ (async) | Production standard, mature, async support |
| **Async Driver** | asyncpg | Fastest async PostgreSQL driver |
| **Migrations** | Alembic | Standard for SQLAlchemy migrations |
| **Validation** | Pydantic v2 | Rust-powered, fastest validation |
| **Dep Manager** | uv | 10-100x faster than pip, lockfile, Python version mgmt |
| **HTTP Client** | httpx | Async HTTP client for AI provider calls |
| **LLM Layer** | LiteLLM | Unified interface for 100+ LLM providers |
| **TTS** | edge-tts | Free neural TTS for German + Indonesian |
| **Background Tasks** | FastAPI BackgroundTasks (MVP) | Simple, no extra infra needed for MVP |
| **Testing** | pytest + pytest-asyncio + httpx | Async testing with ASGI test client |
| **Containerization** | Docker Compose | PostgreSQL + FastAPI |

### 4.2 Project Structure

```
apps/
  api/                          # FastAPI backend (NEW)
    pyproject.toml              # uv project config
    uv.lock                    # Lockfile
    alembic/
      env.py
      versions/
    alembic.ini
    app/
      __init__.py
      main.py                  # App factory + lifespan
      core/
        config.py              # Pydantic Settings (env vars)
        database.py            # Async engine + session factory
      api/
        v1/
          router.py            # Aggregates all v1 routers
          endpoints/
            stories.py         # Story CRUD + generation
            vocabulary.py      # Vocabulary endpoints
            quizzes.py         # Quiz endpoints
            languages.py       # Language pair management
            tts.py             # Text-to-speech endpoints
            progress.py        # User progress tracking
      models/
        __init__.py
        story.py               # Story ORM model
        vocabulary.py          # Vocabulary ORM model
        quiz.py                # Quiz ORM model
        language.py            # Language pair ORM model
        progress.py            # Progress ORM model
      schemas/
        __init__.py
        story.py               # Story Pydantic schemas
        vocabulary.py
        quiz.py
        language.py
        progress.py
      services/
        story_service.py       # Story business logic
        ai_service.py          # LLM content generation
        tts_service.py         # TTS generation
        vocabulary_service.py
        quiz_service.py
      repositories/
        base.py                # Generic CRUD repository
        story_repo.py
        vocabulary_repo.py
        quiz_repo.py
    tests/
      conftest.py
      test_stories.py
      test_ai_service.py
    Dockerfile
```

### 4.3 Database Schema (Multi-Language Support)

```sql
-- Language pairs (origin → target)
CREATE TABLE languages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,  -- e.g., 'de', 'id', 'en'
    name VARCHAR(100) NOT NULL,        -- e.g., 'German', 'Indonesian'
    native_name VARCHAR(100),          -- e.g., 'Deutsch', 'Bahasa Indonesia'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE language_pairs (
    id SERIAL PRIMARY KEY,
    origin_language_id INTEGER REFERENCES languages(id),
    target_language_id INTEGER REFERENCES languages(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(origin_language_id, target_language_id)
);

-- CEFR levels
CREATE TYPE cefr_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- Story categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50)  -- emoji or icon name
);

-- Stories (AI-generated)
CREATE TABLE stories (
    id SERIAL PRIMARY KEY,
    language_pair_id INTEGER REFERENCES language_pairs(id),
    category_id INTEGER REFERENCES categories(id),
    cefr_level cefr_level NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_translated VARCHAR(500),  -- title in origin language
    content TEXT NOT NULL,          -- story text in target language
    content_translated TEXT,        -- parallel translation
    summary TEXT,
    image_url VARCHAR(500),
    audio_url VARCHAR(500),
    estimated_reading_minutes INTEGER DEFAULT 5,
    word_count INTEGER,
    ai_model VARCHAR(100),          -- which model generated this
    ai_provider VARCHAR(50),        -- which provider
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vocabulary per story
CREATE TABLE vocabulary (
    id SERIAL PRIMARY KEY,
    story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
    word VARCHAR(200) NOT NULL,             -- word in target language
    translation VARCHAR(200) NOT NULL,      -- translation in origin language
    part_of_speech VARCHAR(50),             -- noun, verb, adjective, etc.
    gender VARCHAR(20),                     -- der/die/das for German
    example_sentence TEXT,
    example_translation TEXT,
    pronunciation_url VARCHAR(500),
    difficulty_rank INTEGER,                -- 1=easy, higher=harder
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grammar tips per story
CREATE TABLE grammar_tips (
    id SERIAL PRIMARY KEY,
    story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    explanation TEXT NOT NULL,
    explanation_translated TEXT,
    example TEXT,
    example_translation TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Quizzes per story
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
    question_type VARCHAR(50) NOT NULL,  -- 'multiple_choice', 'fill_blank', 'true_false', 'article'
    question TEXT NOT NULL,
    question_translated TEXT,
    correct_answer TEXT NOT NULL,
    wrong_answers JSONB,  -- array of wrong options
    explanation TEXT,
    sort_order INTEGER DEFAULT 0
);

-- User progress (no auth = single default user for MVP)
CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    story_id INTEGER REFERENCES stories(id),
    completed_at TIMESTAMPTZ,
    quiz_score INTEGER,         -- percentage
    quiz_attempts INTEGER DEFAULT 0,
    is_favorite BOOLEAN DEFAULT FALSE
);

-- Flashcard deck (SRS)
CREATE TABLE flashcards (
    id SERIAL PRIMARY KEY,
    vocabulary_id INTEGER REFERENCES vocabulary(id),
    ease_factor FLOAT DEFAULT 2.5,      -- SM-2 algorithm
    interval_days INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0,
    next_review TIMESTAMPTZ DEFAULT NOW(),
    last_reviewed TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Docker Compose (PostgreSQL on port 5433)

```yaml
# docker-compose.yml (updated)
name: linguamaxima

services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    init: true
    ports:
      - "3001:3001"
    env_file:
      - path: apps/web/.env
        required: false
    depends_on:
      api:
        condition: service_healthy
    restart: unless-stopped

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - path: apps/api/.env
        required: false
    environment:
      DATABASE_URL: postgresql+asyncpg://linguamaxima:linguamaxima@db:5432/linguamaxima
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test:
        [
          "CMD",
          "python",
          "-c",
          "import httpx; httpx.get('http://localhost:8000/health')",
        ]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    ports:
      - "5433:5432" # Host port 5433 → Container port 5432
    environment:
      POSTGRES_DB: linguamaxima
      POSTGRES_USER: linguamaxima
      POSTGRES_PASSWORD: linguamaxima
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U linguamaxima -d linguamaxima"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
```

### 4.5 Key Configuration

```python
# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    app_name: str = "LinguaMaxima API"
    app_version: str = "0.1.0"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://linguamaxima:linguamaxima@localhost:5433/linguamaxima"

    # CORS
    cors_origins: list[str] = ["http://localhost:3001"]

    # AI Providers (via LiteLLM)
    default_ai_model: str = "gemini/gemini-2.5-flash"
    fallback_ai_model: str = "groq/llama-4-scout"

    # API Keys (set via env vars)
    gemini_api_key: str = ""
    groq_api_key: str = ""
    openai_api_key: str = ""

    # TTS
    tts_provider: str = "edge-tts"
    default_target_voice: str = "de-DE-ConradNeural"
    default_origin_voice: str = "id-ID-ArdiNeural"
```

### 4.6 Python Dependencies (pyproject.toml)

```toml
[project]
name = "linguamaxima-api"
version = "0.1.0"
description = "AI-powered language learning platform API"
requires-python = ">=3.12"
dependencies = [
    "fastapi[standard]>=0.115",
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg>=0.30",
    "alembic>=1.14",
    "pydantic-settings>=2.0",
    "litellm>=1.50",
    "httpx>=0.28",
    "edge-tts>=7.0",
    "pillow>=11.0",
]

[dependency-groups]
dev = [
    "pytest>=9.0",
    "pytest-asyncio>=0.25",
    "ruff>=0.15",
]

[tool.uv]
package = false
```

---

## 5. Existing Project Analysis

### 5.1 Current Monorepo Structure

| Component | Stack | Status |
| --- | --- | --- |
| `apps/web` | React + TanStack Start (SSR) + TailwindCSS | ✅ Scaffolded |
| `packages/ui` | Shared shadcn/ui components | ✅ Set up |
| `packages/env` | Shared env config (Zod + dotenv) | ✅ Set up |
| `packages/config` | Shared TypeScript config | ✅ Set up |
| `apps/api` | FastAPI backend | ❌ **Needs creation** |

### 5.2 Frontend Stack

- **Framework**: React 19 + TanStack Start (SSR)
- **Styling**: TailwindCSS v4 + shadcn/ui
- **Icons**: Lucide React
- **Theme**: next-themes (dark mode support)
- **Build**: Vite + Nx
- **Package Manager**: pnpm 10.33.2

### 5.3 Key Files

- Root `package.json` — pnpm monorepo with Nx
- `pnpm-workspace.yaml` — apps/* + packages/*
- `docker-compose.yml` — currently only has `web` service
- `docs/DESIGN.md` — design tokens extracted from Readle (dark theme, Inter font)

---

## 6. Recommended Architecture

### 6.1 System Overview

```
┌─────────────────────────────────────────────────┐
│                    Frontend                      │
│         React + TanStack Start (SSR)            │
│         TailwindCSS + shadcn/ui                 │
│                 Port 3001                        │
└─────────────────────┬───────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────┐
│                  FastAPI Backend                  │
│              Port 8000                           │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ LiteLLM   │  │ edge-tts │  │ Pixabay API  │ │
│  │ (AI Gen)  │  │  (Audio) │  │  (Images)    │ │
│  └─────┬─────┘  └────┬─────┘  └──────┬───────┘ │
│        │              │               │          │
│  ┌─────▼──────────────▼───────────────▼───────┐ │
│  │           Service Layer                     │ │
│  │  story_service | ai_service | tts_service   │ │
│  └─────────────────┬──────────────────────────┘ │
│                    │                             │
│  ┌─────────────────▼──────────────────────────┐ │
│  │         Repository Layer                    │ │
│  │   SQLAlchemy 2.0 Async + asyncpg            │ │
│  └─────────────────┬──────────────────────────┘ │
└────────────────────┼────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│            PostgreSQL 16                         │
│         Docker · Port 5433 (host)               │
└─────────────────────────────────────────────────┘
```

### 6.2 AI Content Generation Pipeline

```
User requests "Generate A1 German story about Travel"
        │
        ▼
┌─────────────────────────┐
│     ai_service.py       │
│  1. Build prompt with:  │
│     - CEFR level rules  │
│     - Category/topic    │
│     - Language pair      │
│     - Word count target │
│  2. Call LiteLLM        │
│  3. Parse structured    │
│     JSON response       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   LiteLLM completion()  │
│   model="gemini/..."    │
│   response_format=json  │
│   → Returns:            │
│     - story text        │
│     - translation       │
│     - vocabulary list   │
│     - grammar tips      │
│     - quiz questions    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   tts_service.py        │
│   edge-tts generates    │
│   audio for story +     │
│   individual words      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Save to PostgreSQL    │
│   + store audio files   │
└─────────────────────────┘
```

### 6.3 MVP Feature Scope

| Feature                                 | Status | Tech                     |
| --------------------------------------- | ------ | ------------------------ |
| Browse stories by CEFR level & category | MVP    | FastAPI + React          |
| Read story with tap-to-translate        | MVP    | React (frontend logic)   |
| Listen to story audio                   | MVP    | edge-tts + HTML5 audio   |
| Story vocabulary list                   | MVP    | AI-generated + DB        |
| Comprehension quiz                      | MVP    | AI-generated + DB        |
| Flashcard review (SRS)                  | MVP    | SM-2 algorithm           |
| Grammar tips per story                  | MVP    | AI-generated             |
| AI story generation                     | MVP    | LiteLLM + Gemini/Groq    |
| Progress tracking                       | MVP    | Local DB (single user)   |
| Multi-language backend                  | MVP    | language_pairs table     |
| Dark theme                              | MVP    | Already in design tokens |

### 6.4 Key Design Decisions

1. **No auth for MVP** — single default user, progress stored server-side
2. **AI-generated everything** — stories, vocab, grammar tips, quizzes all generated by LLM
3. **LiteLLM for provider swapping** — change AI provider with one config change
4. **edge-tts for audio** — completely free, neural quality, both languages supported
5. **PostgreSQL on port 5433** — avoids conflict with host Postgres
6. **uv for Python deps** — fastest package manager, modern best practice
7. **Structured JSON from LLM** — single prompt generates story + vocab + grammar + quiz

---

> **Note**: This document was generated from exhaustive web research conducted on 2026-08-24. Pricing and availability may change — verify with provider websites before committing.
