# Codebase Concerns

**Analysis Date:** 2026-03-04

## Tech Debt

**JSON Parsing via Regex Pattern Matching:**
- Issue: Multiple endpoints parse JSON from API responses using loose regex patterns: `text.match(/\{[\s\S]*\})?.[0]` without strict validation
- Files: `src/routes/api/chat/+server.ts` (lines 43, 110), `src/routes/api/analyze-screenshot/+server.ts` (line 59), `src/routes/api/analyze-document/+server.ts` (inferred pattern)
- Impact: If Claude's response format changes slightly (extra whitespace, embedded objects), the regex may capture malformed JSON or partial objects. Silent fallback via `?? '{}'` masks errors.
- Fix approach: Replace regex extraction with dedicated JSON schema validation (Zod). Parse response structure explicitly before extracting JSON. Add structured error logs when parsing fails.

**Loose Type Casting with `as` Without Runtime Validation:**
- Issue: Code uses TypeScript `as` assertions liberally without runtime validation, especially in API endpoints converting raw responses to typed interfaces
- Files: `src/routes/api/chat/+server.ts` (line 38-41: casting criticText), `src/routes/api/analyze-screenshot/+server.ts` (line 36: mediaType casting)
- Impact: If Claude returns unexpected structure (different content block type, missing fields), the cast succeeds at compile time but fails at runtime. Crashes degrade gracefully but data corruption is possible.
- Fix approach: Use Zod runtime validation on all Claude API responses before casting. Create validator schemas for CoordinatorResponse, AnalysisResult, etc.

**Conversation Context Length Management:**
- Issue: `src/routes/api/chat/+server.ts` summarizes older answers when ≥10 responses exist but applies simplistic string concatenation without token counting
- Files: `src/routes/api/chat/+server.ts` (lines 55-71)
- Impact: Summary strategy assumes each answer is small. Long wizard answers (multi-paragraph) can overflow token limits on 60-second timeout (line 102). No visibility into actual token consumption.
- Fix approach: Implement token counter using `js-tiktoken` or Anthropic's token counting API. Monitor conversation size pre-send. Add circuit breaker if approaching limits (return "conversation too long, truncate old answers").

**Document Truncation at 40,000 Characters:**
- Issue: Attached document context is silently truncated at 40,000 characters without warning
- Files: `src/routes/api/chat/+server.ts` (line 74)
- Impact: Large PDFs/documents get silently cut off. User provides detailed 100MB spec, wizard only sees first 40KB. Coordinator generates incomplete questions based on truncated context.
- Fix approach: Add validation schema `extractDocumentSchema` that enforces max size at upload. Return validation error instead of silent truncation. Document the limit to users.

**Critic Agent Error Suppression:**
- Issue: When critic agent fails, error is logged with `console.warn()` but execution continues silently (line 49-50)
- Files: `src/routes/api/chat/+server.ts` (lines 49-50)
- Impact: If Anthropic API is degraded, critic feedback is lost without user awareness. Wizard questions lack quality review. No metric tracking of how often critic fails.
- Fix approach: Add `criticAgentStatus` to response metadata so UI can show "Critic review skipped due to API issue". Log structured error with timestamp for monitoring.

---

## Known Bugs

**categoryDepth vs completedCategories Backward Compatibility Issue:**
- Symptoms: Projects loaded from database with old `completedCategories` schema don't update to new `categoryDepth` granularly. Completion detection via `categoryDepth[cat] === 'voldoende'` may fail.
- Files: `src/lib/stores/wizard.svelte.ts` (lines 206-215: `rebuildCategories` assumes all answers map to 'voldoende')
- Trigger: Resume old project from database that has `completedCategories` but no `categoryDepth`
- Workaround: Migration happens automatically via `rebuildCategories()` but loses depth information (basis/onvoldoende levels)

**is_complete Flag Redundancy and Inconsistency:**
- Symptoms: Completion is determined by two independent conditions (line 139): `response.is_compleet` OR all required categories voldoende. If one fails, the other may contradict it.
- Files: `src/lib/stores/wizard.svelte.ts` (line 139)
- Trigger: Coordinator marks `is_compleet: true` but not all categoryDepth values are 'voldoende'. User sees "Wizard complete" but can still add more answers.
- Workaround: Rely on categoryDepth check, ignore `is_compleet` from API.

**Preview Page SSE Stream Buffer Incomplete Line Handling:**
- Symptoms: If stream ends with partial line (no newline), the last buffered line is discarded
- Files: `src/routes/wizard/preview/+page.svelte` (lines 82-90)
- Trigger: Stream disconnects mid-event-line
- Workaround: Server always sends complete lines with `\n` terminator

