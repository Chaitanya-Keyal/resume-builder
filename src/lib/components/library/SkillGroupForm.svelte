<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import ChipsInput from '$lib/components/ui/ChipsInput.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import type { SkillGroup } from '$lib/core/schema/types';
	import { workspace } from '$lib/store/workspace.svelte';

	let { group: g }: { group: SkillGroup } = $props();
	const touch = () => workspace.touch('profile');
</script>

<div class="grid gap-3 sm:grid-cols-2">
	<TextField label="Category" placeholder="Languages" bind:value={g.name} oninput={touch} />
	<TextField label="Level (optional)" placeholder="Advanced" bind:value={g.level} oninput={touch} />
	<div class="sm:col-span-2">
		<ChipsInput
			label="Items"
			value={g.keywords}
			onchange={(v) => {
				g.keywords = v;
				touch();
			}}
			hint="Printed as 'Category: a, b, c' in this order. Drag to reorder."
		/>
	</div>
	{#if workspace.settings.website.enabled}
		<div class="sm:col-span-2">
			<Checkbox
				checked={!!g.x?.hidden}
				label="Hidden from your website"
				onchange={(v) => {
					g.x = { ...g.x, hidden: v || undefined };
					touch();
				}}
			/>
			<p class="mt-1 text-xs text-faint">
				Still available to resumes; a site reading profile.json skips this group.
			</p>
		</div>
	{/if}
</div>
