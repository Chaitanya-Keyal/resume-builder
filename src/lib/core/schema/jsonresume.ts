/**
 * Conversion to and from plain JSON Resume (https://jsonresume.org/schema).
 * `fromJsonResume` is lossless for everything the standard can express;
 * `toJsonResume` drops what it cannot (ids, `x`, per-bullet identity).
 */
import { newHighlightId, uniqueSlug } from './ids';
import { PROFILE_SCHEMA_URL, profileSchema } from './profile';
import type { Engagement, Highlight, Position, Profile } from './types';

type Json = Record<string, unknown>;

const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strs = (v: unknown): string[] => arr(v).filter((s): s is string => typeof s === 'string');
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});

function highlights(v: unknown): Highlight[] {
	return arr(v).map((h) =>
		typeof h === 'string'
			? { id: newHighlightId(), text: h }
			: { id: str(obj(h).id) ?? newHighlightId(), text: str(obj(h).text) ?? '' }
	);
}

/** True when `json` looks like a plain JSON Resume rather than one of our profiles. */
export function looksLikeJsonResume(json: unknown): boolean {
	const j = obj(json);
	return 'basics' in j && !('version' in j && j.version === 1) && !('profile' in j);
}

function engagementsFrom(items: unknown[], nameKey: 'name' | 'organization'): Engagement[] {
	const out: Engagement[] = [];
	const taken: string[] = [];
	for (const raw of items) {
		const it = obj(raw);
		const name = str(it[nameKey]) ?? str(it.name) ?? str(it.organization) ?? 'Untitled';
		const position: Position = {
			id: '',
			position: str(it.position) ?? '',
			startDate: str(it.startDate),
			endDate: str(it.endDate),
			summary: str(it.summary),
			highlights: highlights(it.highlights)
		};
		// Consecutive items with the same organisation become stints of one engagement.
		const prev = out[out.length - 1];
		const eng =
			prev && prev.name === name
				? prev
				: (() => {
						const e: Engagement = {
							id: uniqueSlug(name, taken),
							name,
							url: str(it.url),
							location: str(it.location),
							description: str(it.description),
							positions: []
						};
						taken.push(e.id);
						out.push(e);
						return e;
					})();
		const posIds = eng.positions.map((p) => p.id);
		position.id = uniqueSlug(
			position.startDate?.slice(0, 4) || position.position || 'role',
			posIds
		);
		eng.positions.push(position);
	}
	return out;
}

function withIds<T extends { id: string }>(items: unknown[], make: (j: Json) => Omit<T, 'id'>, key: (j: Json) => string): T[] {
	const taken: string[] = [];
	return items.map((raw) => {
		const j = obj(raw);
		const id = str(j.id) ?? uniqueSlug(key(j), taken);
		taken.push(id);
		return { id, ...make(j) } as T;
	});
}

