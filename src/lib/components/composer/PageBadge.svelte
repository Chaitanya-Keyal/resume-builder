<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { compiles } from '$lib/store/compile.svelte';

	let { resumeId }: { resumeId: string } = $props();
	const s = $derived(compiles.state(resumeId));
</script>

{#if s.pages}
	<Badge tone={s.pages === 1 ? 'ok' : 'warn'}>
		<span aria-live="polite">{s.pages} page{s.pages === 1 ? '' : 's'}</span>
	</Badge>
{/if}
