# Architecture

**Analysis Date:** 2026-03-04

## Pattern Overview

**Overall:** SvelteKit Full-Stack MVC with Extended Thinking Coordinator Agent

ProjectWizard follows a client-server architecture where a Svelte frontend manages wizard state and communicates with a SvelteKit backend that orchestrates multi-specialist AI agents. The coordinator uses Claude's extended thinking API to decide the next question, specialists provide advice, and a critic agent reviews answers every 3 steps to maintain consistency.

**Key Characteristics:**
- Svelte 5 runes-based reactive state management (`$state`, `$derived`, `$effect`)
- Server-side AI coordination using Anthropic Extended Thinking API
- Supabase for project persistence and session resumption
- Multi-agent pattern: coordinator + specialist agents + critic agent
- Deterministic `.planning/` folder generation (no AI randomness)
- Progressive disclosure: load detailed context only when needed

## Layers

**Frontend (Svelte 5):**
- Purpose: Interactive wizard UI with real-time state synchronization
- Location: `src/routes/`, `src/lib/components/`
- Contains: Route pages, UI components, stores, i18n
- Depends on: Svelte runtime, Skeleton UI, Tailwind CSS, fetch API
- Used by: End users via HTTP browser

**Server API (SvelteKit):**
- Purpose: Handle chat requests, project persistence, document extraction, generation orchestration
- Location: `src/routes/api/`
- Contains: Route handlers for POST/GET/PATCH requests, validation, error handling
- Depends on: Anthropic SDK, Supabase SDK, Node.js fs/path modules
- Used by: Frontend via fetch, also used by CLI for project generation

**State Management (Svelte Store):**
- Purpose: Central reactive state for entire wizard session (single source of truth)
- Location: `src/lib/stores/wizard.svelte.ts`
- Contains: `WizardStore` class with methods like `addAnswer()`, `setCurrentQuestion()`, `completeCategory()`
- Depends on: Svelte 5 `$state` runes
- Used by: All Svelte pages and components

**AI Coordination Layer:**
- Purpose: Orchestrate multi-specialist workflow via Claude API
- Location: `src/lib/prompts/`, `src/lib/server/anthropic-client.ts`
- Contains: System prompts (coordinator, critic, design), retry logic, thinking extraction
- Depends on: Anthropic API, conversation history context building
- Used by: `/api/chat` endpoint, `/api/generate` endpoint

**Generation Layer:**
- Purpose: Transform wizard answers into complete project files (.planning/, agents/, skills/)
- Location: `src/lib/generators/`
- Contains: Template rendering, GSD folder generation, zip bundling
- Depends on: Answer mapper, specialist detection, JSZip
- Used by: `/api/generate` endpoint

**Persistence Layer:**
- Purpose: Store projects, retrieve sessions, maintain conversation state
- Location: `src/lib/supabase.ts`, `src/routes/api/projects/`
- Contains: Supabase client initialization, project CRUD operations
- Depends on: Supabase SDK, database schema (projects table)
- Used by: Wizard pages for save/resume, generation for retrieving answers

## Data Flow

**Wizard Session Flow:**

1. **Landing Page** (`src/routes/+page.svelte`)
   - User enters project description + optional documents
   - Document extraction (PDF → text via `/api/extract-document`)
   - Creates new project in Supabase
   - Initializes `wizardStore` and navigates to `/wizard`

2. **Wizard Page** (`src/routes/wizard/+page.svelte`)
   - `$effect` detects `currentQuestion` is null and calls `fetchNextQuestion()`
   - Sends POST to `/api/chat` with:
     - `projectDescription` (initial idea)
     - `answers` (all previous answers so far)
     - `currentStep` (how many answers given)
     - `completedCategories` (which required categories are done)
     - `documentContext` (uploaded docs combined)

3. **Chat Endpoint** (`src/routes/api/chat/+server.ts`)
   - **Critic Review** (every 3 answers):
     - Calls `createWithRetry()` to Claude Sonnet
     - Parses JSON feedback and adds to context
   - **Conversation Summary** (10+ answers):
     - Summarizes oldest answers, keeps recent 5 verbatim
   - **Coordinator Call** with Extended Thinking:
     - Calls `createWithThinking()` with:
       - `budget_tokens: 4096`
       - `max_tokens: 8192`
       - Coordinator system prompt
     - Extracts `CoordinatorResponse`:
       - `volgende_specialist`: which specialist asks next question
       - `vraag`: the question text
       - `vraag_type`: multiple_choice or vrije_tekst
       - `advies`: context-aware advice
       - `categorie_diepte`: depth tracking for each category
       - `is_compleet`: completion flag

4. **Question Display** (`src/routes/wizard/+page.svelte` + components)
   - `QuestionCard.svelte` displays question + advice
   - `AnswerInput.svelte` handles user input
   - User can skip, edit previous answers, or view history

5. **Answer Processing**
   - User submits answer
   - Stored in `wizardStore.answers` as `WizardAnswer` object
   - Auto-saves to Supabase via `saveToSupabase()`
   - Calls `fetchNextQuestion(userAnswer)` for next question
   - Loop continues until `isComplete = true`

6. **Completion & Generation** (`src/routes/wizard/preview/+page.svelte`)
   - User clicks "Generate Project"
   - POST to `/api/generate` with all answers
   - Maps answers to `WizardAnswers` structure via `mapAnswersToGSD()`
   - Generates GSD folder, agents, skills, CLAUDE.md, etc.
   - Returns downloadable zip bundle

**State Management:**

