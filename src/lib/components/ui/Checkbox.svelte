<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';

	let {
		checked = $bindable(false),
		indeterminate = false,
		label,
		disabled = false,
		onchange
	}: {
		checked?: boolean;
		indeterminate?: boolean;
		label?: string;
		disabled?: boolean;
		onchange?: (v: boolean) => void;
	} = $props();
</script>

<label
	class="inline-flex items-center gap-2 {disabled
		? 'cursor-not-allowed opacity-50'
		: 'cursor-pointer'}"
>
	<span class="relative inline-flex h-4 w-4 shrink-0">
		<input
			type="checkbox"
			bind:checked
			{indeterminate}
			{disabled}
			onchange={(e) => onchange?.((e.currentTarget as HTMLInputElement).checked)}
			class="peer absolute inset-0 h-4 w-4 cursor-pointer appearance-none rounded-[4px] border border-border-strong bg-surface transition-colors checked:border-accent checked:bg-accent indeterminate:border-accent indeterminate:bg-accent disabled:cursor-not-allowed"
		/>
		<span
			class="pointer-events-none absolute inset-0 hidden items-center justify-center text-accent-fg peer-checked:flex"
			><Check size={12} strokeWidth={3} /></span
		>
		<span
			class="pointer-events-none absolute inset-0 hidden items-center justify-center text-accent-fg peer-indeterminate:flex"
			><Minus size={12} strokeWidth={3} /></span
		>
	</span>
	{#if label}<span class="text-sm">{label}</span>{/if}
</label>
