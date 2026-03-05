import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSupabaseServerClient } from '$lib/server/supabase-ssr';

// Routes die GEEN authenticatie vereisen
const PUBLIC_ROUTES = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
	// Supabase SSR client aanmaken per request
	event.locals.supabase = createSupabaseServerClient(event.cookies);

	// Gebruiker ophalen (maakt netwerk call naar Supabase Auth)
	const {
		data: { user }
	} = await event.locals.supabase.auth.getUser();
	event.locals.user = user;

	// Auth check: bescherm alle routes behalve /login
	const isPublicRoute = PUBLIC_ROUTES.some((route) => event.url.pathname.startsWith(route));

	if (!user && !isPublicRoute) {
		// API routes: return 401
		if (event.url.pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Niet ingelogd' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		// Pagina routes: redirect naar login met return URL
		const redirectTo = encodeURIComponent(event.url.pathname);
		throw redirect(303, `/login?redirectTo=${redirectTo}`);
	}

	// Ingelogde gebruiker op /login → redirect naar home
	if (user && event.url.pathname === '/login') {
		throw redirect(303, '/');
	}

	const response = await resolve(event);

	// Security headers
	const supabaseUrl = env.SUPABASE_URL ?? '';
	response.headers.set(
		'Content-Security-Policy',
		[
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline'",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: blob:",
			`connect-src 'self' ${supabaseUrl}`,
			"font-src 'self' data:",
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			"frame-ancestors 'none'"
		].join('; ')
	);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

	return response;
};
