<script lang="ts">
	import { goto } from '$app/navigation';
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { i18n } from '$lib/i18n';
	import EnvHelper from '$lib/components/EnvHelper.svelte';
	import type { DetectedEnvVar } from '$lib/generator';

	$effect(() => {
		if (!wizardStore.initialDescription) {
			goto('/');
		}
	});

	let projectName = $state(wizardStore.projectName || '');
	let isGenerating = $state(false);
	let progressStep = $state('');
	let progressPct = $state(0);
	let envSaved = $state(false);
	let generationResult = $state<{
		success: boolean;
		outputPath?: string;
		files?: string[];
		message?: string;
		error?: string;
		requiredEnvVars?: DetectedEnvVar[];
	} | null>(null);

	async function generateProject() {
		if (!projectName.trim()) return;
		isGenerating = true;
		generationResult = null;
		progressStep = 'Generatie starten...';
		progressPct = 0;

		try {
			const response = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectName: projectName.trim(),
					description: wizardStore.initialDescription,
					answers: wizardStore.answers,
					stream: true
				})
			});

			if (!response.ok) {
				const data = await response.json();
				generationResult = { success: false, error: data.error };
				return;
			}

			// Verwerk SSE stream
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) throw new Error('Geen response body');

			let buffer = '';
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				let eventType = '';
				for (const line of lines) {
					if (line.startsWith('event: ')) {
						eventType = line.slice(7);
					} else if (line.startsWith('data: ') && eventType) {
						const data = JSON.parse(line.slice(6));
						if (eventType === 'progress') {
							progressStep = data.step;
							progressPct = data.pct;
						} else if (eventType === 'done') {
							generationResult = data;
							// Update Supabase
							if (wizardStore.projectId) {
								fetch(`/api/projects/${wizardStore.projectId}`, {
									method: 'PATCH',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({
										name: projectName.trim(),
										generated_output: data
									})
								});
							}
						} else if (eventType === 'error') {
							generationResult = { success: false, error: data.error };
						}
						eventType = '';
					}
				}
			}
		} catch (error) {
			generationResult = {
				success: false,
				error: error instanceof Error ? error.message : 'Onbekende fout'
			};
		} finally {
			isGenerating = false;
		}
	}

	async function handleEnvComplete(envVars: Record<string, string>) {
		if (Object.keys(envVars).length > 0 && generationResult?.outputPath) {
			try {
				await fetch('/api/env', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						outputPath: generationResult.outputPath,
						envVars
					})
				});
			} catch (error) {
				console.error('Env schrijven mislukt:', error);
			}
		}
		envSaved = true;
	}

	function startOver() {
		wizardStore.reset();
		goto('/');
	}
</script>

