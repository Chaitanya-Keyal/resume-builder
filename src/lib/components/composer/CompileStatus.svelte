<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { compiles } from '$lib/store/compile.svelte';

	let { resumeId, onshowlog }: { resumeId: string; onshowlog: () => void } = $props();
	const s = $derived(compiles.state(resumeId));
	const p = $derived(compiles.progress);
	const mb = (n: number) => (n / 1e6).toFixed(1);
</script>

{#if compiles.engine === 'loading' && p && p.phase !== 'ready'}
	<span
		class="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted"
		aria-live="polite"
	>
		<LoaderCircle size={13} class="animate-spin" />
		<span class="hidden lg:inline"
			>{p.phase === 'engine'
				? 'Starting engine'
				: `Fetching TeX ${mb(p.loaded)} / ${mb(p.total)} MB`}</span
		>
	</span>
{:else if s.status === 'compiling'}
	<span
		class="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted"
		aria-live="polite"
	>
		<LoaderCircle size={13} class="animate-spin" /> <span class="hidden lg:inline">Compiling</span>
	</span>
{:else if s.status === 'error'}
	<button
		type="button"
		class="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap text-danger hover:bg-danger/10"
		onclick={onshowlog}
		title={s.error}
		aria-label="Compile failed"
	>
		<CircleAlert size={13} /> <span class="hidden lg:inline">Compile failed</span>
	</button>
{:else if s.status === 'ok'}
	<button
		type="button"
		class="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap text-muted hover:bg-surface-2"
		onclick={onshowlog}
		title="Show the compile log"
		aria-label="Up to date"
	>
		<CircleCheck size={13} class="text-ok" />
		<span class="hidden lg:inline">{s.stale ? 'From last session' : `Up to date - ${s.ms} ms`}</span
		>
	</button>
{/if}
