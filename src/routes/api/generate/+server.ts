import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	generateGitignore,
	detectRequiredEnvVars,
	generateDesignSkill
} from '$lib/generator';
import {
	generateClaudeMdTemplate,
	generatePromptMdTemplate,
	generateMcpJsonTemplate,
	generateEnvExampleTemplate,
	generateDesignSkillTemplate
} from '$lib/generators/templates';
import { getActiveSpecialists } from '$lib/generators/specialist-detection';
import { generateSkills } from '$lib/generators/skill-generator';
import type { WizardAnswer } from '$lib/types';
import type { WizardAnswers } from '$lib/types/gsd';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { generateGSDFolder } from '$lib/generators/gsd-generator';
import { generateProjectBundle, generatePlanningOnly } from '$lib/generators/zip-bundler';
import { mapAnswersToGSD } from '$lib/generators/answer-mapper';
import { generateRequestSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';
import { streamWithRetry } from '$lib/server/anthropic-client';
import {
	GENERATOR_SYSTEM_PROMPT,
	PROMPT_GENERATOR_SYSTEM,
	MCP_GENERATOR_PROMPT,
	ENV_GENERATOR_PROMPT,
	DESIGN_SKILL_GENERATOR_PROMPT
} from '$lib/prompts/generator';
import { generateTeamMd } from '$lib/generators/team-generator';

// Bouw gestructureerde context string uit GSD antwoorden
function buildStructuredContext(gsdAnswers: WizardAnswers): string {
	const parts = [
		`## Gestructureerde Projectdata`,
		`- **Framework**: ${gsdAnswers.frontendFramework}`,
		`- **Database**: ${gsdAnswers.database}`,
		`- **Auth**: ${gsdAnswers.authMethod}`,
		`- **Styling**: ${gsdAnswers.stylingApproach} + ${gsdAnswers.uiLibrary}`,
		`- **API Pattern**: ${gsdAnswers.apiPattern}`,
		`- **Navigatie**: ${gsdAnswers.navigationPattern}`,
		`- **Deployment**: ${gsdAnswers.deploymentTarget}`,
		`- **Test strategie**: ${gsdAnswers.testStrategy}`
	];

	if (gsdAnswers.dataEntities.length > 0) {
		parts.push(`\n### Data Entiteiten`);
		for (const entity of gsdAnswers.dataEntities) {
			parts.push(`- **${entity.name}**: ${entity.fields.join(', ')}`);
		}
	}

	if (gsdAnswers.externalServices.length > 0) {
		parts.push(`\n### Externe Services`);
		for (const service of gsdAnswers.externalServices) {
			parts.push(`- **${service.name}**: ${service.purpose}`);
		}
	}

	if (gsdAnswers.screenshotAnalysis && gsdAnswers.screenshotAnalysis.length > 0) {
		parts.push(`\n### Screenshot Analyses`);
		for (const s of gsdAnswers.screenshotAnalysis) {
			parts.push(`- **${s.label}**: ${JSON.stringify(s.analysis)}`);
		}
	}

	return parts.join('\n');
}

async function generateEnrichedClaudeMd(
	projectName: string,
	description: string,
	answers: WizardAnswer[],
	gsdAnswers: WizardAnswers
): Promise<string> {
	const answersContext = answers
		.map((a, i) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.answer}`)
		.join('\n');
	const structuredContext = buildStructuredContext(gsdAnswers);

	try {
		const message = await streamWithRetry({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 4096,
			system: GENERATOR_SYSTEM_PROMPT,
			messages: [
				{
					role: 'user',
					content: `Genereer een compleet CLAUDE.md bestand voor dit project:

Projectnaam: ${projectName}
Beschrijving: ${description}

${structuredContext}

Wizard antwoorden:
${answersContext}

Genereer een gedetailleerd CLAUDE.md bestand.`
				}
			]
		});

		const content = message.content[0];
		if (content.type === 'text') return content.text;
	} catch (error) {
		console.error('Claude generatie fout:', error);
	}

	// FALLBACK: templates.ts (ZIP-kwaliteit)
	return generateClaudeMdTemplate(gsdAnswers);
}

async function generateEnrichedPromptMd(
	projectName: string,
	description: string,
	answers: WizardAnswer[],
	gsdAnswers: WizardAnswers
): Promise<string> {
	const answersContext = answers
		.map((a, i) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.answer}`)
		.join('\n');
	const structuredContext = buildStructuredContext(gsdAnswers);

	try {
		const message = await streamWithRetry({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 4096,
			system: PROMPT_GENERATOR_SYSTEM,
			messages: [
				{
					role: 'user',
					content: `Genereer een compleet PROMPT.md bestand voor dit project:

Projectnaam: ${projectName}
Beschrijving: ${description}

${structuredContext}

Wizard antwoorden:
${answersContext}`
				}
			]
		});

		const content = message.content[0];
		if (content.type === 'text') return content.text;
	} catch (error) {
		console.error('Prompt generatie fout:', error);
	}

	// FALLBACK: templates.ts (ZIP-kwaliteit)
	return generatePromptMdTemplate(gsdAnswers);
}

