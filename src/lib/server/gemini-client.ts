// src/lib/server/gemini-client.ts
// Google Gemini API client — optioneel, voor design skill generatie

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';

let client: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI | null {
	const key = env.GEMINI_API_KEY;
	if (!key) return null;
	if (!client) client = new GoogleGenerativeAI(key);
	return client;
}

/**
 * Check of Gemini beschikbaar is (GEMINI_API_KEY is ingesteld).
 * Doet geen API call — checkt alleen de env variable.
 */
export function isGeminiAvailable(): boolean {
	return !!env.GEMINI_API_KEY;
}

/**
 * Genereer content via Gemini. Retourneert null bij fouten (nooit crashen).
 * Gebruikt gemini-2.5-flash — snel en goedkoop voor design tasks.
 */
export async function generateWithGemini(
	prompt: string,
	systemInstruction?: string
): Promise<string | null> {
	const ai = getGeminiClient();
	if (!ai) return null;

	try {
		const model = ai.getGenerativeModel({
			model: 'gemini-2.5-flash',
			...(systemInstruction ? { systemInstruction } : {})
		});
		const result = await model.generateContent(prompt);
		return result.response.text();
	} catch (error) {
		console.error('Gemini generatie fout:', error);
		return null;
	}
}
