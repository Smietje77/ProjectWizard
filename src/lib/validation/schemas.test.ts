import { describe, it, expect } from 'vitest';
import {
	chatRequestSchema,
	generateRequestSchema,
	analyzeScreenshotSchema,
	envRequestSchema,
	createProjectSchema,
	updateProjectSchema
} from './schemas';

describe('chatRequestSchema', () => {
	it('accepteert geldige input', () => {
		const result = chatRequestSchema.safeParse({
			projectDescription: 'Een todo app bouwen',
			currentStep: 0
		});
		expect(result.success).toBe(true);
	});

	it('accepteert volledige input met answers', () => {
		const result = chatRequestSchema.safeParse({
			projectDescription: 'Een webshop bouwen',
			answers: [
				{
					step: 0,
					specialist: 'requirements',
					question: 'Wat is het doel?',
					answer: 'Online verkopen',
					type: 'free_text',
					categorie: 'project_doel'
				}
			],
			currentStep: 1,
			completedCategories: ['project_doel'],
			userAnswer: 'Online verkopen'
		});
		expect(result.success).toBe(true);
	});

	it('weigert lege projectDescription', () => {
		const result = chatRequestSchema.safeParse({
			projectDescription: '',
			currentStep: 0
		});
		expect(result.success).toBe(false);
	});

	it('weigert negatieve currentStep', () => {
		const result = chatRequestSchema.safeParse({
			projectDescription: 'Test project',
			currentStep: -1
		});
		expect(result.success).toBe(false);
	});

	it('weigert ongeldig answer type', () => {
		const result = chatRequestSchema.safeParse({
			projectDescription: 'Test project',
			currentStep: 0,
			answers: [
				{
					step: 0,
					specialist: 'requirements',
					question: 'Test',
					answer: 'Test',
					type: 'invalid_type'
				}
			]
		});
		expect(result.success).toBe(false);
	});
});

describe('generateRequestSchema', () => {
	const validAnswer = {
		step: 0,
		specialist: 'requirements',
		question: 'Wat?',
		answer: 'Iets',
		type: 'free_text' as const
	};

	it('accepteert geldige input', () => {
		const result = generateRequestSchema.safeParse({
			projectName: 'MijnProject',
			description: 'Een test project',
			answers: [validAnswer]
		});
		expect(result.success).toBe(true);
	});

	it('accepteert met format optie', () => {
		const result = generateRequestSchema.safeParse({
			projectName: 'Test',
			description: 'Test beschrijving',
			answers: [validAnswer],
			format: 'zip-full',
			stream: true
		});
		expect(result.success).toBe(true);
	});

	it('weigert lege answers array', () => {
		const result = generateRequestSchema.safeParse({
			projectName: 'Test',
			description: 'Test',
			answers: []
		});
		expect(result.success).toBe(false);
	});

	it('weigert ongeldig format', () => {
		const result = generateRequestSchema.safeParse({
			projectName: 'Test',
			description: 'Test',
			answers: [validAnswer],
			format: 'invalid-format'
		});
		expect(result.success).toBe(false);
	});
});

describe('analyzeScreenshotSchema', () => {
	it('accepteert geldig JPEG data URL', () => {
		const smallBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ';
		const result = analyzeScreenshotSchema.safeParse({
			image: `data:image/jpeg;base64,${smallBase64}`
		});
		expect(result.success).toBe(true);
	});

	it('weigert niet-image data URL', () => {
		const result = analyzeScreenshotSchema.safeParse({
			image: 'data:text/plain;base64,aGVsbG8='
		});
		expect(result.success).toBe(false);
	});

	it('weigert lege string', () => {
		const result = analyzeScreenshotSchema.safeParse({ image: '' });
		expect(result.success).toBe(false);
	});
});

describe('envRequestSchema', () => {
	it('accepteert geldige input', () => {
		const result = envRequestSchema.safeParse({
			outputPath: '/tmp/projects/test',
			envVars: { ANTHROPIC_API_KEY: 'sk-test-123' }
		});
		expect(result.success).toBe(true);
	});

	it('weigert leeg outputPath', () => {
		const result = envRequestSchema.safeParse({
			outputPath: '',
			envVars: {}
		});
		expect(result.success).toBe(false);
	});
});

describe('createProjectSchema', () => {
	it('accepteert minimale input', () => {
		const result = createProjectSchema.safeParse({
			name: 'Mijn Project'
		});
		expect(result.success).toBe(true);
	});

	it('accepteert volledige input', () => {
		const result = createProjectSchema.safeParse({
			name: 'Mijn Project',
			description: 'Een beschrijving',
			current_step: 5,
			answers: [
				{
					step: 0,
					specialist: 'requirements',
					question: 'Vraag',
					answer: 'Antwoord',
					type: 'free_text'
				}
			]
		});
		expect(result.success).toBe(true);
	});

	it('weigert lege naam', () => {
		const result = createProjectSchema.safeParse({
			name: ''
		});
		expect(result.success).toBe(false);
	});
});

describe('updateProjectSchema', () => {
	it('accepteert partieel update', () => {
		const result = updateProjectSchema.safeParse({
			name: 'Nieuwe naam'
		});
		expect(result.success).toBe(true);
	});

	it('weigert onbekende velden (strict mode)', () => {
		const result = updateProjectSchema.safeParse({
			name: 'Test',
			id: 'should-not-be-here',
			created_at: '2024-01-01'
		});
		expect(result.success).toBe(false);
	});

	it('accepteert generated_output', () => {
		const result = updateProjectSchema.safeParse({
			generated_output: {
				success: true,
				files: [{ path: 'test.md', content: '# Test' }]
			}
		});
		expect(result.success).toBe(true);
	});
});
