<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import FirstRun from '$lib/components/data/FirstRun.svelte';
	import { workspace } from '$lib/store/workspace.svelte';

	$effect(() => {
		if (workspace.loaded && workspace.profile) void goto(`${base}/resumes`, { replaceState: true });
	});
</script>

{#if workspace.loaded && !workspace.profile}
	<FirstRun />
{/if}
