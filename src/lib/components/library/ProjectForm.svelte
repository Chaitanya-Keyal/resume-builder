<script lang="ts">
	import ChipsInput from '$lib/components/ui/ChipsInput.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import type { Project } from '$lib/core/schema/types';
	import { syncRemovedHighlights } from '$lib/store/library';
	import { workspace } from '$lib/store/workspace.svelte';
	import BulletList from './BulletList.svelte';
	import DateField from './DateField.svelte';
	import ExtrasFields from './ExtrasFields.svelte';

	let { project: p }: { project: Project } = $props();
	const touch = () => workspace.touch('profile');
</script>

<div class="grid gap-3 sm:grid-cols-2">
	<TextField label="Name" bind:value={p.name} oninput={touch} />
	<TextField
		label="Context"
		placeholder="Synchrony Hackathon"
		bind:value={p.entity}
		oninput={touch}
		hint="Printed in parentheses after the name."
	/>
	<div class="sm:col-span-2">
		<ChipsInput
			label="Stack"
			value={p.keywords}
			onchange={(v) => {
				p.keywords = v;
				touch();
			}}
			hint="Printed after the name: Name | Python, Go"
		/>
	</div>
	<TextField
		label="URL"
		placeholder="https://github.com/..."
		mono
		bind:value={p.url}
		oninput={touch}
	/>
	<TextField
		label="Type"
		placeholder="application, library, talk..."
		bind:value={p.type}
		oninput={touch}
	/>
	<div class="sm:col-span-2">
		<DateField
			bind:start={p.startDate}
			bind:end={p.endDate}
			bind:label={p.dateLabel}
			onchange={touch}
		/>
	</div>
	<div class="sm:col-span-2">
		<TextArea
			label="Description"
			rows={2}
			bind:value={p.description}
			oninput={touch}
			hint="A short paragraph about the project. Not printed on resumes."
		/>
	</div>
	<div class="sm:col-span-2">
		<BulletList
			highlights={p.highlights}
			onchange={(next) => {
				syncRemovedHighlights(`projects:${p.id}`, p.highlights, next);
				p.highlights = next;
				touch();
			}}
		/>
	</div>
</div>
<ExtrasFields bind:x={p.x} showStack={false} onchange={touch} />
