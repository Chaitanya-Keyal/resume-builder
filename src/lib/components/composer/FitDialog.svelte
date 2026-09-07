<script lang="ts">
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { getTemplate } from '$lib/core/latex';
	import type { Profile, Resume } from '$lib/core/schema/types';
	import { compiles } from '$lib/store/compile.svelte';
	import {
		applyDensity,
		currentDensity,
		highlightsOf,
		longestBullets,
		texWith,
		toggleBullet,
		type LongBullet
	} from '$lib/store/composer';

	let {
		open = $bindable(false),
		resume,
		profile
	}: { open?: boolean; resume: Resume; profile: Profile } = $props();

	type Status = 'idle' | 'probing' | 'fits' | 'nofit' | 'unavailable';
	let status = $state<Status>('idle');
	let tried = $state<{ label: string; pages: number | null }[]>([]);
	let fitted = $state<string | null>(null);
	let excluded = $state<string[]>([]);

	const pages = $derived(compiles.state(resume.id).pages);
	const longest = $derived<LongBullet[]>(open ? longestBullets(resume, profile, 6) : []);

	/** Step through the denser presets; keep the first one that fits, touch nothing otherwise. */
	async function run() {
		status = 'probing';
		tried = [];
		fitted = null;
		const t = getTemplate(resume.template);
		const i = t.density.findIndex((d) => d.id === currentDensity(resume));
		const candidates = t.density.slice(i + 1);
		for (const d of candidates) {
			const tex = texWith(resume, d.options);
			if (!tex) continue;
			const n = await compiles.probe(tex);
			tried = [...tried, { label: d.label, pages: n }];
			if (n === null) {
				status = 'unavailable';
				return;
			}
			if (n === 1) {
				applyDensity(resume.id, d.id);
				fitted = d.label;
				status = 'fits';
				toast.success(`Fits on one page with "${d.label}"`, {
					action: {
						label: 'Undo',
						onClick: () => applyDensity(resume.id, t.density[i]?.id ?? d.id)
					}
				});
				return;
			}
		}
		status = 'nofit';
	}

	$effect(() => {
		if (open) {
			excluded = [];
			void run();
		} else status = 'idle';
	});

	function exclude(b: LongBullet) {
		toggleBullet(
			resume.id,
			b.sectionId,
			b.ref,
			b.hid,
			highlightsOf(profile, b.ref).map((h) => h.id)
		);
		excluded = [...excluded, b.hid];
	}
</script>

<Dialog bind:open title="Fit to one page" size="md">
	{#if status === 'probing'}
		<p class="flex items-center gap-2 text-sm text-muted">
			<LoaderCircle size={14} class="animate-spin" /> Trying denser layouts...
		</p>
	{:else if status === 'fits'}
		<p class="text-sm">Fits on one page with the "{fitted}" layout. Applied.</p>
	{:else if status === 'unavailable'}
		<p class="text-sm text-muted">The compiler is not available right now, so nothing was tried.</p>
	{:else if status === 'nofit'}
		<p class="text-sm">
			{#if tried.length}
				Still {Math.min(...tried.map((t) => t.pages ?? 99))} pages at the densest layout, so the layout
				was left alone.
			{:else}
				Already at the densest layout.
			{/if}
			Cutting one of the longest bullets is usually enough. Currently {pages} page{pages === 1
				? ''
				: 's'}.
		</p>
		<ul class="mt-3 divide-y divide-border rounded-md border border-border">
			{#each longest as b (b.hid)}
				<li class="flex items-start gap-3 px-3 py-2 {excluded.includes(b.hid) ? 'opacity-40' : ''}">
					<div class="min-w-0 flex-1">
						<p class="text-xs text-muted">{b.entry} - {b.chars} characters</p>
						<p class="text-[13px] leading-snug">{b.text}</p>
					</div>
					<Button size="sm" disabled={excluded.includes(b.hid)} onclick={() => exclude(b)}
						>{excluded.includes(b.hid) ? 'Excluded' : 'Exclude'}</Button
					>
				</li>
			{/each}
		</ul>
	{/if}
	{#if tried.length && status !== 'probing'}
		<p class="mt-3 text-xs text-faint">
			Tried: {tried.map((t) => `${t.label} (${t.pages ?? '?'} pages)`).join(', ')}.
		</p>
	{/if}
	{#snippet footer()}
		{#if status === 'nofit'}
			<Button onclick={run}>Try again</Button>
		{/if}
		<Button variant="primary" onclick={() => (open = false)}>Done</Button>
	{/snippet}
</Dialog>