async function generateEnrichedMcpJson(
	answers: WizardAnswer[],
	gsdAnswers: WizardAnswers
): Promise<string> {
	const answersContext = answers
		.map((a, i) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.answer}`)
		.join('\n');
	const structuredContext = buildStructuredContext(gsdAnswers);

	try {
		const message = await streamWithRetry({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 2048,
			system: MCP_GENERATOR_PROMPT,
			messages: [
				{
					role: 'user',
					content: `Genereer een .mcp.json voor dit project:

${structuredContext}

Wizard antwoorden:
${answersContext}`
				}
			]
		});

		const content = message.content[0];
		if (content.type === 'text') return content.text;
	} catch (error) {
		console.error('MCP generatie fout:', error);
	}

	// FALLBACK: templates.ts (ZIP-kwaliteit)
	return generateMcpJsonTemplate(gsdAnswers);
}

async function generateEnrichedEnvExample(
	answers: WizardAnswer[],
	gsdAnswers: WizardAnswers
): Promise<string> {
	const answersContext = answers
		.map((a, i) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.answer}`)
		.join('\n');
	const structuredContext = buildStructuredContext(gsdAnswers);

	try {
		const message = await streamWithRetry({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 2048,
			system: ENV_GENERATOR_PROMPT,
			messages: [
				{
					role: 'user',
					content: `Genereer een .env.example voor dit project:

${structuredContext}

Wizard antwoorden:
${answersContext}`
				}
			]
		});

		const content = message.content[0];
		if (content.type === 'text') return content.text;
	} catch (error) {
		console.error('ENV generatie fout:', error);
	}

	// FALLBACK: templates.ts (ZIP-kwaliteit)
	return generateEnvExampleTemplate(gsdAnswers);
}

