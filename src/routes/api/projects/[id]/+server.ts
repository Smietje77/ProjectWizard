import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabase } from '$lib/supabase';
import { updateProjectSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';

// Enkel project ophalen
export const GET: RequestHandler = async ({ params }) => {
	const { data, error } = await getSupabase()
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.single();

	if (error) {
		return sanitizedError(error, 'Project niet gevonden');
	}

	return json(data);
};

// Project bijwerken (opslaan tussentijds)
export const PATCH: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const validation = validateRequest(updateProjectSchema, body);
	if (!validation.valid) return validation.error;

	const { data, error } = await getSupabase()
		.from('projects')
		.update(validation.data)
		.eq('id', params.id)
		.select()
		.single();

	if (error) {
		return sanitizedError(error, 'Fout bij bijwerken van project');
	}

	return json(data);
};

// Project verwijderen
export const DELETE: RequestHandler = async ({ params }) => {
	const { error } = await getSupabase().from('projects').delete().eq('id', params.id);

	if (error) {
		return sanitizedError(error, 'Fout bij verwijderen van project');
	}

	return json({ success: true });
};
