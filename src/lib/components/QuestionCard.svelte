<script lang="ts">
	import type { CoordinatorResponse } from '$lib/stores/wizard.svelte';
	import { i18n } from '$lib/i18n';

	interface Props {
		question: CoordinatorResponse;
		hideAdvice?: boolean;
	}

	let { question, hideAdvice = false }: Props = $props();

	const specialistColors: Record<string, string> = {
		coordinator: 'bg-primary-500',
		requirements: 'bg-tertiary-500',
		architect: 'bg-secondary-500',
		frontend: 'bg-success-500',
		backend: 'bg-warning-500',
		devops: 'bg-error-500',
		integration: 'bg-primary-500',
		testing: 'bg-tertiary-500',
		design: 'bg-pink-500'
	};
</script>

<div class="card space-y-4 p-6">
	<!-- Specialist badge -->
	<div class="flex items-center gap-2">
		<span
			class="inline-block h-3 w-3 rounded-full {specialistColors[question.volgende_specialist] ??
				'bg-surface-500'}"
		></span>
		<span class="text-sm font-medium opacity-75">
			{(i18n.t.specialists as Record<string, string>)[question.volgende_specialist] ?? question.volgende_specialist}
		</span>
	</div>

	<!-- Vraag -->
	<h2 class="text-xl font-semibold">{question.vraag}</h2>

	<!-- Advies -->
	{#if question.advies && !hideAdvice}
		<div class="rounded-lg border border-primary-500/20 bg-primary-500/5 p-4">
			<p class="mb-1 text-sm font-medium text-primary-500">{i18n.t.wizard.advice}</p>
			<p class="text-sm">{question.advies}</p>
			{#if question.advies_reden}
				<p class="mt-2 text-xs opacity-60">{question.advies_reden}</p>
			{/if}
		</div>
	{/if}
</div>
