<script lang="ts">
	import { page } from '$app/state';
	import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
	import Plus from '@lucide/svelte/icons/plus';
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import AwardForm from '$lib/components/library/AwardForm.svelte';
	import BasicsForm from '$lib/components/library/BasicsForm.svelte';
	import EducationForm from '$lib/components/library/EducationForm.svelte';
	import EngagementForm from '$lib/components/library/EngagementForm.svelte';
	import EntryCard from '$lib/components/library/EntryCard.svelte';
	import ProjectForm from '$lib/components/library/ProjectForm.svelte';
	import SectionNav from '$lib/components/library/SectionNav.svelte';
	import SimpleForm from '$lib/components/library/SimpleForm.svelte';
	import SkillGroupForm from '$lib/components/library/SkillGroupForm.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { toPlain } from '$lib/core/markup';
	import { parseRef } from '$lib/core/resolve/refs';
	import { formatRange } from '$lib/core/latex/dates';
	import {
		addAward,
		addEducation,
		addEngagement,
		addProject,
		addSimple,
		addSkillGroup,
		moveEngagement,
		moveEntry,
		removeEntry,
		usedIn,
		type ListCollection
	} from '$lib/store/library';
	import { ui } from '$lib/store/ui.svelte';
	import { workspace } from '$lib/store/workspace.svelte';

	let { data } = $props();
	const section = $derived(data.section);
	const profile = $derived(workspace.profile);
	const route = $derived(`/library/${section}`);

	const TITLES: Record<string, { title: string; blurb: string; add: string }> = {
		basics: { title: 'Basics', blurb: 'Who you are and how to reach you.', add: '' },
		work: {
			title: 'Work',
			blurb: 'Each organisation once; each stint at it is a separate entry on a resume.',
			add: 'Add job'
		},
		education: {
			title: 'Education',
			blurb: 'Prints as institution and location, degree line and year.',
			add: 'Add school'
		},
		projects: {
			title: 'Projects',
			blurb: 'Prints as name | stack, then bullets.',
			add: 'Add project'
		},
		leadership: {
			title: 'Leadership & Involvement',
			blurb: 'Clubs, volunteering, teaching. Same shape as work.',
			add: 'Add role'
		},
		skills: {
			title: 'Skills',
			blurb: 'Prints as "Category: a, b, c" lines. A resume picks which categories.',
			add: 'Add category'
		},
		awards: {
			title: 'Awards',
			blurb: 'Prints as title | issuer with the date on the right.',
			add: 'Add award'
		},
		more: { title: 'More', blurb: 'Certifications, publications, languages, interests.', add: '' }
	};

	const range = (s?: string, e?: string, l?: string) =>
		formatRange(
			{ start: s, end: e, label: l },
			{ style: 'MMM yyyy', separator: ' - ', present: 'Present' }
		);

	function expanded(id: string) {
		return ui.isExpanded(route, id);
	}
	function toggle(id: string) {
		ui.toggleExpanded(route, id);
	}
	async function reveal(id: string) {
		ui.setExpanded(route, id);
		await tick();
		document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
	}

	// Arriving from a composer's "edit in library" link: open that entry.
	$effect(() => {
		const ref = page.url.searchParams.get('entry');
		if (!ref) return;
		const p = parseRef(ref);
		if (p) void reveal(p.id);
	});

	function del(c: ListCollection, id: string, label: string) {
		const n = removeEntry(c, id);
		toast.success(`Deleted ${label || 'entry'}`, {
			description: n ? `Removed from ${n} resume${n === 1 ? '' : 's'}.` : undefined,
			action: { label: 'Undo', onClick: () => workspace.undo() }
		});
	}
	async function created(id: string) {
		await reveal(id);
	}
</script>

