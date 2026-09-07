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
			hint="Printed as “Category: a, b, c”. Order matters."
		/>
	</div>
	<div class="flex flex-wrap gap-4 sm:col-span-2">
		<Checkbox
			checked={!!g.x?.hidden}
			label="Hidden from the portfolio"
			onchange={(v) => {
				g.x = { ...g.x, hidden: v || undefined };
				touch();
			}}
		/>
		<TextField
			placeholder="portfolio key (optional)"
			mono
			value={(g.x?.key as string | undefined) ?? ''}
			oninput={(e) => {
				g.x = { ...g.x, key: (e.currentTarget as HTMLInputElement).value || undefined };
				touch();
			}}
			class="w-52"
		/>
	</div>
</div>
