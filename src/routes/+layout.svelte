<script lang="ts">
	import './layout.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<title>Resume Builder</title>
</svelte:head>

{@render children()}
