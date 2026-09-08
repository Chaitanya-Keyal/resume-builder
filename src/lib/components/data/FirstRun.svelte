<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import FilePlus from '@lucide/svelte/icons/file-plus';
	import FileText from '@lucide/svelte/icons/file-text';
	import Link from '@lucide/svelte/icons/link';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Upload from '@lucide/svelte/icons/upload';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { emptyProfile } from '$lib/core/schema/profile';
	import { parseProfile } from '$lib/core/schema/validate';
	import {
		applyWorkspace,
		fetchImport,
		ImportError,
		parseImport,
		type Imported
	} from '$lib/store/importer';
	import { workspace } from '$lib/store/workspace.svelte';
	import sampleJson from '../../../../fixtures/sample/profile.json';

	let url = $state('');
	let busy = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement>();

	/** Install the library (and resumes, for a workspace), make sure one resume exists, open it. */
	function finish(imported: Imported) {
		if (imported.resume) {
			toast.error(
				'That is a resume.json. Start with your library first, then import it from Data.'
			);
			return;
		}
		workspace.batch(() => {
			if (imported.workspace) applyWorkspace(imported.workspace);
			else if (imported.profile) workspace.setProfile(imported.profile);
			if (!workspace.resumes.length) workspace.newResume({ name: 'Default', mode: 'all' });
		});
		for (const w of imported.warnings) toast.warning(w.message, { description: w.path });
		void goto(`${base}/resumes/${workspace.resumes[0].id}`);
	}

	function blank() {
		finish({ kind: 'profile', profile: emptyProfile(), warnings: [] });
	}

	function sample() {
		const { profile, warnings } = parseProfile(sampleJson);
		finish({ kind: 'profile', profile, warnings });
	}

	async function fromFile(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!f) return;
		busy = 'file';
		try {
			finish(parseImport(await f.text()));
		} catch (err) {
			report(err);
		} finally {
			busy = null;
		}
	}

	async function fromUrl() {
		busy = 'url';
		try {
			const imported = await fetchImport(url.trim());
			workspace.updateSettings({ sourceUrl: url.trim() });
			finish(imported);
		} catch (err) {
			report(err);
		} finally {
			busy = null;
		}
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
</script>

<main class="flex min-h-dvh items-center justify-center p-6">
	<div class="w-full max-w-2xl">
		<div class="mb-8">
			<div
				class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-fg"
			>
				<FileText size={20} strokeWidth={2.25} />
			</div>
			<h1 class="text-2xl font-semibold tracking-tight">Resume Builder</h1>
			<p class="mt-1 text-sm text-muted">
				One library of everything you have done, any number of resumes composed from it, and a LaTeX
				PDF compiled right here. Your data stays in this browser.
			</p>
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<button
				type="button"
				class="group rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-border-strong hover:bg-surface-2"
				onclick={blank}
			>
				<FilePlus class="mb-3 text-accent" size={20} />
				<div class="font-medium">Start blank</div>
				<div class="mt-0.5 text-sm text-muted">
					An empty library. Add your first job in a minute.
				</div>
			</button>
			<button
				type="button"
				class="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-border-strong hover:bg-surface-2"
				onclick={sample}
			>
				<Sparkles class="mb-3 text-accent" size={20} />
				<div class="font-medium">Load a sample</div>
				<div class="mt-0.5 text-sm text-muted">
					Jane Doe's library, to see how the pieces fit before typing.
				</div>
			</button>
			<button
				type="button"
				class="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-border-strong hover:bg-surface-2"
				disabled={busy !== null}
				onclick={() => fileInput?.click()}
			>
				<Upload class="mb-3 text-accent" size={20} />
				<div class="font-medium">Import a file</div>
				<div class="mt-0.5 text-sm text-muted">
					A profile.json, a workspace export, or a plain JSON Resume.
				</div>
				<input
					bind:this={fileInput}
					type="file"
					accept="application/json,.json"
					class="hidden"
					onchange={fromFile}
				/>
			</button>
			<div class="rounded-xl border border-border bg-surface p-4">
				<Link class="mb-3 text-accent" size={20} />
				<div class="font-medium">Import from a URL</div>
				<div class="mt-0.5 mb-3 text-sm text-muted">
					A profile published by a site that reads profile.json.
				</div>
				<form
					class="flex gap-2"
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
					<Button variant="primary" type="submit" disabled={busy !== null || !url.trim()}
						>{busy === 'url' ? 'Fetching...' : 'Import'}</Button
					>
				</form>
			</div>
		</div>

		<p class="mt-8 text-xs text-faint">
			Nothing is uploaded anywhere. The LaTeX engine is downloaded once (about 10 MB) and runs
			offline afterwards. Open source:
			<a
				class="text-accent underline"
				href="https://github.com/Chaitanya-Keyal/resume-builder"
				target="_blank"
				rel="noopener">source, issues and ideas on GitHub</a
			>.
		</p>
	</div>
</main>
