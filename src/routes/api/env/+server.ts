import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'fs/promises';
import { join, resolve, normalize } from 'path';
import { envRequestSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';

const ALLOWED_BASE_PATHS = ['/tmp/projects', process.env.OUTPUT_DIR || ''].filter(Boolean);

function isPathSafe(requestedPath: string): boolean {
	const normalized = normalize(requestedPath);
	const resolved = resolve(normalized);
	return ALLOWED_BASE_PATHS.some((basePath) => {
		const resolvedBase = resolve(basePath);
		return resolved.startsWith(resolvedBase);
	});
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const validation = validateRequest(envRequestSchema, body);
	if (!validation.valid) return validation.error;

	const { outputPath, envVars } = validation.data;

	if (!isPathSafe(outputPath)) {
		return json({ error: 'Ongeldig pad: buiten toegestane directories' }, { status: 403 });
	}

	try {
		const lines = Object.entries(envVars)
			.filter(([, value]) => value.trim().length > 0)
			.map(([key, value]) => `${key}=${value}`);

		if (lines.length === 0) {
			return json({ success: true, skipped: true });
		}

		await mkdir(outputPath, { recursive: true });
		await writeFile(join(outputPath, '.env.local'), lines.join('\n') + '\n', 'utf-8');

		return json({ success: true, file: '.env.local', count: lines.length });
	} catch (error) {
		return sanitizedError(error, 'Fout bij schrijven van omgevingsvariabelen');
	}
};
