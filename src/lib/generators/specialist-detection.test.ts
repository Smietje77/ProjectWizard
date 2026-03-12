// src/lib/generators/specialist-detection.test.ts

import {
	detectRequiredSpecialists,
	getActiveSpecialists,
	getActiveSkills
} from '$lib/generators/specialist-detection';
import type { WizardAnswers } from '$lib/types/gsd';

function mockAnswers(overrides?: Partial<WizardAnswers>): WizardAnswers {
	return {
		projectName: 'Test Webshop',
		projectGoal: 'Een webshop voor handgemaakte sieraden',
		problemDescription: 'Klanten willen online bestellen',
		targetUsers: 'Consumenten die sieraden kopen',
		techLevel: 'beginner',
		coreFeatures: [
			{ id: 'feat-1', name: 'Productcatalogus', description: 'Producten tonen', priority: 'must', category: 'frontend' },
			{ id: 'feat-2', name: 'Winkelwagen', description: 'Items toevoegen', priority: 'must', category: 'frontend' }
		],
		outOfScope: ['B2B verkoop'],
		frontendFramework: 'sveltekit',
		database: 'supabase',
		authMethod: 'email-password',
		uiLibrary: 'skeleton',
		navigationPattern: 'topbar',
		stylingApproach: 'tailwind',
		apiPattern: 'rest',
		dataEntities: [
			{ name: 'Products', fields: ['id', 'name', 'price'], relations: [] }
		],
		deploymentTarget: 'dokploy',
		hasDomain: false,
		requiredMcps: ['supabase'],
		externalServices: [],
		testStrategy: 'standard',
		criticalFlows: ['Bestelling plaatsen'],
		designStyle: 'minimalistisch',
		colorScheme: 'light',
		typography: 'sans-serif',
		componentStyle: 'rounded',
		screenshotAnalysis: null,
		confirmedEffects: null,
		...overrides
	};
}

// ============================================
// detectRequiredSpecialists — always-present
// ============================================

describe('frontend en backend zijn altijd aanwezig', () => {
	it('frontend heeft needed=true ongeacht antwoorden', () => {
		const specialists = detectRequiredSpecialists(mockAnswers());
		const frontend = specialists.find((s) => s.id === 'frontend');
		expect(frontend).toBeDefined();
		expect(frontend?.needed).toBe(true);
	});

	it('backend heeft needed=true ongeacht antwoorden', () => {
		const specialists = detectRequiredSpecialists(mockAnswers());
		const backend = specialists.find((s) => s.id === 'backend');
		expect(backend).toBeDefined();
		expect(backend?.needed).toBe(true);
	});
});

// ============================================
// Testing specialist
// ============================================

describe('testing specialist', () => {
	it('niet nodig bij minimal testStrategy', () => {
		const specialists = detectRequiredSpecialists(mockAnswers({ testStrategy: 'minimal' }));
		const testing = specialists.find((s) => s.id === 'testing');
		expect(testing?.needed).toBe(false);
	});

	it('wel nodig bij standard testStrategy', () => {
		const specialists = detectRequiredSpecialists(mockAnswers({ testStrategy: 'standard' }));
		const testing = specialists.find((s) => s.id === 'testing');
		expect(testing?.needed).toBe(true);
	});

	it('wel nodig bij comprehensive testStrategy', () => {
		const specialists = detectRequiredSpecialists(mockAnswers({ testStrategy: 'comprehensive' }));
		const testing = specialists.find((s) => s.id === 'testing');
		expect(testing?.needed).toBe(true);
	});
});

// ============================================
// Integration specialist
// ============================================

describe('integration specialist', () => {
	it('niet nodig zonder externe services en met slechts 1 MCP', () => {
		const specialists = detectRequiredSpecialists(
			mockAnswers({ externalServices: [], requiredMcps: ['supabase'] })
		);
		const integration = specialists.find((s) => s.id === 'integration');
		expect(integration?.needed).toBe(false);
	});

	it('wel nodig met externe services', () => {
		const specialists = detectRequiredSpecialists(
			mockAnswers({
				externalServices: [{ name: 'Stripe', purpose: 'Betalingen' }],
				requiredMcps: ['supabase']
			})
		);
		const integration = specialists.find((s) => s.id === 'integration');
		expect(integration?.needed).toBe(true);
	});

	it('wel nodig met meer dan 1 MCP', () => {
		const specialists = detectRequiredSpecialists(
			mockAnswers({ externalServices: [], requiredMcps: ['supabase', 'github'] })
		);
		const integration = specialists.find((s) => s.id === 'integration');
		expect(integration?.needed).toBe(true);
	});
});

// ============================================
// DevOps specialist
// ============================================

