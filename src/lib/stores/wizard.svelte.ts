import type { WizardAnswer } from '$lib/types';

// Vereiste categorieën voor voltooiing
const REQUIRED_CATEGORIES = [
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
}

class WizardStore {
	// Project metadata
	projectId = $state<string | null>(null);
	projectName = $state('');
	initialDescription = $state('');

	// Flow state
	currentStep = $state(0);
	maxSteps = $state(50);
	currentSpecialist = $state('coordinator');
	isComplete = $state(false);
	isLoading = $state(false);

	// Huidige vraag van coordinator
	currentQuestion = $state<CoordinatorResponse | null>(null);

	// Navigatie state
	viewMode = $state<'question' | 'history'>('question');
	editingIndex = $state<number | null>(null);

	// Alle antwoorden
	answers = $state<WizardAnswer[]>([]);

	// Voltooide categorieën
	completedCategories = $state<Set<RequiredCategory>>(new Set());

	// Berekende voortgang (deterministisch op basis van voltooide categorieën)
	get progress() {
		return Math.round((this.completedCategories.size / REQUIRED_CATEGORIES.length) * 100);
	}

	get requiredCategories() {
		return REQUIRED_CATEGORIES;
	}

	get answeredCount() {
		return this.answers.length;
	}

	// Start nieuwe wizard sessie
	startSession(description: string) {
		this.initialDescription = description;
		this.currentStep = 0;
		this.answers = [];
		this.completedCategories = new Set();
		this.isComplete = false;
		this.currentQuestion = null;
	}

	// Sla antwoord op en ga naar volgende vraag
	addAnswer(answer: WizardAnswer) {
		this.answers = [...this.answers, answer];
		this.currentStep = this.answers.length;

		// Track categorie als het antwoord er een heeft
		if (answer.categorie && REQUIRED_CATEGORIES.includes(answer.categorie as RequiredCategory)) {
			this.completedCategories = new Set([...this.completedCategories, answer.categorie as RequiredCategory]);
		}
	}

	// Update huidige vraag vanuit coordinator response
	setCurrentQuestion(response: CoordinatorResponse) {
		this.currentQuestion = response;
		this.currentSpecialist = response.volgende_specialist;

		// Compleet als AI zegt dat het klaar is OF alle categorieën zijn afgevinkt
		this.isComplete = response.is_compleet || this.completedCategories.size >= REQUIRED_CATEGORIES.length;
	}

	// Markeer categorie als voltooid
	completeCategory(category: RequiredCategory) {
		this.completedCategories = new Set([...this.completedCategories, category]);
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

	// Herbouw completedCategories uit opgeslagen antwoorden
	private rebuildCategories(answers: WizardAnswer[]) {
		const cats = new Set<RequiredCategory>();
		for (const a of answers) {
			if (a.categorie && REQUIRED_CATEGORIES.includes(a.categorie as RequiredCategory)) {
				cats.add(a.categorie as RequiredCategory);
			}
		}
		this.completedCategories = cats;
	}

	// Laad sessie vanuit Supabase
	loadSession(data: {
		id: string;
		name: string;
		description: string | null;
		current_step: number;
		answers: WizardAnswer[];
	}) {
		this.projectId = data.id;
		this.projectName = data.name;
		this.initialDescription = data.description ?? '';
		this.currentStep = data.current_step;
		this.answers = data.answers;
		this.rebuildCategories(data.answers);
	}

	// Reset alles
	reset() {
		this.projectId = null;
		this.projectName = '';
		this.initialDescription = '';
		this.currentStep = 0;
		this.currentSpecialist = 'coordinator';
		this.isComplete = false;
		this.isLoading = false;
		this.currentQuestion = null;
		this.viewMode = 'question';
		this.editingIndex = null;
		this.answers = [];
		this.completedCategories = new Set();
	}
}

export const wizardStore = new WizardStore();
