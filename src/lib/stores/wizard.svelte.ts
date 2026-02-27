import type { WizardAnswer } from '$lib/types';

// Vereiste categorieën voor voltooiing (gesynchroniseerd met coordinator.ts)
const REQUIRED_CATEGORIES = [
	'website_type',
	'project_doel',
	'doelgroep',
	'kernfunctionaliteiten',
	'frontend_keuze',
	'database_keuze',
	'auth_keuze',
	'deployment_keuze',
	'design_stijl'
] as const;

export type RequiredCategory = (typeof REQUIRED_CATEGORIES)[number];

// Coordinator response structuur
export interface CoordinatorResponse {
	volgende_specialist: string;
	vraag: string;
	vraag_type: 'multiple_choice' | 'vrije_tekst';
	opties?: string[];
	max_selecties?: number;
	categorie?: RequiredCategory;
	advies: string;
	advies_reden: string;
	is_compleet: boolean;
	antwoord_kwaliteit?: number | null;
	kwaliteit_feedback?: string;
	categorie_diepte?: Record<string, 'onvoldoende' | 'basis' | 'voldoende'>;
	critic_feedback?: string;
}

class WizardStore {
	// Project metadata
	projectId = $state<string | null>(null);
	projectName = $state('');
	initialDescription = $state('');
	documentContext = $state('');

	// Flow state
	currentStep = $state(0);
	maxSteps = $state(50);
	currentSpecialist = $state('coordinator');
	isComplete = $state(false);
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Huidige vraag van coordinator
	currentQuestion = $state<CoordinatorResponse | null>(null);

	// Navigatie state
	viewMode = $state<'question' | 'history'>('question');
	editingIndex = $state<number | null>(null);

	// Alle antwoorden
	answers = $state<WizardAnswer[]>([]);

	// Opgeslagen generatie-resultaat (uit Supabase bij hervatten)
	generatedOutput = $state<Record<string, unknown> | null>(null);

	// Categorie diepte tracking (onvoldoende/basis/voldoende)
	categoryDepth = $state<Record<string, 'onvoldoende' | 'basis' | 'voldoende'>>({});

	// Voltooide categorieën (derived from categoryDepth for backward compatibility)
	get completedCategories(): Set<RequiredCategory> {
		return new Set(
			REQUIRED_CATEGORIES.filter((c) => this.categoryDepth[c] === 'voldoende')
		);
	}

	// Berekende voortgang (met diepte-weging: onvoldoende=0, basis=0.5, voldoende=1)
	get progress() {
		const categories = REQUIRED_CATEGORIES;
		const score = categories.reduce((sum, cat) => {
			const depth = this.categoryDepth[cat];
			return sum + (depth === 'voldoende' ? 1 : depth === 'basis' ? 0.5 : 0);
		}, 0);
		return Math.round((score / categories.length) * 100);
	}

	get requiredCategories() {
		return REQUIRED_CATEGORIES;
	}

	get answeredCount() {
		return this.answers.length;
	}

	// Start nieuwe wizard sessie
	startSession(description: string, documentContext?: string) {
		this.initialDescription = description;
		this.documentContext = documentContext ?? '';
		this.currentStep = 0;
		this.answers = [];
		this.categoryDepth = {};
		this.isComplete = false;
		this.isLoading = false;
		this.error = null;
		this.currentQuestion = null;
		this.viewMode = 'question';
		this.editingIndex = null;
	}

	// Sla antwoord op en ga naar volgende vraag
	addAnswer(answer: WizardAnswer) {
		this.answers = [...this.answers, answer];
		this.currentStep = this.answers.length;

		// Track categorie als het antwoord er een heeft (backward compatibility)
		if (answer.categorie && REQUIRED_CATEGORIES.includes(answer.categorie as RequiredCategory)) {
			if (!this.categoryDepth[answer.categorie]) {
				this.categoryDepth = { ...this.categoryDepth, [answer.categorie]: 'basis' };
			}
		}
	}

	// Update huidige vraag vanuit coordinator response
	setCurrentQuestion(response: CoordinatorResponse) {
		this.currentQuestion = response;
		this.currentSpecialist = response.volgende_specialist;

		// Sla kwaliteitsscore op bij het vorige antwoord
		if (response.antwoord_kwaliteit != null && this.answers.length > 0) {
			const lastAnswer = this.answers[this.answers.length - 1];
			this.answers = [
				...this.answers.slice(0, -1),
				{ ...lastAnswer, quality: response.antwoord_kwaliteit }
			];
		}

		// Update categorie diepte als het in de response zit
		if (response.categorie_diepte) {
			this.categoryDepth = { ...this.categoryDepth, ...response.categorie_diepte };
		}

		// Compleet als AI zegt dat het klaar is OF alle categorieën zijn afgevinkt
		this.isComplete = response.is_compleet || this.completedCategories.size >= REQUIRED_CATEGORIES.length;
	}

