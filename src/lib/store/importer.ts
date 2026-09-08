import { looksLikeJsonResume } from '$lib/core/schema/jsonresume';
import { resumeSchema } from '$lib/core/schema/resume';
import type { Profile, Resume, Workspace } from '$lib/core/schema/types';
import {
	parseProfile,
	parseWorkspace,
	ValidationError,
	type Problem
} from '$lib/core/schema/validate';
import { workspace as store } from './workspace.svelte';

export type ImportKind = 'workspace' | 'profile' | 'jsonresume' | 'resume';

/** A resume import carries only `resume`; every other kind carries `profile`. */
export interface Imported {
	kind: ImportKind;
	profile?: Profile;
	workspace?: Workspace;
	resume?: Resume;
	warnings: Problem[];
}

export function detectShape(json: unknown): ImportKind | 'unknown' {
	if (!json || typeof json !== 'object' || Array.isArray(json)) return 'unknown';
	const j = json as Record<string, unknown>;
	if ('profile' in j && 'resumes' in j) return 'workspace';
	if ('version' in j && 'basics' in j) return 'profile';
	if ('sections' in j && 'header' in j && 'template' in j) return 'resume';
	if (looksLikeJsonResume(j)) return 'jsonresume';
	return 'unknown';
}

export class ImportError extends Error {
	constructor(
		message: string,
		public readonly problems: Problem[] = []
	) {
		super(message);
	}
}

/** Parse any supported JSON text into a profile (and a workspace when it is one). */
export function parseImport(text: string): Imported {
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		throw new ImportError('That is not valid JSON.');
	}
	const kind = detectShape(json);
	try {
		if (kind === 'workspace') {
			const { workspace, warnings } = parseWorkspace(json);
			return { kind, profile: workspace.profile, workspace, warnings };
		}
		if (kind === 'profile' || kind === 'jsonresume') {
			const { profile, warnings } = parseProfile(json);
			return { kind, profile, warnings };
		}
		if (kind === 'resume') {
			const r = resumeSchema.safeParse(json);
			if (!r.success)
				throw new ImportError(
					'That resume.json is not valid.',
					r.error.issues.map((i) => ({
						level: 'error' as const,
						path: i.path.join('.'),
						message: i.message
					}))
				);
			return { kind, resume: r.data, warnings: [] };
		}
	} catch (e) {
		if (e instanceof ValidationError) throw new ImportError(e.message, e.problems);
		throw e;
	}
	throw new ImportError(
		'Unrecognised file: expected a profile.json, a resume.json, a workspace export, or a JSON Resume.'
	);
}

/** Replace the whole workspace with an export, as one undo step. */
export function applyWorkspace(w: Workspace) {
	store.batch(() => {
		store.setProfile(w.profile);
		store.setResumes(w.resumes);
		if (w.overlay) store.setOverlay(w.overlay);
		if (w.settings) store.updateSettings(w.settings);
	});
}

export async function fetchImport(url: string): Promise<Imported> {
	let r: Response;
	try {
		r = await fetch(url, { cache: 'no-store' });
	} catch {
		throw new ImportError(
			'Could not reach that URL. It must allow cross-origin requests (GitHub Pages does).'
		);
	}
	if (!r.ok) throw new ImportError(`The server answered ${r.status} for ${url}.`);
	return parseImport(await r.text());
}
