<script lang="ts">
	import { base } from '$app/paths';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import type { Profile, Resume } from '$lib/core/schema/types';
	import { moveProfile, setHeader, toggleProfile } from '$lib/store/composer';
	import { workspace } from '$lib/store/workspace.svelte';

	let { resume, profile }: { resume: Resume; profile: Profile } = $props();

	const h = $derived(resume.header);
	const phone = $derived(workspace.overlay.basics?.phone);
	const ordered = $derived([
		...h.profiles.flatMap((n) =>
			profile.basics.profiles.filter((p) => p.network.toLowerCase() === n.toLowerCase())
		),
		...profile.basics.profiles.filter(
			(p) => !h.profiles.some((n) => n.toLowerCase() === p.network.toLowerCase())
		)
	]);
</script>

<section class="rounded-lg border border-border bg-surface">
	<div class="flex items-center justify-between px-3 py-2">
		<h2 class="text-sm font-semibold">Header</h2>
		<span class="text-xs text-faint">{profile.basics.name || 'No name yet'}</span>
	</div>
	<div class="grid gap-x-6 gap-y-2 border-t border-border px-3 py-3 sm:grid-cols-2">
		<div class="flex flex-col items-start gap-2">
			<Checkbox
				checked={h.showPhone}
				disabled={!phone}
				label={phone ? `Phone - ${phone}` : 'Phone'}
				onchange={(v) => setHeader(resume.id, { showPhone: v })}
			/>
			{#if !phone}
				<p class="-mt-1 ml-6 text-xs text-faint">
					Kept private. <a class="text-accent underline" href="{base}/data">Set it in Data</a>.
				</p>
			{/if}
			<Checkbox
				checked={h.showEmail}
				disabled={!profile.basics.email}
				label={profile.basics.email ? `Email - ${profile.basics.email}` : 'Email'}
				onchange={(v) => setHeader(resume.id, { showEmail: v })}
			/>
			<Checkbox
				checked={h.showUrl}
				disabled={!profile.basics.url}
				label={profile.basics.url ? `Website - ${profile.basics.url}` : 'Website'}
				onchange={(v) => setHeader(resume.id, { showUrl: v })}
			/>
			<Checkbox
				checked={h.showLocation}
				disabled={!profile.basics.location?.city}
				label="Location"
				onchange={(v) => setHeader(resume.id, { showLocation: v })}
			/>
		</div>
		<div class="flex flex-col gap-2">
			{#each ordered as p (p.network)}
				{@const on = h.profiles.some((n) => n.toLowerCase() === p.network.toLowerCase())}
				<div class="flex w-full items-center gap-1">
					<Checkbox
						checked={on}
						label="{p.network} - {p.url.replace(/^https?:\/\//, '')}"
						onchange={() => toggleProfile(resume.id, p.network)}
					/>
					{#if on && h.profiles.length > 1}
						<span class="ml-auto flex">
							<button
								type="button"
								class="p-0.5 text-faint hover:text-text"
								aria-label="Move up"
								onclick={() => moveProfile(resume.id, p.network, -1)}><ArrowUp size={12} /></button
							>
							<button
								type="button"
								class="p-0.5 text-faint hover:text-text"
								aria-label="Move down"
								onclick={() => moveProfile(resume.id, p.network, 1)}><ArrowDown size={12} /></button
							>
						</span>
					{/if}
				</div>
			{/each}
			{#if !profile.basics.profiles.length}
				<p class="text-xs text-faint">No profiles (GitHub, LinkedIn...) in the library yet.</p>
			{/if}
		</div>
		<div class="sm:col-span-2">
			<Checkbox
				checked={h.showTagline}
				label="Tagline"
				onchange={(v) => setHeader(resume.id, { showTagline: v })}
			/>
			{#if h.showTagline}
				<div class="mt-1.5 ml-6">
					<TextField
						value={h.tagline ?? ''}
						placeholder={profile.basics.label || 'A one-line headline'}
						hint={h.tagline
							? 'Overrides the library headline for this resume.'
							: 'Uses the library headline. Type to override for this resume.'}
						oninput={(e) =>
							setHeader(resume.id, {
								tagline: (e.currentTarget as HTMLInputElement).value || undefined
							})}
					/>
				</div>
			{/if}
		</div>
	</div>
</section>
