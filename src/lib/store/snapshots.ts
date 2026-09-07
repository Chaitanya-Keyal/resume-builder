/**
 * Frozen copies of a resume's output: the .tex and PDF at a moment in time.
 * Taken on every PDF download and on demand; at most `MAX_UNPINNED` unpinned
 * per resume.
 */
import { newId } from '$lib/core/schema/ids';
import type { SnapshotMeta } from '$lib/core/schema/types';
import { dbDel, dbGet, dbSet, KEYS } from './db';

const MAX_UNPINNED = 20;

export interface Snapshot extends SnapshotMeta {
	tex: string;
	pdf: Uint8Array;
}

export async function listSnapshots(resumeId: string): Promise<SnapshotMeta[]> {
	return (await dbGet<SnapshotMeta[]>(KEYS.snapshotIndex(resumeId))) ?? [];
}

export async function getSnapshot(id: string): Promise<Snapshot | undefined> {
	return dbGet<Snapshot>(KEYS.snapshot(id));
}

export async function saveSnapshot(
	input: Omit<Snapshot, 'id' | 'createdAt'> & { note?: string }
): Promise<SnapshotMeta> {
	const list = await listSnapshots(input.resumeId);
	// Identical output already captured: refresh its timestamp instead of duplicating.
	const dup = list.find((s) => s.texHash === input.texHash);
	if (dup && !input.note) {
		dup.createdAt = new Date().toISOString();
		await dbSet(KEYS.snapshotIndex(input.resumeId), list);
		return dup;
	}
	const meta: SnapshotMeta = {
		id: newId('snap'),
		resumeId: input.resumeId,
		createdAt: new Date().toISOString(),
		note: input.note,
		pinned: false,
		pages: input.pages,
		texHash: input.texHash,
		bytes: input.pdf.length
	};
	await dbSet(KEYS.snapshot(meta.id), {
		...meta,
		tex: input.tex,
		pdf: input.pdf
	} satisfies Snapshot);
	list.unshift(meta);
	// Trim the oldest unpinned beyond the cap.
	const unpinned = list.filter((s) => !s.pinned);
	for (const old of unpinned.slice(MAX_UNPINNED)) {
		await dbDel(KEYS.snapshot(old.id));
		list.splice(list.indexOf(old), 1);
	}
	await dbSet(KEYS.snapshotIndex(input.resumeId), list);
	return meta;
}

export async function updateSnapshot(
	resumeId: string,
	id: string,
	patch: Partial<Pick<SnapshotMeta, 'note' | 'pinned'>>
) {
	const list = await listSnapshots(resumeId);
	const meta = list.find((s) => s.id === id);
	if (!meta) return;
	Object.assign(meta, patch);
	await dbSet(KEYS.snapshotIndex(resumeId), list);
	const full = await getSnapshot(id);
	if (full) await dbSet(KEYS.snapshot(id), { ...full, ...patch });
}

export async function deleteSnapshot(resumeId: string, id: string) {
	const list = (await listSnapshots(resumeId)).filter((s) => s.id !== id);
	await dbSet(KEYS.snapshotIndex(resumeId), list);
	await dbDel(KEYS.snapshot(id));
}

export async function deleteAllSnapshots(resumeId: string) {
	for (const s of await listSnapshots(resumeId)) await dbDel(KEYS.snapshot(s.id));
	await dbDel(KEYS.snapshotIndex(resumeId));
}
