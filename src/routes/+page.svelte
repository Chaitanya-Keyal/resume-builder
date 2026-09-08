<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { untrack } from 'svelte';
	import FirstRun from '$lib/components/data/FirstRun.svelte';
	import { workspace } from '$lib/store/workspace.svelte';

	// A returning user goes straight to their resumes. Only the load is watched: when the
	// first-run screen installs a profile it navigates to the new resume by itself.
	$effect(() => {
		if (workspace.loaded && untrack(() => workspace.profile))
			void goto(`${base}/resumes`, { replaceState: true });
	});
</script>

<!-- Rendered before the workspace loads as well, so the prerendered page carries
     the landing content; a returning user is redirected the moment it loads. -->
{#if !workspace.profile}
	<FirstRun />
{/if}
