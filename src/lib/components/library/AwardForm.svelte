<script lang="ts">
	import { syncId } from '$lib/store/library';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import type { Award } from '$lib/core/schema/types';
	import { workspace } from '$lib/store/workspace.svelte';
	import DateField from './DateField.svelte';

	let { award: a, onrename }: { award: Award; onrename?: (id: string) => void } = $props();
	const touch = () => workspace.touch('profile');
</script>

<div class="grid gap-3 sm:grid-cols-2">
	<TextField
		label="Title"
		bind:value={a.title}
		oninput={touch}
		onblur={() => onrename?.(syncId('awards', a.id, a.title))}
	/>
	<TextField label="Awarded by" bind:value={a.awarder} oninput={touch} />
	<TextField label="URL" mono bind:value={a.url} oninput={touch} />
	<div class="sm:col-span-2">
		<DateField single bind:end={a.date} bind:label={a.dateLabel} onchange={touch} />
	</div>
	<div class="sm:col-span-2">
		<TextArea
			label="Summary"
			rows={2}
			bind:value={a.summary}
			oninput={touch}
			hint="Printed as a bullet under the award."
		/>
	</div>
</div>
