import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

let _supabase: SupabaseClient;

export function getSupabase() {
	if (!_supabase) {
		_supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
	}
	return _supabase;
}
