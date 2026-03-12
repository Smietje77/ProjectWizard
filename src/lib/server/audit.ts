import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditAction = 'generate' | 'regenerate' | 'edit_answer' | 'complete';

export interface AuditEvent {
	userId?: string;
	projectId?: string;
	action: AuditAction;
	metadata?: Record<string, unknown>;
}

/**
 * Log een audit event naar de audit_log tabel.
 * Fire-and-forget: fouten worden gelogd maar niet gegooid.
 */
export async function logAuditEvent(
	supabase: SupabaseClient,
	event: AuditEvent
): Promise<void> {
	try {
		const { error } = await supabase.from('audit_log').insert({
			user_id: event.userId ?? null,
			project_id: event.projectId ?? null,
			action: event.action,
			metadata: event.metadata ?? null
		});

		if (error) {
			console.error('[audit] Insert fout:', error.message);
		}
	} catch (err) {
		console.error('[audit] Onverwachte fout:', err);
	}
}
