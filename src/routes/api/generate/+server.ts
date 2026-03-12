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
	generateDesignSkillTemplate,
	generateCoordinatorAgentTemplate,
	getSpecialistTemplate,
	generateProductVisionTemplate,
	hasEnoughProductStrategy,
	generateStitchPrompt
} from '$lib/generators/templates';
import { getActiveSpecialists } from '$lib/generators/specialist-detection';
import { generateSkills } from '$lib/generators/skill-generator';
import type { WizardAnswer } from '$lib/types';
import type { WizardAnswers } from '$lib/types/gsd';
import { generateGSDFolder } from '$lib/generators/gsd-generator';
import { generateProjectBundle, generatePlanningOnly } from '$lib/generators/zip-bundler';
import { mapAnswersToGSD } from '$lib/generators/answer-mapper';
import { generateRequestSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';
import { logAuditEvent } from '$lib/server/audit';
import { streamWithRetry } from '$lib/server/anthropic-client';
import { isGeminiAvailable, generateWithGemini } from '$lib/server/gemini-client';
import {
	GENERATOR_SYSTEM_PROMPT,
	PROMPT_GENERATOR_SYSTEM,
	MCP_GENERATOR_PROMPT,
	ENV_GENERATOR_PROMPT,
	DESIGN_SKILL_GENERATOR_PROMPT
} from '$lib/prompts/generator';
import { generateTeamMd } from '$lib/generators/team-generator';
import pLimit from 'p-limit';

// Max 3 parallelle Anthropic API calls
const aiLimit = pLimit(3);

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

// ─── AI-enriched generatie functies (met template fallback) ──────────────────

type FileSource = 'ai' | 'ai-gemini' | 'template';
interface EnrichedResult { content: string; source: FileSource }

async function generateEnrichedClaudeMd(
	projectName: string,
	description: string,
	answersContext: string,
	structuredContext: string,
	gsdAnswers: WizardAnswers
): Promise<EnrichedResult> {
	try {
		const message = await aiLimit(() =>
			streamWithRetry({
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
			})
		);

		const content = message.content[0];
		if (content.type === 'text') return { content: content.text, source: 'ai' };
	} catch (error) {
		console.error('Claude generatie fout:', error);
	}

	return { content: generateClaudeMdTemplate(gsdAnswers), source: 'template' };
}

async function generateEnrichedPromptMd(
	projectName: string,
	description: string,
	answersContext: string,
	structuredContext: string,
	gsdAnswers: WizardAnswers
): Promise<EnrichedResult> {
	try {
		const message = await aiLimit(() =>
			streamWithRetry({
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
			})
		);

		const content = message.content[0];
		if (content.type === 'text') return { content: content.text, source: 'ai' };
	} catch (error) {
		console.error('Prompt generatie fout:', error);
	}

	return { content: generatePromptMdTemplate(gsdAnswers), source: 'template' };
}

async function generateEnrichedMcpJson(
	answersContext: string,
	structuredContext: string,
	gsdAnswers: WizardAnswers
): Promise<EnrichedResult> {
	try {
		const message = await aiLimit(() =>
			streamWithRetry({
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
			})
		);

		const content = message.content[0];
		if (content.type === 'text') return { content: content.text, source: 'ai' };
	} catch (error) {
		console.error('MCP generatie fout:', error);
	}

	return { content: generateMcpJsonTemplate(gsdAnswers), source: 'template' };
}

async function generateEnrichedEnvExample(
	answersContext: string,
	structuredContext: string,
	gsdAnswers: WizardAnswers
): Promise<EnrichedResult> {
	try {
		const message = await aiLimit(() =>
			streamWithRetry({
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
			})
		);

		const content = message.content[0];
		if (content.type === 'text') return { content: content.text, source: 'ai' };
	} catch (error) {
		console.error('ENV generatie fout:', error);
	}

	return { content: generateEnvExampleTemplate(gsdAnswers), source: 'template' };
}

async function generateEnrichedDesignSkill(
	answersContext: string,
	structuredContext: string,
	answers: WizardAnswer[],
	gsdAnswers: WizardAnswers
): Promise<EnrichedResult> {
	const designPrompt = `Genereer een design skill voor dit project:\n\n${structuredContext}\n\nWizard antwoorden:\n${answersContext}`;

	// Probeer Gemini eerst (sneller + goedkoper voor design tasks)
	if (isGeminiAvailable()) {
		try {
			const geminiResult = await generateWithGemini(designPrompt, DESIGN_SKILL_GENERATOR_PROMPT);
			if (geminiResult) return { content: geminiResult, source: 'ai-gemini' };
		} catch (error) {
			console.warn('Gemini design skill mislukt, val terug op Claude:', error);
		}
	}

	// Claude fallback
	try {
		const message = await aiLimit(() =>
			streamWithRetry({
				model: 'claude-sonnet-4-5-20250929',
				max_tokens: 4096,
				system: DESIGN_SKILL_GENERATOR_PROMPT,
				messages: [{ role: 'user', content: designPrompt }]
			})
		);

		const content = message.content[0];
		if (content.type === 'text') return { content: content.text, source: 'ai' };
	} catch (error) {
		console.error('Design skill generatie fout:', error);
	}

	// Template fallback
	if (gsdAnswers.designStyle) {
		return { content: generateDesignSkillTemplate(gsdAnswers), source: 'template' };
	}
	return { content: generateDesignSkill(answers), source: 'template' };
}

// ─── Gedeelde file-generatie logica ──────────────────────────────────────────

interface GenerateOptions {
	projectName: string;
	description: string;
	answers: WizardAnswer[];
	gsdAnswers: WizardAnswers;
	onProgress?: (step: string, pct: number) => void;
}

interface GeneratedFile { path: string; content: string; source: FileSource }

async function generateAllFiles(opts: GenerateOptions): Promise<GeneratedFile[]> {
	const { projectName, description, answers, gsdAnswers, onProgress } = opts;

	const answersContext = answers
		.map((a, i) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.answer}`)
		.join('\n');
	const structuredContext = buildStructuredContext(gsdAnswers);

	onProgress?.('AI bestanden genereren...', 10);

	// Parallel AI generation met concurrency limiet (p-limit)
	const [claudeMdResult, promptMdResult, mcpResult, envResult] = await Promise.allSettled([
		generateEnrichedClaudeMd(projectName, description, answersContext, structuredContext, gsdAnswers),
		generateEnrichedPromptMd(projectName, description, answersContext, structuredContext, gsdAnswers),
		generateEnrichedMcpJson(answersContext, structuredContext, gsdAnswers),
		generateEnrichedEnvExample(answersContext, structuredContext, gsdAnswers)
	]);

	const claudeMd = claudeMdResult.status === 'fulfilled'
		? claudeMdResult.value
		: { content: generateClaudeMdTemplate(gsdAnswers), source: 'template' as const };
	const promptMd = promptMdResult.status === 'fulfilled'
		? promptMdResult.value
		: { content: generatePromptMdTemplate(gsdAnswers), source: 'template' as const };
	const mcpJson = mcpResult.status === 'fulfilled'
		? mcpResult.value
		: { content: generateMcpJsonTemplate(gsdAnswers), source: 'template' as const };
	const envExample = envResult.status === 'fulfilled'
		? envResult.value
		: { content: generateEnvExampleTemplate(gsdAnswers), source: 'template' as const };

	onProgress?.('Config bestanden aanmaken...', 60);

	const files: GeneratedFile[] = [
		{ path: 'CLAUDE.md', ...claudeMd },
		{ path: 'PROMPT.md', ...promptMd },
		{ path: '.mcp.json', ...mcpJson },
		{ path: '.env.example', ...envExample },
		{ path: '.gitignore', content: generateGitignore(), source: 'template' }
	];

	// Agent bestanden via templates (geen filesystem reads)
	const specialists = getActiveSpecialists(gsdAnswers);
	files.push({
		path: 'agents/coordinator.md',
		content: generateCoordinatorAgentTemplate(gsdAnswers),
		source: 'template'
	});
	for (const specialist of specialists) {
		files.push({
			path: specialist.agentFile,
			content: getSpecialistTemplate(specialist.id, gsdAnswers),
			source: 'template'
		});
	}

	// GSD .planning/ folder
	onProgress?.('GSD planning genereren...', 75);
	const gsd = generateGSDFolder(gsdAnswers);
	files.push(
		{ path: '.planning/PROJECT.md', content: gsd.project, source: 'template' },
		{ path: '.planning/REQUIREMENTS.md', content: gsd.requirements, source: 'template' },
		{ path: '.planning/ROADMAP.md', content: gsd.roadmap, source: 'template' },
		{ path: '.planning/config.json', content: JSON.stringify(gsd.config, null, 2), source: 'template' },
		{ path: '.planning/INITIAL_CONTEXT.md', content: gsd.context, source: 'template' },
		{ path: '.planning/STATE.md', content: gsd.state, source: 'template' }
	);

	// Team configuratie
	files.push({ path: 'TEAM.md', content: generateTeamMd(gsdAnswers), source: 'template' });

	// Design skill (als er design antwoorden zijn)
	const hasDesignAnswers = answers.some(
		(a: WizardAnswer) => a.specialist === 'design' && a.type !== 'skipped'
	);
	if (hasDesignAnswers) {
		onProgress?.('Design skill genereren...', 82);
		const designSkill = await generateEnrichedDesignSkill(
			answersContext, structuredContext, answers, gsdAnswers
		);
		files.push({ path: '.claude/skills/design.md', ...designSkill });
	}

	// Overige skills
	onProgress?.('Project skills genereren...', 88);
	const skillFiles = await generateSkills(specialists, answers, gsdAnswers);
	files.push(...skillFiles.map(f => ({ ...f, source: 'ai' as FileSource })));

	// PRODUCT-VISION.md — alleen als 2+ bonus categorieën beantwoord
	if (hasEnoughProductStrategy(gsdAnswers)) {
		files.push({
			path: 'PRODUCT-VISION.md',
			content: generateProductVisionTemplate(gsdAnswers),
			source: 'template'
		});
	}

	// STITCH-PROMPT.txt — altijd als er voldoende data is
	const stitchPrompt = generateStitchPrompt(gsdAnswers);
	if (stitchPrompt.length > 30) {
		files.push({
			path: 'STITCH-PROMPT.txt',
			content: [
				'# Google Stitch UI Preview Prompt',
				'# Kopieer dit naar: https://stitch.withgoogle.com',
				'# Gebruik Experimental mode voor beste resultaten',
				'',
				stitchPrompt
			].join('\n'),
			source: 'template'
		});
	}

	onProgress?.('Klaar!', 100);

	return files;
}

// Helper: maak URL-veilige naam
function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

// ─── Endpoint ────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
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
					const files = await generateAllFiles({
						projectName,
						description,
						answers,
						gsdAnswers,
						onProgress: (step, pct) => send('progress', { step, pct })
					});

					// Audit logging (fire-and-forget)
					const aiFiles = files.filter(f => f.source === 'ai' || f.source === 'ai-gemini').map(f => f.path);
					const templateFiles = files.filter(f => f.source === 'template').map(f => f.path);
					logAuditEvent(locals.supabase, {
						userId: locals.user?.id,
						action: 'generate',
						metadata: {
							projectName,
							answerCount: answers.length,
							fileCount: files.length,
							aiFiles,
							templateFiles
						}
					});

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
		const files = await generateAllFiles({
			projectName,
			description,
			answers,
			gsdAnswers
		});

		// Audit logging (fire-and-forget)
		const aiFiles = files.filter(f => f.source === 'ai').map(f => f.path);
		const templateFiles = files.filter(f => f.source === 'template').map(f => f.path);
		logAuditEvent(locals.supabase, {
			userId: locals.user?.id,
			action: 'generate',
			metadata: {
				projectName,
				answerCount: answers.length,
				fileCount: files.length,
				aiFiles,
				templateFiles
			}
		});

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
