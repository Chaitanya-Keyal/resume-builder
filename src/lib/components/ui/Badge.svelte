<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		tone = 'neutral',
		class: cls = '',
		children
	}: {
		tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'accent';
		class?: string;
		children?: Snippet;
	} = $props();
	const tones = {
		neutral: 'bg-surface-2 text-muted',
		ok: 'bg-ok/15 text-ok',
		warn: 'bg-warn/15 text-warn',
		danger: 'bg-danger/15 text-danger',
		accent: 'bg-accent/15 text-accent'
	};
</script>

<span
	class="inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap {tones[
		tone
	]} {cls}">{@render children?.()}</span
>
