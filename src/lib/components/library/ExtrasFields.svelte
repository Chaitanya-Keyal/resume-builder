<script lang="ts">
	// Website-facing extras kept under `x`. Hidden behind a disclosure so the
	// resume-relevant fields stay in front.
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import ChipsInput from '$lib/components/ui/ChipsInput.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import type { EntryX } from '$lib/core/schema/types';
	import { workspace } from '$lib/store/workspace.svelte';

	let {
		x = $bindable<EntryX | undefined>(),
		showStack = true,
		showPeriod = true,
		onchange
	}: { x?: EntryX; showStack?: boolean; showPeriod?: boolean; onchange?: () => void } = $props();

	let open = $state(false);
	function ensure(): EntryX {
		if (!x) x = {};
		return x;
	}
	function set<K extends keyof EntryX>(k: K, v: EntryX[K]) {
		const o = ensure();
		if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) delete o[k];
		else o[k] = v;
		onchange?.();
	}
	const links = $derived(x?.links ?? []);
</script>

{#if workspace.settings.website.enabled}
	<div class="mt-3 rounded-md border border-border">
		<button
			type="button"
			class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted hover:text-text"
			onclick={() => (open = !open)}
			aria-expanded={open}
		>
			<ChevronDown size={13} class="transition-transform {open ? 'rotate-180' : ''}" /> Website fields
			<span class="font-normal text-faint"
				>for a site that reads your profile.json; resumes ignore these</span
			>
		</button>
		{#if open}
			<div class="grid gap-3 border-t border-border px-3 py-3 sm:grid-cols-2">
				<TextField
					label="Slug"
					placeholder="my-project"
					mono
					value={x?.slug ?? ''}
					oninput={(e) => set('slug', (e.currentTarget as HTMLInputElement).value)}
					hint="URL segment on your website."
				/>
				<TextField
					label="One-liner"
					placeholder="lowercase, one clause"
					value={x?.oneLiner ?? ''}
					oninput={(e) => set('oneLiner', (e.currentTarget as HTMLInputElement).value)}
				/>
				{#if showPeriod}
					<TextField
						label="Period label"
						placeholder="Summer 2025 and Summer 2026"
						value={x?.periodLabel ?? ''}
						oninput={(e) => set('periodLabel', (e.currentTarget as HTMLInputElement).value)}
						hint="Free text for your website."
					/>
				{/if}
				{#if showStack}
					<ChipsInput label="Stack" value={x?.stack ?? []} onchange={(v) => set('stack', v)} />
				{/if}
				<div class="sm:col-span-2">
					<span class="mb-1 block text-xs font-medium text-muted">Links</span>
					{#each links as l, i (i)}
						<div class="mb-1.5 grid grid-cols-[1fr_2fr_auto] gap-1.5">
							<TextField
								placeholder="label"
								value={l.label}
								oninput={(e) => {
									const next = links.map((x, j) =>
										j === i ? { ...x, label: (e.currentTarget as HTMLInputElement).value } : x
									);
									set('links', next);
								}}
							/>
							<TextField
								placeholder="https://..."
								mono
								value={l.href}
								oninput={(e) => {
									const next = links.map((x, j) =>
										j === i ? { ...x, href: (e.currentTarget as HTMLInputElement).value } : x
									);
									set('links', next);
								}}
							/>
							<button
								type="button"
								class="px-1 text-xs text-faint hover:text-danger"
								onclick={() =>
									set(
										'links',
										links.filter((_, j) => j !== i)
									)}>remove</button
							>
						</div>
					{/each}
					<button
						type="button"
						class="text-xs text-muted hover:text-text"
						onclick={() => set('links', [...links, { label: 'source', href: '' }])}
						>+ Add link</button
					>
				</div>
				<div class="sm:col-span-2">
					<TextArea
						label="Description"
						rows={2}
						placeholder="A paragraph for your website."
						value={(x?.description as string | undefined) ?? ''}
						oninput={(e) =>
							set('description' as keyof EntryX, (e.currentTarget as HTMLTextAreaElement).value)}
					/>
				</div>
				<div class="sm:col-span-2">
					<Checkbox
						checked={!!x?.hidden}
						label="Hidden from your website"
						onchange={(v) => set('hidden', v || undefined)}
					/>
				</div>
			</div>
		{/if}
	</div>
{/if}
