import type { Resume } from '../schema/types';
import { isItemRef } from './resolve';

/**
 * Which resumes use which library items. Keys are refs (`work:sob/2026`) for
 * items and `ref#hid` for bullets; values are resume ids.
 */
export function usageIndex(resumes: Resume[]): Map<string, string[]> {
	const map = new Map<string, string[]>();
	const add = (key: string, id: string) => {
		const list = map.get(key) ?? [];
		if (!list.includes(id)) list.push(id);
		map.set(key, list);
	};
	for (const r of resumes) {
		for (const s of r.sections) {
			for (const it of s.items) {
				if (!isItemRef(it)) continue;
				add(it.ref, r.id);
				for (const hid of it.bullets) add(`${it.ref}#${hid}`, r.id);
			}
		}
	}
	return map;
}

/** Resumes that reference any ref with the given prefix (e.g. `work:sob` for all stints). */
export function usedByPrefix(index: Map<string, string[]>, prefix: string): string[] {
	const out = new Set<string>();
	for (const [key, ids] of index) {
		if (key.includes('#')) continue;
		if (key === prefix || key.startsWith(prefix + '/')) for (const id of ids) out.add(id);
	}
	return [...out];
}
