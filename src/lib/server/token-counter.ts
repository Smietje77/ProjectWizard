// Token counting voor conversatie-lengte bewaking
// Gebruikt js-tiktoken met cl100k_base encoding (Claude-compatible)

import { encodingForModel } from 'js-tiktoken';

let _encoder: ReturnType<typeof encodingForModel> | null = null;

function getEncoder() {
	if (!_encoder) {
		try {
			_encoder = encodingForModel('gpt-4o');
		} catch {
			return null;
		}
	}
	return _encoder;
}

/**
 * Tel het aantal tokens in een tekst.
 */
export function countTokens(text: string): number {
	if (!text) return 0;
	const enc = getEncoder();
	if (!enc) return Math.ceil(text.length / 4); // rough fallback
	return enc.encode(text).length;
}

/**
 * Schat het totale tokenverbruik van een conversatie.
 * Telt systeem-prompt, antwoorden-context, en user message bij elkaar op.
 */
export function estimateConversationTokens(
	systemPrompt: string,
	answersContext: string,
	projectDescription: string,
	documentContext?: string
): number {
	let total = countTokens(systemPrompt);
	total += countTokens(answersContext);
	total += countTokens(projectDescription);
	if (documentContext) {
		total += countTokens(documentContext);
	}
	// Overhead voor message formatting (~100 tokens)
	total += 100;
	return total;
}

// Limieten
export const TOKEN_WARNING_THRESHOLD = 100_000;
export const TOKEN_ERROR_THRESHOLD = 150_000;
