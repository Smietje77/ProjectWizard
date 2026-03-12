// Mocks worden geregistreerd VOOR imports — Vitest hoist vi.mock() automatisch naar boven.

// SvelteKit mocks
vi.mock('@sveltejs/kit', () => ({
	json: (data: unknown, init?: ResponseInit) =>
		new Response(JSON.stringify(data), {
			status: init?.status ?? 200,
			headers: { 'Content-Type': 'application/json' }
		})
}));

vi.mock('$app/environment', () => ({
	dev: false
}));

vi.mock('$env/dynamic/private', () => ({
	env: { ANTHROPIC_API_KEY: 'test-key' }
}));

// Prompt-modules — we hebben de inhoud niet nodig voor endpoint-tests
vi.mock('$lib/prompts/coordinator', () => ({
	COORDINATOR_SYSTEM_PROMPT: 'MOCK_COORDINATOR_SYSTEM_PROMPT'
}));

vi.mock('$lib/prompts/critic', () => ({
	CRITIC_SYSTEM_PROMPT: 'MOCK_CRITIC_SYSTEM_PROMPT'
}));

// Anthropic SDK — minimale mock zodat instanceof Anthropic.APIError werkt
vi.mock('@anthropic-ai/sdk', () => {
	class MockAPIError extends Error {
		status: number;
		constructor(status: number, message: string) {
			super(message);
			this.status = status;
			this.name = 'APIError';
		}
	}

	const MockAnthropic = function () {} as unknown as {
		new (): unknown;
		APIError: typeof MockAPIError;
	};
	MockAnthropic.APIError = MockAPIError;

	return { default: MockAnthropic, APIError: MockAPIError };
});

// Anthropic-client — de functies die het endpoint aanroept
vi.mock('$lib/server/anthropic-client', () => ({
	createWithThinking: vi.fn(),
	createWithRetry: vi.fn(),
	extractTextContent: vi.fn()
}));

// Token-counter — retourneer een veilige standaardwaarde
vi.mock('$lib/server/token-counter', () => ({
	estimateConversationTokens: vi.fn(() => 5000),
	TOKEN_WARNING_THRESHOLD: 100_000,
	TOKEN_ERROR_THRESHOLD: 150_000
}));

// Logger — stille noop in tests
vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

// Constants
vi.mock('$lib/constants', () => ({
	REQUIRED_CATEGORIES: ['website_type', 'project_doel', 'doelgroep', 'kernfunctionaliteiten', 'frontend_keuze', 'database_keuze', 'auth_keuze', 'deployment_keuze', 'design_stijl']
}));

// --- Imports na de mocks ---
import Anthropic from '@anthropic-ai/sdk';
import { POST } from './+server';
import {
	createWithThinking,
	createWithRetry,
	extractTextContent
} from '$lib/server/anthropic-client';
import { estimateConversationTokens } from '$lib/server/token-counter';

// --- Typed mock-helpers ---
const mockCreateWithThinking = vi.mocked(createWithThinking);
const mockCreateWithRetry = vi.mocked(createWithRetry);
const mockExtractTextContent = vi.mocked(extractTextContent);
const mockEstimateTokens = vi.mocked(estimateConversationTokens);

// --- Testdata ---

/** Minimale geldige request body conform chatRequestSchema */
const validBody = {
	projectDescription: 'Een webshop',
	answers: [] as unknown[],
	currentStep: 0,
	completedCategories: [] as string[],
	userAnswer: 'SvelteKit'
};

/** Geldige coordinator JSON die coordinatorResponseSchema doorstaat */
const validCoordinatorJson = {
	volgende_specialist: 'frontend_specialist',
	vraag: 'Welk framework wil je gebruiken?',
	vraag_type: 'multiple_choice' as const,
	opties: ['SvelteKit', 'Next.js', 'Nuxt'],
	advies: 'SvelteKit is een uitstekende keuze voor een moderne webshop.',
	advies_reden: 'SvelteKit biedt SSR, snelle builds en een prettige DX.',
	is_compleet: false
};

