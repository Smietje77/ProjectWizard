<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { i18n } from '$lib/i18n';

	let description = $state('');
	let isSubmitting = $state(false);

	// Document upload state (multi-doc)
	type UploadedDoc = { name: string; size: number; text: string; summary: string };
	let uploadedDocs = $state<UploadedDoc[]>([]);
	let docProcessing = $state(false);
	let docError = $state<string | null>(null);
	let isDraggingDoc = $state(false);
	let docInputRef = $state<HTMLInputElement | null>(null);

	const MAX_DOCS = 5;
	const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
	const ALLOWED_TYPES = ['text/plain', 'text/markdown', 'application/pdf'];
	const ALLOWED_EXTENSIONS = ['.txt', '.md', '.pdf'];

	function getMimeType(file: File): string | null {
		if (file.type && ALLOWED_TYPES.includes(file.type)) return file.type;
		const ext = file.name.toLowerCase().split('.').pop();
		if (ext === 'txt') return 'text/plain';
		if (ext === 'md') return 'text/markdown';
		if (ext === 'pdf') return 'application/pdf';
		return null;
	}

	async function handleDocFile(file: File) {
		docError = null;

		if (uploadedDocs.length >= MAX_DOCS) {
			docError = i18n.t.landing.uploadDocMax;
			return;
		}
		if (uploadedDocs.some((d) => d.name === file.name)) {
			docError = i18n.t.landing.uploadDocDuplicate;
			return;
		}
		if (file.size > MAX_DOC_SIZE) {
			docError = i18n.t.landing.uploadDocTooLarge;
			return;
		}

		const mimeType = getMimeType(file);
		if (!mimeType) {
			docError = i18n.t.landing.uploadDocUnsupported;
			return;
		}

		docProcessing = true;
		try {
			// Text bestanden client-side lezen
			if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
				const text = await file.text();
				const summary = text.slice(0, 500) + (text.length > 500 ? '...' : '');
				uploadedDocs = [...uploadedDocs, { name: file.name, size: file.size, text, summary }];
			} else {
				// PDF: via API endpoint
				const base64 = await fileToBase64(file);
				const res = await fetch('/api/extract-document', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ file: base64, filename: file.name, mimeType })
				});

				if (!res.ok) {
					const body = await res.json().catch(() => null);
					throw new Error(body?.error || `Status ${res.status}`);
				}

				const data = await res.json();
				uploadedDocs = [...uploadedDocs, { name: file.name, size: file.size, text: data.text, summary: data.summary }];
			}
		} catch (err) {
			console.error('Document verwerking mislukt:', err);
			docError = i18n.t.landing.uploadDocError;
		} finally {
			docProcessing = false;
		}
	}

	function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				// Strip data URL prefix als aanwezig, anders is het al raw base64
				const base64 = result.includes(',') ? result.split(',')[1] : result;
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	function handleDocDrop(e: DragEvent) {
		e.preventDefault();
		isDraggingDoc = false;
		const files = Array.from(e.dataTransfer?.files ?? []);
		for (const file of files) handleDocFile(file);
	}

	function handleDocSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		for (const file of files) handleDocFile(file);
		input.value = '';
	}

	function removeDoc(index: number) {
		uploadedDocs = uploadedDocs.filter((_, i) => i !== index);
		docError = null;
	}

	function buildDocumentContext(): string | undefined {
		if (uploadedDocs.length === 0) return undefined;
		if (uploadedDocs.length === 1) return uploadedDocs[0].text;
		return uploadedDocs
			.map((doc, i) => `[Document ${i + 1}: ${doc.name}]\n${doc.text}`)
			.join('\n\n---\n\n');
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Auto-resize textarea
	function autoResize(e: Event) {
		const el = e.target as HTMLTextAreaElement;
		el.style.height = 'auto';
		el.style.height = Math.min(el.scrollHeight, 400) + 'px';
	}

	// Opgeslagen projecten
	interface SavedProject {
		id: string;
		name: string;
		description: string | null;
		current_step: number;
		answers: Array<{ categorie?: string; type?: string }>;
		category_depth?: Record<string, 'onvoldoende' | 'basis' | 'voldoende'> | null;
		is_complete?: boolean | null;
		created_at: string;
		updated_at: string;
	}

	const REQUIRED_CATEGORIES = [
		'website_type',
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

		// Gebruiker heeft expliciet op "Afronden" geklikt — definitief voltooid
		if (project.is_complete) {
			return { answerCount: realAnswers.length, progress: 100, isComplete: true };
		}

		// Gebruik opgeslagen category_depth als beschikbaar (zelfde logica als wizard store)
		if (project.category_depth && Object.keys(project.category_depth).length > 0) {
			const depth = project.category_depth;
			const score = REQUIRED_CATEGORIES.reduce((sum, cat) => {
				const d = depth[cat];
				return sum + (d === 'voldoende' ? 1 : d === 'basis' ? 0.5 : 0);
			}, 0);
			const progress = Math.round((score / REQUIRED_CATEGORIES.length) * 100);
			const isComplete = REQUIRED_CATEGORIES.every((c) => depth[c] === 'voldoende');
			return { answerCount: realAnswers.length, progress, isComplete };
		}

		// Fallback: bereken uit antwoord-categorieën
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
		wizardStore.startSession(description.trim(), buildDocumentContext());
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
				answers: data.answers ?? [],
				generated_output: data.generated_output ?? null,
				category_depth: data.category_depth ?? null
			});
			wizardStore.initialDescription = data.description ?? data.name;

			// Ga naar preview als het project al afgerond is
			if (wizardStore.isComplete) {
				goto('/wizard/preview');
			} else {
				goto('/wizard');
			}
		} catch (error) {
			console.error('Hervatten mislukt:', error);
		}
	}

	let downloadingId = $state<string | null>(null);
	let downloadError = $state<string | null>(null);

	async function downloadProject(project: SavedProject) {
		downloadingId = project.id;
		downloadError = null;
		try {
			const res = await fetch(`/api/projects/${project.id}`);
			if (!res.ok) {
				downloadError = i18n.t.landing.downloadFetchError;
				return;
			}
			const data = await res.json();
			const output = data.generated_output;
			if (!output?.files?.length) {
				downloadError = i18n.t.landing.downloadNoOutput;
				return;
			}

			const JSZip = (await import('jszip')).default;
			const zip = new JSZip();
			const safeName = project.name
				.toLowerCase()
				.replace(/[^a-z0-9\-_]/g, '-')
				.replace(/-+/g, '-')
				.replace(/^-|-$/g, '') || 'project';
			const folder = zip.folder(safeName);
			if (!folder) return;
			for (const file of output.files) {
				folder.file(file.path, file.content);
			}
			const blob = await zip.generateAsync({
				type: 'blob',
				compression: 'DEFLATE',
				compressionOptions: { level: 6 }
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${safeName}.zip`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Download mislukt:', error);
			downloadError = i18n.t.landing.downloadFetchError;
		} finally {
			downloadingId = null;
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
					rows="8"
					style="min-height: 160px; max-height: 400px;"
					disabled={isSubmitting}
					oninput={autoResize}
					maxlength={50000}
				></textarea>
				{#if description.length > 100}
					<div class="text-right text-xs opacity-40">
						{description.length.toLocaleString()} / 50.000
					</div>
				{/if}
			</label>

			<!-- Document upload zone (multi-doc) -->
			{#if uploadedDocs.length > 0}
				<div class="space-y-2">
					{#each uploadedDocs as doc, i}
						<div class="flex items-center gap-3 rounded-lg border border-success-500/30 bg-success-500/5 p-3">
							<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-500/20">
								<span class="text-sm">&#128196;</span>
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{doc.name}</p>
								<p class="text-xs opacity-50">{formatFileSize(doc.size)}</p>
							</div>
							<button
								type="button"
								class="btn btn-sm preset-outlined-error-500 shrink-0"
								onclick={() => removeDoc(i)}
							>
								{i18n.t.landing.uploadDocRemove}
							</button>
						</div>
					{/each}
					<p class="text-right text-xs opacity-40">
						{uploadedDocs.length}/{MAX_DOCS} {i18n.t.landing.uploadDocCount}
					</p>
				</div>
			{/if}

			{#if docProcessing}
				<div class="flex items-center gap-3 rounded-lg border border-surface-500/30 p-3">
					<div class="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
					<span class="text-sm opacity-70">{i18n.t.landing.uploadDocProcessing}</span>
				</div>
			{:else if uploadedDocs.length < MAX_DOCS}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors {isDraggingDoc ? 'border-primary-500 bg-primary-500/5' : 'border-surface-500/30 hover:border-surface-500/50'}"
					ondragover={(e) => { e.preventDefault(); isDraggingDoc = true; }}
					ondragleave={() => { isDraggingDoc = false; }}
					ondrop={handleDocDrop}
					onclick={() => docInputRef?.click()}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') docInputRef?.click(); }}
					role="button"
					tabindex="0"
				>
					<span class="text-xs opacity-50">
						{uploadedDocs.length === 0 ? i18n.t.landing.uploadDocHint : i18n.t.landing.uploadDocAdd}
					</span>
					<span class="text-xs opacity-30">.txt, .md, .pdf — max 10MB per bestand</span>
				</div>
				<input
					bind:this={docInputRef}
					type="file"
					multiple
					accept={ALLOWED_EXTENSIONS.join(',')}
					class="hidden"
					onchange={handleDocSelect}
				/>
			{/if}

			{#if docError}
				<p class="text-sm text-error-500">{docError}</p>
			{/if}

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
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
				<button
					type="button"
					class="card preset-outlined-surface-500 p-3 text-left transition-all hover:preset-outlined-primary-500"
					onclick={() => {
						description = i18n.t.landing.templateSaasDesc;
					}}
				>
					<p class="text-sm font-semibold">{i18n.t.landing.templateSaas}</p>
					<p class="mt-1 text-xs opacity-50">{i18n.t.landing.templateSaasHint}</p>
				</button>
				<button
					type="button"
					class="card preset-outlined-surface-500 p-3 text-left transition-all hover:preset-outlined-primary-500"
					onclick={() => {
						description = i18n.t.landing.templateApiDesc;
					}}
				>
					<p class="text-sm font-semibold">{i18n.t.landing.templateApi}</p>
					<p class="mt-1 text-xs opacity-50">{i18n.t.landing.templateApiHint}</p>
				</button>
				<button
					type="button"
					class="card preset-outlined-surface-500 p-3 text-left transition-all hover:preset-outlined-primary-500"
					onclick={() => {
						description = i18n.t.landing.templateEcommerceDesc;
					}}
				>
					<p class="text-sm font-semibold">{i18n.t.landing.templateEcommerce}</p>
					<p class="mt-1 text-xs opacity-50">{i18n.t.landing.templateEcommerceHint}</p>
				</button>
				<button
					type="button"
					class="card preset-outlined-surface-500 p-3 text-left transition-all hover:preset-outlined-primary-500"
					onclick={() => {
						description = i18n.t.landing.templateBlogDesc;
					}}
				>
					<p class="text-sm font-semibold">{i18n.t.landing.templateBlog}</p>
					<p class="mt-1 text-xs opacity-50">{i18n.t.landing.templateBlogHint}</p>
				</button>
				<button
					type="button"
					class="card preset-outlined-surface-500 p-3 text-left transition-all hover:preset-outlined-primary-500"
					onclick={() => {
						description = i18n.t.landing.templateDashboardDesc;
					}}
				>
					<p class="text-sm font-semibold">{i18n.t.landing.templateDashboard}</p>
					<p class="mt-1 text-xs opacity-50">{i18n.t.landing.templateDashboardHint}</p>
				</button>
				<button
					type="button"
					class="card preset-outlined-surface-500 p-3 text-left transition-all hover:preset-outlined-primary-500"
					onclick={() => {
						description = i18n.t.landing.templateMobileDesc;
					}}
				>
					<p class="text-sm font-semibold">{i18n.t.landing.templateMobile}</p>
					<p class="mt-1 text-xs opacity-50">{i18n.t.landing.templateMobileHint}</p>
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
				{#if downloadError}
					<div class="card border-2 border-warning-500/30 bg-warning-500/5 p-3 space-y-2">
						<p class="text-sm">{downloadError}</p>
						<button
							type="button"
							class="btn btn-sm preset-outlined-surface-500"
							onclick={() => downloadError = null}
						>
							OK
						</button>
					</div>
				{/if}
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
								{#if status.isComplete}
									<button
										type="button"
										class="btn preset-outlined-primary-500 btn-sm"
										onclick={() => downloadProject(project)}
										disabled={downloadingId === project.id}
									>
										{downloadingId === project.id ? i18n.t.landing.downloading : i18n.t.landing.download}
									</button>
								{/if}
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
