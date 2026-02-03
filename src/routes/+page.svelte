<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { i18n } from '$lib/i18n';

	let description = $state('');
	let isSubmitting = $state(false);

	// Opgeslagen projecten
	interface SavedProject {
		id: string;
		name: string;
		description: string | null;
		current_step: number;
		answers: Array<{ categorie?: string; type?: string }>;
		created_at: string;
		updated_at: string;
	}

	const REQUIRED_CATEGORIES = [
		'project_doel',
		'doelgroep',
		'kernfunctionaliteiten',
		'frontend_keuze',
		'database_keuze',
		'auth_keuze',
		'deployment_keuze',
		'design_stijl'
	];

	function getProjectStatus(project: SavedProject) {
		const answers = project.answers ?? [];
		const realAnswers = answers.filter((a) => a.type !== 'skipped');
		const categories = new Set(
			answers
				.filter((a) => a.categorie && REQUIRED_CATEGORIES.includes(a.categorie))
				.map((a) => a.categorie)
		);
		const progress = Math.round((categories.size / REQUIRED_CATEGORIES.length) * 100);
		const isComplete = categories.size >= REQUIRED_CATEGORIES.length;
		return { answerCount: realAnswers.length, progress, isComplete };
	}

	let savedProjects = $state<SavedProject[]>([]);
	let loadingProjects = $state(true);
	let loadError = $state<string | null>(null);

	async function loadProjects() {
		loadingProjects = true;
		loadError = null;
		try {
			const res = await fetch('/api/projects');
			if (res.ok) {
				savedProjects = await res.json();
			} else {
				const body = await res.json().catch(() => null);
				loadError = body?.error || `Status ${res.status}`;
				console.error('Projecten laden mislukt:', loadError);
			}
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Network error';
			console.error('Projecten laden mislukt:', err);
		} finally {
			loadingProjects = false;
		}
	}

	onMount(() => loadProjects());

	async function startWizard() {
		if (!description.trim()) return;
		isSubmitting = true;
		wizardStore.startSession(description.trim());
		goto('/wizard');
	}

	async function resumeProject(project: SavedProject) {
		try {
			const res = await fetch(`/api/projects/${project.id}`);
			if (!res.ok) return;
			const data = await res.json();
			wizardStore.loadSession({
				id: data.id,
				name: data.name,
				description: data.description,
				current_step: data.current_step,
				answers: data.answers ?? []
			});
			wizardStore.initialDescription = data.description ?? data.name;

			// Ga naar preview als het project al afgerond is
			const { isComplete } = getProjectStatus(project);
			if (isComplete) {
				wizardStore.isComplete = true;
				goto('/wizard/preview');
			} else {
				goto('/wizard');
			}
		} catch (error) {
			console.error('Hervatten mislukt:', error);
		}
	}

	async function deleteProject(id: string) {
		try {
			await fetch(`/api/projects/${id}`, { method: 'DELETE' });
			savedProjects = savedProjects.filter((p) => p.id !== id);
		} catch (error) {
			console.error('Verwijderen mislukt:', error);
		}
	}

	function formatDate(dateStr: string): string {
		const locale = i18n.locale === 'nl' ? 'nl-NL' : 'en-US';
		return new Date(dateStr).toLocaleDateString(locale, {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="flex min-h-screen items-center justify-center p-8">
	<div class="w-full max-w-2xl space-y-8 text-center">
		<!-- Hero -->
		<div class="space-y-3">
			<h1 class="text-4xl font-bold">{i18n.t.app.title}</h1>
			<p class="text-lg opacity-60">
				{i18n.t.app.tagline}
			</p>
		</div>

		<!-- Intake formulier -->
		<div class="card mx-auto max-w-xl space-y-4 p-6 text-left">
			<label class="space-y-2">
				<span class="text-sm font-medium">{i18n.t.landing.inputLabel}</span>
				<textarea
					bind:value={description}
					placeholder={i18n.t.landing.inputPlaceholder}
					class="textarea w-full rounded-lg p-3"
					rows="5"
					disabled={isSubmitting}
				></textarea>
			</label>

			<button
				type="button"
				class="btn preset-filled-primary-500 w-full"
				onclick={startWizard}
				disabled={!description.trim() || isSubmitting}
			>
				{isSubmitting ? i18n.t.landing.loading : i18n.t.landing.startButton}
			</button>
		</div>

		<!-- Snelstart templates -->
		<div class="space-y-3">
			<p class="text-sm opacity-40">{i18n.t.landing.templateHint}</p>
			<div class="flex justify-center gap-3">
				<button
					type="button"
					class="btn preset-outlined-surface-500"
					onclick={() => {
						description = i18n.t.landing.templateSaasDesc;
					}}
				>
					{i18n.t.landing.templateSaas}
				</button>
				<button
					type="button"
					class="btn preset-outlined-surface-500"
					onclick={() => {
						description = i18n.t.landing.templateApiDesc;
					}}
				>
					{i18n.t.landing.templateApi}
				</button>
			</div>
		</div>

		<!-- Opgeslagen projecten -->
		{#if loadingProjects}
			<p class="text-sm opacity-40">{i18n.t.landing.loadingProjects}</p>
		{:else if loadError}
			<div class="flex items-center justify-center gap-3">
				<p class="text-sm text-error-500">{i18n.t.landing.loadProjectsError}</p>
				<button type="button" class="btn btn-sm preset-outlined-surface-500" onclick={loadProjects}>
					{i18n.t.landing.retry}
				</button>
			</div>
		{:else if savedProjects.length > 0}
			<div class="space-y-3 text-left">
				<h2 class="text-center text-sm font-medium opacity-60">{i18n.t.landing.savedProjects}</h2>
				{#each savedProjects as project}
					{@const status = getProjectStatus(project)}
					<div class="card space-y-3 p-4">
						<div class="flex items-center justify-between">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="truncate font-medium">{project.name}</p>
									{#if status.isComplete}
										<span class="badge preset-filled-success-500 text-xs">{i18n.t.landing.completed}</span>
									{/if}
								</div>
								<p class="text-xs opacity-50">
									{i18n.t.landing.questionsAnswered.replace('{count}', String(status.answerCount))} — {formatDate(project.updated_at)}
								</p>
							</div>
							<div class="flex shrink-0 gap-2">
								<button
									type="button"
									class="btn preset-filled-primary-500 btn-sm"
									onclick={() => resumeProject(project)}
								>
									{status.isComplete ? i18n.t.landing.view : i18n.t.landing.resume}
								</button>
								<button
									type="button"
									class="btn preset-outlined-error-500 btn-sm"
									onclick={() => deleteProject(project.id)}
								>
									&times;
								</button>
							</div>
						</div>
						<!-- Voortgangsbalk -->
						<div class="flex items-center gap-3">
							<div class="h-1.5 flex-1 rounded-full bg-surface-700">
								<div
									class="h-full rounded-full transition-all {status.isComplete ? 'bg-success-500' : 'bg-primary-500'}"
									style="width: {status.progress}%"
								></div>
							</div>
							<span class="text-xs tabular-nums opacity-50">{status.progress}%</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
