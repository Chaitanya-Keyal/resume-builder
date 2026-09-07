<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { compiles } from '$lib/store/compile.svelte';

	let {
		open = $bindable(false),
		resumeId,
		ondownloadtex
	}: { open?: boolean; resumeId: string; ondownloadtex: () => void } = $props();
	const s = $derived(compiles.state(resumeId));
</script>

<Dialog bind:open title="Compile log" size="lg">
	{#if s.errors.length}
		<div class="mb-3 rounded-md border border-danger/30 bg-danger/5 p-3">
			<p class="mb-1 text-xs font-medium text-danger">What went wrong</p>
			<pre class="font-mono text-xs whitespace-pre-wrap">{s.errors.join('\n')}</pre>
		</div>
	{/if}
	{#if compiles.engineError}
		<p class="mb-3 text-sm text-danger">{compiles.engineError}</p>
	{/if}
	<pre
		class="max-h-[50vh] overflow-auto rounded-md bg-surface-2 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{s.log ||
			'No log yet.'}</pre>
	{#snippet footer()}
		<Button onclick={ondownloadtex}>Download .tex</Button>
		<Button variant="primary" onclick={() => (open = false)}>Close</Button>
	{/snippet}
</Dialog>
