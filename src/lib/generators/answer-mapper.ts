// src/lib/generators/answer-mapper.ts
// Converteert WizardAnswer[] (vrije Q&A) naar WizardAnswers (gestructureerd GSD formaat)

import type { WizardAnswer } from '$lib/types';
import type { WizardAnswers, Feature, DataEntity, ExternalService, PageScreenshot, ConfirmedEffects } from '$lib/types/gsd';

/**
 * Zoek een antwoord op basis van specialist en/of keywords in vraag/antwoord
 */
function findBySpecialist(answers: WizardAnswer[], specialist: string): WizardAnswer[] {
	return answers.filter((a) => a.specialist === specialist && a.type !== 'skipped');
}

function findAnswer(answers: WizardAnswer[], ...keywords: string[]): string | undefined {
	for (const keyword of keywords) {
		const match = answers.find(
			(a) =>
				a.type !== 'skipped' &&
				(a.question.toLowerCase().includes(keyword.toLowerCase()) ||
					a.answer.toLowerCase().includes(keyword.toLowerCase()))
		);
		if (match) return match.answer;
	}
	return undefined;
}

function allText(answers: WizardAnswer[]): string {
	return answers
		.filter((a) => a.type !== 'skipped')
		.map((a) => `${a.question} ${a.answer}`)
		.join(' ')
		.toLowerCase();
}

/**
 * Detecteer een enum-waarde uit antwoorden via keyword matching
 */
function detectEnum<T extends string>(
	answers: WizardAnswer[],
	mapping: Record<string, string[]>,
	fallback: T
): T {
	const text = allText(answers);
	for (const [value, keywords] of Object.entries(mapping)) {
		if (keywords.some((k) => text.includes(k.toLowerCase()))) {
			return value as T;
		}
	}
	return fallback;
}

// ============================================
// Specifieke detectie functies
// ============================================

function detectFramework(answers: WizardAnswer[]): 'sveltekit' | 'nextjs' | 'nuxt' {
	return detectEnum(
		answers,
		{
			sveltekit: ['sveltekit', 'svelte'],
			nextjs: ['next.js', 'nextjs', 'next js', 'react'],
			nuxt: ['nuxt', 'vue']
		},
		'sveltekit'
	);
}

function detectDatabase(answers: WizardAnswer[]): 'supabase' | 'postgresql' | 'sqlite' {
	return detectEnum(
		answers,
		{
			supabase: ['supabase'],
			postgresql: ['postgresql', 'postgres'],
			sqlite: ['sqlite']
		},
		'supabase'
	);
}

function detectAuth(
	answers: WizardAnswer[]
): 'magic-link' | 'email-password' | 'social' | 'none' {
	return detectEnum(
		answers,
		{
			'magic-link': ['magic link', 'magic-link', 'passwordless', 'magiclink'],
			'email-password': ['wachtwoord', 'password', 'email/wachtwoord', 'email-password'],
			social: ['social', 'google', 'github login', 'oauth'],
			none: ['geen auth', 'geen authenticatie', 'no auth', 'publiek']
		},
		'email-password'
	);
}

function detectUiLibrary(
	answers: WizardAnswer[]
): 'skeleton' | 'shadcn' | 'daisyui' | 'custom' {
	return detectEnum(
		answers,
		{
			skeleton: ['skeleton'],
			shadcn: ['shadcn'],
			daisyui: ['daisy', 'daisyui'],
			custom: ['custom', 'eigen', 'zelf']
		},
		'skeleton'
	);
}

// Context-aware navigatie default (FIX 4)
function getDefaultNavigation(
	projectGoal: string,
	featureNames: string[]
): 'sidebar' | 'topbar' | 'bottombar' | 'none' {
	const sidebarTypes = ['dashboard', 'admin', 'crm', 'backoffice', 'saas', 'beheer', 'panel'];
	const topbarTypes = ['webshop', 'ecommerce', 'portfolio', 'landing', 'blog', 'brochure', 'corporate', 'website', 'winkel'];

	const goal = projectGoal.toLowerCase();
	if (sidebarTypes.some((t) => goal.includes(t))) return 'sidebar';
	if (topbarTypes.some((t) => goal.includes(t))) return 'topbar';

	// Heuristiek: als er productpagina's, winkelwagen of catalogi zijn → topbar
	const topbarFeatures = ['product', 'winkelwagen', 'cart', 'shop', 'catalog', 'collectie', 'portfolio', 'galerij'];
	if (featureNames.some((f) => topbarFeatures.some((t) => f.toLowerCase().includes(t)))) return 'topbar';

	return 'sidebar';
}