/** Maak een minimale RequestEvent-mock — POST gebruikt `request` en `locals` */
function createMockRequest(body: Record<string, unknown>) {
	return {
		request: new Request('http://localhost/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: { requestId: 'test-request-id' }
	} as Parameters<typeof POST>[0];
}

/** Bouw een nep Anthropic.Message rondom de gegeven tekst */
function buildAnthropicMessage(text: string): Anthropic.Message {
	return {
		id: 'msg_test',
		type: 'message',
		role: 'assistant',
		content: [{ type: 'text', text }],
		model: 'claude-sonnet-4-5-20250929',
		stop_reason: 'end_turn',
		stop_sequence: null,
		usage: { input_tokens: 100, output_tokens: 50 }
	} as unknown as Anthropic.Message;
}

// ---------------------------------------------------------------------------

describe('POST /api/chat', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Standaard: tokens ruim onder de drempel
		mockEstimateTokens.mockReturnValue(5000);
	});

	// 1 -----------------------------------------------------------------------
	it('retourneert valide CoordinatorResponse bij succesvolle API call', async () => {
		const responseText = JSON.stringify(validCoordinatorJson);
		const message = buildAnthropicMessage(responseText);

		mockCreateWithThinking.mockResolvedValueOnce(message);
		mockExtractTextContent.mockReturnValueOnce(responseText);

		const response = await POST(createMockRequest(validBody));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.volgende_specialist).toBe('frontend_specialist');
		expect(data.vraag).toBe('Welk framework wil je gebruiken?');
		expect(data.vraag_type).toBe('multiple_choice');
		expect(data.is_compleet).toBe(false);
		expect(data.tokenUsage).toBe(5000);
		expect(mockCreateWithThinking).toHaveBeenCalledTimes(1);
	});

	// 2 -----------------------------------------------------------------------
	it('retourneert 422 bij ongeldige coordinator JSON van Claude', async () => {
		// Ontbreekt verplichte velden: vraag, advies, advies_reden, is_compleet
		const badJson = { volgende_specialist: 'frontend_specialist' };
		const responseText = JSON.stringify(badJson);
		const message = buildAnthropicMessage(responseText);

		mockCreateWithThinking.mockResolvedValueOnce(message);
		mockExtractTextContent.mockReturnValueOnce(responseText);

		const response = await POST(createMockRequest(validBody));
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.error).toBe('Ongeldige coordinator response');
		expect(Array.isArray(data.details)).toBe(true);
		expect(data.details.length).toBeGreaterThan(0);
	});

	// 3 -----------------------------------------------------------------------
	it('retourneert error als Claude geen JSON retourneert', async () => {
		const plainText = 'Hier is mijn antwoord zonder JSON-structuur.';
		const message = buildAnthropicMessage(plainText);

		mockCreateWithThinking.mockResolvedValueOnce(message);
		// extractTextContent geeft tekst terug zonder `{…}` patroon
		mockExtractTextContent.mockReturnValueOnce(plainText);

		const response = await POST(createMockRequest(validBody));

		// De catch-branch van de handler retourneert een 500 sanitizedError
		expect(response.status).toBe(500);
		const data = await response.json();
		expect(data.error).toBeTruthy();
	});

	// 4 -----------------------------------------------------------------------
	it('stuurt 429 door bij Anthropic rate limit', async () => {
		const rateLimitError = new Anthropic.APIError(429, 'Rate limit exceeded');
		mockCreateWithThinking.mockRejectedValueOnce(rateLimitError);

		const response = await POST(createMockRequest(validBody));
		const data = await response.json();

		expect(response.status).toBe(429);
		expect(data.error).toContain('Te veel verzoeken');
	});

	// 5 -----------------------------------------------------------------------
	it('stuurt 401 door bij ongeldige API key', async () => {
		const authError = new Anthropic.APIError(401, 'Unauthorized');
		mockCreateWithThinking.mockRejectedValueOnce(authError);

		const response = await POST(createMockRequest(validBody));
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.error).toContain('API key');
	});

	// 6 -----------------------------------------------------------------------
	it('critic agent faalt zonder crash — endpoint geeft 200 terug', async () => {
		// 3 antwoorden triggert de critic (answers.length % 3 === 0 && length > 0)
		const bodyWithAnswers = {
			...validBody,
			answers: [
				{ step: 0, specialist: 'tech', question: 'Framework?', answer: 'SvelteKit', type: 'multiple_choice' },
				{ step: 1, specialist: 'tech', question: 'Database?', answer: 'Postgres', type: 'multiple_choice' },
				{ step: 2, specialist: 'tech', question: 'Hosting?', answer: 'Vercel', type: 'multiple_choice' }
			]
		};

		// Critic gooit een fout — moet worden ingeslikt
		mockCreateWithRetry.mockRejectedValueOnce(new Error('Critic timed out'));

		// Coordinator slaagt normaal
		const responseText = JSON.stringify(validCoordinatorJson);
		const message = buildAnthropicMessage(responseText);
		mockCreateWithThinking.mockResolvedValueOnce(message);
		mockExtractTextContent.mockReturnValueOnce(responseText);

		const response = await POST(createMockRequest(bodyWithAnswers));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.volgende_specialist).toBe('frontend_specialist');
	});

	// 7 -----------------------------------------------------------------------
	it('critic met ongeldige JSON wordt overgeslagen — endpoint geeft 200 terug', async () => {
		const bodyWithAnswers = {
			...validBody,
			answers: [
				{ step: 0, specialist: 'tech', question: 'Framework?', answer: 'SvelteKit', type: 'multiple_choice' },
				{ step: 1, specialist: 'tech', question: 'Database?', answer: 'Postgres', type: 'multiple_choice' },
				{ step: 2, specialist: 'tech', question: 'Hosting?', answer: 'Vercel', type: 'multiple_choice' }
			]
		};

		// Critic retourneert tekst zonder JSON
		const criticMessage: Anthropic.Message = {
			id: 'msg_critic',
			type: 'message',
			role: 'assistant',
			content: [{ type: 'text', text: 'Geen problemen gevonden.' }],
			model: 'claude-sonnet-4-5-20250929',
			stop_reason: 'end_turn',
			stop_sequence: null,
			usage: { input_tokens: 50, output_tokens: 20 }
		} as unknown as Anthropic.Message;

		mockCreateWithRetry.mockResolvedValueOnce(criticMessage);

		// Coordinator slaagt normaal
		const responseText = JSON.stringify(validCoordinatorJson);
		const coordinatorMessage = buildAnthropicMessage(responseText);
		mockCreateWithThinking.mockResolvedValueOnce(coordinatorMessage);
		mockExtractTextContent.mockReturnValueOnce(responseText);

		const response = await POST(createMockRequest(bodyWithAnswers));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.vraag).toBe('Welk framework wil je gebruiken?');
	});

	// 8 -----------------------------------------------------------------------
	it('retourneert 413 bij te veel tokens', async () => {
		// Boven TOKEN_ERROR_THRESHOLD (150 000)
		mockEstimateTokens.mockReturnValue(160_000);

		const response = await POST(createMockRequest(validBody));
		const data = await response.json();

		expect(response.status).toBe(413);
		expect(data.error).toContain('Conversatie te lang');
		expect(data.tokenUsage).toBe(160_000);
		// createWithThinking mag NIET zijn aangeroepen — circuit breaker actief
		expect(mockCreateWithThinking).not.toHaveBeenCalled();
	});

	// Bonus: ongeldige request body ------------------------------------------
	it('retourneert 400 bij ontbrekend verplicht veld (projectDescription)', async () => {
		const invalidBody = {
			// projectDescription ontbreekt
			answers: [],
			currentStep: 0
		};

		const response = await POST(createMockRequest(invalidBody));
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe('Validatiefout');
	});
});
