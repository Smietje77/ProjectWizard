import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';

export function sanitizedError(
	error: unknown,
	publicMessage: string = 'Er is een fout opgetreden'
): Response {
	console.error('API Error:', error);

	if (dev) {
		return json(
			{
				error: publicMessage,
				details: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			},
			{ status: 500 }
		);
	}

	return json({ error: publicMessage }, { status: 500 });
}