function detectNavigation(
	answers: WizardAnswer[],
	projectGoal: string = '',
	featureNames: string[] = []
): 'sidebar' | 'topbar' | 'bottombar' | 'none' {
	const text = allText(answers);

	// Expliciete navigatie-keuze
	const navMapping: Record<string, string[]> = {
		sidebar: ['sidebar', 'zijbalk', 'zij-navigatie'],
		topbar: ['topbar', 'top navigatie', 'navbar', 'header nav'],
		bottombar: ['bottom', 'onderaan', 'mobile nav'],
		none: ['geen navigatie', 'no nav']
	};

	for (const [value, keywords] of Object.entries(navMapping)) {
		if (keywords.some((k) => text.includes(k.toLowerCase()))) {
			return value as 'sidebar' | 'topbar' | 'bottombar' | 'none';
		}
	}

	// Screenshot-analyse als secundaire automatische bron
	const screenshots = extractScreenshotAnalysis(answers);
	if (screenshots && screenshots.length > 0) {
		const nav = (screenshots[0].analysis as Record<string, unknown>)?.layout;
		const navType = typeof nav === 'object' && nav !== null
			? (nav as Record<string, unknown>).navigation
			: undefined;
		if (typeof navType === 'string' && ['sidebar', 'topbar', 'bottombar', 'none'].includes(navType)) {
			return navType as 'sidebar' | 'topbar' | 'bottombar' | 'none';
		}
	}

	// Geen expliciete keuze — context-aware default
	return getDefaultNavigation(projectGoal, featureNames);
}

function detectStyling(
	answers: WizardAnswer[]
): 'tailwind' | 'css-modules' | 'styled-components' {
	return detectEnum(
		answers,
		{
			tailwind: ['tailwind'],
			'css-modules': ['css modules', 'css-modules'],
			'styled-components': ['styled-components', 'styled components']
		},
		'tailwind'
	);
}

function detectApiPattern(answers: WizardAnswer[]): 'rest' | 'graphql' | 'trpc' {
	return detectEnum(
		answers,
		{
			rest: ['rest', 'rest api'],
			graphql: ['graphql'],
			trpc: ['trpc']
		},
		'rest'
	);
}

function detectDeployment(answers: WizardAnswer[]): 'dokploy' | 'vercel' | 'coolify' {
	return detectEnum(
		answers,
		{
			dokploy: ['dokploy'],
			vercel: ['vercel'],
			coolify: ['coolify']
		},
		'dokploy'
	);
}

function detectTestStrategy(answers: WizardAnswer[]): 'minimal' | 'standard' | 'comprehensive' {
	return detectEnum(
		answers,
		{
			comprehensive: ['uitgebreid', 'comprehensive', 'volledig', 'unit + integration'],
			minimal: ['minimal', 'minimaal', 'handmatig', 'manual'],
			standard: ['standaard', 'standard', 'e2e', 'end-to-end']
		},
		'standard'
	);
}

// ============================================
// Complex veld extractie
// ============================================

// Placeholder-patronen die geen echte features zijn (FIX 4)
const PLACEHOLDER_PATTERNS = [
	/^et\s*cetera$/i,
	/^etc\.?$/i,
	/^enz\.?$/i,
	/^en\s+(meer|zo)/i,
	/^overig(e)?$/i,
	/^anders$/i,
	/^\.{2,}$/,
	/^-{2,}$/,
	/^TODO$/i,
	/^TBD$/i,
	/^n\.?v\.?t\.?$/i
];

function isPlaceholder(text: string): boolean {
	return PLACEHOLDER_PATTERNS.some((p) => p.test(text.trim()));
}

