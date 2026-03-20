<script lang="ts">
	import { goto } from '$app/navigation';
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import type { CoordinatorResponse } from '$lib/stores/wizard.svelte';
	import WizardShell from '$lib/components/WizardShell.svelte';
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import AnswerInput from '$lib/components/AnswerInput.svelte';
	import LivePreview from '$lib/components/LivePreview.svelte';
	import AnswerHistory from '$lib/components/AnswerHistory.svelte';
	import { i18n } from '$lib/i18n';

	// Redirect naar home als er geen sessie is
	$effect(() => {
		if (!wizardStore.initialDescription) {
			goto('/');
		}
	});

	// Eerste vraag ophalen bij mount (alleen als niet compleet, niet bij error)
	$effect(() => {
		if (
			wizardStore.viewMode === 'question' &&
			wizardStore.initialDescription &&
			!wizardStore.currentQuestion &&
			!wizardStore.isLoading &&
			!wizardStore.error &&
			!wizardStore.isComplete
		) {
			fetchNextQuestion();
		}
	});

	async function fetchNextQuestion(userAnswer?: string) {
		wizardStore.isLoading = true;
		wizardStore.error = null;
		try {
			const requestBody = {
				projectDescription: wizardStore.initialDescription,
				answers: wizardStore.answers,
				currentStep: wizardStore.currentStep,
				completedCategories: [...wizardStore.completedCategories],
				userAnswer,
				...(wizardStore.documentContext ? { documentContext: wizardStore.documentContext } : {})
			};

			let response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			// Automatische retry bij 422 — Claude kan incidenteel slechte JSON geven
			if (response.status === 422) {
				console.warn('Coordinator response validatie mislukt, automatische retry...');
				response = await fetch('/api/chat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(requestBody)
				});
			}

			if (!response.ok) {
				const body = await response.json().catch(() => null);
				throw new Error(body?.error || `API fout: ${response.status}`);
			}

			const data: CoordinatorResponse = await response.json();
			wizardStore.setCurrentQuestion(data);
		} catch (error) {
			console.error('Fout bij ophalen vraag:', error);
			wizardStore.error = error instanceof Error ? error.message : 'Onbekende fout';
		} finally {
			wizardStore.isLoading = false;
		}
	}

	// Sla sessie op in Supabase
	async function saveToSupabase() {
		try {
			if (wizardStore.projectId) {
				await fetch(`/api/projects/${wizardStore.projectId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						answers: wizardStore.answers,
						current_step: wizardStore.currentStep,
						category_depth: wizardStore.categoryDepth
					})
				});
			} else {
				const res = await fetch('/api/projects', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: wizardStore.projectName || wizardStore.initialDescription.slice(0, 50),
						description: wizardStore.initialDescription,
						answers: wizardStore.answers,
						current_step: wizardStore.currentStep
					})
				});
				const data = await res.json();
				if (data.id) wizardStore.projectId = data.id;
			}
		} catch (error) {
			console.error('Opslaan mislukt:', error);
		}
	}

	let lastWasFollowUp = $state(false);

	async function handleAnswer(answer: string) {
		if (!wizardStore.currentQuestion) return;

		const isFollowUp = answer.startsWith('__FOLLOW_UP__:');
		const actualText = isFollowUp ? answer.slice('__FOLLOW_UP__:'.length) : answer;

		// Sla antwoord op in store (niet voor follow-ups)
		if (!isFollowUp) {
			lastWasFollowUp = false;
			wizardStore.addAnswer({
				step: wizardStore.currentStep,
				specialist: wizardStore.currentSpecialist,
				question: wizardStore.currentQuestion.vraag,
				answer: actualText,
				type: wizardStore.currentQuestion.vraag_type === 'multiple_choice'
					? 'multiple_choice'
					: 'free_text',
				categorie: wizardStore.currentQuestion.categorie ?? undefined
			});
			saveToSupabase();
		}

		// Track follow-up state
		lastWasFollowUp = isFollowUp;

		// Stop met vragen als alle categorieën compleet zijn
		if (wizardStore.isComplete) return;

		// Haal volgende vraag op
		await fetchNextQuestion(isFollowUp ? `[VRAAG] ${actualText}` : actualText);
	}

	async function handleSkip() {
		const skipText = wizardStore.skipCurrentQuestion();
		if (!skipText) return;

		saveToSupabase();
		await fetchNextQuestion(skipText);
	}

	async function handleConfirmEdit(index: number, newAnswer: string) {
		wizardStore.confirmEditAnswer(index, newAnswer);
		saveToSupabase();
		await fetchNextQuestion(newAnswer);
	}

	async function handleFinish() {
		wizardStore.isComplete = true;
		// Sla is_complete: true op als definitieve afrondingsstatus
		if (wizardStore.projectId) {
			try {
				await fetch(`/api/projects/${wizardStore.projectId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ is_complete: true })
				});
			} catch (e) {
				console.error('is_complete opslaan mislukt:', e);
			}
		}
		saveToSupabase();
		goto('/wizard/preview');
	}
