<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	let {
		label,
		active = false,
		size = 'md',
		class: cls = '',
		children,
		...rest
	}: HTMLButtonAttributes & {
		label: string;
		active?: boolean;
		size?: 'sm' | 'md';
		children?: Snippet;
	} = $props();
</script>

<button
	type="button"
	aria-label={label}
	title={label}
	class="inline-flex shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 {size ===
	'sm'
		? 'h-6 w-6'
		: 'h-8 w-8'} {active
		? 'bg-surface-2 text-text'
		: 'text-muted hover:bg-surface-2 hover:text-text'} {cls}"
	{...rest}
>
	{@render children?.()}
</button>
