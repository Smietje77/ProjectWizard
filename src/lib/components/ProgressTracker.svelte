<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { i18n } from '$lib/i18n';
</script>

<div class="border-b border-surface-500/20 bg-surface-50-950 px-6 py-3">
	<div class="mx-auto max-w-7xl">
		<!-- Voortgangsbalk -->
		<div class="mb-2 flex items-center gap-3">
			<div class="h-2 flex-1 overflow-hidden rounded-full bg-surface-200-800">
				<div
					class="h-full rounded-full bg-primary-500 transition-all duration-500"
					style="width: {wizardStore.progress}%"
				></div>
			</div>
			<span class="text-sm font-medium tabular-nums">{wizardStore.progress}%</span>
		</div>

		<!-- Categorie indicators -->
		<div class="flex flex-wrap gap-2">
			{#each wizardStore.requiredCategories as category}
				{@const isCompleted = wizardStore.completedCategories.has(category)}
				<span
					class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {isCompleted
						? 'bg-primary-500/20 text-primary-500'
						: 'bg-surface-200-800 opacity-50'}"
				>
					{#if isCompleted}&#10003;{/if}
					{(i18n.t.progress as Record<string, string>)[category] ?? category}
				</span>
			{/each}
		</div>
	</div>
</div>