// Haakjes-aware feature splitter (FIX 5)
function smartSplitFeatures(text: string): string[] {
	const results: string[] = [];
	let current = '';
	let depth = 0;

	for (const char of text) {
		if (char === '(' || char === '[') depth++;
		if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
		if ((char === ',' || char === ';' || char === '\n') && depth === 0) {
			if (current.trim()) results.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	if (current.trim()) results.push(current.trim());
	return results.filter((r) => r.length > 3 && !isPlaceholder(r));
}

// Content-aware feature prioritering (FIX 3)
function determineFeaturePriority(
	name: string,
	description: string,
	projectGoal: string
): Feature['priority'] {
	const text = `${name} ${description}`.toLowerCase();

	// Must: kern-functionaliteiten
	const mustPatterns =
		/\b(auth|login|registr|dashboard|crud|database|schema|profiel|account|gebruiker.?beheer)\b/i;
	if (mustPatterns.test(text)) return 'must';

	// Must: feature komt voor in het projectdoel
	const goalLower = projectGoal.toLowerCase();
	const nameWords = name.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
	if (nameWords.some((w) => goalLower.includes(w))) return 'must';

	// Nice: duidelijk secundaire features
	const nicePatterns =
		/\b(rating|review|beoordel|notificati|melding|statistiek|analytics|export|import|dark.?mode|thema|social|share|deel|chat|bookmark|favoriet|gamific)\b/i;
	if (nicePatterns.test(text)) return 'nice';

	return 'should';
}

function extractFeatures(answers: WizardAnswer[], projectGoal: string): Feature[] {
	const features: Feature[] = [];
	const reqAnswers = findBySpecialist(answers, 'requirements');
	let counter = 1;

	for (const a of reqAnswers) {
		// Probeer features te herkennen uit antwoorden die over functionaliteit gaan
		const text = a.answer;
		const lines = smartSplitFeatures(text);

		if (lines.length > 1) {
			// Meerdere items gevonden — elk als feature
			for (const line of lines) {
				features.push({
					id: `F-${String(counter++).padStart(3, '0')}`,
					name: line.slice(0, 50),
					description: line,
					priority: determineFeaturePriority(line, line, projectGoal),
					category: detectFeatureCategory(line)
				});
			}
		} else if (
			a.question.toLowerCase().includes('functionaliteit') ||
			a.question.toLowerCase().includes('feature') ||
			a.question.toLowerCase().includes('wat moet')
		) {
			// Enkele feature uit een relevante vraag
			features.push({
				id: `F-${String(counter++).padStart(3, '0')}`,
				name: text.slice(0, 50),
				description: text,
				priority: determineFeaturePriority(text, text, projectGoal),
				category: detectFeatureCategory(text)
			});
		}
	}

	// Als geen features gevonden, maak er minimaal 1 van de projectbeschrijving
	if (features.length === 0) {
		features.push({
			id: 'F-001',
			name: 'Kernfunctionaliteit',
			description: 'Primaire functionaliteit zoals beschreven in het projectdoel',
			priority: 'must',
			category: 'other'
		});
	}

	return features;
}

function detectFeatureCategory(
	text: string
): 'auth' | 'backend' | 'frontend' | 'integration' | 'other' {
	const lower = text.toLowerCase();
	if (lower.includes('login') || lower.includes('auth') || lower.includes('registr'))
		return 'auth';
	if (
		lower.includes('api') ||
		lower.includes('database') ||
		lower.includes('server') ||
		lower.includes('data')
	)
		return 'backend';
	if (
		lower.includes('ui') ||
		lower.includes('pagina') ||
		lower.includes('scherm') ||
		lower.includes('formulier')
	)
		return 'frontend';
	if (
		lower.includes('integratie') ||
		lower.includes('mcp') ||
		lower.includes('extern') ||
		lower.includes('api')
	)
		return 'integration';
	return 'other';
}

// Entity field templates — typische velden per entity-type (FIX 5)
const ENTITY_FIELD_TEMPLATES: Record<string, string[]> = {
	users: ['id', 'email', 'name', 'avatar_url', 'role', 'created_at', 'updated_at'],
	gebruikers: ['id', 'email', 'name', 'avatar_url', 'role', 'created_at', 'updated_at'],
	profiles: ['id', 'user_id', 'bio', 'avatar_url', 'expertise_level', 'created_at', 'updated_at'],
	posts: ['id', 'title', 'content', 'slug', 'author_id', 'category_id', 'published', 'created_at', 'updated_at'],
	berichten: ['id', 'title', 'content', 'slug', 'author_id', 'category_id', 'published', 'created_at', 'updated_at'],
	comments: ['id', 'content', 'author_id', 'post_id', 'created_at', 'updated_at'],
	reacties: ['id', 'content', 'author_id', 'post_id', 'created_at', 'updated_at'],
	categories: ['id', 'name', 'slug', 'description', 'parent_id', 'created_at', 'updated_at'],
	categorieën: ['id', 'name', 'slug', 'description', 'parent_id', 'created_at', 'updated_at'],
	tags: ['id', 'name', 'slug', 'created_at'],
	products: ['id', 'name', 'description', 'price', 'slug', 'image_url', 'category_id', 'status', 'created_at', 'updated_at'],
	producten: ['id', 'name', 'description', 'price', 'slug', 'image_url', 'category_id', 'status', 'created_at', 'updated_at'],
	orders: ['id', 'user_id', 'status', 'total', 'created_at', 'updated_at'],
	bestellingen: ['id', 'user_id', 'status', 'total', 'created_at', 'updated_at'],
	projects: ['id', 'name', 'description', 'owner_id', 'status', 'created_at', 'updated_at'],
	projecten: ['id', 'name', 'description', 'owner_id', 'status', 'created_at', 'updated_at'],
	tasks: ['id', 'title', 'description', 'status', 'assignee_id', 'project_id', 'due_date', 'created_at'],
	taken: ['id', 'title', 'description', 'status', 'assignee_id', 'project_id', 'due_date', 'created_at'],
	appointments: ['id', 'title', 'user_id', 'start_time', 'end_time', 'status', 'created_at'],
	afspraken: ['id', 'title', 'user_id', 'start_time', 'end_time', 'status', 'created_at'],
	snippets: ['id', 'title', 'code', 'language', 'author_id', 'description', 'created_at', 'updated_at'],
	ratings: ['id', 'score', 'review', 'author_id', 'target_id', 'target_type', 'created_at'],
	bookmarks: ['id', 'user_id', 'target_id', 'target_type', 'created_at'],
	reports: ['id', 'reporter_id', 'target_id', 'target_type', 'reason', 'status', 'created_at']
};

function extractDataEntities(answers: WizardAnswer[]): DataEntity[] {
	const entities: DataEntity[] = [];
	const backendAnswers = findBySpecialist(answers, 'backend');
	const text = allText(backendAnswers);

	// Zoek naar veelvoorkomende entiteit-patronen
	const entityPatterns = [
		'users',
		'gebruikers',
		'producten',
		'products',
		'orders',
		'bestellingen',
		'posts',
		'berichten',
		'comments',
		'reacties',
		'categories',
		'categorieën',
		'tags',
		'afspraken',
		'appointments',
		'projecten',
		'projects',
		'taken',
		'tasks',
		'snippets',
		'ratings',
		'bookmarks',
		'reports',
		'profiles'
	];

	for (const pattern of entityPatterns) {
		if (text.includes(pattern)) {
			// Gebruik verrijkte veld-templates als die bestaan (FIX 5)
			const fields = ENTITY_FIELD_TEMPLATES[pattern] || ['id', 'created_at', 'updated_at'];
			entities.push({
				name: pattern.charAt(0).toUpperCase() + pattern.slice(1),
				fields,
				relations: []
			});
		}
	}

	// Ensure: elke entity heeft created_at + updated_at (FIX 10)
	const authMethod = detectAuth(answers);
	for (const entity of entities) {
		if (!entity.fields.includes('created_at')) entity.fields.push('created_at');
		if (!entity.fields.includes('updated_at')) entity.fields.push('updated_at');
		// Als auth actief is en entity niet users/gebruikers → voeg user_id toe
		if (authMethod !== 'none' && !entity.name.toLowerCase().includes('user') && !entity.name.toLowerCase().includes('gebruiker') && !entity.fields.includes('user_id')) {
			// Voeg user_id toe na id
			const idIdx = entity.fields.indexOf('id');
			entity.fields.splice(idIdx + 1, 0, 'user_id');
		}
	}

	// Altijd een users entiteit als er auth is
	if (authMethod !== 'none' && !entities.some((e) => e.name.toLowerCase().includes('user'))) {
		entities.unshift({
			name: 'Users',
			fields: ENTITY_FIELD_TEMPLATES['users'],
			relations: []
		});
	}

	return entities;
}

function extractOutOfScope(answers: WizardAnswer[]): string[] {
	const answer = findAnswer(answers, 'scope', 'niet', 'buiten', 'out of scope', 'later');
	if (!answer) return [];

	return answer
		.split(/[,;\n]/)
		.map((s) => s.trim())
		.filter((s) => s.length > 3);
}

function extractExternalServices(answers: WizardAnswer[]): ExternalService[] {
	const services: ExternalService[] = [];
	const text = allText(answers);

	const servicePatterns: Array<{ pattern: string; name: string; purpose: string; mcp?: string }> =
		[
			{
				pattern: 'stripe',
				name: 'Stripe',
				purpose: 'Betalingen verwerken',
				mcp: 'stripe'
			},
			{
				pattern: 'resend',
				name: 'Resend',
				purpose: 'Transactionele emails',
				mcp: 'resend'
			},
			{
				pattern: 'openai',
				name: 'OpenAI',
				purpose: 'AI functionaliteit'
			},
			{
				pattern: 'anthropic',
				name: 'Anthropic',
				purpose: 'AI functionaliteit'
			},
			{
				pattern: 'cloudinary',
				name: 'Cloudinary',
				purpose: 'Afbeeldingen opslag en transformatie'
			},
			{
				pattern: 'github',
				name: 'GitHub',
				purpose: 'Repository hosting',
				mcp: 'github'
			}
		];

	for (const sp of servicePatterns) {
		if (text.includes(sp.pattern)) {
			services.push({
				name: sp.name,
				purpose: sp.purpose,
				mcp: sp.mcp
			});
		}
	}

	return services;
}

function extractMcps(answers: WizardAnswer[]): string[] {
	const mcps: string[] = [];
	const text = allText(answers);

	if (text.includes('supabase') || text.includes('database')) mcps.push('supabase');
	mcps.push('filesystem');
	if (text.includes('github')) mcps.push('github');

	return mcps;
}

function extractCriticalFlows(answers: WizardAnswer[]): string[] {
	const flows: string[] = [];
	const text = allText(answers);

	// Standaard flows op basis van gedetecteerde features
	if (detectAuth(answers) !== 'none') flows.push('Gebruiker registratie en login');
	if (text.includes('dashboard')) flows.push('Dashboard laden en weergave');
	if (text.includes('formulier') || text.includes('form')) flows.push('Formulier invullen en opslaan');
	if (text.includes('betaling') || text.includes('stripe')) flows.push('Betaalproces doorlopen');

	// Voeg minimaal 1 flow toe
	if (flows.length === 0) flows.push('Hoofdgebruikersstroom');

	return flows;
}

function detectDomain(answers: WizardAnswer[]): { hasDomain: boolean; domainName?: string } {
	const answer = findAnswer(answers, 'domein', 'domain');
	if (!answer) return { hasDomain: false };

	const domainMatch = answer.match(/([a-z0-9-]+\.[a-z]{2,})/i);
	if (domainMatch) {
		return { hasDomain: true, domainName: domainMatch[1] };
	}

	const lower = answer.toLowerCase();
	if (lower.includes('ja') || lower.includes('yes') || domainMatch) {
		return { hasDomain: true, domainName: undefined };
	}

	return { hasDomain: false };
}

// ============================================
// Type-driven design detectie functies
// ============================================

function detectWebsiteType(answers: WizardAnswer[]): string | undefined {
	// Primair: zoek antwoord met expliciete categorie website_type
	const typeAnswer = answers.find((a) => a.categorie === 'website_type' && a.type !== 'skipped');
	if (typeAnswer) {
		const ans = typeAnswer.answer.toLowerCase();
		if (ans.includes('e-commerce') || ans.includes('webshop') || ans.includes('ecommerce')) return 'ecommerce';
		if (ans.includes('b2b saas') || ans.includes('b2b platform')) return 'saas_b2b';
		if (ans.includes('consumer saas') || ans.includes('consumer app')) return 'saas_consumer';
		if (ans.includes('portfolio') || ans.includes('persoonlijke site')) return 'portfolio';
		if (ans.includes('blog') || ans.includes('contentplatform')) return 'blog_content';
		if (ans.includes('dashboard') || ans.includes('admin tool')) return 'dashboard_admin';
		if (ans.includes('marketplace') || ans.includes('platform')) return 'marketplace';
		if (ans.includes('community') || ans.includes('sociaal platform')) return 'community';
		if (ans.includes('landing') || ans.includes('marketingsite') || ans.includes('marketing')) return 'landing';
		if (ans.includes('saas')) return 'saas_consumer';
		return typeAnswer.answer.trim(); // Geef raw antwoord terug als geen mapping
	}

	// Fallback: keyword matching over alle antwoorden
	const text = allText(answers);
	if (text.includes('webshop') || text.includes('e-commerce') || text.includes('ecommerce')) return 'ecommerce';
	if (text.includes('dashboard') && (text.includes('admin') || text.includes('beheer'))) return 'dashboard_admin';
	if (text.includes('portfolio')) return 'portfolio';
	if (text.includes('blog') && !text.includes('dashboard')) return 'blog_content';
	if (text.includes('landing page') || text.includes('marketingsite')) return 'landing';
	if (text.includes('marketplace')) return 'marketplace';
	if (text.includes('community')) return 'community';
	if (text.includes('saas') && text.includes('b2b')) return 'saas_b2b';
	if (text.includes('saas')) return 'saas_consumer';

	return undefined;
}

function detectUiStyleDetail(answers: WizardAnswer[]): string | undefined {
	const UI_STYLE_KEYS = [
		'rounded', 'glassmorphism', 'neumorphic', 'sharp', 'minimalist',
		'material', 'claymorphism', 'bento', 'aurora', 'retro', 'corporate', 'dark_modern'
	];

	// Zoek in design-antwoorden
	const designAnswers = answers.filter((a) => a.type !== 'skipped' && a.specialist === 'design');
	const designText = designAnswers.map((a) => a.answer.toLowerCase()).join(' ');
	for (const key of UI_STYLE_KEYS) {
		if (designText.includes(key)) return key;
	}

	// Fallback: zoek in alle antwoorden
	const text = allText(answers);
	for (const key of UI_STYLE_KEYS) {
		if (text.includes(key)) return key;
	}

	return undefined;
}

function detectSelectedPalette(answers: WizardAnswer[]): string | undefined {
	const PALETTE_MAPPING: Array<{ keywords: string[]; key: string }> = [
		{ keywords: ['saas vertrouwen', 'vertrouwen (#1e40af)', 'saas trust'], key: 'saas_trust' },
		{ keywords: ['saas modern', 'modern (#7c3aed)', 'saas violet'], key: 'saas_violet' },
		{ keywords: ['e-commerce energie', 'energie (#dc2626)', 'energie (rood'], key: 'ecommerce_warm' },
		{ keywords: ['e-commerce fris', 'fris (#0f766e)', 'fris (teal'], key: 'ecommerce_clean' },
		{ keywords: ['healthcare', 'kalm (#0369a1)'], key: 'healthcare' },
		{ keywords: ['fintech solide', 'fintech (#1e3a5f)'], key: 'fintech' },
		{ keywords: ['creatief & levendig', 'levendig (#9333ea)', 'creatief (#9333ea)'], key: 'creative' },
		{ keywords: ['minimaal donker', 'donker (#18181b)'], key: 'minimal_dark' },
		{ keywords: ['redactioneel (#1c1917)', 'redactioneel (zwart'], key: 'editorial' },
		{ keywords: ['natuur & duurzaam', 'natuur (#166534)'], key: 'nature' },
		{ keywords: ['luxe & premium', 'premium (#1c1917)', 'luxe (#1c1917)'], key: 'luxury' },
		{ keywords: ['speels & kleurrijk', 'kleurrijk (#7c3aed)'], key: 'playful' },
		{ keywords: ['corporate klassiek', 'corporate (#1d4ed8)'], key: 'corporate_blue' },
		{ keywords: ['dark tech/ai', 'dark tech (#020617)', 'tech/ai (#020617)'], key: 'dark_tech' },
		{ keywords: ['warm neutraal', 'neutraal (#92400e)'], key: 'warm_neutral' }
	];

	const text = allText(answers);
	for (const { keywords, key } of PALETTE_MAPPING) {
		if (keywords.some((k) => text.includes(k))) return key;
	}

	return undefined;
}

// ============================================
// Design detectie functies
// ============================================

function detectDesignStyle(
	answers: WizardAnswer[]
): 'minimalistisch' | 'zakelijk' | 'speels' | 'brutalistisch' | 'custom' {
	return detectEnum(
		answers,
		{
			minimalistisch: ['minimalistisch', 'clean', 'witruimte', 'minimal'],
			zakelijk: ['zakelijk', 'professioneel', 'strak', 'business'],
			speels: ['speels', 'creatief', 'kleurrijk', 'dynamisch', 'playful'],
			brutalistisch: ['brutalistisch', 'bold', 'onconventioneel', 'brutalist']
		},
		'minimalistisch'
	);
}

function detectColorScheme(answers: WizardAnswer[]): 'dark' | 'light' | 'auto' {
	return detectEnum(
		answers,
		{
			dark: ['donker', 'dark', 'dark mode', 'donker thema'],
			light: ['licht', 'light', 'light mode', 'licht thema'],
			auto: ['auto', 'beide', 'systeem', 'system']
		},
		'light'
	);
}

function detectTypography(answers: WizardAnswer[]): 'sans-serif' | 'serif' | 'mono' | 'mixed' {
	return detectEnum(
		answers,
		{
			'sans-serif': ['sans-serif', 'inter', 'geist', 'modern'],
			serif: ['serif', 'merriweather', 'playfair', 'klassiek'],
			mono: ['mono', 'monospace', 'jetbrains', 'tech'],
			mixed: ['combinatie', 'mixed', 'both']
		},
		'sans-serif'
	);
}

function detectComponentStyle(
	answers: WizardAnswer[]
): 'rounded' | 'sharp' | 'neumorphic' | 'glassmorphism' {
	return detectEnum(
		answers,
		{
			rounded: ['rounded', 'zacht', 'afgerond', 'border-radius'],
			sharp: ['scherp', 'strak', 'sharp', 'geen radius', 'flat'],
			neumorphic: ['neumorf', 'neumorphic', 'diepte'],
			glassmorphism: ['glass', 'transparant', 'blur', 'glassmorphism']
		},
		'rounded'
	);
}

// Pagina-type labels voor backward-compatibele weergave
const PAGE_TYPE_LABELS: Record<string, string> = {
	frontpage: 'Frontpage / Homepage',
	product: 'Productpagina',
	dashboard: 'Dashboard',
	login: 'Login / Registratie',
	admin: 'Admin / Backend',
	detail: 'Detailpagina',
	overview: 'Overzichtspagina',
	general: 'Algemeen'
};

function extractScreenshotAnalysis(answers: WizardAnswer[]): PageScreenshot[] | null {
	const results: PageScreenshot[] = [];
	const designAnswers = findBySpecialist(answers, 'design');

	for (const a of designAnswers) {
		// Nieuw multi-page formaat: [DESIGN_ANALYSE:pageType]
		const multiRegex = /\[DESIGN_ANALYSE:([^\]]+)\]\n/g;
		let match;
		const markers: Array<{ pageType: string; startIdx: number }> = [];

		while ((match = multiRegex.exec(a.answer)) !== null) {
			markers.push({
				pageType: match[1],
				startIdx: match.index + match[0].length
			});
		}

		if (markers.length > 0) {
			// Parse elke marker tot de volgende marker of einde
			for (let i = 0; i < markers.length; i++) {
				const start = markers[i].startIdx;
				const end = i + 1 < markers.length ? markers[i + 1].startIdx - markers[i + 1].pageType.length - '[DESIGN_ANALYSE:]\n'.length : a.answer.length;
				const analysisText = a.answer.slice(start, end).trim();
				const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					try {
						const pageType = markers[i].pageType;
						results.push({
							pageType,
							label: PAGE_TYPE_LABELS[pageType] || pageType,
							analysis: JSON.parse(jsonMatch[0])
						});
					} catch {
						/* ignore parse errors */
					}
				}
			}
		} else {
			// Backward-compatible: oud formaat [DESIGN_ANALYSE] zonder page type
			const oldMarker = '[DESIGN_ANALYSE]\n';
			const idx = a.answer.indexOf(oldMarker);
			if (idx >= 0) {
				const analysisText = a.answer.slice(idx + oldMarker.length);
				const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					try {
						results.push({
							pageType: 'general',
							label: 'Algemeen',
							analysis: JSON.parse(jsonMatch[0])
						});
					} catch {
						/* ignore parse errors */
					}
				}
			}
		}
	}

	return results.length > 0 ? results : null;
}

