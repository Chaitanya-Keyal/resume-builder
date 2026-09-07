<script lang="ts">
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { profileJson, resumeJson } from '$lib/store/exporter';
	import { editorUrl, fetchCurrent } from '$lib/store/github';
	import { workspace } from '$lib/store/workspace.svelte';
	import { copyText } from '$lib/util/download';

	const ws = workspace;
	const site = $derived(ws.settings.website);
	let busy = $state<'profile' | 'resume' | null>(null);

	function set(patch: Partial<typeof site>) {
		ws.updateSettings({ website: { ...site, ...patch } });
	}

	const repo = $derived((site.repo ?? '').trim());
	const branch = $derived((site.branch ?? '').trim() || 'main');
	const repoOk = $derived(/^[\w.-]+\/[\w.-]+$/.test(repo));
	const siteResume = $derived(ws.resumes.find((r) => r.id === site.resumeId));

	/** Copy the file, open GitHub's editor at its path; the user pastes and commits as themselves. */
	async function openOnGitHub(kind: 'profile' | 'resume') {
		if (!ws.profile) return;
		const path =
			kind === 'profile'
				? (site.path ?? '').trim() || 'profile.json'
				: (site.resumePath ?? '').trim() || 'resume.json';
		const text =
			kind === 'profile'
				? profileJson($state.snapshot(ws.profile))
				: siteResume
					? resumeJson($state.snapshot(siteResume))
					: '';
		if (!text) return;
		busy = kind;
		try {
			const copied = await copyText(text);
			let exists = true;
			try {
				const current = await fetchCurrent({ repo, branch, path });
				exists = current !== null;
				if (current && current.text === text) {
					toast.info(`GitHub already has this exact ${path.split('/').pop()}.`);
					return;
				}
			} catch {
				// Private repository or offline: still open the editor.
			}
			window.open(editorUrl({ repo, branch, path }, exists), '_blank', 'noopener');
			if (copied)
				toast.success(`Copied ${path.split('/').pop()}`, {
					description: 'In the GitHub editor: select all, paste, then Commit changes.'
				});
			else
				toast.warning('Could not access the clipboard', {
					description: 'Use Copy under Export, then paste into the GitHub editor.'
				});
		} finally {
			busy = null;
		}
	}
</script>

<section class="rounded-lg border border-border bg-surface p-4">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h2 class="text-sm font-semibold">Website</h2>
			<p class="text-xs text-muted">
				If you have a site that reads your profile.json, the builder can hand your files to GitHub
				for you and show the extra fields such sites use (slug, one-liner, links). Otherwise leave
				this off.
			</p>
		</div>
		<Switch checked={site.enabled} onchange={(v) => set({ enabled: v })} />
	</div>

	{#if site.enabled}
		<div class="mt-4 grid gap-3 sm:grid-cols-2">
			<TextField
				label="GitHub repository"
				placeholder="owner/repo"
				mono
				value={site.repo ?? ''}
				oninput={(e) => set({ repo: (e.currentTarget as HTMLInputElement).value })}
			/>
			<TextField
				label="Branch"
				placeholder="main"
				mono
				value={site.branch ?? ''}
				oninput={(e) => set({ branch: (e.currentTarget as HTMLInputElement).value })}
			/>
		</div>
		<p class="mt-3 text-xs text-faint">
			Each button copies the file and opens it in GitHub's editor at that path. Paste and commit
			with your own login. No tokens, no access granted to this app.
		</p>

		<div class="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_auto]">
			<TextField
				label="Library: path to profile.json"
				placeholder="src/lib/data/profile.json"
				mono
				value={site.path ?? ''}
				oninput={(e) => set({ path: (e.currentTarget as HTMLInputElement).value })}
			/>
			<Button
				variant="primary"
				disabled={!repoOk || busy !== null || !ws.profile}
				onclick={() => openOnGitHub('profile')}
			>
				<ExternalLink size={14} />
				{busy === 'profile' ? 'Opening...' : 'Open on GitHub'}
			</Button>
		</div>

		<div class="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
			<Select
				label="Resume the site prints"
				value={site.resumeId ?? ''}
				options={[
					{ value: '', label: 'None' },
					...ws.resumes.map((r) => ({ value: r.id, label: r.name }))
				]}
				onchange={(v) => set({ resumeId: v || undefined })}
			/>
			<TextField
				label="Path to resume.json"
				placeholder="src/lib/data/resume.json"
				mono
				value={site.resumePath ?? ''}
				oninput={(e) => set({ resumePath: (e.currentTarget as HTMLInputElement).value })}
			/>
			<Button
				disabled={!repoOk || busy !== null || !siteResume}
				onclick={() => openOnGitHub('resume')}
			>
				<ExternalLink size={14} />
				{busy === 'resume' ? 'Opening...' : 'Open on GitHub'}
			</Button>
		</div>
		<p class="mt-1 text-xs text-faint">
			A site can build the PDF itself from these two files with the builder's pdf script, so no PDF
			ever needs committing. resume.json holds which entries, bullets and overrides this resume
			uses; private fields stay out of both files.
		</p>

		<div class="mt-3">
			<TextField
				label="Or: path to a committed PDF (optional)"
				placeholder="static/resume.pdf"
				mono
				value={site.pdfPath ?? ''}
				oninput={(e) => set({ pdfPath: (e.currentTarget as HTMLInputElement).value })}
				hint="Adds 'Upload PDF to GitHub' to a resume's menu: downloads the PDF under this name and opens the upload page for its folder."
			/>
		</div>
	{/if}
</section>