---

## Security Considerations

**Base64 Image Validation Insufficient:**
- Risk: Screenshot endpoint validates image format with regex only: `^data:(image\/\w+);base64,(.+)$`. Accepts any `image/*` MIME type and doesn't validate base64 content structure.
- Files: `src/routes/api/analyze-screenshot/+server.ts` (line 17)
- Current mitigation: Anthropic API validates actual image on its side. Client-side size limit via request validation.
- Recommendations: Add MIME type allowlist (only jpeg/png/webp/gif). Decode base64 and check magic bytes (e.g., `ffd8ff` for JPEG). Validate image dimensions server-side before sending to Claude.

**Document File Size Validation Uses Approximation:**
- Risk: Size check estimates base64 decoded size as `(length * 3) / 4` which is approximate. Malformed base64 could bypass check.
- Files: `src/routes/api/extract-document/+server.ts` (lines 17-20)
- Current mitigation: MAX_FILE_SIZE = 10MB limit in place. Anthropic API has its own limits.
- Recommendations: Use actual `Buffer.from(file, 'base64')` and check `.length` after decoding. Validate base64 format strictly before size check.

**Environment Variables Exposed in .env.local Handling:**
- Risk: Sensitive keys (ANTHROPIC_API_KEY, SUPABASE_SECRET) written to `.env.local` via API endpoint for user download
- Files: `src/routes/api/env/+server.ts`, `src/routes/wizard/preview/+page.svelte` (line 181)
- Current mitigation: User must explicitly copy values into input fields. .env files added to ZIP are tagged as `.env.local` (not committed by default).
- Recommendations: Never write real API keys to downloadable files. Instead, generate `.env.example` with comments only. Force users to enter keys into their own .env.local after project download.

**SUPABASE_SERVICE_ROLE_KEY Stored in Codebase:**
- Risk: Service role key used in server-side code `src/lib/supabase.ts` is accessed via `env.SUPABASE_SERVICE_ROLE_KEY` — if leaked, grants full database access
- Files: `src/lib/supabase.ts` (line 8), used in project/answer save operations
- Current mitigation: Environment variable in `.env` file (not committed).
- Recommendations: Implement row-level security (RLS) on Supabase tables so even service role is restricted. Add audit logging for all DB writes. Rotate keys quarterly.

**User Input in Prompts Not Sanitized:**
- Risk: User's project description and answers fed directly into coordinator/generator prompts without escaping
- Files: `src/routes/api/chat/+server.ts` (line 80: embedding `projectDescription` directly), `src/routes/api/generate/+server.ts` (lines 94+)
- Current mitigation: Zod validation ensures answers are strings, not malicious code.
- Recommendations: Sanitize strings: remove/escape newlines that could break prompt injection. Log all prompts with user inputs for audit trail.

---

## Performance Bottlenecks

**Extended Thinking with Large Conversation History:**
- Problem: Coordinator endpoint enables extended thinking (budget_tokens: 4096, max_tokens: 8192) on every request, even with 40+ prior answers. Conversation context grows linearly with wizard length.
- Files: `src/routes/api/chat/+server.ts` (lines 94-102)
- Cause: No caching of coordinator decisions. Each request re-analyzes full conversation history. Extended thinking is computationally expensive.
- Improvement path:
  1. Cache recent coordinator responses (last 5) by hash of answers + project description
  2. Use cheaper models (claude-haiku) for routine follow-ups, extended-thinking only for category transitions
  3. Implement incremental summarization: if history > 15 answers, replace oldest 5 with pre-generated summary bullet points

**Critic Agent Runs Every 3 Answers Unconditionally:**
- Problem: Modulo check (`answers.length % 3 === 0`) triggers critic on every 3rd answer regardless of answer complexity. Wastes API calls on trivial answers.
- Files: `src/routes/api/chat/+server.ts` (line 21)
- Cause: Fixed interval scheduling, no quality-based triggering.
- Improvement path: Only call critic if average answer quality (from previous responses) drops below threshold. Skip critic if last 3 answers are "skipped" type.

**GSD Generator Rebuilds Full Output on Every Generation:**
- Problem: `generateGSDFolder()` rebuilds all PROJECT.md, REQUIREMENTS.md, ROADMAP.md from scratch even if only one field changed
- Files: `src/lib/generators/gsd-generator.ts` (lines 20-31)
- Cause: No incremental generation or caching.
- Improvement path: Use memoization on individual generator functions (e.g., `generateProjectMd` hashes inputs). Generate only changed sections.

