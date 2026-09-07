<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import type { Component, Snippet } from 'svelte';

	export interface MenuItem {
		label?: string;
		icon?: Component<{ size?: number | string }>;
		onSelect?: () => void;
		danger?: boolean;
		disabled?: boolean;
		hint?: string;
		separator?: boolean;
	}

	let {
		items,
		trigger,
		align = 'end',
		triggerClass = ''
	}: {
		items: MenuItem[];
		trigger: Snippet;
		align?: 'start' | 'end' | 'center';
		triggerClass?: string;
	} = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class={triggerClass}>{@render trigger()}</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			{align}
			sideOffset={4}
			class="z-50 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-xl outline-none"
		>
			{#each items as it, i (i)}
				{#if it.separator}
					<DropdownMenu.Separator class="my-1 h-px bg-border" />
				{:else}
					<DropdownMenu.Item
						disabled={it.disabled}
						onSelect={() => it.onSelect?.()}
						title={it.hint}
						class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-surface-2 {it.danger
							? 'text-danger'
							: ''}"
					>
						{#if it.icon}
							<it.icon size={15} />
						{/if}
						<span class="flex-1">{it.label}</span>
					</DropdownMenu.Item>
				{/if}
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
