<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'sm' | 'md';

	let {
		variant = 'secondary',
		size = 'md',
		class: cls = '',
		children,
		...rest
	}: HTMLButtonAttributes & { variant?: Variant; size?: Size; children?: Snippet } = $props();

	const base =
		'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 select-none';
	const sizes: Record<Size, string> = {
		sm: 'h-7 px-2.5 text-[13px]',
		md: 'h-8 px-3 text-sm'
	};
	const variants: Record<Variant, string> = {
		primary: 'bg-accent text-accent-fg hover:brightness-110 active:brightness-95',
		secondary:
			'border border-border bg-surface text-text hover:bg-surface-2 active:bg-surface-2 shadow-[0_1px_0_rgb(0_0_0/0.03)]',
		ghost: 'text-muted hover:bg-surface-2 hover:text-text',
		danger: 'border border-danger/30 text-danger hover:bg-danger/10'
	};
</script>

<button type="button" class="{base} {sizes[size]} {variants[variant]} {cls}" {...rest}>
	{@render children?.()}
</button>
