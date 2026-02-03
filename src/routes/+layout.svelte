<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { i18n } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import ToolsSidebar from '$lib/components/ToolsSidebar.svelte';

	let { children } = $props();

	function toggleLocale() {
		i18n.setLocale(i18n.locale === 'nl' ? 'en' : 'nl');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>ProjectWizard</title>
</svelte:head>

<!-- Navigatie knoppen -->
<div class="fixed right-4 top-4 z-50 flex gap-2">
	<a href="/" class="btn preset-outlined-surface-500 btn-sm">&larr; Home</a>
	<button type="button" class="btn preset-outlined-surface-500 btn-sm" onclick={toggleLocale}>
		{i18n.locale === 'nl' ? 'EN' : 'NL'}
	</button>
</div>

<ToolsSidebar />

{@render children()}
