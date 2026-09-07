<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import Copy from '@lucide/svelte/icons/copy';
	import Download from '@lucide/svelte/icons/download';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Upload from '@lucide/svelte/icons/upload';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/Button.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { jsonResumeJson, profileJson, workspaceJson } from '$lib/store/exporter';
	import { resolve } from '$lib/core/resolve/resolve';
	import { fetchImport, ImportError, parseImport, type Imported } from '$lib/store/importer';
	import { ui } from '$lib/store/ui.svelte';
	import { workspace } from '$lib/store/workspace.svelte';
	import { copyText, downloadText } from '$lib/util/download';
	import WebsiteSync from '$lib/components/data/WebsiteSync.svelte';

	const ws = workspace;
	let includeOverlay = $state(false);
	let url = $state(ws.settings.sourceUrl ?? '');
	let busy = $state(false);
	let pending = $state<Imported | null>(null);
	let confirmReset = $state(false);
	let fileInput = $state<HTMLInputElement>();

	const phone = $derived(ws.overlay.basics?.phone ?? '');

	function setOverlayField(k: 'phone' | 'email' | 'url', v: string) {
		ws.mutateOverlay((o) => {
			o.basics ??= {};
			if (v.trim()) o.basics[k] = v.trim();
			else delete o.basics[k];
		});
	}

	function report(err: unknown) {
		if (err instanceof ImportError) {
			toast.error(err.message, {
				description: err.problems
					.slice(0, 3)
					.map((p) => `${p.path}: ${p.message}`)
					.join('\n')
			});
		} else toast.error(String(err));
	}

	async function fromFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0];
		if (!f) return;
		try {
			pending = parseImport(await f.text());
		} catch (err) {
			report(err);
		}
		// Reset so picking the same file again fires onchange. Read before the await: currentTarget is gone after it.
		input.value = '';
	}

	async function fromUrl() {
		busy = true;
		try {
			pending = await fetchImport(url.trim());
			ws.updateSettings({ sourceUrl: url.trim() });
		} catch (err) {
			report(err);
		} finally {
			busy = false;
		}
	}

	/** A workspace import touched profile, resumes and overlay: undo each. */
	function undoImport(steps: number) {
		for (let i = 0; i < steps; i++) ws.undo();
	}

	function applyPending() {
		if (!pending) return;
		const imp = pending;
		pending = null;
		if (imp.resume) {
			const replaced = ws.putResume(imp.resume);
			toast.success(replaced ? `Replaced "${imp.resume.name}"` : `Added "${imp.resume.name}"`, {
				action: { label: 'Undo', onClick: () => workspace.undo() }
			});
			return;
		}
		if (!imp.profile) return;
		ws.setProfile(imp.profile, imp.warnings);
		if (imp.workspace) {
			ws.setResumes(imp.workspace.resumes);
			if (imp.workspace.overlay) ws.setOverlay(imp.workspace.overlay);
			if (imp.workspace.settings) ws.updateSettings(imp.workspace.settings);
		}
		for (const w of imp.warnings) toast.warning(w.message, { description: w.path });
		toast.success(imp.workspace ? 'Workspace restored' : 'Library replaced', {
			description: imp.workspace
				? 'Ctrl+Z, or Undo here, brings the previous state back.'
				: 'Resumes keep their selections; anything that no longer exists is flagged in the composer.',
			action: { label: 'Undo', onClick: () => undoImport(imp.workspace ? 3 : 1) }
		});
	}

	const counts = $derived(
		pending?.profile
			? {
					work: pending.profile.work.length,
					projects: pending.profile.projects.length,
					resumes: pending.workspace?.resumes.length
				}
			: null
	);
	/** For a resume import: how many of its entries and bullets the current library does not have. */
	const missing = $derived.by(() => {
		if (!pending?.resume || !ws.profile) return 0;
		return resolve($state.snapshot(ws.profile), undefined, $state.snapshot(pending.resume)).problems
			.length;
	});
	const existing = $derived(pending?.resume ? ws.resume(pending.resume.id) : undefined);

	async function reset() {
		confirmReset = false;
		await ws.reset();
		await goto(`${base}/`);
	}
