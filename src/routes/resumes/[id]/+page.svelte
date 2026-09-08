<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import ComposerTopBar from '$lib/components/composer/ComposerTopBar.svelte';
	import CompositionPane from '$lib/components/composer/CompositionPane.svelte';
	import LogDrawer from '$lib/components/composer/LogDrawer.svelte';
	import SnapshotsDialog from '$lib/components/composer/SnapshotsDialog.svelte';
	import AtsDrawer from '$lib/components/preview/AtsDrawer.svelte';
	import PdfPreview from '$lib/components/preview/PdfPreview.svelte';
	import LabelsEditor from '$lib/components/resumes/LabelsEditor.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Splitter from '$lib/components/ui/Splitter.svelte';
	import { renderTex } from '$lib/core/latex';
	import { resolve } from '$lib/core/resolve/resolve';
	import { compiles } from '$lib/store/compile.svelte';
	import { uploadUrl } from '$lib/store/github';
	import { resumeJson } from '$lib/store/exporter';
	import { saveSnapshot } from '$lib/store/snapshots';
	import { ui } from '$lib/store/ui.svelte';
	import { workspace } from '$lib/store/workspace.svelte';
	import { downloadBlob, downloadText, slugFilename } from '$lib/util/download';
	import { dbDel, KEYS } from '$lib/store/db';
	import { deleteAllSnapshots } from '$lib/store/snapshots';
	import { setContext } from 'svelte';
	import { lintResume, type LintHint } from '$lib/core/lint';
	import FitDialog from '$lib/components/composer/FitDialog.svelte';
	import HintsDialog from '$lib/components/composer/HintsDialog.svelte';

	const id = $derived(page.params.id!);
	const resume = $derived(workspace.resume(id));
	const profile = $derived(workspace.profile);

	const result = $derived(
		resume && profile
			? resolve(
					$state.snapshot(profile),
					$state.snapshot(workspace.overlay),
					$state.snapshot(resume)
				)
			: null
	);
	const tex = $derived(result && resume ? renderTex(result.resolved, resume) : '');
	const hints = $derived<LintHint[]>(result ? lintResume(result.resolved) : []);
	setContext('lint', () => hints);
	let showFit = $state(false);
	let showHints = $state(false);

	let showLog = $state(false);
	let showLabels = $state(false);
	let showSnapshots = $state(false);
	let showAts = $state(false);
	let confirmDelete = $state(false);
	let labelsDraft = $state<string[]>([]);
	let splitContainer = $state<HTMLDivElement>();
	let containerWidth = $state(0);
	// The stored width, kept sane for whatever screen this is.
	const splitPx = $derived(
		Math.max(320, Math.min(ui.splitterPx, Math.max(320, containerWidth - 380)))
	);
	$effect(() => {
		if (!splitContainer) return;
		const ro = new ResizeObserver(([e]) => (containerWidth = e.contentRect.width));
		ro.observe(splitContainer);
		return () => ro.disconnect();
	});

	onMount(() => {
		ui.setLastResume(id);
		void compiles.restore(id);
		window.addEventListener('rb:download', onshortcut);
		window.addEventListener('rb:compile', onshortcut);
		return () => {
			window.removeEventListener('rb:download', onshortcut);
			window.removeEventListener('rb:compile', onshortcut);
		};
	});

	// Every change to the composition or library re-renders the .tex; the manager debounces.
	$effect(() => {
		if (tex && workspace.settings.autoCompile) compiles.request(id, tex, 'discrete');
	});

	/** Tokenless: save the PDF under the site's file name and open GitHub's upload page for that folder. */
	function uploadPdf() {
		const site = workspace.settings.website;
		const path = site.pdfPath?.trim();
		if (!resume || !site.repo || !path) return;
		const s = compiles.state(id);
		if (!s.pdf || s.status !== 'ok') {
			toast.error(s.status === 'compiling' ? 'Still compiling. One moment.' : 'No PDF yet.');
			return;
		}
		const name = path.slice(path.lastIndexOf('/') + 1) || 'resume.pdf';
		downloadBlob(name, new Blob([s.pdf as BlobPart], { type: 'application/pdf' }));
		window.open(
			uploadUrl(site.repo.trim(), (site.branch ?? '').trim() || 'main', path),
			'_blank',
			'noopener'
		);
		toast.success(`Saved ${name}`, {
			description: 'Drop it on the GitHub page that opened, then Commit changes.'
		});
	}

	function download(kind: 'pdf' | 'tex') {
		if (!resume) return;
		if (kind === 'tex') {
			downloadText(slugFilename(resume.name, 'tex'), tex, 'application/x-tex');
			return;
		}
		const s = compiles.state(id);
		if (!s.pdf || s.status !== 'ok') {
			toast.error(s.status === 'compiling' ? 'Still compiling. One moment.' : 'No PDF yet.');
			return;
		}
		downloadBlob(
			slugFilename(resume.name, 'pdf'),
			new Blob([s.pdf as BlobPart], { type: 'application/pdf' })
		);
		void saveSnapshot({
			resumeId: id,
			tex,
			pdf: s.pdf,
			pages: s.pages,
			texHash: s.texHash,
			bytes: s.pdf.length
		});
	}

	async function snapshot() {
		const s = compiles.state(id);
		if (!s.pdf) return toast.error('No PDF yet.');
		await saveSnapshot({
			resumeId: id,
			tex,
			pdf: s.pdf,
			pages: s.pages,
			texHash: s.texHash,
			bytes: s.pdf.length,
			note: 'manual'
		});
		toast.success('Snapshot saved');
	}

	async function remove() {
		confirmDelete = false;
		workspace.deleteResume(id);
		compiles.dispose(id);
		await deleteAllSnapshots(id);
		await dbDel(KEYS.artifact(id));
		await goto(`${base}/resumes`);
		toast.success('Resume deleted', { action: { label: 'Undo', onClick: () => workspace.undo() } });
	}

	function onshortcut(e: Event) {
		const detail = (e as CustomEvent<'pdf' | 'tex'>).detail;
		if (e.type === 'rb:download') download(detail);
		if (e.type === 'rb:compile') compiles.request(id, tex, 'now');
	}
	let topBar = $state<{ startRename: () => void }>();

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'F2') {
			e.preventDefault();
			topBar?.startRename();
		}
	}