<div class="container mx-auto max-w-4xl space-y-6 p-8">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">{i18n.t.preview.title}</h1>
		<button type="button" class="btn preset-outlined-surface-500" onclick={() => goto('/wizard')}>
			{i18n.t.preview.backButton}
		</button>
	</div>

	<p class="opacity-60">
		{i18n.t.preview.description.replace('{count}', String(wizardStore.answers.length))}
	</p>

	<!-- Projectnaam -->
	<div class="card space-y-3 p-6">
		<label class="space-y-2">
			<span class="text-sm font-medium">{i18n.t.preview.projectNameLabel}</span>
			<input
				type="text"
				bind:value={projectName}
				placeholder={i18n.t.preview.projectNamePlaceholder}
				class="input w-full rounded-lg p-3"
				disabled={isGenerating}
			/>
			<p class="text-xs opacity-40">
				{i18n.t.preview.outputPathHint} C:\claude_projects\{projectName
					.toLowerCase()
					.replace(/[^a-z0-9\-_]/g, '-') || '...'}
			</p>
		</label>
	</div>

	<!-- Samenvatting van antwoorden -->
	<details class="card p-6">
		<summary class="cursor-pointer text-xl font-semibold">
			{i18n.t.preview.answersTitle.replace('{count}', String(wizardStore.answers.length))}
		</summary>
		<div class="mt-4 space-y-3">
			{#each wizardStore.answers as answer, i}
				<div class="rounded border border-surface-500/10 p-3 {answer.type === 'skipped' ? 'opacity-50' : ''}">
					<p class="text-xs opacity-50">{i18n.t.preview.step} {i + 1} — {answer.specialist}</p>
					<p class="text-sm opacity-75">{answer.question}</p>
					{#if answer.type === 'skipped'}
						<p class="mt-1 italic opacity-60">{i18n.t.wizard.skippedLabel}</p>
					{:else}
						<p class="mt-1 font-medium">{answer.answer}</p>
					{/if}
				</div>
			{/each}
		</div>
	</details>

	<!-- Genereer knop + voortgang -->
	{#if !generationResult?.success}
		{#if isGenerating}
			<div class="card space-y-3 p-6">
				<div class="flex items-center gap-3">
					<div class="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
					<span class="font-medium">{progressStep}</span>
				</div>
				<div class="h-2 overflow-hidden rounded-full bg-surface-200-800">
					<div
						class="h-full rounded-full bg-primary-500 transition-all duration-700"
						style="width: {progressPct}%"
					></div>
				</div>
				<p class="text-right text-xs tabular-nums opacity-50">{progressPct}%</p>
			</div>
		{:else}
			<button
				type="button"
				class="btn preset-filled-primary-500 w-full py-3 text-lg"
				onclick={generateProject}
				disabled={!projectName.trim()}
			>
				{i18n.t.preview.generateButton}
			</button>
		{/if}
	{/if}

	<!-- Resultaat -->
	{#if generationResult}
		{#if generationResult.success}
			<div class="card space-y-4 border-2 border-success-500/30 bg-success-500/5 p-6">
				<h2 class="text-xl font-semibold text-success-500">{i18n.t.preview.successTitle}</h2>
				<p>{generationResult.message}</p>

				{#if generationResult.files}
					<div>
						<p class="mb-2 text-sm font-medium opacity-60">{i18n.t.preview.generatedFiles}</p>
						<ul class="space-y-1">
							{#each generationResult.files as file}
								<li class="font-mono text-sm">{file}</li>
							{/each}
						</ul>
					</div>
				{/if}

				<!-- Environment variabelen instellen -->
				{#if !envSaved && generationResult.requiredEnvVars?.length}
					<EnvHelper onComplete={handleEnvComplete} requiredEnvVars={generationResult.requiredEnvVars} />
				{/if}

				<!-- Quick Start instructies -->
				{#if generationResult.outputPath}
					<div class="space-y-3">
						<h3 class="font-semibold">{i18n.t.preview.quickStartTitle}</h3>
						<p class="text-sm opacity-60">{i18n.t.preview.quickStartGsdHint}</p>
						<div class="space-y-2 rounded bg-surface-200-800 p-4 font-mono text-sm">
							<p class="opacity-40">// {i18n.t.preview.quickStartStep1}</p>
							<p>cd "{generationResult.outputPath}"</p>
							<p class="mt-3 opacity-40">// {i18n.t.preview.quickStartStep2}</p>
							<p>claude --dangerously-skip-permissions</p>
							<p class="mt-3 opacity-40">// {i18n.t.preview.quickStartStep3}</p>
							<p>/gsd:progress</p>
							<p>/gsd:discuss-phase 1</p>
							<p>/gsd:plan-phase 1</p>
							<p>/gsd:execute-phase 1</p>
							<p>/gsd:verify-work 1</p>
						</div>
					</div>
				{/if}

				<div class="flex gap-3 pt-2">
					<button
						type="button"
						class="btn preset-filled-primary-500"
						onclick={startOver}
					>
						{i18n.t.preview.newProject}
					</button>
				</div>
			</div>
		{:else}
			<div class="card border-2 border-error-500/30 bg-error-500/5 p-6">
				<h2 class="text-lg font-semibold text-error-500">{i18n.t.preview.errorTitle}</h2>
				<p class="mt-2 text-sm">{generationResult.error}</p>
				<button
					type="button"
					class="btn preset-outlined-error-500 mt-4"
					onclick={generateProject}
				>
					{i18n.t.preview.retryButton}
				</button>
			</div>
		{/if}
	{/if}
</div>
