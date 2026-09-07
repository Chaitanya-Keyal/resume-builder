<script lang="ts">
	import { base } from '$app/paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import X from '@lucide/svelte/icons/x';
	import { ui } from '$lib/store/ui.svelte';
</script>

{#if ui.returnTo}
	<div
		class="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--color-accent)_25%,transparent)] bg-accent/10 px-4 py-1.5 text-sm text-accent"
	>
		<a href="{base}{ui.returnTo.href}" class="inline-flex items-center gap-2 font-medium">
			<ArrowLeft size={15} /> Back to {ui.returnTo.label}
		</a>
		<button
			type="button"
			class="rounded p-0.5 hover:bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)]"
			aria-label="Dismiss"
			onclick={() => (ui.returnTo = null)}><X size={14} /></button
		>
	</div>
{/if}
