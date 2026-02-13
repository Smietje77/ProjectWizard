import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractDocumentSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';
import { createWithRetry } from '$lib/server/anthropic-client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const validation = validateRequest(extractDocumentSchema, body);
	if (!validation.valid) return validation.error;

	const { file, filename, mimeType } = validation.data;

	// Controleer bestandsgrootte (base64 is ~33% groter dan origineel)
	const sizeInBytes = (file.length * 3) / 4;
	if (sizeInBytes > MAX_FILE_SIZE) {
		return json({ error: 'Bestand is te groot (max 10MB)' }, { status: 400 });
	}

	try {
		// Text bestanden: direct decoderen
		if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
			const text = Buffer.from(file, 'base64').toString('utf-8');
			const summary = text.slice(0, 500) + (text.length > 500 ? '...' : '');
			return json({ text, summary });
		}

		// PDF: stuur naar Claude API met document content block
		if (mimeType === 'application/pdf') {
			const message = await createWithRetry(
				{
					model: 'claude-sonnet-4-5-20250929',
					max_tokens: 4096,
					messages: [
						{
							role: 'user',
							content: [
								{
									type: 'document',
									source: {
										type: 'base64',
										media_type: 'application/pdf',
										data: file
									}
								},
								{
									type: 'text',
									text: `Extraheer alle project-relevante tekst uit dit document.
Geef de inhoud gestructureerd terug:
- Projectnaam/titel
- Beschrijving/doel
- Functionele eisen
- Technische specificaties
- Design wensen
- Overige relevante informatie

Antwoord in het Nederlands. Geef alleen de geëxtraheerde inhoud, geen meta-commentaar.
Bestandsnaam: ${filename}`
								}
							]
						}
					]
				},
				{ timeoutMs: 30000 }
			);

			const content = message.content[0];
			if (content.type !== 'text') {
				throw new Error('Onverwacht response type');
			}

			const text = content.text;
			const summary = text.slice(0, 500) + (text.length > 500 ? '...' : '');
			return json({ text, summary });
		}

		return json({ error: 'Niet-ondersteund bestandstype' }, { status: 400 });
	} catch (error) {
		return sanitizedError(error, 'Document verwerking mislukt');
	}
};
