<script lang="ts">
	import type { CoordinatorResponse } from '$lib/stores/wizard.svelte';
	import { i18n } from '$lib/i18n';

	interface Props {
		question: CoordinatorResponse;
		onSubmit: (answer: string) => void;
		onSkip: () => void;
		disabled?: boolean;
	}

	let { question, onSubmit, onSkip, disabled = false }: Props = $props();

	let textAnswer = $state('');
	let selectedOptions = $state<string[]>([]);
	let isFollowUpMode = $state(false);
	let followUpQuestion = $state('');

	// Screenshot upload state
	let uploadedImage = $state<string | null>(null);
	let imageFileName = $state('');
	let isAnalyzing = $state(false);
	let analysisResult = $state<string | null>(null);

	let maxSelecties = $derived(question.max_selecties ?? 1);
	let isMultiSelect = $derived(maxSelecties > 1);

	// Toon screenshot upload zone bij design specialist + vrije tekst
	let showImageUpload = $derived(
		question.volgende_specialist === 'design' && question.vraag_type === 'vrije_tekst'
	);

	// Reset state wanneer de vraag verandert
	$effect(() => {
		question;
		isFollowUpMode = false;
		followUpQuestion = '';
		uploadedImage = null;
		imageFileName = '';
		isAnalyzing = false;
		analysisResult = null;
	});

	function toggleOption(optie: string) {
		const index = selectedOptions.indexOf(optie);
		if (index >= 0) {
			selectedOptions = selectedOptions.filter((o) => o !== optie);
		} else if (isMultiSelect) {
			if (selectedOptions.length < maxSelecties) {
				selectedOptions = [...selectedOptions, optie];
			}
		} else {
			selectedOptions = [optie];
		}
	}

	function isSelected(optie: string): boolean {
		return selectedOptions.includes(optie);
	}

	function isOptionDisabled(optie: string): boolean {
		return isMultiSelect && selectedOptions.length >= maxSelecties && !isSelected(optie);
	}

	function handleSubmit() {
		let answer =
			question.vraag_type === 'multiple_choice'
				? selectedOptions.join(', ')
				: textAnswer.trim();

		// Bij design vragen: voeg screenshot analyse toe aan antwoord
		if (analysisResult) {
			answer = answer
				? `${answer}\n\n[DESIGN_ANALYSE]\n${analysisResult}`
				: `[DESIGN_ANALYSE]\n${analysisResult}`;
		}

		if (!answer) return;
		onSubmit(answer);
		textAnswer = '';
		selectedOptions = [];
		uploadedImage = null;
		imageFileName = '';
		analysisResult = null;
	}

	function handleFollowUp() {
		isFollowUpMode = true;
		followUpQuestion = '';
	}

	function handleFollowUpSubmit() {
		const q = followUpQuestion.trim();
		if (!q) return;
		onSubmit('__FOLLOW_UP__:' + q);
		followUpQuestion = '';
		isFollowUpMode = false;
	}

	function handleFollowUpCancel() {
		isFollowUpMode = false;
		followUpQuestion = '';
	}

	// Screenshot upload functies
	async function resizeAndEncode(file: File, maxDim: number): Promise<string> {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement('canvas');
				let { width, height } = img;
				if (width > maxDim || height > maxDim) {
					const ratio = Math.min(maxDim / width, maxDim / height);
					width = Math.round(width * ratio);
					height = Math.round(height * ratio);
				}
				canvas.width = width;
				canvas.height = height;
				canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
				resolve(canvas.toDataURL('image/jpeg', 0.85));
			};
			img.src = URL.createObjectURL(file);
		});
	}

	async function handleImageUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		// Valideer type en grootte
		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
		if (file.size > 4 * 1024 * 1024) return;

		imageFileName = file.name;
		uploadedImage = await resizeAndEncode(file, 1024);
	}

	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		const file = event.dataTransfer?.files?.[0];
		if (!file) return;
		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
		if (file.size > 4 * 1024 * 1024) return;

		imageFileName = file.name;
		uploadedImage = await resizeAndEncode(file, 1024);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	async function analyzeScreenshot() {
		if (!uploadedImage) return;
		isAnalyzing = true;

		try {
			const response = await fetch('/api/analyze-screenshot', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ image: uploadedImage })
			});
			const data = await response.json();
			if (data.error) {
				console.error('Screenshot analyse fout:', data.error);
			} else {
				analysisResult = data.analysis;
			}
		} catch (err) {
			console.error('Screenshot analyse mislukt:', err);
		} finally {
			isAnalyzing = false;
		}
	}

	function removeImage() {
		uploadedImage = null;
		imageFileName = '';
		analysisResult = null;
		isAnalyzing = false;
	}
</script>

