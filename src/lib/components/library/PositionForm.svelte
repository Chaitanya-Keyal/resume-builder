<script lang="ts">
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import type { Position } from '$lib/core/schema/types';
	import { syncRemovedHighlights } from '$lib/store/library';
	import { workspace } from '$lib/store/workspace.svelte';
	import BulletList from './BulletList.svelte';
	import DateField from './DateField.svelte';

	let {
		position,
		ref,
		usedIn,
		canDelete,
		ondelete
	}: { position: Position; ref: string; usedIn: number; canDelete: boolean; ondelete: () => void } =
		$props();
	const touch = () => workspace.touch('profile');
</script>

<div class="rounded-md border border-border bg-surface-2/40 p-3">
	<div class="mb-3 flex items-center justify-between">
		<span class="text-xs font-medium text-muted"
			>Stint <span class="font-mono">{position.id}</span>{#if usedIn}
				· in {usedIn} resume{usedIn === 1 ? '' : 's'}{/if}</span
		>
		{#if canDelete}
			<button
				type="button"
				class="inline-flex items-center gap-1 text-xs text-faint hover:text-danger"
				onclick={ondelete}><Trash2 size={12} /> Remove stint</button
			>
		{/if}
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<TextField
			label="Title"
			placeholder="Software Engineering Intern"
			bind:value={position.position}
			oninput={touch}
		/>
		<TextField
			label="Location (this stint)"
			placeholder="Remote"
			bind:value={position.location}
			oninput={touch}
			hint="Leave empty to use the organisation's location."
		/>
		<div class="sm:col-span-2">
			<DateField
				bind:start={position.startDate}
				bind:end={position.endDate}
				bind:label={position.dateLabel}
				onchange={touch}
			/>
		</div>
		<div class="sm:col-span-2">
			<TextArea
				label="Summary (optional)"
				rows={2}
				bind:value={position.summary}
				oninput={touch}
				hint="Not printed by the default template."
			/>
		</div>
		<div class="sm:col-span-2">
			<BulletList
				highlights={position.highlights}
				onchange={(next) => {
					syncRemovedHighlights(ref, position.highlights, next);
					position.highlights = next;
					touch();
				}}
			/>
		</div>
	</div>
</div>
