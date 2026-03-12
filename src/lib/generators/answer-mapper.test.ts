import { describe, it, expect } from 'vitest';
import { mapAnswersToGSD } from '$lib/generators/answer-mapper';
import type { WizardAnswer } from '$lib/types';

function mockAnswer(overrides: Partial<WizardAnswer> = {}): WizardAnswer {
	return {
		step: 0,
		specialist: 'coordinator',
		question: 'Test vraag',
		answer: 'Test antwoord',
		type: 'free_text',
		...overrides
	};
}

const DEFAULT_DESC = 'Een test project';
const DEFAULT_NAME = 'TestProject';

// ============================================
// detectFramework (via frontendFramework)
// ============================================

describe('detectFramework', () => {
	it.each([
		['We gebruiken SvelteKit', 'sveltekit'],
		['React app met Next.js', 'nextjs'],
		['Vue met Nuxt framework', 'nuxt']
	])('detecteert framework: %s → %s', (answer, expected) => {
		const result = mapAnswersToGSD([mockAnswer({ answer })], DEFAULT_DESC, DEFAULT_NAME);
		expect(result.frontendFramework).toBe(expected);
	});

	it('geeft sveltekit terug als svelte en react beide voorkomen (svelte staat eerste in mapping)', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Ik overweeg React maar kies Svelte' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.frontendFramework).toBe('sveltekit');
	});

	it('valt terug op sveltekit als er geen keywords zijn', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Geen specifiek framework gekozen' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.frontendFramework).toBe('sveltekit');
	});
});

// ============================================
// detectDatabase (via database)
// ============================================

describe('detectDatabase', () => {
	it.each([
		['We gebruiken Supabase als database', 'supabase'],
		['PostgreSQL database opgezet', 'postgresql'],
		['Lokale SQLite opslag', 'sqlite']
	])('detecteert database: %s → %s', (answer, expected) => {
		const result = mapAnswersToGSD([mockAnswer({ answer })], DEFAULT_DESC, DEFAULT_NAME);
		expect(result.database).toBe(expected);
	});

	it('valt terug op supabase als er geen keywords zijn', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Een of andere opslag oplossing' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.database).toBe('supabase');
	});
});

// ============================================
// detectAuth (via authMethod)
// ============================================

describe('detectAuth', () => {
	it.each([
		['Inloggen via magic link', 'magic-link'],
		['Email en wachtwoord authenticatie', 'email-password'],
		['Google login via OAuth', 'social'],
		['Geen auth nodig, publieke app', 'none']
	])('detecteert auth methode: %s → %s', (answer, expected) => {
		const result = mapAnswersToGSD([mockAnswer({ answer })], DEFAULT_DESC, DEFAULT_NAME);
		expect(result.authMethod).toBe(expected);
	});

	it('valt terug op email-password als er geen keywords zijn', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Gebruikers moeten kunnen inloggen' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.authMethod).toBe('email-password');
	});
});

// ============================================
// detectUiLibrary (via uiLibrary)
// ============================================

describe('detectUiLibrary', () => {
	it.each([
		['We gebruiken Skeleton UI componenten', 'skeleton'],
		['shadcn/ui voor de interface', 'shadcn'],
		['DaisyUI voor styling', 'daisyui'],
		['Eigen componenten bouwen', 'custom']
	])('detecteert UI library: %s → %s', (answer, expected) => {
		const result = mapAnswersToGSD([mockAnswer({ answer })], DEFAULT_DESC, DEFAULT_NAME);
		expect(result.uiLibrary).toBe(expected);
	});

	it('valt terug op skeleton als er geen keywords zijn', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Een mooie interface bouwen' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.uiLibrary).toBe('skeleton');
	});
});

// ============================================
// detectNavigation (via navigationPattern)
// ============================================

describe('detectNavigation', () => {
	it('detecteert sidebar navigatie uit expliciete tekst', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'sidebar navigatie aan de linkerkant' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.navigationPattern).toBe('sidebar');
	});

	it('detecteert topbar navigatie uit expliciete tekst', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'topbar met menu items' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.navigationPattern).toBe('topbar');
	});

	it('geeft sidebar als context-aware default voor dashboard applicatie', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Geen specifieke voorkeur' })],
			'Een dashboard applicatie voor beheerders',
			DEFAULT_NAME
		);
		expect(result.navigationPattern).toBe('sidebar');
	});

	it('geeft topbar als context-aware default voor webshop', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Geen specifieke voorkeur' })],
			'Een webshop voor kleding',
			DEFAULT_NAME
		);
		expect(result.navigationPattern).toBe('topbar');
	});
});

