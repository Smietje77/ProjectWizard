import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabase } from '$lib/supabase';

// Nieuw project aanmaken
export const POST: RequestHandler = async ({ request }) => {
	const { name, description, answers, current_step } = await request.json();

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
		return json({ error: error.message }, { status: 500 });
	}

	return json(data);
};

// Alle projecten ophalen
export const GET: RequestHandler = async () => {
	const { data, error } = await getSupabase()
		.from('projects')
		.select('id, name, description, current_step, answers, created_at, updated_at')
		.order('updated_at', { ascending: false });

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json(data);
};
