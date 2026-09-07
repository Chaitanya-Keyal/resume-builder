/**
 * Mutations a composer screen performs on one resume. Thin functions over
 * `workspace.mutateResume`, so the components stay declarative.
 */
import { getTemplate, templateOptions } from '$lib/core/latex';
import { lookupRef } from '$lib/core/resolve/refs';
import { isItemRef } from '$lib/core/resolve/resolve';
import { newId } from '$lib/core/schema/ids';
import type {
	HeaderOptions,
	Highlight,
	ItemRef,
	Profile,
	Resume,
	Section,
	SectionType
} from '$lib/core/schema/types';
import { workspace } from './workspace.svelte';

const ws = workspace;

export function highlightsOf(profile: Profile, ref: string): Highlight[] {
	const hit = lookupRef(profile, ref);
	if (!hit) return [];
	if ('position' in hit) return hit.position.highlights;
	return 'highlights' in hit.item ? hit.item.highlights : [];
}

function section(r: Resume, sectionId: string): Section | undefined {
	return r.sections.find((s) => s.id === sectionId);
}

function itemRef(s: Section, ref: string): ItemRef | undefined {
	return s.items.find((it): it is ItemRef => isItemRef(it) && it.ref === ref);
}

export function setHeader(id: string, patch: Partial<HeaderOptions>) {
	ws.mutateResume(id, (r) => Object.assign(r.header, patch));
}

export function toggleProfile(id: string, network: string) {
	ws.mutateResume(id, (r) => {
		const i = r.header.profiles.indexOf(network);
		if (i === -1) r.header.profiles.push(network);
		else r.header.profiles.splice(i, 1);
	});
}

export function moveProfile(id: string, network: string, dir: -1 | 1) {
	ws.mutateResume(id, (r) => move(r.header.profiles, r.header.profiles.indexOf(network), dir));
}

function move<T>(arr: T[], from: number, dir: -1 | 1) {
	const to = from + dir;
	if (from < 0 || to < 0 || to >= arr.length) return;
	const [x] = arr.splice(from, 1);
	arr.splice(to, 0, x);
}

/** Include an item with every bullet, or drop it. */
export function toggleItem(id: string, sectionId: string, ref: string, highlightIds: string[]) {
	ws.mutateResume(id, (r) => {
		const s = section(r, sectionId);
		if (!s) return;
		const i = s.items.findIndex((it) => isItemRef(it) && it.ref === ref);
		if (i === -1) s.items.push({ ref, bullets: [...highlightIds] });
		else s.items.splice(i, 1);
	});
}

export function moveItem(id: string, sectionId: string, ref: string, dir: -1 | 1) {
	ws.mutateResume(id, (r) => {
		const s = section(r, sectionId);
		if (!s) return;
		move(
			s.items,
			s.items.findIndex((it) => isItemRef(it) && it.ref === ref),
			dir
		);
	});
}

export function reorderItems(id: string, sectionId: string, refs: string[]) {
	ws.mutateResume(id, (r) => {
		const s = section(r, sectionId);
		if (!s) return;
		const byRef = new Map(s.items.filter(isItemRef).map((it) => [it.ref, it]));
		const custom = s.items.filter((it) => !isItemRef(it));
		s.items = [...refs.flatMap((ref) => byRef.get(ref) ?? []), ...custom];
	});
}

/** Toggle one bullet; when adding, keep library order among the included ones. */
export function toggleBullet(
	id: string,
	sectionId: string,
	ref: string,
	hid: string,
	libraryOrder: string[]
) {
	ws.mutateResume(id, (r) => {
		const s = section(r, sectionId);
		const it = s && itemRef(s, ref);
		if (!it) return;
		if (it.bullets.includes(hid)) it.bullets = it.bullets.filter((b) => b !== hid);
		else {
			const next = [...it.bullets, hid];
			const rank = (h: string) => {
				const i = libraryOrder.indexOf(h);
				return i === -1 ? Number.MAX_SAFE_INTEGER : i;
			};
			next.sort((a, b) => rank(a) - rank(b));
			it.bullets = next;
		}
	});
}