**ZIP File Generation No Progress Streaming:**
- Problem: Large projects with many agents/skills can take 5-10 seconds to ZIP. UI shows one "generating zip" message with no intermediate steps.
- Files: `src/lib/generators/zip-bundler.ts` (lines 29-52+)
- Cause: All files accumulated in memory before ZIP creation.
- Improvement path: Stream ZIP generation with progress events. Use JSZip's streaming support if available.

---

## Fragile Areas

**Answer Mapping via Keyword Detection:**
- Files: `src/lib/generators/answer-mapper.ts` (lines 38-50 and throughout)
- Why fragile: Framework/database/auth detection relies on regex and lowercase keyword matching. If user types "Vue 3 Nuxt App" versus "nuxtjs framework", pattern matching may misidentify tech stack.
- Safe modification: Add explicit enum mapping UI in wizard so user selects from predefined options instead of free text. For each category, gather answers and ask user to confirm detected values before GSD generation.
- Test coverage: `src/lib/validation/schemas.test.ts` and `src/lib/generators/answer-mapper.ts` have no unit tests for detection functions. Add parametrized tests for edge cases (typos, partial matches, multi-language).

**CoordinatorResponse Parsing with Repeated JSON.parse:**
- Files: `src/routes/api/chat/+server.ts` (lines 42-43, 115)
- Why fragile: Code calls `JSON.parse()` twice on response text (once for critic, once for main response). If either parse fails, entire endpoint returns 500.
- Safe modification: Wrap each `JSON.parse()` in try-catch with validation. Return parsed object or fallback schema.
- Test coverage: No test cases for malformed JSON responses from Claude. Add integration test that mocks Claude returning non-JSON text.

**WizardStore State Mutations via Spread Operator:**
- Files: `src/lib/stores/wizard.svelte.ts` (lines 108, 127-130, 177)
- Why fragile: Store updates rely on immutable spreads (`...this.answers.slice(...)`). If categoryDepth and answers get out of sync, completion detection breaks silently.
- Safe modification: Add invariant checks after mutations: `if (answers.length > 0) { assert(currentStep === answers.length) }`. Use a dedicated method for all mutations.
- Test coverage: No unit tests for store state transitions. Add vitest suite for `addAnswer()`, `confirmEditAnswer()`, `loadSession()`.

**Svelte Component Cleanup via setTimeout:**
- Files: `src/routes/wizard/preview/+page.svelte` (lines 426, 464), `src/lib/components/SkillReview.svelte` (lines 114, 202)
- Why fragile: `setTimeout()` timers set without cleanup. If component unmounts before timeout fires, function body executes in wrong context.
- Safe modification: Use `$effect.pre()` or `$effect()` to manage cleanup: cancel timers in return function.
- Test coverage: No component tests. Add Vitest + testing-library tests for async state updates and cleanup.

---

## Scaling Limits

**Wizard Conversation History (Answer Count):**
- Current capacity: ~100 answers before performance degrades. Coordinator prompt becomes ~50KB context.
- Limit: At ~150 answers, context approaches Anthropic model limit (200K tokens). Summarization strategy (RECENT_WINDOW=5) may not compress enough.
- Scaling path: Implement persistent conversation state in database, retrieve only last 20 answers + rolling summary. Store full history separately for audit.

**Project Generation Streaming (File Count):**
- Current capacity: ~200 files (agents, skills, templates) before ZIP generation takes >30 seconds.
- Limit: Browser-side ZIP library (JSZip) runs on main thread; large ZIPs freeze UI.
- Scaling path: Move ZIP generation to backend (Node.js has faster zip libraries). Stream response as binary. Compress individual files to reduce total size.

**Supabase Database (Answer Storage):**
- Current capacity: JSONB column stores all answers inline. At ~500 answers, row size approaches PostgreSQL block limits.
- Limit: Updates to large answer arrays become slow (full row rewrite).
- Scaling path: Split into `answers` table with foreign key, or store as separate versioned snapshots. Implement answer cleanup for old sessions.

---

## Dependencies at Risk

**@anthropic-ai/sdk Version Lock:**
- Risk: Pinned to `^0.71.2` but SDK is rapidly evolving. Extended thinking API requirements (temperature unset, budget_tokens) are fragile to version changes.
- Files: `package.json` (line 34), `src/lib/server/anthropic-client.ts` (line 114)
- Impact: Model API changes (new vision formats, thinking budget) could break at runtime.
- Migration plan: Monitor Anthropic changelog. Use `npm audit` regularly. Pin to exact version if stability is critical. Test new SDK versions in staging before prod update.

