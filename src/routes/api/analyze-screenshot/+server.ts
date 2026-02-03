import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const DESIGN_ANALYSIS_PROMPT = `Analyseer deze screenshot/design afbeelding en extraheer de volgende design elementen.

Antwoord in dit exacte JSON formaat (geen extra tekst):
{
  "stijl": "beschrijving van de algemene design stijl",
  "kleuren": {
    "primair": "#hex",
    "secundair": "#hex",
    "achtergrond": "#hex",
    "tekst": "#hex",
    "accent": "#hex"
  },
  "typografie": {
    "headings": "beschrijving (bijv. bold sans-serif, grote gewichten)",
    "body": "beschrijving (bijv. lichte sans-serif, goede leesbaarheid)",
    "aanbevolen_fonts": ["font1", "font2"]
  },
  "layout": {
    "patroon": "beschrijving (bijv. sidebar + content, grid-based)",
    "spacing": "beschrijving (bijv. veel witruimte, compact, relaxed)"
  },
  "componenten": {
    "border_radius": "beschrijving (bijv. rounded-lg, geen, pill-shaped)",
    "schaduwen": "beschrijving (bijv. subtiele schaduwen, geen, dramatisch)",
    "kaarten": "beschrijving van card-stijl",
    "knoppen": "beschrijving van button-stijl"
  },
  "sfeer": "1-2 zinnen die de algehele sfeer/feel beschrijven",
  "tailwind_hints": ["relevante", "tailwind", "klassen"]
}`;

export const POST: RequestHandler = async ({ request }) => {
	const { image } = await request.json();

	if (!image || !image.startsWith('data:image/')) {
		return json({ error: 'Ongeldige afbeelding' }, { status: 400 });
	}

	// Extraheer base64 data en media type
	const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
	if (!match) {
		return json({ error: 'Ongeldig afbeeldingsformaat' }, { status: 400 });
	}

	const [, mediaType, base64Data] = match;

	try {
		const message = await client.messages.create({
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
		console.error('Screenshot analyse fout:', error);
		return json(
			{
				error: `Analyse mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`
			},
			{ status: 500 }
		);
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
