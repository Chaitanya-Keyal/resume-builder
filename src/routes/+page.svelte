<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import FirstRun from '$lib/components/data/FirstRun.svelte';
	import { workspace } from '$lib/store/workspace.svelte';

	$effect(() => {
		if (workspace.loaded && workspace.profile) void goto(`${base}/resumes`, { replaceState: true });
	});
</script>

<!-- Rendered before the workspace loads as well, so the prerendered page carries
     the landing content; a returning user is redirected the moment it loads. -->
{#if !workspace.profile}
	<FirstRun />
{/if}