<div class="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:flex-row md:gap-8 md:p-8">
	<div class="md:sticky md:top-8 md:self-start">
		<SectionNav current={section} />
	</div>

	<div class="min-w-0 flex-1">
		<div class="mb-4 flex items-start justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold tracking-tight">{TITLES[section].title}</h1>
				<p class="text-sm text-muted">{TITLES[section].blurb}</p>
			</div>
			{#if profile && TITLES[section].add}
				<Button
					variant="primary"
					onclick={() => {
						const id =
							section === 'work'
								? addEngagement('work')
								: section === 'leadership'
									? addEngagement('volunteer')
									: section === 'education'
										? addEducation()
										: section === 'projects'
											? addProject()
											: section === 'skills'
												? addSkillGroup()
												: addAward();
						void created(id);
					}}><Plus size={15} /> {TITLES[section].add}</Button
				>
			{/if}
		</div>

		{#if !profile}
			<p class="text-sm text-muted">No profile loaded.</p>
		{:else if section === 'basics'}
			<BasicsForm {profile} />
		{:else if section === 'work' || section === 'leadership'}
			{@const c = section === 'work' ? 'work' : 'volunteer'}
			{@const list = profile[c]}
			<div class="space-y-2">
				{#each list as e, i (e.id)}
					{@const latest = e.positions[0]}
					<EntryCard
						id={e.id}
						title={toPlain(e.name)}
						subtitle={latest
							? [latest.position, range(latest.startDate, latest.endDate, latest.dateLabel)]
									.filter(Boolean)
									.join(' - ') + (e.positions.length > 1 ? ` - ${e.positions.length} stints` : '')
							: undefined}
						expanded={expanded(e.id)}
						usedIn={usedIn(`${c}:${e.id}`)}
						hidden={!!e.x?.hidden}
						canMove={{ up: i > 0, down: i < list.length - 1 }}
						extraMenu={[
							{
								label: c === 'work' ? 'Move to Leadership' : 'Move to Work',
								icon: ArrowRightLeft,
								onSelect: () => moveEngagement(c, e.id)
							}
						]}
						ontoggle={() => toggle(e.id)}
						onmove={(dir) => moveEntry(c, e.id, dir)}
						ondelete={() => del(c, e.id, e.name)}
					>
						<EngagementForm engagement={e} collection={c} />
					</EntryCard>
				{/each}
			</div>
			{#if list.length === 0}
				<EmptyState
					title={section === 'work' ? 'No jobs yet' : 'No roles yet'}
					body={section === 'work'
						? 'Add every job you have had, with every bullet you might ever want. Resumes pick from here.'
						: 'Clubs, volunteering, teaching assistantships. They print like work entries under their own heading.'}
				>
					<Button variant="primary" onclick={() => created(addEngagement(c))}
						><Plus size={15} /> {TITLES[section].add}</Button
					>
				</EmptyState>
			{/if}
		{:else if section === 'education'}
			<div class="space-y-2">
				{#each profile.education as e, i (e.id)}
					<EntryCard
						id={e.id}
						title={e.institution}
						subtitle={[
							e.x?.degreeLine ?? [e.studyType, e.area].filter(Boolean).join(' '),
							range(e.startDate, e.endDate, e.dateLabel)
						]
							.filter(Boolean)
							.join(' - ')}
						expanded={expanded(e.id)}
						usedIn={usedIn(`education:${e.id}`)}
						canMove={{ up: i > 0, down: i < profile.education.length - 1 }}
						ontoggle={() => toggle(e.id)}
						onmove={(dir) => moveEntry('education', e.id, dir)}
						ondelete={() => del('education', e.id, e.institution)}
					>
						<EducationForm education={e} />
					</EntryCard>
				{/each}
			</div>
			{#if profile.education.length === 0}
				<EmptyState title="No education yet"
					><Button variant="primary" onclick={() => created(addEducation())}
						><Plus size={15} /> Add school</Button
					></EmptyState
				>
			{/if}
		{:else if section === 'projects'}
			<div class="space-y-2">
				{#each profile.projects as p, i (p.id)}
					<EntryCard
						id={p.id}
						title={p.name}
						subtitle={[p.keywords.join(', '), range(p.startDate, p.endDate, p.dateLabel)]
							.filter(Boolean)
							.join(' - ')}
						expanded={expanded(p.id)}
						usedIn={usedIn(`projects:${p.id}`)}
						hidden={!!p.x?.hidden}
						canMove={{ up: i > 0, down: i < profile.projects.length - 1 }}
						ontoggle={() => toggle(p.id)}
						onmove={(dir) => moveEntry('projects', p.id, dir)}
						ondelete={() => del('projects', p.id, p.name)}
					>
						<ProjectForm project={p} />
					</EntryCard>
				{/each}
			</div>
			{#if profile.projects.length === 0}
				<EmptyState
					title="No projects yet"
					body="Side projects, hackathons, open-source work. Name, stack, a link and a few bullets."
					><Button variant="primary" onclick={() => created(addProject())}
						><Plus size={15} /> Add project</Button
					></EmptyState
				>
			{/if}
		{:else if section === 'skills'}
			<div class="space-y-2">
				{#each profile.skills as g, i (g.id)}
					<EntryCard
						id={g.id}
						title={g.name}
						subtitle={g.keywords.join(', ')}
						expanded={expanded(g.id)}
						usedIn={usedIn(`skills:${g.id}`)}
						hidden={!!g.x?.hidden}
						canMove={{ up: i > 0, down: i < profile.skills.length - 1 }}
						ontoggle={() => toggle(g.id)}
						onmove={(dir) => moveEntry('skills', g.id, dir)}
						ondelete={() => del('skills', g.id, g.name)}
					>
						<SkillGroupForm group={g} />
					</EntryCard>
				{/each}
			</div>
			{#if profile.skills.length === 0}
				<EmptyState
					title="No skill categories yet"
					body="Languages, Frameworks, Databases, DevOps: one line each on the resume."
					><Button variant="primary" onclick={() => created(addSkillGroup())}
						><Plus size={15} /> Add category</Button
					></EmptyState
				>
			{/if}
		{:else if section === 'awards'}
			<div class="space-y-2">
				{#each profile.awards as a, i (a.id)}
					<EntryCard
						id={a.id}
						title={a.title}
						subtitle={[a.awarder, range(undefined, a.date, a.dateLabel)]
							.filter(Boolean)
							.join(' - ')}
						expanded={expanded(a.id)}
						usedIn={usedIn(`awards:${a.id}`)}
						canMove={{ up: i > 0, down: i < profile.awards.length - 1 }}
						ontoggle={() => toggle(a.id)}
						onmove={(dir) => moveEntry('awards', a.id, dir)}
						ondelete={() => del('awards', a.id, a.title)}
					>
						<AwardForm award={a} />
					</EntryCard>
				{/each}
			</div>
			{#if profile.awards.length === 0}
				<EmptyState title="No awards yet"
					><Button variant="primary" onclick={() => created(addAward())}
						><Plus size={15} /> Add award</Button
					></EmptyState
				>
			{/if}
		{:else}
			{#each [{ c: 'certificates', title: 'Certifications', add: 'Add certification' }, { c: 'publications', title: 'Publications', add: 'Add publication' }, { c: 'languages', title: 'Languages', add: 'Add language' }, { c: 'interests', title: 'Interests', add: 'Add interest' }] as const as group (group.c)}
				<div class="mb-6">
					<div class="mb-2 flex items-center justify-between">
						<h2 class="text-sm font-semibold">{group.title}</h2>
						<Button size="sm" onclick={() => created(addSimple(group.c))}
							><Plus size={13} /> {group.add}</Button
						>
					</div>
					<div class="space-y-2">
						{#each profile[group.c] as it, i (it.id)}
							{@const title = 'name' in it ? it.name : it.language}
							<EntryCard
								id={it.id}
								{title}
								subtitle={'issuer' in it
									? it.issuer
									: 'publisher' in it
										? it.publisher
										: 'fluency' in it
											? it.fluency
											: 'keywords' in it
												? it.keywords.join(', ')
												: undefined}
								expanded={expanded(it.id)}
								usedIn={usedIn(`${group.c}:${it.id}`)}
								canMove={{ up: i > 0, down: i < profile[group.c].length - 1 }}
								ontoggle={() => toggle(it.id)}
								onmove={(dir) => moveEntry(group.c, it.id, dir)}
								ondelete={() => del(group.c, it.id, title)}
							>
								<SimpleForm entry={{ kind: group.c, item: it } as never} />
							</EntryCard>
						{/each}
						{#if profile[group.c].length === 0}
							<p class="text-xs text-faint">None yet.</p>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
