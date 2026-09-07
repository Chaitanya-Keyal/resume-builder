<script lang="ts">
	import { Dialog } from 'bits-ui';
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		description,
		size = 'md',
		children,
		footer
	}: {
		open?: boolean;
		title: string;
		description?: string;
		size?: 'sm' | 'md' | 'lg';
		children?: Snippet;
		footer?: Snippet;
	} = $props();

	const widths = {
		sm: 'w-[min(92vw,24rem)]',
		md: 'w-[min(92vw,32rem)]',
		lg: 'w-[min(94vw,48rem)]'
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay
			class="data-[state=closed]:animate-out data-[state=open]:animate-in fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
		/>
		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-50 max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl border border-border bg-surface p-5 shadow-2xl outline-none {widths[
				size
			]}"
		>
			<div class="flex items-start justify-between gap-4">
				<div>
					<Dialog.Title class="text-base font-semibold">{title}</Dialog.Title>
					{#if description}
						<Dialog.Description class="mt-1 text-sm text-muted">{description}</Dialog.Description>
					{/if}
				</div>
				<Dialog.Close
					class="-mt-1 -mr-1 rounded-md p-1 text-muted hover:bg-surface-2 hover:text-text"
					aria-label="Close"><X size={16} /></Dialog.Close
				>
			</div>
			<div class="mt-4">{@render children?.()}</div>
			{#if footer}
				<div class="mt-5 flex justify-end gap-2">{@render footer()}</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