// ============================================
// detectStyling (via stylingApproach)
// ============================================

describe('detectStyling', () => {
	it.each([
		['We stylen met tailwind classes', 'tailwind'],
		['CSS modules per component', 'css-modules']
	])('detecteert styling aanpak: %s → %s', (answer, expected) => {
		const result = mapAnswersToGSD([mockAnswer({ answer })], DEFAULT_DESC, DEFAULT_NAME);
		expect(result.stylingApproach).toBe(expected);
	});

	it('valt terug op tailwind als er geen keywords zijn', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Gewone CSS schrijven' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.stylingApproach).toBe('tailwind');
	});
});

// ============================================
// detectApiPattern (via apiPattern)
// ============================================

describe('detectApiPattern', () => {
	it.each([
		['We bouwen een REST API', 'rest'],
		['GraphQL endpoint opzetten', 'graphql'],
		['tRPC voor type-safe API', 'trpc']
	])('detecteert API patroon: %s → %s', (answer, expected) => {
		const result = mapAnswersToGSD([mockAnswer({ answer })], DEFAULT_DESC, DEFAULT_NAME);
		expect(result.apiPattern).toBe(expected);
	});

	it('valt terug op rest als er geen keywords zijn', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Standaard API communicatie' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.apiPattern).toBe('rest');
	});
});

// ============================================
// detectDeployment (via deploymentTarget)
// ============================================

describe('detectDeployment', () => {
	it.each([
		['Deploy via Dokploy op de VPS', 'dokploy'],
		['Vercel hosting gebruiken', 'vercel'],
		['Coolify voor zelf-gehoste deployment', 'coolify']
	])('detecteert deployment target: %s → %s', (answer, expected) => {
		const result = mapAnswersToGSD([mockAnswer({ answer })], DEFAULT_DESC, DEFAULT_NAME);
		expect(result.deploymentTarget).toBe(expected);
	});

	it('valt terug op dokploy als er geen keywords zijn', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Ergens in de cloud hosten' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.deploymentTarget).toBe('dokploy');
	});
});

// ============================================
// detectTestStrategy (via testStrategy)
// ============================================

describe('detectTestStrategy', () => {
	it.each([
		['Uitgebreid testen met unit en integration tests', 'comprehensive'],
		['Minimaal testen, handmatig controleren', 'minimal'],
		['Standaard test strategie', 'standard']
	])('detecteert test strategie: %s → %s', (answer, expected) => {
		const result = mapAnswersToGSD([mockAnswer({ answer })], DEFAULT_DESC, DEFAULT_NAME);
		expect(result.testStrategy).toBe(expected);
	});

	it('valt terug op standard als er geen keywords zijn', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Testen is belangrijk' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.testStrategy).toBe('standard');
	});
});

// ============================================
// Design detectie functies
// ============================================

describe('detectDesignStyle', () => {
	it.each([
		['Minimalistisch design met veel witruimte', 'minimalistisch'],
		['Zakelijk en professioneel uiterlijk', 'zakelijk'],
		['Speels en creatief design', 'speels']
	])('detecteert design stijl: %s → %s', (answer, expected) => {
		const result = mapAnswersToGSD([mockAnswer({ answer })], DEFAULT_DESC, DEFAULT_NAME);
		expect(result.designStyle).toBe(expected);
	});

	it('valt terug op minimalistisch als er geen keywords zijn', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Een mooi design graag' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.designStyle).toBe('minimalistisch');
	});
});

describe('detectColorScheme', () => {
	it.each([
		['Donker thema voor de app', 'dark'],
		['Licht kleurenschema gebruiken', 'light'],
		['Auto op basis van systeem instelling', 'auto']
	])('detecteert kleurenschema: %s → %s', (answer, expected) => {
		const result = mapAnswersToGSD([mockAnswer({ answer })], DEFAULT_DESC, DEFAULT_NAME);
		expect(result.colorScheme).toBe(expected);
	});

	it('valt terug op light als er geen keywords zijn', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Maakt me niet uit' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.colorScheme).toBe('light');
	});
});

