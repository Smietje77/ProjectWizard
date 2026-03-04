# Testing Patterns

**Analysis Date:** 2025-03-04

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vitest.config.ts`
- Environment: `node` (no JSDOM for unit tests)

**Assertion Library:**
- Vitest built-in assertions (`expect()`)

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
```

**Configuration:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,       // describe, it, expect available globally
    environment: 'node', // Run in Node.js, not browser
    include: ['src/**/*.test.ts']
  }
});
```

## Test File Organization

**Location:**
- Co-located with source code using `.test.ts` suffix
- Example: `src/lib/validation/validate.ts` → `src/lib/validation/validate.test.ts`

**Naming:**
- Test file: `{source-name}.test.ts`
- Test suite: `describe('functionName', ...)`
- Test case: `it('does X when Y', ...)`

**Structure:**
```
src/lib/
├── validation/
│   ├── validate.ts
│   ├── validate.test.ts      # Tests co-located
│   ├── schemas.ts
│   └── schemas.test.ts       # Tests co-located
├── server/
│   ├── anthropic-client.ts
│   └── anthropic-client.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
// src/lib/validation/validate.test.ts
describe('validateRequest', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive()
  });

  it('returned valid=true met geparsede data voor geldige input', () => {
    const result = validateRequest(testSchema, { name: 'Jan', age: 30 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe('Jan');
      expect(result.data.age).toBe(30);
    }
  });

  it('returned valid=false met error Response voor ongeldige input', () => {
    const result = validateRequest(testSchema, { name: '', age: -1 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeInstanceOf(Response);
    }
  });
});
```

**Patterns:**
- Setup: Inline schema/data definition within `describe()` block (no `beforeEach` needed for simple tests)
- Teardown: Not used; tests are stateless
- Assertion: Type guards with `if (result.valid)` to narrow types before accessing properties
- Description: Write in Dutch describing behavior ("what does it do when..."), not implementation

## Mocking

**Framework:** Vitest `vi` object

**Patterns:**
```typescript
// src/lib/server/anthropic-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
  env: { ANTHROPIC_API_KEY: 'test-key' }
}));

// Mock functions
const mockCreate = vi.fn();
const mockStream = vi.fn();

// Mock SDK class
vi.mock('@anthropic-ai/sdk', () => {
  class MockAPIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  }

  const MockAnthropic = function (this: Record<string, unknown>) {
    this.messages = {
      create: mockCreate,
      stream: mockStream
    };
  } as unknown as { new (): Record<string, unknown>; APIError: typeof MockAPIError };

  MockAnthropic.APIError = MockAPIError;
  return { default: MockAnthropic, APIError: MockAPIError };
});
```

**What to Mock:**
- External API clients (`@anthropic-ai/sdk`, `@supabase/supabase-js`)
- Environment variables and secrets
- Browser APIs when testing in Node environment
- System time with `vi.useFakeTimers()` for timeout testing

**What NOT to Mock:**
- Internal utilities and business logic (test the real implementation)
- Zod validation schemas (test actual validation behavior)
- Error handling functions (test real error responses)

**Clearing Mocks:**
```typescript
beforeEach(() => {
  vi.clearAllMocks();  // Reset all mock call counts and state
});
```

## Fixtures and Factories

**Test Data:**
```typescript
// src/lib/validation/schemas.test.ts
const validChatRequest = {
  projectDescription: 'Een webshop bouwen',
  answers: [
    {
      step: 0,
      specialist: 'requirements',
      question: 'Wat is het doel?',
      answer: 'Online verkopen',
      type: 'free_text' as const,
      categorie: 'project_doel'
    }
  ],
  currentStep: 1,
  completedCategories: ['project_doel'],
  userAnswer: 'Online verkopen'
};
```

**Location:**
- Inline within test file using `describe()` block scope
- No separate fixtures directory
- Reusable test data defined once and reused across multiple test cases

**Pattern:**
- Create objects directly with literal values
- Use `as const` for discriminated union types to preserve literal types
- No factory functions or builder patterns currently used

## Coverage

**Requirements:** Not enforced (no threshold configured)

**View Coverage:**
```bash
npm run test:coverage
```

**Current Coverage:** Minimal coverage of core logic
- `src/lib/validation/` - covered (schema and validation functions)
- `src/lib/server/anthropic-client.ts` - partial coverage (retry logic tested, thinking tested)
- API routes - not tested
- Svelte components - not tested
- Stores - not tested

## Test Types

**Unit Tests:**
- Scope: Individual functions and modules in isolation
- Approach: Test pure functions with known inputs and outputs
- Examples: Zod schema validation, utility functions, retry logic
- Location: `src/lib/validation/validate.test.ts`, `src/lib/server/anthropic-client.test.ts`

**Integration Tests:**
- Not present in codebase
- Would test API endpoints with mocked Anthropic SDK
- Future opportunity: test full `/api/chat` request → coordinator response flow

**E2E Tests:**
- Not configured
- Would require Playwright or Cypress
- Future opportunity: test full wizard flow from start to project generation

## Common Patterns

**Async Testing:**
```typescript
// Test async functions with async/await
it('returned message bij succesvolle stream', async () => {
  const mockMessage = { content: [{ type: 'text', text: 'Hello' }] };
  mockStream.mockResolvedValueOnce({
    finalMessage: () => Promise.resolve(mockMessage)
  });

  const result = await streamWithRetry(
    {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      messages: [{ role: 'user' as const, content: 'test' }]
    },
    { maxRetries: 0 }
  );

  expect(result).toEqual(mockMessage);
});
```

**Error Testing:**
```typescript
// Test error cases with rejection
it('gooit error bij niet-retryable fout', async () => {
  mockStream.mockRejectedValueOnce(new Error('Invalid API key'));

  await expect(
    streamWithRetry({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      messages: [{ role: 'user' as const, content: 'test' }]
    })
  ).rejects.toThrow('Invalid API key');

  // Verify mock was called exactly once (no retries on non-retryable error)
  expect(mockStream).toHaveBeenCalledTimes(1);
});
```

**Mock Assertion:**
```typescript
// Verify mock was called correct number of times
expect(mockCreate).toHaveBeenCalledTimes(1);

// Verify mock was NOT called
expect(mockStream).not.toHaveBeenCalled();

// Verify mock was called with specific arguments
expect(mockCreate).toHaveBeenCalledWith({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 100,
  // ...
});
```

**Type Safety in Tests:**
```typescript
// Use type assertions to help TypeScript understand discriminated unions
const result = validateRequest(testSchema, validData);
if (result.valid) {
  expect(result.data.name).toBe('Jan');  // Now result.data is typed
} else {
  expect(result.error).toBeInstanceOf(Response);  // Now result.error is typed
}
```

## Test Descriptions (Dutch Comments)

**Convention:** Test descriptions use Dutch to match business context

**Examples:**
- `'returned valid=true met geparsede data voor geldige input'` - "returned valid=true with parsed data for valid input"
- `'gooit error bij niet-retryable fout'` - "throws error for non-retryable error"
- `'accepteert geldige input'` - "accepts valid input"

## Gaps and Future Improvements

**Not Tested:**
- API route handlers (`src/routes/api/`)
- Svelte components and lifecycle
- WizardStore state management
- Integration with Supabase
- Extended thinking API flow
- Critic agent decision flow

**Recommendations:**
- Add integration tests for `/api/chat` endpoint
- Add component tests for wizard UI (QuestionCard, AnswerInput)
- Add E2E tests for complete wizard flow
- Add tests for edge cases in GSD generation

---

*Testing analysis: 2025-03-04*
