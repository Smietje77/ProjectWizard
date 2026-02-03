// src/lib/generators/answer-mapper.ts
// Converteert WizardAnswer[] (vrije Q&A) naar WizardAnswers (gestructureerd GSD formaat)

import type { WizardAnswer } from '$lib/types';
import type { WizardAnswers, Feature, DataEntity, ExternalService } from '$lib/types/gsd';

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

function detectNavigation(
	answers: WizardAnswer[]
): 'sidebar' | 'topbar' | 'bottombar' | 'none' {
	return detectEnum(
		answers,
		{
			sidebar: ['sidebar', 'zijbalk', 'zij-navigatie'],
			topbar: ['topbar', 'top navigatie', 'navbar', 'header nav'],
			bottombar: ['bottom', 'onderaan', 'mobile nav'],
			none: ['geen navigatie', 'no nav']
		},
		'sidebar'
	);
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

function extractFeatures(answers: WizardAnswer[]): Feature[] {
	const features: Feature[] = [];
	const reqAnswers = findBySpecialist(answers, 'requirements');
	let counter = 1;

	for (const a of reqAnswers) {
		// Probeer features te herkennen uit antwoorden die over functionaliteit gaan
		const text = a.answer;
		const lines = text
			.split(/[,;\n]/)
			.map((l) => l.trim())
			.filter((l) => l.length > 3);

		if (lines.length > 1) {
			// Meerdere items gevonden — elk als feature
			for (const line of lines) {
				features.push({
					id: `F-${String(counter++).padStart(3, '0')}`,
					name: line.slice(0, 50),
					description: line,
					priority: counter <= 4 ? 'must' : counter <= 7 ? 'should' : 'nice',
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
				priority: 'must',
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
		'tasks'
	];

	for (const pattern of entityPatterns) {
		if (text.includes(pattern)) {
			entities.push({
				name: pattern.charAt(0).toUpperCase() + pattern.slice(1),
				fields: ['id', 'created_at', 'updated_at'],
				relations: []
			});
		}
	}

	// Altijd een users entiteit als er auth is
	if (detectAuth(answers) !== 'none' && !entities.some((e) => e.name.toLowerCase().includes('user'))) {
		entities.unshift({
			name: 'Users',
			fields: ['id', 'email', 'created_at'],
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

function extractScreenshotAnalysis(answers: WizardAnswer[]): Record<string, unknown> | null {
	const designAnswers = findBySpecialist(answers, 'design');
	for (const a of designAnswers) {
		const marker = '[DESIGN_ANALYSE]\n';
		const idx = a.answer.indexOf(marker);
		if (idx >= 0) {
			const analysisText = a.answer.slice(idx + marker.length);
			const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				try {
					return JSON.parse(jsonMatch[0]);
				} catch {
					/* ignore parse errors */
				}
			}
		}
	}
	return null;
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
		coreFeatures: extractFeatures(answers),
		outOfScope: extractOutOfScope(answers),

		// Architect
		frontendFramework: detectFramework(answers),
		database: detectDatabase(answers),
		authMethod: detectAuth(answers),

		// Frontend
		uiLibrary: detectUiLibrary(answers),
		navigationPattern: detectNavigation(answers),
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
		screenshotAnalysis: extractScreenshotAnalysis(answers)
	};
}
