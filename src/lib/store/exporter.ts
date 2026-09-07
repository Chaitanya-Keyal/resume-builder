import { toJsonResume } from '$lib/core/schema/jsonresume';
import { PROFILE_SCHEMA_URL } from '$lib/core/schema/profile';
import type { Overlay, Profile, Resume, Settings, Workspace } from '$lib/core/schema/types';
import { WORKSPACE_SCHEMA_URL } from '$lib/core/schema/workspace';

const pretty = (v: unknown) => JSON.stringify(v, null, '\t') + '\n';

/** The public file: no overlay, no resumes. Safe to commit to a public repo. */
export function profileJson(profile: Profile): string {
	const { phone: _phone, ...basics } = profile.basics;
	void _phone;
	return pretty({ ...profile, $schema: PROFILE_SCHEMA_URL, basics });
}

export function jsonResumeJson(profile: Profile): string {
	return pretty(toJsonResume(profile));
}

export function workspaceJson(
	ws: { profile: Profile; overlay: Overlay; resumes: Resume[]; settings: Settings },
	opts: { includeOverlay: boolean }
): string {
	const w: Workspace = {
		$schema: WORKSPACE_SCHEMA_URL,
		version: 1,
		exportedAt: new Date().toISOString(),
		profile: ws.profile,
		overlay: opts.includeOverlay ? ws.overlay : undefined,
		resumes: ws.resumes,
		settings: ws.settings
	};
	return pretty(w);
}

export function resumeJson(resume: Resume): string {
	return pretty(resume);
}
