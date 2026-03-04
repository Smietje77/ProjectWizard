# External Integrations

**Analysis Date:** 2025-03-04

## APIs & External Services

**Anthropic Claude API:**
- Service: Claude language model for wizard conversation and document generation
- SDK/Client: @anthropic-ai/sdk 0.71.2
- Auth: Environment variable `ANTHROPIC_API_KEY` (sk-ant-* format)
- Models used:
  - `claude-sonnet-4-5-20250929` - Main model for coordinator, critic, and document generation
  - Extended Thinking enabled for coordinator agent (budget_tokens: 4096, max_tokens: 8192)
- Endpoints:
  - `POST /api/chat` - Conversation turns with coordinator agent
  - `POST /api/analyze-screenshot` - Design analysis from uploaded images
  - `POST /api/extract-document` - Document text extraction from PDF/text files
  - `POST /api/generate` - Project generation and prompt enrichment
  - `POST /api/refine-skill` - Skill refinement during project generation
- Features used:
  - Text generation with streaming (streamWithRetry)
  - Non-streaming message creation (createWithRetry)
  - Extended thinking for complex reasoning
  - Vision API for image analysis (jpeg, png, webp, gif)
  - Document processing API for PDF analysis
  - Retry logic with exponential backoff (3 retries, 1s-10s delays, 60s timeout)

**Supabase PostgreSQL Database:**
- Service: Self-hosted PostgreSQL with Supabase client
- SDK/Client: @supabase/supabase-js 2.93.1
- Auth: Service role key `SUPABASE_SERVICE_ROLE_KEY` (server-side only, service account)
- Connection: URL via `SUPABASE_URL`
- Tables:
  - `projects` - Wizard session state
    - Columns: id, name, description, current_step, answers (jsonb), category_depth (integer), is_complete (boolean), generated_output (jsonb), created_at, updated_at
  - `templates` - Reusable project templates (defined in CLAUDE.md but not actively used in current codebase)
- Operations:
  - `POST /api/projects` - Create new project session
  - `GET /api/projects` - List all projects with dashboard metadata
  - `GET /api/projects/[id]` - Fetch single project details
  - `PUT /api/projects/[id]` - Update project progress and answers
- Security: Service role queries project data server-side, never exposed client-side

## Data Storage

**Database:**
- PostgreSQL via Supabase (self-hosted on VPS)
- Client: @supabase/supabase-js
- Connection pooling: Supabase managed

**File Storage:**
- Memory-based (ZIP files generated in Node.js and Blob in browser)
- No persistent file storage integration (user downloads project ZIP)
- Max file upload: 10MB for documents/images (validated in api endpoints)

**Caching:**
- Supabase connection singleton in `src/lib/supabase.ts` (lazy-initialized)
- No additional caching layer (Supabase handles database caching)

## Authentication & Identity

**Auth Provider:**
- Supabase service role (internal API only)
- No user authentication implemented (single-user wizard in dev/preview)
- Security headers set in `src/hooks.server.ts`:
  - Content-Security-Policy restricts connect-src to Supabase URL
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin

**Token Management:**
- ANTHROPIC_API_KEY stored as server environment variable (never sent to client)
- SUPABASE_SERVICE_ROLE_KEY stored as server environment variable
- Public Supabase URL and keys would be exposed in future client-side integrations

## Monitoring & Observability

**Error Tracking:**
- Not detected (errors logged to console in development)

**Logs:**
- Console logging in anthropic-client.ts for retry attempts and errors
- Custom error handler in `src/lib/server/errors.ts` (sanitizedError) for API responses
- No structured logging framework detected

**Debugging:**
- Source maps enabled in tsconfig.json
- SvelteKit $env/dynamic/private allows runtime environment inspection

## CI/CD & Deployment

**Hosting:**
- Dokploy on self-hosted VPS (port 6776)
- Node.js adapter configured in svelte.config.js

**Deployment Process:**
- Build: `npm run build` → Vite bundles + SvelteKit SSR
- Output: `.svelte-kit/build` (server build) + `build/client` (static assets)
- Start: Node.js process runs SvelteKit server
- No CI pipeline detected (manual deployments)

**Environment Setup:**
- Environment variables injected at deploy time
- No .env file checked in (security best practice)

## Environment Configuration

**Required env vars (server-side private):**
```
ANTHROPIC_API_KEY       # Anthropic Claude API key (sk-ant-*)
SUPABASE_URL            # Supabase PostgreSQL connection URL
SUPABASE_SERVICE_ROLE_KEY # Service role key for server queries
```

**Optional env vars (detected by generator):**
```
STRIPE_SECRET_KEY       # For payment integrations in generated projects
STRIPE_PUBLISHABLE_KEY  # For payment integrations in generated projects
STRIPE_WEBHOOK_SECRET   # For payment integrations in generated projects
RESEND_API_KEY          # For email sending in generated projects
OPENAI_API_KEY          # For OpenAI integrations in generated projects
GITHUB_PERSONAL_ACCESS_TOKEN # For GitHub integrations in generated projects
PUBLIC_SUPABASE_URL     # For client-side Supabase (generated projects)
PUBLIC_SUPABASE_ANON_KEY # For client-side Supabase (generated projects)
```

**Secrets location:**
- Server environment variables (not in version control)
- Example file: `.env.example` (generated per project)

## Webhooks & Callbacks

**Incoming:**
- Not detected (ProjectWizard is request-response only)

**Outgoing:**
- Not detected (Anthropic and Supabase are synchronous call-and-response)

## API Error Handling

**Retry Strategy:**
- Automatic retry on:
  - HTTP 429 (rate limit)
  - HTTP 500, 503 (server errors)
  - Network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND)
- Max retries: 3 attempts
- Backoff: exponential (1s, 2s, 4s)
- Timeout: 60 seconds per request (15s for critic, 30s for document extraction)

**Error Response Format:**
```json
{
  "error": "Human-readable error message",
  "details": "Optional technical details (in development)"
}
```

## Third-Party Scripts & Libraries

**Frontend UI:**
- Skeleton UI components via CDN or bundled
- Tailwind CSS via postcss plugin
- No third-party analytics or tracking detected

**Build Dependencies:**
- Vite ecosystem (esbuild, rollup, various Vite plugins)
- PostCSS for CSS processing
- Type definitions (@types/*, TypeScript built-ins)

---

*Integration audit: 2025-03-04*
