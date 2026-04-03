import { z } from 'zod';

// Herbruikbaar schema voor wizard antwoorden
export const wizardAnswerSchema = z.object({
	step: z.number().int().min(0),
	specialist: z.string().min(1),
	question: z.string().min(1),
	answer: z.string().min(1),
	type: z.enum(['free_text', 'multiple_choice', 'follow_up', 'skipped']),
	categorie: z.string().optional()
});

// Herbruikbaar schema voor gegenereerde output (matcht response van /api/generate)
const generatedOutputSchema = z.object({
	success: z.boolean(),
	files: z
		.array(z.object({ path: z.string(), content: z.string() }))
		.optional(),
	message: z.string().optional(),
	requiredEnvVars: z
		.array(
			z.object({
				key: z.string(),
				comment: z.string().optional(),
				example: z.string().optional(),
				service: z.string().optional(),
				dashboardLink: z.string().optional(),
				sensitive: z.boolean().optional(),
				label: z.string().optional(),
				format: z.string().optional()
			})
		)
		.optional(),
	error: z.string().optional()
});

// --- API endpoint schemas ---

// POST /api/chat
export const chatRequestSchema = z.object({
	projectDescription: z.string().min(1).max(50000),
	answers: z.array(wizardAnswerSchema).optional(),
	currentStep: z.number().int().min(0).max(100),
	completedCategories: z.array(z.string()).optional(),
	userAnswer: z.string().optional(),
	documentContext: z.string().max(500000).optional()
});

// POST /api/extract-document
export const extractDocumentSchema = z.object({
	file: z.string().min(1),
	filename: z.string().min(1).max(500),
	mimeType: z.enum(['text/plain', 'text/markdown', 'application/pdf'])
});

// POST /api/generate
export const generateRequestSchema = z.object({
	projectName: z.string().min(1).max(200),
	description: z.string().min(1).max(10000),
	answers: z.array(wizardAnswerSchema).min(1),
	stream: z.boolean().optional(),
	format: z.enum(['preview', 'zip-full', 'zip-planning']).optional()
});

// POST /api/analyze-screenshot
export const analyzeScreenshotSchema = z.object({
	image: z
		.string()
		.regex(/^data:image\/(jpeg|png|webp|gif);base64,/, 'Ongeldig afbeeldingsformaat')
		.refine(
			(val) => {
				const base64Part = val.split(',')[1];
				if (!base64Part) return false;
				const sizeInBytes = (base64Part.length * 3) / 4;
				return sizeInBytes <= 10 * 1024 * 1024;
			},
			{ message: 'Afbeelding mag maximaal 10MB zijn' }
		)
});

// POST /api/env
export const envRequestSchema = z.object({
	outputPath: z.string().min(1),
	envVars: z.record(z.string(), z.string().max(1000))
});

// POST /api/projects
export const createProjectSchema = z.object({
	name: z.string().min(1).max(200),
	description: z.string().max(10000).nullable().optional(),
	answers: z.array(wizardAnswerSchema).optional(),
	current_step: z.number().int().min(0).optional()
});

// PATCH /api/projects/[id]
export const updateProjectSchema = z
	.object({
		name: z.string().min(1).max(200).optional(),
		description: z.string().max(10000).nullable().optional(),
		answers: z.array(wizardAnswerSchema).optional(),
		current_step: z.number().int().min(0).optional(),
		generated_output: generatedOutputSchema.nullable().optional(),
		category_depth: z.record(z.string(), z.enum(['onvoldoende', 'basis', 'voldoende'])).nullable().optional(),
		is_complete: z.boolean().optional()
	})
	.strict();

// --- AI response schemas (runtime validatie van Claude API responses) ---

// Critic agent response (matcht format uit prompts/critic.ts)
export const criticResponseSchema = z.object({
	problemen: z.array(
		z.object({
			type: z.enum(['tegenstrijdigheid', 'onrealistisch', 'ontbrekend', 'schaalbaarheid']),
			beschrijving: z.string(),
			suggestie: z.string()
		})
	)
});

// Coordinator response (matcht CoordinatorResponse interface uit stores/wizard.svelte.ts)
export const coordinatorResponseSchema = z.object({
	volgende_specialist: z.string().min(1),
	vraag: z.string().min(1),
	vraag_type: z.enum(['multiple_choice', 'vrije_tekst']),
	opties: z.array(z.string()).nullable().optional(),
	max_selecties: z.number().int().positive().nullable().optional(),
	categorie: z.string().nullable().optional(),
	advies: z.string(),
	advies_reden: z.string(),
	is_compleet: z.boolean(),
	antwoord_kwaliteit: z.number().nullable().optional(),
	kwaliteit_feedback: z.string().nullable().optional(),
	categorie_diepte: z
		.record(z.string(), z.enum(['onvoldoende', 'basis', 'voldoende']))
		.nullable()
		.optional(),
	critic_feedback: z.string().nullable().optional()
});