// ============================================
// Effecten extractie (FIX 13)
// ============================================

function extractConfirmedEffects(answers: WizardAnswer[]): ConfirmedEffects | null {
	const designAnswers = findBySpecialist(answers, 'design');

	const effectsAnswer = designAnswers.find(a =>
		a.question.toLowerCase().includes('visuele effecten') ||
		a.question.toLowerCase().includes('effecten gedetecteerd') ||
		a.question.toLowerCase().includes('welke effecten')
	);

	if (!effectsAnswer) return null;

	// Parse als JSON of als vrije tekst
	try {
		return JSON.parse(effectsAnswer.answer) as ConfirmedEffects;
	} catch {
		const items = effectsAnswer.answer
			.split(/[,;\n]/)
			.map(s => s.trim())
			.filter(s => s.length > 2);

		return {
			confirmedEffects: items,
			removedEffects: [],
			addedEffects: [],
			animationPreferences: []
		};
	}
}

// ============================================
// Product-strategie extractie
// ============================================

function detectRevenueModel(answers: WizardAnswer[]): string | undefined {
	return detectEnum<string>(
		answers,
		{
			subscription: ['abonnement', 'subscription', 'maandelijks', 'jaarlijks'],
			freemium: ['freemium', 'gratis + betaald', 'free tier'],
			'one-time': ['eenmalig', 'one-time', 'eenmalige betaling'],
			marketplace: ['marketplace', 'commissie', 'transactiefee'],
			free: ['gratis', 'free', 'open source', 'geen verdienmodel']
		},
		undefined as unknown as string
	) || undefined;
}

