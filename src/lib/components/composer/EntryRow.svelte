<script lang="ts">
	import { base } from '$app/paths';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import { toPlain } from '$lib/core/markup';
	import type { RefEntry } from '$lib/core/resolve/refs';
	import type { Highlight, ItemRef, Resume } from '$lib/core/schema/types';
	import {
		clearBulletOverride,
		moveBullet,
		moveItem,
		setBulletOverride,
		toggleBullet,
		toggleItem
	} from '$lib/store/composer';
	import { ui } from '$lib/store/ui.svelte';
	import BulletRow from './BulletRow.svelte';

	let {
		resume,
		sectionId,
		entry,
		item,
		highlights,
		librarySection,
		canMove
	}: {
		resume: Resume;
		sectionId: string;
		entry: RefEntry;
		item?: ItemRef;
		highlights: Highlight[];
		librarySection: string;
		canMove: { up: boolean; down: boolean };
	} = $props();

	let open = $state(false);
	const included = $derived(!!item);
	const libraryOrder = $derived(highlights.map((h) => h.id));
	/** Included bullets in resume order, then the rest in library order. */
	const rows = $derived.by(() => {
		const byId = new Map(highlights.map((h) => [h.id, h]));
		const picked = (item?.bullets ?? []).flatMap((id) => byId.get(id) ?? []);
		const rest = highlights.filter((h) => !item?.bullets.includes(h.id));
		return [...picked, ...rest];
	});
	const count = $derived(`${item?.bullets.length ?? 0}/${highlights.length}`);

	const editHref = $derived(
		`${base}/library/${librarySection}?entry=${encodeURIComponent(entry.ref)}`
	);
	function remember() {
		ui.returnTo = { href: `/resumes/${resume.id}`, label: resume.name };
	}
</script>

<div class="border-t border-border first:border-t-0 {included ? '' : 'opacity-60'}">
	<div class="group flex items-center gap-2 px-3 py-1.5">
		<Checkbox
			checked={included}
			onchange={() => toggleItem(resume.id, sectionId, entry.ref, entry.highlightIds)}
		/>
		<button
			type="button"
			class="flex min-w-0 flex-1 items-center gap-2 text-left"
			onclick={() => (open = !open)}
			disabled={!highlights.length}
			aria-expanded={open}
		>
			<span class="min-w-0">
				<span class="block truncate text-sm font-medium">{toPlain(entry.label)}</span>
				{#if entry.detail}<span class="block truncate text-xs text-muted">{entry.detail}</span>{/if}
			</span>
			{#if highlights.length}
				<span class="ml-auto shrink-0 text-xs text-faint tabular-nums">{count}</span>
				<ChevronDown
					size={14}
					class="shrink-0 text-faint transition-transform {open ? 'rotate-180' : ''}"
				/>
			{/if}
		</button>
		<span
			class="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
		>
			{#if included}
				<button
					type="button"
					class="p-0.5 text-faint hover:text-text disabled:opacity-30"
					aria-label="Move up"
					disabled={!canMove.up}
					onclick={() => moveItem(resume.id, sectionId, entry.ref, -1)}
					><ArrowUp size={13} /></button
				>
				<button
					type="button"
					class="p-0.5 text-faint hover:text-text disabled:opacity-30"
					aria-label="Move down"
					disabled={!canMove.down}
					onclick={() => moveItem(resume.id, sectionId, entry.ref, 1)}
					><ArrowDown size={13} /></button
				>
			{/if}
			<a
				href={editHref}
				onclick={remember}
				class="p-0.5 text-faint hover:text-text"
				aria-label="Edit in library"
				title="Edit in library"><ExternalLink size={13} /></a
			>
		</span>
	</div>
	{#if open && highlights.length}
		<div class="pr-3 pb-2">
			{#each rows as h (h.id)}
				{@const idx = item?.bullets.indexOf(h.id) ?? -1}
				<BulletRow
					highlight={h}
					included={idx !== -1}
					override={item?.overrides?.bullets?.[h.id]}
					canMove={{ up: idx > 0, down: idx !== -1 && idx < (item?.bullets.length ?? 0) - 1 }}
					ontoggle={() => {
						if (!item) toggleItem(resume.id, sectionId, entry.ref, [h.id]);
						else toggleBullet(resume.id, sectionId, entry.ref, h.id, libraryOrder);
					}}
					onmove={(dir) => moveBullet(resume.id, sectionId, entry.ref, h.id, dir)}
					onoverride={(text) =>
						setBulletOverride(resume.id, sectionId, entry.ref, h.id, text, h.text)}
					onrevert={() => clearBulletOverride(resume.id, sectionId, entry.ref, h.id)}
				/>
			{/each}
		</div>
	{/if}
</div>
