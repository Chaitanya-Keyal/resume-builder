/**
 * Library (profile) mutations: creating blank entries with ids, removing
 * entries while keeping every resume consistent.
 */
import { formatRef } from '$lib/core/resolve/refs';
import { usedByPrefix } from '$lib/core/resolve/usage';
import { newHighlightId, uniqueSlug } from '$lib/core/schema/ids';
import type {
	Award,
	Certificate,
	Education,
	Engagement,
	Highlight,
	Interest,
	Language,
	Position,
	Profile,
	Project,
	Publication,
	SkillGroup
} from '$lib/core/schema/types';
import { workspace } from './workspace.svelte';

const ws = workspace;

export type ListCollection =
	| 'work'
	| 'volunteer'
	| 'education'
	| 'projects'
	| 'skills'
	| 'awards'
	| 'certificates'
	| 'publications'
	| 'languages'
	| 'interests';

function ids(p: Profile, c: ListCollection): string[] {
	return (p[c] as { id: string }[]).map((i) => i.id);
}

export function newHighlight(text = ''): Highlight {
	return { id: newHighlightId(), text };
}

export function addEngagement(c: 'work' | 'volunteer', name = ''): string {
	let id = '';
	ws.mutateProfile((p) => {
		id = uniqueSlug(name || 'new', ids(p, c));
		const pos: Position = { id: 'role', position: '', highlights: [] };
		const e: Engagement = { id, name, positions: [pos] };
		p[c].unshift(e);
	});
	return id;
}

export function addPosition(c: 'work' | 'volunteer', engagementId: string): string {
	let id = '';
	ws.mutateProfile((p) => {
		const e = p[c].find((x) => x.id === engagementId);
		if (!e) return;
		id = uniqueSlug(
			String(new Date().getFullYear()),
			e.positions.map((x) => x.id)
		);
		e.positions.unshift({ id, position: '', highlights: [] });
	});
	return id;
}

export function removePosition(c: 'work' | 'volunteer', engagementId: string, positionId: string) {
	ws.batch(() => {
		ws.mutateProfile((p) => {
			const e = p[c].find((x) => x.id === engagementId);
			if (!e) return;
			e.positions = e.positions.filter((x) => x.id !== positionId);
		});
		ws.removeRef(formatRef(c, engagementId, positionId));
	});
}

export function addEducation(): string {
	let id = '';
	ws.mutateProfile((p) => {
		id = uniqueSlug('school', ids(p, 'education'));
		const e: Education = { id, institution: '', courses: [], highlights: [] };
		p.education.unshift(e);
	});
	return id;
}

export function addProject(): string {
	let id = '';
	ws.mutateProfile((p) => {
		id = uniqueSlug('project', ids(p, 'projects'));
		const e: Project = { id, name: '', keywords: [], highlights: [] };
		p.projects.unshift(e);
	});
	return id;
}

export function addSkillGroup(): string {
	let id = '';
	ws.mutateProfile((p) => {
		id = uniqueSlug('skills', ids(p, 'skills'));
		const e: SkillGroup = { id, name: '', keywords: [] };
		p.skills.push(e);
	});
	return id;
}

export function addAward(): string {
	let id = '';
	ws.mutateProfile((p) => {
		id = uniqueSlug('award', ids(p, 'awards'));
		const e: Award = { id, title: '' };
		p.awards.unshift(e);
	});
	return id;
}

export function addSimple(c: 'certificates' | 'publications' | 'languages' | 'interests'): string {
	let id = '';
	ws.mutateProfile((p) => {
		id = uniqueSlug(c.slice(0, -1), ids(p, c));
		switch (c) {
			case 'certificates':
				p.certificates.unshift({ id, name: '' } satisfies Certificate);
				break;
			case 'publications':
				p.publications.unshift({ id, name: '' } satisfies Publication);
				break;
			case 'languages':
				p.languages.push({ id, language: '' } satisfies Language);
				break;
			case 'interests':
				p.interests.push({ id, name: '', keywords: [] } satisfies Interest);
				break;
		}
	});
	return id;
}

/** Remove an entry from the library and every resume, as one undo step. Returns how many resumes were touched. */
export function removeEntry(c: ListCollection, id: string): number {
	const touched = usedIn(`${c}:${id}`);
	ws.batch(() => {
		ws.mutateProfile((p) => {
			const list = p[c] as { id: string }[];
			const i = list.findIndex((x) => x.id === id);
			if (i !== -1) list.splice(i, 1);
		});
		ws.removeRef(`${c}:${id}`);
	});
	return touched;
}

export function moveEntry(c: ListCollection, id: string, dir: -1 | 1) {
	ws.mutateProfile((p) => {
		const arr = p[c] as { id: string }[];
		const from = arr.findIndex((i) => i.id === id);
		const to = from + dir;
		if (from < 0 || to < 0 || to >= arr.length) return;
		const [x] = arr.splice(from, 1);
		arr.splice(to, 0, x);
	});
}

/** Move an engagement between work and leadership. */
export function moveEngagement(from: 'work' | 'volunteer', id: string) {
	const to = from === 'work' ? 'volunteer' : 'work';
	ws.batch(() => {
		ws.mutateProfile((p) => {
			const i = p[from].findIndex((e) => e.id === id);
			if (i === -1) return;
			const [e] = p[from].splice(i, 1);
			e.id = uniqueSlug(e.id, ids(p, to));
			p[to].unshift(e);
		});
		ws.removeRef(`${from}:${id}`);
	});
}

/** Highlights removed from a list must also leave every resume that picked them. */
export function syncRemovedHighlights(ref: string, before: Highlight[], after: Highlight[]) {
	const kept = new Set(after.map((h) => h.id));
	ws.batch(() => {
		for (const h of before) if (!kept.has(h.id)) ws.removeRef(ref, h.id);
	});
}

/**
 * A fresh entry's id follows its name, so a project called "Resume Builder" is
 * `resume-builder` rather than `project`. Once any resume references the entry
 * the id is frozen: refs, snapshots and site links all hang off it.
 * Returns the id in force afterwards.
 */
export function syncId(c: ListCollection, id: string, name: string): string {
	if (!name.trim() || usedIn(`${c}:${id}`)) return id;
	let next = id;
	ws.mutateProfile((p) => {
		const list = p[c] as { id: string }[];
		const e = list.find((x) => x.id === id);
		if (!e) return;
		next = uniqueSlug(
			name,
			list.filter((x) => x !== e).map((x) => x.id)
		);
		if (next !== id) e.id = next;
	});
	return next;
}

/** How many resumes use a ref or any of its positions. */
export function usedIn(ref: string): number {
	return usedByPrefix(ws.usage, ref).length;
}
