import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabase } from '$lib/supabase';
import { createProjectSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';

// Nieuw project aanmaken
export const POST: RequestHandler = async ({ request }) => {
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
			current_step: current_step ?? 0
		})
		.select()
		.single();

	if (error) {
		return sanitizedError(error, 'Fout bij aanmaken van project');
	}

	return json(data);
};

// Alle projecten ophalen
export const GET: RequestHandler = async () => {
	const { data, error } = await getSupabase()
		.from('projects')
		.select('id, name, description, current_step, answers, category_depth, generated_output, created_at, updated_at')
		.order('updated_at', { ascending: false });

	if (error) {
		return sanitizedError(error, 'Fout bij ophalen van projecten');
	}

	// Strip generated_output (kan groot zijn), vervang door is_complete boolean
	const projects = data.map(({ generated_output, ...p }) => ({
		...p,
		is_complete: Array.isArray((generated_output as { files?: unknown[] } | null)?.files) &&
			((generated_output as { files: unknown[] }).files.length > 0)
	}));

	return json(projects);
};
