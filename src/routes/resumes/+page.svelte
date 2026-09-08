<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import { toast } from 'svelte-sonner';
	import NewResumeDialog from '$lib/components/resumes/NewResumeDialog.svelte';
	import ResumeCard from '$lib/components/resumes/ResumeCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { compiles } from '$lib/store/compile.svelte';
	import { deleteAllSnapshots } from '$lib/store/snapshots';
	import { workspace } from '$lib/store/workspace.svelte';
	import { dbDel, KEYS } from '$lib/store/db';

	let creating = $state(false);
	let filter = $state<string | null>(null);
	let renaming = $state<{ id: string; name: string } | null>(null);
	let deleting = $state<string | null>(null);

	const visible = $derived(
		[...workspace.resumes]
			.filter((r) => !filter || r.labels.includes(filter))
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
	);

	$effect(() => {
		for (const r of workspace.resumes) void compiles.restore(r.id);
	});

	function rename() {
		if (!renaming) return;
		const { id, name } = renaming;
		workspace.mutateResume(id, (r) => (r.name = name.trim() || r.name));
		renaming = null;
	}

	async function remove() {
		if (!deleting) return;
		const id = deleting;
		deleting = null;
		workspace.deleteResume(id);
		compiles.dispose(id);
		await deleteAllSnapshots(id);
		await dbDel(KEYS.artifact(id));
		toast.success('Resume deleted', { action: { label: 'Undo', onClick: () => workspace.undo() } });
	}
</script>

<div class="mx-auto max-w-5xl p-5 md:p-8">
	<div class="mb-6 flex items-center justify-between gap-4">
		<div>
			<h1 class="text-xl font-semibold tracking-tight">Resumes</h1>
			<p class="text-sm text-muted">
				Compositions over your library. Each one is a different pick of the same facts.
			</p>
		</div>
		<Button variant="primary" onclick={() => (creating = true)}
			><Plus size={15} /> New resume</Button
		>
	</div>

	{#if workspace.labels.length}
		<div class="mb-4 flex flex-wrap gap-1.5">
			<button
				type="button"
				class="rounded-md px-2 py-1 text-xs font-medium {filter === null
					? 'bg-surface-2 text-text'
					: 'text-muted hover:text-text'}"
				onclick={() => (filter = null)}>All</button
			>
			{#each workspace.labels as l (l)}
				<button
					type="button"
					class="rounded-md px-2 py-1 text-xs font-medium {filter === l
						? 'bg-accent/15 text-accent'
						: 'text-muted hover:text-text'}"
					onclick={() => (filter = filter === l ? null : l)}>{l}</button
				>
			{/each}
		</div>
	{/if}

	{#if visible.length === 0}
		<EmptyState
			title={workspace.resumes.length ? 'Nothing with that label' : 'No resumes yet'}
			body={workspace.resumes.length
				? undefined
				: 'A resume is a selection from your library: which jobs, which projects, which bullets. Make the first one and the PDF appears on the right.'}
		>
			<Button variant="primary" onclick={() => (creating = true)}
				><Plus size={15} /> New resume</Button
			>
		</EmptyState>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each visible as r (r.id)}
				<ResumeCard
					resume={r}
					onrename={() => (renaming = { id: r.id, name: r.name })}
					onduplicate={() => {
						workspace.duplicateResume(r.id);
						toast.success('Duplicated');
					}}
					ondelete={() => (deleting = r.id)}
				/>
			{/each}
		</div>
	{/if}
</div>

<NewResumeDialog bind:open={creating} />

<Dialog
	bind:open={() => renaming !== null, (v) => !v && (renaming = null)}
	title="Rename resume"
	size="sm"
>
	{#if renaming}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				rename();
			}}
		>
			<TextField bind:value={renaming.name} autofocus />
			<div class="mt-4 flex justify-end gap-2">
				<Button onclick={() => (renaming = null)}>Cancel</Button>
				<Button variant="primary" type="submit">Rename</Button>
			</div>
		</form>
	{/if}
</Dialog>

<Dialog
	bind:open={() => deleting !== null, (v) => !v && (deleting = null)}
	title="Delete this resume?"
	description="Its selections, overrides and snapshots go with it. The library is untouched."
	size="sm"
>
	<div class="flex justify-end gap-2">
		<Button onclick={() => (deleting = null)}>Cancel</Button>
		<Button variant="danger" onclick={remove}>Delete</Button>
	</div>
</Dialog>
