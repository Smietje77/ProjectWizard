# Codebase Structure

**Analysis Date:** 2026-03-04

## Directory Layout

```
ProjectWizard/
├── src/
│   ├── routes/                    # SvelteKit route handlers (pages + API)
│   │   ├── +layout.svelte         # Root layout with i18n and ToolsSidebar
│   │   ├── +page.svelte           # Landing page (description + document upload)
│   │   ├── wizard/
│   │   │   ├── +page.svelte       # Main wizard conversation
│   │   │   ├── preview/
│   │   │   │   └── +page.svelte   # Preview and generation trigger
│   │   │   └── [step]/            # Dynamic step routes (unused currently)
│   │   └── api/
│   │       ├── chat/
│   │       │   └── +server.ts     # POST: coordinator + critic agent
│   │       ├── generate/
│   │       │   └── +server.ts     # POST: generate all project files
│   │       ├── projects/
│   │       │   ├── +server.ts     # GET/POST: list and create projects
│   │       │   └── [id]/
│   │       │       └── +server.ts # GET/PATCH: retrieve and update project
│   │       ├── extract-document/
│   │       │   └── +server.ts     # POST: extract text from PDF
│   │       ├── analyze-screenshot/
│   │       │   └── +server.ts     # POST: analyze uploaded screenshot
│   │       ├── refine-skill/
│   │       │   └── +server.ts     # POST: refine skill definitions
│   │       └── env/
│   │           └── +server.ts     # GET: echo current environment config
│   ├── lib/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── QuestionCard.svelte         # Display question + advice
│   │   │   ├── AnswerInput.svelte          # Input multiple_choice or free text
│   │   │   ├── AnswerHistory.svelte        # Show past answers, enable editing
│   │   │   ├── LivePreview.svelte          # Real-time project preview
│   │   │   ├── ProgressTracker.svelte      # Category depth visualization
│   │   │   ├── WizardShell.svelte          # Main wizard layout wrapper
│   │   │   ├── ToolsSidebar.svelte         # Tool buttons (home, language)
│   │   │   ├── EnvHelper.svelte            # Environment variable helper
│   │   │   └── SkillReview.svelte          # Skill definition review
│   │   ├── stores/
│   │   │   └── wizard.svelte.ts   # Central reactive state (WizardStore class)
│   │   ├── i18n/
│   │   │   ├── index.svelte.ts    # I18n class with locale management
│   │   │   ├── nl.ts              # Dutch translations
│   │   │   └── en.ts              # English translations
│   │   ├── prompts/
│   │   │   ├── coordinator.ts     # System prompt for coordinator agent
│   │   │   ├── critic.ts          # System prompt for critic agent
│   │   │   ├── design.ts          # Design specialist system prompt
│   │   │   └── generator.ts       # System prompts for all generators
│   │   ├── generators/
│   │   │   ├── gsd-generator.ts           # Generate .planning/ folder structure
│   │   │   ├── agent-generator.ts        # Generate specialist agent files
│   │   │   ├── skill-generator.ts        # Generate skill files
│   │   │   ├── team-generator.ts         # Generate TEAM.md
│   │   │   ├── eval-generator.ts         # Generate EVAL.md
│   │   │   ├── specialist-detection.ts   # Detect which specialists needed
│   │   │   ├── templates.ts              # Template strings for generated files
│   │   │   ├── answer-mapper.ts          # Map wizard answers to GSD format
│   │   │   └── zip-bundler.ts            # Create downloadable zip
│   │   ├── validation/
│   │   │   ├── schemas.ts         # Zod schemas for all API inputs
│   │   │   ├── validate.ts        # Validation helper functions
│   │   │   └── *.test.ts          # Validation tests
│   │   ├── server/
│   │   │   ├── anthropic-client.ts        # Retry logic + thinking extraction
│   │   │   ├── errors.ts                  # Error sanitization
│   │   │   └── anthropic-client.test.ts   # Client tests
│   │   ├── types/
│   │   │   ├── gsd.ts             # GSD-specific type definitions
│   │   │   └── index.ts           # General types (Project, WizardAnswer, etc)
│   │   ├── data/
│   │   │   └── design-tokens.ts   # Design system tokens
│   │   ├── assets/
│   │   │   └── favicon.svg
│   │   ├── app.css                # Global styles
│   │   ├── index.ts               # Barrel file (exports from lib)
│   │   ├── supabase.ts            # Supabase client singleton
│   │   ├── generator.ts           # Entry point for generation logic
│   │   └── validation.ts          # Validation exports
│   ├── app.d.ts                   # SvelteKit types
│   ├── hooks.server.ts            # Security headers and middleware
│   └── app.html                   # Root HTML template
├── .planning/                     # Generated GSD folder for this project
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── svelte.config.js               # SvelteKit configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── vite.config.ts                 # Vite build configuration
└── README.md                      # Project documentation
```

