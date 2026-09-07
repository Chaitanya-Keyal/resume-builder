/**
 * Getting profile.json into a GitHub repository.
 *
 * The default path needs no token at all: the file is copied to the clipboard
 * and GitHub's own editor is opened, so the user commits with their existing
 * login and this app is granted nothing. Public repositories can be read
 * anonymously, which is enough to know whether the file exists or is unchanged.
 *
 * The optional path commits through the API with a fine-grained personal
 * access token. "Contents: read and write" on that single repository is the
 * narrowest permission GitHub offers for committing a file. The token is held
 * in memory for this tab unless the user asks to remember it, in which case it
 * is stored AES-GCM encrypted under a non-extractable WebCrypto key in this
 * browser's IndexedDB. It is never part of an export.
 */
import { dbDel, dbGet, dbSet } from './db';

const TOKEN_KEY = 'github:token';
const CRYPTO_KEY = 'github:key';
const API = 'https://api.github.com';

export class GitHubError extends Error {}

export interface Target {
	repo: string;
	branch: string;
	path: string;
}

/* ------------------------------------------------------------------------ */
/* Token storage                                                             */
/* ------------------------------------------------------------------------ */

async function cryptoKey(create: boolean): Promise<CryptoKey | null> {
	const existing = await dbGet<CryptoKey>(CRYPTO_KEY);
	if (existing) return existing;
	if (!create) return null;
	// Non-extractable: scripts can use it but never read the key bytes out.
	const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
		'encrypt',
		'decrypt'
	]);
	await dbSet(CRYPTO_KEY, key);
	return key;
}

/** Encrypt and persist the token on this device. */
export async function rememberToken(token: string): Promise<void> {
	const key = await cryptoKey(true);
	if (!key) return;
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ct = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(token.trim())
	);
	await dbSet(TOKEN_KEY, { iv, ct: new Uint8Array(ct) });
}

/** The remembered token, or '' when none is stored. */
export async function loadToken(): Promise<string> {
	const rec = await dbGet<{ iv: Uint8Array; ct: Uint8Array }>(TOKEN_KEY);
	const key = await cryptoKey(false);
	if (!rec || !key) return '';
	try {
		const pt = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: rec.iv as Uint8Array<ArrayBuffer> },
			key,
			rec.ct as Uint8Array<ArrayBuffer>
		);
		return new TextDecoder().decode(pt);
	} catch {
		return '';
	}
}

export async function forgetToken(): Promise<void> {
	await dbDel(TOKEN_KEY);
	await dbDel(CRYPTO_KEY);
}

/* ------------------------------------------------------------------------ */
/* API                                                                       */
/* ------------------------------------------------------------------------ */

async function gh<T>(token: string | null, path: string, init: RequestInit = {}): Promise<T> {
	let r: Response;
	try {
		r = await fetch(`${API}${path}`, {
			...init,
			headers: {
				accept: 'application/vnd.github+json',
				...(token ? { authorization: `Bearer ${token}` } : {}),
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
			token
				? 'Not found: check the repository, branch and path, and that the token can see this repository.'
				: 'Not found: check the repository, branch and path. Private repositories need a token.'
		);
	if (r.status === 401) throw new GitHubError('GitHub rejected the token.');
	if (r.status === 403)
		throw new GitHubError(
			'Not allowed. A token needs "Contents: read and write" on this one repository.'
		);
	if (!r.ok) throw new GitHubError(`GitHub answered ${r.status}.`);
	return (await r.json()) as T;
}

/** What is committed right now, or null when the file does not exist yet. Anonymous reads work for public repositories. */
export async function fetchCurrent(
	token: string | null,
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

/** GitHub's web editor for the file: edit when it exists, otherwise a new file at that path. */
export function editorUrl(t: Target, exists: boolean): string {
	const branch = encodeURIComponent(t.branch);
	if (exists) return `https://github.com/${t.repo}/edit/${branch}/${t.path}`;
	return `https://github.com/${t.repo}/new/${branch}?filename=${encodeURIComponent(t.path)}`;
}

/** Commit `text` to the target with a token. Returns the commit URL. */
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

/** Confirms the repository is reachable and reports its default branch. */
export async function checkRepo(
	token: string | null,
	repo: string
): Promise<{ defaultBranch: string; isPrivate: boolean }> {
	const r = await gh<{ default_branch: string; private: boolean }>(token, `/repos/${repo}`);
	return { defaultBranch: r.default_branch, isPrivate: r.private };
}
