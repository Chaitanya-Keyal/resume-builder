<script lang="ts">
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import { tick } from 'svelte';
	import { escapedCharsIn, toLatex } from '$lib/core/markup';
	import type { Highlight } from '$lib/core/schema/types';
	import { newHighlight } from '$lib/store/library';

	let {
		highlights,
		label = 'Bullets',
		hint = 'One achievement per line. **bold**, _italic_, [link](https://…). Special characters are escaped for you.',
		onchange
	}: {
		highlights: Highlight[];
		label?: string;
		hint?: string;
		onchange: (next: Highlight[]) => void;
	} = $props();

	let peek = $state<string | null>(null);
	let areas = $state<Record<string, HTMLTextAreaElement>>({});

	function grow(el: HTMLTextAreaElement) {
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight}px`;
	}
	function update(i: number, text: string) {
		const next = highlights.map((h, j) => (j === i ? { ...h, text } : h));
		onchange(next);
	}
	async function add(after = highlights.length - 1) {
		const h = newHighlight();
		const next = [...highlights];
		next.splice(after + 1, 0, h);
		onchange(next);
		await tick();
		areas[h.id]?.focus();
	}
	async function remove(i: number) {
		const next = highlights.filter((_, j) => j !== i);
		onchange(next);
		await tick();
		const prev = next[Math.max(0, i - 1)];
		if (prev) areas[prev.id]?.focus();
	}
	function move(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= highlights.length) return;
		const next = [...highlights];
		[next[i], next[j]] = [next[j], next[i]];
		onchange(next);
	}
	function toggleHidden(i: number) {
		onchange(highlights.map((h, j) => (j === i ? { ...h, hidden: !h.hidden || undefined } : h)));
	}
	function onkeydown(e: KeyboardEvent, i: number) {
		const el = e.currentTarget as HTMLTextAreaElement;
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			void add(i);
		} else if (e.key === 'Backspace' && el.value === '') {
			e.preventDefault();
			void remove(i);
		} else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
			e.preventDefault();
			move(i, e.key === 'ArrowUp' ? -1 : 1);
		}
	}
	const escaped = (t: string) => escapedCharsIn(t);
</script>

<div>
	<div class="mb-1 flex items-center justify-between">
		<span class="text-xs font-medium text-muted">{label}</span>
		<span class="text-[11px] text-faint"
			>Enter adds · Backspace on empty removes · Alt+↑/↓ moves</span
		>
	</div>
	<ul class="space-y-1.5">
		{#each highlights as h, i (h.id)}
			<li class="group flex items-start gap-1.5">
				<span class="mt-2 w-3 text-center text-xs text-faint select-none">•</span>
				<div class="min-w-0 flex-1">
					<textarea
						bind:this={areas[h.id]}
						value={h.text}
						rows={1}
						placeholder="Did what, how, with what result"
						oninput={(e) => {
							grow(e.currentTarget);
							update(i, e.currentTarget.value);
						}}
						onfocus={(e) => grow(e.currentTarget)}
						onkeydown={(e) => onkeydown(e, i)}
						class="block w-full resize-none rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm leading-relaxed outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-accent)_25%,transparent)] {h.hidden
							? 'opacity-60'
							: ''}"></textarea>
					{#if peek === h.id}
						<pre
							class="mt-1 overflow-x-auto rounded-md bg-surface-2 px-2 py-1 font-mono text-[11px] whitespace-pre-wrap">\resumeItem{'{'}{toLatex(
								h.text
							)}{'}'}</pre>
					{:else if escaped(h.text).length}
						<p class="mt-0.5 text-[11px] text-faint">
							{escaped(h.text).join(' ')} escaped for LaTeX.
						</p>
					{/if}
				</div>
				<span
					class="mt-1 flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
				>
					<button
						type="button"
						class="p-0.5 text-faint hover:text-text"
						aria-label="Move up"
						onclick={() => move(i, -1)}><ArrowUp size={13} /></button
					>
					<button
						type="button"
						class="p-0.5 text-faint hover:text-text"
						aria-label="Move down"
						onclick={() => move(i, 1)}><ArrowDown size={13} /></button
					>
					<button
						type="button"
						class="p-0.5 {h.hidden ? 'text-warn' : 'text-faint hover:text-text'}"
						aria-label={h.hidden ? 'Shown on the portfolio' : 'Hide from the portfolio'}
						title={h.hidden
							? 'Hidden from the portfolio; still selectable in resumes'
							: 'Hide from the portfolio (resume-only bullet)'}
						onclick={() => toggleHidden(i)}
						>{#if h.hidden}<EyeOff size={13} />{:else}<Eye size={13} />{/if}</button
					>
					<button
						type="button"
						class="p-0.5 font-mono text-[10px] {peek === h.id
							? 'text-accent'
							: 'text-faint hover:text-text'}"
						aria-label="Show the LaTeX"
						title="Show the LaTeX"
						onclick={() => (peek = peek === h.id ? null : h.id)}>TeX</button
					>
					<button
						type="button"
						class="p-0.5 text-faint hover:text-danger"
						aria-label="Remove"
						onclick={() => remove(i)}><X size={13} /></button
					>
				</span>
			</li>
		{/each}
	</ul>
	<button
		type="button"
		class="mt-1.5 inline-flex items-center gap-1 text-xs text-muted hover:text-text"
		onclick={() => add()}><Plus size={13} /> Add bullet</button
	>
	{#if hint}<p class="mt-1 text-[11px] text-faint">{hint}</p>{/if}
</div>
