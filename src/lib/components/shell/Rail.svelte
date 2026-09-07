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
	import Kbd from '$lib/components/ui/Kbd.svelte';
	import { ui } from '$lib/store/ui.svelte';
	import { workspace } from '$lib/store/workspace.svelte';

	const items = [
		{ href: '/library', label: 'Library', icon: BookOpen, key: '1' },
		{ href: '/resumes', label: 'Resumes', icon: Files, key: '2' },
		{ href: '/data', label: 'Data', icon: Database, key: '3' }
	];
	const path = $derived(page.url.pathname.replace(base, '') || '/');
	const last = $derived(ui.lastResumeId ? workspace.resume(ui.lastResumeId) : undefined);
	const ThemeIcon = $derived(ui.theme === 'dark' ? Moon : ui.theme === 'light' ? Sun : Monitor);
	const themeLabel = $derived(
		ui.theme === 'dark' ? 'Dark' : ui.theme === 'light' ? 'Light' : 'System theme'
	);
</script>

<nav
	class="hidden w-56 shrink-0 flex-col border-r border-border bg-surface px-3 py-3 md:flex"
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
			<span class="opacity-0 transition-opacity group-hover:opacity-100"
				><Kbd keys="Mod+{it.key}" /></span
			>
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
	<p class="px-2.5 pt-2 text-[11px] text-faint">Local only. Nothing leaves this browser.</p>
</nav>
