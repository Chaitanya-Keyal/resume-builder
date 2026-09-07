<script lang="ts">
	import { base } from '$app/paths';
	import { workspace } from '$lib/store/workspace.svelte';
	import type { LibrarySection } from '$lib/library-sections';

	let { current }: { current: LibrarySection } = $props();
	const p = $derived(workspace.profile);
	const items = $derived<{ id: LibrarySection; label: string; count: number | null }[]>([
		{ id: 'basics', label: 'Basics', count: null },
		{ id: 'work', label: 'Work', count: p?.work.length ?? 0 },
		{ id: 'education', label: 'Education', count: p?.education.length ?? 0 },
		{ id: 'projects', label: 'Projects', count: p?.projects.length ?? 0 },
		{ id: 'leadership', label: 'Leadership', count: p?.volunteer.length ?? 0 },
		{ id: 'skills', label: 'Skills', count: p?.skills.length ?? 0 },
		{ id: 'awards', label: 'Awards', count: p?.awards.length ?? 0 },
		{
			id: 'more',
			label: 'More',
			count: p
				? p.certificates.length + p.publications.length + p.languages.length + p.interests.length
				: 0
		}
	]);
</script>

<nav
	class="flex gap-1 overflow-x-auto md:w-44 md:shrink-0 md:flex-col md:overflow-visible"
	aria-label="Library sections"
>
	{#each items as it (it.id)}
		<a
			href="{base}/library/{it.id}"
			aria-current={current === it.id ? 'page' : undefined}
			class="flex shrink-0 items-center justify-between rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap {current ===
			it.id
				? 'bg-surface-2 font-medium text-text'
				: 'text-muted hover:bg-surface-2 hover:text-text'}"
		>
			{it.label}
			{#if it.count !== null}<span class="ml-3 text-xs text-faint tabular-nums">{it.count}</span
				>{/if}
		</a>
	{/each}
</nav>
