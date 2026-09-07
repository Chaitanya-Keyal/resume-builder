<script lang="ts">
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Upload from '@lucide/svelte/icons/upload';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/Button.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { profileJson } from '$lib/store/exporter';
	import { checkRepo, GitHubError, loadToken, publish, saveToken } from '$lib/store/github';
	import { workspace } from '$lib/store/workspace.svelte';

	const ws = workspace;
	const site = $derived(ws.settings.website);
	let token = $state('');
	let busy = $state<'check' | 'publish' | null>(null);
	let lastCommit = $state<string | null>(null);

	onMount(async () => {
		token = await loadToken();
	});

	function set(patch: Partial<typeof site>) {
		ws.updateSettings({ website: { ...site, ...patch } });
	}

	const target = $derived({
		repo: (site.repo ?? '').trim(),
		branch: (site.branch ?? 'main').trim() || 'main',
		path: (site.path ?? 'src/lib/data/profile.json').trim() || 'profile.json'
	});
	const ready = $derived(!!token && /^[\w.-]+\/[\w.-]+$/.test(target.repo));

	function report(e: unknown) {
		toast.error(e instanceof GitHubError ? e.message : String(e));
	}

	async function check() {
		busy = 'check';
		try {
			await saveToken(token);
			const r = await checkRepo(token, target.repo);
			if (!site.branch) set({ branch: r.defaultBranch });
			toast.success(`Connected to ${target.repo}`, {
				description: `Default branch: ${r.defaultBranch}`
			});
		} catch (e) {
			report(e);
		} finally {
			busy = null;
		}
	}

	async function doPublish() {
		if (!ws.profile) return;
		busy = 'publish';
		try {
			await saveToken(token);
			const text = profileJson($state.snapshot(ws.profile));
			const r = await publish(token, target, text, 'content: update profile.json');
			if (r.unchanged) toast.info('Already up to date on GitHub.');
			else {
				lastCommit = r.url;
				toast.success('Published', { description: `${target.repo} on ${target.branch}` });
			}
		} catch (e) {
			report(e);
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
				If you have a site that reads your profile.json, the builder can commit it there for you and
				show the extra fields such sites use (slug, one-liner, links). Otherwise leave this off.
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
			<TextField
				label="Path to profile.json"
				placeholder="src/lib/data/profile.json"
				mono
				value={site.path ?? ''}
				oninput={(e) => set({ path: (e.currentTarget as HTMLInputElement).value })}
			/>
			<TextField
				label="Fine-grained token"
				type="password"
				mono
				placeholder="github_pat_..."
				bind:value={token}
				hint="Repository access: this repo only. Permission: Contents, read and write. Stored in this browser, never exported."
			/>
		</div>
		<div class="mt-3 flex flex-wrap items-center gap-2">
			<Button disabled={!ready || busy !== null} onclick={check}
				>{busy === 'check' ? 'Checking...' : 'Test connection'}</Button
			>
			<Button
				variant="primary"
				disabled={!ready || busy !== null || !ws.profile}
				onclick={doPublish}
			>
				<Upload size={14} />
				{busy === 'publish' ? 'Publishing...' : 'Publish profile.json'}
			</Button>
			{#if lastCommit}
				<a
					href={lastCommit}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-1 text-xs text-accent underline"
					>View commit <ExternalLink size={12} /></a
				>
			{/if}
		</div>
		<p class="mt-2 text-xs text-faint">
			Create the token at github.com, Settings, Developer settings, Fine-grained tokens. Private
			fields never leave this browser; only the public profile is committed.
		</p>
	{/if}
</section>
