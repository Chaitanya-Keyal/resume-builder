<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Upload from '@lucide/svelte/icons/upload';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/Button.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { profileJson } from '$lib/store/exporter';
	import {
		checkRepo,
		editorUrl,
		fetchCurrent,
		forgetToken,
		GitHubError,
		loadToken,
		publish,
		rememberToken
	} from '$lib/store/github';
	import { workspace } from '$lib/store/workspace.svelte';
	import { copyText } from '$lib/util/download';

	const ws = workspace;
	const site = $derived(ws.settings.website);

	let token = $state('');
	let remember = $state(false);
	let advanced = $state(false);
	let busy = $state<'open' | 'check' | 'publish' | null>(null);
	let lastCommit = $state<string | null>(null);

	onMount(async () => {
		token = await loadToken();
		if (token) {
			remember = true;
			advanced = true;
		}
	});

	function set(patch: Partial<typeof site>) {
		ws.updateSettings({ website: { ...site, ...patch } });
	}

	const target = $derived({
		repo: (site.repo ?? '').trim(),
		branch: (site.branch ?? '').trim() || 'main',
		path: (site.path ?? '').trim() || 'profile.json'
	});
	const repoOk = $derived(/^[\w.-]+\/[\w.-]+$/.test(target.repo));
	const text = $derived(ws.profile ? profileJson($state.snapshot(ws.profile)) : '');

	function report(e: unknown) {
		toast.error(e instanceof GitHubError ? e.message : String(e));
	}

	/** No token: copy the file, open GitHub's editor, the user pastes and commits as themselves. */
	async function openOnGitHub() {
		busy = 'open';
		try {
			const copied = await copyText(text);
			let exists = true;
			try {
				const current = await fetchCurrent(null, target);
				exists = current !== null;
				if (current && current.text === text) {
					toast.info('GitHub already has this exact profile.json.');
					return;
				}
			} catch {
				// Private repository or offline: still open the editor.
			}
			window.open(editorUrl(target, exists), '_blank', 'noopener');
			toast.success(
				copied ? 'Copied. Paste over the file on GitHub and commit.' : 'Opened GitHub.',
				{
					description: copied
						? 'Select all in the editor, paste, then Commit changes.'
						: 'Copy profile.json from Export above, paste it there and commit.'
				}
			);
		} finally {
			busy = null;
		}
	}

	async function persistChoice() {
		if (remember && token.trim()) await rememberToken(token);
		else await forgetToken();
	}

	async function check() {
		busy = 'check';
		try {
			await persistChoice();
			const r = await checkRepo(token || null, target.repo);
			if (!site.branch) set({ branch: r.defaultBranch });
			toast.success(`Connected to ${target.repo}`, {
				description: `Default branch: ${r.defaultBranch}${r.isPrivate ? ' (private)' : ''}`
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
			await persistChoice();
			const r = await publish(token.trim(), target, text, 'content: update profile.json');
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

	async function forget() {
		token = '';
		remember = false;
		await forgetToken();
		toast.success('Token removed from this browser.');
	}
</script>

<section class="rounded-lg border border-border bg-surface p-4">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h2 class="text-sm font-semibold">Website</h2>
			<p class="text-xs text-muted">
				If you have a site that reads your profile.json, the builder can get it there for you and
				show the extra fields such sites use (slug, one-liner, links). Otherwise leave this off.
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

		<div class="mt-3 flex flex-wrap items-center gap-2">
			<Button
				variant="primary"
				disabled={!repoOk || busy !== null || !ws.profile}
				onclick={openOnGitHub}
			>
				<ExternalLink size={14} />
				{busy === 'open' ? 'Opening...' : 'Open on GitHub'}
			</Button>
			<span class="text-xs text-muted">
				Copies profile.json and opens the file in GitHub's editor. Paste, commit, done. Nothing to
				set up and this app is granted nothing.
			</span>
		</div>

		<button
			type="button"
			class="mt-4 flex items-center gap-1 text-xs font-medium text-muted hover:text-text"
			onclick={() => (advanced = !advanced)}
		>
			<ChevronDown size={13} class="transition-transform {advanced ? 'rotate-180' : ''}" />
			Commit without leaving this app (uses a token)
		</button>

		{#if advanced}
			<div class="mt-3 rounded-md border border-border bg-surface-2 p-3 text-xs">
				<p class="flex items-start gap-2">
					<ShieldCheck size={14} class="mt-0.5 shrink-0 text-ok" />
					<span>
						<strong>Where the token goes.</strong> It is sent only to api.github.com, straight from this
						browser. By default it is kept in memory for this tab and gone when you close it. If you tick
						Remember, it is encrypted with a key that this browser generates and cannot hand out, and
						stored in this browser's IndexedDB on this device only. It is never written to workspace.json,
						profile.json or anything you export.
					</span>
				</p>
				<p class="mt-2 text-muted">
					<strong>Smallest permission that can commit a file:</strong> a fine-grained token, repository
					access limited to this one repository, permission Contents: read and write, nothing else. GitHub
					has no narrower write permission. Set the expiry to 7 days and revoke it any time under Settings,
					Developer settings, Fine-grained tokens.
				</p>
			</div>

			<div class="mt-3 grid gap-3 sm:grid-cols-2">
				<TextField
					label="Fine-grained token"
					type="password"
					mono
					placeholder="github_pat_..."
					autocomplete="off"
					bind:value={token}
				/>
				<div class="flex items-end pb-2">
					<Checkbox
						bind:checked={remember}
						label="Remember on this device (encrypted)"
						onchange={(v) => {
							if (!v) forgetToken();
						}}
					/>
				</div>
			</div>
			<div class="mt-3 flex flex-wrap items-center gap-2">
				<Button disabled={!repoOk || busy !== null} onclick={check}
					>{busy === 'check' ? 'Checking...' : 'Test connection'}</Button
				>
				<Button
					disabled={!repoOk || !token.trim() || busy !== null || !ws.profile}
					onclick={doPublish}
				>
					<Upload size={14} />
					{busy === 'publish' ? 'Publishing...' : 'Commit profile.json'}
				</Button>
				{#if token}
					<Button variant="ghost" onclick={forget}>Forget token</Button>
				{/if}
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
		{/if}
	{/if}
</section>
