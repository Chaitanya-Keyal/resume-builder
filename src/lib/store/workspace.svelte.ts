/**
 * The in-memory source of truth: profile, private overlay, resumes, settings.
 * Every mutation goes through `mutateProfile` / `mutateResume` (or a helper
 * built on them) so persistence and `updatedAt` stay correct.
 */
import { createResume, type NewResumeOptions } from '$lib/core/resolve/compose';
import { stripRef } from '$lib/core/resolve/compose';
import { usageIndex } from '$lib/core/resolve/usage';
import { profileSchema } from '$lib/core/schema/profile';
import { resumeSchema } from '$lib/core/schema/resume';
import type { Overlay, Profile, Resume, Settings } from '$lib/core/schema/types';
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

/** One undo step: the documents it touched and what each looked like before. */
interface UndoEntry {
	changes: { key: Key; before: unknown }[];
	at: number;
}

class WorkspaceStore {
	profile = $state<Profile | null>(null);
	overlay = $state<Overlay>(emptyOverlay());
	resumes = $state<Resume[]>([]);
	settings = $state<Settings>(defaultSettings());
	loaded = $state(false);

	usage = $derived(usageIndex(this.resumes));
	labels = $derived([...new Set(this.resumes.flatMap((r) => r.labels))].sort());

	private dirty = new Set<Key>();
	private timer: ReturnType<typeof setTimeout> | undefined;
	private flushing: Promise<void> | undefined;

	/* ---------- undo ---------- */

	/** Last persisted-shape snapshot per key, so `touch` knows what changed. */
	private last: Partial<Record<Key, string>> = {};
	private undoStack: UndoEntry[] = [];
	private redoStack: UndoEntry[] = [];
	private recording = true;
	/** While set, every change lands in this one entry (see `batch`). */
	private group: UndoEntry | null = null;
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
		this.last[key] = now;
		if (before === undefined || before === now) return;
		const change = { key, before: JSON.parse(before) as unknown };
		if (this.group) {
			if (!this.group.changes.some((c) => c.key === key)) this.group.changes.push(change);
			return;
		}
		const top = this.undoStack[this.undoStack.length - 1];
		const t = Date.now();
		const typing =
			top && top.changes.length === 1 && top.changes[0].key === key && t - top.at < COALESCE_MS;
		if (typing) top.at = t;
		else this.push({ changes: [change], at: t });
	}

	private push(entry: UndoEntry) {
		this.undoStack.push(entry);
		if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
		this.redoStack = [];
		this.syncUndoFlags();
	}

	private syncUndoFlags() {
		this.canUndo = this.undoStack.length > 0;
		this.canRedo = this.redoStack.length > 0;
	}

	/** Everything `fn` changes, across documents, undoes as one step. */
	batch(fn: () => void) {
		if (this.group) return fn();
		this.group = { changes: [], at: 0 };
		try {
			fn();
		} finally {
			const g = this.group;
			this.group = null;
			if (g.changes.length) this.push(g);
		}
	}

	private swap(from: UndoEntry[], to: UndoEntry[]): Key[] {
		const entry = from.pop();
		if (!entry) return [];
		to.push({
			changes: entry.changes.map((c) => ({ key: c.key, before: this.current(c.key) })),
			at: 0
		});
		this.recording = false;
		for (const c of entry.changes) {
			this.assign(c.key, c.before);
			this.remember(c.key);
			this.dirty.add(c.key);
		}
		void this.flush();
		this.recording = true;
		this.syncUndoFlags();
		return entry.changes.map((c) => c.key);
	}

	/** Returns which documents were restored; empty when there was nothing to undo. */
	undo(): Key[] {
		return this.swap(this.undoStack, this.redoStack);
	}

	redo(): Key[] {
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
		// Without a profile the next edits are the first-run setup; undoing back to no profile
		// would strand the shell, so the baseline is only taken once there is something to keep.
		if (this.profile) for (const k of UNDOABLE) this.remember(k);
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

	flush(): Promise<void> {
		clearTimeout(this.timer);
		const keys = [...this.dirty];
		this.dirty.clear();
		const writes = keys.map((k) => {
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
		});
		const done = Promise.all([this.flushing, ...writes]).then(() => {});
		this.flushing = done;
		return done;
	}

	/* ---------- whole-document replacement ---------- */

	setProfile(profile: Profile) {
		this.profile = profile;
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

	async reset() {
		clearTimeout(this.timer);
		this.dirty.clear();
		// A write still on its way to IndexedDB must not land after the wipe.
		await this.flushing;
		this.profile = null;
		this.overlay = emptyOverlay();
		this.resumes = [];
		this.settings = defaultSettings();
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

	/** Drop a library item (or one of its bullets) from every resume that picked it. */
	removeRef(ref: string, hid?: string) {
		stripRef(this.resumes, ref, hid);
		this.touch('resumes');
	}
}

export const workspace = new WorkspaceStore();
