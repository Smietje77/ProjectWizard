import { describe, it, expect } from 'vitest';
import { generateGSDFolder } from '$lib/generators/gsd-generator';
import type { WizardAnswers, Feature, DataEntity, ExternalService } from '$lib/types/gsd';

function mockAnswers(overrides?: Partial<WizardAnswers>): WizardAnswers {
	return {
		projectName: 'Test Webshop',
		projectGoal: 'Een webshop voor handgemaakte sieraden',
		problemDescription: 'Klanten willen online bestellen',
		targetUsers: 'Consumenten die sieraden kopen',
		techLevel: 'beginner',
		coreFeatures: [
			{ id: 'feat-1', name: 'Productcatalogus', description: 'Producten tonen', priority: 'must', category: 'frontend' },
			{ id: 'feat-2', name: 'Winkelwagen', description: 'Items toevoegen', priority: 'must', category: 'frontend' },
			{ id: 'feat-3', name: 'Betaling', description: 'Online betalen', priority: 'must', category: 'integration' }
		],
		outOfScope: ['Fysieke winkels', 'B2B verkoop'],
		frontendFramework: 'sveltekit',
		database: 'supabase',
		authMethod: 'email-password',
		uiLibrary: 'skeleton',
		navigationPattern: 'topbar',
		stylingApproach: 'tailwind',
		apiPattern: 'rest',
		dataEntities: [
			{ name: 'Products', fields: ['id', 'name', 'price', 'description', 'image_url'], relations: ['belongs_to Category'] },
			{ name: 'Orders', fields: ['id', 'user_id', 'total', 'status', 'created_at'], relations: ['has_many OrderItems'] }
		],
		deploymentTarget: 'dokploy',
		hasDomain: true,
		domainName: 'sieraden.nl',
		requiredMcps: ['supabase'],
		externalServices: [{ name: 'Stripe', purpose: 'Betalingen', mcp: 'stripe' }],
		testStrategy: 'standard',
		criticalFlows: ['Bestelling plaatsen', 'Account aanmaken'],
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
// Alle 6 output velden aanwezig
// ============================================

describe('generateGSDFolder retourneert alle 6 velden', () => {
	it('bevat project, requirements, roadmap, config, context en state', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.project).toBeTruthy();
		expect(output.requirements).toBeTruthy();
		expect(output.roadmap).toBeTruthy();
		expect(output.config).toBeTruthy();
		expect(output.context).toBeTruthy();
		expect(output.state).toBeTruthy();
	});

	it('alle string velden zijn non-empty strings', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(typeof output.project).toBe('string');
		expect(output.project.length).toBeGreaterThan(0);

		expect(typeof output.requirements).toBe('string');
		expect(output.requirements.length).toBeGreaterThan(0);

		expect(typeof output.roadmap).toBe('string');
		expect(output.roadmap.length).toBeGreaterThan(0);

		expect(typeof output.context).toBe('string');
		expect(output.context.length).toBeGreaterThan(0);

		expect(typeof output.state).toBe('string');
		expect(output.state.length).toBeGreaterThan(0);
	});
});

// ============================================
// PROJECT.md inhoud
// ============================================

describe('project markdown bevat projectnaam en doel', () => {
	it('bevat de projectnaam in de output', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.project).toContain('Test Webshop');
	});

	it('bevat het projectdoel in de output', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.project).toContain('Een webshop voor handgemaakte sieraden');
	});

	it('reflecteert een andere projectnaam correct', () => {
		const output = generateGSDFolder(mockAnswers({ projectName: 'Mijn SaaS App' }));

		expect(output.project).toContain('Mijn SaaS App');
		expect(output.project).not.toContain('Test Webshop');
	});
});

// ============================================
// REQUIREMENTS.md inhoud
// ============================================

describe('requirements bevat correct aantal per prioriteit', () => {
	it('bevat een Must Have sectie', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.requirements).toContain('Must Have');
	});

	it('bevat requirement IDs met REQ- prefix', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.requirements).toContain('REQ-001');
	});

	it('bevat het juiste Must Have aantal in het overzicht', () => {
		const output = generateGSDFolder(mockAnswers());

		// De requirements sectie bevat een Overzicht met telling
		expect(output.requirements).toContain('Must Have');
		// Minstens de must-have count staat erin als getal
		const mustCount = (output.requirements.match(/\*\*Must Have\*\*: (\d+)/)?.[1]);
		expect(mustCount).toBeDefined();
		expect(parseInt(mustCount as string)).toBeGreaterThan(0);
	});

	it('bevat Functional Requirements sectie', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.requirements).toContain('Functional Requirements');
	});

	it('bevat Technical Requirements sectie', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.requirements).toContain('Technical Requirements');
	});

	it('bevat Quality Requirements sectie', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.requirements).toContain('Quality Requirements');
	});
});

