import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { chatRequestSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';
import { createWithThinking, createWithRetry, extractTextContent } from '$lib/server/anthropic-client';
import { COORDINATOR_SYSTEM_PROMPT } from '$lib/prompts/coordinator';
import { CRITIC_SYSTEM_PROMPT } from '$lib/prompts/critic';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const validation = validateRequest(chatRequestSchema, body);
	if (!validation.valid) return validation.error;

	const { projectDescription, answers, currentStep, completedCategories, userAnswer, documentContext } =
		validation.data;

	// Critic agent: elke 3 antwoorden een review doen
	let criticContext = '';
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
				const criticJson = JSON.parse(
					(criticText as { text: string }).text.match(/\{[\s\S]*\}/)?.[0] ?? '{}'
				);
				if (criticJson.problemen?.length > 0) {
					criticContext = `\n\nKRITIEK VAN REVIEWER:\n${criticJson.problemen.map((p: { type: string; beschrijving: string; suggestie: string }) => `- [${p.type}] ${p.beschrijving} Suggestie: ${p.suggestie}`).join('\n')}\n\nVerwerk deze kritiek in je volgende vraag als dat relevant is. Voeg een "critic_feedback" veld toe aan je JSON met een korte, vriendelijke opmerking voor de gebruiker.`;
				}
			}
		} catch (e) {
			console.warn('Critic call mislukt, doorgaan zonder:', e);
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

	try {
		const message = await createWithThinking(
			{
				model: 'claude-sonnet-4-5-20250929',
				max_tokens: 8192,
				system: COORDINATOR_SYSTEM_PROMPT,
				messages
			},
			4096,
			{ timeoutMs: 60000 }
		);

		const text = extractTextContent(message);
		if (!text) {
			throw new Error('Geen tekst in response');
		}

		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('Geen JSON gevonden in response');
		}

		const data = JSON.parse(jsonMatch[0]);
		return json(data);
	} catch (error) {
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
