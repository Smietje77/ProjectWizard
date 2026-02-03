<script lang="ts">
	import { i18n } from '$lib/i18n';

	interface Tool {
		id: string;
		url: string;
		icon: string;
	}

	const tools: Tool[] = [
		{
			id: 'nodejs',
			url: 'https://nodejs.org/',
			icon: '<svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M12 1.85l-9 5.2v10.4l9 5.2 9-5.2V7.05l-9-5.2zm0 2.31l6.93 4L12 12.16 5.07 8.16 12 4.16zM4 9.58l7 4.04v8.07l-7-4.04V9.58zm9 12.11v-8.07l7-4.04v8.07l-7 4.04z"/></svg>'
		},
		{
			id: 'git',
			url: 'https://git-scm.com/',
			icon: '<svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M23.546 10.93L13.067.452a1.55 1.55 0 00-2.188 0L8.708 2.627l2.76 2.76a1.838 1.838 0 012.327 2.341l2.66 2.66a1.838 1.838 0 11-1.103 1.06l-2.48-2.48v6.53a1.838 1.838 0 11-1.51-.048V8.87a1.838 1.838 0 01-.998-2.41L7.6 3.69.454 10.836a1.55 1.55 0 000 2.188l10.48 10.48a1.55 1.55 0 002.186 0l10.426-10.386a1.55 1.55 0 000-2.188z"/></svg>'
		},
		{
			id: 'docker',
			url: 'https://www.docker.com/products/docker-desktop/',
			icon: '<svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.186.186 0 00-.187.186v1.887c0 .103.084.185.187.185zm-2.954-5.43h2.118a.186.186 0 00.187-.185V3.576a.186.186 0 00-.187-.186h-2.118a.186.186 0 00-.187.186v1.887c0 .102.084.185.187.185zm0 2.716h2.118a.187.187 0 00.187-.186V6.292a.187.187 0 00-.187-.187h-2.118a.187.187 0 00-.187.187v1.886c0 .103.084.186.187.186zm-2.93 0h2.12a.186.186 0 00.186-.186V6.292a.186.186 0 00-.186-.187H8.1a.186.186 0 00-.185.187v1.886c0 .103.083.186.185.186zm-2.964 0h2.119a.186.186 0 00.185-.186V6.292a.186.186 0 00-.185-.187H5.136a.186.186 0 00-.186.187v1.886c0 .103.084.186.186.186zm5.893 2.715h2.118a.186.186 0 00.187-.185V9.006a.186.186 0 00-.187-.186h-2.118a.186.186 0 00-.187.186v1.887c0 .103.084.185.187.185zm-2.93 0h2.12a.186.186 0 00.185-.185V9.006a.186.186 0 00-.185-.186h-2.12a.186.186 0 00-.184.186v1.887c0 .103.083.185.185.185zm-2.964 0h2.119a.186.186 0 00.185-.185V9.006a.186.186 0 00-.185-.186H5.136a.186.186 0 00-.186.186v1.887c0 .103.084.185.186.185zm-2.92 0h2.12a.186.186 0 00.184-.185V9.006a.186.186 0 00-.184-.186h-2.12a.186.186 0 00-.184.186v1.887c0 .103.082.185.185.185zM23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z"/></svg>'
		},
		{
			id: 'supabase',
			url: 'https://supabase.com/docs/guides/self-hosting/docker',
			icon: '<svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M13.7 21.64c-.39.55-1.24.24-1.24-.44V13.5h8.56c.72 0 1.12.83.66 1.38l-8 8.76zM10.3 2.36c.39-.55 1.24-.24 1.24.44V10.5H2.98c-.72 0-1.12-.83-.66-1.38l8-8.76z"/></svg>'
		},
		{
			id: 'claude_code',
			url: 'https://docs.anthropic.com/en/docs/claude-code',
			icon: '<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>'
		},
		{
			id: 'anthropic',
			url: 'https://console.anthropic.com/',
			icon: '<svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.508-4.066H5.248l-1.503 4.066H.141L6.57 3.52zm2.327 4.58L6.588 14.2h4.616l-2.308-6.1z"/></svg>'
		},
		{
			id: 'vscode',
			url: 'https://code.visualstudio.com/',
			icon: '<svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M17.583.063a1.5 1.5 0 00-1.032.392L9.37 7.17 5.025 3.763a1 1 0 00-1.32.076l-1.512 1.51a1 1 0 00-.003 1.418L5.71 10.2l.001.002L2.19 13.236a1 1 0 00.003 1.417l1.512 1.51a1 1 0 001.32.076L9.37 12.83l7.181 6.715c.29.27.666.418 1.054.418a1.5 1.5 0 001.395-.95l3.785-16.09A1.5 1.5 0 0021.388.29L17.583.063zM18 3.2l-2.8 11.9L9.8 10.2 18 3.2z"/></svg>'
		},
		{
			id: 'gsd',
			url: 'https://github.com/glittercowboy/get-shit-done.git',
			icon: '<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>'
		}
	];
</script>

<nav
	class="fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1.5 rounded-r-xl border border-l-0 border-surface-500/20 bg-surface-50-950/90 px-2 py-3 backdrop-blur-sm md:flex"
	aria-label={i18n.t.tools.ariaLabel}
>
	{#each tools as tool}
		<a
			href={tool.url}
			target="_blank"
			rel="noopener noreferrer"
			class="group relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-200-800"
			aria-label={(i18n.t.tools as Record<string, string>)[tool.id]}
		>
			<span class="opacity-50 transition-opacity group-hover:opacity-100">
				{@html tool.icon}
			</span>
			<span
				class="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg bg-surface-200-800 px-3 py-1.5 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
			>
				{(i18n.t.tools as Record<string, string>)[tool.id]}
			</span>
		</a>
	{/each}
</nav>
