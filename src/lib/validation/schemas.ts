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

// Herbruikbaar schema voor gegenereerde output
const generatedOutputSchema = z.object({
	project_name: z.string(),
	files: z.array(
		z.object({
			path: z.string(),
			content: z.string()
		})
	)
});

// --- API endpoint schemas ---

// POST /api/chat
export const chatRequestSchema = z.object({
	projectDescription: z.string().min(1).max(10000),
	answers: z.array(wizardAnswerSchema).optional(),
	currentStep: z.number().int().min(0).max(100),
	completedCategories: z.array(z.string()).optional(),
	userAnswer: z.string().optional()
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
				return sizeInBytes <= 5 * 1024 * 1024;
			},
			{ message: 'Afbeelding mag maximaal 5MB zijn' }
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
		generated_output: generatedOutputSchema.nullable().optional()
	})
	.strict();
