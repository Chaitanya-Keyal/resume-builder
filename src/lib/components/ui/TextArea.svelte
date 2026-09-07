<script lang="ts">
	import { markupKeys } from '$lib/util/markup-keys';
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	let {
		value = $bindable(),
		label,
		hint,
		rows = 2,
		class: cls = '',
		id = `t_${Math.random().toString(36).slice(2, 8)}`,
		...rest
	}: HTMLTextareaAttributes & { value?: string; label?: string; hint?: string } = $props();

	let el = $state<HTMLTextAreaElement>();
	function grow() {
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight}px`;
	}
	$effect(() => {
		void value;
		grow();
	});
</script>

<label class="block {cls}" for={id}>
	{#if label}
		<span class="mb-1 block text-xs font-medium text-muted">{label}</span>
	{/if}
	<textarea
		use:markupKeys
		{id}
		bind:this={el}
		bind:value
		{rows}
		oninput={grow}
		class="block w-full resize-none rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm leading-relaxed text-text outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-accent)_25%,transparent)]"
		{...rest}></textarea>
	{#if hint}
		<span class="mt-1 block text-xs text-faint">{hint}</span>
	{/if}
</label>