describe('detectTypography', () => {
	it.each([
		['Sans-serif lettertype zoals Inter', 'sans-serif'],
		['Serif font voor een klassieke uitstraling', 'serif'],
		['Mono font voor een tech look', 'mono']
	])('detecteert typografie: %s → %s', (answer, expected) => {
		const result = mapAnswersToGSD([mockAnswer({ answer })], DEFAULT_DESC, DEFAULT_NAME);
		expect(result.typography).toBe(expected);
	});

	it('valt terug op sans-serif als er geen keywords zijn', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Leesbaar lettertype graag' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.typography).toBe('sans-serif');
	});
});

describe('detectComponentStyle', () => {
	it.each([
		['Rounded hoeken met border-radius', 'rounded'],
		['Scherpe strakke componenten', 'sharp'],
		['Neumorfisch design met diepte effect', 'neumorphic'],
		['Glass effect met transparante achtergrond', 'glassmorphism']
	])('detecteert component stijl: %s → %s', (answer, expected) => {
		const result = mapAnswersToGSD([mockAnswer({ answer })], DEFAULT_DESC, DEFAULT_NAME);
		expect(result.componentStyle).toBe(expected);
	});

	it('valt terug op rounded als er geen keywords zijn', () => {
		const result = mapAnswersToGSD(
			[mockAnswer({ answer: 'Mooie componenten bouwen' })],
			DEFAULT_DESC,
			DEFAULT_NAME
		);
		expect(result.componentStyle).toBe('rounded');
	});
});

// ============================================
// extractFeatures
// ============================================

describe('extractFeatures', () => {
	it('splitst meerdere features via komma en maakt ze apart aan', () => {
		const answers = [
			mockAnswer({
				specialist: 'requirements',
				question: 'Welke functionaliteiten?',
				answer: 'Login systeem, Dashboard, Profielpagina'
			})
		];
		const result = mapAnswersToGSD(answers, DEFAULT_DESC, DEFAULT_NAME);
		expect(result.coreFeatures).toHaveLength(3);
	});

	it('filtert placeholder-tekst zoals "etc." uit de features', () => {
		const answers = [
			mockAnswer({
				specialist: 'requirements',
				question: 'Welke functionaliteiten?',
				answer: 'Login, etc., Dashboard'
			})
		];
		const result = mapAnswersToGSD(answers, DEFAULT_DESC, DEFAULT_NAME);
		expect(result.coreFeatures).toHaveLength(2);
		const names = result.coreFeatures.map((f) => f.name);
		expect(names.some((n) => /^etc\.?$/i.test(n.trim()))).toBe(false);
	});

	it('geeft login feature must prioriteit op basis van kern-patroon', () => {
		const answers = [
			mockAnswer({
				specialist: 'requirements',
				question: 'Welke functionaliteiten?',
				answer: 'Login systeem, Dashboard, Exporteren'
			})
		];
		const result = mapAnswersToGSD(answers, DEFAULT_DESC, DEFAULT_NAME);
		const loginFeature = result.coreFeatures.find((f) =>
			f.name.toLowerCase().includes('login')
		);
		expect(loginFeature?.priority).toBe('must');
	});

	it('geeft dark mode feature nice prioriteit', () => {
		const answers = [
			mockAnswer({
				specialist: 'requirements',
				question: 'Welke functionaliteiten?',
				answer: 'Dark mode toggle, Login systeem, Dashboard'
			})
		];
		const result = mapAnswersToGSD(answers, DEFAULT_DESC, DEFAULT_NAME);
		const darkFeature = result.coreFeatures.find((f) =>
			f.name.toLowerCase().includes('dark mode')
		);
		expect(darkFeature?.priority).toBe('nice');
	});

	it('genereert opeenvolgende IDs F-001, F-002, F-003', () => {
		const answers = [
			mockAnswer({
				specialist: 'requirements',
				question: 'Welke functionaliteiten?',
				answer: 'Login systeem, Dashboard, Profielpagina'
			})
		];
		const result = mapAnswersToGSD(answers, DEFAULT_DESC, DEFAULT_NAME);
		expect(result.coreFeatures[0].id).toBe('F-001');
		expect(result.coreFeatures[1].id).toBe('F-002');
		expect(result.coreFeatures[2].id).toBe('F-003');
	});

	it('valt terug op Kernfunctionaliteit als er geen requirements antwoorden zijn', () => {
		const answers = [
			mockAnswer({ specialist: 'architect', answer: 'SvelteKit gebruiken' })
		];
		const result = mapAnswersToGSD(answers, DEFAULT_DESC, DEFAULT_NAME);
		expect(result.coreFeatures).toHaveLength(1);
		expect(result.coreFeatures[0].name).toBe('Kernfunctionaliteit');
	});

	it('voegt enkele feature alleen toe als de vraag over functionaliteit gaat', () => {
		// Enkele feature UIT een relevante vraag → wordt toegevoegd
		const withRelevantQuestion = [
			mockAnswer({
				specialist: 'requirements',
				question: 'Wat moet de app kunnen qua functionaliteit?',
				answer: 'Login systeem'
			})
		];
		const resultWith = mapAnswersToGSD(withRelevantQuestion, DEFAULT_DESC, DEFAULT_NAME);
		expect(resultWith.coreFeatures.some((f) => f.name.includes('Login'))).toBe(true);

		// Enkele feature UIT een niet-relevante vraag → wordt NIET toegevoegd (valt terug op default)
		const withIrrelevantQuestion = [
			mockAnswer({
				specialist: 'requirements',
				question: 'Hoe hoog is je budget?',
				answer: 'Login systeem'
			})
		];
		const resultWithout = mapAnswersToGSD(withIrrelevantQuestion, DEFAULT_DESC, DEFAULT_NAME);
		// Geen relevante vraag → fallback naar Kernfunctionaliteit
		expect(resultWithout.coreFeatures[0].name).toBe('Kernfunctionaliteit');
	});
});

