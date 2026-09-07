<script lang="ts">
	import { base } from '$app/paths';
	import Copy from '@lucide/svelte/icons/copy';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Menu from '$lib/components/ui/Menu.svelte';
	import type { Resume } from '$lib/core/schema/types';
	import { compiles } from '$lib/store/compile.svelte';
	import { relativeTime } from '$lib/util/time';
	import { getTemplate } from '$lib/core/latex';

	let {
		resume,
		onrename,
		onduplicate,
		ondelete
	}: {
		resume: Resume;
		onrename: () => void;
		onduplicate: () => void;
		ondelete: () => void;
	} = $props();

	const state = $derived(compiles.states[resume.id]);
	const entries = $derived(resume.sections.reduce((n, s) => n + s.items.length, 0));
</script>

<div
	class="group relative flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"
>
	<a
		href="{base}/resumes/{resume.id}"
		class="absolute inset-0 rounded-xl"
		aria-label="Open {resume.name}"
	></a>
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			<h3 class="truncate font-medium">{resume.name}</h3>
			<p class="mt-0.5 text-xs text-muted">
				{getTemplate(resume.template).name} · {entries} entries · updated {relativeTime(
					resume.updatedAt
				)}
			</p>
		</div>
		<div
			class="relative z-10 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
		>
			<Menu
				triggerClass="text-muted hover:bg-surface-2 hover:text-text flex h-7 w-7 items-center justify-center rounded-md"
				items={[
					{ label: 'Rename', icon: Pencil, onSelect: onrename },
					{ label: 'Duplicate', icon: Copy, onSelect: onduplicate },
					{ separator: true },
					{ label: 'Delete', icon: Trash2, danger: true, onSelect: ondelete }
				]}
			>
				{#snippet trigger()}<Ellipsis size={16} />{/snippet}
			</Menu>
		</div>
	</div>
	<div class="mt-3 flex flex-wrap items-center gap-1.5">
		{#each resume.labels as l (l)}
			<Badge tone="accent">{l}</Badge>
		{/each}
		{#if state?.pages}
			<Badge tone={state.pages === 1 ? 'ok' : 'warn'}
				>{state.pages} page{state.pages === 1 ? '' : 's'}</Badge
			>
		{/if}
	</div>
</div>
