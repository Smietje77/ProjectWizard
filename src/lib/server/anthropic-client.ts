import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';

interface RetryConfig {
	maxRetries: number;
	initialDelayMs: number;
	maxDelayMs: number;
	timeoutMs: number;
}

const DEFAULT_CONFIG: RetryConfig = {
	maxRetries: 3,
	initialDelayMs: 1000,
	maxDelayMs: 10000,
	timeoutMs: 60000
};

function isRetryableError(error: unknown): boolean {
	if (error instanceof Anthropic.APIError) {
		return error.status === 429 || error.status === 500 || error.status === 503;
	}
	if (error instanceof Error) {
		return (
			error.message.includes('ECONNRESET') ||
			error.message.includes('ETIMEDOUT') ||
			error.message.includes('ENOTFOUND')
		);
	}
	return false;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getClient(config: Partial<RetryConfig> = {}): {
	client: Anthropic;
	config: RetryConfig;
} {
	const mergedConfig = { ...DEFAULT_CONFIG, ...config };
	const client = new Anthropic({
		apiKey: env.ANTHROPIC_API_KEY,
		timeout: mergedConfig.timeoutMs
	});
	return { client, config: mergedConfig };
}

export async function streamWithRetry(
	params: Anthropic.MessageCreateParams,
	config: Partial<RetryConfig> = {}
): Promise<Anthropic.Message> {
	const { client, config: retryConfig } = getClient(config);
	let lastError: unknown;

	for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
		try {
			const stream = await client.messages.stream(params);
			return await stream.finalMessage();
		} catch (error) {
			lastError = error;
			if (!isRetryableError(error) || attempt >= retryConfig.maxRetries) {
				throw error;
			}
			const delay = Math.min(
				retryConfig.initialDelayMs * Math.pow(2, attempt),
				retryConfig.maxDelayMs
			);
			console.warn(
				`Anthropic API fout, retry in ${delay}ms (poging ${attempt + 1}/${retryConfig.maxRetries})...`
			);
			await sleep(delay);
		}
	}

	throw lastError;
}

export async function createWithRetry(
	params: Anthropic.MessageCreateParamsNonStreaming,
	config: Partial<RetryConfig> = {}
): Promise<Anthropic.Message> {
	const { client, config: retryConfig } = getClient(config);
	let lastError: unknown;

	for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
		try {
			return await client.messages.create(params);
		} catch (error) {
			lastError = error;
			if (!isRetryableError(error) || attempt >= retryConfig.maxRetries) {
				throw error;
			}
			const delay = Math.min(
				retryConfig.initialDelayMs * Math.pow(2, attempt),
				retryConfig.maxDelayMs
			);
			console.warn(
				`Anthropic API fout, retry in ${delay}ms (poging ${attempt + 1}/${retryConfig.maxRetries})...`
			);
			await sleep(delay);
		}
	}

	throw lastError;
}

export async function createWithThinking(
	params: Omit<Anthropic.MessageCreateParamsNonStreaming, 'thinking'>,
	budgetTokens: number = 4096,
	config: Partial<RetryConfig> = {}
): Promise<Anthropic.Message> {
	const maxTokens = Math.max(params.max_tokens, budgetTokens + 1024);

	// Extended thinking vereist temperature=1 (of unset)
	const { temperature: _removed, ...restParams } = params as Anthropic.MessageCreateParamsNonStreaming & { temperature?: number };

	return createWithRetry(
		{
			...restParams,
			max_tokens: maxTokens,
			thinking: { type: 'enabled', budget_tokens: budgetTokens }
		},
		config
	);
}

// Haal alleen tekst-blocks op uit een Message response (skip thinking blocks)
export function extractTextContent(message: Anthropic.Message): string {
	return message.content
		.filter((block): block is Anthropic.TextBlock => block.type === 'text')
		.map((block) => block.text)
		.join('');
}