**Supabase SDK (@supabase/supabase-js):**
- Risk: Self-hosted Supabase on VPS may diverge from npm package. API compatibility not guaranteed across minor versions.
- Files: `package.json` (line 37), `src/lib/supabase.ts`
- Impact: Breaking changes in SDK could cause database connection failures in production.
- Migration plan: Maintain Supabase version parity between VPS and npm package. Use Docker image versions for reproducibility.

**JSZip Library (Complex Dependency Chain):**
- Risk: Transitive dependencies in JSZip may contain security vulnerabilities. Library is maintained but not heavily audited for production use.
- Files: `package.json` (line 38), `src/lib/generators/zip-bundler.ts`
- Impact: Zip file generation could fail or produce corrupted archives. User can't download project.
- Migration plan: Implement zip generation on backend (Node.js `archiver` library, more battle-tested). Remove JSZip dependency.

---

## Missing Critical Features

**No Project Version Control / Rollback:**
- Problem: Once wizard is completed and project generated, no way to "rewind" to earlier state if user realizes mistake. Editing an answer truncates all later answers.
- Blocks: Can't build iterative refinement workflows. Can't save multiple "branches" of project decisions.
- Recommendation: Implement snapshot system: save wizard state after each answer. Allow user to rollback to any prior step. Store snapshots in Supabase.

**No Audit Logging of Generated Code:**
- Problem: GSD files and agent/skill code are generated but not versioned. No way to track who generated what, when, or from which answers.
- Blocks: Can't answer "why was this decision made?" later. Security/compliance audits fail.
- Recommendation: Store generated file content in separate `generated_artifacts` table with timestamp, user_id, answer_hash. Track changes over time.

**No Real-Time Collaboration:**
- Problem: Each user works in isolation. Can't have multiple people refine a project simultaneously.
- Blocks: Team-based project setup workflows impossible.
- Recommendation: Implement operational transformation (OT) or CRDT for concurrent answer edits. Broadcast coordinator questions to all team members, resolve conflicts.

---

## Test Coverage Gaps

**No API Integration Tests for Claude Responses:**
- What's not tested: Chat endpoint response parsing, critic agent JSON extraction, document analysis pipeline
- Files: `src/routes/api/chat/+server.ts`, `src/routes/api/analyze-screenshot/+server.ts`, `src/routes/api/extract-document/+server.ts`
- Risk: Silent failures if Claude's response format changes. Regex parsing may silently return empty JSON.
- Priority: High — these endpoints are critical path. Add vitest suite that mocks Anthropic responses and validates parsing.

**No End-to-End Wizard Flow Tests:**
- What's not tested: Full wizard from project creation through generation. Answer-to-GSD mapping. State transitions.
- Files: All of `src/routes/wizard/`, `src/lib/stores/wizard.svelte.ts`, `src/lib/generators/`
- Risk: Regressions in generator logic affect product without detection. Users download broken projects.
- Priority: High — add Playwright e2e tests that simulate user interactions and verify output files.

**No Unit Tests for Specialist Detection:**
- What's not tested: `detectFramework()`, `detectDatabase()`, `detectAuth()`, keyword matching fallbacks
- Files: `src/lib/generators/answer-mapper.ts` (lines 56-149)
- Risk: Tech stack detection silently misidentifies user choices, generates wrong project templates.
- Priority: Medium — add parametrized vitest tests with edge cases (typos, abbreviations, multiple mentions).

**No Validation Tests for Generated CLAUDE.md/PROMPT.md:**
- What's not tested: Generated template files actually parse as valid markdown. No frontmatter validation.
- Files: `src/lib/generators/templates.ts`, `src/lib/generators/gsd-generator.ts`
- Risk: Generated files have syntax errors, project can't be used in Claude Code.
- Priority: Medium — add tests that parse generated markdown, validate frontmatter YAML, check for broken links.

**No Load Testing for Extended Thinking Endpoint:**
- What's not tested: Performance under high concurrency (10+ concurrent wizard sessions). Token consumption at scale.
- Files: `src/routes/api/chat/+server.ts` (extended thinking flow)
- Risk: Extended thinking with concurrent load exhausts Anthropic token quota rapidly. Cascading failures.
- Priority: Medium — simulate 10 concurrent users with 50 answers each. Monitor token consumption and latency.

---

*Concerns audit: 2026-03-04*
