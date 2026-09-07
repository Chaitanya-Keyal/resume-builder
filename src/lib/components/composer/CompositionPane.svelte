<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import { dragHandleZone } from 'svelte-dnd-action';
	import Menu from '$lib/components/ui/Menu.svelte';
	import { getTemplate } from '$lib/core/latex';
	import { fullSection } from '$lib/core/resolve/compose';
	import type { Profile, Resume } from '$lib/core/schema/types';
	import { addSection, missingSectionTypes, reorderSections } from '$lib/store/composer';
	import HeaderBlock from './HeaderBlock.svelte';
	import OptionsBlock from './OptionsBlock.svelte';
	import SectionBlock from './SectionBlock.svelte';

	let { resume, profile, onfit }: { resume: Resume; profile: Profile; onfit?: () => void } =
		$props();
	const missing = $derived(missingSectionTypes(resume));
	const t = $derived(getTemplate(resume.template));

	// Drag and drop works on a local copy that the library reorders while dragging.
	let dnd = $derived(resume.sections.map((s) => ({ id: s.id })));
	// Each level is its own zone type, so a section can never be dropped into an entry list.
	const DND = {
		type: 'sections',
		flipDurationMs: 150,
		dropTargetStyle: {},
		dropTargetClasses: ['dnd-target']
	};
</script>

<div class="space-y-3 p-3 md:p-4">
	<HeaderBlock {resume} {profile} />
	<div
		class="space-y-3"
		use:dragHandleZone={{ items: dnd, ...DND }}
		onconsider={(e) => (dnd = e.detail.items)}
		onfinalize={(e) => {
			dnd = e.detail.items;
			reorderSections(
				resume.id,
				dnd.map((d) => d.id)
			);
		}}
	>
		{#each dnd as d, i (d.id)}
			{@const section = resume.sections.find((s) => s.id === d.id)}
			{#if section}
				<div>
					<SectionBlock
						{resume}
						{section}
						{profile}
						canMove={{ up: i > 0, down: i < resume.sections.length - 1 }}
					/>
				</div>
			{/if}
		{/each}
	</div>
	{#if missing.length}
		<Menu
			align="start"
			triggerClass="border-border-strong text-muted hover:bg-surface-2 hover:text-text flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm"
			items={missing.map((type) => ({
				label: t.sectionTitles[type] ?? type,
				onSelect: () => {
					if (type === 'custom') return;
					const s = fullSection(profile, type);
					addSection(resume.id, type, s.items as never);
				}
			}))}
		>
			{#snippet trigger()}<Plus size={15} /> Add section{/snippet}
		</Menu>
	{/if}
	<OptionsBlock {resume} {onfit} />
</div>