</script>

<div class="mx-auto max-w-3xl space-y-5 p-5 md:p-8">
	<div>
		<h1 class="text-xl font-semibold tracking-tight">Data</h1>
		<p class="text-sm text-muted">
			Everything lives in this browser. Export to keep it, import to move it.
		</p>
	</div>

	<section class="rounded-lg border border-border bg-surface p-4">
		<h2 class="text-sm font-semibold">Private</h2>
		<p class="mb-3 text-xs text-muted">
			Never included in profile.json, so a public copy, say in your website repo, stays clean.
			Resumes print it.
		</p>
		<div class="grid gap-3 sm:grid-cols-2">
			<TextField
				label="Phone"
				placeholder="+91 98765 43210"
				value={phone}
				oninput={(e) => setOverlayField('phone', (e.currentTarget as HTMLInputElement).value)}
			/>
			<TextField
				label="Private email (optional)"
				placeholder="overrides the library email"
				value={ws.overlay.basics?.email ?? ''}
				oninput={(e) => setOverlayField('email', (e.currentTarget as HTMLInputElement).value)}
			/>
		</div>
	</section>

	<section class="rounded-lg border border-border bg-surface p-4">
		<h2 class="text-sm font-semibold">Export the library</h2>
		<p class="mb-3 text-xs text-muted">
			profile.json is the public file: your library without private fields or resumes. Keep it
			anywhere, or import it on another device.
		</p>
		{#if ws.profile}
			<div class="flex flex-wrap gap-2">
				<Button
					onclick={() =>
						downloadText(
							'profile.json',
							profileJson($state.snapshot(ws.profile!)),
							'application/json'
						)}><Download size={14} /> Download profile.json</Button
				>
				<Button
					onclick={async () => {
						if (await copyText(profileJson($state.snapshot(ws.profile!))))
							toast.success('Copied profile.json');
					}}><Copy size={14} /> Copy</Button
				>
				<Button
					variant="ghost"
					onclick={() =>
						downloadText(
							'resume.json',
							jsonResumeJson($state.snapshot(ws.profile!)),
							'application/json'
						)}>Plain JSON Resume</Button
				>
			</div>
		{/if}
	</section>

	<section class="rounded-lg border border-border bg-surface p-4">
		<h2 class="text-sm font-semibold">Back up everything</h2>
		<p class="mb-3 text-xs text-muted">
			workspace.json holds the library, every resume with its selections and overrides, and
			settings.
		</p>
		<div class="flex flex-wrap items-center gap-3">
			<Button
				variant="primary"
				disabled={!ws.profile}
				onclick={() =>
					downloadText(
						'workspace.json',
						workspaceJson(
							{
								profile: $state.snapshot(ws.profile!),
								overlay: $state.snapshot(ws.overlay),
								resumes: $state.snapshot(ws.resumes),
								settings: $state.snapshot(ws.settings)
							},
							{ includeOverlay }
						),
						'application/json'
					)}><Download size={14} /> Download workspace.json</Button
			>
			<Checkbox bind:checked={includeOverlay} label="Include private fields" />
		</div>
	</section>

	<section class="rounded-lg border border-border bg-surface p-4">
		<h2 class="text-sm font-semibold">Import</h2>
		<p class="mb-3 text-xs text-muted">
			A profile.json replaces the library and keeps your resumes. A resume.json adds one resume, or
			replaces the one it came from. A workspace.json replaces everything. A plain JSON Resume works
			too.
		</p>
		<div class="flex flex-wrap gap-2">
			<Button onclick={() => fileInput?.click()}><Upload size={14} /> Import a file</Button>
			<input
				bind:this={fileInput}
				type="file"
				accept="application/json,.json"
				class="hidden"
				onchange={fromFile}
			/>
		</div>
		<form
			class="mt-3 flex gap-2"
			onsubmit={(e) => {
				e.preventDefault();
				void fromUrl();
			}}
		>
			<TextField
				bind:value={url}
				class="flex-1"
				mono
				placeholder="https://your-site.dev/profile.json"
			/>
			<Button type="submit" disabled={busy || !url.trim()}
				><RefreshCw size={14} />
				{busy
					? 'Fetching...'
					: ws.settings.sourceUrl === url.trim() && url
						? 'Re-import'
						: 'Import from URL'}</Button
			>
		</form>
	</section>

	<WebsiteSync />

	<section class="rounded-lg border border-border bg-surface p-4">
		<h2 class="mb-3 text-sm font-semibold">Preferences</h2>
		<div class="grid gap-4 sm:grid-cols-2">
			<Select
				label="Theme"
				value={ui.theme}
				options={[
					{ value: 'system', label: 'System' },
					{ value: 'light', label: 'Light' },
					{ value: 'dark', label: 'Dark' }
				]}
				onchange={(v) => ui.setTheme(v as 'system' | 'light' | 'dark')}
			/>
			<div class="pt-5">
				<Switch
					checked={ws.settings.autoCompile}
					label="Compile as you edit"
					description="Off: press Ctrl+S to compile."
					onchange={(v) => ws.updateSettings({ autoCompile: v })}
				/>
			</div>
		</div>
	</section>

	<section class="rounded-lg border border-danger/30 bg-surface p-4">
		<h2 class="text-sm font-semibold text-danger">Start over</h2>
		<p class="mb-3 text-xs text-muted">
			Deletes the library, every resume, snapshots and settings from this browser.
		</p>
		<Button variant="danger" onclick={() => (confirmReset = true)}>Delete everything</Button>
	</section>
</div>

<Dialog
	open={pending !== null}
	title={pending?.resume
		? existing
			? 'Replace this resume?'
			: 'Add this resume?'
		: pending?.workspace
			? 'Restore this workspace?'
			: 'Replace the library?'}
	size="sm"
>
	{#if pending?.resume}
		<p class="text-sm">
			{pending.resume.name} - {pending.resume.sections.length} sections - {pending.resume.sections.reduce(
				(n, s) => n + s.items.length,
				0
			)} entries.
		</p>
		{#if missing}
			<p class="mt-2 text-xs text-warn">
				{missing} of its entries or bullets are not in your library. They are skipped and flagged in the
				composer until the library has them.
			</p>
		{/if}
		<p class="mt-2 text-xs text-muted">
			{existing
				? `Replaces "${existing.name}", which it was exported from. The library is untouched.`
				: 'Added alongside your other resumes. The library is untouched.'}
		</p>
	{:else if pending?.profile && counts}
		<p class="text-sm">
			{pending.profile.basics.name || 'Unnamed'} - {counts.work} jobs - {counts.projects} projects{#if counts.resumes !== undefined}
				- {counts.resumes} resumes{/if}.
		</p>
		{#if pending.warnings.length}
			<ul class="mt-2 space-y-0.5 text-xs text-warn">
				{#each pending.warnings.slice(0, 5) as w, i (i)}<li>{w.path}: {w.message}</li>{/each}
			</ul>
		{/if}
		<p class="mt-2 text-xs text-muted">
			{pending.workspace
				? 'Your current library and resumes are replaced.'
				: 'Your resumes stay; entries they reference that no longer exist are flagged.'}
		</p>
	{/if}
	{#snippet footer()}
		<Button onclick={() => (pending = null)}>Cancel</Button>
		<Button variant="primary" onclick={applyPending}
			>{pending?.resume
				? existing
					? 'Replace'
					: 'Add'
				: pending?.workspace
					? 'Restore'
					: 'Replace'}</Button
		>
	{/snippet}
</Dialog>

<Dialog
	bind:open={confirmReset}
	title="Delete everything?"
	description="There is no undo. Export a workspace.json first if you want a copy."
	size="sm"
>
	{#snippet footer()}
		<Button onclick={() => (confirmReset = false)}>Cancel</Button>
		<Button variant="danger" onclick={reset}>Delete everything</Button>
	{/snippet}
</Dialog>
