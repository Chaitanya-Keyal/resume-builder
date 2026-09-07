/**
 * Mutations a composer screen performs on one resume. Thin functions over
 * `workspace.mutateResume`, so the components stay declarative.
 */
import { getTemplate, templateOptions } from '$lib/core/latex';
import { toPlain } from '$lib/core/markup';
import { resolve } from '$lib/core/resolve/resolve';
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
		const named = new Set(refs);
		const rest = s.items.filter((it) => !isItemRef(it) || !named.has(it.ref));
		s.items = [...refs.flatMap((ref) => byRef.get(ref) ?? []), ...rest];
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

/** Put the included bullets in exactly this order (drag and drop). */
export function reorderBullets(id: string, sectionId: string, ref: string, hids: string[]) {
	ws.mutateResume(id, (r) => {
		const s = section(r, sectionId);
		const it = s && itemRef(s, ref);
		if (!it) return;
		const have = new Set(it.bullets);
		it.bullets = [
			...hids.filter((h) => have.has(h)),
			...it.bullets.filter((h) => !hids.includes(h))
		];
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
	patch: Record<string, string | boolean | undefined>
) {
	ws.mutateResume(id, (r) => {
		const s = section(r, sectionId);
		const it = s && itemRef(s, ref);
		if (!it) return;
		it.overrides ??= {};
		for (const [k, v] of Object.entries(patch)) {
			if (v === undefined || v === '' || v === false)
				delete (it.overrides as Record<string, unknown>)[k];
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
		// Never lose a section: anything the caller forgot keeps its place at the end.
		const byId = new Map(r.sections.map((s) => [s.id, s]));
		const named = new Set(sectionIds);
		r.sections = [
			...sectionIds.flatMap((sid) => byId.get(sid) ?? []),
			...r.sections.filter((s) => !named.has(s.id))
		];
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

/** The .tex this resume would produce with different template options (for fit probes). */
export function texWith(r: Resume, options: Record<string, unknown>): string | null {
	if (!ws.profile) return null;
	// Plain module, so no runes: a JSON clone strips the state proxies just as well.
	const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
	const { resolved } = resolve(clone(ws.profile), clone(ws.overlay), clone(r));
	const t = getTemplate(r.template);
	const parsed = t.optionsSchema.safeParse({ ...templateOptions(r), ...options });
	return t.render(resolved, parsed.success ? parsed.data : t.defaults);
}

export interface LongBullet {
	sectionId: string;
	ref: string;
	hid: string;
	entry: string;
	text: string;
	chars: number;
}

/** The longest included bullets, the first candidates to cut when a resume runs long. */
export function longestBullets(r: Resume, profile: Profile, n = 6): LongBullet[] {
	const out: LongBullet[] = [];
	for (const s of r.sections)
		for (const it of s.items) {
			if (!isItemRef(it)) continue;
			const hit = lookupRef(profile, it.ref);
			if (!hit) continue;
			const entry =
				'position' in hit
					? hit.engagement.name
					: 'name' in hit.item
						? (hit.item as { name: string }).name
						: 'institution' in hit.item
							? (hit.item as { institution: string }).institution
							: it.ref;
			for (const h of highlightsOf(profile, it.ref)) {
				if (!it.bullets.includes(h.id)) continue;
				const text = toPlain(it.overrides?.bullets?.[h.id]?.text ?? h.text);
				out.push({ sectionId: s.id, ref: it.ref, hid: h.id, entry, text, chars: text.length });
			}
		}
	return out.sort((a, b) => b.chars - a.chars).slice(0, n);
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
