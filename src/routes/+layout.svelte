<script lang="ts">
	import './layout.css';
	import { afterNavigate, goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { onMount, type Snippet } from 'svelte';
	import { Toaster, toast } from 'svelte-sonner';
	import { pwaInfo } from 'virtual:pwa-info';
	import BottomTabs from '$lib/components/shell/BottomTabs.svelte';
	import Rail from '$lib/components/shell/Rail.svelte';
	import ReturnBar from '$lib/components/shell/ReturnBar.svelte';
	import { compiles } from '$lib/store/compile.svelte';
	import { ui } from '$lib/store/ui.svelte';
	import { workspace } from '$lib/store/workspace.svelte';

	let { children }: { children: Snippet } = $props();

	/**
	 * The generated register helper resolves `./sw.js` against the current page, which
	 * 404s on every nested route and silently leaves the browser on a stale build.
	 * Register at the site root instead, and reload once when a new worker takes over.
	 */
	async function registerWorker() {
		if (!('serviceWorker' in navigator)) return;
		try {
			const reg = await navigator.serviceWorker.register(`${base}/sw.js`, {
				scope: `${base}/`,
				updateViaCache: 'none'
			});
			let hadController = !!navigator.serviceWorker.controller;
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				// First install: nothing to refresh. Later installs: the page is stale.
				if (hadController) location.reload();
				hadController = true;
			});
			void reg.update();
			setInterval(() => void reg.update(), 60 * 60 * 1000);
		} catch (e) {
			console.warn('service worker registration failed', e);
		}
	}

	const SITE = 'https://resume-builder.okaybro.dev';
	const DESCRIPTION =
		'A free, local-first LaTeX resume builder. Keep one library of everything you have done, compose any number of resumes from it, and compile the PDF in your browser. No accounts, no uploads, works offline.';
	const TITLES: [string, string][] = [
		['/library', 'Library'],
		['/resumes', 'Resumes'],
		['/data', 'Data']
	];

	const path = $derived(page.url.pathname.replace(base, '') || '/');
	const title = $derived.by(() => {
		const hit = TITLES.find(([prefix]) => path.startsWith(prefix));
		return hit
			? `${hit[1]} - Resume Builder`
			: 'Resume Builder - LaTeX resumes, built in your browser';
	});
	const canonical = $derived(`${SITE}${path === '/' ? '/' : path}`);
	const bare = $derived(path === '/' || path === '/debug');

	onMount(async () => {
		if (import.meta.env.DEV)
			(window as unknown as { __rb: unknown }).__rb = { workspace, compiles, ui };
		ui.init();
		if (!import.meta.env.DEV) registerWorker();
		await workspace.load();
		if (!workspace.profile && !bare) await goto(`${base}/`, { replaceState: true });
		// Fetch the engine while the user is still reading; it is cached after the first visit.
		if (workspace.profile) void compiles.warm();
	});

	let scroller = $state<HTMLDivElement>();

	afterNavigate(({ to }) => {
		if (ui.returnTo && !path.startsWith('/library')) ui.returnTo = null;
		// Pages scroll inside the content column, which the router does not reset the
		// way it resets the window; a page must open at its top.
		if (!to?.url.hash) scroller?.scrollTo({ top: 0 });
	});

	const UNDO_LABEL = {
		profile: 'Library change reverted',
		overlay: 'Private fields reverted',
		resumes: 'Resume change reverted',
		settings: 'Settings reverted'
	} as const;
	/** One step may span documents (a library delete also edits resumes); name the first. */
	const undoLabel = (keys: (keyof typeof UNDO_LABEL)[]) =>
		keys.length > 1 ? 'Library and resumes reverted' : UNDO_LABEL[keys[0]];

	function onkeydown(e: KeyboardEvent) {
		const mod = e.metaKey || e.ctrlKey;
		if (!mod) return;
		const tag = (e.target as HTMLElement | null)?.tagName;
		const typing =
			tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable;
		if (e.key.toLowerCase() === 'z' && !typing) {
			// Inside a field the browser's own text undo applies; everywhere else, ours.
			e.preventDefault();
			const keys = e.shiftKey ? workspace.redo() : workspace.undo();
			if (keys.length)
				toast.message(e.shiftKey ? 'Redone' : 'Undone', { description: undoLabel(keys) });
			else toast.message(e.shiftKey ? 'Nothing to redo' : 'Nothing to undo');
		} else if (e.key.toLowerCase() === 'y' && !typing) {
			e.preventDefault();
			const keys = workspace.redo();
			if (keys.length) toast.message('Redone', { description: undoLabel(keys) });
		} else if (e.key === '1' || e.key === '2' || e.key === '3') {
			e.preventDefault();
			void goto(`${base}${['/library', '/resumes', '/data'][Number(e.key) - 1]}`);
		} else if (e.key === '\\') {
			e.preventDefault();
			ui.setPreviewOpen(!ui.previewOpen);
		} else if (e.key.toLowerCase() === 's' && !e.shiftKey) {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('rb:compile'));
		} else if (e.shiftKey && e.key.toLowerCase() === 'd' && !typing) {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('rb:download', { detail: 'pdf' }));
		} else if (e.shiftKey && e.key.toLowerCase() === 't' && !typing) {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('rb:download', { detail: 'tex' }));
		}
	}
</script>

<svelte:window {onkeydown} />

<svelte:head>
	<title>{title}</title>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html pwaInfo?.webManifest.linkTag ?? ''}
	<meta name="description" content={DESCRIPTION} />
	<link rel="canonical" href={canonical} />
	<link rel="apple-touch-icon" href="{base}/icons/icon-192.png" />
	<meta name="theme-color" content="#2f6fed" />
	<!-- Only the landing page is worth indexing: every other route is an empty shell until the browser fills it from IndexedDB. -->
	<meta name="robots" content={bare && path === '/' ? 'index,follow' : 'noindex,nofollow'} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Resume Builder" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={DESCRIPTION} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content="{SITE}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={DESCRIPTION} />
	<meta name="twitter:image" content="{SITE}/og.png" />
</svelte:head>

{#if bare}
	{@render children()}
{:else if !workspace.loaded}
	<div class="flex h-dvh items-center justify-center text-sm text-faint">Loading...</div>
	{@render children()}
{:else}
	<div class="flex h-dvh overflow-hidden">
		<Rail />
		<div class="flex min-w-0 flex-1 flex-col overflow-hidden pb-14 md:pb-0">
			<ReturnBar />
			<!-- Pages scroll here, so the sidebar stays put however long a page is. -->
			<div bind:this={scroller} class="min-h-0 flex-1 overflow-y-auto">{@render children()}</div>
		</div>
	</div>
	<BottomTabs />
{/if}

<Toaster richColors position="bottom-right" closeButton />
