import { describe, it, expect } from 'vitest';
import {
	generateClaudeMdTemplate,
	generatePromptMdTemplate,
	generateEnvExampleTemplate,
	generateMcpJsonTemplate,
	generateCoordinatorAgentTemplate,
	sanitizeJson,
	getFrameworkConventions,
	getSpecialistTemplate,
	getSkillTemplate
} from '$lib/generators/templates';
import type { WizardAnswers } from '$lib/types/gsd';

// ─── Factory ────────────────────────────────────────────────────────────────

function mockAnswers(overrides?: Partial<WizardAnswers>): WizardAnswers {
	return {
		projectName: 'Sieraden Webshop',
		projectGoal: 'Een webshop voor handgemaakte sieraden',
		problemDescription: 'Klanten willen online bestellen',
		targetUsers: 'Consumenten',
		techLevel: 'beginner',
		coreFeatures: [
			{
				id: 'feat-1',
				name: 'Productcatalogus',
				description: 'Producten tonen',
				priority: 'must',
				category: 'frontend'
			},
			{
				id: 'feat-2',
				name: 'Winkelwagen',
				description: 'Items toevoegen',
				priority: 'must',
				category: 'frontend'
			}
		],
		outOfScope: ['B2B verkoop'],
		frontendFramework: 'sveltekit',
		database: 'supabase',
		authMethod: 'email-password',
		uiLibrary: 'skeleton',
		navigationPattern: 'topbar',
		stylingApproach: 'tailwind',
		apiPattern: 'rest',
		dataEntities: [{ name: 'Products', fields: ['id', 'name', 'price'], relations: [] }],
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

// ─── Snapshot Tests ─────────────────────────────────────────────────────────

describe('generateClaudeMdTemplate', () => {
	it('output snapshot', () => {
		const result = generateClaudeMdTemplate(mockAnswers());
		expect(result).toMatchSnapshot();
	});
});

describe('generatePromptMdTemplate', () => {
	it('output snapshot', () => {
		const result = generatePromptMdTemplate(mockAnswers());
		expect(result).toMatchSnapshot();
	});
});

describe('generateEnvExampleTemplate', () => {
	it('output snapshot', () => {
		const result = generateEnvExampleTemplate(mockAnswers());
		expect(result).toMatchSnapshot();
	});
});

describe('generateMcpJsonTemplate', () => {
	it('output snapshot', () => {
		const result = generateMcpJsonTemplate(mockAnswers());
		expect(result).toMatchSnapshot();
	});
});

describe('generateCoordinatorAgentTemplate', () => {
	it('output snapshot', () => {
		const result = generateCoordinatorAgentTemplate(mockAnswers());
		expect(result).toMatchSnapshot();
	});
});

// ─── Structural Validation Tests ─────────────────────────────────────────────

describe('generateMcpJsonTemplate', () => {
	it('produceert geldige JSON', () => {
		const result = generateMcpJsonTemplate(mockAnswers());
		expect(() => JSON.parse(result)).not.toThrow();
	});
});

describe('generateEnvExampleTemplate', () => {
	it('bevat Supabase env vars', () => {
		const result = generateEnvExampleTemplate(mockAnswers());
		expect(result).toContain('PUBLIC_SUPABASE_URL');
		expect(result).toContain('PUBLIC_SUPABASE_ANON_KEY');
	});
});

describe('generateClaudeMdTemplate', () => {
	it('bevat projectnaam', () => {
		const answers = mockAnswers();
		const result = generateClaudeMdTemplate(answers);
		expect(result).toContain(answers.projectName);
	});

	it('met Next.js framework', () => {
		const result = generateClaudeMdTemplate(mockAnswers({ frontendFramework: 'nextjs' }));
		expect(result).toContain('Next.js');
	});
});

describe('getSpecialistTemplate', () => {
	it('retourneert markdown voor frontend', () => {
		const result = getSpecialistTemplate('frontend', mockAnswers());
		expect(result).toBeTruthy();
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});

	it('retourneert markdown voor backend', () => {
		const result = getSpecialistTemplate('backend', mockAnswers());
		expect(result).toBeTruthy();
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});
});

describe('getSkillTemplate', () => {
	it('retourneert markdown voor design', () => {
		const result = getSkillTemplate('frontend', mockAnswers());
		expect(result).toBeTruthy();
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});
});

describe('sanitizeJson', () => {
	it('verwijdert control characters', () => {
		const input = 'hello\u0000world';
		const result = sanitizeJson(input);
		expect(result).not.toContain('\u0000');
		expect(result).toBe('helloworld');
	});
});

describe('getFrameworkConventions', () => {
	it('retourneert tekst voor sveltekit', () => {
		const result = getFrameworkConventions('sveltekit');
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
		expect(result.toLowerCase()).toContain('svelte');
	});

	it('retourneert tekst voor nextjs', () => {
		const result = getFrameworkConventions('nextjs');
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
		expect(result.toLowerCase()).toContain('react');
	});
});
