import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	generateClaudeMd,
	generatePromptMd,
	generateMcpJson,
	generateEnvExample,
	generateGitignore,
	detectSpecialists,
	detectRequiredEnvVars,
	generateDesignSkill
} from '$lib/generator';
import type { WizardAnswer } from '$lib/types';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { generateGSDFolder } from '$lib/generators/gsd-generator';
import { generateProjectBundle, generatePlanningOnly } from '$lib/generators/zip-bundler';
import { mapAnswersToGSD } from '$lib/generators/answer-mapper';
import { generateRequestSchema } from '$lib/validation/schemas';
import { validateRequest } from '$lib/validation/validate';
import { sanitizedError } from '$lib/server/errors';
import { streamWithRetry } from '$lib/server/anthropic-client';
import { GENERATOR_SYSTEM_PROMPT, PROMPT_GENERATOR_SYSTEM } from '$lib/prompts/generator';

async function generateEnrichedClaudeMd(
	projectName: string,
	description: string,
	answers: WizardAnswer[]
): Promise<string> {
	const answersContext = answers
		.map((a, i) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.answer}`)
		.join('\n');

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

	return generateClaudeMd({ projectName, description, answers });
}

async function generateEnrichedPromptMd(
	projectName: string,
	description: string,
	answers: WizardAnswer[]
): Promise<string> {
	const answersContext = answers
		.map((a, i) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.answer}`)
		.join('\n');

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

	return generatePromptMd({ projectName, description, answers });
}

async function writeProjectFiles(
	outputPath: string,
	files: Array<{ path: string; content: string }>
): Promise<void> {
	await mkdir(outputPath, { recursive: true });

	for (const file of files) {
		const filePath = join(outputPath, file.path);
		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, file.content, 'utf-8');
	}
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
function generateGSDFiles(
	projectName: string,
	description: string,
	answers: WizardAnswer[]
): Array<{ path: string; content: string }> {
	const gsdAnswers = mapAnswersToGSD(answers, description, projectName);
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

	const outputPath = join(process.env.OUTPUT_DIR || '/tmp/projects', safeName);

	// Streaming: SSE voor real-time voortgang
	if (useStream) {
		const encoder = new TextEncoder();
		const readable = new ReadableStream({
			async start(controller) {
				function send(event: string, data: unknown) {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
				}

				try {
					send('progress', { step: 'CLAUDE.md genereren...', pct: 10 });
					const claudeMd = await generateEnrichedClaudeMd(projectName, description, answers);

					send('progress', { step: 'PROMPT.md genereren...', pct: 40 });
					const promptMd = await generateEnrichedPromptMd(projectName, description, answers);

					send('progress', { step: 'Config bestanden aanmaken...', pct: 70 });
					const files: Array<{ path: string; content: string }> = [
						{ path: 'CLAUDE.md', content: claudeMd },
						{ path: 'PROMPT.md', content: promptMd },
						{ path: '.mcp.json', content: generateMcpJson(answers) },
						{ path: '.env.example', content: generateEnvExample(answers) },
						{ path: '.gitignore', content: generateGitignore() }
					];

					// Kopieer agent bestanden
					const specialists = detectSpecialists(answers);
					for (const specialist of specialists) {
						const srcPath =
							specialist === 'coordinator'
								? 'agents/coordinator.md'
								: `agents/specialists/${specialist}.md`;
						const content = await readAgentFile(srcPath);
						if (content) {
							files.push({ path: srcPath, content });
						}
					}

					// GSD .planning/ folder genereren
					send('progress', { step: 'GSD planning genereren...', pct: 75 });
					const gsdFiles = generateGSDFiles(projectName, description, answers);
					files.push(...gsdFiles);

					// Design skill genereren (als er design antwoorden zijn)
					const hasDesignAnswers = answers.some(
						(a: WizardAnswer) => a.specialist === 'design' && a.type !== 'skipped'
					);
					if (hasDesignAnswers) {
						send('progress', { step: 'Design skill genereren...', pct: 82 });
						files.push({
							path: '.claude/skills/design.md',
							content: generateDesignSkill(answers)
						});
					}

					send('progress', { step: 'Bestanden schrijven naar disk...', pct: 88 });
					await writeProjectFiles(outputPath, files);

					send('progress', { step: 'Klaar!', pct: 100 });
					send('done', {
						success: true,
						outputPath,
						files: files.map((f) => f.path),
						message: `Project "${projectName}" is gegenereerd in ${outputPath}`,
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
		const [claudeMd, promptMd] = await Promise.all([
			generateEnrichedClaudeMd(projectName, description, answers),
			generateEnrichedPromptMd(projectName, description, answers)
		]);

		const files: Array<{ path: string; content: string }> = [
			{ path: 'CLAUDE.md', content: claudeMd },
			{ path: 'PROMPT.md', content: promptMd },
			{ path: '.mcp.json', content: generateMcpJson(answers) },
			{ path: '.env.example', content: generateEnvExample(answers) },
			{ path: '.gitignore', content: generateGitignore() }
		];

		const specialists = detectSpecialists(answers);
		for (const specialist of specialists) {
			const srcPath =
				specialist === 'coordinator'
					? 'agents/coordinator.md'
					: `agents/specialists/${specialist}.md`;
			const content = await readAgentFile(srcPath);
			if (content) {
				files.push({ path: srcPath, content });
			}
		}

		// GSD .planning/ folder genereren
		const gsdFiles = generateGSDFiles(projectName, description, answers);
		files.push(...gsdFiles);

		// Design skill genereren (als er design antwoorden zijn)
		const hasDesignAnswers = answers.some(
			(a: WizardAnswer) => a.specialist === 'design' && a.type !== 'skipped'
		);
		if (hasDesignAnswers) {
			files.push({
				path: '.claude/skills/design.md',
				content: generateDesignSkill(answers)
			});
		}

		await writeProjectFiles(outputPath, files);

		return json({
			success: true,
			outputPath,
			files: files.map((f) => f.path),
			message: `Project "${projectName}" is gegenereerd in ${outputPath}`,
			requiredEnvVars: detectRequiredEnvVars(answers)
		});
	} catch (error) {
		return sanitizedError(error, 'Fout bij het genereren van het project');
	}
};
