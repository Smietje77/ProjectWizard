import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

// Enkel project ophalen
export const GET: RequestHandler = async ({ params }) => {
	const { data, error } = await supabase
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.single();

	if (error) {
		return json({ error: error.message }, { status: 404 });
	}

	return json(data);
};

// Project bijwerken (opslaan tussentijds)
export const PATCH: RequestHandler = async ({ params, request }) => {
	const updates = await request.json();

	const { data, error } = await supabase
		.from('projects')
		.update(updates)
		.eq('id', params.id)
		.select()
		.single();

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json(data);
};

// Project verwijderen
export const DELETE: RequestHandler = async ({ params }) => {
	const { error } = await supabase.from('projects').delete().eq('id', params.id);

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ success: true });
};
