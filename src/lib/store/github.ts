/**
 * Getting profile.json into a GitHub repository without any credentials.
 *
 * The file is copied to the clipboard and GitHub's own editor is opened at the
 * right path, so the user pastes and commits with their existing login. This
 * app is granted nothing and stores no secrets. Public repositories can be
 * read anonymously, which is enough to know whether the file exists yet or is
 * already up to date.
 */

const API = 'https://api.github.com';

export class GitHubError extends Error {}

export interface Target {
	repo: string;
	branch: string;
	path: string;
}

/** What is committed right now, or null when the file does not exist yet. */
export async function fetchCurrent(t: Target): Promise<{ text: string } | null> {
	let r: Response;
	try {
		r = await fetch(
			`${API}/repos/${t.repo}/contents/${t.path}?ref=${encodeURIComponent(t.branch)}`,
			{ headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' } }
		);
	} catch {
		throw new GitHubError('Could not reach GitHub.');
	}
	if (r.status === 404) return null;
	if (!r.ok) throw new GitHubError(`GitHub answered ${r.status}.`);
	const body = (await r.json()) as { content: string };
	const bytes = Uint8Array.from(atob(body.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));
	return { text: new TextDecoder().decode(bytes) };
}

/** GitHub's web editor for the file: edit when it exists, otherwise a new file at that path. */
export function editorUrl(t: Target, exists: boolean): string {
	const branch = encodeURIComponent(t.branch);
	if (exists) return `https://github.com/${t.repo}/edit/${branch}/${t.path}`;
	return `https://github.com/${t.repo}/new/${branch}?filename=${encodeURIComponent(t.path)}`;
}
