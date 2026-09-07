<script lang="ts">
	import Select from '$lib/components/ui/Select.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import { getTemplate, templateOptions } from '$lib/core/latex';
	import type { Resume } from '$lib/core/schema/types';
	import { applyDensity, currentDensity, setOptions } from '$lib/store/composer';
	import { compiles } from '$lib/store/compile.svelte';

	let { resume, onfit }: { resume: Resume; onfit?: () => void } = $props();
	const t = $derived(getTemplate(resume.template));
	const o = $derived(templateOptions(resume) as Record<string, string | number | boolean>);
	const density = $derived(currentDensity(resume));
	const pages = $derived(compiles.state(resume.id).pages);
	const nextDenser = $derived.by(() => {
		const i = t.density.findIndex((d) => d.id === density);
		return t.density[i + 1] ?? (i === -1 ? t.density[t.density.length - 1] : undefined);
	});
</script>

<section class="rounded-lg border border-border bg-surface">
	<div class="flex items-center justify-between px-3 py-2">
		<h2 class="text-sm font-semibold">Layout</h2>
		<span class="text-xs text-faint">{t.name}</span>
	</div>
	<div class="grid gap-3 border-t border-border px-3 py-3 sm:grid-cols-2">
		<Select
			label="Density"
			value={density ?? 'custom'}
			options={[
				...t.density.map((d) => ({ value: d.id, label: d.label })),
				...(density ? [] : [{ value: 'custom', label: 'Custom' }])
			]}
			onchange={(v) => v !== 'custom' && applyDensity(resume.id, v)}
		/>
		<Select
			label="Paper"
			value={String(o.paper)}
			options={[
				{ value: 'letterpaper', label: 'US Letter' },
				{ value: 'a4paper', label: 'A4' }
			]}
			onchange={(v) => setOptions(resume.id, { paper: v })}
		/>
		<Select
			label="Font size"
			value={String(o.fontSize)}
			options={[
				{ value: '10', label: '10 pt' },
				{ value: '11', label: '11 pt' },
				{ value: '12', label: '12 pt' }
			]}
			onchange={(v) => setOptions(resume.id, { fontSize: Number(v) })}
		/>
		<Select
			label="Dates"
			value={String(o.dateStyle)}
			options={[
				{ value: 'MMM yyyy', label: 'Jun 2025' },
				{ value: 'MMMM yyyy', label: 'June 2025' },
				{ value: 'MM/yyyy', label: '06/2025' },
				{ value: 'yyyy', label: '2025' }
			]}
			onchange={(v) => setOptions(resume.id, { dateStyle: v })}
		/>
		<Select
			label="Margins"
			value={String(o.margins)}
			options={[
				{ value: 'tight', label: 'Tight' },
				{ value: 'default', label: 'Default' },
				{ value: 'roomy', label: 'Roomy' }
			]}
			onchange={(v) => setOptions(resume.id, { margins: v })}
		/>
		<Select
			label="Vertical spacing"
			value={String(o.spacing)}
			options={[
				{ value: 'tight', label: 'Tight' },
				{ value: 'normal', label: 'Normal' }
			]}
			onchange={(v) => setOptions(resume.id, { spacing: v })}
		/>
		<div class="pt-1 sm:col-span-2">
			<Switch
				checked={Boolean(o.underlineLinks)}
				label="Underline links"
				onchange={(v) => setOptions(resume.id, { underlineLinks: v })}
			/>
		</div>
		{#if pages > 1 && nextDenser}
			<div class="rounded-md bg-warn/10 px-3 py-2 text-xs text-warn sm:col-span-2">
				{pages} pages.
				{#if onfit}<button type="button" class="font-medium underline" onclick={onfit}
						>Fit to one page</button
					>, or{/if}
				<button
					type="button"
					class="font-medium underline"
					onclick={() => applyDensity(resume.id, nextDenser.id)}>try "{nextDenser.label}"</button
				> or untick a few bullets.
			</div>
		{/if}
	</div>
</section>
