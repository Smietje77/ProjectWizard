import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSupabaseServerClient } from '$lib/server/supabase-ssr';
import { checkRateLimit, RATE_LIMITS } from '$lib/server/rate-limiter';
import { randomUUID } from 'crypto';

// Routes die GEEN authenticatie vereisen
const PUBLIC_ROUTES = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
	// Request ID genereren voor gestructureerde logging
	event.locals.requestId = randomUUID();

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

	// Rate limiting voor API endpoints
	if (event.url.pathname.startsWith('/api/') && event.url.pathname in RATE_LIMITS) {
		const rateLimitKey = user?.id ?? event.getClientAddress();
		const rateCheck = checkRateLimit(rateLimitKey, event.url.pathname);
		if (!rateCheck.allowed) {
			const retryAfterSec = Math.ceil(rateCheck.retryAfterMs / 1000);
			return new Response(JSON.stringify({ error: 'Te veel verzoeken. Probeer het later opnieuw.' }), {
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': String(retryAfterSec)
				}
			});
		}
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
