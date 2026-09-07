<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		value = $bindable(''),
		label,
		hint,
		error,
		mono = false,
		class: cls = '',
		id = `f_${Math.random().toString(36).slice(2, 8)}`,
		...rest
	}: HTMLInputAttributes & {
		value?: string;
		label?: string;
		hint?: string;
		error?: string;
		mono?: boolean;
	} = $props();
</script>

<label class="block {cls}" for={id}>
	{#if label}
		<span class="mb-1 block text-xs font-medium text-muted">{label}</span>
	{/if}
	<input
		{id}
		bind:value
		class="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-text outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-accent)_25%,transparent)] {mono
			? 'font-mono'
			: ''} {error ? 'border-danger' : ''}"
		{...rest}
	/>
	{#if error}
		<span class="mt-1 block text-xs text-danger">{error}</span>
	{:else if hint}
		<span class="mt-1 block text-xs text-faint">{hint}</span>
	{/if}
</label>
