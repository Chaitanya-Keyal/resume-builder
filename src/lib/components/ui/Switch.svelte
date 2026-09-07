<script lang="ts">
	import { Switch } from 'bits-ui';

	let {
		checked = $bindable(false),
		label,
		description,
		disabled = false,
		onchange
	}: {
		checked?: boolean;
		label?: string;
		description?: string;
		disabled?: boolean;
		onchange?: (v: boolean) => void;
	} = $props();
</script>

<label class="flex cursor-pointer items-center gap-3 {disabled ? 'opacity-50' : ''}">
	<Switch.Root
		bind:checked
		{disabled}
		onCheckedChange={(v) => onchange?.(v)}
		class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-border-strong transition-colors data-[state=checked]:bg-accent"
	>
		<Switch.Thumb
			class="h-4 w-4 translate-x-0.5 rounded-full bg-surface shadow transition-transform data-[state=checked]:translate-x-[18px]"
		/>
	</Switch.Root>
	{#if label}
		<span class="text-sm">
			{label}
			{#if description}<span class="block text-xs text-muted">{description}</span>{/if}
		</span>
	{/if}
</label>