Central state in `WizardStore`:
```
- projectId, projectName, initialDescription → project metadata
- currentStep, isLoading, isComplete → flow state
- currentQuestion → coordinator's response
- answers: WizardAnswer[] → conversation history
- categoryDepth → tracks depth of each required category
- completedCategories → derived from categoryDepth
- generatedOutput → stored result from generation
```

Data flows **unidirectionally**:
- User action → Component updates store → `$effect` triggers API call → Response updates store → Components re-render
- Example: `AnswerInput` calls `addAnswer()` → store updates → `fetchNextQuestion()` triggered → chat response → `setCurrentQuestion()` → QuestionCard updates

## Key Abstractions

**CoordinatorResponse:**
- Purpose: Standardized structure for what coordinator decides
- Examples: `src/lib/stores/wizard.svelte.ts` (interface), `src/routes/api/chat/+server.ts` (creation)
- Pattern: Coordinator returns JSON with specific fields; frontend parses and validates
- Guarantees: Always includes `volgende_specialist`, `vraag`, `categorie_diepte`, `is_compleet`

**WizardStore:**
- Purpose: Single reactive store for entire session state
- Examples: `src/lib/stores/wizard.svelte.ts` (class definition)
- Pattern: Svelte 5 class-based store with `$state` properties and derived getters
- Methods: `startSession()`, `addAnswer()`, `setCurrentQuestion()`, `completeCategory()`, `confirmEditAnswer()`, `loadSession()`

**WizardAnswer:**
- Purpose: Single user answer with metadata
- Examples: `src/lib/types.ts` (interface)
- Pattern: Immutable answer records stored in array; only new answers added or replaced (truncation on edit)
- Fields: `step`, `specialist`, `question`, `answer`, `type`, `categorie`, `quality`

**Specialist Detection:**
- Purpose: Determine which specialists are needed for generated project
- Examples: `src/lib/generators/specialist-detection.ts`
- Pattern: Boolean flags (frontend always needed, backend always needed, testing/security conditional)
- Used by: Team generator, zip bundler to decide which agent/skill files to create

**GSD Output:**
- Purpose: Complete `.planning/` folder structure in deterministic format
- Examples: `src/lib/generators/gsd-generator.ts`
- Pattern: No AI involved; pure deterministic transformation from `WizardAnswers` to markdown files
- Guarantees: Always generates PROJECT.md, REQUIREMENTS.md, ROADMAP.md, CONFIG.json, CONTEXT.md, STATE.md

## Entry Points

**Web UI Entry:**
- Location: `src/routes/+layout.svelte`
- Triggers: Browser navigates to `/`
- Responsibilities: Sets up layout, language toggle, global styles, ToolsSidebar

**Landing Page:**
- Location: `src/routes/+page.svelte`
- Triggers: User visits `/`
- Responsibilities: Collect project idea + documents, create project, initialize wizard store

**Wizard Page:**
- Location: `src/routes/wizard/+page.svelte`
- Triggers: User navigates to `/wizard` after description
- Responsibilities: Main conversation loop, call chat endpoint, display questions, handle answers

**Chat API:**
- Location: `src/routes/api/chat/+server.ts`
- Triggers: POST request from frontend with answers + description
- Responsibilities: Run critic + coordinator agents, format conversation context, return next question

**Generate API:**
- Location: `src/routes/api/generate/+server.ts`
- Triggers: POST request with all answers when wizard is complete
- Responsibilities: Generate all project files, templates, agents, skills, create zip bundle

**Hooks (Security):**
- Location: `src/hooks.server.ts`
- Triggers: Every request
- Responsibilities: Apply CSP headers, frame options, content security policies

## Error Handling

**Strategy:** Multi-level with graceful degradation

**Patterns:**

1. **Validation Layer** (`src/lib/validation/`)
   - Schema validation with Zod before processing
   - Returns structured error response if invalid
   - Example: `chatRequestSchema.parse(body)` in `/api/chat`

2. **Anthropic API Errors** (`src/routes/api/chat/+server.ts`)
   - Catch known errors: `APIError.status 429` (rate limit), `401` (auth), `402` (credits)
   - Return user-friendly message
   - Retry-able errors trigger `createWithRetry()` logic with exponential backoff

3. **Critic Agent Failure** (`src/routes/api/chat/+server.ts`)
   - Try/catch around critic call
   - If fails, log warning and continue without critic context
   - Never blocks coordinator

4. **Server Errors** (`src/lib/server/errors.ts`)
   - `sanitizedError()` function redacts internal details
   - Returns 500 status with generic message to client
   - Logs full error server-side for debugging

## Cross-Cutting Concerns

**Logging:**
- Console logging in API handlers
- Anthropic API retry attempts logged with attempt count
- Critic failures logged as warnings
- Client-side errors logged to browser console

**Validation:**
- Zod schemas in `src/lib/validation/schemas.ts`
- Applied at API boundary before processing
- Separate validators for: chat requests, project creation, document extraction

**Authentication:**
- Supabase service role key used server-side (no user auth needed for MVP)
- Environment variable `SUPABASE_SERVICE_ROLE_KEY` loaded via `$env/dynamic/private`
- CSP headers restrict external connections to Supabase URL only

**Internationalization:**
- Central i18n store in `src/lib/i18n/index.svelte.ts` (Svelte 5 class-based)
- Dutch (nl.ts) is primary, English (en.ts) is fallback
- Locale persisted in localStorage
- All UI text accessed via `i18n.t.key.subkey` getters

**Document Processing:**
- Text files (txt, md) read client-side with `file.text()`
- PDF files sent to `/api/extract-document` as base64 for server extraction
- Concatenated documents stored in `wizardStore.documentContext`

---

*Architecture analysis: 2026-03-04*
