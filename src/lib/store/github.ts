/**
 * Publish profile.json straight into a GitHub repository, so a site that reads
 * it redeploys without a manual commit. The token is a fine-grained personal
 * access token with "Contents: read and write" on that one repository; it is
 * stored in this browser only and never exported.
 */
import { dbDel, dbGet, dbSet } from './db';

const TOKEN_KEY = 'github:token';
const API = 'https://api.github.com';

export async function loadToken(): Promise<string> {
	return (await dbGet<string>(TOKEN_KEY)) ?? '';
}

export async function saveToken(token: string): Promise<void> {
	if (token.trim()) await dbSet(TOKEN_KEY, token.trim());
	else await dbDel(TOKEN_KEY);
}

export class GitHubError extends Error {}

async function gh<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
	let r: Response;
	try {
		r = await fetch(`${API}${path}`, {
			...init,
			headers: {
				accept: 'application/vnd.github+json',
				authorization: `Bearer ${token}`,
				'x-github-api-version': '2022-11-28',
				...(init.body ? { 'content-type': 'application/json' } : {}),
				...(init.headers ?? {})
			}
		});
	} catch {
		throw new GitHubError('Could not reach GitHub.');
	}
	if (r.status === 404)
		throw new GitHubError(
			'Not found: check the repository name, branch and path, and that the token can see this repository.'
		);
	if (r.status === 401) throw new GitHubError('GitHub rejected the token.');
	if (r.status === 403)
		throw new GitHubError(
			'The token is not allowed to write here. It needs "Contents: read and write" on this repository.'
		);
	if (!r.ok) throw new GitHubError(`GitHub answered ${r.status}.`);
	return (await r.json()) as T;
}

export interface Target {
	repo: string;
	branch: string;
	path: string;
}

/** What is committed right now, or null when the file does not exist yet. */
export async function fetchCurrent(
	token: string,
	t: Target
): Promise<{ sha: string; text: string } | null> {
	try {
		const r = await gh<{ sha: string; content: string; encoding: string }>(
			token,
			`/repos/${t.repo}/contents/${t.path}?ref=${encodeURIComponent(t.branch)}`
		);
		const bytes = Uint8Array.from(atob(r.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));
		return { sha: r.sha, text: new TextDecoder().decode(bytes) };
	} catch (e) {
		if (e instanceof GitHubError && e.message.startsWith('Not found')) return null;
		throw e;
	}
}

/** Commit `text` to the target. Returns the commit URL. */
export async function publish(
	token: string,
	t: Target,
	text: string,
	message: string
): Promise<{ url: string; unchanged: boolean }> {
	const current = await fetchCurrent(token, t);
	if (current && current.text === text) return { url: '', unchanged: true };
	const bytes = new TextEncoder().encode(text);
	let bin = '';
	for (let i = 0; i < bytes.length; i += 0x8000)
		bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	const r = await gh<{ commit: { html_url: string } }>(
		token,
		`/repos/${t.repo}/contents/${t.path}`,
		{
			method: 'PUT',
			body: JSON.stringify({
				message,
				content: btoa(bin),
				branch: t.branch,
				...(current ? { sha: current.sha } : {})
			})
		}
	);
	return { url: r.commit.html_url, unchanged: false };
}

/** Confirms the token can see the repository and reports its default branch. */
export async function checkRepo(token: string, repo: string): Promise<{ defaultBranch: string }> {
	const r = await gh<{ default_branch: string }>(token, `/repos/${repo}`);
	return { defaultBranch: r.default_branch };
}
