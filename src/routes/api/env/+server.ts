import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const POST: RequestHandler = async ({ request }) => {
	const { outputPath, envVars } = await request.json();

	if (!outputPath || !envVars || typeof envVars !== 'object') {
		return json({ error: 'Missende velden: outputPath, envVars' }, { status: 400 });
	}

	try {
		const lines = Object.entries(envVars as Record<string, string>)
			.filter(([, value]) => value.trim().length > 0)
			.map(([key, value]) => `${key}=${value}`);

		if (lines.length === 0) {
			return json({ success: true, skipped: true });
		}

		await mkdir(outputPath, { recursive: true });
		await writeFile(join(outputPath, '.env.local'), lines.join('\n') + '\n', 'utf-8');

		return json({ success: true, file: '.env.local', count: lines.length });
	} catch (error) {
		return json(
			{ error: `Fout bij schrijven .env.local: ${error instanceof Error ? error.message : 'Onbekende fout'}` },
			{ status: 500 }
		);
	}
};
