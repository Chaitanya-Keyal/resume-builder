<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { compiles } from '$lib/store/compile.svelte';

	let { resumeId, onclick }: { resumeId: string; onclick?: () => void } = $props();
	const s = $derived(compiles.state(resumeId));
</script>

{#if s.pages > 1 && onclick}
	<button type="button" {onclick} title="Fit to one page" class="rounded-full">
		<Badge tone="warn"><span aria-live="polite">{s.pages} pages - fit</span></Badge>
	</button>
{:else if s.pages}
	<Badge tone={s.pages === 1 ? 'ok' : 'warn'}>
		<span aria-live="polite">{s.pages} page{s.pages === 1 ? '' : 's'}</span>
	</Badge>
{/if}
