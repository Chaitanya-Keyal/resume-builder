<script lang="ts">
	let { keys }: { keys: string } = $props();
	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
	const parts = $derived(
		keys.split('+').map((k) => (k === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : k === 'Shift' ? '⇧' : k))
	);
</script>

<span class="inline-flex gap-0.5">
	{#each parts as p, i (i)}
		<kbd
			class="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[11px] text-muted"
			>{p}</kbd
		>
	{/each}
</span>