// ============================================
// extractDataEntities
// ============================================

describe('extractDataEntities', () => {
	it('detecteert users en products entiteiten uit backend antwoord', () => {
		const answers = [
			mockAnswer({
				specialist: 'backend',
				answer: 'We hebben users en products in de database'
			})
		];
		const result = mapAnswersToGSD(answers, DEFAULT_DESC, DEFAULT_NAME);
		const entityNames = result.dataEntities.map((e) => e.name.toLowerCase());
		expect(entityNames.some((n) => n.includes('user'))).toBe(true);
		expect(entityNames.some((n) => n.includes('product'))).toBe(true);
	});

	it('voegt veld-template velden toe aan users entiteit', () => {
		const answers = [
			mockAnswer({
				specialist: 'backend',
				answer: 'users tabel nodig'
			})
		];
		const result = mapAnswersToGSD(answers, DEFAULT_DESC, DEFAULT_NAME);
		const usersEntity = result.dataEntities.find((e) => e.name.toLowerCase() === 'users');
		expect(usersEntity?.fields).toContain('id');
		expect(usersEntity?.fields).toContain('email');
		expect(usersEntity?.fields).toContain('name');
	});

	it('voegt user_id toe aan niet-users entiteiten als auth actief is', () => {
		const answers = [
			mockAnswer({
				specialist: 'architect',
				answer: 'email en wachtwoord authenticatie'
			}),
			mockAnswer({
				specialist: 'backend',
				answer: 'products tabel voor de webshop'
			})
		];
		const result = mapAnswersToGSD(answers, DEFAULT_DESC, DEFAULT_NAME);
		const productsEntity = result.dataEntities.find((e) =>
			e.name.toLowerCase().includes('product')
		);
		expect(productsEntity?.fields).toContain('user_id');
	});

	it('voegt automatisch Users toe als auth actief is maar users niet in antwoorden staat', () => {
		const answers = [
			mockAnswer({
				specialist: 'architect',
				answer: 'email en wachtwoord authenticatie'
			}),
			mockAnswer({
				specialist: 'backend',
				answer: 'products tabel nodig'
			})
		];
		const result = mapAnswersToGSD(answers, DEFAULT_DESC, DEFAULT_NAME);
		const hasUsers = result.dataEntities.some((e) => e.name.toLowerCase().includes('user'));
		expect(hasUsers).toBe(true);
	});
});

// ============================================
// Skipped antwoorden worden genegeerd
// ============================================

