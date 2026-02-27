import type { WizardAnswers } from '$lib/types/gsd';
import { getActiveSpecialists } from './specialist-detection';

/**
 * Genereert een Agent Teams-ready TEAM.md bestand.
 * Bevat: copy-paste Team Lead prompt, per-teammate spawn blocks,
 * mailbox protocol, fase playbook en bestandsverantwoordelijkheid.
 */
export function generateTeamMd(answers: WizardAnswers): string {
	const { projectName, projectGoal, frontendFramework, database } = answers;

	const frameworkName =
		frontendFramework === 'sveltekit'
			? 'SvelteKit'
			: frontendFramework === 'nextjs'
				? 'Next.js'
				: 'Nuxt';

	const dbName =
		database === 'supabase' ? 'Supabase' : database === 'postgresql' ? 'PostgreSQL' : 'SQLite';

	const teammates = determineTeammates(answers);
	const phases = determinePhases(answers, teammates);

	const sections: string[] = [];

	// Header
	sections.push(`# Agent Team — ${projectName}\n`);
	sections.push(
		`> Activeer Agent Teams: \`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude\``
	);
	sections.push(
		`> De bestanden in \`agents/specialists/\` zijn de startup prompts voor elke teammate.\n`
	);

	// Team Lead Prompt
	sections.push(`## Team Lead Prompt\n`);
	sections.push(`Kopieer dit naar Claude Code om het team te starten:\n`);
	sections.push('```');
	sections.push(`Je bent de Team Lead voor het bouwen van ${projectName}.`);
	sections.push(`Doel: ${projectGoal}`);
	sections.push(`Stack: ${frameworkName}, ${dbName}`);
	sections.push('');
	sections.push('Spawn de volgende teammates (geef elk hun instructiebestand als system prompt):');
	teammates.forEach((t, i) => {
		sections.push(`Teammate ${i + 1}: ${t.name} — system prompt: ${t.agentFile}`);
	});
	sections.push('');
	sections.push('Start met Fase 1: Foundation.');
	sections.push(
		'Gebruik de mailbox voor coördinatie. Review elke wijziging van een teammate vóór merge.'
	);
	sections.push('```\n');

	// Per teammate blokken
	sections.push(`## Teammates\n`);
	teammates.forEach((t, i) => {
		sections.push(`### Teammate ${i + 1}: ${t.name}\n`);
		sections.push(`- **Instructions:** \`${t.agentFile}\``);
		sections.push(`- **Owns:** ${t.ownedPaths.map((p) => `\`${p}\``).join(', ')}`);
		const contextFiles = ['.planning/INITIAL_CONTEXT.md'];
		if (t.skillFile) contextFiles.push(t.skillFile);
		sections.push(`- **Context lezen bij spawn:** ${contextFiles.map((f) => `\`${f}\``).join(', ')}`);
		sections.push('');
		sections.push('**Spawn prompt voor Team Lead:**');
		sections.push('```');
		sections.push(`Spawn ${t.name} met system prompt uit ${t.agentFile}.`);
		sections.push(
			`Laat hem eerst ${contextFiles.map((f) => `\`${f}\``).join(' en ')} lezen.`
		);
		sections.push(`Taak: ${t.spawnPrompt}`);
		sections.push('```\n');
	});

	// Mailbox Protocol
	sections.push(`## Mailbox Protocol\n`);
	sections.push(
		`- **Teammate → Team Lead:** stuur bericht via mailbox voor goedkeuring vóór merge`
	);
	sections.push(`- **Team Lead → Teammate:** geef bijsturing bij PR review of blocker`);
	sections.push(
		`- **Teammates onderling:** gebruik DM voor afstemming over gedeelde bestanden`
	);
	sections.push(
		`- **Blocker:** als een teammate niet verder kan, stuurt hij Lead een bericht met wat er nodig is\n`
	);

	// Fase Playbook
	sections.push(`## Fase Playbook\n`);
	phases.forEach((phase, i) => {
		sections.push(`### Fase ${i + 1}: ${phase.name}`);
		sections.push(`- **Team:** ${phase.team}`);
		sections.push(`- **Taken:** ${phase.tasks}`);
		sections.push(`- **Gereed als:** ${phase.doneWhen}\n`);
	});

	// Bestandsverantwoordelijkheid
	sections.push(`## Bestandsverantwoordelijkheid\n`);
	sections.push(
		`> Elke teammate werkt ALLEEN aan zijn eigen bestanden om merge-conflicten te voorkomen.\n`
	);
	sections.push(`| Pad | Eigenaar |`);
	sections.push(`|-----|----------|`);
	teammates.forEach((t) => {
		t.ownedPaths.forEach((p) => {
			sections.push(`| \`${p}\` | ${t.name} |`);
		});
	});
	sections.push(`| \`.planning/\` | Lead (readonly voor teammates) |`);
	sections.push(`| \`agents/\` | Lead (readonly voor teammates) |`);

	return sections.join('\n');
}