describe('devops specialist', () => {
	it('nodig bij dokploy deployment', () => {
		const specialists = detectRequiredSpecialists(
			mockAnswers({ deploymentTarget: 'dokploy', hasDomain: false })
		);
		const devops = specialists.find((s) => s.id === 'devops');
		expect(devops?.needed).toBe(true);
	});

	it('niet nodig bij vercel zonder custom domain', () => {
		const specialists = detectRequiredSpecialists(
			mockAnswers({ deploymentTarget: 'vercel', hasDomain: false })
		);
		const devops = specialists.find((s) => s.id === 'devops');
		expect(devops?.needed).toBe(false);
	});

	it('nodig bij vercel mét custom domain', () => {
		const specialists = detectRequiredSpecialists(
			mockAnswers({ deploymentTarget: 'vercel', hasDomain: true })
		);
		const devops = specialists.find((s) => s.id === 'devops');
		expect(devops?.needed).toBe(true);
	});
});

// ============================================
// Security specialist
// ============================================

describe('security specialist', () => {
	it('nodig bij GDPR keyword in projectGoal', () => {
		const specialists = detectRequiredSpecialists(
			mockAnswers({ projectGoal: 'Een GDPR-compliant platform voor medische data' })
		);
		const security = specialists.find((s) => s.id === 'security');
		expect(security?.needed).toBe(true);
	});

	it('nodig bij compliance keyword in problemDescription', () => {
		const specialists = detectRequiredSpecialists(
			mockAnswers({ problemDescription: 'Bedrijven worstelen met compliance vereisten' })
		);
		const security = specialists.find((s) => s.id === 'security');
		expect(security?.needed).toBe(true);
	});

	it('niet nodig zonder security keywords', () => {
		const specialists = detectRequiredSpecialists(
			mockAnswers({
				projectGoal: 'Een webshop voor handgemaakte sieraden',
				problemDescription: 'Klanten willen online bestellen',
				outOfScope: ['B2B verkoop']
			})
		);
		const security = specialists.find((s) => s.id === 'security');
		expect(security?.needed).toBe(false);
	});

	it('herkent security keyword case-insensitief', () => {
		const specialists = detectRequiredSpecialists(
			mockAnswers({ projectGoal: 'Een platform met NIS2 certificering' })
		);
		const security = specialists.find((s) => s.id === 'security');
		expect(security?.needed).toBe(true);
	});
});

// ============================================
// getActiveSpecialists
// ============================================

describe('getActiveSpecialists filtert op needed=true', () => {
	it('bevat altijd frontend en backend', () => {
		const active = getActiveSpecialists(mockAnswers({ testStrategy: 'minimal' }));
		const ids = active.map((s) => s.id);
		expect(ids).toContain('frontend');
		expect(ids).toContain('backend');
	});

	it('bevat geen specialists met needed=false', () => {
		// minimal test + vercel zonder domain + geen externe services → testing en devops weg
		const active = getActiveSpecialists(
			mockAnswers({
				testStrategy: 'minimal',
				deploymentTarget: 'vercel',
				hasDomain: false,
				externalServices: [],
				requiredMcps: ['supabase']
			})
		);
		const ids = active.map((s) => s.id);
		expect(ids).not.toContain('testing');
		expect(ids).not.toContain('devops');
		expect(ids).not.toContain('integration');
	});

	it('bevat testing specialist bij standard strategie', () => {
		const active = getActiveSpecialists(mockAnswers({ testStrategy: 'standard' }));
		const ids = active.map((s) => s.id);
		expect(ids).toContain('testing');
	});

	it('retourneert enkel DetectedSpecialist objecten met needed=true', () => {
		const active = getActiveSpecialists(mockAnswers());
		expect(active.every((s) => s.needed)).toBe(true);
	});
});

// ============================================
// getActiveSkills
// ============================================

describe('getActiveSkills filtert op skillNeeded=true', () => {
	it('retourneert enkel specialists met skillNeeded=true en een skillFile', () => {
		const skills = getActiveSkills(mockAnswers());
		expect(skills.every((s) => s.skillNeeded && s.skillFile !== null)).toBe(true);
	});

	it('bevat design skill (frontend heeft altijd skillNeeded=true)', () => {
		const skills = getActiveSkills(mockAnswers());
		const skillFiles = skills.map((s) => s.skillFile);
		expect(skillFiles).toContain('.claude/skills/design.md');
	});

	it('bevat backend skill (backend heeft altijd skillNeeded=true)', () => {
		const skills = getActiveSkills(mockAnswers());
		const skillFiles = skills.map((s) => s.skillFile);
		expect(skillFiles).toContain('.claude/skills/backend.md');
	});

	it('sluit testing skill uit bij minimal testStrategy', () => {
		const skills = getActiveSkills(mockAnswers({ testStrategy: 'minimal' }));
		const skillFiles = skills.map((s) => s.skillFile);
		expect(skillFiles).not.toContain('.claude/skills/testing.md');
	});

	it('bevat testing skill bij standard testStrategy', () => {
		const skills = getActiveSkills(mockAnswers({ testStrategy: 'standard' }));
		const skillFiles = skills.map((s) => s.skillFile);
		expect(skillFiles).toContain('.claude/skills/testing.md');
	});
});
