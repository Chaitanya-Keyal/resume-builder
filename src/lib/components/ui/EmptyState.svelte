<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, body, children }: { title: string; body?: string; children?: Snippet } = $props();
</script>

<div
	class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong px-6 py-10 text-center text-muted"
>
	<p class="text-sm font-medium text-text">{title}</p>
	{#if body}<p class="max-w-md text-sm">{body}</p>{/if}
	{#if children}<div class="mt-1 flex flex-wrap justify-center gap-2">
			{@render children()}
		</div>{/if}
</div>
