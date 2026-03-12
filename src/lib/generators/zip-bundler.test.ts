// src/lib/generators/zip-bundler.test.ts

import JSZip from 'jszip';
import { generateProjectBundle } from '$lib/generators/zip-bundler';
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

/** Laad een gegenereerde Blob terug als JSZip en retourneer alle bestandspaden. */
async function loadZipFiles(blob: Blob): Promise<string[]> {
	const buffer = await blob.arrayBuffer();
	const zip = await JSZip.loadAsync(buffer);
	return Object.keys(zip.files);
}

// ============================================
// generateProjectBundle retourneert een Blob
// ============================================

describe('generateProjectBundle retourneert een Blob', () => {
	it('retourneert een Blob instantie', async () => {
		const answers = mockAnswers();
		const result = await generateProjectBundle(answers, { projectName: 'Test Webshop' });
		expect(result).toBeInstanceOf(Blob);
	});

	it('Blob heeft een positieve grootte', async () => {
		const answers = mockAnswers();
		const result = await generateProjectBundle(answers, { projectName: 'Test Webshop' });
		expect(result.size).toBeGreaterThan(0);
	});
});

// ============================================
// ZIP bevat .planning/ folder met 6 bestanden
// ============================================

describe('ZIP bevat .planning/ folder met 6 bestanden', () => {
	it('bevat PROJECT.md in .planning/', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('.planning/PROJECT.md'))).toBe(true);
	});

	it('bevat REQUIREMENTS.md in .planning/', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('.planning/REQUIREMENTS.md'))).toBe(true);
	});

	it('bevat ROADMAP.md in .planning/', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('.planning/ROADMAP.md'))).toBe(true);
	});

	it('bevat config.json in .planning/', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('.planning/config.json'))).toBe(true);
	});

	it('bevat INITIAL_CONTEXT.md in .planning/', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('.planning/INITIAL_CONTEXT.md'))).toBe(true);
	});

	it('bevat STATE.md in .planning/', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('.planning/STATE.md'))).toBe(true);
	});

	it('heeft precies 6 bestanden in .planning/', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		const planningFiles = files.filter((f) => f.includes('.planning/') && !f.endsWith('/'));
		expect(planningFiles).toHaveLength(6);
	});
});

// ============================================
// ZIP bevat coordinator agent
// ============================================

describe('ZIP bevat coordinator agent', () => {
	it('bevat agents/coordinator.md', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('agents/coordinator.md'))).toBe(true);
	});
});

// ============================================
// ZIP bevat active specialist agents
// ============================================

describe('ZIP bevat active specialist agents', () => {
	it('bevat frontend specialist agent (altijd aanwezig)', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('agents/specialists/frontend.md'))).toBe(true);
	});

	it('bevat backend specialist agent (altijd aanwezig)', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('agents/specialists/backend.md'))).toBe(true);
	});

	it('bevat testing specialist agent bij standard testStrategy', async () => {
		const blob = await generateProjectBundle(
			mockAnswers({ testStrategy: 'standard' }),
			{ projectName: 'Test Webshop' }
		);
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('agents/specialists/testing.md'))).toBe(true);
	});

	it('bevat geen testing specialist agent bij minimal testStrategy', async () => {
		const blob = await generateProjectBundle(
			mockAnswers({ testStrategy: 'minimal' }),
			{ projectName: 'Test Webshop' }
		);
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('agents/specialists/testing.md'))).toBe(false);
	});

	it('bevat devops specialist agent bij dokploy deployment', async () => {
		const blob = await generateProjectBundle(
			mockAnswers({ deploymentTarget: 'dokploy', hasDomain: false }),
			{ projectName: 'Test Webshop' }
		);
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('agents/specialists/devops.md'))).toBe(true);
	});

	it('bevat geen devops specialist agent bij vercel zonder domain', async () => {
		const blob = await generateProjectBundle(
			mockAnswers({ deploymentTarget: 'vercel', hasDomain: false }),
			{ projectName: 'Test Webshop' }
		);
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('agents/specialists/devops.md'))).toBe(false);
	});

	it('bevat security specialist agent bij GDPR keyword', async () => {
		const blob = await generateProjectBundle(
			mockAnswers({ projectGoal: 'GDPR-compliant platform voor gezondheidszorg' }),
			{ projectName: 'Test Webshop' }
		);
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('agents/specialists/security.md'))).toBe(true);
	});
});

// ============================================
// ZIP bevat active skills
// ============================================

describe('ZIP bevat active skills', () => {
	it('bevat design.md skill (frontend is altijd actief)', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('.claude/skills/design.md'))).toBe(true);
	});

	it('bevat backend.md skill (backend is altijd actief)', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('.claude/skills/backend.md'))).toBe(true);
	});

	it('bevat testing.md skill bij standard testStrategy', async () => {
		const blob = await generateProjectBundle(
			mockAnswers({ testStrategy: 'standard' }),
			{ projectName: 'Test Webshop' }
		);
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('.claude/skills/testing.md'))).toBe(true);
	});

	it('bevat geen testing.md skill bij minimal testStrategy', async () => {
		const blob = await generateProjectBundle(
			mockAnswers({ testStrategy: 'minimal' }),
			{ projectName: 'Test Webshop' }
		);
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.includes('.claude/skills/testing.md'))).toBe(false);
	});
});

// ============================================
// ZIP bevat CLAUDE.md en PROMPT.md
// ============================================

describe('ZIP bevat CLAUDE.md en PROMPT.md', () => {
	it('bevat CLAUDE.md', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.endsWith('CLAUDE.md'))).toBe(true);
	});

	it('bevat PROMPT.md', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.endsWith('PROMPT.md'))).toBe(true);
	});

	it('bevat .env.example', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.endsWith('.env.example'))).toBe(true);
	});

	it('bevat .mcp.json', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.endsWith('.mcp.json'))).toBe(true);
	});

	it('bevat TEAM.md', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.endsWith('TEAM.md'))).toBe(true);
	});

	it('bevat manifest.json', async () => {
		const blob = await generateProjectBundle(mockAnswers(), { projectName: 'Test Webshop' });
		const files = await loadZipFiles(blob);
		expect(files.some((f) => f.endsWith('manifest.json'))).toBe(true);
	});
});
