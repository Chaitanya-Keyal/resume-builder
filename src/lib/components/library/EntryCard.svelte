<script lang="ts">
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { Snippet } from 'svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Menu, { type MenuItem } from '$lib/components/ui/Menu.svelte';

	let {
		id,
		title,
		subtitle,
		expanded,
		usedIn = 0,
		hidden = false,
		canMove,
		extraMenu = [],
		ontoggle,
		onmove,
		ondelete,
		children
	}: {
		id: string;
		title: string;
		subtitle?: string;
		expanded: boolean;
		usedIn?: number;
		hidden?: boolean;
		canMove: { up: boolean; down: boolean };
		extraMenu?: MenuItem[];
		ontoggle: () => void;
		onmove: (dir: -1 | 1) => void;
		ondelete: () => void;
		children: Snippet;
	} = $props();
</script>

<article
	{id}
	class="rounded-lg border border-border bg-surface transition-colors {expanded
		? 'border-border-strong'
		: ''}"
>
	<div class="group flex items-center gap-2 px-3 py-2">
		<button
			type="button"
			class="flex min-w-0 flex-1 items-center gap-2 text-left"
			onclick={ontoggle}
			aria-expanded={expanded}
		>
			<ChevronDown
				size={15}
				class="shrink-0 text-faint transition-transform {expanded ? 'rotate-180' : ''}"
			/>
			<span class="min-w-0">
				<span class="block truncate text-sm font-medium {title ? '' : 'text-faint italic'}"
					>{title || 'Untitled'}</span
				>
				{#if subtitle}<span class="block truncate text-xs text-muted">{subtitle}</span>{/if}
			</span>
		</button>
		{#if hidden}<Badge>hidden from portfolio</Badge>{/if}
		{#if usedIn}<Badge tone="accent">in {usedIn} resume{usedIn === 1 ? '' : 's'}</Badge>{/if}
		<span
			class="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
		>
			<button
				type="button"
				class="p-0.5 text-faint hover:text-text disabled:opacity-30"
				aria-label="Move up"
				disabled={!canMove.up}
				onclick={() => onmove(-1)}><ArrowUp size={14} /></button
			>
			<button
				type="button"
				class="p-0.5 text-faint hover:text-text disabled:opacity-30"
				aria-label="Move down"
				disabled={!canMove.down}
				onclick={() => onmove(1)}><ArrowDown size={14} /></button
			>
		</span>
		<Menu
			triggerClass="text-faint hover:bg-surface-2 hover:text-text flex h-7 w-7 items-center justify-center rounded-md"
			items={[
				...extraMenu,
				...(extraMenu.length ? [{ separator: true }] : []),
				{ label: 'Delete', icon: Trash2, danger: true, onSelect: ondelete }
			]}
		>
			{#snippet trigger()}<Ellipsis size={15} />{/snippet}
		</Menu>
	</div>
	{#if expanded}
		<div class="border-t border-border px-3 py-3">{@render children()}</div>
	{/if}
</article>
