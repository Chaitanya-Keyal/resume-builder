<script lang="ts">
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Pencil from '@lucide/svelte/icons/pencil';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import type { LintHint } from '$lib/core/lint';
	import { dragHandle } from 'svelte-dnd-action';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import { toPlain } from '$lib/core/markup';
	import type { BulletOverride, Highlight } from '$lib/core/schema/types';

	let {
		highlight,
		included,
		hints = [],
		override,
		canMove,
		ontoggle,
		onmove,
		onoverride,
		onrevert
	}: {
		highlight: Highlight;
		included: boolean;
		hints?: LintHint[];
		override?: BulletOverride;
		canMove: { up: boolean; down: boolean };
		ontoggle: () => void;
		onmove: (dir: -1 | 1) => void;
		onoverride: (text: string) => void;
		onrevert: () => void;
	} = $props();

	let editing = $state(false);
	let draft = $state('');
	const text = $derived(override?.text ?? highlight.text);
	const stale = $derived(override && override.baseText !== highlight.text);

	function startEdit() {
		draft = text;
		editing = true;
	}
</script>

<div class="group flex items-start gap-2 py-1 pl-7 {included ? '' : 'opacity-50'}">
	{#if included}
		<span
			use:dragHandle
			class="mt-0.5 -ml-5 cursor-grab text-faint hover:text-text active:cursor-grabbing"
			aria-label="Drag to reorder"
			title="Drag to reorder"><GripVertical size={13} /></span
		>
	{/if}
	<Checkbox
		checked={included}
		aria-label={included ? 'Exclude this bullet' : 'Include this bullet'}
		onchange={ontoggle}
	/>
	<div class="min-w-0 flex-1">
		{#if editing}
			<TextArea
				bind:value={draft}
				rows={2}
				oninput={() => onoverride(draft)}
				onblur={() => (editing = false)}
				onkeydown={(e) => {
					if (e.key === 'Escape') editing = false;
				}}
				hint="Only this resume. **bold**, _italic_, [link](url)."
			/>
		{:else}
			<p class="text-[13px] leading-snug">
				{#if hints.length}<span
						class="mr-1 inline-flex align-middle {hints.some((h) => h.level === 'warn')
							? 'text-warn'
							: 'text-faint'}"
						title={hints.map((h) => h.message).join('\n')}><CircleAlert size={12} /></span
					>{/if}{toPlain(text)}
				{#if override}
					<Badge tone={stale ? 'warn' : 'accent'} class="ml-1 align-middle"
						>{stale ? 'library changed' : 'edited'}</Badge
					>
				{/if}
			</p>
		{/if}
	</div>
	<div
		class="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
	>
		{#if included}
			<button
				type="button"
				class="p-0.5 text-faint hover:text-text disabled:opacity-30"
				aria-label="Move up"
				disabled={!canMove.up}
				onclick={() => onmove(-1)}><ArrowUp size={13} /></button
			>
			<button
				type="button"
				class="p-0.5 text-faint hover:text-text disabled:opacity-30"
				aria-label="Move down"
				disabled={!canMove.down}
				onclick={() => onmove(1)}><ArrowDown size={13} /></button
			>
			<button
				type="button"
				class="p-0.5 text-faint hover:text-text"
				aria-label="Edit for this resume"
				title="Reword for this resume only"
				onclick={startEdit}><Pencil size={13} /></button
			>
			{#if override}
				<button
					type="button"
					class="p-0.5 text-faint hover:text-text"
					aria-label="Revert to library text"
					title="Revert to the library text"
					onclick={onrevert}><RotateCcw size={13} /></button
				>
			{/if}
		{/if}
	</div>
</div>