## Directory Purposes

**`src/routes/`:**
- Purpose: SvelteKit file-based routing (pages and API endpoints)
- Contains: Svelte page files (+page.svelte), server handlers (+server.ts)
- Key files: `+page.svelte` (landing), `wizard/+page.svelte` (main wizard), `api/chat/+server.ts` (core chat)

**`src/lib/components/`:**
- Purpose: Reusable Svelte UI components
- Contains: Svelte component files (.svelte)
- Naming: PascalCase (e.g., `QuestionCard.svelte`)

**`src/lib/stores/`:**
- Purpose: Svelte reactive stores for application state
- Contains: `.svelte.ts` files (Svelte 5 runes-based stores)
- Key files: `wizard.svelte.ts` (single source of truth for wizard state)

**`src/lib/prompts/`:**
- Purpose: System prompts for all AI agents
- Contains: TypeScript strings exported as constants
- Key files: `coordinator.ts` (main orchestrator), `critic.ts` (quality review)

**`src/lib/generators/`:**
- Purpose: Transform wizard answers into complete project files
- Contains: TypeScript functions that generate markdown, JSON, and project structures
- Key files: `gsd-generator.ts` (main), `specialist-detection.ts` (shared logic)

**`src/lib/validation/`:**
- Purpose: Input validation schemas and helpers
- Contains: Zod schemas (.ts files) and unit tests (.test.ts)
- Key files: `schemas.ts` (all schemas), `validate.ts` (helper functions)

**`src/lib/server/`:**
- Purpose: Server-only utilities (not exposed to client)
- Contains: Anthropic client wrapper, error handling
- Key files: `anthropic-client.ts` (retry + thinking extraction), `errors.ts` (sanitization)

**`src/lib/types/`:**
- Purpose: TypeScript type definitions
- Contains: Interfaces and types (.ts files)
- Key files: `index.ts` (general types), `gsd.ts` (GSD-specific)

**`src/lib/i18n/`:**
- Purpose: Internationalization
- Contains: i18n store, language translation files
- Key files: `index.svelte.ts` (store), `nl.ts` (Dutch), `en.ts` (English)

## Key File Locations

**Entry Points:**
- `src/routes/+layout.svelte`: Root layout, applies to all pages
- `src/routes/+page.svelte`: Landing page (GET /)
- `src/routes/wizard/+page.svelte`: Main wizard (GET /wizard)
- `src/routes/api/chat/+server.ts`: Chat endpoint (POST /api/chat)

**Configuration:**
- `svelte.config.js`: SvelteKit adapter setup
- `tsconfig.json`: TypeScript compiler options (strict mode enabled)
- `tailwind.config.ts`: Tailwind CSS configuration
- `vite.config.ts`: Vite build tool configuration