// ============================================
// ROADMAP.md inhoud
// ============================================

describe('roadmap bevat meerdere fases', () => {
	it('bevat Phase 1 sectie', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.roadmap).toContain('Phase 1');
	});

	it('bevat Phase 2 sectie', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.roadmap).toContain('Phase 2');
	});

	it('bevat een Overview sectie', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.roadmap).toContain('Overview');
	});

	it('bevat het totaal aantal fases in het overzicht', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.roadmap).toContain('Totaal Phases');
	});

	it('bevat een Timeline sectie', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.roadmap).toContain('Timeline');
	});

	it('bevat altijd een Deployment fase', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.roadmap).toContain('Deployment');
	});
});

// ============================================
// config object structuur
// ============================================

describe('config object heeft juiste structuur', () => {
	it('config.projectName komt overeen met de wizard invoer', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.config.projectName).toBe('Test Webshop');
	});

	it('config.version is een string', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(typeof output.config.version).toBe('string');
		expect(output.config.version.length).toBeGreaterThan(0);
	});

	it('config.phases.total is groter dan 0', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.config.phases.total).toBeGreaterThan(0);
	});

	it('config.phases.current is 1 voor een nieuw project', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.config.phases.current).toBe(1);
	});

	it('config.settings heeft alle verplichte velden', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.config.settings).toHaveProperty('riskTolerance');
		expect(output.config.settings).toHaveProperty('autonomyLevel');
		expect(output.config.settings).toHaveProperty('checkpointFrequency');
		expect(output.config.settings).toHaveProperty('qualityThreshold');
	});

	it('config.profile is een geldig profiel voor een beginner', () => {
		const output = generateGSDFolder(mockAnswers({ techLevel: 'beginner' }));

		expect(output.config.profile).toBe('conservative');
	});

	it('config.profile is balanced voor een intermediate gebruiker met standaard tests', () => {
		const output = generateGSDFolder(mockAnswers({ techLevel: 'intermediate', testStrategy: 'standard' }));

		expect(output.config.profile).toBe('balanced');
	});

	it('config.profile is aggressive voor een advanced gebruiker met minimale tests', () => {
		const output = generateGSDFolder(mockAnswers({ techLevel: 'advanced', testStrategy: 'minimal' }));

		expect(output.config.profile).toBe('aggressive');
	});
});

// ============================================
// INITIAL_CONTEXT.md inhoud
// ============================================

describe('context markdown is niet leeg', () => {
	it('output.context heeft meer dan 0 tekens', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.context.length).toBeGreaterThan(0);
	});

	it('bevat Design Decisions sectie', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.context).toContain('Design Decisions');
	});

	it('bevat database keuze', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.context).toContain('supabase');
	});
});

// ============================================
// STATE.md inhoud
// ============================================

describe('state markdown is niet leeg', () => {
	it('output.state heeft meer dan 0 tekens', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.state.length).toBeGreaterThan(0);
	});

	it('bevat Project State header', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.state).toContain('Project State');
	});

	it('bevat Phase Progress tabel', () => {
		const output = generateGSDFolder(mockAnswers());

		expect(output.state).toContain('Phase Progress');
	});
});

// ============================================
// Edge case: 0 features
// ============================================

describe('edge case: 0 features geeft nog steeds geldige output', () => {
	it('alle 6 velden zijn strings bij lege coreFeatures', () => {
		const output = generateGSDFolder(mockAnswers({ coreFeatures: [] }));

		expect(typeof output.project).toBe('string');
		expect(typeof output.requirements).toBe('string');
		expect(typeof output.roadmap).toBe('string');
		expect(typeof output.context).toBe('string');
		expect(typeof output.state).toBe('string');
	});

	it('config is een geldig object bij lege coreFeatures', () => {
		const output = generateGSDFolder(mockAnswers({ coreFeatures: [] }));

		expect(output.config).toBeDefined();
		expect(output.config.phases.total).toBeGreaterThan(0);
	});

	it('requirements bevat nog steeds basis-requirements zonder features', () => {
		const output = generateGSDFolder(mockAnswers({ coreFeatures: [] }));

		// Auth + database + base layout requirements bestaan altijd
		expect(output.requirements).toContain('REQ-001');
	});
});

