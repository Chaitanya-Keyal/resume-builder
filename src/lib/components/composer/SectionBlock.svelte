<script lang="ts">
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Menu from '$lib/components/ui/Menu.svelte';
	import { sectionTitle } from '$lib/core/resolve/compose';
	import { listRefs } from '$lib/core/resolve/refs';
	import { isItemRef } from '$lib/core/resolve/resolve';
	import type { ItemRef, Profile, Resume, Section } from '$lib/core/schema/types';
	import { highlightsOf, moveSection, removeSection, setSectionTitle } from '$lib/store/composer';
	import EntryRow from './EntryRow.svelte';

	let {
		resume,
		section,
		profile,
		canMove
	}: {
		resume: Resume;
		section: Section;
		profile: Profile;
		canMove: { up: boolean; down: boolean };
	} = $props();

	const LIBRARY_SECTION: Record<string, string> = {
		work: 'work',
		volunteer: 'leadership',
		education: 'education',
		projects: 'projects',
		skills: 'skills',
		awards: 'awards',
		certificates: 'more',
		publications: 'more',
		languages: 'more',
		interests: 'more'
	};

	const title = $derived(sectionTitle(resume, section));
	const library = $derived(section.type === 'custom' ? [] : listRefs(profile, section.type));
	const refItems = $derived(section.items.filter(isItemRef));
	/** Included entries in resume order, then the rest of the library, dimmed. */
	const rows = $derived.by(() => {
		const byRef = new Map(library.map((e) => [e.ref, e]));
		const included = refItems.flatMap((it) => {
			const e = byRef.get(it.ref);
			return e ? [{ entry: e, item: it as ItemRef }] : [];
		});
		const rest = library
			.filter((e) => !refItems.some((it) => it.ref === e.ref))
			.map((e) => ({ entry: e, item: undefined }));
		return [...included, ...rest];
	});

	let editingTitle = $state(false);
	let draft = $state('');
</script>

<section class="rounded-lg border border-border bg-surface">
	<div class="flex items-center gap-2 px-3 py-2">
		{#if editingTitle}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="h-7 rounded-md border border-accent bg-surface px-2 text-sm font-semibold outline-none"
				bind:value={draft}
				autofocus
				onblur={() => {
					editingTitle = false;
					setSectionTitle(resume.id, section.id, draft);
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
					if (e.key === 'Escape') editingTitle = false;
				}}
			/>
		{:else}
			<button
				type="button"
				class="-ml-1 rounded-md px-1 text-sm font-semibold hover:bg-surface-2"
				title="Rename section"
				onclick={() => {
					draft = title;
					editingTitle = true;
				}}>{title}</button
			>
		{/if}
		<span class="text-xs text-faint">{refItems.length} of {library.length}</span>
		<span class="flex-1"></span>
		<button
			type="button"
			class="p-0.5 text-faint hover:text-text disabled:opacity-30"
			aria-label="Move section up"
			disabled={!canMove.up}
			onclick={() => moveSection(resume.id, section.id, -1)}><ArrowUp size={14} /></button
		>
		<button
			type="button"
			class="p-0.5 text-faint hover:text-text disabled:opacity-30"
			aria-label="Move section down"
			disabled={!canMove.down}
			onclick={() => moveSection(resume.id, section.id, 1)}><ArrowDown size={14} /></button
		>
		<Menu
			triggerClass="text-faint hover:bg-surface-2 hover:text-text flex h-7 w-7 items-center justify-center rounded-md"
			items={[
				{
					label: 'Remove section from this resume',
					icon: Trash2,
					danger: true,
					onSelect: () => removeSection(resume.id, section.id)
				}
			]}
		>
			{#snippet trigger()}<Ellipsis size={15} />{/snippet}
		</Menu>
	</div>
	<div class="border-t border-border">
		{#if rows.length === 0}
			<p class="px-3 py-3 text-xs text-faint">Nothing in the library for this section yet.</p>
		{/if}
		{#each rows as row, i (row.entry.ref)}
			<EntryRow
				{resume}
				sectionId={section.id}
				entry={row.entry}
				item={row.item}
				highlights={highlightsOf(profile, row.entry.ref)}
				librarySection={LIBRARY_SECTION[section.type] ?? 'more'}
				canMove={{ up: !!row.item && i > 0, down: !!row.item && i < refItems.length - 1 }}
			/>
		{/each}
	</div>
</section>