</script>

{#if wizardStore.initialDescription}
	<WizardShell>
		<!-- Linker kolom: Vragen of Geschiedenis -->
		<div class="flex flex-1 flex-col gap-4 overflow-y-auto">
			{#if wizardStore.viewMode === 'history'}
				<AnswerHistory
					onConfirmEdit={handleConfirmEdit}
					onCancel={() => wizardStore.cancelEdit()}
				/>
			{:else if wizardStore.error}
				<div class="card space-y-3 border-2 border-error-500/30 bg-error-500/5 p-6">
					<p class="font-medium text-error-500">{i18n.t.wizard.errorTitle}</p>
					<p class="text-sm opacity-70">{wizardStore.error}</p>
					<button
						type="button"
						class="btn btn-sm preset-filled-primary-500"
						onclick={() => { wizardStore.error = null; fetchNextQuestion(); }}
					>
						{i18n.t.wizard.errorRetry}
					</button>
				</div>
			{:else if wizardStore.isComplete}
				<!-- Wizard is 100% compleet — geen nieuwe vragen meer -->
				<div class="card space-y-4 border-2 border-success-500/30 bg-success-500/5 p-6">
					<p class="text-xl font-medium text-success-500">{i18n.t.wizard.completionTitle}</p>
					<p class="text-sm opacity-70">{i18n.t.wizard.completionMessage}</p>
					<div class="flex flex-wrap gap-3">
						<button
							type="button"
							class="btn preset-filled-success-500 px-8 text-lg"
							onclick={handleFinish}
						>
							{i18n.t.wizard.finishButton}
						</button>
						<button
							type="button"
							class="btn preset-outlined-surface-500"
							onclick={() => wizardStore.toggleHistory()}
						>
							{i18n.t.wizard.viewHistory}
						</button>
					</div>
				</div>
			{:else if wizardStore.isLoading}
				<div class="card space-y-3 p-6">
					<div class="flex items-center gap-3">
						<div class="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
						<span class="font-medium">{i18n.t.wizard.thinkingMessage}</span>
					</div>
					<div class="space-y-1.5">
						<div class="flex items-center gap-2 text-xs opacity-50">
							<div class="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-500"></div>
							<span>{i18n.t.wizard.thinkingStep1}</span>
						</div>
						<div class="flex items-center gap-2 text-xs opacity-30">
							<div class="h-1.5 w-1.5 rounded-full bg-surface-500"></div>
							<span>{i18n.t.wizard.thinkingStep2}</span>
						</div>
						<div class="flex items-center gap-2 text-xs opacity-30">
							<div class="h-1.5 w-1.5 rounded-full bg-surface-500"></div>
							<span>{i18n.t.wizard.thinkingStep3}</span>
						</div>
					</div>
				</div>
			{:else if wizardStore.currentQuestion}
				{#if lastWasFollowUp && wizardStore.currentQuestion.advies}
					<div class="card border-2 border-warning-500/30 bg-warning-500/5 space-y-3 p-6">
						<p class="text-sm font-semibold">{i18n.t.wizard.followUpAnswerLabel}</p>
						<p class="text-sm leading-relaxed">{wizardStore.currentQuestion.advies}</p>
						{#if wizardStore.currentQuestion.advies_reden}
							<p class="text-xs opacity-60">{wizardStore.currentQuestion.advies_reden}</p>
						{/if}
						<button
							type="button"
							class="btn btn-sm preset-outlined-warning-500"
							onclick={() => { lastWasFollowUp = false; }}
						>
							{i18n.t.wizard.followUpDismiss}
						</button>
					</div>
				{/if}
				<QuestionCard question={wizardStore.currentQuestion} hideAdvice={lastWasFollowUp} />
				{#if wizardStore.currentQuestion?.critic_feedback}
					<div class="card border-2 border-tertiary-500/30 bg-tertiary-500/5 p-3">
						<p class="text-xs font-semibold text-tertiary-500 mb-1">{i18n.t.wizard.criticFeedbackTitle}</p>
						<p class="text-sm">{wizardStore.currentQuestion.critic_feedback}</p>
					</div>
				{/if}
				{#if wizardStore.currentQuestion?.antwoord_kwaliteit != null && wizardStore.currentQuestion.antwoord_kwaliteit < 60}
					<div class="card preset-outlined-warning-500 p-3">
						<p class="text-sm opacity-80">{wizardStore.currentQuestion.kwaliteit_feedback}</p>
					</div>
				{/if}
				<AnswerInput
					question={wizardStore.currentQuestion}
					onSubmit={handleAnswer}
					onSkip={handleSkip}
					disabled={wizardStore.isLoading}
				/>
			{/if}
		</div>

		<!-- Rechter kolom: Live preview -->
		<div class="hidden w-80 shrink-0 lg:block">
			<LivePreview />
		</div>
	</WizardShell>
{/if}
