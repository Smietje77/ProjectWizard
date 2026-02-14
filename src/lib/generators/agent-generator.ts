// src/lib/generators/agent-generator.ts
// Dynamische agent generatie op basis van wizard antwoorden

import type { DetectedSpecialist } from './specialist-detection';
import type { WizardAnswers } from '$lib/types/gsd';
import { getFrameworkConventions } from './templates';

/**
 * Retourneert framework-specifieke paden voor agent scope.
 */
function getFrameworkPaths(framework: string): Record<string, string[]> {
	const paths: Record<string, Record<string, string[]>> = {
		sveltekit: {
			frontend: ['src/routes/', 'src/lib/components/', 'src/lib/stores/', 'app.css', 'tailwind.config.*'],
			backend: ['src/routes/api/', 'src/lib/server/', 'src/hooks.server.ts', 'supabase/'],
			testing: ['src/**/*.test.ts', 'tests/', 'vitest.config.ts', 'playwright.config.ts'],
			devops: ['Dockerfile', 'docker-compose.yml', '.github/workflows/', '.env*'],
			integration: ['src/lib/server/integrations/', '.mcp.json', 'src/hooks.server.ts'],
			security: ['src/lib/server/auth/', 'supabase/migrations/', 'src/hooks.server.ts']
		},
		nextjs: {
			frontend: ['app/', 'components/', 'styles/', 'tailwind.config.*'],
			backend: ['app/api/', 'lib/', 'prisma/', 'middleware.ts'],
			testing: ['__tests__/', '*.test.ts', 'jest.config.*', 'playwright.config.ts'],
			devops: ['Dockerfile', 'docker-compose.yml', '.github/workflows/', '.env*', 'next.config.*'],
			integration: ['lib/integrations/', '.mcp.json', 'middleware.ts'],
			security: ['lib/auth/', 'prisma/migrations/', 'middleware.ts']
		},
		nuxt: {
			frontend: ['pages/', 'components/', 'layouts/', 'assets/', 'tailwind.config.*'],
			backend: ['server/api/', 'server/middleware/', 'server/utils/', 'prisma/'],
			testing: ['tests/', '*.test.ts', 'vitest.config.ts', 'playwright.config.ts'],
			devops: ['Dockerfile', 'docker-compose.yml', '.github/workflows/', '.env*', 'nuxt.config.ts'],
			integration: ['server/utils/integrations/', '.mcp.json', 'server/middleware/'],
			security: ['server/utils/auth/', 'prisma/migrations/', 'server/middleware/']
		}
	};
	return paths[framework] || paths.sveltekit;
}

/**
 * Genereert coordinator + specialist agents op basis van wizard antwoorden.
 */
export function generateAgents(
	specialists: DetectedSpecialist[],
	gsdAnswers: WizardAnswers
): Array<{ path: string; content: string }> {
	const files: Array<{ path: string; content: string }> = [];
	const activeSpecs = specialists.filter(s => s.needed);

	// Coordinator
	files.push({
		path: 'agents/coordinator.md',
		content: generateCoordinator(activeSpecs, gsdAnswers)
	});

	// Per specialist
	for (const spec of activeSpecs) {
		files.push({
			path: spec.agentFile,
			content: generateSpecialistAgent(spec, activeSpecs, gsdAnswers)
		});
	}

	return files;
}

function generateCoordinator(
	specialists: DetectedSpecialist[],
	gsdAnswers: WizardAnswers
): string {
	const teamLines = specialists.map(s => {
		const skillRef = s.skillFile ? `\`${s.skillFile}\`` : 'geen aparte skill';
		return `- **${s.name}**: ${s.reason}
  - Agent: \`${s.agentFile}\`
  - Skill: ${skillRef}`;
	}).join('\n');

	const skillsList = specialists
		.filter(s => s.skillFile && s.skillNeeded)
		.map(s => `- \`${s.skillFile}\``)
		.join('\n');

	return `# Project Coordinator — ${gsdAnswers.projectName}

## Rol
Bewaakt architectuur, verdeelt taken, reviewt output voor ${gsdAnswers.projectName}.
Bouwt NIET zelf — delegeert alles naar het team.

## Project Context
- **Doel**: ${gsdAnswers.projectGoal}
- **Stack**: ${gsdAnswers.frontendFramework} + ${gsdAnswers.database}
- **API**: ${gsdAnswers.apiPattern.toUpperCase()}
- **Auth**: ${gsdAnswers.authMethod}
- **Deploy**: ${gsdAnswers.deploymentTarget}

## Team
${teamLines}

## Werkwijze
1. Lees \`.planning/ROADMAP.md\` voor de huidige fase
2. Verdeel taken naar het juiste teamlid
3. Review output voordat het gemerged wordt
4. Update \`.planning/STATE.md\` na elke voltooide taak

## Beschikbare Skills
${skillsList}

## Referenties
- \`.planning/ROADMAP.md\` — Fases en deliverables
- \`.planning/REQUIREMENTS.md\` — Alle requirements met IDs
- \`CLAUDE.md\` — Tech stack en conventies
- \`TEAM.md\` — Team configuratie voor Agent Teams
`;
}

