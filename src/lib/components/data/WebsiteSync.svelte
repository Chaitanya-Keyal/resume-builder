<script lang="ts">
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/Button.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { profileJson } from '$lib/store/exporter';
	import { editorUrl, fetchCurrent } from '$lib/store/github';
	import { workspace } from '$lib/store/workspace.svelte';
	import { copyText } from '$lib/util/download';

	const ws = workspace;
	const site = $derived(ws.settings.website);
	let busy = $state(false);

	function set(patch: Partial<typeof site>) {
		ws.updateSettings({ website: { ...site, ...patch } });
	}

	const target = $derived({
		repo: (site.repo ?? '').trim(),
		branch: (site.branch ?? '').trim() || 'main',
		path: (site.path ?? '').trim() || 'profile.json'
	});
	const repoOk = $derived(/^[\w.-]+\/[\w.-]+$/.test(target.repo));

	/** Copy the file, open GitHub's editor; the user pastes and commits as themselves. */
	async function openOnGitHub() {
		if (!ws.profile) return;
		busy = true;
		try {
			const text = profileJson($state.snapshot(ws.profile));
			const copied = await copyText(text);
			let exists = true;
			try {
				const current = await fetchCurrent(target);
				exists = current !== null;
				if (current && current.text === text) {
					toast.info('GitHub already has this exact profile.json.');
					return;
				}
			} catch {
				// Private repository or offline: still open the editor.
			}
			window.open(editorUrl(target, exists), '_blank', 'noopener');
			if (copied)
				toast.success('Copied profile.json', {
					description: 'In the GitHub editor: select all, paste, then Commit changes.'
				});
			else
				toast.warning('Could not access the clipboard', {
					description: 'Use Copy under Export, then paste into the GitHub editor.'
				});
		} finally {
			busy = false;
		}
	}
</script>

<section class="rounded-lg border border-border bg-surface p-4">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h2 class="text-sm font-semibold">Website</h2>
			<p class="text-xs text-muted">
				If you have a site that reads your profile.json, the builder can hand it to GitHub for you
				and show the extra fields such sites use (slug, one-liner, links). Otherwise leave this off.
			</p>
		</div>
		<Switch checked={site.enabled} onchange={(v) => set({ enabled: v })} />
	</div>

	{#if site.enabled}
		<div class="mt-4 grid gap-3 sm:grid-cols-3">
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
			<TextField
				label="Path to profile.json"
				placeholder="profile.json"
				mono
				value={site.path ?? ''}
				oninput={(e) => set({ path: (e.currentTarget as HTMLInputElement).value })}
			/>
		</div>
		<div class="mt-3 flex flex-wrap items-center gap-3">
			<Button variant="primary" disabled={!repoOk || busy || !ws.profile} onclick={openOnGitHub}>
				<ExternalLink size={14} />
				{busy ? 'Opening...' : 'Open on GitHub'}
			</Button>
			<span class="text-xs text-muted">
				Copies profile.json and opens the file in GitHub's editor. Paste and commit with your own
				login. No tokens, no access granted to this app.
			</span>
		</div>
	{/if}
</section>
