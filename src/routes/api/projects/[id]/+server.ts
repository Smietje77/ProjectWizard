import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateProjectSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';
import { logAuditEvent } from '$lib/server/audit';

// Enkel project ophalen (eigenaar-check via user_id)
export const GET: RequestHandler = async ({ params, locals }) => {
	let query = locals.supabase
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.is('deleted_at', null);

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

	let query = locals.supabase
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

	// Audit logging voor wizard completion
	if (validation.data.is_complete === true) {
		logAuditEvent(locals.supabase, {
			userId: locals.user?.id,
			projectId: params.id,
			action: 'complete',
			metadata: {
				answerCount: validation.data.answers?.length ?? null
			}
		});
	}

	// Audit logging voor antwoord bewerking (answers array meegestuurd zonder is_complete)
	if (validation.data.answers && !validation.data.is_complete) {
		logAuditEvent(locals.supabase, {
			userId: locals.user?.id,
			projectId: params.id,
			action: 'edit_answer',
			metadata: {
				answerCount: validation.data.answers.length,
				currentStep: validation.data.current_step ?? null
			}
		});
	}

	return json(data);
};

// Project verwijderen (soft-delete met deleted_at timestamp)
export const DELETE: RequestHandler = async ({ params, locals }) => {
	let query = locals.supabase
		.from('projects')
		.update({ deleted_at: new Date().toISOString() })
		.eq('id', params.id)
		.is('deleted_at', null);

	if (locals.user) {
		query = query.eq('user_id', locals.user.id);
	}

	const { error } = await query;

	if (error) {
		return sanitizedError(error, 'Fout bij verwijderen van project');
	}

	return json({ success: true });
};
