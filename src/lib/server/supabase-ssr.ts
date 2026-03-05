import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

/**
 * Maak een per-request Supabase client aan die cookies beheert.
 * Gebruikt de anon key (niet service role) zodat auth sessies werken.
 */
export function createSupabaseServerClient(cookies: Cookies) {
	return createServerClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
		cookies: {
			getAll() {
				return cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});
}
