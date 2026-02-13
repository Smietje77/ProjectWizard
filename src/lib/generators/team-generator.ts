import type { WizardAnswers } from '$lib/types/gsd';
import { getActiveSpecialists } from './specialist-detection';

/**
 * Genereert een TEAM.md bestand met aanbevolen Agent Team structuur
 * voor Claude Code op basis van de wizard antwoorden.
 */
export function generateTeamMd(answers: WizardAnswers): string {
	const { projectName, projectGoal } = answers;

	// Bepaal teammates op basis van project complexiteit
	const teammates = determineTeammates(answers);
	const phases = determinePhases(answers, teammates);

	// Genereer team instructie voor quick start
	const teamInstruction = generateTeamInstruction(answers, teammates);

	// Build het TEAM.md document
	const sections: string[] = [];

	// Header
	sections.push(`# Agent Team Configuratie — ${projectName}\n`);
	sections.push(
		`> Dit bestand beschrijft de aanbevolen Agent Team structuur voor het bouwen van dit project met Claude Code.`
	);
	sections.push(`> Vereist: \`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1\` in je environment.\n`);

	// Quick Start
	sections.push(`## Quick Start\n`);
	sections.push(`Start Claude Code en geef het deze instructie:\n`);
	sections.push('```');
	sections.push(`Maak een agent team aan om ${projectName} te bouwen.`);
	sections.push(teamInstruction);
	sections.push('```\n');

	// Team Structuur
	sections.push(`## Aanbevolen Team Structuur\n`);

	// Lead
	sections.push(`### Lead: Project Coordinator`);
	sections.push(`- Rol: Bewaakt architectuur, verdeelt taken, reviewt output`);
	sections.push(`- Model: claude-sonnet-4-5-20250929`);
	sections.push(
		`- Focus: Geen directe implementatie — delegeert alles naar teammates (gebruik delegate mode met Shift+Tab)\n`
	);

	// Teammates
	teammates.forEach((teammate, index) => {
		sections.push(`### Teammate ${index + 1}: ${teammate.name}`);
		sections.push(`- Rol: ${teammate.description}`);
		sections.push(`- Focus: ${teammate.focus}`);
		sections.push(`- Spawn prompt: "${teammate.spawnPrompt}"\n`);
	});

	// Fases
	sections.push(`## Fasegewijs Gebruik\n`);
	phases.forEach((phase, index) => {
		sections.push(`### Fase ${index + 1}: ${phase.name}`);
		sections.push(`Team: ${phase.team}`);
		sections.push(`Taken: ${phase.tasks}\n`);
	});

	// Tips
	sections.push(`## Tips`);
	sections.push(`- Start elke fase met \`Maak een agent team...\` instructie`);
	sections.push(`- Gebruik delegate mode (Shift+Tab) zodat de lead niet zelf gaat bouwen`);
	sections.push(`- Houd teammates op eigen bestanden — voorkom file conflicts`);
	sections.push(`- Check voortgang met Shift+Up/Down`);
	sections.push(`- Bij merge conflicts: laat lead de merge reviewen en goedkeuren`);
	sections.push(
		`- Team opschalen: bij grote features kun je extra teammates spawnen voor specifieke taken`
	);

	return sections.join('\n');
}

interface Teammate {
	name: string;
	description: string;
	focus: string;
	spawnPrompt: string;
}

interface Phase {
	name: string;
	team: string;
	tasks: string;
}

function determineTeammates(answers: WizardAnswers): Teammate[] {
	const teammates: Teammate[] = [];
	const specialists = getActiveSpecialists(answers);

	// Map gedetecteerde specialists naar teammates
	const generatorMap: Record<string, (a: WizardAnswers) => Teammate> = {
		frontend: generateFrontendTeammate,
		backend: generateBackendTeammate,
		testing: generateTestingTeammate,
		integration: generateIntegrationTeammate,
		devops: generateDevOpsTeammate,
		security: generateSecurityTeammate
	};

	for (const specialist of specialists) {
		const generator = generatorMap[specialist.id];
		if (generator) {
			teammates.push(generator(answers));
		}
	}

	return teammates;
}

function generateFrontendTeammate(answers: WizardAnswers): Teammate {
	const { frontendFramework, uiLibrary, navigationPattern, designStyle, componentStyle } = answers;

	const frameworkName =
		frontendFramework === 'sveltekit'
			? 'SvelteKit'
			: frontendFramework === 'nextjs'
				? 'Next.js'
				: 'Nuxt';

	const uiLibName =
		uiLibrary === 'skeleton'
			? 'Skeleton UI'
			: uiLibrary === 'shadcn'
				? 'shadcn/ui'
				: uiLibrary === 'daisyui'
					? 'DaisyUI'
					: 'custom Tailwind';

	const description = `Bouwt alle UI componenten, pages en layouts met ${frameworkName} en ${uiLibName}`;

	const focus = `src/routes/, src/lib/components/, styling met Tailwind CSS, ${navigationPattern} navigatie`;

	const spawnPrompt = `Je bent de frontend developer voor dit project. Gebruik ${frameworkName} met ${uiLibName} voor alle UI componenten. Pas ${designStyle} design stijl toe met ${componentStyle} component vormen. Focus op responsive design en toegankelijkheid. Gebruik de design skill (.claude/skills/design.md) voor consistente styling. Werk ALLEEN aan frontend bestanden (routes, components, stores).`;

	return {
		name: 'Frontend Developer',
		description,
		focus,
		spawnPrompt
	};
}

