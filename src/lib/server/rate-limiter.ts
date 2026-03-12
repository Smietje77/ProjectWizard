// In-memory rate limiter per user/IP
// Eenvoudig sliding window: telt requests binnen een tijdsvenster

interface RateEntry {
	count: number;
	resetAt: number;
}

const store = new Map<string, RateEntry>();

// Opruimen van verlopen entries elke 5 minuten
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of store) {
		if (now > entry.resetAt) store.delete(key);
	}
}, 5 * 60 * 1000);

interface RateLimitConfig {
	maxRequests: number;
	windowMs: number;
}

// Configuratie per endpoint
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
	'/api/chat': { maxRequests: 20, windowMs: 60_000 },
	'/api/generate': { maxRequests: 5, windowMs: 60_000 },
	'/api/analyze-screenshot': { maxRequests: 10, windowMs: 60_000 },
	'/api/refine-skill': { maxRequests: 10, windowMs: 60_000 }
};

/**
 * Check rate limit voor een gegeven key en endpoint.
 * Retourneert null als OK, of een Response met 429 status als limiet bereikt.
 */
export function checkRateLimit(
	key: string,
	endpoint: string
): { allowed: true } | { allowed: false; retryAfterMs: number } {
	const config = RATE_LIMITS[endpoint];
	if (!config) return { allowed: true };

	const storeKey = `${key}:${endpoint}`;
	const now = Date.now();
	const entry = store.get(storeKey);

	if (!entry || now > entry.resetAt) {
		// Nieuw venster starten
		store.set(storeKey, { count: 1, resetAt: now + config.windowMs });
		return { allowed: true };
	}

	if (entry.count >= config.maxRequests) {
		return { allowed: false, retryAfterMs: entry.resetAt - now };
	}

	entry.count++;
	return { allowed: true };
}
