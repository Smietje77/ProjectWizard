// src/lib/generators/skill-generator.ts
// Genereert projectspecifieke skills voor alle actieve specialists
// Skills 2.0: elke skill krijgt YAML frontmatter met categorie en retirement metadata

import type { DetectedSpecialist } from './specialist-detection';
import type { WizardAnswer } from '$lib/types';
import type { WizardAnswers } from '$lib/types/gsd';
import {
	generateBackendSkillTemplate,
	generateTestingSkillTemplate,
	generateDeploymentSkillTemplate,
	generateIntegrationSkillTemplate,
	generateSecuritySkillTemplate,
	getFrameworkConventions
} from './templates';
import { streamWithRetry } from '$lib/server/anthropic-client';
import {
	BACKEND_SKILL_PROMPT,
	TESTING_SKILL_PROMPT,
	DEPLOYMENT_SKILL_PROMPT,
	INTEGRATION_SKILL_PROMPT,
	SECURITY_SKILL_PROMPT
} from '$lib/prompts/generator';

// ─── Skill Categorieën (Skills 2.0) ────────────────────────────────────────
// capability_uplift: leert het model nieuwe kennis/technieken (kan verouderen bij nieuw model)
// workflow:          legt een vast proces of voorkeur vast (blijft relevant ongeacht model)

export type SkillCategory = 'capability_uplift' | 'workflow';

/** Mapping: specialist id → skill categorie */
const SKILL_CATEGORIES: Record<string, SkillCategory> = {
	backend: 'capability_uplift',   // leert model projectspecifieke DB/API patronen
	testing: 'capability_uplift',   // leert model framework-specifieke test technieken
	security: 'capability_uplift',  // leert model compliance/security patronen
	devops: 'workflow',             // vast deploymentproces, onafhankelijk van model
	integration: 'workflow',        // vaste API client/MCP configuratie
};

/**
 * Genereer YAML frontmatter voor een skill.
 * Capability skills krijgen een retirement-waarschuwing.
 * De categorie wordt bepaald door:
 *   1. skillCategory uit wizard-antwoorden (Coordinator bepaalt dit dynamisch)
 *   2. Fallback: hardcoded SKILL_CATEGORIES mapping
 */
function generateSkillFrontmatter(
	specialistId: string,
	projectName: string,
	answers?: import('$lib/types').WizardAnswer[]
): string {
	// Probeer eerst de categorie uit de wizard-antwoorden te halen
	// De Coordinator stuurt skill_categorie mee per antwoord
	let category: SkillCategory = SKILL_CATEGORIES[specialistId] ?? 'workflow';
	if (answers) {
		const specialistAnswers = answers.filter(a => a.specialist === specialistId && a.skillCategory);
		if (specialistAnswers.length > 0) {
			// Gebruik de laatste expliciete categorisatie van de Coordinator
			category = specialistAnswers[specialistAnswers.length - 1].skillCategory!;
		}
	}

	const today = new Date().toISOString().split('T')[0];

	const lines = [
		'---',
		`name: ${specialistId}-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
		`category: ${category}`,
		`created: ${today}`,
	];

	if (category === 'capability_uplift') {
		lines.push(
			'review_after_model_update: true',
			'retirement_note: >',
			'  Deze skill compenseert een beperking van het huidige model.',
			'  Controleer bij de volgende grote Anthropic model-update',
			'  (bijv. Opus 5, Sonnet 4.5+) of deze skill nog waarde toevoegt.',
			'  Voer een A/B test uit: dezelfde prompt met en zonder skill.',
		);
	} else {
		lines.push(
			'review_after_model_update: false',
			'# Workflow skills blijven relevant ongeacht modelversie',
		);
	}

	lines.push('---', '');
	return lines.join('\n');
}

/** Mapping van specialist id naar system prompt */
const SKILL_PROMPTS: Record<string, string> = {
	backend: BACKEND_SKILL_PROMPT,
	testing: TESTING_SKILL_PROMPT,
	devops: DEPLOYMENT_SKILL_PROMPT,
	integration: INTEGRATION_SKILL_PROMPT,
	security: SECURITY_SKILL_PROMPT
};

/** Mapping van specialist id naar template fallback */
const SKILL_TEMPLATES: Record<string, (answers: WizardAnswers) => string> = {
	backend: generateBackendSkillTemplate,
	testing: generateTestingSkillTemplate,
	devops: generateDeploymentSkillTemplate,
	integration: generateIntegrationSkillTemplate,
	security: generateSecuritySkillTemplate
};

/**
 * Bouw gestructureerde context string uit GSD antwoorden.
 */
function buildStructuredContext(gsdAnswers: WizardAnswers): string {
	const parts = [
		`Project: ${gsdAnswers.projectName}`,
		`Doel: ${gsdAnswers.projectGoal}`,
		`Probleem: ${gsdAnswers.problemDescription}`,
		`Framework: ${gsdAnswers.frontendFramework} (${getFrameworkConventions(gsdAnswers.frontendFramework)})`,
		`Database: ${gsdAnswers.database}`,
		`Auth: ${gsdAnswers.authMethod}`,
		`API Pattern: ${gsdAnswers.apiPattern}`,
		`UI Library: ${gsdAnswers.uiLibrary}`,
		`Styling: ${gsdAnswers.stylingApproach}`,
		`Deployment: ${gsdAnswers.deploymentTarget}`,
		`Test Strategie: ${gsdAnswers.testStrategy}`,
	];

	if (gsdAnswers.dataEntities.length > 0) {
		parts.push(`Entities: ${gsdAnswers.dataEntities.map(e => `${e.name} (${e.fields.join(', ')})`).join('; ')}`);
	}
	if (gsdAnswers.externalServices.length > 0) {
		parts.push(`Externe Services: ${gsdAnswers.externalServices.map(s => `${s.name} (${s.purpose})`).join(', ')}`);
	}
	if (gsdAnswers.requiredMcps.length > 0) {
		parts.push(`MCPs: ${gsdAnswers.requiredMcps.join(', ')}`);
	}
	if (gsdAnswers.criticalFlows.length > 0) {
		parts.push(`Kritieke Flows: ${gsdAnswers.criticalFlows.join(', ')}`);
	}
	if (gsdAnswers.hasDomain && gsdAnswers.domainName) {
		parts.push(`Domain: ${gsdAnswers.domainName}`);
	}
	return parts.join('\n');
}

/**
 * Genereer een enkele skill met AI enrichment + template fallback.
 * Skills 2.0: voegt automatisch YAML frontmatter toe met categorie en retirement metadata.
 */
async function generateEnrichedSkill(
	specialistId: string,
	answers: WizardAnswer[],
	gsdAnswers: WizardAnswers
): Promise<string> {
	const prompt = SKILL_PROMPTS[specialistId];
	const templateFn = SKILL_TEMPLATES[specialistId];

	if (!prompt || !templateFn) {
		console.warn(`Geen skill prompt/template voor specialist: ${specialistId}`);
		return '';
	}

	const frontmatter = generateSkillFrontmatter(specialistId, gsdAnswers.projectName, answers);

	const answersContext = answers
		.map((a, i) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.answer}`)
		.join('\n');
	const structuredContext = buildStructuredContext(gsdAnswers);

	try {
		const message = await streamWithRetry({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 4096,
			system: prompt,
			messages: [
				{
					role: 'user',
					content: `Genereer een ${specialistId} skill voor dit project:\n\n${structuredContext}\n\nWizard antwoorden:\n${answersContext}`
				}
			]
		});

		const content = message.content[0];
		if (content.type === 'text' && content.text.length > 100) {
			// Strip eventuele door AI gegenereerde frontmatter (dubbel voorkomen)
			let skillContent = content.text;
			if (skillContent.trimStart().startsWith('---')) {
				const secondDash = skillContent.indexOf('---', skillContent.indexOf('---') + 3);
				if (secondDash !== -1) {
					skillContent = skillContent.slice(secondDash + 3).trimStart();
				}
			}
			// Prepend onze eigen Skills 2.0 frontmatter
			return frontmatter + skillContent;
		}
	} catch (error) {
		console.error(`Skill generatie fout voor ${specialistId}:`, error);
	}

	// Fallback naar template — ook met frontmatter
	return frontmatter + templateFn(gsdAnswers);
}