export function fromJsonResume(json: unknown): Profile {
	const j = obj(json);
	const b = obj(j.basics);
	const draft = {
		$schema: PROFILE_SCHEMA_URL,
		version: 1 as const,
		basics: {
			name: str(b.name) ?? '',
			label: str(b.label),
			image: str(b.image),
			email: str(b.email),
			phone: str(b.phone),
			url: str(b.url),
			summary: str(b.summary),
			location: b.location ? obj(b.location) : undefined,
			profiles: arr(b.profiles).map((p) => ({
				network: str(obj(p).network) ?? 'Link',
				username: str(obj(p).username),
				url: str(obj(p).url) ?? ''
			}))
		},
		work: engagementsFrom(arr(j.work), 'name'),
		volunteer: engagementsFrom(arr(j.volunteer), 'organization'),
		education: withIds(
			arr(j.education),
			(e) => ({
				institution: str(e.institution) ?? 'Untitled',
				url: str(e.url),
				area: str(e.area),
				studyType: str(e.studyType),
				startDate: str(e.startDate),
				endDate: str(e.endDate),
				score: str(e.score),
				courses: strs(e.courses),
				highlights: []
			}),
			(e) => str(e.institution) ?? 'school'
		),
		projects: withIds(
			arr(j.projects),
			(p) => ({
				name: str(p.name) ?? 'Untitled',
				description: str(p.description),
				url: str(p.url),
				entity: str(p.entity),
				type: str(p.type),
				roles: strs(p.roles),
				keywords: strs(p.keywords),
				startDate: str(p.startDate),
				endDate: str(p.endDate),
				highlights: highlights(p.highlights)
			}),
			(p) => str(p.name) ?? 'project'
		),
		skills: withIds(
			arr(j.skills),
			(s) => ({ name: str(s.name) ?? 'Skills', level: str(s.level), keywords: strs(s.keywords) }),
			(s) => str(s.name) ?? 'skills'
		),
		awards: withIds(
			arr(j.awards),
			(a) => ({ title: str(a.title) ?? 'Award', date: str(a.date), awarder: str(a.awarder), summary: str(a.summary) }),
			(a) => str(a.title) ?? 'award'
		),
		certificates: withIds(
			arr(j.certificates),
			(c) => ({ name: str(c.name) ?? 'Certificate', date: str(c.date), issuer: str(c.issuer), url: str(c.url) }),
			(c) => str(c.name) ?? 'certificate'
		),
		publications: withIds(
			arr(j.publications),
			(p) => ({
				name: str(p.name) ?? 'Publication',
				publisher: str(p.publisher),
				releaseDate: str(p.releaseDate),
				url: str(p.url),
				summary: str(p.summary)
			}),
			(p) => str(p.name) ?? 'publication'
		),
		languages: withIds(
			arr(j.languages),
			(l) => ({ language: str(l.language) ?? 'Language', fluency: str(l.fluency) }),
			(l) => str(l.language) ?? 'language'
		),
		interests: withIds(
			arr(j.interests),
			(i) => ({ name: str(i.name) ?? 'Interest', keywords: strs(i.keywords) }),
			(i) => str(i.name) ?? 'interest'
		),
		references: withIds(
			arr(j.references),
			(r) => ({ name: str(r.name) ?? 'Reference', reference: str(r.reference) }),
			(r) => str(r.name) ?? 'reference'
		),
		meta: j.meta ? obj(j.meta) : undefined
	};
	return profileSchema.parse(stripUndefined(draft));
}

function stripUndefined<T>(v: T): T {
	if (Array.isArray(v)) return v.map(stripUndefined) as T;
	if (v && typeof v === 'object') {
		const out: Json = {};
		for (const [k, val] of Object.entries(v as Json)) if (val !== undefined) out[k] = stripUndefined(val);
		return out as T;
	}
	return v;
}

/** Plain JSON Resume: positions flattened, highlights as strings, ids and `x` dropped. */
export function toJsonResume(p: Profile): Json {
	const flat = (engs: Engagement[], nameKey: 'name' | 'organization') =>
		engs.flatMap((e) =>
			e.positions.map((pos) =>
				stripUndefined({
					[nameKey]: e.name,
					position: pos.position,
					url: e.url,
					location: pos.location ?? e.location,
					description: e.description,
					startDate: pos.startDate,
					endDate: pos.endDate,
					summary: pos.summary,
					highlights: pos.highlights.filter((h) => !h.hidden).map((h) => h.text)
				})
			)
		);
	const drop = <T extends { id: string; x?: unknown; dateLabel?: string; highlights?: Highlight[] }>(
		items: T[]
	) =>
		items.map((it) => {
			const { id: _id, x: _x, dateLabel: _d, highlights, ...rest } = it;
			void _id;
			void _x;
			void _d;
			const out: Json = { ...rest };
			if (highlights) out.highlights = highlights.filter((h) => !h.hidden).map((h) => h.text);
			return stripUndefined(out);
		});
	const { x: _bx, ...basics } = p.basics;
	void _bx;
	return stripUndefined({
		basics,
		work: flat(p.work, 'name'),
		volunteer: flat(p.volunteer, 'organization'),
		education: drop(p.education),
		projects: drop(p.projects),
		skills: drop(p.skills),
		awards: drop(p.awards),
		certificates: drop(p.certificates),
		publications: drop(p.publications),
		languages: drop(p.languages),
		interests: drop(p.interests),
		references: drop(p.references),
		meta: p.meta
	});
}
