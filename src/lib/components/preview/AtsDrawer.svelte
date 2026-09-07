<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import type { ResolvedResume } from '$lib/core/resolve/types';
	import { atsReport, type AtsReport } from '$lib/pdf/text';
	import { closePdf, extractText, openPdf } from '$lib/pdf/viewer';
	import { compiles } from '$lib/store/compile.svelte';
	import { copyText } from '$lib/util/download';
	import { toast } from 'svelte-sonner';

	let {
		open = $bindable(false),
		resumeId,
		resolved
	}: { open?: boolean; resumeId: string; resolved: ResolvedResume } = $props();
	let report = $state<AtsReport | null>(null);
	let busy = $state(false);

	$effect(() => {
		if (!open) return;
		const bytes = compiles.state(resumeId).pdf;
		if (!bytes) {
			report = null;
			return;
		}
		busy = true;
		void (async () => {
			const d = await openPdf(bytes);
			const pages = await extractText(d);
			report = atsReport(pages, resolved);
			busy = false;
			void closePdf(d);
		})();
	});
	const icons = { ok: CircleCheck, warn: TriangleAlert, error: CircleAlert };
	const tones = { ok: 'text-ok', warn: 'text-warn', error: 'text-danger' };
</script>

<Dialog
	bind:open
	title="What a parser sees"
	description="The text a screening system extracts from your PDF, and a few checks on it."
	size="lg"
>
	{#if busy}
		<p class="text-sm text-muted">Extracting…</p>
	{:else if !report}
		<p class="text-sm text-muted">Compile the resume first.</p>
	{:else}
		<ul class="mb-3 space-y-1">
			{#each report.checks as c, i (i)}
				{@const Icon = icons[c.level]}
				<li class="flex items-start gap-2 text-sm">
					<Icon size={15} class="mt-0.5 shrink-0 {tones[c.level]}" />
					{c.message}
				</li>
			{/each}
		</ul>
		<pre
			class="max-h-[45vh] overflow-auto rounded-md bg-surface-2 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{report.text}</pre>
	{/if}
	{#snippet footer()}
		{#if report}
			<Button
				onclick={async () => {
					if (await copyText(report!.text)) toast.success('Copied');
				}}>Copy text</Button
			>
		{/if}
		<Button variant="primary" onclick={() => (open = false)}>Close</Button>
	{/snippet}
</Dialog>
