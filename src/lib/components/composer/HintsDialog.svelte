<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Info from '@lucide/svelte/icons/info';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import type { LintHint } from '$lib/core/lint';
	import { listRefs } from '$lib/core/resolve/refs';
	import type { Profile } from '$lib/core/schema/types';

	let {
		open = $bindable(false),
		hints,
		profile
	}: { open?: boolean; hints: LintHint[]; profile: Profile } = $props();

	const labels = $derived(new Map(listRefs(profile).map((e) => [e.ref, e.label])));
	const general = $derived(hints.filter((h) => !h.key));
	const byKey = $derived.by(() => {
		const groups: [string, LintHint[]][] = [];
		for (const h of hints) {
			if (!h.key) continue;
			const g = groups.find(([k]) => k === h.key);
			if (g) g[1].push(h);
			else groups.push([h.key, [h]]);
		}
		return groups;
	});
</script>

<Dialog
	bind:open
	title="Hints"
	description="What a careful reviewer would say first. None of it is a rule."
	size="md"
>
	{#if !hints.length}
		<p class="text-sm text-muted">Nothing to flag.</p>
	{/if}
	{#if general.length}
		<ul class="space-y-1 text-sm">
			{#each general as h, i (i)}
				<li class="flex items-start gap-2">
					{#if h.level === 'warn'}<CircleAlert
							size={14}
							class="mt-0.5 shrink-0 text-warn"
						/>{:else}<Info size={14} class="mt-0.5 shrink-0 text-faint" />{/if}
					{h.message}
				</li>
			{/each}
		</ul>
	{/if}
	{#each byKey as [key, list] (key)}
		<div class="mt-3">
			<p class="text-xs font-medium text-muted">{labels.get(key) ?? key}</p>
			<ul class="mt-1 space-y-1 text-sm">
				{#each list as h, i (i)}
					<li class="flex items-start gap-2">
						{#if h.level === 'warn'}<CircleAlert
								size={14}
								class="mt-0.5 shrink-0 text-warn"
							/>{:else}<Info size={14} class="mt-0.5 shrink-0 text-faint" />{/if}
						<span class="min-w-0">
							{h.message}
							{#if h.snippet}<span class="block truncate text-xs text-faint">{h.snippet}</span>{/if}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
	{#snippet footer()}
		<Button variant="primary" onclick={() => (open = false)}>Close</Button>
	{/snippet}
</Dialog>
