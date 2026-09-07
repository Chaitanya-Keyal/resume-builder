<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Menu from '$lib/components/ui/Menu.svelte';
	import { getTemplate } from '$lib/core/latex';
	import { fullSection } from '$lib/core/resolve/compose';
	import type { Profile, Resume } from '$lib/core/schema/types';
	import { addSection, missingSectionTypes } from '$lib/store/composer';
	import HeaderBlock from './HeaderBlock.svelte';
	import OptionsBlock from './OptionsBlock.svelte';
	import SectionBlock from './SectionBlock.svelte';

	let { resume, profile }: { resume: Resume; profile: Profile } = $props();
	const missing = $derived(missingSectionTypes(resume));
	const t = $derived(getTemplate(resume.template));
</script>

<div class="space-y-3 p-3 md:p-4">
	<HeaderBlock {resume} {profile} />
	{#each resume.sections as section, i (section.id)}
		<SectionBlock
			{resume}
			{section}
			{profile}
			canMove={{ up: i > 0, down: i < resume.sections.length - 1 }}
		/>
	{/each}
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
	<OptionsBlock {resume} />
</div>
