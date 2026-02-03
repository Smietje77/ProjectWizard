<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import ProgressTracker from './ProgressTracker.svelte';
	import { i18n } from '$lib/i18n';

	let { children } = $props();
</script>

<div class="flex h-screen flex-col">
	<!-- Header -->
	<header class="border-b border-surface-500/20 bg-surface-50-950 px-6 py-4">
		<div class="mx-auto flex max-w-7xl items-center justify-between">
			<div class="flex items-center gap-3">
				<h1 class="text-xl font-bold">ProjectWizard</h1>
				{#if wizardStore.projectName}
					<span class="text-sm opacity-60">— {wizardStore.projectName}</span>
				{/if}
			</div>
			<div class="flex items-center gap-4">
				{#if wizardStore.answeredCount > 0}
					<button
						type="button"
						class="btn btn-sm preset-outlined-surface-500 text-xs"
						onclick={() => wizardStore.toggleHistory()}
					>
						{wizardStore.viewMode === 'history'
							? i18n.t.wizard.backToCurrentQuestion
							: i18n.t.wizard.viewHistory}
					</button>
				{/if}
				<span class="text-sm opacity-60">
					{i18n.t.wizard.questionCount
						.replace('{current}', String(wizardStore.answeredCount))
						.replace('{max}', String(wizardStore.maxSteps))}
				</span>
			</div>
		</div>
	</header>

	<!-- Progress bar -->
	<ProgressTracker />

	<!-- Content area -->
	<main class="flex-1 overflow-hidden">
		<div class="mx-auto flex h-full max-w-7xl gap-6 p-6">
			{@render children()}
		</div>
	</main>
</div>
