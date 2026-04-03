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

	// Screenshot upload state — multi-page support
	const MAX_SCREENSHOTS = 5;

	interface ScreenshotSlot {
		pageType: string;
		customLabel: string;
		image: string | null;
		fileName: string;
		isAnalyzing: boolean;
		analysisResult: string | null;
	}

	const PAGE_TYPE_OPTIONS = [
		{ value: 'frontpage', labelKey: 'pageTypeFrontpage' as const },
		{ value: 'product', labelKey: 'pageTypeProduct' as const },
		{ value: 'dashboard', labelKey: 'pageTypeDashboard' as const },
		{ value: 'login', labelKey: 'pageTypeLogin' as const },
		{ value: 'admin', labelKey: 'pageTypeAdmin' as const },
		{ value: 'detail', labelKey: 'pageTypeDetail' as const },
		{ value: 'overview', labelKey: 'pageTypeOverview' as const },
		{ value: 'custom', labelKey: 'pageTypeCustom' as const }
	];

	let screenshots = $state<ScreenshotSlot[]>([]);
	let hasAnyAnalysis = $derived(screenshots.some((s) => s.analysisResult));

	let maxSelecties = $derived(question.max_selecties ?? 1);
	let isMultiSelect = $derived(maxSelecties > 1);
	let customText = $state('');

	// Detecteer of een optie een "Anders/specificeer" variant is
	function isCustomOption(optie: string): boolean {
		const lower = optie.toLowerCase();
		return lower.includes('anders') || lower.includes('other') || lower.includes('specificeer');
	}

	let hasCustomSelected = $derived(selectedOptions.some(isCustomOption));

	// Toon screenshot upload knop bij alle vrije tekst vragen
	let showImageUpload = $derived(question.vraag_type === 'vrije_tekst');
	let showUploadZone = $state(false);

	// Reset state wanneer de vraag verandert
	$effect(() => {
		question;
		isFollowUpMode = false;
		followUpQuestion = '';
		customText = '';
		screenshots = [];
		showUploadZone = false;
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
				? selectedOptions
						.map((o) => (isCustomOption(o) && customText.trim() ? `${o}: ${customText.trim()}` : o))
						.join(', ')
				: textAnswer.trim();

		// Bij design vragen: voeg screenshot analyses toe aan antwoord (multi-page)
		const analyzed = screenshots.filter((s) => s.analysisResult);
		if (analyzed.length > 0) {
			const markers = analyzed
				.map((s) => {
					const label = s.pageType === 'custom' ? s.customLabel : s.pageType;
					return `[DESIGN_ANALYSE:${label}]\n${s.analysisResult}`;
				})
				.join('\n\n');
			answer = answer ? `${answer}\n\n${markers}` : markers;
		}

		if (!answer) return;
		onSubmit(answer);
		textAnswer = '';
		selectedOptions = [];
		screenshots = [];
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

	// Screenshot upload functies (multi-page)
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

	function addScreenshotSlot() {
		if (screenshots.length >= MAX_SCREENSHOTS) return;
		screenshots = [
			...screenshots,
			{
				pageType: 'frontpage',
				customLabel: '',
				image: null,
				fileName: '',
				isAnalyzing: false,
				analysisResult: null
			}
		];
	}

	function removeScreenshotSlot(index: number) {
		screenshots = screenshots.filter((_, i) => i !== index);
	}

	async function handleSlotImageUpload(event: Event, index: number) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
		// resizeAndEncode comprimeert naar max 1024px JPEG, dus originele grootte niet relevant
		if (file.size > 20 * 1024 * 1024) return;

		const encoded = await resizeAndEncode(file, 2048);
		screenshots[index].fileName = file.name;
		screenshots[index].image = encoded;
	}

	async function handleSlotDrop(event: DragEvent, index: number) {
		event.preventDefault();
		const file = event.dataTransfer?.files?.[0];
		if (!file) return;
		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
		// resizeAndEncode comprimeert naar max 2048px JPEG, dus originele grootte niet relevant
		if (file.size > 20 * 1024 * 1024) return;

		const encoded = await resizeAndEncode(file, 2048);
		screenshots[index].fileName = file.name;
		screenshots[index].image = encoded;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	async function analyzeSlotScreenshot(index: number) {
		const slot = screenshots[index];
		if (!slot.image) return;
		screenshots[index].isAnalyzing = true;

		try {
			const response = await fetch('/api/analyze-screenshot', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ image: slot.image })
			});
			const data = await response.json();
			if (data.error) {
				console.error('Screenshot analyse fout:', data.error);
			} else {
				screenshots[index].analysisResult = data.analysis;
			}
		} catch (err) {
			console.error('Screenshot analyse mislukt:', err);
		} finally {
			screenshots[index].isAnalyzing = false;
		}
	}

	function getPageTypeLabel(slot: ScreenshotSlot): string {
		if (slot.pageType === 'custom') return slot.customLabel || 'Custom';
		const option = PAGE_TYPE_OPTIONS.find((o) => o.value === slot.pageType);
		return option ? i18n.t.wizard[option.labelKey] : slot.pageType;
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

				{#if hasCustomSelected}
					<textarea
						bind:value={customText}
						placeholder="Omschrijf je keuze..."
						class="textarea w-full rounded-lg p-3"
						rows="2"
						{disabled}
						onkeydown={(e) => {
							if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
						}}
					></textarea>
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

		<!-- Screenshot upload (multi-page, beschikbaar bij alle vrije tekst vragen) -->
		{#if showImageUpload}
			{#if screenshots.length > 0 || showUploadZone}
				<div class="space-y-3">
					{#each screenshots as slot, index}
						<div class="rounded-lg border border-surface-500/20 p-3 space-y-2">
							<!-- Page type selector -->
							<div class="flex items-center gap-2">
								<label class="flex items-center gap-2 text-xs font-medium opacity-60">
									{i18n.t.wizard.pageTypeLabel}
									<select
										class="select select-sm rounded border border-surface-500/20 bg-surface-500/5 px-2 py-1 text-sm"
										bind:value={slot.pageType}
									>
										{#each PAGE_TYPE_OPTIONS as opt}
											<option value={opt.value}>{i18n.t.wizard[opt.labelKey]}</option>
										{/each}
									</select>
								</label>
								{#if slot.pageType === 'custom'}
									<input
										type="text"
										class="input input-sm rounded border border-surface-500/20 bg-surface-500/5 px-2 py-1 text-sm"
										placeholder="Pagina naam..."
										bind:value={slot.customLabel}
									/>
								{/if}
								<button
									type="button"
									class="btn btn-sm preset-outlined-error-500 ml-auto"
									onclick={() => removeScreenshotSlot(index)}
								>
									{i18n.t.wizard.removeScreenshot}
								</button>
							</div>

							<!-- Upload zone of preview -->
							{#if slot.image}
								<div class="space-y-2">
									<div class="flex items-start gap-3">
										<img src={slot.image} alt="Preview {getPageTypeLabel(slot)}" class="max-h-32 rounded" />
										<div class="flex-1 space-y-2">
											<p class="text-xs opacity-60">{slot.fileName}</p>
											{#if slot.isAnalyzing}
												<div class="flex items-center gap-2">
													<div class="h-4 w-4 animate-spin rounded-full border-2 border-pink-500 border-t-transparent"></div>
													<span class="text-sm opacity-60">{i18n.t.wizard.analyzingScreenshot}</span>
												</div>
											{:else if slot.analysisResult}
												<div class="rounded bg-success-500/10 p-2 text-left text-sm">
													<p class="mb-1 text-xs font-medium text-success-500">{i18n.t.wizard.screenshotAnalyzed}</p>
													<p class="whitespace-pre-wrap text-xs opacity-75 max-h-24 overflow-y-auto">{slot.analysisResult}</p>
												</div>
											{:else}
												<button
													type="button"
													class="btn btn-sm preset-filled-primary-500"
													onclick={() => analyzeSlotScreenshot(index)}
													{disabled}
												>
													{i18n.t.wizard.uploadScreenshot}
												</button>
											{/if}
										</div>
									</div>
								</div>
							{:else}
								<div
									class="rounded-lg border-2 border-dashed border-surface-500/30 p-3 text-center transition-colors hover:border-pink-500/50"
									role="region"
									aria-label={i18n.t.wizard.uploadScreenshotHint}
									ondrop={(e) => handleSlotDrop(e, index)}
									ondragover={handleDragOver}
								>
									<label class="block cursor-pointer space-y-1">
										<p class="text-sm opacity-60">{i18n.t.wizard.dragDropHint}</p>
										<p class="text-xs opacity-40">{i18n.t.wizard.maxFileSize}</p>
										<input
											type="file"
											accept="image/jpeg,image/png,image/webp"
											class="hidden"
											onchange={(e) => handleSlotImageUpload(e, index)}
										/>
									</label>
								</div>
							{/if}
						</div>
					{/each}

					<!-- Add another page button -->
					{#if screenshots.length < MAX_SCREENSHOTS}
						<button
							type="button"
							class="btn btn-sm preset-outlined-surface-500 gap-1.5"
							onclick={addScreenshotSlot}
						>
							+ {i18n.t.wizard.addAnotherPage}
						</button>
					{:else}
						<p class="text-xs opacity-40">{i18n.t.wizard.maxScreenshotsReached}</p>
					{/if}
				</div>
				<p class="text-xs opacity-40">{i18n.t.wizard.uploadScreenshotHint}</p>
			{:else}
				<button
					type="button"
					class="btn btn-sm preset-outlined-surface-500 gap-1.5"
					onclick={() => { showUploadZone = true; addScreenshotSlot(); }}
				>
					{i18n.t.wizard.attachScreenshot}
				</button>
			{/if}
		{/if}

		<!-- Acties -->
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="btn preset-filled-primary-500 px-6"
				onclick={handleSubmit}
				disabled={disabled ||
					(question.vraag_type === 'multiple_choice'
						? selectedOptions.length === 0 || (hasCustomSelected && !customText.trim())
						: !textAnswer.trim() && !hasAnyAnalysis)}
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