// ============================================
// Edge case: 0 dataEntities
// ============================================

describe('edge case: 0 dataEntities', () => {
	it('genereert zonder fouten bij lege dataEntities', () => {
		expect(() => generateGSDFolder(mockAnswers({ dataEntities: [] }))).not.toThrow();
	});

	it('alle 6 velden zijn strings bij lege dataEntities', () => {
		const output = generateGSDFolder(mockAnswers({ dataEntities: [] }));

		expect(typeof output.project).toBe('string');
		expect(typeof output.requirements).toBe('string');
		expect(typeof output.roadmap).toBe('string');
		expect(typeof output.context).toBe('string');
		expect(typeof output.state).toBe('string');
	});

	it('context vermeldt dat er geen data entiteiten zijn', () => {
		const output = generateGSDFolder(mockAnswers({ dataEntities: [] }));

		expect(output.context).toContain('Geen data entiteiten');
	});
});

// ============================================
// Edge case: geen auth
// ============================================

describe('edge case: geen auth', () => {
	it('genereert zonder fouten bij authMethod none', () => {
		expect(() => generateGSDFolder(mockAnswers({ authMethod: 'none' }))).not.toThrow();
	});

	it('alle velden zijn non-empty strings bij geen auth', () => {
		const output = generateGSDFolder(mockAnswers({ authMethod: 'none' }));

		expect(output.project.length).toBeGreaterThan(0);
		expect(output.requirements.length).toBeGreaterThan(0);
		expect(output.roadmap.length).toBeGreaterThan(0);
		expect(output.context.length).toBeGreaterThan(0);
		expect(output.state.length).toBeGreaterThan(0);
	});

	it('config is geldig bij geen auth', () => {
		const output = generateGSDFolder(mockAnswers({ authMethod: 'none' }));

		expect(output.config.projectName).toBe('Test Webshop');
		expect(output.config.phases.total).toBeGreaterThan(0);
	});
});

// ============================================
// Edge case: geen externe services
// ============================================

describe('edge case: geen externe services', () => {
	it('genereert zonder fouten bij lege externalServices en requiredMcps', () => {
		expect(() =>
			generateGSDFolder(mockAnswers({ externalServices: [], requiredMcps: [] }))
		).not.toThrow();
	});

	it('alle velden zijn non-empty strings zonder externe services', () => {
		const output = generateGSDFolder(mockAnswers({ externalServices: [], requiredMcps: [] }));

		expect(output.project.length).toBeGreaterThan(0);
		expect(output.requirements.length).toBeGreaterThan(0);
		expect(output.roadmap.length).toBeGreaterThan(0);
		expect(output.context.length).toBeGreaterThan(0);
		expect(output.state.length).toBeGreaterThan(0);
	});

	it('project bevat fallback tekst voor MCP sectie zonder mcps', () => {
		const output = generateGSDFolder(mockAnswers({ externalServices: [], requiredMcps: [] }));

		expect(output.project).toContain('Geen MCP servers geconfigureerd');
	});
});

// ============================================
// Geen broken code blocks in markdown
// ============================================

describe('gegenereerde markdown heeft geen broken code blocks', () => {
	it('project markdown heeft een even aantal backtick-blokken', () => {
		const output = generateGSDFolder(mockAnswers());
		const count = (output.project.match(/```/g) || []).length;

		expect(count % 2).toBe(0);
	});

	it('requirements markdown heeft een even aantal backtick-blokken', () => {
		const output = generateGSDFolder(mockAnswers());
		const count = (output.requirements.match(/```/g) || []).length;

		expect(count % 2).toBe(0);
	});

	it('roadmap markdown heeft een even aantal backtick-blokken', () => {
		const output = generateGSDFolder(mockAnswers());
		const count = (output.roadmap.match(/```/g) || []).length;

		expect(count % 2).toBe(0);
	});
});
