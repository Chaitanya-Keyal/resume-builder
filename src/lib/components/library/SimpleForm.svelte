<script lang="ts">
	import ChipsInput from '$lib/components/ui/ChipsInput.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import type { Certificate, Interest, Language, Publication } from '$lib/core/schema/types';
	import { workspace } from '$lib/store/workspace.svelte';
	import DateField from './DateField.svelte';

	export type SimpleEntry =
		| { kind: 'certificates'; item: Certificate }
		| { kind: 'publications'; item: Publication }
		| { kind: 'languages'; item: Language }
		| { kind: 'interests'; item: Interest };

	let { entry }: { entry: SimpleEntry } = $props();
	const touch = () => workspace.touch('profile');
</script>

<div class="grid gap-3 sm:grid-cols-2">
	{#if entry.kind === 'certificates'}
		<TextField label="Name" bind:value={entry.item.name} oninput={touch} />
		<TextField label="Issuer" bind:value={entry.item.issuer} oninput={touch} />
		<TextField label="URL" mono bind:value={entry.item.url} oninput={touch} />
		<div class="sm:col-span-2">
			<DateField
				single
				bind:end={entry.item.date}
				bind:label={entry.item.dateLabel}
				onchange={touch}
			/>
		</div>
	{:else if entry.kind === 'publications'}
		<TextField label="Title" bind:value={entry.item.name} oninput={touch} />
		<TextField label="Publisher" bind:value={entry.item.publisher} oninput={touch} />
		<TextField label="URL" mono bind:value={entry.item.url} oninput={touch} />
		<div class="sm:col-span-2">
			<DateField
				single
				bind:end={entry.item.releaseDate}
				bind:label={entry.item.dateLabel}
				onchange={touch}
			/>
		</div>
		<div class="sm:col-span-2">
			<TextArea label="Summary" rows={2} bind:value={entry.item.summary} oninput={touch} />
		</div>
	{:else if entry.kind === 'languages'}
		<TextField label="Language" bind:value={entry.item.language} oninput={touch} />
		<TextField
			label="Fluency"
			placeholder="Native, Fluent, Working"
			bind:value={entry.item.fluency}
			oninput={touch}
		/>
	{:else}
		<TextField label="Interest" bind:value={entry.item.name} oninput={touch} />
		<div class="sm:col-span-2">
			<ChipsInput
				label="Keywords"
				value={entry.item.keywords}
				onchange={(v) => {
					if (entry.kind === 'interests') entry.item.keywords = v;
					touch();
				}}
			/>
		</div>
	{/if}
</div>
