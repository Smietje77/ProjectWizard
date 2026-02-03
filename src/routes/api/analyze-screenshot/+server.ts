import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { analyzeScreenshotSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';
import { createWithRetry } from '$lib/server/anthropic-client';
import { DESIGN_ANALYSIS_PROMPT } from '$lib/prompts/design';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const validation = validateRequest(analyzeScreenshotSchema, body);
	if (!validation.valid) return validation.error;

	const { image } = validation.data;

	// Extraheer base64 data en media type
	const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
	if (!match) {
		return json({ error: 'Ongeldig afbeeldingsformaat' }, { status: 400 });
	}

	const [, mediaType, base64Data] = match;

	try {
		const message = await createWithRetry({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 2048,
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'image',
							source: {
								type: 'base64',
								media_type: mediaType as
									| 'image/jpeg'
									| 'image/png'
									| 'image/webp'
									| 'image/gif',
								data: base64Data
							}
						},
						{
							type: 'text',
							text: DESIGN_ANALYSIS_PROMPT
						}
					]
				}
			]
		});

		const content = message.content[0];
		if (content.type !== 'text') {
			throw new Error('Onverwacht response type');
		}

		// Probeer JSON te parsen voor gestructureerde data
		const jsonMatch = content.text.match(/\{[\s\S]*\}/);
		let analysis = content.text;
		let structured = null;

		if (jsonMatch) {
			try {
				structured = JSON.parse(jsonMatch[0]);
				analysis = formatAnalysis(structured);
			} catch {
				// Gebruik ruwe tekst als JSON parsing faalt
			}
		}

		return json({ analysis, structured });
	} catch (error) {
		return sanitizedError(error, 'Screenshot analyse mislukt');
	}
};

function formatAnalysis(data: Record<string, unknown>): string {
	const d = data as {
		stijl?: string;
		kleuren?: Record<string, string>;
		typografie?: { headings?: string; body?: string; aanbevolen_fonts?: string[] };
		layout?: { patroon?: string; spacing?: string };
		componenten?: { border_radius?: string; schaduwen?: string; knoppen?: string };
		sfeer?: string;
	};

	const lines: string[] = [];
	if (d.stijl) lines.push(`Stijl: ${d.stijl}`);
	if (d.kleuren) {
		lines.push(
			`Kleuren: ${Object.entries(d.kleuren)
				.map(([k, v]) => `${k}: ${v}`)
				.join(', ')}`
		);
	}
	if (d.typografie) {
		lines.push(`Typografie: headings=${d.typografie.headings}, body=${d.typografie.body}`);
		if (d.typografie.aanbevolen_fonts?.length) {
			lines.push(`Fonts: ${d.typografie.aanbevolen_fonts.join(', ')}`);
		}
	}
	if (d.layout) {
		lines.push(`Layout: ${d.layout.patroon}, spacing: ${d.layout.spacing}`);
	}
	if (d.componenten) {
		lines.push(
			`Componenten: radius=${d.componenten.border_radius}, schaduwen=${d.componenten.schaduwen}`
		);
	}
	if (d.sfeer) lines.push(`Sfeer: ${d.sfeer}`);
	return lines.join('\n');
}
