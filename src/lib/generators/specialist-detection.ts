// src/lib/generators/specialist-detection.ts
// Gedeelde specialist-detectie — één bron van waarheid voor team-generator, zip-bundler en +server.ts

import type { WizardAnswers } from '$lib/types/gsd';

export interface DetectedSpecialist {
	id: string;
	name: string;
	needed: boolean;
	reason: string;
	agentFile: string;
	skillFile: string | null;
	skillNeeded: boolean;
}

// Website types die SEO specialist triggeren (publieke websites)
const PUBLIC_WEBSITE_TYPES = ['landing', 'ecommerce', 'marketplace', 'portfolio', 'blog_content', 'community'];

function detectSeoNeeded(answers: WizardAnswers): boolean {
	return !!answers.websiteType && PUBLIC_WEBSITE_TYPES.includes(answers.websiteType);
}

// Keywords die security specialist triggeren
const SECURITY_KEYWORDS = ['compliance', 'security', 'audit', 'nis2', 'gdpr', 'iso', 'privacy', 'hipaa', 'soc2', 'pentest'];

function detectSecurityNeeded(answers: WizardAnswers): boolean {
	const textToSearch = [
		answers.projectGoal,
		answers.problemDescription,
		...answers.coreFeatures.map(f => `${f.name} ${f.description}`),
		...answers.outOfScope
	].join(' ').toLowerCase();

	return SECURITY_KEYWORDS.some(keyword => textToSearch.includes(keyword));
}

/**
 * Detecteert welke specialists nodig zijn op basis van wizard antwoorden.
 * Gebruikt door: team-generator.ts, zip-bundler.ts, +server.ts
 */
export function detectRequiredSpecialists(answers: WizardAnswers): DetectedSpecialist[] {
	const securityNeeded = detectSecurityNeeded(answers);
	const seoNeeded = detectSeoNeeded(answers);

	return [
		// Altijd aanwezig
		{
			id: 'frontend',
			name: 'Frontend Developer',
			needed: true,
			reason: 'UI implementatie',
			agentFile: 'agents/specialists/frontend.md',
			skillFile: '.claude/skills/design-system/SKILL.md',
			skillNeeded: true
		},
		{
			id: 'backend',
			name: 'Backend Developer',
			needed: true,
			reason: 'API en database',
			agentFile: 'agents/specialists/backend.md',
			skillFile: '.claude/skills/backend-patterns/SKILL.md',
			skillNeeded: true
		},

		// Conditioneel
		{
			id: 'testing',
			name: 'Test Engineer',
			needed: answers.testStrategy !== 'minimal',
			reason: `Test strategie: ${answers.testStrategy}`,
			agentFile: 'agents/specialists/testing.md',
			skillFile: '.claude/skills/testing-strategy/SKILL.md',
			skillNeeded: answers.testStrategy !== 'minimal'
		},
		{
			id: 'integration',
			name: 'Integration Specialist',
			needed: answers.externalServices.length > 0 || answers.requiredMcps.length > 1,
			reason: `${answers.externalServices.length} externe services, ${answers.requiredMcps.length} MCPs`,
			agentFile: 'agents/specialists/integration.md',
			skillFile: '.claude/skills/external-services/SKILL.md',
			skillNeeded: answers.externalServices.length > 0 || answers.requiredMcps.length > 1
		},
		{
			id: 'devops',
			name: 'DevOps Engineer',
			needed: answers.deploymentTarget !== 'vercel' || answers.hasDomain,
			reason: `Deploy: ${answers.deploymentTarget}${answers.hasDomain ? ', custom domain' : ''}`,
			agentFile: 'agents/specialists/devops.md',
			skillFile: '.claude/skills/deployment-config/SKILL.md',
			skillNeeded: answers.deploymentTarget !== 'vercel' || answers.hasDomain
		},
		{
			id: 'security',
			name: 'Security Specialist',
			needed: securityNeeded,
			reason: 'Compliance/security keywords gedetecteerd',
			agentFile: 'agents/specialists/security.md',
			skillFile: '.claude/skills/security-checklist/SKILL.md',
			skillNeeded: securityNeeded
		},
		{
			id: 'seo',
			name: 'SEO Specialist',
			needed: seoNeeded,
			reason: `Website type: ${answers.websiteType ?? 'n.v.t.'}`,
			agentFile: 'agents/specialists/seo.md',
			skillFile: '.claude/skills/seo-optimization/SKILL.md',
			skillNeeded: seoNeeded
		}
	];
}

/**
 * Retourneert alleen de specialists die daadwerkelijk nodig zijn.
 */
export function getActiveSpecialists(answers: WizardAnswers): DetectedSpecialist[] {
	return detectRequiredSpecialists(answers).filter((s) => s.needed);
}

/**
 * Retourneert alleen de skills die gegenereerd moeten worden.
 */
export function getActiveSkills(answers: WizardAnswers): DetectedSpecialist[] {
	return detectRequiredSpecialists(answers).filter((s) => s.skillNeeded && s.skillFile);
}
