# Coding Conventions

**Analysis Date:** 2025-03-04

## Naming Patterns

**Files:**
- TypeScript/API routes: `kebab-case` (e.g., `anthropic-client.ts`, `validate.ts`)
- Svelte components: `PascalCase` (e.g., `QuestionCard.svelte`, `WizardShell.svelte`)
- Prompts: descriptive lowercase (e.g., `coordinator.ts`, `critic.ts`)
- Stores: Svelte file suffix (e.g., `wizard.svelte.ts`)
- Test files: match source name with `.test.ts` suffix (e.g., `validate.test.ts`, `anthropic-client.test.ts`)

**Functions:**
- camelCase for regular functions: `fetchNextQuestion()`, `createWithRetry()`, `sanitizedError()`
- Private functions: prefixed with `_` or declared as `private` in classes
- Component methods: camelCase: `startSession()`, `addAnswer()`, `toggleHistory()`

**Variables:**
- camelCase for variables and properties: `projectId`, `wizardStore`, `categoryDepth`
- Constants: SCREAMING_SNAKE_CASE: `REQUIRED_CATEGORIES`, `COORDINATOR_SYSTEM_PROMPT`, `SUMMARY_THRESHOLD`
- Type aliases and enums: PascalCase: `CoordinatorResponse`, `Locale`, `ValidationResult<T>`
- State runes in Svelte: `$state`, `$derived`, `$effect` (runes 5 syntax)

**Types:**
- Interfaces: PascalCase: `Props`, `RetryConfig`, `CoordinatorResponse`, `ValidationResult<T>`
- Zod schemas: descriptive camelCase: `chatRequestSchema`, `wizardAnswerSchema`, `generateRequestSchema`
- Generic types: Single uppercase letter or descriptive: `T`, `ValidationSuccess<T>`, `ValidationFailure`

## Code Style

**Formatting:**
- Prettier (no .prettierrc found, using defaults)
- Indentation: tabs (as per SvelteKit convention)
- Line length: no hard limit enforced but keep readable
- Semicolons: required at statement ends

**Linting:**
- ESLint 9 (config not detected in project root)
- TypeScript strict mode enabled (`src/tsconfig.json`)
- `checkJs: true` for JavaScript files in `src/`
- Type safety enforced: no `any` without justification

**Comments and Naming:**
- Dutch comments for business logic and context
- English variable/function names and code structure
- Example from `src/lib/stores/wizard.svelte.ts`: Comments in Dutch explaining category tracking, function names in English

## Import Organization

**Order:**
1. External framework imports: `@sveltejs/kit`, `@anthropic-ai/sdk`, `zod`
2. Aliased imports: `$lib/...`, `$app/...`, `$env/...`
3. Type imports: `import type { ... }`
4. Relative imports: `./...` (rare, prefer $lib)

**Examples from codebase:**
```typescript
// src/routes/api/chat/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { chatRequestSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';
```

**Path Aliases:**
- `$lib`: `src/lib` - all shared logic, components, stores, utilities
- `$app`: SvelteKit app context (navigation, environment)
- `$env/dynamic/private`: Private environment variables on server-side
- No other aliases used in codebase

## Error Handling

**Patterns:**
- Use discriminated union pattern for validation results: `{ valid: true; data: T } | { valid: false; error: Response }`
- Return `Response` objects from validation/error handlers for API consistency
- Use `try-catch` in async flows with `finally` for cleanup
- Wrap external API calls in try-catch and return sanitized errors to client

**Error Response Format:**
```typescript
// Development: includes stack trace
{ error: string, details: string, stack: string }

// Production: sanitized
{ error: string }

// Validation errors: includes field paths
{ error: 'Validatiefout', details: [{ path: string, message: string }] }
```

**HTTP Status Codes:**
- 400: Validation failure (`validateRequest()`)
- 500: Server error (`sanitizedError()`)
- 200: Success with JSON response

**Retryable Errors:**
- 429 (Rate Limit)
- 500, 503 (Server Errors)
- Connection errors: `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`
- Non-retryable: 401, 403, invalid API key

See `src/lib/server/anthropic-client.ts` for retry logic pattern.

## Logging

**Framework:** Console only (`console.log`, `console.warn`, `console.error`)

**Patterns:**
- Warning level for retries: `console.warn('Anthropic API fout, retry in ${delay}ms...')`
- Error level for failures: `console.error('API Error:', error)`
- Info level for operational events: `console.log()` (not used extensively)
- Avoid logging in tests unless debugging

