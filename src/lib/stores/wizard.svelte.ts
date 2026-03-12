import type { WizardAnswer } from '$lib/types';
import { REQUIRED_CATEGORIES, BONUS_CATEGORIES, ALL_CATEGORIES, type RequiredCategory, type BonusCategory, type AnyCategory } from '$lib/constants';

export type { RequiredCategory, BonusCategory, AnyCategory };

// Snapshot voor undo functionaliteit
export interface WizardSnapshot {
	answers: WizardAnswer[];
	categoryDepth: Record<string, 'onvoldoende' | 'basis' | 'voldoende'>;
	currentStep: number;
	timestamp: number;
}

const MAX_SNAPSHOTS = 50;

// Coordinator response structuur
export interface CoordinatorResponse {
	volgende_specialist: string;
	vraag: string;
	vraag_type: 'multiple_choice' | 'vrije_tekst';
	opties?: string[];
	max_selecties?: number;
	categorie?: AnyCategory;
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

	// Undo snapshots (FIFO, max MAX_SNAPSHOTS)
	snapshots = $state<WizardSnapshot[]>([]);

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

	get bonusCategories() {
		return BONUS_CATEGORIES;
	}

	// Hoeveel bonus-categorieën zijn afgedekt (0-3)
	get bonusProgress(): number {
		return BONUS_CATEGORIES.filter(
			(c) => this.categoryDepth[c] === 'voldoende' || this.categoryDepth[c] === 'basis'
		).length;
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
		this.snapshots = [];
		this.isComplete = false;
		this.isLoading = false;
		this.error = null;
		this.currentQuestion = null;
		this.viewMode = 'question';
		this.editingIndex = null;
	}

	// Sla antwoord op en ga naar volgende vraag
	addAnswer(answer: WizardAnswer) {
		this.takeSnapshot();
		this.answers = [...this.answers, answer];
		this.currentStep = this.answers.length;

		// Track categorie als het antwoord er een heeft (required + bonus)
		if (answer.categorie && (ALL_CATEGORIES as readonly string[]).includes(answer.categorie)) {
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

		// Compleet als: (AI zegt klaar EN minstens 7/9 categorieën gedekt) OF alle categorieën voldoende
		const allCategoriesComplete = this.completedCategories.size >= REQUIRED_CATEGORIES.length;
		const mostCategoriesCovered =
			REQUIRED_CATEGORIES.filter(
				(c) => this.categoryDepth[c] === 'voldoende' || this.categoryDepth[c] === 'basis'
			).length >= 7;
		this.isComplete = (response.is_compleet && mostCategoriesCovered) || allCategoriesComplete;
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
		this.takeSnapshot();

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
		this.takeSnapshot();

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

	// Maak snapshot van huidige state (voor undo)
	private takeSnapshot() {
		const snapshot: WizardSnapshot = {
			answers: structuredClone(this.answers),
			categoryDepth: { ...this.categoryDepth },
			currentStep: this.currentStep,
			timestamp: Date.now()
		};
		this.snapshots = [...this.snapshots.slice(-(MAX_SNAPSHOTS - 1)), snapshot];
	}

	// Herstel state naar een eerder snapshot
	undoToSnapshot(index?: number): boolean {
		if (this.snapshots.length === 0) return false;

		const targetIndex = index ?? this.snapshots.length - 1;
		if (targetIndex < 0 || targetIndex >= this.snapshots.length) return false;

		const snapshot = this.snapshots[targetIndex];
		this.answers = structuredClone(snapshot.answers);
		this.categoryDepth = { ...snapshot.categoryDepth };
		this.currentStep = snapshot.currentStep;

		// Verwijder dit snapshot en alles erna
		this.snapshots = this.snapshots.slice(0, targetIndex);

		// Reset UI state
		this.currentQuestion = null;
		this.editingIndex = null;
		this.viewMode = 'question';
		this.isComplete = false;

		return true;
	}

	get canUndo(): boolean {
		return this.snapshots.length > 0;
	}

	// Herbouw categoryDepth uit opgeslagen antwoorden (backward compatibility)
	// Gebruikt 'basis' als default — de coordinator bepaalt de werkelijke diepte via categorie_diepte
	private rebuildCategories(answers: WizardAnswer[]) {
		const depth: Record<string, 'onvoldoende' | 'basis' | 'voldoende'> = {};
		for (const a of answers) {
			if (a.categorie && (ALL_CATEGORIES as readonly string[]).includes(a.categorie)) {
				depth[a.categorie] = 'basis';
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
		is_complete?: boolean | null;
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
		this.snapshots = [];

		// Gebruik opgeslagen category_depth als beschikbaar, anders rebuild
		if (data.category_depth && Object.keys(data.category_depth).length > 0) {
			this.categoryDepth = data.category_depth;
		} else {
			this.rebuildCategories(data.answers);
		}

		// Check completion status: database flag OF alle categorieën voldoende
		this.isComplete =
			data.is_complete === true || this.completedCategories.size >= REQUIRED_CATEGORIES.length;
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
		this.snapshots = [];
		this.generatedOutput = null;
	}
}

export const wizardStore = new WizardStore();
