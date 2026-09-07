<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let {
		value = $bindable(''),
		options,
		label,
		class: cls = '',
		onchange
	}: {
		value?: string;
		options: { value: string; label: string }[];
		label?: string;
		class?: string;
		onchange?: (v: string) => void;
	} = $props();
</script>

<label class="block {cls}">
	{#if label}<span class="mb-1 block text-xs font-medium text-muted">{label}</span>{/if}
	<span class="relative block">
		<select
			bind:value
			onchange={(e) => onchange?.((e.currentTarget as HTMLSelectElement).value)}
			class="h-8 w-full appearance-none rounded-md border border-border bg-surface pr-8 pl-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-accent)_25%,transparent)]"
		>
			{#each options as o (o.value)}
				<option value={o.value}>{o.label}</option>
			{/each}
		</select>
		<span class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted"
			><ChevronDown size={14} /></span
		>
	</span>
</label>
