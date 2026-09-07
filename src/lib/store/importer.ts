import { looksLikeJsonResume } from '$lib/core/schema/jsonresume';
import type { Profile, Workspace } from '$lib/core/schema/types';
import {
	parseProfile,
	parseWorkspace,
	ValidationError,
	type Problem
} from '$lib/core/schema/validate';

export type ImportKind = 'workspace' | 'profile' | 'jsonresume';

export interface Imported {
	kind: ImportKind;
	profile: Profile;
	workspace?: Workspace;
	warnings: Problem[];
}

export function detectShape(json: unknown): ImportKind | 'unknown' {
	if (!json || typeof json !== 'object' || Array.isArray(json)) return 'unknown';
	const j = json as Record<string, unknown>;
	if ('profile' in j && 'resumes' in j) return 'workspace';
	if ('version' in j && 'basics' in j) return 'profile';
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
	} catch (e) {
		if (e instanceof ValidationError) throw new ImportError(e.message, e.problems);
		throw e;
	}
	throw new ImportError(
		'Unrecognised file: expected a profile.json, a workspace export, or a JSON Resume.'
	);
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