function generateBackendTeammate(answers: WizardAnswers): Teammate {
	const { database, apiPattern, authMethod, dataEntities } = answers;

	const dbName =
		database === 'supabase' ? 'Supabase' : database === 'postgresql' ? 'PostgreSQL' : 'SQLite';

	const apiName =
		apiPattern === 'rest'
			? 'REST API'
			: apiPattern === 'graphql'
				? 'GraphQL'
				: 'tRPC endpoints';

	const description = `Implementeert ${apiName}, database schema in ${dbName}, en ${authMethod} authenticatie`;

	const entityList = dataEntities.map((e) => e.name).join(', ');
	const focus = `Database schema (${entityList}), API routes, auth flows, business logic`;

	const authDetail =
		authMethod === 'magic-link'
			? 'passwordless magic link'
			: authMethod === 'email-password'
				? 'email/password met bcrypt hashing'
				: authMethod === 'social'
					? 'social OAuth providers'
					: 'geen auth';

	const spawnPrompt = `Je bent de backend developer voor dit project. Bouw ${apiName} met ${dbName} als database. Implementeer ${authDetail} authenticatie. Data entities: ${entityList}. Gebruik de backend skill (.claude/skills/backend.md) voor API conventions. Volg best practices voor security (input validatie, SQL injection preventie, proper error handling). Werk ALLEEN aan backend bestanden (API routes, database schema, server-side logic).`;

	return {
		name: 'Backend Developer',
		description,
		focus,
		spawnPrompt
	};
}

function generateTestingTeammate(answers: WizardAnswers): Teammate {
	const { testStrategy, criticalFlows, frontendFramework } = answers;

	const testLevel = testStrategy === 'comprehensive' ? 'unit + integration + e2e' : 'unit + integration';

	const description = `Schrijft ${testLevel} tests voor alle features`;

	const flowsList = criticalFlows.join(', ');
	const focus = `Test files (*.test.ts, *.spec.ts), test coverage voor: ${flowsList}`;

	const testFramework =
		frontendFramework === 'sveltekit' ? 'Vitest + Playwright' : 'Jest + Playwright';

	const spawnPrompt = `Je bent de test engineer voor dit project. Schrijf ${testLevel} tests met ${testFramework}. Focus op critical flows: ${flowsList}. Gebruik de testing skill (.claude/skills/testing.md) voor test conventions. Zorg voor goede test coverage (minimaal 80% voor business logic). Gebruik arrange-act-assert pattern. Mock externe dependencies. Werk ALLEEN aan test bestanden en test configuratie.`;

	return {
		name: 'Test Engineer',
		description,
		focus,
		spawnPrompt
	};
}

function generateIntegrationTeammate(answers: WizardAnswers): Teammate {
	const { externalServices, requiredMcps } = answers;

	const servicesList = externalServices.map((s) => s.name).join(', ');
	const mcpsList = requiredMcps.join(', ');

	const description = `Integreert externe services (${servicesList}) en configureert MCPs`;

	const focus = `API integraties, MCP configuratie (.mcp.json), webhooks, externe service clients`;

	const servicesDetail = externalServices
		.map((s) => `${s.name} (${s.purpose})`)
		.join(', ');

	const spawnPrompt = `Je bent de integration specialist voor dit project. Integreer deze externe services: ${servicesDetail}. Configureer MCPs: ${mcpsList}. Gebruik de integration skill (.claude/skills/integration.md) voor integratie patterns. Implementeer error handling en retry logic voor externe calls. Documenteer rate limits en API quotas. Werk ALLEEN aan integratie bestanden (API clients, webhooks, MCP configs).`;

	return {
		name: 'Integration Specialist',
		description,
		focus,
		spawnPrompt
	};
}

function generateDevOpsTeammate(answers: WizardAnswers): Teammate {
	const { deploymentTarget, hasDomain, domainName } = answers;

	const targetName =
		deploymentTarget === 'dokploy'
			? 'Dokploy'
			: deploymentTarget === 'vercel'
				? 'Vercel'
				: 'Coolify';

	const description = `Configureert ${targetName} deployment${hasDomain ? ` met custom domain (${domainName})` : ''}`;

	const focus = `Deployment configs, environment variabelen, CI/CD, domain setup`;

	const domainDetail = hasDomain
		? ` Configureer custom domain ${domainName} met SSL/TLS certificaten.`
		: '';

	const spawnPrompt = `Je bent de DevOps engineer voor dit project. Configureer deployment naar ${targetName}.${domainDetail} Gebruik de deployment skill (.claude/skills/deployment.md) voor deployment best practices. Setup environment variabelen voor production, staging en development. Implementeer health checks en monitoring. Documenteer deployment process. Werk ALLEEN aan deployment configs (Dockerfile, docker-compose.yml, CI/CD workflows, env configs).`;

	return {
		name: 'DevOps Engineer',
		description,
		focus,
		spawnPrompt
	};
}

