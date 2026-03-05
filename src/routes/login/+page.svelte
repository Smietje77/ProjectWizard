<script lang="ts">
	import { enhance } from '$app/forms';
	import { i18n } from '$lib/i18n';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>{i18n.t.auth.loginTitle} — ProjectWizard</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-8">
	<div class="w-full max-w-sm space-y-6">
		<div class="space-y-1 text-center">
			<h1 class="text-2xl font-bold">ProjectWizard</h1>
			<p class="text-sm opacity-50">{i18n.t.auth.loginSubtitle}</p>
		</div>

		<form
			method="POST"
			class="card space-y-4 p-6"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}}
		>
			{#if form?.error}
				<div class="rounded-lg bg-error-500/10 p-3 text-sm text-error-500">
					{form.error}
				</div>
			{/if}

			<label class="space-y-1">
				<span class="text-sm font-medium">{i18n.t.auth.email}</span>
				<input
					type="email"
					name="email"
					class="input w-full"
					required
					autocomplete="email"
					disabled={isSubmitting}
				/>
			</label>

			<label class="space-y-1">
				<span class="text-sm font-medium">{i18n.t.auth.password}</span>
				<input
					type="password"
					name="password"
					class="input w-full"
					required
					autocomplete="current-password"
					disabled={isSubmitting}
				/>
			</label>

			<button
				type="submit"
				class="btn preset-filled-primary-500 w-full"
				disabled={isSubmitting}
			>
				{isSubmitting ? i18n.t.auth.loggingIn : i18n.t.auth.loginButton}
			</button>
		</form>
	</div>
</div>
