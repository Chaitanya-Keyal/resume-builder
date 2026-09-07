<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { templates } from '$lib/core/latex';
	import { workspace } from '$lib/store/workspace.svelte';
	import LabelsEditor from './LabelsEditor.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let name = $state('');
	let labels = $state<string[]>([]);
	let mode = $state<'all' | 'empty' | 'copy'>('all');
	let fromId = $state('');
	let template = $state('jake');

	$effect(() => {
		if (open) {
			name = `Resume ${new Date().getFullYear()}`;
			labels = [];
			mode = workspace.resumes.length ? 'copy' : 'all';
			fromId = workspace.resumes[0]?.id ?? '';
		}
	});

	function create() {
		const r = workspace.newResume({
			name: name.trim() || 'Untitled',
			labels,
			mode,
			template,
			fromId: mode === 'copy' ? fromId : undefined
		});
		open = false;
		if (r) void goto(`${base}/resumes/${r.id}`);
	}
</script>

<Dialog
	bind:open
	title="New resume"
	description="A composition over your library. Nothing is copied; edits to the library show up here."
>
	<form
		class="space-y-4"
		onsubmit={(e) => {
			e.preventDefault();
			create();
		}}
	>
		<TextField bind:value={name} label="Name" autofocus />
		<LabelsEditor bind:value={labels} />
		{#if Object.keys(templates).length > 1}
			<Select
				bind:value={template}
				label="Template"
				options={Object.values(templates).map((t) => ({ value: t.id, label: t.name }))}
			/>
		{/if}
		<fieldset>
			<legend class="mb-1 block text-xs font-medium text-muted">Start from</legend>
			<div class="grid gap-1.5">
				{#each [{ v: 'all', l: 'Everything', d: 'Every entry and bullet selected. Trim from there.' }, { v: 'empty', l: 'Empty', d: 'Sections in place, nothing picked yet.' }, ...(workspace.resumes.length ? [{ v: 'copy', l: 'A copy of…', d: 'Same selections and overrides as another resume.' }] : [])] as o (o.v)}
					<label
						class="flex cursor-pointer items-start gap-2 rounded-md border border-border px-3 py-2 hover:bg-surface-2 {mode ===
						o.v
							? 'border-accent bg-accent/5'
							: ''}"
					>
						<input type="radio" name="mode" value={o.v} bind:group={mode} class="mt-1" />
						<span class="text-sm">
							{o.l}
							<span class="block text-xs text-muted">{o.d}</span>
						</span>
					</label>
				{/each}
			</div>
			{#if mode === 'copy'}
				<div class="mt-2">
					<Select
						bind:value={fromId}
						options={workspace.resumes.map((r) => ({ value: r.id, label: r.name }))}
					/>
				</div>
			{/if}
		</fieldset>
		<div class="flex justify-end gap-2 pt-1">
			<Button onclick={() => (open = false)}>Cancel</Button>
			<Button variant="primary" type="submit">Create</Button>
		</div>
	</form>
</Dialog>