describe('skipped antwoorden', () => {
	it('negeert antwoorden met type skipped bij framework detectie', () => {
		const answers = [
			mockAnswer({ answer: 'nextjs framework gebruiken', type: 'skipped' }),
			mockAnswer({ answer: 'Geen voorkeur' })
		];
		const result = mapAnswersToGSD(answers, DEFAULT_DESC, DEFAULT_NAME);
		// De skipped nextjs answer telt niet mee, fallback is sveltekit
		expect(result.frontendFramework).toBe('sveltekit');
	});

	it('negeert skipped antwoorden bij feature extractie', () => {
		const answers = [
			mockAnswer({
				specialist: 'requirements',
				question: 'Welke functionaliteiten?',
				answer: 'Login, Dashboard, Profielpagina',
				type: 'skipped'
			})
		];
		const result = mapAnswersToGSD(answers, DEFAULT_DESC, DEFAULT_NAME);
		// Skipped requirements → valt terug op Kernfunctionaliteit
		expect(result.coreFeatures[0].name).toBe('Kernfunctionaliteit');
	});
});

// ============================================
// Lege antwoordenlijst → alle defaults
// ============================================

describe('lege antwoordenlijst', () => {
	it('vult alle velden met defaults als er geen antwoorden zijn', () => {
		const result = mapAnswersToGSD([], DEFAULT_DESC, DEFAULT_NAME);

		expect(result.projectName).toBe(DEFAULT_NAME);
		expect(result.projectGoal).toBe(DEFAULT_DESC);
		expect(result.frontendFramework).toBe('sveltekit');
		expect(result.database).toBe('supabase');
		expect(result.authMethod).toBe('email-password');
		expect(result.uiLibrary).toBe('skeleton');
		expect(result.stylingApproach).toBe('tailwind');
		expect(result.apiPattern).toBe('rest');
		expect(result.deploymentTarget).toBe('dokploy');
		expect(result.testStrategy).toBe('standard');
		expect(result.designStyle).toBe('minimalistisch');
		expect(result.colorScheme).toBe('light');
		expect(result.typography).toBe('sans-serif');
		expect(result.componentStyle).toBe('rounded');
		expect(result.coreFeatures).toHaveLength(1);
		expect(result.coreFeatures[0].name).toBe('Kernfunctionaliteit');
		expect(result.requiredMcps).toContain('filesystem');
	});
});

// ============================================
// mapAnswersToGSD — integratietest
// ============================================

describe('mapAnswersToGSD — integratietest', () => {
	it('vult alle velden met een complete set antwoorden', () => {
		const answers: WizardAnswer[] = [
			mockAnswer({ specialist: 'architect', answer: 'We gebruiken SvelteKit met Supabase' }),
			mockAnswer({ specialist: 'architect', answer: 'Email en wachtwoord authenticatie' }),
			mockAnswer({
				specialist: 'requirements',
				question: 'Welke functionaliteiten?',
				answer: 'Login, Dashboard, Profielpagina'
			}),
			mockAnswer({ specialist: 'frontend', answer: 'Skeleton UI met tailwind styling' }),
			mockAnswer({ specialist: 'frontend', answer: 'Sidebar navigatie' }),
			mockAnswer({ specialist: 'backend', answer: 'REST API met users en products tabellen' }),
			mockAnswer({ specialist: 'devops', answer: 'Deploy via Dokploy' }),
			mockAnswer({ specialist: 'testing', answer: 'Standaard test strategie met e2e' }),
			mockAnswer({
				specialist: 'design',
				answer: 'Zakelijk design, licht kleurenschema, sans-serif typografie, rounded componenten'
			})
		];

		const result = mapAnswersToGSD(answers, 'Een SaaS platform', 'MijnProject');

		expect(result.projectName).toBe('MijnProject');
		expect(result.projectGoal).toBe('Een SaaS platform');
		expect(result.frontendFramework).toBe('sveltekit');
		expect(result.database).toBe('supabase');
		expect(result.authMethod).toBe('email-password');
		expect(result.uiLibrary).toBe('skeleton');
		expect(result.navigationPattern).toBe('sidebar');
		expect(result.stylingApproach).toBe('tailwind');
		expect(result.apiPattern).toBe('rest');
		expect(result.deploymentTarget).toBe('dokploy');
		expect(result.testStrategy).toBe('standard');
		expect(result.designStyle).toBe('zakelijk');
		expect(result.colorScheme).toBe('light');
		expect(result.typography).toBe('sans-serif');
		expect(result.componentStyle).toBe('rounded');
		expect(result.coreFeatures.length).toBeGreaterThanOrEqual(3);
		expect(result.dataEntities.length).toBeGreaterThanOrEqual(2);
		expect(result.requiredMcps).toContain('filesystem');
	});
});