</script>

<svelte:window {onkeydown} />

{#if !resume || !profile}
	<div class="p-8">
		<p class="text-sm text-muted">This resume does not exist here.</p>
		<a href="{base}/resumes" class="text-sm text-accent underline">All resumes</a>
	</div>
{:else}
	<div class="flex h-full flex-col">
		<ComposerTopBar
			bind:this={topBar}
			{resume}
			ondownload={download}
			onshowlog={() => (showLog = true)}
			onlabels={() => {
				labelsDraft = [...resume.labels];
				showLabels = true;
			}}
			onsnapshot={snapshot}
			onsnapshots={() => (showSnapshots = true)}
			onats={() => (showAts = true)}
			onexport={() =>
				downloadText(
					slugFilename(resume.name, 'json'),
					resumeJson($state.snapshot(resume)),
					'application/json'
				)}
			onupload={uploadPdf}
			onfit={() => (showFit = true)}
			onhints={() => (showHints = true)}
			hintCount={hints.length}
			ondelete={() => (confirmDelete = true)}
		/>
		<div bind:this={splitContainer} class="flex min-h-0 flex-1" style="--split: {splitPx}px">
			<!-- Wide screens show both panes side by side; narrower ones show one at a time. -->
			<div class="min-w-0 flex-1 overflow-y-auto {ui.previewOpen ? 'hidden lg:block' : ''}">
				<div class="mx-auto max-w-3xl">
					<CompositionPane {resume} {profile} onfit={() => (showFit = true)} />
				</div>
			</div>
			{#if ui.previewOpen}
				<div class="hidden lg:contents">
					<Splitter container={splitContainer} onresize={(px) => ui.setSplitter(px)} />
				</div>
				<div class="w-full min-w-0 shrink-0 border-l border-border lg:w-[var(--split)]">
					<PdfPreview resumeId={id} />
				</div>
			{/if}
		</div>
	</div>

	<LogDrawer bind:open={showLog} resumeId={id} ondownloadtex={() => download('tex')} />
	<FitDialog bind:open={showFit} {resume} {profile} />
	<HintsDialog bind:open={showHints} {hints} {profile} />
	<SnapshotsDialog bind:open={showSnapshots} resumeId={id} resumeName={resume.name} />
	{#if result}
		<AtsDrawer
			bind:open={showAts}
			resumeId={id}
			resolved={result.resolved}
			templateId={resume.template}
		/>
	{/if}

	<Dialog
		bind:open={showLabels}
		title="Labels"
		description="Tag resumes to find them later: backend, ai-agents, intern-2027."
		size="sm"
	>
		<LabelsEditor bind:value={labelsDraft} label="" />
		{#snippet footer()}
			<Button onclick={() => (showLabels = false)}>Cancel</Button>
			<Button
				variant="primary"
				onclick={() => {
					workspace.mutateResume(id, (r) => (r.labels = [...labelsDraft]));
					showLabels = false;
				}}>Save</Button
			>
		{/snippet}
	</Dialog>

	<Dialog
		bind:open={confirmDelete}
		title="Delete this resume?"
		description="Its selections, overrides and snapshots go with it. The library is untouched."
		size="sm"
	>
		{#snippet footer()}
			<Button onclick={() => (confirmDelete = false)}>Cancel</Button>
			<Button variant="danger" onclick={remove}>Delete</Button>
		{/snippet}
	</Dialog>
{/if}
