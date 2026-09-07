<script lang="ts">
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import ZoomIn from '@lucide/svelte/icons/zoom-in';
	import ZoomOut from '@lucide/svelte/icons/zoom-out';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { closePdf, openPdf, pageWidth, renderPage, type PDFDocumentProxy } from '$lib/pdf/viewer';
	import { compiles } from '$lib/store/compile.svelte';

	let { resumeId }: { resumeId: string } = $props();
	const s = $derived(compiles.state(resumeId));

	let container = $state<HTMLDivElement>();
	let containerWidth = $state(0);
	let zoom = $state<number | 'fit'>('fit');
	let doc = $state<PDFDocumentProxy | null>(null);
	let pageCount = $state(0);
	let canvases: HTMLCanvasElement[] = $state([]);
	let ptWidth = $state(612);
	let rendering = false;
	let rerender = false;

	const scale = $derived(zoom === 'fit' ? Math.max(0.2, (containerWidth - 32) / ptWidth) : zoom);

	// Open the document whenever new bytes arrive.
	$effect(() => {
		const bytes = s.pdf;
		if (!bytes) return;
		let cancelled = false;
		void (async () => {
			const d = await openPdf(bytes);
			if (cancelled) {
				void closePdf(d);
				return;
			}
			ptWidth = await pageWidth(d);
			if (doc) void closePdf(doc);
			doc = d;
			pageCount = d.numPages;
		})();
		return () => {
			cancelled = true;
		};
	});

	// Render every page whenever the document or the scale changes.
	$effect(() => {
		const d = doc;
		const sc = scale;
		const els = canvases.slice(0, pageCount);
		if (!d || els.length !== pageCount || els.some((c) => !c)) return;
		void draw(d, sc, els);
	});

	async function draw(d: PDFDocumentProxy, sc: number, els: HTMLCanvasElement[]) {
		if (rendering) {
			rerender = true;
			return;
		}
		rendering = true;
		try {
			for (let i = 0; i < els.length; i++) await renderPage(d, i + 1, els[i], sc);
		} catch {
			/* document replaced mid-render */
		} finally {
			rendering = false;
			if (rerender) {
				rerender = false;
				if (doc) void draw(doc, scale, canvases.slice(0, pageCount));
			}
		}
	}

	$effect(() => {
		if (!container) return;
		const ro = new ResizeObserver(([e]) => (containerWidth = e.contentRect.width));
		ro.observe(container);
		return () => ro.disconnect();
	});

	function zoomBy(f: number) {
		zoom = Math.min(4, Math.max(0.3, scale * f));
	}
	const p = $derived(compiles.progress);
</script>

<div class="flex h-full min-w-0 flex-col bg-surface-2">
	<div class="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-surface px-2">
		<span class="text-xs text-muted">Preview</span>
		{#if pageCount}<span class="text-xs text-faint"
				>- {pageCount} page{pageCount === 1 ? '' : 's'}</span
			>{/if}
		<span class="flex-1"></span>
		<IconButton size="sm" label="Zoom out" onclick={() => zoomBy(1 / 1.2)}
			><ZoomOut size={14} /></IconButton
		>
		<span class="w-10 text-center text-xs text-faint tabular-nums">{Math.round(scale * 100)}%</span>
		<IconButton size="sm" label="Zoom in" onclick={() => zoomBy(1.2)}
			><ZoomIn size={14} /></IconButton
		>
		<IconButton size="sm" label="Fit width" active={zoom === 'fit'} onclick={() => (zoom = 'fit')}
			><Maximize2 size={14} /></IconButton
		>
		{#if s.pdfUrl}
			<a
				href={s.pdfUrl}
				target="_blank"
				rel="noopener"
				class="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
				aria-label="Open in new tab"
				title="Open in new tab"><ExternalLink size={14} /></a
			>
		{/if}
	</div>
	<div bind:this={container} class="relative min-h-0 flex-1 overflow-auto p-4">
		{#if pageCount}
			<div
				class="mx-auto flex w-max flex-col gap-4 transition-opacity {s.status === 'compiling' ||
				s.stale
					? 'opacity-60'
					: ''}"
			>
				{#each Array.from({ length: pageCount }, (_, i) => i) as i (i)}
					<canvas bind:this={canvases[i]} class="bg-white shadow-md ring-1 ring-black/10"></canvas>
				{/each}
			</div>
		{:else}
			<div
				class="mx-auto aspect-[8.5/11] w-full max-w-[560px] animate-pulse rounded-sm bg-white/70 shadow-md ring-1 ring-black/5 dark:bg-white/10"
			></div>
			<p class="absolute inset-x-0 top-1/2 text-center text-sm text-muted">
				{#if compiles.engine === 'loading' && p && p.phase !== 'ready'}
					Downloading the LaTeX engine, once ({(p.loaded / 1e6).toFixed(1)} of {(
						p.total / 1e6
					).toFixed(1)} MB)...
				{:else if s.status === 'error'}
					<span class="text-danger">Compile failed. See the log.</span>
				{:else}
					Compiling your first PDF...
				{/if}
			</p>
		{/if}
		{#if s.status === 'compiling' && pageCount}
			<div
				class="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface/90 px-3 py-1 text-xs text-muted shadow"
			>
				Compiling...
			</div>
		{:else if s.stale && pageCount}
			<div
				class="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface/90 px-3 py-1 text-xs text-warn shadow"
			>
				From your last session
			</div>
		{/if}
	</div>
</div>