	// Markeer categorie als voltooid
	completeCategory(category: RequiredCategory) {
		this.categoryDepth = { ...this.categoryDepth, [category]: 'voldoende' };
	}

	// Wissel tussen vraag- en geschiedenisweergave
	toggleHistory() {
		if (this.viewMode === 'history') {
			this.viewMode = 'question';
			this.editingIndex = null;
		} else {
			this.viewMode = 'history';
		}
	}

	// Selecteer een antwoord om te bewerken
	editAnswer(index: number) {
		if (index < 0 || index >= this.answers.length) return;
		this.editingIndex = index;
	}

	// Annuleer bewerken
	cancelEdit() {
		this.editingIndex = null;
		this.viewMode = 'question';
	}

	// Bevestig bewerkt antwoord: vervang en verwijder alles erna
	confirmEditAnswer(index: number, newAnswer: string) {
		if (index < 0 || index >= this.answers.length) return;

		const original = this.answers[index];
		const updatedAnswer: WizardAnswer = { ...original, answer: newAnswer };

		// Truncate: bewaar 0..index-1, vervang index, verwijder alles erna
		this.answers = [...this.answers.slice(0, index), updatedAnswer];
		this.currentStep = this.answers.length;

		// Reset state om wizard vanaf hier voort te zetten
		this.editingIndex = null;
		this.viewMode = 'question';
		this.currentQuestion = null;
		this.isComplete = false;
		this.rebuildCategories(this.answers);
	}

	// Sla huidige vraag over
	skipCurrentQuestion(): string | null {
		if (!this.currentQuestion) return null;

		const skipAnswer: WizardAnswer = {
			step: this.currentStep,
			specialist: this.currentSpecialist,
			question: this.currentQuestion.vraag,
			answer: '[OVERGESLAGEN]',
			type: 'skipped'
		};

		this.answers = [...this.answers, skipAnswer];
		this.currentStep = this.answers.length;

		return '[OVERGESLAGEN] De gebruiker heeft deze vraag overgeslagen.';
	}

	// Herbouw categoryDepth uit opgeslagen antwoorden (backward compatibility)
	private rebuildCategories(answers: WizardAnswer[]) {
		const depth: Record<string, 'onvoldoende' | 'basis' | 'voldoende'> = {};
		for (const a of answers) {
			if (a.categorie && REQUIRED_CATEGORIES.includes(a.categorie as RequiredCategory)) {
				depth[a.categorie] = 'voldoende';
			}
		}
		this.categoryDepth = depth;
	}

	// Laad sessie vanuit Supabase
	loadSession(data: {
		id: string;
		name: string;
		description: string | null;
		document_context?: string | null;
		current_step: number;
		answers: WizardAnswer[];
		generated_output?: Record<string, unknown> | null;
		category_depth?: Record<string, 'onvoldoende' | 'basis' | 'voldoende'> | null;
	}) {
		this.projectId = data.id;
		this.projectName = data.name;
		this.initialDescription = data.description ?? '';
		this.documentContext = data.document_context ?? '';
		this.currentStep = data.current_step;
		this.answers = data.answers;
		this.generatedOutput = data.generated_output ?? null;
		// Reset UI state voor schone hervatting
		this.currentQuestion = null;
		this.currentSpecialist = 'coordinator';
		this.isLoading = false;
		this.error = null;
		this.viewMode = 'question';
		this.editingIndex = null;

		// Gebruik opgeslagen category_depth als beschikbaar, anders rebuild
		if (data.category_depth && Object.keys(data.category_depth).length > 0) {
			this.categoryDepth = data.category_depth;
		} else {
			this.rebuildCategories(data.answers);
		}

		// Check completion status
		this.isComplete = this.completedCategories.size >= REQUIRED_CATEGORIES.length;
	}

	// Reset alles
	reset() {
		this.projectId = null;
		this.projectName = '';
		this.initialDescription = '';
		this.documentContext = '';
		this.currentStep = 0;
		this.currentSpecialist = 'coordinator';
		this.isComplete = false;
		this.isLoading = false;
		this.error = null;
		this.currentQuestion = null;
		this.viewMode = 'question';
		this.editingIndex = null;
		this.answers = [];
		this.categoryDepth = {};
		this.generatedOutput = null;
	}
}

export const wizardStore = new WizardStore();
