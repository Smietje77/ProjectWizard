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
				{@const depth = wizardStore.categoryDepth[category] || 'onvoldoende'}
				{@const isVoldoende = depth === 'voldoende'}
				{@const isBasis = depth === 'basis'}
				<span
					class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {isVoldoende
						? 'bg-primary-500/20 text-primary-500'
						: isBasis
							? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
							: 'bg-surface-200-800 opacity-50'}"
					title={(i18n.t.progress as Record<string, string>)[`depth${depth.charAt(0).toUpperCase()}${depth.slice(1)}`] ?? depth}
				>
					{#if isVoldoende}
						&#10003;
					{:else if isBasis}
						&#9679;
					{/if}
					{(i18n.t.progress as Record<string, string>)[category] ?? category}
				</span>
			{/each}
		</div>

		<!-- Bonus categorie indicators (product-strategie) -->
		{#if wizardStore.bonusProgress > 0}
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<span class="text-xs opacity-40">Bonus:</span>
				{#each wizardStore.bonusCategories as category}
					{@const depth = wizardStore.categoryDepth[category] || 'onvoldoende'}
					{@const isVoldoende = depth === 'voldoende'}
					{@const isBasis = depth === 'basis'}
					{#if isBasis || isVoldoende}
						<span
							class="rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors {isVoldoende
								? 'bg-tertiary-500/15 text-tertiary-500'
								: 'bg-amber-500/10 text-amber-600/70 dark:text-amber-400/70'}"
							title={(i18n.t.progress as Record<string, string>)[`depth${depth.charAt(0).toUpperCase()}${depth.slice(1)}`] ?? depth}
						>
							{#if isVoldoende}&#10003;{:else}&#9679;{/if}
							{(i18n.t.progress as Record<string, string>)[category] ?? category}
						</span>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>
