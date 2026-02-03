import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type Anthropic from '@anthropic-ai/sdk';
import { chatRequestSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';
import { streamWithRetry } from '$lib/server/anthropic-client';
import { COORDINATOR_SYSTEM_PROMPT } from '$lib/prompts/coordinator';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const validation = validateRequest(chatRequestSchema, body);
	if (!validation.valid) return validation.error;

	const { projectDescription, answers, currentStep, completedCategories, userAnswer } =
		validation.data;

	const messages: Anthropic.MessageParam[] = [
		{
			role: 'user',
			content: `Projectbeschrijving: "${projectDescription}"

Eerder beantwoorde vragen (${answers?.length ?? 0}):
${answers?.map((a, i) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.type === 'skipped' ? '[OVERGESLAGEN]' : a.answer}`).join('\n') || 'Nog geen antwoorden.'}

Reeds afgevinkte categorieën: ${completedCategories?.length ? completedCategories.join(', ') : 'Nog geen'}

Huidige stap: ${currentStep}
${userAnswer ? `Laatste antwoord/actie: ${userAnswer}` : 'Dit is de eerste vraag.'}

Bepaal de volgende vraag. Antwoord ALLEEN in JSON formaat.`
		}
	];

	try {
		const message = await streamWithRetry(
			{
				model: 'claude-sonnet-4-5-20250929',
				max_tokens: 1024,
				system: COORDINATOR_SYSTEM_PROMPT,
				messages
			},
			{ timeoutMs: 30000 }
		);

		const content = message.content[0];
		if (content.type !== 'text') {
			throw new Error('Onverwacht response type');
		}

		const jsonMatch = content.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('Geen JSON gevonden in response');
		}

		const data = JSON.parse(jsonMatch[0]);
		return json(data);
	} catch (error) {
		return sanitizedError(error, 'Fout bij het ophalen van de volgende vraag');
	}
};
