// src/lib/server/gemini-client.ts
// Google Gemini API client — optioneel, voor design skill generatie + image generatie

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

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

/**
 * Genereer een afbeelding via Gemini 2.5 Flash Image (Nano Banana 2).
 * Gebruikt de REST API direct (de @google/generative-ai SDK ondersteunt responseModalities niet).
 * Retourneert null bij fouten — nooit crashen.
 */
export async function generateImageWithGemini(
	prompt: string
): Promise<{ data: Buffer; mimeType: string } | null> {
	const key = env.GEMINI_API_KEY;
	if (!key) return null;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30_000);

		const res = await fetch(
			`${GEMINI_API_BASE}/models/gemini-2.5-flash-preview-image-generation:generateContent?key=${key}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				signal: controller.signal,
				body: JSON.stringify({
					contents: [{ parts: [{ text: prompt }] }],
					generationConfig: {
						responseModalities: ['TEXT', 'IMAGE']
					}
				})
			}
		);
		clearTimeout(timeout);

		if (!res.ok) {
			console.error(`[gemini] Image API ${res.status}: ${await res.text().catch(() => 'no body')}`);
			return null;
		}

		const json = await res.json();
		for (const candidate of json.candidates ?? []) {
			for (const part of candidate.content?.parts ?? []) {
				if (part.inlineData?.data) {
					return {
						data: Buffer.from(part.inlineData.data, 'base64'),
						mimeType: part.inlineData.mimeType ?? 'image/png'
					};
				}
			}
		}
		return null;
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			console.error('[gemini] Image generatie timeout (30s)');
		} else {
			console.error('[gemini] Image generatie fout:', error);
		}
		return null;
	}
}
