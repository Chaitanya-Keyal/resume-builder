<script lang="ts">
	import './layout.css';
	import { afterNavigate, goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { onMount, type Snippet } from 'svelte';
	import { Toaster, toast } from 'svelte-sonner';
	import { pwaInfo } from 'virtual:pwa-info';
	import { registerSW } from 'virtual:pwa-register';
	import BottomTabs from '$lib/components/shell/BottomTabs.svelte';
	import Rail from '$lib/components/shell/Rail.svelte';
	import ReturnBar from '$lib/components/shell/ReturnBar.svelte';
	import { compiles } from '$lib/store/compile.svelte';
	import { ui } from '$lib/store/ui.svelte';
	import { workspace } from '$lib/store/workspace.svelte';

	let { children }: { children: Snippet } = $props();

	const path = $derived(page.url.pathname.replace(base, '') || '/');
	const bare = $derived(path === '/' || path === '/debug');

	onMount(async () => {
		if (import.meta.env.DEV)
			(window as unknown as { __rb: unknown }).__rb = { workspace, compiles, ui };
		ui.init();
		if (!import.meta.env.DEV) registerSW({ immediate: true });
		await workspace.load();
		compiles.configure();
		if (!workspace.profile && !bare) await goto(`${base}/`, { replaceState: true });
		// Fetch the engine while the user is still reading; it is cached after the first visit.
		if (workspace.profile) void compiles.warm();
	});

	afterNavigate(() => {
		if (ui.returnTo && !path.startsWith('/library')) ui.returnTo = null;
	});

	const UNDO_LABEL = {
		profile: 'Library change reverted',
		overlay: 'Private fields reverted',
		resumes: 'Resume change reverted',
		settings: 'Settings reverted'
	} as const;

	function onkeydown(e: KeyboardEvent) {
		const mod = e.metaKey || e.ctrlKey;
		if (!mod) return;
		const tag = (e.target as HTMLElement | null)?.tagName;
		const typing =
			tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable;
		if (e.key.toLowerCase() === 'z' && !typing) {
			// Inside a field the browser's own text undo applies; everywhere else, ours.
			e.preventDefault();
			const key = e.shiftKey ? workspace.redo() : workspace.undo();
			if (key) toast.message(e.shiftKey ? 'Redone' : 'Undone', { description: UNDO_LABEL[key] });
			else toast.message(e.shiftKey ? 'Nothing to redo' : 'Nothing to undo');
		} else if (e.key.toLowerCase() === 'y' && !typing) {
			e.preventDefault();
			const key = workspace.redo();
			if (key) toast.message('Redone', { description: UNDO_LABEL[key] });
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
	<title>Resume Builder</title>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html pwaInfo?.webManifest.linkTag ?? ''}
	<meta
		name="description"
		content="A local-first LaTeX resume builder. Keep one library of everything you have done, compose resumes from it, and compile the PDF in your browser."
	/>
</svelte:head>

{#if !workspace.loaded}
	<div class="flex h-dvh items-center justify-center text-sm text-faint">Loading...</div>
{:else if bare}
	{@render children()}
{:else}
	<div class="flex h-dvh overflow-hidden">
		<Rail />
		<div class="flex min-w-0 flex-1 flex-col overflow-hidden pb-14 md:pb-0">
			<ReturnBar />
			<!-- Pages scroll here, so the sidebar stays put however long a page is. -->
			<div class="min-h-0 flex-1 overflow-y-auto">{@render children()}</div>
		</div>
	</div>
	<BottomTabs />
{/if}

<Toaster richColors position="bottom-right" closeButton />