**Example from `anthropic-client.ts`:**
```typescript
console.warn(
  `Anthropic API fout, retry in ${delay}ms (poging ${attempt + 1}/${retryConfig.maxRetries})...`
);
console.error('API Error:', error);
```

## Comments

**When to Comment:**
- Complex algorithm explanation (e.g., exponential backoff logic)
- Non-obvious business logic decisions (e.g., why critique happens every 3 answers)
- Dutch comments for business context, English for technical implementation
- Avoid obvious comments ("this increments x")

**JSDoc/TSDoc:**
- JSDoc used for exported functions with parameters and return types
- Example from `gsd-generator.ts`:
  ```typescript
  /**
   * Hoofdfunctie: genereert alle GSD bestanden uit wizard antwoorden
   */
  export function generateGSDFolder(answers: WizardAnswers): GSDOutput {
    // ...
  }
  ```
- TSDoc not extensively used; types are self-documenting via TypeScript

**Block Comments:**
- Use `// ============================================` for section dividers in long files
- Example from `gsd-generator.ts`:
  ```typescript
  // ============================================
  // PROJECT.md Generator
  // ============================================
  ```

## Function Design

**Size:** Keep functions under 50 lines where possible; break into smaller helpers

**Parameters:**
- Use destructured object parameters for functions with multiple args > 2
- Example from `svelte` component props:
  ```typescript
  interface Props {
    question: CoordinatorResponse;
    hideAdvice?: boolean;
  }
  let { question, hideAdvice = false }: Props = $props();
  ```

**Return Values:**
- Use explicit return types in signatures
- Return early to reduce nesting
- Use discriminated unions for result types: `{ valid: true; data: T } | { valid: false; error: Response }`

**Svelte 5 Runes:**
- `$state` for reactive properties: `projectId = $state<string | null>(null)`
- `$derived` for computed properties: `get progress() { return Math.round(...) }`
- `$effect` for side effects: `$effect(() => { if (condition) { ... } })`
- No need for explicit reactivity with imports; runes are built-in

**Example from `wizard.svelte.ts`:**
```typescript
// Class-based store with Svelte 5 runes
class WizardStore {
  projectId = $state<string | null>(null);
  isComplete = $state(false);
  answers = $state<WizardAnswer[]>([]);

  // Computed property
  get completedCategories(): Set<RequiredCategory> {
    return new Set(REQUIRED_CATEGORIES.filter(c => this.categoryDepth[c] === 'voldoende'));
  }
}
```

## Module Design

**Exports:**
- Export named exports from utility modules, not default exports
- Re-export with `export { ... }` from barrel files
- Example: `src/lib/index.ts` is minimal; encourage direct imports from specific modules

**Barrel Files:**
- Not extensively used; components and utilities import directly
- Reduces circular dependency risks

**Server-Side vs Client-Side:**
- Files in `src/routes/api/` are server-only
- Use `import { env } from '$env/dynamic/private'` for secrets (server-side)
- Components use `import { env } from '$env/dynamic/public'` or context injection
- Types shared between server and client via `$lib/types`

## Validation

**Framework:** Zod (`zod` v4.3.6)

**Pattern:**
- Define schema with clear constraints: `z.string().min(1).max(50000)`
- Use `safeParse()` for error handling without exceptions
- Validate at API entry points immediately in request handler
- Example from `schemas.ts`:
  ```typescript
  export const chatRequestSchema = z.object({
    projectDescription: z.string().min(1).max(50000),
    answers: z.array(wizardAnswerSchema).optional(),
    currentStep: z.number().int().min(0).max(100)
  });
  ```

## Special Patterns

**Extended Thinking (Anthropic API):**
- Function `createWithThinking()` requires `max_tokens >= budget_tokens + 1024`
- Must NOT include `temperature` parameter (unset it before calling)
- Used for coordinator agent only (critical decision logic)

**Critic Agent Pattern:**
- Called every 3 answers (modulo check: `answers.length % 3 === 0`)
- Uses `createWithRetry()` (no thinking) with 15-second timeout
- Expects JSON response with `problemen` array
- Feedback integrated into context for next coordinator call

**Conversation Summary:**
- When answers >= 10: summarize oldest answers, keep 5 most recent verbatim
- Reduces token usage while maintaining context precision

---

*Convention analysis: 2025-03-04*