export function moveBullet(id: string, sectionId: string, ref: string, hid: string, dir: -1 | 1) {
	ws.mutateResume(id, (r) => {
		const s = section(r, sectionId);
		const it = s && itemRef(s, ref);
		if (it) move(it.bullets, it.bullets.indexOf(hid), dir);
	});
}

export function setBulletOverride(
	id: string,
	sectionId: string,
	ref: string,
	hid: string,
	text: string,
	baseText: string
) {
	ws.mutateResume(id, (r) => {
		const s = section(r, sectionId);
		const it = s && itemRef(s, ref);
		if (!it) return;
		it.overrides ??= {};
		it.overrides.bullets ??= {};
		if (text === baseText) delete it.overrides.bullets[hid];
		else it.overrides.bullets[hid] = { text, baseText, origin: 'user' };
	});
}

export function clearBulletOverride(id: string, sectionId: string, ref: string, hid: string) {
	ws.mutateResume(id, (r) => {
		const s = section(r, sectionId);
		const it = s && itemRef(s, ref);
		if (it?.overrides?.bullets) delete it.overrides.bullets[hid];
	});
}

export function setItemOverride(
	id: string,
	sectionId: string,
	ref: string,
	patch: Record<string, string | undefined>
) {
	ws.mutateResume(id, (r) => {
		const s = section(r, sectionId);
		const it = s && itemRef(s, ref);
		if (!it) return;
		it.overrides ??= {};
		for (const [k, v] of Object.entries(patch)) {
			if (v === undefined || v === '') delete (it.overrides as Record<string, unknown>)[k];
			else (it.overrides as Record<string, unknown>)[k] = v;
		}
	});
}

export function setSectionTitle(id: string, sectionId: string, title: string) {
	ws.mutateResume(id, (r) => {
		const s = section(r, sectionId);
		if (!s) return;
		const def = getTemplate(r.template).sectionTitles[s.type];
		if (!title.trim() || title.trim() === def) delete s.title;
		else s.title = title.trim();
	});
}

export function moveSection(id: string, sectionId: string, dir: -1 | 1) {
	ws.mutateResume(id, (r) =>
		move(
			r.sections,
			r.sections.findIndex((s) => s.id === sectionId),
			dir
		)
	);
}

export function reorderSections(id: string, sectionIds: string[]) {
	ws.mutateResume(id, (r) => {
		const byId = new Map(r.sections.map((s) => [s.id, s]));
		r.sections = sectionIds.flatMap((sid) => byId.get(sid) ?? []);
	});
}

export function removeSection(id: string, sectionId: string) {
	ws.mutateResume(id, (r) => (r.sections = r.sections.filter((s) => s.id !== sectionId)));
}

export function addSection(id: string, type: SectionType, items: ItemRef[] = []): string {
	const sid = newId('sec');
	ws.mutateResume(id, (r) => r.sections.push({ id: sid, type, items }));
	return sid;
}

export function setOptions(id: string, patch: Record<string, unknown>) {
	ws.mutateResume(id, (r) => {
		r.options = { ...templateOptions(r), ...patch };
	});
}

export function applyDensity(id: string, presetId: string) {
	const r = ws.resume(id);
	if (!r) return;
	const preset = getTemplate(r.template).density.find((d) => d.id === presetId);
	if (preset) setOptions(id, preset.options);
}

/** Which density preset the current options match, if any. */
export function currentDensity(r: Resume): string | null {
	const t = getTemplate(r.template);
	const o = templateOptions(r);
	for (const d of t.density) {
		if (Object.entries(d.options).every(([k, v]) => o[k] === v)) return d.id;
	}
	return null;
}

/** Section types the template knows that this resume does not have yet. */
export function missingSectionTypes(r: Resume): SectionType[] {
	const have = new Set(r.sections.map((s) => s.type));
	return getTemplate(r.template).defaultSectionOrder.filter((t) => !have.has(t));
}
