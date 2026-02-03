import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock $env/dynamic/private
vi.mock('$env/dynamic/private', () => ({
	env: { ANTHROPIC_API_KEY: 'test-key' }
}));

const mockCreate = vi.fn();
const mockStream = vi.fn();

// Mock Anthropic SDK met constructor class
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

import { streamWithRetry, createWithRetry } from './anthropic-client';

describe('anthropic-client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('streamWithRetry', () => {
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
			expect(mockStream).toHaveBeenCalledTimes(1);
		});

		it('gooit error bij niet-retryable fout', async () => {
			mockStream.mockRejectedValueOnce(new Error('Invalid API key'));

			await expect(
				streamWithRetry(
					{
						model: 'claude-sonnet-4-5-20250929',
						max_tokens: 100,
						messages: [{ role: 'user' as const, content: 'test' }]
					},
					{ maxRetries: 2, initialDelayMs: 10 }
				)
			).rejects.toThrow('Invalid API key');

			expect(mockStream).toHaveBeenCalledTimes(1);
		});
	});

	describe('createWithRetry', () => {
		it('returned message bij succesvolle create', async () => {
			const mockMessage = { content: [{ type: 'text', text: 'Hello' }] };
			mockCreate.mockResolvedValueOnce(mockMessage);

			const result = await createWithRetry(
				{
					model: 'claude-sonnet-4-5-20250929',
					max_tokens: 100,
					messages: [{ role: 'user' as const, content: 'test' }]
				},
				{ maxRetries: 0 }
			);

			expect(result).toEqual(mockMessage);
			expect(mockCreate).toHaveBeenCalledTimes(1);
		});
	});
});
