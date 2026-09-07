<script lang="ts">
	import ChipsInput from '$lib/components/ui/ChipsInput.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import type { Education } from '$lib/core/schema/types';
	import { syncRemovedHighlights } from '$lib/store/library';
	import { workspace } from '$lib/store/workspace.svelte';
	import BulletList from './BulletList.svelte';
	import DateField from './DateField.svelte';
	import ExtrasFields from './ExtrasFields.svelte';

	let { education: e }: { education: Education } = $props();
	const touch = () => workspace.touch('profile');
	function setX(k: string, v: string) {
		e.x = { ...e.x, [k]: v || undefined };
		touch();
	}
</script>

<div class="grid gap-3 sm:grid-cols-2">
	<TextField label="Institution" bind:value={e.institution} oninput={touch} />
	<TextField
		label="Location"
		placeholder="Hyderabad, India"
		bind:value={e.location}
		oninput={touch}
	/>
	<TextField label="Degree type" placeholder="B.E." bind:value={e.studyType} oninput={touch} />
	<TextField label="Field" placeholder="Computer Science" bind:value={e.area} oninput={touch} />
	<div class="sm:col-span-2">
		<TextField
			label="Degree line (printed)"
			placeholder="B.E. Computer Science, M.Sc. Mathematics, Minor in Data Science"
			value={e.x?.degreeLine ?? ''}
			oninput={(ev) => setX('degreeLine', (ev.currentTarget as HTMLInputElement).value)}
			hint="Overrides degree type and field on the resume when set."
		/>
	</div>
	<TextField label="Score" placeholder="8.9/10" bind:value={e.score} oninput={touch} />
	<TextField label="URL" mono bind:value={e.url} oninput={touch} />
	<div class="sm:col-span-2">
		<DateField
			bind:start={e.startDate}
			bind:end={e.endDate}
			bind:label={e.dateLabel}
			onchange={touch}
		/>
	</div>
	<div class="sm:col-span-2">
		<ChipsInput
			label="Coursework"
			value={e.courses}
			onchange={(v) => {
				e.courses = v;
				touch();
			}}
		/>
	</div>
	<div class="sm:col-span-2">
		<BulletList
			label="Bullets (optional)"
			highlights={e.highlights}
			onchange={(next) => {
				syncRemovedHighlights(`education:${e.id}`, e.highlights, next);
				e.highlights = next;
				touch();
			}}
		/>
	</div>
	<TextField
		label="Short institution name"
		placeholder="BITS Pilani, Hyderabad Campus"
		value={e.x?.institutionShort ?? ''}
		oninput={(ev) => setX('institutionShort', (ev.currentTarget as HTMLInputElement).value)}
	/>
	<TextField
		label="Minor"
		value={e.x?.minor ?? ''}
		oninput={(ev) => setX('minor', (ev.currentTarget as HTMLInputElement).value)}
	/>
</div>
<ExtrasFields bind:x={e.x} showStack={false} showPeriod={false} onchange={touch} />
