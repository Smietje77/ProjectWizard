import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import {
	chatRequestSchema,
	coordinatorResponseSchema,
	criticResponseSchema
} from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';
import { createWithThinking, createWithRetry, extractTextContent } from '$lib/server/anthropic-client';
import { COORDINATOR_SYSTEM_PROMPT } from '$lib/prompts/coordinator';
import { CRITIC_SYSTEM_PROMPT } from '$lib/prompts/critic';
import { REQUIRED_CATEGORIES } from '$lib/constants';
import {
	estimateConversationTokens,
	TOKEN_WARNING_THRESHOLD,
	TOKEN_ERROR_THRESHOLD
} from '$lib/server/token-counter';
import { sanitizePromptInput, MAX_LENGTHS } from '$lib/server/sanitize';
import { createLogger } from '$lib/server/logger';

/**
 * Normaliseert Claude's JSON response voordat Zod het valideert.
 * Corrigeert veelvoorkomende formaat-afwijkingen:
 * - String booleans ("true"/"false") → echte booleans
 * - Alternatieve vraag_type namen → canonical namen
 * - String nummers → echte nummers
 * - Ontbrekende verplichte velden met fallbacks
 */
function normalizeCoordinatorResponse(raw: Record<string, unknown>): Record<string, unknown> {
	const normalized = { ...raw };

	// Null → undefined voor alle optionele velden
	// Zod .optional() accepteert undefined maar NIET null
	const optionalFields = ['opties', 'max_selecties', 'categorie', 'antwoord_kwaliteit',
		'kwaliteit_feedback', 'categorie_diepte', 'critic_feedback'];
	for (const field of optionalFields) {
		if (normalized[field] === null) {
			delete normalized[field];
		}
	}

	// Boolean coercion: "true"/"false" strings → boolean
	if (typeof normalized.is_compleet === 'string') {
		normalized.is_compleet = normalized.is_compleet === 'true';
	}

	// vraag_type normalisatie — Claude gebruikt soms Engelse of alternatieve namen
	if (typeof normalized.vraag_type === 'string') {
		const vt = normalized.vraag_type.toLowerCase().replace(/[\s-]/g, '_');
		if (vt.includes('free') || vt.includes('tekst') || vt.includes('text') || vt === 'open') {
			normalized.vraag_type = 'vrije_tekst';
		} else if (vt.includes('choice') || vt.includes('multiple') || vt.includes('keuze')) {
			normalized.vraag_type = 'multiple_choice';
		}
	}

	// Number coercion: string nummers → echte nummers
	if (typeof normalized.antwoord_kwaliteit === 'string') {
		const n = Number(normalized.antwoord_kwaliteit);
		normalized.antwoord_kwaliteit = isNaN(n) ? null : n;
	}
	if (typeof normalized.max_selecties === 'string') {
		const n = Number(normalized.max_selecties);
		normalized.max_selecties = isNaN(n) ? undefined : n;
	}

	// Fallback voor ontbrekende verplichte velden
	if (!normalized.advies_reden && normalized.advies) {
		normalized.advies_reden = String(normalized.advies);
	}
	if (!normalized.advies && normalized.advies_reden) {
		normalized.advies = String(normalized.advies_reden);
	}

	return normalized;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const log = createLogger(locals.requestId);
	const startTime = Date.now();

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Ongeldig JSON in request body.' }, { status: 400 });
	}
	const validation = validateRequest(chatRequestSchema, body);
	if (!validation.valid) return validation.error;

	const { answers, currentStep, completedCategories, documentContext: rawDocContext } =
		validation.data;

	// Input sanitization: bescherm tegen prompt injection
	const descSanitized = sanitizePromptInput(validation.data.projectDescription, MAX_LENGTHS.projectDescription);
	const answerSanitized = sanitizePromptInput(validation.data.userAnswer ?? '', MAX_LENGTHS.answer);
	const docSanitized = sanitizePromptInput(rawDocContext ?? '', MAX_LENGTHS.documentContext);

	if (descSanitized.wasModified || answerSanitized.wasModified || docSanitized.wasModified) {
		log.warn('Input sanitization actief — mogelijke injection poging', {
			descModified: descSanitized.wasModified,
			answerModified: answerSanitized.wasModified,
			docModified: docSanitized.wasModified
		});
	}

	const projectDescription = descSanitized.text;
	const userAnswer = answerSanitized.text || undefined;
	const documentContext = docSanitized.text || undefined;

	// Document truncatie warning
	let warning: string | undefined;
	if (rawDocContext && rawDocContext.length > 40000) {
		warning = `Je document is ingekort van ${rawDocContext.length.toLocaleString('nl-NL')} naar 40.000 tekens. Sommige details kunnen ontbreken.`;
		log.info('Document truncatie', { originalLength: rawDocContext.length });
	}

	// Critic agent: elke 3 antwoorden een review doen
	let criticContext = '';
	let criticStatus: 'success' | 'skipped' | 'not_applicable' = 'not_applicable';

	if (answers && answers.length > 0 && answers.length % 3 === 0) {
		try {
			const criticMessage = await createWithRetry(
				{
					model: 'claude-sonnet-4-5-20250929',
					max_tokens: 1024,
					system: CRITIC_SYSTEM_PROMPT,
					messages: [
						{
							role: 'user',
							content: `Review deze wizard antwoorden:\n${answers.map((a: { specialist: string; question: string; answer: string }, i: number) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.answer}`).join('\n')}`
						}
					]
				},
				{ timeoutMs: 15000 }
			);

			const criticText = criticMessage.content.find(
				(b: { type: string }) => b.type === 'text'
			);
			if (criticText && 'text' in criticText) {
				const rawMatch = (criticText as { text: string }).text.match(/\{[\s\S]*\}/);
				if (!rawMatch) throw new Error('Geen JSON in critic response');
				const criticJson = criticResponseSchema.parse(JSON.parse(rawMatch[0]));
				criticStatus = 'success';
				if (criticJson.problemen.length > 0) {
					criticContext = `\n\nKRITIEK VAN REVIEWER:\n${criticJson.problemen.map((p) => `- [${p.type}] ${p.beschrijving} Suggestie: ${p.suggestie}`).join('\n')}\n\nVerwerk deze kritiek in je volgende vraag als dat relevant is. Voeg een "critic_feedback" veld toe aan je JSON met een korte, vriendelijke opmerking voor de gebruiker.`;
				}
				log.info('Critic review voltooid', { problemen: criticJson.problemen.length });
			}
		} catch (e) {
			criticStatus = 'skipped';
			log.warn('Critic call mislukt, doorgaan zonder', { error: e instanceof Error ? e.message : String(e) });
		}
	}

	// Conversation summary: bij 10+ antwoorden, vat de oudste samen
	const SUMMARY_THRESHOLD = 10;
	const RECENT_WINDOW = 5;
	let answersContext: string;

	if (answers && answers.length >= SUMMARY_THRESHOLD) {
		const olderAnswers = answers.slice(0, -RECENT_WINDOW);
		const recentAnswers = answers.slice(-RECENT_WINDOW);

		const summary = olderAnswers
			.filter((a: { type: string }) => a.type !== 'skipped')
			.map((a: { specialist: string; question: string; answer: string }) => `[${a.specialist}] ${a.answer}`)
			.join('; ');

		answersContext = `Samenvatting eerdere antwoorden (${olderAnswers.length}): ${summary}\n\nRecente antwoorden (${recentAnswers.length}):\n${recentAnswers.map((a: { specialist: string; question: string; answer: string; type: string }, i: number) => `${olderAnswers.length + i + 1}. [${a.specialist}] ${a.question} → ${a.type === 'skipped' ? '[OVERGESLAGEN]' : a.answer}`).join('\n')}`;
	} else {
		answersContext = `Eerder beantwoorde vragen (${answers?.length ?? 0}):\n${answers?.map((a: { specialist: string; question: string; answer: string; type: string }, i: number) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.type === 'skipped' ? '[OVERGESLAGEN]' : a.answer}`).join('\n') || 'Nog geen antwoorden.'}`;
	}

	const documentSection = documentContext
		? `\n\nBijgevoegd document:\n"""\n${documentContext.slice(0, 40000)}\n"""`
		: '';

	const messages: Anthropic.MessageParam[] = [
		{
			role: 'user',
			content: `Projectbeschrijving: "${projectDescription}"${documentSection}

${answersContext}

Reeds afgevinkte categorieën: ${completedCategories?.length ? completedCategories.join(', ') : 'Nog geen'}

Huidige stap: ${currentStep}
${userAnswer ? `Laatste antwoord/actie: ${userAnswer}` : 'Dit is de eerste vraag.'}${criticContext}

Bepaal de volgende vraag.`
		}
	];

	// Token counting: circuit breaker vóór API call
	const estimatedTokens = estimateConversationTokens(
		COORDINATOR_SYSTEM_PROMPT,
		answersContext,
		projectDescription,
		documentContext
	);

	if (estimatedTokens > TOKEN_ERROR_THRESHOLD) {
		log.warn('Token limiet overschreden', { estimatedTokens });
		return json(
			{
				error: 'Conversatie te lang. Probeer antwoorden korter te houden of begin een nieuwe sessie.',
				tokenUsage: estimatedTokens
			},
			{ status: 413 }
		);
	}

	if (estimatedTokens > TOKEN_WARNING_THRESHOLD) {
		log.warn('Token warning', { estimatedTokens, threshold: TOKEN_ERROR_THRESHOLD });
	}

	try {
		// Dynamisch bepalen of extended thinking nodig is
		const needsThinking =
			currentStep === 0 || // eerste vraag: volledige analyse nodig
			(answers && answers.length % 5 === 0) || // elke 5e vraag (categorie-transitie)
			(userAnswer && userAnswer.startsWith('[VRAAG]')) || // follow-up vraag van gebruiker
			(completedCategories && completedCategories.length >= REQUIRED_CATEGORIES.length - 2); // bijna klaar

		const message = needsThinking
			? await createWithThinking(
					{
						model: 'claude-sonnet-4-5-20250929',
						max_tokens: 8192,
						system: COORDINATOR_SYSTEM_PROMPT,
						messages
					},
					4096,
					{ timeoutMs: 60000 }
				)
			: await createWithRetry(
					{
						model: 'claude-sonnet-4-5-20250929',
						max_tokens: 4096,
						system: COORDINATOR_SYSTEM_PROMPT,
						messages
					},
					{ timeoutMs: 30000 }
				);

		const text = extractTextContent(message);
		if (!text) {
			throw new Error('Geen tekst in response');
		}

		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('Geen JSON gevonden in response');
		}

		const parsed = JSON.parse(jsonMatch[0]);
		const normalized = normalizeCoordinatorResponse(parsed);
		const result = coordinatorResponseSchema.safeParse(normalized);
		if (!result.success) {
			log.error('Coordinator response validatie mislukt', undefined, {
				issues: result.error.issues,
				rawKeys: Object.keys(parsed),
				normalizedSample: JSON.stringify(normalized).slice(0, 500)
			});
			return json(
				{
					error: 'Ongeldige coordinator response',
					details: result.error.issues.map((i) => ({
						path: i.path.join('.'),
						message: i.message
					})),
					rawKeys: Object.keys(parsed)
				},
				{ status: 422 }
			);
		}

		const durationMs = Date.now() - startTime;
		log.info('Chat request voltooid', {
			durationMs,
			model: 'claude-sonnet-4-5-20250929',
			thinking: needsThinking,
			tokens: estimatedTokens,
			criticStatus,
			step: currentStep
		});

		return json({
			...result.data,
			tokenUsage: estimatedTokens,
			criticStatus,
			...(warning ? { warning } : {})
		});
	} catch (error) {
		const durationMs = Date.now() - startTime;
		log.error('API fout', error, { durationMs, step: currentStep });

		// Geef duidelijke foutmelding voor bekende Anthropic API fouten
		if (error instanceof Anthropic.APIError) {
			const msg = error.message;
			if (msg.includes('credit balance is too low')) {
				return json({ error: 'Anthropic API credits zijn op. Vul je tegoed aan op console.anthropic.com.' }, { status: 402 });
			}
			if (error.status === 429) {
				return json({ error: 'Te veel verzoeken. Wacht even en probeer opnieuw.' }, { status: 429 });
			}
			if (error.status === 401) {
				return json({ error: 'Ongeldige API key. Controleer je ANTHROPIC_API_KEY.' }, { status: 401 });
			}
		}
		return sanitizedError(error, 'Fout bij het ophalen van de volgende vraag');
	}
};
