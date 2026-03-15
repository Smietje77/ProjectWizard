<script lang="ts">
	import { goto } from "$app/navigation";
	import { wizardStore } from "$lib/stores/wizard.svelte";
	import { i18n } from "$lib/i18n";
	import EnvHelper from "$lib/components/EnvHelper.svelte";
	import SkillReview from "$lib/components/SkillReview.svelte";
	import type { DetectedEnvVar } from "$lib/generator";

	$effect(() => {
		if (!wizardStore.initialDescription) {
			goto("/");
		}
	});

	let projectName = $state(wizardStore.projectName || "");
	let isGenerating = $state(false);
	let progressStep = $state("");
	let progressPct = $state(0);
	let envSaved = $state(false);
	let copiedFile = $state<string | null>(null);
	let copiedClaudeCmd = $state(false);
	let copiedFileTimeout: ReturnType<typeof setTimeout> | null = null;
	let copiedClaudeCmdTimeout: ReturnType<typeof setTimeout> | null = null;

	// Cleanup timers bij unmount
	$effect(() => {
		return () => {
			if (copiedFileTimeout) clearTimeout(copiedFileTimeout);
			if (copiedClaudeCmdTimeout) clearTimeout(copiedClaudeCmdTimeout);
		};
	});
	let isDownloading = $state(false);
	let generationResult = $state<{
		success: boolean;
		files?: Array<{ path: string; content: string; binary?: boolean }>;
		message?: string;
		error?: string;
		requiredEnvVars?: DetectedEnvVar[];
	} | null>(null);

	// Herstel opgeslagen generatie bij hervatten van afgerond project
	$effect(() => {
		if (wizardStore.generatedOutput && !generationResult) {
			const saved = wizardStore.generatedOutput as {
				success?: boolean;
				files?: Array<{ path: string; content: string; binary?: boolean }>;
				message?: string;
				requiredEnvVars?: DetectedEnvVar[];
			};
			if (saved.success) {
				generationResult = {
					success: true,
					files: saved.files,
					message: saved.message,
					requiredEnvVars: saved.requiredEnvVars,
				};
			}
		}
	});

	async function generateProject() {
		if (!projectName.trim()) return;
		isGenerating = true;
		generationResult = null;
		progressStep = "Generatie starten...";
		progressPct = 0;

		try {
			const response = await fetch("/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					projectName: projectName.trim(),
					description: wizardStore.initialDescription,
					answers: wizardStore.answers,
					stream: true,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				generationResult = { success: false, error: data.error };
				return;
			}

			// Verwerk SSE stream
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) throw new Error("Geen response body");

			let buffer = "";
			let eventType = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					if (line.startsWith("event: ")) {
						eventType = line.slice(7);
					} else if (line.startsWith("data: ") && eventType) {
						try {
							const data = JSON.parse(line.slice(6));
							if (eventType === "progress") {
								progressStep = data.step;
								progressPct = data.pct;
							} else if (eventType === "done") {
								generationResult = data;
								// Update Supabase (met error handling)
								if (wizardStore.projectId) {
									try {
										const saveRes = await fetch(
											`/api/projects/${wizardStore.projectId}`,
											{
												method: "PATCH",
												headers: {
													"Content-Type":
														"application/json",
												},
												body: JSON.stringify({
													name: projectName.trim(),
													generated_output: data,
												}),
											},
										);
										if (!saveRes.ok) {
											console.error(
												"Opslaan gegenereerde output mislukt:",
												saveRes.status,
												await saveRes.text(),
											);
										}
									} catch (e) {
										console.error(
											"Opslaan gegenereerde output mislukt:",
											e,
										);
									}
								}
							} else if (eventType === "error") {
								generationResult = {
									success: false,
									error: data.error,
								};
							}
						} catch (parseErr) {
							console.error(
								"SSE parse fout:",
								parseErr,
								"line:",
								line,
							);
						}
						eventType = "";
					}
				}
			}

			// Verwerk resterende buffer na stream einde
			if (buffer.trim()) {
				const remainingLines = buffer.split("\n");
				for (const line of remainingLines) {
					if (line.startsWith("event: ")) {
						eventType = line.slice(7);
					} else if (line.startsWith("data: ") && eventType) {
						try {
							const data = JSON.parse(line.slice(6));
							if (eventType === "done") generationResult = data;
							else if (eventType === "error")
								generationResult = { success: false, error: data.error };
						} catch {
							/* ignore parse errors in trailing buffer */
						}
						eventType = "";
					}
				}
			}

			// Fallback: stream eindigde zonder done/error event
			if (!generationResult) {
				generationResult = {
					success: false,
					error: "Generatie stream onverwacht beëindigd. Probeer opnieuw.",
				};
			}
		} catch (error) {
			generationResult = {
				success: false,
				error:
					error instanceof Error ? error.message : "Onbekende fout",
			};
		} finally {
			isGenerating = false;
		}
	}

	async function handleEnvComplete(envVars: Record<string, string>) {
		// Voeg .env.local toe aan de gegenereerde bestanden zodat het in de ZIP komt
		if (Object.keys(envVars).length > 0 && generationResult?.files) {
			const envContent = Object.entries(envVars)
				.map(([key, value]) => `${key}=${value}`)
				.join("\n");
			generationResult = {
				...generationResult,
				files: [
					...generationResult.files,
					{ path: ".env.local", content: envContent },
				],
			};
		}
		envSaved = true;
	}

	let safeName = $derived(
		projectName
			.toLowerCase()
			.replace(/[^a-z0-9\-_]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "") || "project",
	);

	async function downloadZip() {
		if (!generationResult?.files) return;
		isDownloading = true;
		try {
			const JSZip = (await import("jszip")).default;
			const zip = new JSZip();
			const folder = zip.folder(safeName);
			if (!folder) return;
			for (const file of generationResult.files) {
				if (file.binary) {
					folder.file(file.path, file.content, { base64: true });
				} else {
					folder.file(file.path, file.content);
				}
			}
			const blob = await zip.generateAsync({
				type: "blob",
				compression: "DEFLATE",
				compressionOptions: { level: 6 },
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${safeName}.zip`;
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			isDownloading = false;
		}
	}

	function handleFilesUpdated(
		updatedFiles: Array<{ path: string; content: string }>,
	) {
		if (generationResult) {
			generationResult = {
				...generationResult,
				files: updatedFiles,
			};
		}
	}

	function startOver() {
		wizardStore.reset();
		goto("/");
	}
</script>

<div class="container mx-auto max-w-4xl space-y-6 p-8">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">{i18n.t.preview.title}</h1>
		<button
			type="button"
			class="btn preset-outlined-surface-500"
			onclick={() => goto("/wizard")}
		>
			{i18n.t.preview.backButton}
		</button>
	</div>

	<p class="opacity-60">
		{i18n.t.preview.description.replace(
			"{count}",
			String(wizardStore.answers.length),
		)}
	</p>

	<!-- Projectnaam -->
	<div class="card space-y-3 p-6">
		<label class="space-y-2">
			<span class="text-sm font-medium"
				>{i18n.t.preview.projectNameLabel}</span
			>
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
					.replace(/[^a-z0-9\-_]/g, "-") || "..."}
			</p>
		</label>
	</div>

	<!-- Samenvatting van antwoorden -->
	<details class="card p-6">
		<summary class="cursor-pointer text-xl font-semibold">
			{i18n.t.preview.answersTitle.replace(
				"{count}",
				String(wizardStore.answers.length),
			)}
		</summary>
		<div class="mt-4 space-y-3">
			{#each wizardStore.answers as answer, i}
				<div
					class="rounded border border-surface-500/10 p-3 {answer.type ===
					'skipped'
						? 'opacity-50'
						: ''}"
				>
					<p class="text-xs opacity-50">
						{i18n.t.preview.step}
						{i + 1} — {answer.specialist}
					</p>
					<p class="text-sm opacity-75">{answer.question}</p>
					{#if answer.type === "skipped"}
						<p class="mt-1 italic opacity-60">
							{i18n.t.wizard.skippedLabel}
						</p>
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
					<div
						class="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"
					></div>
					<span class="font-medium">{progressStep}</span>
				</div>
				<div
					class="h-2 overflow-hidden rounded-full bg-surface-200-800"
				>
					<div
						class="h-full rounded-full bg-primary-500 transition-all duration-700"
						style="width: {progressPct}%"
					></div>
				</div>
				<p class="text-right text-xs tabular-nums opacity-50">
					{progressPct}%
				</p>
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
			<div
				class="card space-y-4 border-2 border-success-500/30 bg-success-500/5 p-6"
			>
				<h2 class="text-xl font-semibold text-success-500">
					{i18n.t.preview.successTitle}
				</h2>

				<!-- Environment variabelen instellen (boven download knop) -->
				{#if !envSaved && generationResult.requiredEnvVars?.length}
					<EnvHelper
						onComplete={handleEnvComplete}
						requiredEnvVars={generationResult.requiredEnvVars}
					/>
				{/if}

				{#if envSaved}
					<div
						class="flex items-center gap-2 rounded-lg bg-success-500/10 p-3 text-sm text-success-700 dark:text-success-400"
					>
						<span>&#10003;</span>
						<span>{i18n.t.env.saved}</span>
					</div>
				{/if}

				<!-- Download knop (alleen zichtbaar nadat env is opgeslagen of overgeslagen) -->
				{#if generationResult.files && (envSaved || !generationResult.requiredEnvVars?.length)}
					<button
						type="button"
						class="btn preset-filled-success-500 w-full py-3 text-lg"
						onclick={downloadZip}
						disabled={isDownloading}
					>
						{isDownloading
							? i18n.t.preview.downloading
							: i18n.t.preview.downloadButton}{envSaved
							? " (.env.local)"
							: ""}
					</button>
				{/if}

				<!-- Skills 2.0: Skill Review & Refinement -->
				{#if generationResult.files}
					<SkillReview
						files={generationResult.files}
						answers={wizardStore.answers}
						{projectName}
						description={wizardStore.initialDescription}
						onFilesUpdated={handleFilesUpdated}
					/>
				{/if}

				{#if generationResult.files}
					<div>
						<p class="mb-2 text-sm font-medium opacity-60">
							{i18n.t.preview.generatedFiles}
						</p>
						<div class="space-y-2">
							{#each generationResult.files as file}
								<details
									class="rounded border border-surface-500/10"
								>
									<summary
										class="flex cursor-pointer items-center justify-between gap-2 p-2"
									>
										<span class="truncate font-mono text-xs"
											>{file.path}</span
										>
										<button
											type="button"
											class="btn btn-sm preset-outlined-surface-500 shrink-0"
											onclick={async (e) => {
												e.preventDefault();
												await navigator.clipboard.writeText(
													file.content,
												);
												copiedFile = file.path;
												if (copiedFileTimeout) clearTimeout(copiedFileTimeout);
												copiedFileTimeout = setTimeout(() => {
													copiedFile = null;
												}, 2000);
											}}
										>
											{copiedFile === file.path
												? i18n.t.preview.copied
												: i18n.t.preview.copyButton}
										</button>
									</summary>
									<pre
										class="max-h-80 overflow-auto border-t border-surface-500/10 bg-surface-50-950 p-3 font-mono text-xs leading-relaxed">{file.content}</pre>
								</details>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Quick Start instructies -->
				<div class="space-y-3">
					<h3 class="font-semibold">
						{i18n.t.preview.quickStartTitle}
					</h3>
					<p class="text-sm opacity-60">
						{i18n.t.preview.quickStartGsdHint}
					</p>
					<p class="text-xs opacity-40">
						{i18n.t.preview.quickStartPermissionHint}
					</p>

					<!-- Open in Claude Code button -->
					<button
						type="button"
						class="btn preset-filled-primary-500 w-full"
						onclick={async () => {
							const path = `C:\\claude_projects\\${safeName}`;
							await navigator.clipboard.writeText(path);
							copiedClaudeCmd = true;
							if (copiedClaudeCmdTimeout) clearTimeout(copiedClaudeCmdTimeout);
							copiedClaudeCmdTimeout = setTimeout(() => {
								copiedClaudeCmd = false;
							}, 2000);
						}}
					>
						{copiedClaudeCmd
							? i18n.t.preview.copied
							: i18n.t.preview.openInClaude}
					</button>

					<div
						class="space-y-2 rounded bg-surface-200-800 p-4 font-mono text-sm"
					>
						<p class="opacity-40">
							// 1. {i18n.t.preview.quickStartStep1}
						</p>
						<p>C:\claude_projects\{safeName}</p>
						<p class="mt-3 opacity-40">
							// 2. {i18n.t.preview.quickStartStep2}
						</p>
						<p class="mt-3 opacity-40">
							// 3. {i18n.t.preview.quickStartStep3}
						</p>
						<p>claude --dangerously-skip-permissions</p>
						<p class="mt-3 opacity-40">
							// 4. {i18n.t.preview.quickStartStep4}
						</p>
						<p>/gsd:progress</p>
					</div>
					<p class="text-xs opacity-50">
						{i18n.t.preview.quickStartGsdFlow}
					</p>
				</div>

				<div class="flex flex-wrap gap-3 pt-2">
					{#if generationResult.files && (envSaved || !generationResult.requiredEnvVars?.length)}
						<button
							type="button"
							class="btn preset-filled-success-500"
							onclick={downloadZip}
							disabled={isDownloading}
						>
							{isDownloading
								? i18n.t.preview.downloading
								: i18n.t.preview.downloadButton}
						</button>
					{/if}
					<button
						type="button"
						class="btn preset-outlined-surface-500"
						onclick={() => {
							generationResult = null;
						}}
					>
						{i18n.t.preview.regenerateButton}
					</button>
					<button
						type="button"
						class="btn preset-outlined-surface-500"
						onclick={startOver}
					>
						{i18n.t.preview.newProject}
					</button>
				</div>
			</div>
		{:else}
			<div class="card border-2 border-error-500/30 bg-error-500/5 p-6">
				<h2 class="text-lg font-semibold text-error-500">
					{i18n.t.preview.errorTitle}
				</h2>
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