/**
 * Genereert alle benodigde skills op basis van actieve specialists.
 * Skills 2.0: genereert ook eval test cases (.evals.md) voor elke skill.
 *
 * Design skill wordt NIET hier gegenereerd — die gebruikt de bestaande
 * generateEnrichedDesignSkill() in +server.ts en wordt apart aangeroepen.
 */
export async function generateSkills(
	specialists: DetectedSpecialist[],
	answers: WizardAnswer[],
	gsdAnswers: WizardAnswers,
	existingDesignSkill?: string | null
): Promise<Array<{ path: string; content: string }>> {
	const { generateEvalForSkill } = await import('./eval-generator');
	const files: Array<{ path: string; content: string }> = [];
	const skillSpecs = specialists.filter(s => s.skillNeeded && s.skillFile);

	// Design skill: als meegegeven, gebruik die (gegenereerd door bestaande flow)
	const designSpec = skillSpecs.find(s => s.id === 'frontend');
	if (designSpec && existingDesignSkill && designSpec.skillFile) {
		files.push({
			path: designSpec.skillFile,
			content: existingDesignSkill
		});
	}

	// Andere skills: parallel genereren met AI + fallback
	const otherSpecs = skillSpecs.filter(s => s.id !== 'frontend');
	const skillPromises = otherSpecs.map(async (spec) => {
		const content = await generateEnrichedSkill(spec.id, answers, gsdAnswers);
		if (content && spec.skillFile) {
			return { id: spec.id, path: spec.skillFile, content };
		}
		return null;
	});

	const results = await Promise.allSettled(skillPromises);
	const generatedSkills: Array<{ id: string; path: string; content: string }> = [];
	for (const result of results) {
		if (result.status === 'fulfilled' && result.value) {
			files.push({ path: result.value.path, content: result.value.content });
			generatedSkills.push(result.value);
		}
	}

	// Skills 2.0: Genereer evals voor alle gegenereerde skills (parallel)
	const evalPromises = generatedSkills.map(async (skill) => {
		try {
			return await generateEvalForSkill(skill.id, skill.content, answers, gsdAnswers);
		} catch (error) {
			console.error(`Eval generatie fout voor ${skill.id}:`, error);
			return null;
		}
	});

	const evalResults = await Promise.allSettled(evalPromises);
	for (const result of evalResults) {
		if (result.status === 'fulfilled' && result.value) {
			files.push({ path: result.value.path, content: result.value.content });
		}
	}

	return files;
}