<div class="space-y-4">
	{#if isFollowUpMode}
		<!-- Follow-up modus: vraag typen -->
		<div class="rounded-lg border border-warning-500/30 bg-warning-500/5 p-4">
			<p class="mb-2 text-sm font-medium opacity-75">
				{i18n.t.wizard.followUpButton}
			</p>
			<textarea
				bind:value={followUpQuestion}
				placeholder={i18n.t.wizard.followUpPlaceholder}
				class="textarea w-full rounded-lg p-3"
				rows="3"
				{disabled}
				onkeydown={(e) => {
					if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleFollowUpSubmit();
				}}
			></textarea>
		</div>

		<div class="flex items-center gap-3">
			<button
				type="button"
				class="btn preset-filled-warning-500 px-6"
				onclick={handleFollowUpSubmit}
				disabled={disabled || !followUpQuestion.trim()}
			>
				{i18n.t.wizard.followUpSubmitButton}
			</button>
			<button
				type="button"
				class="btn preset-outlined-surface-500 px-4"
				onclick={handleFollowUpCancel}
				{disabled}
			>
				{i18n.t.wizard.followUpCancelButton}
			</button>
			<span class="ml-auto text-xs opacity-40">
				{i18n.t.wizard.sendHint}
			</span>
		</div>
	{:else}
		{#if question.vraag_type === 'multiple_choice' && question.opties?.length}
			<!-- Multiple choice opties -->
			<div class="grid gap-2">
				{#each question.opties as optie}
					<button
						type="button"
						class="btn rounded-lg border px-4 py-3 text-left transition-colors
							{isSelected(optie)
							? 'border-primary-500 bg-primary-500/10'
							: isOptionDisabled(optie)
								? 'border-surface-500/10 opacity-40 cursor-not-allowed'
								: 'border-surface-500/20 hover:border-primary-500/50'}"
						onclick={() => toggleOption(optie)}
						disabled={disabled || isOptionDisabled(optie)}
					>
						<span class="flex items-center gap-2">
							{#if isMultiSelect}
								<span
									class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs
										{isSelected(optie)
										? 'border-primary-500 bg-primary-500 text-white'
										: 'border-surface-500/30'}"
								>
									{#if isSelected(optie)}✓{/if}
								</span>
							{/if}
							{optie}
						</span>
					</button>
				{/each}

				{#if isMultiSelect}
					<p class="text-sm opacity-60">
						{i18n.t.wizard.multiSelectHint
							.replace('{selected}', String(selectedOptions.length))
							.replace('{max}', String(maxSelecties))}
					</p>
				{/if}
			</div>
		{:else}
			<!-- Vrije tekst input -->
			<textarea
				bind:value={textAnswer}
				placeholder={i18n.t.wizard.answerPlaceholder}
				class="textarea w-full rounded-lg p-3"
				rows="3"
				{disabled}
				onkeydown={(e) => {
					if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
				}}
			></textarea>
		{/if}

		<!-- Screenshot upload zone (alleen bij design specialist + vrije tekst) -->
		{#if showImageUpload}
			<div
				class="rounded-lg border-2 border-dashed border-surface-500/30 p-4 text-center transition-colors hover:border-pink-500/50"
				role="region"
				aria-label={i18n.t.wizard.uploadScreenshotHint}
				ondrop={handleDrop}
				ondragover={handleDragOver}
			>
				{#if uploadedImage}
					<div class="space-y-3">
						<img src={uploadedImage} alt="Preview" class="mx-auto max-h-48 rounded" />
						<p class="text-sm opacity-60">{imageFileName}</p>

						{#if isAnalyzing}
							<div class="flex items-center justify-center gap-2">
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-pink-500 border-t-transparent"
								></div>
								<span class="text-sm opacity-60"
									>{i18n.t.wizard.analyzingScreenshot}</span
								>
							</div>
						{:else if analysisResult}
							<div class="rounded bg-success-500/10 p-3 text-left text-sm">
								<p class="mb-1 font-medium text-success-500">
									{i18n.t.wizard.screenshotAnalyzed}
								</p>
								<p class="whitespace-pre-wrap text-xs opacity-75">
									{analysisResult}
								</p>
							</div>
						{:else}
							<button
								type="button"
								class="btn btn-sm preset-filled-primary-500"
								onclick={analyzeScreenshot}
								{disabled}
							>
								{i18n.t.wizard.uploadScreenshot}
							</button>
						{/if}

						<button
							type="button"
							class="btn btn-sm preset-outlined-error-500"
							onclick={removeImage}
						>
							{i18n.t.wizard.removeScreenshot}
						</button>
					</div>
				{:else}
					<label class="block cursor-pointer space-y-2">
						<p class="text-sm opacity-60">{i18n.t.wizard.dragDropHint}</p>
						<p class="text-xs opacity-40">{i18n.t.wizard.maxFileSize}</p>
						<input
							type="file"
							accept="image/jpeg,image/png,image/webp"
							class="hidden"
							onchange={handleImageUpload}
						/>
					</label>
				{/if}
			</div>
			<p class="text-xs opacity-40">{i18n.t.wizard.uploadScreenshotHint}</p>
		{/if}

		<!-- Acties -->
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="btn preset-filled-primary-500 px-6"
				onclick={handleSubmit}
				disabled={disabled ||
					(question.vraag_type === 'multiple_choice'
						? selectedOptions.length === 0
						: !textAnswer.trim() && !analysisResult)}
			>
				{i18n.t.wizard.nextButton}
			</button>

			<button
				type="button"
				class="btn preset-outlined-surface-500 px-4"
				onclick={handleFollowUp}
				{disabled}
			>
				{i18n.t.wizard.followUpButton}
			</button>

			<button
				type="button"
				class="btn preset-outlined-surface-500 px-4"
				onclick={onSkip}
				{disabled}
			>
				{i18n.t.wizard.skipButton}
			</button>

			<span class="ml-auto text-xs opacity-40">
				{#if question.vraag_type !== 'multiple_choice'}
					{i18n.t.wizard.sendHint}
				{/if}
			</span>
		</div>
	{/if}
</div>
