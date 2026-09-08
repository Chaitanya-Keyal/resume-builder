<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Database from '@lucide/svelte/icons/database';
	import Files from '@lucide/svelte/icons/files';
	import FileText from '@lucide/svelte/icons/file-text';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import Monitor from '@lucide/svelte/icons/monitor';
	import { ui } from '$lib/store/ui.svelte';
	import { workspace } from '$lib/store/workspace.svelte';

	const items = [
		{ href: '/library', label: 'Library', icon: BookOpen },
		{ href: '/resumes', label: 'Resumes', icon: Files },
		{ href: '/data', label: 'Data', icon: Database }
	];
	const path = $derived(page.url.pathname.replace(base, '') || '/');
	const last = $derived(ui.lastResumeId ? workspace.resume(ui.lastResumeId) : undefined);
	const ThemeIcon = $derived(ui.theme === 'dark' ? Moon : ui.theme === 'light' ? Sun : Monitor);
	const themeLabel = $derived(
		ui.theme === 'dark' ? 'Dark' : ui.theme === 'light' ? 'Light' : 'System theme'
	);
</script>

<nav
	class="hidden w-56 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface px-3 py-3 md:flex"
	aria-label="Primary"
>
	<a href="{base}/resumes" class="mb-4 flex items-center gap-2.5 px-1.5 py-1" aria-label="Home">
		<span
			class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg"
		>
			<FileText size={15} strokeWidth={2.25} />
		</span>
		<span class="truncate text-sm font-semibold tracking-tight">Resume Builder</span>
	</a>

	{#each items as it (it.href)}
		{@const active = path === it.href || path.startsWith(it.href + '/')}
		<a
			href="{base}{it.href}"
			aria-current={active ? 'page' : undefined}
			class="group my-0.5 flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors {active
				? 'bg-surface-2 font-medium text-text'
				: 'text-muted hover:bg-surface-2 hover:text-text'}"
		>
			<it.icon size={16} />
			<span class="flex-1">{it.label}</span>
		</a>
		{#if it.href === '/resumes' && last}
			<a
				href="{base}/resumes/{last.id}"
				aria-current={path === `/resumes/${last.id}` ? 'page' : undefined}
				title={last.name}
				class="my-0.5 ml-4 flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] transition-colors {path ===
				`/resumes/${last.id}`
					? 'bg-accent/15 font-medium text-accent'
					: 'text-muted hover:bg-surface-2 hover:text-text'}"
			>
				<FileText size={14} />
				<span class="truncate">{last.name}</span>
			</a>
		{/if}
	{/each}

	<div class="flex-1"></div>

	<button
		type="button"
		class="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted hover:bg-surface-2 hover:text-text"
		onclick={() => ui.cycleTheme()}
		title="Switch theme"
	>
		<ThemeIcon size={16} />
		<span>{themeLabel}</span>
	</button>
	<a
		href="https://github.com/Chaitanya-Keyal/resume-builder"
		target="_blank"
		rel="noopener"
		class="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted hover:bg-surface-2 hover:text-text"
		title="Source code, issues and ideas"
	>
		<!-- The GitHub mark; lucide ships no brand icons. -->
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<path
				d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
			/>
		</svg>
		<span>Source on GitHub</span>
	</a>
	<p class="px-2.5 pt-2 text-[11px] text-faint">Local only. Nothing leaves this browser.</p>
</nav>
