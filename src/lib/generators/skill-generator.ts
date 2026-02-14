// src/lib/generators/skill-generator.ts
// Genereert projectspecifieke skills voor alle actieve specialists

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
			return content.text;
		}
	} catch (error) {
		console.error(`Skill generatie fout voor ${specialistId}:`, error);
	}

	// Fallback naar template
	return templateFn(gsdAnswers);
}

/**
 * Genereert alle benodigde skills op basis van actieve specialists.
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
			return { path: spec.skillFile, content };
		}
		return null;
	});

	const results = await Promise.allSettled(skillPromises);
	for (const result of results) {
		if (result.status === 'fulfilled' && result.value) {
			files.push(result.value);
		}
	}

	return files;
}
