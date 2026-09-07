<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Button from '$lib/components/ui/Button.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { formatRef } from '$lib/core/resolve/refs';
	import type { Engagement } from '$lib/core/schema/types';
	import { addPosition, removePosition, usedIn } from '$lib/store/library';
	import { workspace } from '$lib/store/workspace.svelte';
	import ExtrasFields from './ExtrasFields.svelte';
	import PositionForm from './PositionForm.svelte';

	let { engagement, collection }: { engagement: Engagement; collection: 'work' | 'volunteer' } =
		$props();
	const touch = () => workspace.touch('profile');
</script>

<div class="grid gap-3 sm:grid-cols-2">
	<TextField
		label={collection === 'work' ? 'Company' : 'Organisation'}
		bind:value={engagement.name}
		oninput={touch}
		hint="Markup works: Summer of Bitcoin ([SeedSigner](https://…))"
	/>
	<TextField
		label="Location"
		placeholder="Hyderabad, India"
		bind:value={engagement.location}
		oninput={touch}
	/>
	<TextField label="URL" placeholder="https://…" mono bind:value={engagement.url} oninput={touch} />
	<div class="sm:col-span-2">
		<TextArea
			label="Description (portfolio)"
			rows={2}
			bind:value={engagement.description}
			oninput={touch}
			hint="A paragraph for the portfolio page. Not printed on resumes."
		/>
	</div>
</div>

<div class="mt-4 space-y-3">
	<div class="flex items-center justify-between">
		<span class="text-xs font-medium text-muted"
			>Stints <span class="font-normal text-faint">· each is a separate entry on a resume</span
			></span
		>
		<Button size="sm" onclick={() => addPosition(collection, engagement.id)}
			><Plus size={13} /> Add another stint</Button
		>
	</div>
	{#each engagement.positions as pos (pos.id)}
		<PositionForm
			position={pos}
			ref={formatRef(collection, engagement.id, pos.id)}
			usedIn={usedIn(formatRef(collection, engagement.id, pos.id))}
			canDelete={engagement.positions.length > 1}
			ondelete={() => removePosition(collection, engagement.id, pos.id)}
		/>
	{/each}
</div>

<ExtrasFields bind:x={engagement.x} onchange={touch} />
