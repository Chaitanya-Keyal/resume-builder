<script lang="ts">
	import { Select } from 'bits-ui';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let {
		value = $bindable(''),
		options,
		label,
		class: cls = '',
		onchange
	}: {
		value?: string;
		options: { value: string; label: string }[];
		label?: string;
		class?: string;
		onchange?: (v: string) => void;
	} = $props();

	const current = $derived(options.find((o) => o.value === value)?.label ?? '');
</script>

<div class={cls}>
	{#if label}<span class="mb-1 block text-xs font-medium text-muted">{label}</span>{/if}
	<Select.Root
		type="single"
		bind:value
		onValueChange={(v) => {
			if (v !== undefined) onchange?.(v);
		}}
	>
		<Select.Trigger
			class="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface pr-2 pl-2.5 text-left text-sm outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-accent)_25%,transparent)] data-[state=open]:border-accent"
		>
			<span class="truncate">{current}</span>
			<ChevronDown size={14} class="shrink-0 text-muted" />
		</Select.Trigger>
		<Select.Portal>
			<Select.Content
				sideOffset={4}
				class="z-50 max-h-72 min-w-[var(--bits-select-anchor-width)] overflow-auto rounded-lg border border-border bg-surface p-1 shadow-xl outline-none"
			>
				<Select.Viewport>
					{#each options as o (o.value)}
						<Select.Item
							value={o.value}
							label={o.label}
							class="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-surface-2"
						>
							{#snippet children({ selected })}
								<span>{o.label}</span>
								{#if selected}<Check size={14} class="text-accent" />{/if}
							{/snippet}
						</Select.Item>
					{/each}
				</Select.Viewport>
			</Select.Content>
		</Select.Portal>
	</Select.Root>
</div>
