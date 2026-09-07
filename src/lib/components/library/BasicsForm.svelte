<script lang="ts">
	import { base } from '$app/paths';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import Button from '$lib/components/ui/Button.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import type { Profile } from '$lib/core/schema/types';
	import { workspace } from '$lib/store/workspace.svelte';

	let { profile }: { profile: Profile } = $props();
	const b = $derived(profile.basics);
	const touch = () => workspace.touch('profile');
	const phone = $derived(workspace.overlay.basics?.phone);
</script>

<div class="space-y-5">
	<section class="rounded-lg border border-border bg-surface p-4">
		<h2 class="mb-3 text-sm font-semibold">Identity</h2>
		<div class="grid gap-3 sm:grid-cols-2">
			<TextField label="Full name" bind:value={b.name} oninput={touch} />
			<TextField
				label="Headline"
				placeholder="Backend Systems | AI Engineering | Open Source"
				bind:value={b.label}
				oninput={touch}
				hint="Printed under your contact line."
			/>
			<TextField label="Email" type="email" bind:value={b.email} oninput={touch} />
			<TextField label="Website" placeholder="https://..." bind:value={b.url} oninput={touch} />
			<div class="sm:col-span-2">
				<TextArea
					label="Summary"
					rows={2}
					bind:value={b.summary}
					oninput={touch}
					hint="Not printed by the default template; a website can use it."
				/>
			</div>
			<div class="sm:col-span-2">
				<span class="mb-1 block text-xs font-medium text-muted">Phone</span>
				<p class="text-sm text-muted">
					{#if phone}<span class="font-mono text-text">{phone}</span> -
					{/if}
					Kept out of the public profile.
					<a class="text-accent underline" href="{base}/data">Edit in Data -> Private</a>.
				</p>
			</div>
		</div>
	</section>

	<section class="rounded-lg border border-border bg-surface p-4">
		<h2 class="mb-1 text-sm font-semibold">Location</h2>
		<p class="mb-3 text-xs text-muted">Optional. Some templates print city and country.</p>
		<div class="grid gap-3 sm:grid-cols-3">
			<TextField
				label="City"
				value={b.location?.city ?? ''}
				oninput={(e) => {
					b.location = { ...b.location, city: (e.currentTarget as HTMLInputElement).value };
					touch();
				}}
			/>
			<TextField
				label="Region"
				value={b.location?.region ?? ''}
				oninput={(e) => {
					b.location = { ...b.location, region: (e.currentTarget as HTMLInputElement).value };
					touch();
				}}
			/>
			<TextField
				label="Country code"
				placeholder="IN"
				value={b.location?.countryCode ?? ''}
				oninput={(e) => {
					b.location = { ...b.location, countryCode: (e.currentTarget as HTMLInputElement).value };
					touch();
				}}
			/>
		</div>
	</section>

	<section class="rounded-lg border border-border bg-surface p-4">
		<h2 class="mb-1 text-sm font-semibold">Profiles</h2>
		<p class="mb-3 text-xs text-muted">
			GitHub, LinkedIn, and the like. Each resume picks which to print and in what order.
		</p>
		<div class="space-y-2">
			{#each b.profiles as p, i (i)}
				<div class="grid grid-cols-[1fr_1fr_2fr_auto] items-end gap-2">
					<TextField
						label={i === 0 ? 'Network' : undefined}
						placeholder="GitHub"
						bind:value={p.network}
						oninput={touch}
					/>
					<TextField
						label={i === 0 ? 'Username' : undefined}
						placeholder="janedoe"
						bind:value={p.username}
						oninput={touch}
					/>
					<TextField
						label={i === 0 ? 'URL' : undefined}
						placeholder="https://github.com/janedoe"
						mono
						bind:value={p.url}
						oninput={touch}
					/>
					<button
						type="button"
						class="mb-1.5 p-1 text-faint hover:text-danger"
						aria-label="Remove profile"
						onclick={() => {
							b.profiles.splice(i, 1);
							touch();
						}}><X size={14} /></button
					>
				</div>
			{/each}
			<Button
				size="sm"
				onclick={() => {
					b.profiles.push({ network: '', url: '' });
					touch();
				}}><Plus size={13} /> Add profile</Button
			>
		</div>
	</section>

	<section class="rounded-lg border border-border bg-surface p-4">
		<h2 class="mb-1 text-sm font-semibold">Website fields</h2>
		<p class="mb-3 text-xs text-muted">
			Only a site that reads your profile.json uses these. Resumes ignore them.
		</p>
		<div class="grid gap-3 sm:grid-cols-2">
			<TextField
				label="Handle"
				placeholder="okaybro"
				value={b.x?.handle ?? ''}
				oninput={(e) => {
					b.x = { ...b.x, handle: (e.currentTarget as HTMLInputElement).value || undefined };
					touch();
				}}
			/>
			<TextField
				label="Short tagline"
				placeholder="backend systems - ai agents - open source"
				value={b.x?.tagline ?? ''}
				oninput={(e) => {
					b.x = { ...b.x, tagline: (e.currentTarget as HTMLInputElement).value || undefined };
					touch();
				}}
			/>
			<TextField
				label="Role"
				placeholder="AI engineering intern - open-source developer"
				value={b.x?.role ?? ''}
				oninput={(e) => {
					b.x = { ...b.x, role: (e.currentTarget as HTMLInputElement).value || undefined };
					touch();
				}}
			/>
			<TextField
				label="Status"
				placeholder="Open to Summer 2027 internships"
				value={b.x?.status ?? ''}
				oninput={(e) => {
					b.x = { ...b.x, status: (e.currentTarget as HTMLInputElement).value || undefined };
					touch();
				}}
			/>
			<TextField
				label="Site repository"
				placeholder="https://github.com/..."
				mono
				value={b.x?.repo ?? ''}
				oninput={(e) => {
					b.x = { ...b.x, repo: (e.currentTarget as HTMLInputElement).value || undefined };
					touch();
				}}
			/>
		</div>
	</section>
</div>
