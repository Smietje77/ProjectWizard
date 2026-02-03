import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
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

function getClient() {
	return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

const GENERATOR_SYSTEM = `Je bent een project scaffold generator. Op basis van de wizard antwoorden genereer je een CLAUDE.md bestand dat perfect aansluit bij het gewenste project.

Je output is een volledig CLAUDE.md bestand in markdown formaat. Dit bestand is de primaire context voor Claude Code om het project te bouwen.

Structuur:
1. Project Overzicht (naam, doel, beschrijving)
2. Tech Stack (met versies)
3. Bash Commands (install, dev, build, test)
4. Architectuur (mappenstructuur, componenten)
5. Database Schema (als van toepassing)
6. Code Conventies
7. Belangrijke Flows (user journeys)
8. MCP Integraties
9. Omgevingsvariabelen

Schrijf in het Nederlands. Wees specifiek en gedetailleerd.`;

async function generateEnrichedClaudeMd(
	projectName: string,
	description: string,
	answers: WizardAnswer[]
): Promise<string> {
	const answersContext = answers
		.map((a, i) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.answer}`)
		.join('\n');

	try {
		const stream = await getClient().messages.stream({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 4096,
			system: GENERATOR_SYSTEM,
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

		const message = await stream.finalMessage();
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
		const stream = await getClient().messages.stream({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 4096,
			system: `Je bent een prompt generator. Genereer een PROMPT.md bestand dat Claude Code instructies geeft om het project stap voor stap te bouwen. Schrijf in het Nederlands. Bevat: projectbeschrijving, gefaseerde bouwinstructies, requirements, kwaliteitscriteria.`,
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

		const message = await stream.finalMessage();
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
	const { projectName, description, answers, stream: useStream, format } = await request.json();

	if (!projectName || !description || !answers?.length) {
		return json({ error: 'Missende velden: projectName, description, answers' }, { status: 400 });
	}

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
			console.error('GSD generatie fout:', err);
			return json(
				{ error: `GSD fout: ${err instanceof Error ? err.message : 'Onbekende fout'}` },
				{ status: 500 }
			);
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
		console.error('Project generatie fout:', error);
		return json(
			{ error: `Fout bij het genereren: ${error instanceof Error ? error.message : 'Onbekende fout'}` },
			{ status: 500 }
		);
	}
};