function generateSecurityTeammate(answers: WizardAnswers): Teammate {
	const { authMethod, database, frontendFramework } = answers;

	// Detecteer welke compliance frameworks relevant zijn
	const allText = [
		answers.projectGoal,
		answers.problemDescription,
		...answers.coreFeatures.map(f => `${f.name} ${f.description}`)
	].join(' ').toLowerCase();

	const frameworks: string[] = [];
	if (allText.includes('gdpr') || allText.includes('privacy')) frameworks.push('GDPR');
	if (allText.includes('nis2')) frameworks.push('NIS2');
	if (allText.includes('iso')) frameworks.push('ISO 27001');
	if (allText.includes('hipaa')) frameworks.push('HIPAA');
	if (allText.includes('soc2')) frameworks.push('SOC2');
	if (frameworks.length === 0) frameworks.push('security best practices');

	const frameworksList = frameworks.join(', ');

	const dbName =
		database === 'supabase' ? 'Supabase RLS' : database === 'postgresql' ? 'PostgreSQL' : 'SQLite';

	const description = `Implementeert ${frameworksList} compliance, security auditing en data protection`;

	const focus = `Security middleware, RLS policies, input validatie, audit logging, CORS configuratie, rate limiting`;

	const spawnPrompt = `Je bent de security specialist voor dit project. Implementeer ${frameworksList} compliance. Configureer ${dbName} row-level security policies. Implementeer security headers, CORS, rate limiting en audit logging. Review alle auth flows (${authMethod}) op kwetsbaarheden. Gebruik de security skill (.claude/skills/security.md) voor security checklists. Werk ALLEEN aan security-gerelateerde bestanden (middleware, policies, security configs, audit logging).`;

	return {
		name: 'Security Specialist',
		description,
		focus,
		spawnPrompt
	};
}

function determinePhases(answers: WizardAnswers, teammates: Teammate[]): Phase[] {
	const phases: Phase[] = [];

	// Fase 1: Foundation (altijd)
	phases.push({
		name: 'Foundation',
		team: 'Lead + Backend teammate',
		tasks: 'Database schema, auth setup, project scaffolding'
	});

	// Fase 2: Core Backend (altijd)
	const phase2Team = teammates.some((t) => t.name === 'Test Engineer')
		? 'Lead + Backend teammate + Test teammate'
		: 'Lead + Backend teammate';
	phases.push({
		name: 'Core Backend',
		team: phase2Team,
		tasks: 'API endpoints, business logic, tests'
	});

	// Fase 3: Core Frontend (altijd)
	phases.push({
		name: 'Core Frontend',
		team: 'Lead + Frontend teammate + Backend teammate',
		tasks: 'Pages, components, API integration, UI flows'
	});

	// Fase 4: External Integrations (optioneel)
	if (teammates.some((t) => t.name === 'Integration Specialist')) {
		phases.push({
			name: 'External Integrations',
			team: 'Lead + Integration teammate + Backend teammate',
			tasks: 'Third-party APIs, webhooks, MCP setup'
		});
	}

	// Fase 5: Security Hardening (optioneel)
	if (teammates.some((t) => t.name === 'Security Specialist')) {
		phases.push({
			name: 'Security Hardening',
			team: 'Lead + Security teammate + Backend teammate',
			tasks: 'RLS policies, security headers, audit logging, compliance checks'
		});
	}

	// Fase 6: Testing & QA (optioneel)
	if (teammates.some((t) => t.name === 'Test Engineer')) {
		phases.push({
			name: 'Testing & QA',
			team: 'Lead + Test teammate + All developers',
			tasks: 'End-to-end tests, bug fixes, test coverage'
		});
	}

	// Fase 7: Deployment (altijd)
	const deployTeam = teammates.some((t) => t.name === 'DevOps Engineer')
		? 'Lead + DevOps teammate'
		: 'Lead + Backend teammate';
	phases.push({
		name: 'Deployment',
		team: deployTeam,
		tasks: 'Production config, deployment, monitoring setup'
	});

	return phases;
}

function generateTeamInstruction(answers: WizardAnswers, teammates: Teammate[]): string {
	const { projectGoal, frontendFramework, database } = answers;

	const lines: string[] = [];
	lines.push(`Project: ${projectGoal}`);
	lines.push(`Stack: ${frontendFramework}, ${database}`);
	lines.push('');
	lines.push('Team lead (jij): Coordinate en review');
	teammates.forEach((t, i) => {
		lines.push(`Teammate ${i + 1}: ${t.description}`);
	});
	lines.push('');
	lines.push('Start met Fase 1: Foundation (database schema + auth).');

	return lines.join('\n');
}
