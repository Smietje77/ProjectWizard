import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabase } from '$lib/supabase';
import { updateProjectSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';

// Enkel project ophalen (eigenaar-check via user_id)
export const GET: RequestHandler = async ({ params, locals }) => {
	let query = getSupabase()
		.from('projects')
		.select('*')
		.eq('id', params.id);

	if (locals.user) {
		query = query.eq('user_id', locals.user.id);
	}

	const { data, error } = await query.single();

	if (error) {
		return sanitizedError(error, 'Project niet gevonden');
	}

	return json(data);
};

// Project bijwerken (opslaan tussentijds, eigenaar-check)
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const body = await request.json();
	const validation = validateRequest(updateProjectSchema, body);
	if (!validation.valid) return validation.error;

	let query = getSupabase()
		.from('projects')
		.update(validation.data)
		.eq('id', params.id);

	if (locals.user) {
		query = query.eq('user_id', locals.user.id);
	}

	const { data, error } = await query.select().single();

	if (error) {
		return sanitizedError(error, 'Fout bij bijwerken van project');
	}

	return json(data);
};

// Project verwijderen (eigenaar-check)
export const DELETE: RequestHandler = async ({ params, locals }) => {
	let query = getSupabase().from('projects').delete().eq('id', params.id);

	if (locals.user) {
		query = query.eq('user_id', locals.user.id);
	}

	const { error } = await query;

	if (error) {
		return sanitizedError(error, 'Fout bij verwijderen van project');
	}

	return json({ success: true });
};
