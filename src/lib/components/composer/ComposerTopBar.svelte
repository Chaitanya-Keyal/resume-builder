<script lang="ts">
	import { base } from '$app/paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Copy from '@lucide/svelte/icons/copy';
	import Download from '@lucide/svelte/icons/download';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import FileDown from '@lucide/svelte/icons/file-down';
	import History from '@lucide/svelte/icons/history';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import Save from '@lucide/svelte/icons/save';
	import ScanText from '@lucide/svelte/icons/scan-text';
	import Tag from '@lucide/svelte/icons/tag';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import WandSparkles from '@lucide/svelte/icons/wand-sparkles';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import Menu from '$lib/components/ui/Menu.svelte';
	import type { Resume } from '$lib/core/schema/types';
	import { ui } from '$lib/store/ui.svelte';
	import { workspace } from '$lib/store/workspace.svelte';
	import CompileStatus from './CompileStatus.svelte';
	import PageBadge from './PageBadge.svelte';

	let {
		resume,
		ondownload,
		onshowlog,
		onlabels,
		onsnapshot,
		onsnapshots,
		onats,
		onexport,
		ondelete
	}: {
		resume: Resume;
		ondownload: (kind: 'pdf' | 'tex') => void;
		onshowlog: () => void;
		onlabels: () => void;
		onsnapshot: () => void;
		onsnapshots: () => void;
		onats: () => void;
		onexport: () => void;
		ondelete: () => void;
	} = $props();

	let editing = $state(false);
	let draft = $state('');

	function startRename() {
		draft = resume.name;
		editing = true;
	}
	function commit() {
		editing = false;
		if (draft.trim() && draft.trim() !== resume.name)
			workspace.mutateResume(resume.id, (r) => (r.name = draft.trim()));
	}
</script>

<header class="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
	<a
		href="{base}/resumes"
		class="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
		aria-label="All resumes"><ArrowLeft size={16} /></a
	>
	{#if editing}
		<!-- svelte-ignore a11y_autofocus -->
		<input
			class="h-8 min-w-40 rounded-md border border-accent bg-surface px-2 text-sm font-semibold outline-none"
			bind:value={draft}
			autofocus
			onblur={commit}
			onkeydown={(e) => {
				if (e.key === 'Enter') commit();
				if (e.key === 'Escape') editing = false;
			}}
		/>
	{:else}
		<button
			type="button"
			class="h-8 max-w-[38vw] truncate rounded-md px-2 text-sm font-semibold hover:bg-surface-2 sm:max-w-64"
			title="Rename (F2)"
			onclick={startRename}>{resume.name}</button
		>
	{/if}
	<button
		type="button"
		class="hidden h-7 items-center gap-1 rounded-md px-1.5 text-xs text-muted hover:bg-surface-2 hover:text-text sm:inline-flex"
		onclick={onlabels}
		title="Edit labels"
	>
		<Tag size={13} />
		{#if resume.labels.length}
			{#each resume.labels as l (l)}<Badge tone="accent">{l}</Badge>{/each}
		{:else}
			labels
		{/if}
	</button>

	<div class="flex-1"></div>

	<PageBadge resumeId={resume.id} />
	<span class="hidden md:contents"><CompileStatus resumeId={resume.id} {onshowlog} /></span>

	<span class="mx-1 hidden h-5 w-px bg-border sm:block"></span>

	<Button
		variant="primary"
		size="sm"
		onclick={() => ondownload('pdf')}
		title="Download PDF (Ctrl+Shift+D)"
	>
		<Download size={14} /> PDF
	</Button>
	<Button size="sm" onclick={() => ondownload('tex')} title="Download LaTeX source (Ctrl+Shift+T)">
		<FileDown size={14} /> .tex
	</Button>
	<IconButton
		label={ui.previewOpen ? 'Hide preview (Ctrl+\\)' : 'Show preview (Ctrl+\\)'}
		active={ui.previewOpen}
		onclick={() => ui.setPreviewOpen(!ui.previewOpen)}><PanelRight size={16} /></IconButton
	>
	<Menu
		triggerClass="text-muted hover:bg-surface-2 hover:text-text flex h-8 w-8 items-center justify-center rounded-md"
		items={[
			{ label: 'Save snapshot', icon: Save, onSelect: onsnapshot },
			{ label: 'Snapshots...', icon: History, onSelect: onsnapshots },
			{ label: 'What a parser sees...', icon: ScanText, onSelect: onats },
			{ separator: true },
			{ label: 'Export resume JSON', icon: FileDown, onSelect: onexport },
			{ label: 'Duplicate', icon: Copy, onSelect: () => workspace.duplicateResume(resume.id) },
			{ separator: true },
			{
				label: 'Tailor to a job description',
				icon: WandSparkles,
				disabled: true,
				hint: 'Coming later'
			},
			{ separator: true },
			{ label: 'Delete resume', icon: Trash2, danger: true, onSelect: ondelete }
		]}
	>
		{#snippet trigger()}<Ellipsis size={16} />{/snippet}
	</Menu>
</header>
