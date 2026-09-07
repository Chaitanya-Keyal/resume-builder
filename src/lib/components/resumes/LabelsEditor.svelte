<script lang="ts">
	import ChipsInput from '$lib/components/ui/ChipsInput.svelte';
	import { workspace } from '$lib/store/workspace.svelte';

	let {
		value = $bindable<string[]>([]),
		label = 'Labels',
		onchange
	}: { value?: string[]; label?: string; onchange?: (v: string[]) => void } = $props();

	const suggestions = $derived(workspace.labels.filter((l) => !value.includes(l)));
</script>

<div>
	<ChipsInput bind:value {label} placeholder="backend, intern-2027..." {onchange} />
	{#if suggestions.length}
		<div class="mt-1.5 flex flex-wrap gap-1">
			{#each suggestions as s (s)}
				<button
					type="button"
					class="rounded-md px-1.5 py-0.5 text-xs text-muted hover:bg-surface-2 hover:text-text"
					onclick={() => {
						value = [...value, s];
						onchange?.(value);
					}}>+ {s}</button
				>
			{/each}
		</div>
	{/if}
</div>
