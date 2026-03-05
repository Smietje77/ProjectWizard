import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabase } from '$lib/supabase';
import { createProjectSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';

// Nieuw project aanmaken
export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const validation = validateRequest(createProjectSchema, body);
	if (!validation.valid) return validation.error;

	const { name, description, answers, current_step } = validation.data;

	const { data, error } = await getSupabase()
		.from('projects')
		.insert({
			name,
			description,
			answers: answers ?? [],
			current_step: current_step ?? 0,
			user_id: locals.user?.id
		})
		.select()
		.single();

	if (error) {
		return sanitizedError(error, 'Fout bij aanmaken van project');
	}

	return json(data);
};

// Alle projecten ophalen (gefilterd op ingelogde gebruiker)
export const GET: RequestHandler = async ({ locals }) => {
	let query = getSupabase()
		.from('projects')
		.select('id, name, description, current_step, answers, category_depth, is_complete, generated_output, created_at, updated_at')
		.order('updated_at', { ascending: false });

	// Filter op user_id als er een ingelogde gebruiker is
	if (locals.user) {
		query = query.eq('user_id', locals.user.id);
	}

	const { data, error } = await query;

	if (error) {
		return sanitizedError(error, 'Fout bij ophalen van projecten');
	}

	// Strip generated_output (kan groot zijn) — niet nodig voor dashboard
	const projects = data.map(({ generated_output: _omit, ...p }) => p);

	return json(projects);
};
