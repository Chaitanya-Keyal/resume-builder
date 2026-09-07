/**
 * IndexedDB persistence via idb-keyval. One key per document; snapshots and
 * compiled artifacts get their own keys so the workspace stays small.
 */
import { createStore, del, get, keys, set } from 'idb-keyval';

const store = typeof indexedDB === 'undefined' ? undefined : createStore('resume-builder', 'kv');

export const KEYS = {
	profile: 'profile',
	overlay: 'overlay',
	resumes: 'resumes',
	settings: 'settings',
	artifact: (resumeId: string) => `artifact:${resumeId}`,
	snapshot: (id: string) => `snapshot:${id}`,
	snapshotIndex: (resumeId: string) => `snapshots:${resumeId}`
} as const;

export async function dbGet<T>(key: string): Promise<T | undefined> {
	if (!store) return undefined;
	try {
		return await get<T>(key, store);
	} catch {
		return undefined;
	}
}

export async function dbSet(key: string, value: unknown): Promise<void> {
	if (!store) return;
	await set(key, value, store);
}

export async function dbDel(key: string): Promise<void> {
	if (!store) return;
	await del(key, store);
}

export async function dbKeys(prefix?: string): Promise<string[]> {
	if (!store) return [];
	const all = (await keys(store)).map(String);
	return prefix ? all.filter((k) => k.startsWith(prefix)) : all;
}

/** Wipe everything this app stored. */
export async function dbClear(): Promise<void> {
	for (const k of await dbKeys()) await dbDel(k);
}