async function generateEnrichedDesignSkill(
	answers: WizardAnswer[],
	gsdAnswers: WizardAnswers
): Promise<string> {
	const answersContext = answers
		.map((a, i) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.answer}`)
		.join('\n');
	const structuredContext = buildStructuredContext(gsdAnswers);

	try {
		const message = await streamWithRetry({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 4096,
			system: DESIGN_SKILL_GENERATOR_PROMPT,
			messages: [
				{
					role: 'user',
					content: `Genereer een design skill voor dit project:

${structuredContext}

Wizard antwoorden:
${answersContext}`
				}
			]
		});

		const content = message.content[0];
		if (content.type === 'text') return content.text;
	} catch (error) {
		console.error('Design skill generatie fout:', error);
	}

	// FALLBACK: templates.ts als GSD data beschikbaar, anders generator.ts (bare minimum)
	if (gsdAnswers.designStyle) {
		return generateDesignSkillTemplate(gsdAnswers);
	}
	return generateDesignSkill(answers);
}

// Lees originele agent bestanden uit ProjectWizard
async function readAgentFile(relativePath: string): Promise<string | null> {
	const basePath = process.env.PROJECT_ROOT || process.cwd();
	const fullPath = join(basePath, relativePath);
	try {
		return await readFile(fullPath, 'utf-8');
	} catch {
		return null;
	}
}

// Helper: genereer GSD .planning/ bestanden als file array
function generateGSDFiles(gsdAnswers: WizardAnswers): Array<{ path: string; content: string }> {
	const gsd = generateGSDFolder(gsdAnswers);

	return [
		{ path: '.planning/PROJECT.md', content: gsd.project },
		{ path: '.planning/REQUIREMENTS.md', content: gsd.requirements },
		{ path: '.planning/ROADMAP.md', content: gsd.roadmap },
		{ path: '.planning/config.json', content: JSON.stringify(gsd.config, null, 2) },
		{ path: '.planning/INITIAL_CONTEXT.md', content: gsd.context },
		{ path: '.planning/STATE.md', content: gsd.state }
	];
}

// Helper: maak URL-veilige naam
function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

// SSE streaming endpoint
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const validation = validateRequest(generateRequestSchema, body);
	if (!validation.valid) return validation.error;

	const { projectName, description, answers, stream: useStream, format } = validation.data;

	const safeName = projectName
		.toLowerCase()
		.replace(/[^a-z0-9\-_]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

	// GSD ZIP/preview modes
	if (format === 'preview' || format === 'zip-full' || format === 'zip-planning') {
		try {
			const gsdAnswers = mapAnswersToGSD(answers, description, projectName);

			if (format === 'preview') {
				const gsd = generateGSDFolder(gsdAnswers);
				return json({
					success: true,
					preview: {
						project: gsd.project,
						requirements: gsd.requirements,
						roadmap: gsd.roadmap,
						config: gsd.config,
						context: gsd.context
					}
				});
			}

			let blob: Blob;
			let filename: string;

			if (format === 'zip-planning') {
				blob = await generatePlanningOnly(gsdAnswers);
				filename = `${slugify(projectName)}-planning.zip`;
			} else {
				blob = await generateProjectBundle(gsdAnswers, {
					projectName: slugify(projectName),
					includeExistingOutput: true
				});
				filename = `${slugify(projectName)}-complete.zip`;
			}

			const buffer = await blob.arrayBuffer();

			return new Response(buffer, {
				status: 200,
				headers: {
					'Content-Type': 'application/zip',
					'Content-Disposition': `attachment; filename="${filename}"`,
					'Content-Length': buffer.byteLength.toString()
				}
			});
		} catch (err) {
			return sanitizedError(err, 'Fout bij GSD generatie');
		}
	}

	// Maak WizardAnswers eenmalig aan VOOR Promise.allSettled — hergebruik overal
	const gsdAnswers = mapAnswersToGSD(answers, description, projectName);

	// Streaming: SSE voor real-time voortgang
	if (useStream) {
		const encoder = new TextEncoder();
		const readable = new ReadableStream({
			async start(controller) {
				function send(event: string, data: unknown) {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
				}

				try {
					send('progress', { step: 'AI bestanden genereren...', pct: 10 });

					// Parallel AI generation voor snelheid
					const [claudeMdResult, promptMdResult, mcpResult, envResult] = await Promise.allSettled([
						generateEnrichedClaudeMd(projectName, description, answers, gsdAnswers),
						generateEnrichedPromptMd(projectName, description, answers, gsdAnswers),
						generateEnrichedMcpJson(answers, gsdAnswers),
						generateEnrichedEnvExample(answers, gsdAnswers)
					]);

					// Enrichment functies bevatten nu interne fallback naar templates.ts
					const claudeMd =
						claudeMdResult.status === 'fulfilled'
							? claudeMdResult.value
							: generateClaudeMdTemplate(gsdAnswers);
					const promptMd =
						promptMdResult.status === 'fulfilled'
							? promptMdResult.value
							: generatePromptMdTemplate(gsdAnswers);
					const mcpJson =
						mcpResult.status === 'fulfilled' ? mcpResult.value : generateMcpJsonTemplate(gsdAnswers);
					const envExample =
						envResult.status === 'fulfilled' ? envResult.value : generateEnvExampleTemplate(gsdAnswers);

					send('progress', { step: 'Config bestanden aanmaken...', pct: 60 });

					const files: Array<{ path: string; content: string }> = [
						{ path: 'CLAUDE.md', content: claudeMd },
						{ path: 'PROMPT.md', content: promptMd },
						{ path: '.mcp.json', content: mcpJson },
						{ path: '.env.example', content: envExample },
						{ path: '.gitignore', content: generateGitignore() }
					];

					// Kopieer agent bestanden — gebruik gedeelde specialist-detectie
					const specialists = getActiveSpecialists(gsdAnswers);
					files.push({ path: 'agents/coordinator.md', content: await readAgentFile('agents/coordinator.md') || '' });
					for (const specialist of specialists) {
						const content = await readAgentFile(specialist.agentFile);
						if (content) {
							files.push({ path: specialist.agentFile, content });
						}
					}

					// GSD .planning/ folder genereren
					send('progress', { step: 'GSD planning genereren...', pct: 75 });
					const gsdFiles = generateGSDFiles(gsdAnswers);
					files.push(...gsdFiles);

					// Agent Team configuratie genereren
					files.push({ path: 'TEAM.md', content: generateTeamMd(gsdAnswers) });

					// Design skill genereren (als er design antwoorden zijn)
					const hasDesignAnswers = answers.some(
						(a: WizardAnswer) => a.specialist === 'design' && a.type !== 'skipped'
					);
					if (hasDesignAnswers) {
						send('progress', { step: 'Design skill genereren...', pct: 82 });
						const designSkill = await generateEnrichedDesignSkill(answers, gsdAnswers);
						files.push({
							path: '.claude/skills/design.md',
							content: designSkill
						});
					}

					// Overige skills genereren (backend, testing, integration, deployment, security)
					send('progress', { step: 'Project skills genereren...', pct: 88 });
					const skillFiles = await generateSkills(specialists, answers, gsdAnswers);
					files.push(...skillFiles);

					send('progress', { step: 'Klaar!', pct: 100 });
					send('done', {
						success: true,
						files: files.map((f) => ({ path: f.path, content: f.content })),
						message: `Project "${projectName}" is gegenereerd.`,
						requiredEnvVars: detectRequiredEnvVars(answers)
					});
				} catch (error) {
					send('error', {
						error: error instanceof Error ? error.message : 'Onbekende fout'
					});
				} finally {
					controller.close();
				}
			}
		});

		return new Response(readable, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	}

	// Non-streaming fallback
	try {
		// Parallel AI generation voor snelheid
		const [claudeMdResult, promptMdResult, mcpResult, envResult] = await Promise.allSettled([
			generateEnrichedClaudeMd(projectName, description, answers, gsdAnswers),
			generateEnrichedPromptMd(projectName, description, answers, gsdAnswers),
			generateEnrichedMcpJson(answers, gsdAnswers),
			generateEnrichedEnvExample(answers, gsdAnswers)
		]);

		// Enrichment functies bevatten nu interne fallback naar templates.ts
		const claudeMd =
			claudeMdResult.status === 'fulfilled'
				? claudeMdResult.value
				: generateClaudeMdTemplate(gsdAnswers);
		const promptMd =
			promptMdResult.status === 'fulfilled'
				? promptMdResult.value
				: generatePromptMdTemplate(gsdAnswers);
		const mcpJson =
			mcpResult.status === 'fulfilled' ? mcpResult.value : generateMcpJsonTemplate(gsdAnswers);
		const envExample =
			envResult.status === 'fulfilled' ? envResult.value : generateEnvExampleTemplate(gsdAnswers);

		const files: Array<{ path: string; content: string }> = [
			{ path: 'CLAUDE.md', content: claudeMd },
			{ path: 'PROMPT.md', content: promptMd },
			{ path: '.mcp.json', content: mcpJson },
			{ path: '.env.example', content: envExample },
			{ path: '.gitignore', content: generateGitignore() }
		];

		// Agent bestanden — gebruik gedeelde specialist-detectie
		const specialists = getActiveSpecialists(gsdAnswers);
		files.push({ path: 'agents/coordinator.md', content: await readAgentFile('agents/coordinator.md') || '' });
		for (const specialist of specialists) {
			const content = await readAgentFile(specialist.agentFile);
			if (content) {
				files.push({ path: specialist.agentFile, content });
			}
		}

		// GSD .planning/ folder genereren
		const gsdFiles = generateGSDFiles(gsdAnswers);
		files.push(...gsdFiles);

		// Agent Team configuratie genereren
		files.push({ path: 'TEAM.md', content: generateTeamMd(gsdAnswers) });

		// Design skill genereren (als er design antwoorden zijn)
		const hasDesignAnswers = answers.some(
			(a: WizardAnswer) => a.specialist === 'design' && a.type !== 'skipped'
		);
		if (hasDesignAnswers) {
			const designSkill = await generateEnrichedDesignSkill(answers, gsdAnswers);
			files.push({
				path: '.claude/skills/design.md',
				content: designSkill
			});
		}

		// Overige skills genereren (backend, testing, integration, deployment, security)
		const skillFiles = await generateSkills(specialists, answers, gsdAnswers);
		files.push(...skillFiles);

		return json({
			success: true,
			files: files.map((f) => ({ path: f.path, content: f.content })),
			message: `Project "${projectName}" is gegenereerd.`,
			requiredEnvVars: detectRequiredEnvVars(answers)
		});
	} catch (error) {
		return sanitizedError(error, 'Fout bij het genereren van het project');
	}
};
