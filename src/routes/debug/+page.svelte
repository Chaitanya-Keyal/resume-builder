<script lang="ts">
	// Engine smoke test: compiles the bundled fixture with the WASM compiler and
	// reports timings. Driven by scripts/smoke.ts; handy in a browser too.
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import { WasmCompiler, type CompileProgress, type CompileResult } from '$lib/compiler';
	import { renderTex } from '$lib/core/latex';
	import { resolve } from '$lib/core/resolve/resolve';
	import { resumeSchema } from '$lib/core/schema/resume';
	import { parseProfile } from '$lib/core/schema/validate';
	import { overlaySchema } from '$lib/core/schema/workspace';
	import profileJson from '../../../fixtures/sample/profile.json';
	import overlayJson from '../../../fixtures/sample/overlay.json';
	import resumeJson from '../../../fixtures/sample/resume.jake.json';

	let lines = $state<string[]>([]);
	let progress = $state<CompileProgress | null>(null);
	let pdfUrl = $state<string | null>(null);
	const log = (s: string) => (lines = [...lines, s]);

	onMount(async () => {
		const w = window as unknown as { __result: unknown };
		w.__result = null;
		try {
			const { profile } = parseProfile(profileJson);
			const overlay = overlaySchema.parse(overlayJson);
			const resume = resumeSchema.parse(resumeJson);
			const tex = renderTex(resolve(profile, overlay, resume).resolved, resume);

			const compiler = new WasmCompiler(base);
			const t0 = performance.now();
			await compiler.init((p) => (progress = p));
			const tInit = Math.round(performance.now() - t0);
			log(`engine + assets ready in ${tInit} ms`);

			const results: CompileResult[] = [];
			for (let i = 0; i < 3; i++) {
				const r = await compiler.compile(tex);
				results.push(r);
				log(
					`compile #${i + 1}: ok=${r.ok} pages=${r.pages} ${r.ms} ms${r.ok ? '' : ' ' + r.errors.join(' | ')}`
				);
			}
			const last = results[results.length - 1];
			if (last.pdf)
				pdfUrl = URL.createObjectURL(new Blob([last.pdf as BlobPart], { type: 'application/pdf' }));
			w.__result = {
				ok: results.every((r) => r.ok && r.pages === 1),
				init: tInit,
				compiles: results.map((r) => r.ms),
				bytes: last.pdf?.length ?? 0,
				errors: last.errors
			};
		} catch (e) {
			log(`fatal: ${e}`);
			w.__result = { ok: false, error: String(e) };
		}
	});
</script>

<main class="mx-auto max-w-2xl p-8 font-mono text-sm">
	<h1 class="mb-4 text-lg font-semibold">engine smoke</h1>
	{#if progress && progress.phase !== 'ready'}
		<p class="text-muted">
			{progress.phase}: {Math.round((progress.loaded / Math.max(1, progress.total)) * 100)}%
			{progress.detail ?? ''}
		</p>
	{/if}
	<pre>{lines.join('\n')}</pre>
	{#if pdfUrl}
		<p class="mt-4"><a class="text-accent underline" href={pdfUrl} target="_blank">open pdf</a></p>
	{/if}
</main>
