<script lang="ts">
	import { base } from '$app/paths';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { getContext } from 'svelte';
	import type { LintHint } from '$lib/core/lint';
	import { dragHandle, dragHandleZone } from 'svelte-dnd-action';
	import { unhideAfterDrop } from '$lib/util/dnd';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import { toPlain } from '$lib/core/markup';
	import type { RefEntry } from '$lib/core/resolve/refs';
	import type { Highlight, ItemRef, Resume } from '$lib/core/schema/types';
	import {
		clearBulletOverride,
		moveBullet,
		moveItem,
		reorderBullets,
		setBulletOverride,
		setItemOverride,
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
	const lint = getContext<() => LintHint[]>('lint');
	const myHints = $derived(lint ? lint().filter((h) => h.key === entry.ref) : []);
	const warns = $derived(myHints.filter((h) => h.level === 'warn').length);
	const included = $derived(!!item);
	const libraryOrder = $derived(highlights.map((h) => h.id));
	const count = $derived(`${item?.bullets.length ?? 0}/${highlights.length}`);

	// Included bullets can be dragged; the rest follow in library order.
	let dnd = $derived((item?.bullets ?? []).map((id) => ({ id })));
	const byId = $derived(new Map(highlights.map((h) => [h.id, h])));
	const rest = $derived(highlights.filter((h) => !item?.bullets.includes(h.id)));
	const DND = $derived({
		type: `bullets:${entry.ref}`,
		flipDurationMs: 150,
		dropTargetStyle: {},
		dropTargetClasses: ['dnd-target']
	});

	const editHref = $derived(
		`${base}/library/${librarySection}?entry=${encodeURIComponent(entry.ref)}`
	);
	function remember() {
		ui.returnTo = { href: `/resumes/${resume.id}`, label: resume.name };
	}
</script>

<div class="border-t border-border first:border-t-0 {included ? '' : 'opacity-60'}">
	<div class="group flex items-center gap-2 px-3 py-1.5">
		{#if included}
			<span
				use:dragHandle
				class="-ml-1.5 cursor-grab text-faint hover:text-text active:cursor-grabbing"
				aria-label="Drag to reorder"
				title="Drag to reorder"><GripVertical size={14} /></span
			>
		{/if}
		<Checkbox
			checked={included}
			aria-label="{included ? 'Exclude' : 'Include'} {toPlain(entry.label)}"
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
			{#if myHints.length}
				<span
					class="ml-auto inline-flex shrink-0 items-center gap-0.5 text-xs {warns
						? 'text-warn'
						: 'text-faint'}"
					title={myHints.map((h) => h.message).join('\n')}
					><CircleAlert size={12} />{myHints.length}</span
				>
			{/if}
			{#if highlights.length}
				<span class="{myHints.length ? '' : 'ml-auto'} shrink-0 text-xs text-faint tabular-nums"
					>{count}</span
				>
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
	{#if open && (highlights.length || entry.description || entry.url || entry.entity)}
		<div class="pr-3 pb-2">
			{#if entry.entity}
				<div class="flex items-start gap-2 py-1 pl-9">
					<Checkbox
						checked={!!item?.overrides?.showEntity}
						disabled={!item}
						aria-label="Print the context"
						onchange={(v) => setItemOverride(resume.id, sectionId, entry.ref, { showEntity: v })}
					/>
					<div class="min-w-0">
						<span class="text-xs font-medium text-muted">Context</span>
						<p class="truncate text-xs text-faint">
							Prints "{toPlain(entry.label)} ({entry.entity})"
						</p>
					</div>
				</div>
			{/if}
			{#if entry.url}
				<div class="flex items-start gap-2 py-1 pl-9">
					<Checkbox
						checked={!!item?.overrides?.showUrl}
						disabled={!item}
						aria-label="Print the link"
						onchange={(v) => setItemOverride(resume.id, sectionId, entry.ref, { showUrl: v })}
					/>
					<div class="min-w-0">
						<span class="text-xs font-medium text-muted">Link</span>
						<p class="truncate text-xs text-faint" title={entry.url}>{entry.url}</p>
					</div>
				</div>
			{/if}
			{#if entry.description}
				<div class="flex items-start gap-2 py-1 pl-9">
					<Checkbox
						checked={!!item?.overrides?.showDescription}
						disabled={!item}
						aria-label="Print the description"
						onchange={(v) =>
							setItemOverride(resume.id, sectionId, entry.ref, { showDescription: v })}
					/>
					<div class="min-w-0">
						<span class="text-xs font-medium text-muted">Description</span>
						<p class="truncate text-xs text-faint" title={toPlain(entry.description)}>
							{toPlain(entry.description)}
						</p>
					</div>
				</div>
			{/if}
			<div
				use:dragHandleZone={{ items: dnd, ...DND }}
				onconsider={(e) => (dnd = e.detail.items)}
				onfinalize={(e) => {
					unhideAfterDrop(e);
					dnd = e.detail.items;
					reorderBullets(
						resume.id,
						sectionId,
						entry.ref,
						dnd.map((d) => d.id)
					);
				}}
			>
				{#each dnd as d, idx (d.id)}
					{@const h = byId.get(d.id)}
					{#if h}
						<div>
							<BulletRow
								highlight={h}
								hints={myHints.filter((x) => x.id === h.id)}
								included={true}
								override={item?.overrides?.bullets?.[h.id]}
								canMove={{ up: idx > 0, down: idx < dnd.length - 1 }}
								ontoggle={() => toggleBullet(resume.id, sectionId, entry.ref, h.id, libraryOrder)}
								onmove={(dir) => moveBullet(resume.id, sectionId, entry.ref, h.id, dir)}
								onoverride={(text) =>
									setBulletOverride(resume.id, sectionId, entry.ref, h.id, text, h.text)}
								onrevert={() => clearBulletOverride(resume.id, sectionId, entry.ref, h.id)}
							/>
						</div>
					{/if}
				{/each}
			</div>
			{#each rest as h (h.id)}
				<BulletRow
					highlight={h}
					included={false}
					override={item?.overrides?.bullets?.[h.id]}
					canMove={{ up: false, down: false }}
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