**Core Logic:**
- `src/lib/stores/wizard.svelte.ts`: Central state management
- `src/lib/server/anthropic-client.ts`: Anthropic API wrapper
- `src/lib/supabase.ts`: Supabase client
- `src/lib/generator.ts`: Entry point for generation

**Testing:**
- `src/lib/validation/validate.test.ts`: Validation tests
- `src/lib/validation/schemas.test.ts`: Schema tests
- `src/lib/server/anthropic-client.test.ts`: Client tests

## Naming Conventions

**Files:**
- Pages: `+page.svelte` (SvelteKit convention)
- Handlers: `+server.ts` (SvelteKit convention)
- Components: `PascalCase.svelte` (e.g., `QuestionCard.svelte`)
- Utilities: `camelCase.ts` (e.g., `anthropic-client.ts`)
- Stores: `camelCase.svelte.ts` (e.g., `wizard.svelte.ts`)
- Tests: `*.test.ts` or `*.spec.ts` (Vitest convention)

**Directories:**
- Route segments: `[dynamic]` for route parameters
- Nested routes: `folder/+page.svelte` for grouped pages
- API routes: `api/endpoint/+server.ts`

**Code Symbols:**
- Functions: `camelCase` (e.g., `fetchNextQuestion()`, `createWithThinking()`)
- Variables: `camelCase` (e.g., `isLoading`, `categoryDepth`)
- Types/Interfaces: `PascalCase` (e.g., `CoordinatorResponse`, `WizardAnswer`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `REQUIRED_CATEGORIES`, `MAX_DOCS`)
- Classes: `PascalCase` (e.g., `WizardStore`, `I18n`)

## Where to Add New Code

**New Feature (e.g., new question type):**
- Primary logic: `src/lib/prompts/coordinator.ts` (update system prompt)
- Frontend: `src/lib/components/AnswerInput.svelte` (add UI for new type)
- API: `src/routes/api/chat/+server.ts` (handle response parsing)
- Tests: `src/lib/validation/schemas.test.ts` (if new data shape)

**New Component:**
- Implementation: `src/lib/components/YourComponent.svelte`
- Import: Use in routes or other components with relative import: `import YourComponent from '$lib/components/YourComponent.svelte'`
- Styling: Use Skeleton UI classes + Tailwind (configured in `app.css` via `@apply`)

**New Specialist or Agent:**
- Generator: `src/lib/generators/specialist-detection.ts` (add to `detectRequiredSpecialists()`)
- Agent template: `src/lib/generators/agent-generator.ts` (update template)
- System prompt: `src/lib/prompts/generator.ts` (add generator prompt if needed)

**New Utilities:**
- Shared helpers: `src/lib/utils/` (create if needed) or add to relevant file
- Server-only: `src/lib/server/` (for Node.js-only code)
- Client-side: `src/lib/` directly or in subdirectory

**New API Endpoint:**
- Location: `src/routes/api/endpoint/+server.ts`
- Pattern: Export `POST`, `GET`, `PATCH`, etc. as `RequestHandler`
- Validation: Use Zod schema from `src/lib/validation/schemas.ts`
- Error handling: Wrap in try/catch, use `sanitizedError()` for response

**Tests:**
- Unit tests: Co-located with implementation (e.g., `src/lib/validation/validate.test.ts`)
- Integration tests: `src/lib/server/anthropic-client.test.ts` pattern
- Run: `npm run test` (vitest)

## Special Directories

**`.planning/`:**
- Purpose: GSD folder for ProjectWizard itself
- Generated: Yes (by running `/api/generate`)
- Committed: Yes (part of codebase documentation)

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (by `npm install`)
- Committed: No

**`.svelte-kit/`:**
- Purpose: SvelteKit build cache and type generation
- Generated: Yes (automatically)
- Committed: No

**`.env.local` and `.env.example`:**
- Purpose: Environment variables
- Generated: No
- Committed: `.env.example` (tracked), `.env.local` (gitignored)

---

*Structure analysis: 2026-03-04*
