<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';

	let {
		start = $bindable<string | undefined>(),
		end = $bindable<string | undefined>(),
		label = $bindable<string | undefined>(),
		single = false,
		onchange
	}: {
		start?: string;
		end?: string;
		label?: string;
		/** One date only (awards, certificates): uses `end`. */
		single?: boolean;
		onchange?: () => void;
	} = $props();

	// Writable derived: follows the data, but the checkbox can flip it ahead of the fields.
	let present = $derived(!single && !!start && !end);
	const ok = (v: string | undefined) => !v || /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v);
	const norm = (v: string) => v.trim() || undefined;
</script>

<div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
	{#if !single}
		<TextField
			label="Start"
			placeholder="2025-06"
			value={start ?? ''}
			error={ok(start) ? undefined : 'YYYY, YYYY-MM or YYYY-MM-DD'}
			oninput={(e) => {
				start = norm((e.currentTarget as HTMLInputElement).value);
				onchange?.();
			}}
		/>
	{/if}
	<TextField
		label={single ? 'Date' : 'End'}
		placeholder={single ? '2024-09' : present ? 'Present' : '2025-08'}
		value={end ?? ''}
		disabled={present}
		error={ok(end) ? undefined : 'YYYY, YYYY-MM or YYYY-MM-DD'}
		oninput={(e) => {
			end = norm((e.currentTarget as HTMLInputElement).value);
			onchange?.();
		}}
	/>
	{#if !single}
		<div class="flex items-end pb-1.5">
			<Checkbox
				checked={present}
				label="Present"
				onchange={(v) => {
					present = v;
					if (v) end = undefined;
					onchange?.();
				}}
			/>
		</div>
	{/if}
	<div class="sm:col-span-3">
		<TextField
			label="Printed as (optional)"
			placeholder="Summer 2025"
			hint="Wins over the dates when set. Leave empty to print the dates."
			value={label ?? ''}
			oninput={(e) => {
				label = norm((e.currentTarget as HTMLInputElement).value);
				onchange?.();
			}}
		/>
	</div>
</div>
