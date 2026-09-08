<script lang="ts">
	import X from '@lucide/svelte/icons/x';

	let {
		value = $bindable<string[]>([]),
		label,
		placeholder = 'Type and press Enter',
		hint,
		id = `c_${Math.random().toString(36).slice(2, 8)}`,
		onchange
	}: {
		value?: string[];
		label?: string;
		placeholder?: string;
		hint?: string;
		id?: string;
		onchange?: (v: string[]) => void;
	} = $props();

	let draft = $state('');
	let input = $state<HTMLInputElement>();
	let dragging = $state<number | null>(null);
	let over = $state<number | null>(null);

	function set(next: string[]) {
		value = next;
		onchange?.(value);
	}
	function commit() {
		const parts = draft
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		if (parts.length) set([...value, ...parts.filter((p) => !value.includes(p))]);
		draft = '';
	}
	function remove(i: number) {
		set(value.filter((_, j) => j !== i));
	}
	function move(from: number, to: number) {
		if (from === to || to < 0 || to >= value.length) return;
		const next = [...value];
		const [chip] = next.splice(from, 1);
		next.splice(to, 0, chip);
		set(next);
	}
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			commit();
		} else if (e.key === 'Backspace' && !draft && value.length) {
			remove(value.length - 1);
		}
	}
	/** A focused chip moves with Alt+Left/Right, and Delete removes it. */
	function onchipkey(e: KeyboardEvent, i: number) {
		if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
			e.preventDefault();
			const to = i + (e.key === 'ArrowLeft' ? -1 : 1);
			move(i, to);
			queueMicrotask(() => chips[to]?.focus());
		} else if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault();
			remove(i);
			input?.focus();
		}
	}
	let chips = $state<HTMLElement[]>([]);
</script>

<div>
	{#if label}<label for={id} class="mb-1 block text-xs font-medium text-muted">{label}</label>{/if}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-1 focus-within:border-accent focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--color-accent)_25%,transparent)]"
		onclick={() => input?.focus()}
	>
		{#each value as chip, i (i)}
			<!-- A chip is a focusable, draggable list item: the listeners are the reordering controls. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
			<span
				bind:this={chips[i]}
				draggable="true"
				tabindex="0"
				role="listitem"
				title="Drag to reorder. Alt+Left/Right moves, Delete removes."
				class="inline-flex h-6 cursor-grab items-center gap-1 rounded-md bg-surface-2 pr-1 pl-2 text-[13px] outline-none select-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing {dragging ===
				i
					? 'opacity-40'
					: ''} {over === i && dragging !== null && dragging !== i ? 'ring-2 ring-accent' : ''}"
				ondragstart={(e) => {
					dragging = i;
					e.dataTransfer?.setData('text/plain', chip);
					if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
				}}
				ondragover={(e) => {
					e.preventDefault();
					over = i;
				}}
				ondragleave={() => {
					if (over === i) over = null;
				}}
				ondrop={(e) => {
					e.preventDefault();
					if (dragging !== null) move(dragging, i);
					dragging = null;
					over = null;
				}}
				ondragend={() => {
					dragging = null;
					over = null;
				}}
				onkeydown={(e) => onchipkey(e, i)}
				onclick={(e) => e.stopPropagation()}
			>
				{chip}
				<button
					type="button"
					class="rounded p-0.5 text-muted hover:text-danger"
					aria-label="Remove {chip}"
					tabindex="-1"
					onclick={(e) => {
						e.stopPropagation();
						remove(i);
					}}><X size={12} /></button
				>
			</span>
		{/each}
		<input
			{id}
			bind:this={input}
			bind:value={draft}
			{placeholder}
			onblur={commit}
			{onkeydown}
			class="h-6 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-faint"
		/>
	</div>
	{#if hint}<span class="mt-1 block text-xs text-faint">{hint}</span>{/if}
</div>
