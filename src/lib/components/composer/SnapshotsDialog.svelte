<script lang="ts">
	import Pin from '@lucide/svelte/icons/pin';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import type { SnapshotMeta } from '$lib/core/schema/types';
	import { deleteSnapshot, getSnapshot, listSnapshots, updateSnapshot } from '$lib/store/snapshots';
	import { downloadBlob, downloadText, slugFilename } from '$lib/util/download';
	import { relativeTime } from '$lib/util/time';

	let {
		open = $bindable(false),
		resumeId,
		resumeName
	}: { open?: boolean; resumeId: string; resumeName: string } = $props();
	let list = $state<SnapshotMeta[]>([]);

	async function refresh() {
		list = await listSnapshots(resumeId);
	}
	$effect(() => {
		if (open) void refresh();
	});

	async function download(id: string, kind: 'pdf' | 'tex') {
		const s = await getSnapshot(id);
		if (!s) return;
		const stamp = s.createdAt.slice(0, 16).replace('T', '-').replace(':', '');
		if (kind === 'pdf')
			downloadBlob(
				slugFilename(`${resumeName}-${stamp}`, 'pdf'),
				new Blob([s.pdf as BlobPart], { type: 'application/pdf' })
			);
		else downloadText(slugFilename(`${resumeName}-${stamp}`, 'tex'), s.tex, 'application/x-tex');
	}
</script>

<Dialog
	bind:open
	title="Snapshots"
	description="Frozen copies of this resume's output. One is taken on every PDF download; the newest 20 unpinned are kept."
>
	{#if list.length === 0}
		<p class="text-sm text-muted">No snapshots yet. Download the PDF or choose "Save snapshot".</p>
	{:else}
		<ul class="divide-y divide-border">
			{#each list as s (s.id)}
				<li class="flex items-center gap-3 py-2">
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2 text-sm">
							<span>{new Date(s.createdAt).toLocaleString()}</span>
							<span class="text-xs text-faint">{relativeTime(s.createdAt)}</span>
							{#if s.pinned}<Badge tone="accent">pinned</Badge>{/if}
							<Badge tone={s.pages === 1 ? 'ok' : 'warn'}>{s.pages} p</Badge>
						</div>
						<input
							class="mt-0.5 w-full bg-transparent text-xs text-muted outline-none placeholder:text-faint"
							placeholder="Add a note (e.g. sent to Acme)"
							value={s.note ?? ''}
							onchange={(e) =>
								updateSnapshot(resumeId, s.id, {
									note: (e.currentTarget as HTMLInputElement).value
								})}
						/>
					</div>
					<Button size="sm" onclick={() => download(s.id, 'pdf')}>PDF</Button>
					<Button size="sm" onclick={() => download(s.id, 'tex')}>.tex</Button>
					<button
						type="button"
						class="p-1 {s.pinned ? 'text-accent' : 'text-faint hover:text-text'}"
						aria-label={s.pinned ? 'Unpin' : 'Pin'}
						onclick={async () => {
							await updateSnapshot(resumeId, s.id, { pinned: !s.pinned });
							await refresh();
						}}><Pin size={14} /></button
					>
					<button
						type="button"
						class="p-1 text-faint hover:text-danger"
						aria-label="Delete snapshot"
						onclick={async () => {
							await deleteSnapshot(resumeId, s.id);
							await refresh();
						}}><Trash2 size={14} /></button
					>
				</li>
			{/each}
		</ul>
	{/if}
</Dialog>
