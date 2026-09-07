/**
 * The in-memory source of truth: profile, private overlay, resumes, settings.
 * Every mutation goes through `mutateProfile` / `mutateResume` (or a helper
 * built on them) so persistence and `updatedAt` stay correct.
 */
import { createResume, type NewResumeOptions } from '$lib/core/resolve/compose';
import { stripRef } from '$lib/core/resolve/compose';
import { usageIndex } from '$lib/core/resolve/usage';
import { newId } from '$lib/core/schema/ids';
import { emptyProfile, profileSchema } from '$lib/core/schema/profile';
import { resumeSchema } from '$lib/core/schema/resume';
import type { Overlay, Profile, Resume, Settings } from '$lib/core/schema/types';
import type { Problem } from '$lib/core/schema/validate';
import {
	defaultSettings,
	emptyOverlay,
	overlaySchema,
	settingsSchema
} from '$lib/core/schema/workspace';
import { dbClear, dbGet, dbSet, KEYS } from './db';

type Key = 'profile' | 'overlay' | 'resumes' | 'settings';

/** Keys whose edits can be undone. Settings are not content. */
const UNDOABLE: Key[] = ['profile', 'overlay', 'resumes'];
/** Edits to the same document closer together than this collapse into one undo step (typing). */
const COALESCE_MS = 700;
const MAX_UNDO = 100;

interface UndoEntry {
	key: Key;
	before: unknown;
	at: number;
}

class WorkspaceStore {
	profile = $state<Profile | null>(null);
	overlay = $state<Overlay>(emptyOverlay());
	resumes = $state<Resume[]>([]);
	settings = $state<Settings>(defaultSettings());
	loaded = $state(false);
	/** Warnings from the last import, shown once in the UI. */
	warnings = $state<Problem[]>([]);

	usage = $derived(usageIndex(this.resumes));
	labels = $derived([...new Set(this.resumes.flatMap((r) => r.labels))].sort());

	private dirty = new Set<Key>();
	private timer: ReturnType<typeof setTimeout> | undefined;

	/* ---------- undo ---------- */

	/** Last persisted-shape snapshot per key, so `touch` knows what changed. */
	private last: Partial<Record<Key, string>> = {};
	private undoStack: UndoEntry[] = [];
	private redoStack: UndoEntry[] = [];
	private recording = true;
	canUndo = $state(false);
	canRedo = $state(false);

	private current(key: Key): unknown {
		switch (key) {
			case 'profile':
				return $state.snapshot(this.profile);
			case 'overlay':
				return $state.snapshot(this.overlay);
			case 'resumes':
				return $state.snapshot(this.resumes);
			case 'settings':
				return $state.snapshot(this.settings);
		}
	}

	private assign(key: Key, value: unknown) {
		switch (key) {
			case 'profile':
				this.profile = value as Profile | null;
				break;
			case 'overlay':
				this.overlay = value as Overlay;
				break;
			case 'resumes':
				this.resumes = value as Resume[];
				break;
			case 'settings':
				this.settings = value as Settings;
		}
	}

	private remember(key: Key) {
		this.last[key] = JSON.stringify(this.current(key));
	}

	private record(key: Key) {
		if (!this.recording || !UNDOABLE.includes(key)) return;
		const before = this.last[key];
		const now = JSON.stringify(this.current(key));
		if (before === undefined || before === now) {
			this.last[key] = now;
			return;
		}
		const top = this.undoStack[this.undoStack.length - 1];
		const t = Date.now();
		if (top && top.key === key && t - top.at < COALESCE_MS) top.at = t;
		else {
			this.undoStack.push({ key, before: JSON.parse(before), at: t });
			if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
		}
		this.redoStack = [];
		this.last[key] = now;
		this.syncUndoFlags();
	}

	private syncUndoFlags() {
		this.canUndo = this.undoStack.length > 0;
		this.canRedo = this.redoStack.length > 0;
	}

	/** Seal the current typing group so the next edit starts a new undo step. */
	sealUndo() {
		const top = this.undoStack[this.undoStack.length - 1];
		if (top) top.at = 0;
	}

	private swap(from: UndoEntry[], to: UndoEntry[]): Key | null {
		const entry = from.pop();
		if (!entry) return null;
		to.push({ key: entry.key, before: this.current(entry.key), at: 0 });
		this.recording = false;
		this.assign(entry.key, entry.before);
		this.remember(entry.key);
		this.dirty.add(entry.key);
		void this.flush();
		this.recording = true;
		this.syncUndoFlags();
		return entry.key;
	}

	/** Returns which document was restored, or null when there was nothing to undo. */
	undo(): Key | null {
		return this.swap(this.undoStack, this.redoStack);
	}

	redo(): Key | null {
		return this.swap(this.redoStack, this.undoStack);
	}

	private clearUndo() {
		this.undoStack = [];
		this.redoStack = [];
		this.syncUndoFlags();
	}

