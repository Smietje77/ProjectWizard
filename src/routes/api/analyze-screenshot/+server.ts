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

	// Extraheer base64 data en media type (alleen toegestane types)
	const match = image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
	if (!match) {
		return json({ error: 'Ongeldig afbeeldingsformaat. Toegestaan: JPEG, PNG, WebP, GIF.' }, { status: 400 });
	}

	const [, mediaType, base64Data] = match;

	// Magic bytes validatie: controleer dat de base64 data overeenkomt met het MIME type
	const magicBytesValid = validateMagicBytes(base64Data, mediaType);
	if (!magicBytesValid) {
		return json({ error: 'Bestandsinhoud komt niet overeen met opgegeven MIME type.' }, { status: 400 });
	}

	try {
		const message = await createWithRetry({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 4096,
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
	const lines: string[] = [];

	// Nieuw formaat (FIX 13: ScreenshotAnalysis)
	if ('colors' in data && 'effects' in data) {
		const d = data as {
			colors?: Record<string, string>;
			typography?: { headingFont?: string; bodyFont?: string; headingWeight?: string; bodySize?: string };
			layout?: { navigation?: string; heroType?: string; contentWidth?: string; gridPattern?: string; sectionDividers?: string };
			effects?: { glassmorphism?: boolean; neumorphism?: boolean; gradients?: { used?: boolean; type?: string; description?: string }; shadows?: string; backgroundEffect?: string; glowEffects?: boolean; blurEffects?: boolean };
			imagery?: { placeholders?: { location: string; type: string; suggestedSize: string }[]; iconStyle?: string };
			patterns?: { decorativeElements?: string; whitespace?: string };
			components?: { borderRadius?: string; buttonStyle?: string; cardStyle?: string; animationHints?: string[] };
			mood?: { overall?: string; contrast?: string; density?: string; temperature?: string };
		};

		if (d.colors) {
			const colorEntries = Object.entries(d.colors).filter(([, v]) => v && v !== 'none');
			if (colorEntries.length > 0) {
				lines.push(`Kleuren: ${colorEntries.map(([k, v]) => `${k}: ${v}`).join(', ')}`);
			}
		}
		if (d.typography) {
			const parts = [];
			if (d.typography.headingFont) parts.push(`heading: ${d.typography.headingFont}`);
			if (d.typography.bodyFont) parts.push(`body: ${d.typography.bodyFont}`);
			if (d.typography.headingWeight) parts.push(`weight: ${d.typography.headingWeight}`);
			if (parts.length) lines.push(`Typografie: ${parts.join(', ')}`);
		}
		if (d.layout) {
			const parts = [];
			if (d.layout.navigation) parts.push(`nav: ${d.layout.navigation}`);
			if (d.layout.heroType) parts.push(`hero: ${d.layout.heroType}`);
			if (d.layout.contentWidth) parts.push(`breedte: ${d.layout.contentWidth}`);
			if (d.layout.gridPattern) parts.push(`grid: ${d.layout.gridPattern}`);
			if (parts.length) lines.push(`Layout: ${parts.join(', ')}`);
		}
		if (d.effects) {
			const effects = [];
			if (d.effects.glassmorphism) effects.push('glassmorphism');
			if (d.effects.neumorphism) effects.push('neumorphism');
			if (d.effects.gradients?.used) effects.push(`gradients (${d.effects.gradients.type})`);
			if (d.effects.shadows && d.effects.shadows !== 'none') effects.push(`schaduwen: ${d.effects.shadows}`);
			if (d.effects.glowEffects) effects.push('glow');
			if (d.effects.blurEffects) effects.push('blur');
			if (effects.length) lines.push(`Effecten: ${effects.join(', ')}`);
		}
		if (d.imagery?.placeholders?.length) {
			lines.push(`Afbeeldingen: ${d.imagery.placeholders.length} placeholder(s) gedetecteerd`);
		}
		if (d.components) {
			const parts = [];
			if (d.components.borderRadius) parts.push(`radius: ${d.components.borderRadius}`);
			if (d.components.buttonStyle) parts.push(`buttons: ${d.components.buttonStyle}`);
			if (d.components.cardStyle) parts.push(`cards: ${d.components.cardStyle}`);
			if (parts.length) lines.push(`Componenten: ${parts.join(', ')}`);
			if (d.components.animationHints?.length) {
				lines.push(`Animaties: ${d.components.animationHints.join(', ')}`);
			}
		}
		if (d.mood) {
			const parts = [];
			if (d.mood.overall) parts.push(d.mood.overall);
			if (d.mood.contrast) parts.push(`contrast: ${d.mood.contrast}`);
			if (d.mood.temperature) parts.push(`temperatuur: ${d.mood.temperature}`);
			if (parts.length) lines.push(`Sfeer: ${parts.join(', ')}`);
		}

		return lines.length > 0 ? lines.join('\n') : 'Analyse voltooid (geen opvallende elementen gedetecteerd)';
	}

	// Oud formaat (backward compat)
	const d = data as {
		stijl?: string;
		kleuren?: Record<string, string>;
		typografie?: { headings?: string; body?: string; aanbevolen_fonts?: string[] };
		layout?: { patroon?: string; spacing?: string };
		componenten?: { border_radius?: string; schaduwen?: string; knoppen?: string };
		sfeer?: string;
	};

	if (d.stijl) lines.push(`Stijl: ${d.stijl}`);
	if (d.kleuren) {
		lines.push(`Kleuren: ${Object.entries(d.kleuren).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
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
		lines.push(`Componenten: radius=${d.componenten.border_radius}, schaduwen=${d.componenten.schaduwen}`);
	}
	if (d.sfeer) lines.push(`Sfeer: ${d.sfeer}`);
	return lines.length > 0 ? lines.join('\n') : 'Analyse voltooid';
}

// Magic bytes per MIME type (hex prefixes van de raw bytes)
const MAGIC_BYTES: Record<string, string[]> = {
	'image/jpeg': ['ffd8ff'],
	'image/png': ['89504e47'],
	'image/gif': ['47494638'],
	'image/webp': ['52494646'] // RIFF header; offset 8 = WEBP
};

function validateMagicBytes(base64Data: string, mimeType: string): boolean {
	const expected = MAGIC_BYTES[mimeType];
	if (!expected) return false;

	// Decodeer eerste 12 bytes (genoeg voor alle checks)
	const bytes = Buffer.from(base64Data.slice(0, 16), 'base64');
	const hex = bytes.toString('hex').toLowerCase();

	// Check primaire magic bytes
	const primaryMatch = expected.some((magic) => hex.startsWith(magic));
	if (!primaryMatch) return false;

	// WebP extra check: bytes 8-11 moeten "WEBP" zijn (57454250)
	if (mimeType === 'image/webp' && bytes.length >= 12) {
		const webpSignature = bytes.slice(8, 12).toString('hex').toLowerCase();
		if (webpSignature !== '57454250') return false;
	}

	return true;
}
