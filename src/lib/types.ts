export interface Project {
	id: string;
	name: string;
	description: string | null;
	current_step: number;
	answers: WizardAnswer[];
	generated_output: GeneratedOutput | null;
	created_at: string;
	updated_at: string;
}

export interface Template {
	id: string;
	name: string;
	description: string | null;
	category: string | null;
	config: TemplateConfig;
	created_at: string;
}

export interface WizardAnswer {
	step: number;
	specialist: string;
	question: string;
	answer: string;
	type: 'free_text' | 'multiple_choice' | 'follow_up' | 'skipped';
	categorie?: string;
}

export interface GeneratedOutput {
	project_name: string;
	files: GeneratedFile[];
}

export interface GeneratedFile {
	path: string;
	content: string;
}

export interface TemplateConfig {
	steps: TemplateStep[];
	defaults: Record<string, string>;
}

export interface TemplateStep {
	specialist: string;
	questions: string[];
}