// ============================================
// Hoofdfunctie
// ============================================

/**
 * Converteer WizardAnswer[] (vrije Q&A paren) naar WizardAnswers (gestructureerd GSD formaat).
 * Gebruikt keyword matching en heuristieken om velden te vullen.
 * Ontbrekende velden krijgen sensible defaults.
 */
export function mapAnswersToGSD(
	answers: WizardAnswer[],
	description: string,
	projectName: string
): WizardAnswers {
	const domain = detectDomain(answers);
	const coreFeatures = extractFeatures(answers, description);

	return {
		// Requirements
		projectName,
		projectGoal: description,
		problemDescription:
			findAnswer(answers, 'probleem', 'waarom', 'doel', 'oploss') || description,
		targetUsers:
			findAnswer(answers, 'doelgroep', 'voor wie', 'gebruiker', 'publiek', 'klant') ||
			'Algemene gebruikers',
		techLevel: 'intermediate',
		coreFeatures,
		outOfScope: extractOutOfScope(answers),

		// Architect
		frontendFramework: detectFramework(answers),
		database: detectDatabase(answers),
		authMethod: detectAuth(answers),

		// Frontend
		uiLibrary: detectUiLibrary(answers),
		navigationPattern: detectNavigation(answers, description, coreFeatures.map(f => f.name)),
		stylingApproach: detectStyling(answers),

		// Backend
		apiPattern: detectApiPattern(answers),
		dataEntities: extractDataEntities(answers),

		// DevOps
		deploymentTarget: detectDeployment(answers),
		hasDomain: domain.hasDomain,
		domainName: domain.domainName,

		// Integration
		requiredMcps: extractMcps(answers),
		externalServices: extractExternalServices(answers),

		// Testing
		testStrategy: detectTestStrategy(answers),
		criticalFlows: extractCriticalFlows(answers),

		// Design
		designStyle: detectDesignStyle(answers),
		colorScheme: detectColorScheme(answers),
		typography: detectTypography(answers),
		componentStyle: detectComponentStyle(answers),
		screenshotAnalysis: extractScreenshotAnalysis(answers),
		confirmedEffects: extractConfirmedEffects(answers),

		// Type-driven design
		websiteType: detectWebsiteType(answers),
		uiStyleDetail: detectUiStyleDetail(answers),
		selectedPalette: detectSelectedPalette(answers),

		// Product-strategie (optioneel)
		brandPersonality: findAnswer(answers, 'personality', 'persoonlijkheid', 'merk', 'persoon was') ?? undefined,
		toneOfVoice: findAnswer(answers, 'tone', 'toon', 'praten', 'communicatie', 'voice') ?? undefined,
		brandAntiPatterns: findAnswer(answers, 'anti-pattern', 'nooit', 'vermijden', 'niet uitstralen') ?? undefined,
		revenueModel: detectRevenueModel(answers),
		ninetyDayGoal: findAnswer(answers, '90 dagen', 'drie maanden', '90-day', 'succes over 3') ?? undefined,
		sixMonthVision: findAnswer(answers, '6 maanden', 'zes maanden', 'half jaar') ?? undefined,
		constraints: findAnswer(answers, 'constraint', 'beperking', 'budget', 'beperkingen') ?? undefined,
		goToMarket: findAnswer(answers, 'lancering', 'go-to-market', 'marketing', 'bij mensen brengen') ?? undefined,
		currentAlternatives: findAnswer(answers, 'alternatief', 'concurrent', 'nu gebruik', 'huidige oploss') ?? undefined,
		competitorFrustrations: findAnswer(answers, 'frustratie', 'mis met', 'kapot', 'niet werken') ?? undefined
	};
}
