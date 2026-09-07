<script lang="ts">
	import X from '@lucide/svelte/icons/x';

	let {
		value = $bindable<string[]>([]),
		label,
		placeholder = 'Type and press Enter',
		hint,
		onchange
	}: {
		value?: string[];
		label?: string;
		placeholder?: string;
		hint?: string;
		onchange?: (v: string[]) => void;
	} = $props();

	let draft = $state('');
	let input = $state<HTMLInputElement>();

	function commit() {
		const parts = draft
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		if (parts.length) {
			value = [...value, ...parts.filter((p) => !value.includes(p))];
			onchange?.(value);
		}
		draft = '';
	}
	function remove(i: number) {
		value = value.filter((_, j) => j !== i);
		onchange?.(value);
	}
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			commit();
		} else if (e.key === 'Backspace' && !draft && value.length) {
			remove(value.length - 1);
		}
	}
</script>

<div>
	{#if label}<span class="mb-1 block text-xs font-medium text-muted">{label}</span>{/if}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-1 focus-within:border-accent focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--color-accent)_25%,transparent)]"
		onclick={() => input?.focus()}
	>
		{#each value as chip, i (chip)}
			<span
				class="inline-flex h-6 items-center gap-1 rounded-md bg-surface-2 pr-1 pl-2 text-[13px]"
			>
				{chip}
				<button
					type="button"
					class="rounded p-0.5 text-muted hover:text-danger"
					aria-label="Remove {chip}"
					onclick={(e) => {
						e.stopPropagation();
						remove(i);
					}}><X size={12} /></button
				>
			</span>
		{/each}
		<input
			bind:this={input}
			bind:value={draft}
			{placeholder}
			onblur={commit}
			{onkeydown}
			class="h-6 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-faint"
		/>
	</div>
	{#if hint}<span class="mt-1 block text-xs text-faint">{hint}</span>{/if}
</div>
