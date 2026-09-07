import { getTemplate } from '../latex';
import { newId } from '../schema/ids';
import type { ItemRef, Profile, Resume, Section, SectionType } from '../schema/types';
import { listRefs } from './refs';
import { isItemRef } from './resolve';

export interface NewResumeOptions {
	name: string;
	labels?: string[];
	template?: string;
	/** `all`: every library item and bullet; `empty`: sections with nothing picked; `copy`: clone `from`. */
	mode: 'all' | 'empty' | 'copy';
	from?: Resume;
	now?: string;
}

/** A section holding every item of one type, all bullets selected. */
export function fullSection(profile: Profile, type: Exclude<SectionType, 'custom'>): Section {
	return {
		id: newId('sec'),
		type,
		items: listRefs(profile, type).map<ItemRef>((r) => ({ ref: r.ref, bullets: r.highlightIds }))
	};
}

export function createResume(profile: Profile, o: NewResumeOptions): Resume {
	const now = o.now ?? new Date().toISOString();
	const templateId = o.template ?? o.from?.template ?? 'jake';
	const t = getTemplate(templateId);
	if (o.mode === 'copy' && o.from) {
		const copy: Resume = JSON.parse(JSON.stringify(o.from));
		return {
			...copy,
			id: newId('res'),
			name: o.name,
			labels: o.labels ?? copy.labels,
			createdAt: now,
			updatedAt: now
		};
	}
	const sections: Section[] = [];
	for (const type of t.defaultSectionOrder) {
		if (type === 'custom') continue;
		const s = fullSection(profile, type);
		if (o.mode === 'empty') s.items = [];
		if (s.items.length || o.mode === 'empty') sections.push(s);
	}
	return {
		id: newId('res'),
		name: o.name,
		labels: o.labels ?? [],
		createdAt: now,
		updatedAt: now,
		template: t.id,
		options: { ...t.defaults },
		header: {
			showPhone: true,
			showEmail: true,
			showUrl: false,
			showLocation: false,
			showTagline: true,
			profiles: profile.basics.profiles.map((p) => p.network)
		},
		sections
	};
}

/** Title shown for a section: the composition's own, else the template's default. */
export function sectionTitle(resume: Pick<Resume, 'template'>, section: Section): string {
	return section.title ?? getTemplate(resume.template).sectionTitles[section.type] ?? 'Section';
}

/** Remove every reference to a library item (and optionally one bullet) from all resumes. Returns changed resume ids. */
export function stripRef(resumes: Resume[], ref: string, hid?: string): string[] {
	const changed: string[] = [];
	for (const r of resumes) {
		let touched = false;
		for (const s of r.sections) {
			if (hid) {
				for (const it of s.items) {
					if (!isItemRef(it) || it.ref !== ref) continue;
					const before = it.bullets.length;
					it.bullets = it.bullets.filter((b) => b !== hid);
					if (it.overrides?.bullets?.[hid]) delete it.overrides.bullets[hid];
					if (it.bullets.length !== before) touched = true;
				}
			} else {
				const before = s.items.length;
				s.items = s.items.filter(
					(it) => !isItemRef(it) || (it.ref !== ref && !it.ref.startsWith(ref + '/'))
				);
				if (s.items.length !== before) touched = true;
			}
		}
		if (touched) changed.push(r.id);
	}
	return changed;
}
