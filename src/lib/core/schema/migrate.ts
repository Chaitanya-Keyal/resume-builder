/**
 * Version chain for imported documents. Every import goes migrate → parse →
 * cross-checks, so an old export or a plain JSON Resume ends up as the current
 * shape or a readable error.
 */
import { fromJsonResume, looksLikeJsonResume } from './jsonresume';

export const CURRENT_PROFILE_VERSION = 1;
export const CURRENT_WORKSPACE_VERSION = 1;

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});

// Add `2: (json) => …` when the schema changes; keep the chain contiguous.
const profileMigrations: Record<number, (json: Json) => Json> = {};
const workspaceMigrations: Record<number, (json: Json) => Json> = {};

export class MigrationError extends Error {}

/** Returns a document at the current profile version (still unparsed). */
export function migrateProfile(json: unknown): unknown {
	let j = obj(json);
	if (typeof j.version !== 'number') {
		if (looksLikeJsonResume(j)) return fromJsonResume(j);
		throw new MigrationError('Not a profile: expected a "version" field or a JSON Resume "basics" object.');
	}
	let v = j.version as number;
	if (v > CURRENT_PROFILE_VERSION) {
		throw new MigrationError(`Profile version ${v} is newer than this app understands (${CURRENT_PROFILE_VERSION}).`);
	}
	while (v < CURRENT_PROFILE_VERSION) {
		const step = profileMigrations[v];
		if (!step) throw new MigrationError(`No migration from profile version ${v}.`);
		j = step(j);
		v++;
	}
	return j;
}

export function migrateWorkspace(json: unknown): unknown {
	let j = obj(json);
	let v = typeof j.version === 'number' ? j.version : 1;
	if (v > CURRENT_WORKSPACE_VERSION) {
		throw new MigrationError(`Workspace version ${v} is newer than this app understands (${CURRENT_WORKSPACE_VERSION}).`);
	}
	while (v < CURRENT_WORKSPACE_VERSION) {
		const step = workspaceMigrations[v];
		if (!step) throw new MigrationError(`No migration from workspace version ${v}.`);
		j = step(j);
		v++;
	}
	if (j.profile) j = { ...j, profile: migrateProfile(j.profile) };
	return j;
}
