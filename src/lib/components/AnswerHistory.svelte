<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { i18n } from '$lib/i18n';

	interface Props {
		onConfirmEdit: (index: number, newAnswer: string) => void;
		onCancel: () => void;
	}

	let { onConfirmEdit, onCancel }: Props = $props();

	let editText = $state('');

	function startEdit(index: number) {
		wizardStore.editAnswer(index);
		editText = wizardStore.answers[index].answer;
	}

	function handleConfirm() {
		if (wizardStore.editingIndex === null || !editText.trim()) return;
		onConfirmEdit(wizardStore.editingIndex, editText.trim());
	}

	function handleCancel() {
		editText = '';
		onCancel();
	}

	let answersAfterEdit = $derived(
		wizardStore.editingIndex !== null
			? wizardStore.answers.length - wizardStore.editingIndex - 1
			: 0
	);
</script>

<div class="flex h-full flex-col">
	<!-- Header met terug-knop -->
	<div class="border-b border-surface-500/20 px-4 py-3">
		<button
			type="button"
			class="btn preset-outlined-primary-500 text-sm"
			onclick={handleCancel}
		>
			&larr; {i18n.t.wizard.backToCurrentQuestion}
		</button>
	</div>

	<!-- Scrollbare lijst -->
	<div class="flex-1 space-y-3 overflow-y-auto p-4">
		{#each wizardStore.answers as answer, index}
			<div
				class="card rounded-lg border p-4 transition-colors
					{answer.type === 'skipped' ? 'border-surface-500/10 opacity-60' : 'border-surface-500/20'}
					{wizardStore.editingIndex === index ? 'border-primary-500/50 bg-primary-500/5' : ''}"
			>
				<!-- Header: stap + specialist -->
				<div class="mb-2 flex items-center gap-2">
					<span class="rounded bg-surface-200-800 px-2 py-0.5 text-xs font-medium tabular-nums">
						{index + 1}
					</span>
					<span class="rounded bg-primary-500/10 px-2 py-0.5 text-xs font-medium text-primary-500">
						{(i18n.t.specialists as Record<string, string>)[answer.specialist] ?? answer.specialist}
					</span>
				</div>

				<!-- Vraag -->
				<p class="mb-1 text-sm opacity-70">{answer.question}</p>

				{#if wizardStore.editingIndex === index}
					<!-- Inline edit formulier -->
					<div class="mt-3 space-y-3">
						<textarea
							bind:value={editText}
							class="textarea w-full rounded-lg p-3"
							rows="3"
						></textarea>

						{#if answersAfterEdit > 0}
							<p class="rounded bg-warning-500/10 px-3 py-2 text-sm text-warning-500">
								{i18n.t.wizard.editWarning.replace('{count}', String(answersAfterEdit))}
							</p>
						{/if}

						<div class="flex gap-2">
							<button
								type="button"
								class="btn preset-filled-primary-500 px-4 text-sm"
								onclick={handleConfirm}
								disabled={!editText.trim()}
							>
								{i18n.t.wizard.editConfirm}
							</button>
							<button
								type="button"
								class="btn preset-outlined-surface-500 px-4 text-sm"
								onclick={() => { wizardStore.editingIndex = null; editText = ''; }}
							>
								{i18n.t.wizard.editCancel}
							</button>
						</div>
					</div>
				{:else}
					<!-- Antwoord weergave -->
					<div class="flex items-start justify-between gap-2">
						{#if answer.type === 'skipped'}
							<p class="text-sm italic opacity-50">{i18n.t.wizard.skippedLabel}</p>
						{:else}
							<p class="text-sm font-medium">{answer.answer}</p>
						{/if}

						<button
							type="button"
							class="btn btn-sm preset-outlined-surface-500 shrink-0 text-xs"
							onclick={() => startEdit(index)}
						>
							{i18n.t.wizard.editButton}
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
