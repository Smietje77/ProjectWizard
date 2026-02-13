// src/lib/generators/specialist-detection.ts
// Gedeelde specialist-detectie — één bron van waarheid voor team-generator, zip-bundler en +server.ts

import type { WizardAnswers } from '$lib/types/gsd';

export interface DetectedSpecialist {
	id: string;
	name: string;
	needed: boolean;
	reason: string;
	agentFile: string;
}

/**
 * Detecteert welke specialists nodig zijn op basis van wizard antwoorden.
 * Gebruikt door: team-generator.ts, zip-bundler.ts, +server.ts
 */
export function detectRequiredSpecialists(answers: WizardAnswers): DetectedSpecialist[] {
	return [
		// Altijd aanwezig
		{
			id: 'frontend',
			name: 'Frontend Developer',
			needed: true,
			reason: 'UI implementatie',
			agentFile: 'agents/specialists/frontend.md'
		},
		{
			id: 'backend',
			name: 'Backend Developer',
			needed: true,
			reason: 'API en database',
			agentFile: 'agents/specialists/backend.md'
		},

		// Conditioneel
		{
			id: 'testing',
			name: 'Test Engineer',
			needed: answers.testStrategy !== 'minimal',
			reason: `Test strategie: ${answers.testStrategy}`,
			agentFile: 'agents/specialists/testing.md'
		},
		{
			id: 'integration',
			name: 'Integration Specialist',
			needed: answers.externalServices.length > 0 || answers.requiredMcps.length > 1,
			reason: `${answers.externalServices.length} externe services, ${answers.requiredMcps.length} MCPs`,
			agentFile: 'agents/specialists/integration.md'
		},
		{
			id: 'devops',
			name: 'DevOps Engineer',
			needed: answers.deploymentTarget !== 'vercel' || answers.hasDomain,
			reason: `Deploy: ${answers.deploymentTarget}${answers.hasDomain ? ', custom domain' : ''}`,
			agentFile: 'agents/specialists/devops.md'
		}
	];
}

/**
 * Retourneert alleen de specialists die daadwerkelijk nodig zijn.
 */
export function getActiveSpecialists(answers: WizardAnswers): DetectedSpecialist[] {
	return detectRequiredSpecialists(answers).filter((s) => s.needed);
}
