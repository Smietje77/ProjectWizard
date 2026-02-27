<script lang="ts">
	import { i18n } from '$lib/i18n';
	import type { DetectedEnvVar } from '$lib/generator';

	interface EnvVar {
		key: string;
		label?: string;
		value: string;
		comment: string;
		dashboardLink?: string;
		placeholder: string;
		format?: RegExp;
		sensitive: boolean;
	}

	interface ServiceGroup {
		name: string;
		vars: EnvVar[];
	}

	interface Props {
		onComplete: (envVars: Record<string, string>) => void;
		requiredEnvVars?: DetectedEnvVar[];
	}

	let { onComplete, requiredEnvVars = [] }: Props = $props();

	// Bouw services dynamisch op basis van requiredEnvVars
	function buildServices(envVars: DetectedEnvVar[]): ServiceGroup[] {
		const grouped = new Map<string, EnvVar[]>();

		for (const v of envVars) {
			if (!grouped.has(v.service)) {
				grouped.set(v.service, []);
			}
			grouped.get(v.service)!.push({
				key: v.key,
				label: v.label,
				value: '',
				comment: v.comment,
				dashboardLink: v.dashboardLink,
				placeholder: v.example,
				format: v.format ? new RegExp(v.format) : undefined,
				sensitive: v.sensitive
			});
		}

		return Array.from(grouped.entries()).map(([name, vars]) => ({ name, vars }));
	}

	let services = $state<ServiceGroup[]>([]);

	// Initialiseer services bij mount vanuit props
	$effect(() => {
		if (requiredEnvVars.length > 0 && services.length === 0) {
			services = buildServices(requiredEnvVars);
		}
	});

	let activeService = $state(0);
	let showValues = $state<Record<string, boolean>>({});

	function toggleVisibility(key: string) {
		showValues = { ...showValues, [key]: !showValues[key] };
	}

	function maskValue(value: string): string {
		if (value.length <= 8) return '•'.repeat(value.length);
		return value.slice(0, 4) + '•'.repeat(value.length - 8) + value.slice(-4);
	}

	let allFilled = $derived(
		services.every((s) => s.vars.every((v) => v.value.trim().length > 0))
	);

	let anyFilled = $derived(
		services.some((s) => s.vars.some((v) => v.value.trim().length > 0))
	);

	function handleComplete() {
		const envVars: Record<string, string> = {};
		for (const service of services) {
			for (const v of service.vars) {
				if (v.value.trim().length > 0) {
					envVars[v.key] = v.value;
				}
			}
		}
		onComplete(envVars);
	}

	function skipAll() {
		onComplete({});
	}
</script>

{#if services.length > 0}
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-semibold">{i18n.t.env.title}</h2>
		<button type="button" class="btn preset-outlined-surface-500 btn-sm" onclick={skipAll}>
			{i18n.t.env.skipButton}
		</button>
	</div>

	<!-- Service tabs -->
	{#if services.length > 1}
		<div class="flex flex-wrap gap-2">
			{#each services as service, i}
				<button
					type="button"
					class="btn btn-sm {activeService === i
						? 'preset-filled-primary-500'
						: 'preset-outlined-surface-500'}"
					onclick={() => (activeService = i)}
				>
					{service.name}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Actieve service -->
	{#if services[activeService]}
		{@const service = services[activeService]}
		<div class="card space-y-4 p-6">
			<div>
				<h3 class="font-semibold">{service.name}</h3>
			</div>

		{#each service.vars as envVar}
			<div class="space-y-1">
				<div class="flex items-center justify-between">
					<label for={envVar.key} class="text-sm font-medium font-mono">{envVar.label ?? envVar.key}</label>
					{#if envVar.dashboardLink}
						<a
							href={envVar.dashboardLink}
							target="_blank"
							rel="noopener"
							class="text-xs text-primary-500 hover:underline"
						>
							{i18n.t.env.openDashboard}
						</a>
					{/if}
				</div>
				<p class="text-xs opacity-50">{envVar.comment}</p>
				<div class="flex gap-2">
					<input
						id={envVar.key}
						type={envVar.sensitive && !showValues[envVar.key] ? 'password' : 'text'}
						bind:value={envVar.value}
						placeholder={envVar.placeholder}
						class="input flex-1 rounded-lg p-2 font-mono text-sm"
					/>
					{#if envVar.sensitive}
						<button
							type="button"
							class="btn preset-outlined-surface-500 btn-sm"
							onclick={() => toggleVisibility(envVar.key)}
						>
							{showValues[envVar.key] ? i18n.t.env.hideValue : i18n.t.env.showValue}
						</button>
					{/if}
				</div>
				{#if envVar.format && envVar.value && !envVar.format.test(envVar.value)}
					<p class="text-xs text-warning-500">
						{i18n.t.env.formatWarning.replace('{format}', envVar.placeholder)}
					</p>
				{/if}
			</div>
		{/each}
		</div>
	{/if}

	<!-- Navigatie + Opslaan -->
	<div class="flex gap-3">
		{#if activeService < services.length - 1}
			<button
				type="button"
				class="btn preset-filled-primary-500"
				onclick={() => activeService++}
			>
				{i18n.t.env.nextService}
			</button>
		{/if}
		<button
			type="button"
			class="btn preset-filled-success-500"
			onclick={handleComplete}
			disabled={!anyFilled}
		>
			{allFilled ? i18n.t.env.saveComplete : i18n.t.env.saveIncomplete}
		</button>
	</div>
</div>
{/if}