	async load() {
		const [profile, overlay, resumes, settings] = await Promise.all([
			dbGet<unknown>(KEYS.profile),
			dbGet<unknown>(KEYS.overlay),
			dbGet<unknown>(KEYS.resumes),
			dbGet<unknown>(KEYS.settings)
		]);
		const p = profile ? profileSchema.safeParse(profile) : undefined;
		this.profile = p?.success ? p.data : null;
		const o = overlay ? overlaySchema.safeParse(overlay) : undefined;
		this.overlay = o?.success ? o.data : emptyOverlay();
		const rs = Array.isArray(resumes) ? resumes : [];
		this.resumes = rs
			.map((r) => resumeSchema.safeParse(r))
			.flatMap((r) => (r.success ? [r.data] : []));
		const s = settings ? settingsSchema.safeParse(settings) : undefined;
		this.settings = s?.success ? s.data : defaultSettings();
		for (const k of UNDOABLE) this.remember(k);
		this.loaded = true;
	}

	/* ---------- persistence ---------- */

	touch(...keys: Key[]) {
		for (const k of keys) {
			this.dirty.add(k);
			this.record(k);
		}
		clearTimeout(this.timer);
		this.timer = setTimeout(() => void this.flush(), 250);
	}

	async flush() {
		clearTimeout(this.timer);
		const keys = [...this.dirty];
		this.dirty.clear();
		await Promise.all(
			keys.map((k) => {
				switch (k) {
					case 'profile':
						return dbSet(KEYS.profile, $state.snapshot(this.profile));
					case 'overlay':
						return dbSet(KEYS.overlay, $state.snapshot(this.overlay));
					case 'resumes':
						return dbSet(KEYS.resumes, $state.snapshot(this.resumes));
					case 'settings':
						return dbSet(KEYS.settings, $state.snapshot(this.settings));
				}
			})
		);
	}

	/* ---------- whole-document replacement ---------- */

	setProfile(profile: Profile, warnings: Problem[] = []) {
		this.profile = profile;
		this.warnings = warnings;
		this.touch('profile');
	}

	setOverlay(overlay: Overlay) {
		this.overlay = overlay;
		this.touch('overlay');
	}

	/** Add a resume, or replace the one with the same id. Returns true when it replaced. */
	putResume(r: Resume): boolean {
		const i = this.resumes.findIndex((x) => x.id === r.id);
		if (i >= 0) this.resumes[i] = r;
		else this.resumes.push(r);
		this.touch('resumes');
		return i >= 0;
	}

	setResumes(resumes: Resume[]) {
		this.resumes = resumes;
		this.touch('resumes');
	}

	updateSettings(patch: Partial<Settings>) {
		Object.assign(this.settings, patch);
		this.touch('settings');
	}

	startBlank(name = '') {
		this.setProfile(emptyProfile(name));
		this.setResumes([]);
	}

	async reset() {
		this.profile = null;
		this.overlay = emptyOverlay();
		this.resumes = [];
		this.settings = defaultSettings();
		this.dirty.clear();
		this.clearUndo();
		this.last = {};
		await dbClear();
	}

	/* ---------- mutations ---------- */

	mutateProfile(fn: (p: Profile) => void) {
		if (!this.profile) return;
		fn(this.profile);
		this.touch('profile');
	}

	mutateOverlay(fn: (o: Overlay) => void) {
		fn(this.overlay);
		this.touch('overlay');
	}

	resume(id: string): Resume | undefined {
		return this.resumes.find((r) => r.id === id);
	}

	mutateResume(id: string, fn: (r: Resume) => void) {
		const r = this.resume(id);
		if (!r) return;
		fn(r);
		r.updatedAt = new Date().toISOString();
		this.touch('resumes');
	}

	newResume(o: Omit<NewResumeOptions, 'from'> & { fromId?: string }): Resume | undefined {
		if (!this.profile) return undefined;
		const from = o.fromId ? this.resume(o.fromId) : undefined;
		const r = createResume(this.profile, { ...o, from: from ? $state.snapshot(from) : undefined });
		this.resumes.push(r);
		this.touch('resumes');
		return r;
	}

	duplicateResume(id: string): Resume | undefined {
		const src = this.resume(id);
		if (!src) return undefined;
		return this.newResume({
			name: `${src.name} copy`,
			labels: [...src.labels],
			mode: 'copy',
			fromId: id
		});
	}

	deleteResume(id: string) {
		this.resumes = this.resumes.filter((r) => r.id !== id);
		this.touch('resumes');
	}

	/** Remove a library item everywhere: the profile and every resume that used it. */
	removeRef(ref: string, hid?: string) {
		stripRef(this.resumes, ref, hid);
		this.touch('resumes');
	}

	newSectionId() {
		return newId('sec');
	}
}

export const workspace = new WorkspaceStore();