function generateSpecialistAgent(
	spec: DetectedSpecialist,
	allSpecs: DetectedSpecialist[],
	gsdAnswers: WizardAnswers
): string {
	const others = allSpecs
		.filter(s => s.id !== spec.id)
		.map(s => s.name)
		.join(', ');

	const frameworkPaths = getFrameworkPaths(gsdAnswers.frontendFramework);
	const scopePaths = (frameworkPaths[spec.id] || []).map(p => `- \`${p}\``).join('\n');

	const skillRef = spec.skillFile
		? `> 🔗 Skill: \`${spec.skillFile}\``
		: '';

	const roleBeschrijving = getSpecialistRole(spec.id, gsdAnswers);
	const constraints = getSpecialistConstraints(spec.id, gsdAnswers);

	return `# ${spec.name} — ${gsdAnswers.projectName}

${skillRef}
> 🤝 Werkt samen met: ${others}

## Rol
${roleBeschrijving}

## Scope
${scopePaths}

## Constraints
- Werkt ALLEEN aan bestanden binnen eigen scope
${constraints}

## Referenties
- \`.planning/REQUIREMENTS.md\` — Requirements en acceptatiecriteria
- \`CLAUDE.md\` — Tech stack en code conventies
${spec.skillFile ? `- \`${spec.skillFile}\` — Concrete patronen en conventions` : ''}
`;
}

function getSpecialistRole(id: string, answers: WizardAnswers): string {
	const conventions = getFrameworkConventions(answers.frontendFramework);
	const roles: Record<string, string> = {
		frontend: `Bouwt de gebruikersinterface met ${answers.frontendFramework}, ${answers.uiLibrary} en ${answers.stylingApproach}. Implementeert ${answers.navigationPattern} navigatie, responsive layouts en interactieve componenten met ${conventions}.`,
		backend: `Ontwikkelt de API (${answers.apiPattern.toUpperCase()}) en database laag met ${answers.database}. Beheert authenticatie (${answers.authMethod}), data validatie en server-side logica.`,
		testing: `Schrijft en onderhoudt tests volgens de ${answers.testStrategy} strategie. Focust op unit tests, integration tests en coverage voor kritieke flows: ${answers.criticalFlows.join(', ') || 'zie requirements'}.`,
		integration: `Beheert externe service koppelingen (${answers.externalServices.map(s => s.name).join(', ') || 'geen'}) en MCP configuraties (${answers.requiredMcps.join(', ') || 'filesystem'}).`,
		devops: `Beheert deployment naar ${answers.deploymentTarget}${answers.hasDomain ? ` met domain ${answers.domainName || 'custom'}` : ''}, CI/CD pipelines, environment configuratie en monitoring.`,
		security: `Beveiligt de applicatie: auth flows, RLS policies, input sanitization, security headers en compliance checks gerelateerd aan ${answers.projectGoal}.`
	};
	return roles[id] || `Specialist voor ${id} taken.`;
}

function getSpecialistConstraints(id: string, answers: WizardAnswers): string {
	const constraints: Record<string, string> = {
		frontend: `- Gebruikt ALTIJD ${answers.uiLibrary} componenten, geen eigen UI primitives\n- Raadpleegt design skill voor alle visuele beslissingen`,
		backend: `- Valideert ALLE input met Zod schemas\n- Retourneert altijd gestructureerde error responses`,
		testing: `- Test coverage minimum: ${answers.testStrategy === 'comprehensive' ? '80%' : '60%'}\n- Elke kritieke flow heeft minstens één happy-path test`,
		integration: `- Externe calls altijd via wrapper met retry logic\n- Documenteert alle API contracten`,
		devops: `- Environment variabelen NOOIT hardcoded\n- Elke deployment heeft een health check endpoint`,
		security: `- Alle database queries via RLS — geen service role key in client code\n- Security headers op ELKE response`
	};
	return constraints[id] || '- Volgt de project conventies in CLAUDE.md';
}
