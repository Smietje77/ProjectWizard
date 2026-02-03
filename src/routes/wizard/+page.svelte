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

	// Eerste vraag ophalen bij mount (alleen in question-modus)
	$effect(() => {
		if (
			wizardStore.viewMode === 'question' &&
			wizardStore.initialDescription &&
			!wizardStore.currentQuestion &&
			!wizardStore.isLoading
		) {
			fetchNextQuestion();
		}
	});

	async function fetchNextQuestion(userAnswer?: string) {
		wizardStore.isLoading = true;
		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectDescription: wizardStore.initialDescription,
					answers: wizardStore.answers,
					currentStep: wizardStore.currentStep,
					completedCategories: [...wizardStore.completedCategories],
					userAnswer
				})
			});

			if (!response.ok) {
				throw new Error(`API fout: ${response.status}`);
			}

			const data: CoordinatorResponse = await response.json();
			wizardStore.setCurrentQuestion(data);
		} catch (error) {
			console.error('Fout bij ophalen vraag:', error);
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
						current_step: wizardStore.currentStep
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

		// Haal volgende vraag op
		await fetchNextQuestion(isFollowUp ? `[VRAAG] ${actualText}` : actualText);

		// Check of wizard compleet is
		if (wizardStore.isComplete) {
			goto('/wizard/preview');
		}
	}

	async function handleSkip() {
		const skipText = wizardStore.skipCurrentQuestion();
		if (!skipText) return;

		saveToSupabase();
		await fetchNextQuestion(skipText);

		if (wizardStore.isComplete) {
			goto('/wizard/preview');
		}
	}

	async function handleConfirmEdit(index: number, newAnswer: string) {
		wizardStore.confirmEditAnswer(index, newAnswer);
		saveToSupabase();
		await fetchNextQuestion(newAnswer);

		if (wizardStore.isComplete) {
			goto('/wizard/preview');
		}
	}

	function handleFinish() {
		wizardStore.isComplete = true;
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
			{:else if wizardStore.isLoading}
				<div class="card flex items-center gap-3 p-6">
					<div class="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
					<span class="opacity-60">{i18n.t.wizard.thinkingMessage}</span>
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
				<AnswerInput
					question={wizardStore.currentQuestion}
					onSubmit={handleAnswer}
					onSkip={handleSkip}
					disabled={wizardStore.isLoading}
				/>
			{/if}
			{#if wizardStore.answeredCount >= 10 && wizardStore.viewMode === 'question'}
				<div class="flex items-center justify-between rounded-lg border border-success-500/20 bg-success-500/5 px-4 py-3">
					<p class="text-xs opacity-60">{i18n.t.wizard.finishHint}</p>
					<button
						type="button"
						class="btn btn-sm preset-filled-success-500"
						onclick={handleFinish}
					>
						{i18n.t.wizard.finishButton}
					</button>
				</div>
			{/if}
		</div>

		<!-- Rechter kolom: Live preview -->
		<div class="hidden w-80 shrink-0 lg:block">
			<LivePreview />
		</div>
	</WizardShell>
{/if}
