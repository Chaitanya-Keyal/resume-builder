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
		{ href: '/library', label: 'Library', icon: BookOpen, key: '1' },
		{ href: '/resumes', label: 'Resumes', icon: Files, key: '2' },
		{ href: '/data', label: 'Data', icon: Database, key: '3' }
	];
	const path = $derived(page.url.pathname.replace(base, '') || '/');
	const last = $derived(ui.lastResumeId ? workspace.resume(ui.lastResumeId) : undefined);
	const ThemeIcon = $derived(ui.theme === 'dark' ? Moon : ui.theme === 'light' ? Sun : Monitor);
</script>

<nav
	class="hidden w-14 shrink-0 flex-col items-center border-r border-border bg-surface py-3 md:flex"
	aria-label="Primary"
>
	<a
		href="{base}/resumes"
		class="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-bold text-accent-fg"
		aria-label="Resume Builder">R</a
	>
	{#each items as it (it.href)}
		{@const active = path === it.href || path.startsWith(it.href + '/')}
		<a
			href="{base}{it.href}"
			title="{it.label} (Ctrl+{it.key})"
			aria-current={active ? 'page' : undefined}
			class="my-0.5 flex h-10 w-10 items-center justify-center rounded-lg transition-colors {active
				? 'bg-surface-2 text-text'
				: 'text-muted hover:bg-surface-2 hover:text-text'}"
		>
			<it.icon size={18} />
		</a>
		{#if it.href === '/resumes' && last}
			<a
				href="{base}/resumes/{last.id}"
				title={last.name}
				aria-current={path === `/resumes/${last.id}` ? 'page' : undefined}
				class="my-0.5 flex h-8 w-8 items-center justify-center rounded-md text-[11px] transition-colors {path ===
				`/resumes/${last.id}`
					? 'bg-accent/15 text-accent'
					: 'text-faint hover:bg-surface-2 hover:text-text'}"
			>
				<FileText size={15} />
			</a>
		{/if}
	{/each}
	<div class="flex-1"></div>
	<button
		type="button"
		class="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
		title="Theme: {ui.theme}"
		aria-label="Cycle theme"
		onclick={() => ui.cycleTheme()}
	>
		<ThemeIcon size={17} />
	</button>
</nav>
