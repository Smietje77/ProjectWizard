<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { i18n } from '$lib/i18n';

	// Groepeer antwoorden per specialist
	let groupedAnswers = $derived(
		wizardStore.answers.reduce(
			(groups, answer) => {
				const key = answer.specialist;
				if (!groups[key]) groups[key] = [];
				groups[key].push(answer);
				return groups;
			},
			{} as Record<string, typeof wizardStore.answers>
		)
	);
</script>

<div class="card flex h-full flex-col overflow-hidden">
	<div class="border-b border-surface-500/20 px-4 py-3">
		<h3 class="text-sm font-semibold">{i18n.t.wizard.livePreview}</h3>
	</div>

	<div class="flex-1 space-y-4 overflow-y-auto p-4">
		{#if wizardStore.initialDescription}
			<div>
				<p class="mb-1 text-xs font-medium uppercase opacity-50">{i18n.t.wizard.projectIdea}</p>
				<p class="text-sm">{wizardStore.initialDescription}</p>
			</div>
		{/if}

		{#if wizardStore.answers.length === 0}
			<p class="text-center text-sm opacity-40">
				{i18n.t.wizard.emptyPreview}
			</p>
		{:else}
			{#each Object.entries(groupedAnswers) as [specialist, answers]}
				<div>
					<p class="mb-2 text-xs font-medium uppercase opacity-50">
						{(i18n.t.specialists as Record<string, string>)[specialist] ?? specialist}
					</p>
					{#each answers as answer}
						<div class="mb-2 rounded border border-surface-500/10 p-2 {answer.type === 'skipped' ? 'opacity-40' : ''}">
							<p class="text-xs opacity-60">{answer.question}</p>
							{#if answer.type === 'skipped'}
								<p class="text-sm italic opacity-50">{i18n.t.wizard.skippedLabel}</p>
							{:else}
								<p class="text-sm font-medium">{answer.answer}</p>
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		{/if}
	</div>
</div>