interface Teammate {
	name: string;
	spawnPrompt: string;
	agentFile: string;
	skillFile: string | null;
	ownedPaths: string[];
}

interface Phase {
	name: string;
	team: string;
	tasks: string;
	doneWhen: string;
}

function determineTeammates(answers: WizardAnswers): Teammate[] {
	const specialists = getActiveSpecialists(answers);

	const generatorMap: Record<string, (a: WizardAnswers) => Teammate> = {
		frontend: generateFrontendTeammate,
		backend: generateBackendTeammate,
		testing: generateTestingTeammate,
		integration: generateIntegrationTeammate,
		devops: generateDevOpsTeammate,
		security: generateSecurityTeammate
	};

	return specialists
		.map((s) => {
			const generator = generatorMap[s.id];
			if (!generator) return null;
			const teammate = generator(answers);
			// Gebruik agentFile en skillFile uit de specialist-detectie als bron van waarheid
			return { ...teammate, agentFile: s.agentFile, skillFile: s.skillFile };
		})
		.filter((t): t is Teammate => t !== null);
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

	const spawnPrompt = `Bouw alle UI componenten, pages en layouts met ${frameworkName} en ${uiLibName}. Pas ${designStyle} design stijl toe met ${componentStyle} component vormen. ${navigationPattern} navigatiepatroon. Volg de design skill voor consistente styling. Werk ALLEEN in je eigen bestanden.`;

	return {
		name: 'Frontend Developer',
		spawnPrompt,
		agentFile: 'agents/specialists/frontend.md',
		skillFile: '.claude/skills/design.md',
		ownedPaths: ['src/routes/', 'src/lib/components/', 'src/lib/stores/']
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

	const authDetail =
		authMethod === 'magic-link'
			? 'passwordless magic link'
			: authMethod === 'email-password'
				? 'email/password met bcrypt hashing'
				: authMethod === 'social'
					? 'social OAuth providers'
					: 'geen auth';

	const entityList = dataEntities.map((e) => e.name).join(', ');

	const spawnPrompt = `Implementeer ${apiName} met ${dbName} als database. Authenticatie: ${authDetail}. Data entities: ${entityList}. Valideer alle input. Gebruik de backend skill voor API conventions. Werk ALLEEN aan backend bestanden.`;

	const ownedPaths = ['src/routes/api/', 'src/lib/server/'];
	if (database === 'supabase') ownedPaths.push('supabase/');

	return {
		name: 'Backend Developer',
		spawnPrompt,
		agentFile: 'agents/specialists/backend.md',
		skillFile: '.claude/skills/backend.md',
		ownedPaths
	};
}

function generateTestingTeammate(answers: WizardAnswers): Teammate {
	const { testStrategy, criticalFlows, frontendFramework } = answers;

	const testLevel =
		testStrategy === 'comprehensive' ? 'unit + integration + e2e' : 'unit + integration';

	const testFramework =
		frontendFramework === 'sveltekit' ? 'Vitest + Playwright' : 'Jest + Playwright';

	const flowsList = criticalFlows.join(', ');

	const spawnPrompt = `Schrijf ${testLevel} tests met ${testFramework}. Focus op critical flows: ${flowsList}. Minimaal 80% coverage voor business logic. Gebruik arrange-act-assert pattern. Mock externe dependencies. Werk ALLEEN aan test bestanden.`;

	return {
		name: 'Test Engineer',
		spawnPrompt,
		agentFile: 'agents/specialists/testing.md',
		skillFile: '.claude/skills/testing.md',
		ownedPaths: ['src/tests/', 'tests/', 'e2e/']
	};
}

function generateIntegrationTeammate(answers: WizardAnswers): Teammate {
	const { externalServices, requiredMcps } = answers;

	const servicesDetail = externalServices.map((s) => `${s.name} (${s.purpose})`).join(', ');
	const mcpsList = requiredMcps.join(', ');

	const spawnPrompt = `Integreer externe services: ${servicesDetail}. Configureer MCPs: ${mcpsList}. Implementeer error handling en retry logic. Documenteer rate limits. Werk ALLEEN aan integratie bestanden.`;

	return {
		name: 'Integration Specialist',
		spawnPrompt,
		agentFile: 'agents/specialists/integration.md',
		skillFile: '.claude/skills/integration.md',
		ownedPaths: ['src/lib/integrations/', '.mcp.json']
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

	const domainDetail =
		hasDomain && domainName ? ` Configureer custom domain ${domainName} met SSL.` : '';

	const spawnPrompt = `Configureer deployment naar ${targetName}.${domainDetail} Setup environment variabelen voor prod/staging/dev. Implementeer health checks. Documenteer deployment process. Werk ALLEEN aan deployment configs.`;

	return {
		name: 'DevOps Engineer',
		spawnPrompt,
		agentFile: 'agents/specialists/devops.md',
		skillFile: '.claude/skills/deployment.md',
		ownedPaths: ['Dockerfile', 'docker-compose.yml', '.github/workflows/']
	};
}

function generateSecurityTeammate(answers: WizardAnswers): Teammate {
	const { authMethod, database } = answers;

	const allText = [
		answers.projectGoal,
		answers.problemDescription,
		...answers.coreFeatures.map((f) => `${f.name} ${f.description}`)
	]
		.join(' ')
		.toLowerCase();

	const frameworks: string[] = [];
	if (allText.includes('gdpr') || allText.includes('privacy')) frameworks.push('GDPR');
	if (allText.includes('nis2')) frameworks.push('NIS2');
	if (allText.includes('iso')) frameworks.push('ISO 27001');
	if (allText.includes('hipaa')) frameworks.push('HIPAA');
	if (allText.includes('soc2')) frameworks.push('SOC2');
	if (frameworks.length === 0) frameworks.push('security best practices');

	const dbName =
		database === 'supabase' ? 'Supabase RLS' : database === 'postgresql' ? 'PostgreSQL' : 'SQLite';

	const spawnPrompt = `Implementeer ${frameworks.join(', ')} compliance. Configureer ${dbName} row-level security policies. Voeg security headers, CORS, rate limiting en audit logging toe. Review auth flows (${authMethod}) op kwetsbaarheden. Werk ALLEEN aan security-gerelateerde bestanden.`;

	return {
		name: 'Security Specialist',
		spawnPrompt,
		agentFile: 'agents/specialists/security.md',
		skillFile: '.claude/skills/security.md',
		ownedPaths: ['src/lib/middleware/', 'src/lib/security/', 'supabase/policies/']
	};
}

function determinePhases(answers: WizardAnswers, teammates: Teammate[]): Phase[] {
	const phases: Phase[] = [];
	const hasTeammate = (name: string) => teammates.some((t) => t.name === name);

	phases.push({
		name: 'Foundation',
		team: 'Lead + Backend Developer',
		tasks: 'Database schema, auth setup, project scaffolding, routing skeleton',
		doneWhen: 'database schema live, auth werkt, dev server start zonder errors'
	});

	const phase2Team = hasTeammate('Test Engineer')
		? 'Lead + Backend Developer + Test Engineer'
		: 'Lead + Backend Developer';
	phases.push({
		name: 'Core Backend',
		team: phase2Team,
		tasks: 'Alle API endpoints, business logic, database queries',
		doneWhen: 'alle API endpoints retourneren correcte data, unit tests groen'
	});

	phases.push({
		name: 'Core Frontend',
		team: 'Lead + Frontend Developer + Backend Developer',
		tasks: 'Pages, components, API koppeling, navigatie, happy-path flows',
		doneWhen: 'alle core flows werken end-to-end in de browser'
	});

	if (hasTeammate('Integration Specialist')) {
		phases.push({
			name: 'External Integrations',
			team: 'Lead + Integration Specialist + Backend Developer',
			tasks: 'Third-party API clients, webhooks, MCP configuratie',
			doneWhen: 'alle externe services operationeel, webhooks verwerken events'
		});
	}

	if (hasTeammate('Security Specialist')) {
		phases.push({
			name: 'Security Hardening',
			team: 'Lead + Security Specialist + Backend Developer',
			tasks: 'RLS policies, security headers, rate limiting, audit logging',
			doneWhen: 'security checklist compleet, geen kritieke kwetsbaarheden'
		});
	}

	if (hasTeammate('Test Engineer')) {
		phases.push({
			name: 'Testing & QA',
			team: 'Lead + Test Engineer + alle developers',
			tasks: 'End-to-end tests, bug fixes, test coverage naar 80%+',
			doneWhen: 'alle tests groen, coverage target gehaald, geen open bugs'
		});
	}

	const deployTeam = hasTeammate('DevOps Engineer')
		? 'Lead + DevOps Engineer'
		: 'Lead + Backend Developer';
	phases.push({
		name: 'Deployment',
		team: deployTeam,
		tasks: 'Production config, CI/CD pipeline, deployment, monitoring',
		doneWhen: 'app draait live in productie, monitoring actief, deployment gedocumenteerd'
	});

	return phases;
}
