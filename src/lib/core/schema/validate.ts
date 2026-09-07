import { z } from 'zod';
import { unrenderable } from '../markup/escape';
import { migrateProfile, migrateWorkspace, MigrationError } from './migrate';
import { profileSchema } from './profile';
import type { Profile, Workspace } from './types';
import { workspaceSchema } from './workspace';

export interface Problem {
	level: 'error' | 'warn';
	path: string;
	message: string;
}

export class ValidationError extends Error {
	constructor(
		message: string,
		public readonly problems: Problem[]
	) {
		super(message);
	}
}

function zodProblems(err: z.ZodError): Problem[] {
	return err.issues.map((i) => ({
		level: 'error',
		path: i.path.map(String).join('.'),
		message: i.message
	}));
}

/** Structural checks zod cannot express: unique ids, sensible content. */
export function crossCheckProfile(p: Profile): Problem[] {
	const out: Problem[] = [];
	const dupes = (path: string, ids: string[]) => {
		const seen = new Set<string>();
		for (const id of ids) {
			if (seen.has(id)) out.push({ level: 'error', path, message: `duplicate id "${id}"` });
			seen.add(id);
		}
	};
	const collections = [
		'work',
		'volunteer',
		'education',
		'projects',
		'skills',
		'awards',
		'certificates',
		'publications',
		'languages',
		'interests',
		'references'
	] as const;
	for (const c of collections) {
		dupes(
			c,
			p[c].map((i) => i.id)
		);
	}
	for (const c of ['work', 'volunteer'] as const) {
		for (const e of p[c]) {
			dupes(`${c}.${e.id}.positions`, e.positions.map((pos) => pos.id));
			for (const pos of e.positions) {
				dupes(`${c}.${e.id}/${pos.id}.highlights`, pos.highlights.map((h) => h.id));
			}
		}
	}
	for (const c of ['education', 'projects'] as const) {
		for (const it of p[c]) dupes(`${c}.${it.id}.highlights`, it.highlights.map((h) => h.id));
	}
	if (p.basics.phone) {
		out.push({
			level: 'warn',
			path: 'basics.phone',
			message: 'The profile is public; keep the phone number in the private overlay instead.'
		});
	}
	// Characters pdfTeX cannot render with the fonts we ship.
	const check = (path: string, text: string | undefined) => {
		if (!text) return;
		const bad = unrenderable(text);
		if (bad.length) {
			out.push({
				level: 'warn',
				path,
				message: `may not render in the PDF: ${bad.map((c) => JSON.stringify(c)).join(' ')}`
			});
		}
	};
	check('basics.name', p.basics.name);
	check('basics.label', p.basics.label);
	for (const c of ['work', 'volunteer'] as const) {
		for (const e of p[c]) {
			check(`${c}.${e.id}.name`, e.name);
			for (const pos of e.positions) {
				check(`${c}.${e.id}/${pos.id}.position`, pos.position);
				for (const h of pos.highlights) check(`${c}.${e.id}/${pos.id}.${h.id}`, h.text);
			}
		}
	}
	for (const pr of p.projects) {
		check(`projects.${pr.id}.name`, pr.name);
		for (const h of pr.highlights) check(`projects.${pr.id}.${h.id}`, h.text);
	}
	for (const e of p.education) check(`education.${e.id}.institution`, e.institution);
	for (const s of p.skills) check(`skills.${s.id}`, s.keywords.join(' '));
	return out;
}

/** migrate → parse → cross-check. Throws ValidationError with readable problems. */
export function parseProfile(json: unknown): { profile: Profile; warnings: Problem[] } {
	let migrated: unknown;
	try {
		migrated = migrateProfile(json);
	} catch (e) {
		if (e instanceof MigrationError) throw new ValidationError(e.message, [{ level: 'error', path: '', message: e.message }]);
		throw e;
	}
	const r = profileSchema.safeParse(migrated);
	if (!r.success) throw new ValidationError('The profile does not match the schema.', zodProblems(r.error));
	const problems = crossCheckProfile(r.data);
	const errors = problems.filter((p) => p.level === 'error');
	if (errors.length) throw new ValidationError('The profile has structural problems.', errors);
	return { profile: r.data, warnings: problems };
}

export function parseWorkspace(json: unknown): { workspace: Workspace; warnings: Problem[] } {
	let migrated: unknown;
	try {
		migrated = migrateWorkspace(json);
	} catch (e) {
		if (e instanceof MigrationError) throw new ValidationError(e.message, [{ level: 'error', path: '', message: e.message }]);
		throw e;
	}
	const r = workspaceSchema.safeParse(migrated);
	if (!r.success) throw new ValidationError('The workspace does not match the schema.', zodProblems(r.error));
	const problems = crossCheckProfile(r.data.profile);
	const errors = problems.filter((p) => p.level === 'error');
	if (errors.length) throw new ValidationError('The profile has structural problems.', errors);
	return { workspace: r.data, warnings: problems };
}
