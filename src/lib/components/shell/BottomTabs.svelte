<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Database from '@lucide/svelte/icons/database';
	import Files from '@lucide/svelte/icons/files';

	const items = [
		{ href: '/library', label: 'Library', icon: BookOpen },
		{ href: '/resumes', label: 'Resumes', icon: Files },
		{ href: '/data', label: 'Data', icon: Database }
	];
	const path = $derived(page.url.pathname.replace(base, '') || '/');
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
	aria-label="Primary"
>
	{#each items as it (it.href)}
		{@const active = path === it.href || path.startsWith(it.href + '/')}
		<a
			href="{base}{it.href}"
			aria-current={active ? 'page' : undefined}
			class="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] {active
				? 'text-accent'
				: 'text-muted'}"
		>
			<it.icon size={18} />
			{it.label}
		</a>
	{/each}
</nav>
