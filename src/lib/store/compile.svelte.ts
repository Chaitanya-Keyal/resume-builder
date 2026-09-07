/**
 * Turns "the .tex changed" into "here is a PDF": debounce by kind of change,
 * skip unchanged input, drop stale results, remember recent outputs, and keep
 * the last good PDF on screen while the next one compiles.
 */
import { base } from '$app/paths';
import { WasmCompiler, type CompileProgress, type Compiler } from '$lib/compiler';
import { hash53 } from '$lib/util/hash';
import { dbGet, dbSet, KEYS } from './db';

export type CompileStatus = 'idle' | 'compiling' | 'ok' | 'error';

export interface CompileState {
	status: CompileStatus;
	pages: number;
	pdf?: Uint8Array;
	pdfUrl?: string;
	log: string;
	errors: string[];
	ms: number;
	/** Hash of the .tex the current PDF came from. */
	texHash: string;
	compiledAt?: number;
	/** The PDF shown is from a previous session and may not match the current data. */
	stale?: boolean;
	error?: string;
}

interface Artifact {
	pdf: Uint8Array;
	pages: number;
	texHash: string;
	compiledAt: number;
}

const LRU_MAX = 20;
const DEBOUNCE = { discrete: 250, typing: 700, now: 0 } as const;

function blank(): CompileState {
	return { status: 'idle', pages: 0, log: '', errors: [], ms: 0, texHash: '' };
}
const BLANK: Readonly<CompileState> = Object.freeze(blank());

class CompileManager {
	states = $state<Record<string, CompileState>>({});
	engine = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	progress = $state<CompileProgress | null>(null);
	engineError = $state<string | null>(null);
	online = $state(typeof navigator === 'undefined' ? true : navigator.onLine);

	private compiler: Compiler | undefined;
	private timers = new Map<string, ReturnType<typeof setTimeout>>();
	private pending = new Map<string, string>();
	private seq = new Map<string, number>();
	private lru = new Map<string, { pdf: Uint8Array; pages: number; log: string }>();

	constructor() {
		if (typeof window !== 'undefined') {
			window.addEventListener('online', () => (this.online = true));
			window.addEventListener('offline', () => (this.online = false));
		}
	}

	/** Read-only view; safe inside $derived. Entries are created by writes. */
	state(resumeId: string): CompileState {
		return this.states[resumeId] ?? BLANK;
	}

	private ensure(resumeId: string): CompileState {
		return (this.states[resumeId] ??= blank());
	}

	/** Create the in-browser engine wrapper; safe to call repeatedly. */
	configure() {
		if (this.compiler) return;
		this.compiler = new WasmCompiler(base);
		this.engine = 'idle';
	}

	/** Forget a deleted resume: timers, in-flight work and its blob URL. */
	dispose(resumeId: string) {
		clearTimeout(this.timers.get(resumeId));
		this.timers.delete(resumeId);
		this.pending.delete(resumeId);
		this.seq.delete(resumeId);
		const s = this.states[resumeId];
		if (s?.pdfUrl) URL.revokeObjectURL(s.pdfUrl);
		delete this.states[resumeId];
	}

	private warming: Promise<void> | undefined;

	/** Download and start the engine ahead of the first compile. Concurrent callers share one load. */
	warm(): Promise<void> {
		this.configure();
		if (this.engine === 'ready') return Promise.resolve();
		if (this.warming) return this.warming;
		this.engine = 'loading';
		this.engineError = null;
		this.warming = (async () => {
			try {
				await this.compiler!.init((p) => (this.progress = p));
				this.engine = 'ready';
			} catch (e) {
				this.engine = 'error';
				this.engineError = e instanceof Error ? e.message : String(e);
			} finally {
				this.warming = undefined;
			}
		})();
		return this.warming;
	}

	/** Show the PDF from the last session immediately, marked stale until the next compile lands. */
	async restore(resumeId: string) {
		const s = this.state(resumeId);
		if (s.pdf) return;
		const a = await dbGet<Artifact>(KEYS.artifact(resumeId));
		if (!a || s.pdf) return;
		this.apply(resumeId, {
			pdf: a.pdf,
			pages: a.pages,
			texHash: a.texHash,
			compiledAt: a.compiledAt,
			status: 'ok',
			stale: true
		});
	}

	/** Ask for a compile of `tex`; coalesces bursts. */
	request(resumeId: string, tex: string, kind: keyof typeof DEBOUNCE = 'discrete') {
		this.pending.set(resumeId, tex);
		clearTimeout(this.timers.get(resumeId));
		const delay = DEBOUNCE[kind];
		this.timers.set(
			resumeId,
			setTimeout(() => void this.run(resumeId), delay)
		);
	}

	cancel(resumeId: string) {
		clearTimeout(this.timers.get(resumeId));
		this.pending.delete(resumeId);
		this.seq.set(resumeId, (this.seq.get(resumeId) ?? 0) + 1);
	}

	private apply(resumeId: string, patch: Partial<CompileState>) {
		const s = this.ensure(resumeId);
		if (patch.pdf && patch.pdf !== s.pdf) {
			if (s.pdfUrl) URL.revokeObjectURL(s.pdfUrl);
			patch.pdfUrl = URL.createObjectURL(
				new Blob([patch.pdf as BlobPart], { type: 'application/pdf' })
			);
		}
		Object.assign(s, patch);
	}

	private async run(resumeId: string) {
		const tex = this.pending.get(resumeId);
		this.pending.delete(resumeId);
		if (tex === undefined) return;
		const s = this.state(resumeId);
		const texHash = hash53(tex);
		if (texHash === s.texHash && s.status === 'ok' && !s.stale) return;

		const cached = this.lru.get(texHash);
		if (cached) {
			this.lru.delete(texHash);
			this.lru.set(texHash, cached);
			this.apply(resumeId, {
				...cached,
				texHash,
				status: 'ok',
				stale: false,
				errors: [],
				error: undefined,
				compiledAt: Date.now()
			});
			void this.persist(resumeId);
			return;
		}

		const mySeq = (this.seq.get(resumeId) ?? 0) + 1;
		this.seq.set(resumeId, mySeq);
		this.apply(resumeId, { status: 'compiling', error: undefined });
		await this.warm();
		if (this.engine !== 'ready') {
			this.apply(resumeId, {
				status: 'error',
				error: this.engineError ?? 'The compiler is not available.'
			});
			return;
		}
		try {
			const r = await this.compiler!.compile(tex);
			if (this.seq.get(resumeId) !== mySeq) return; // superseded
			if (r.ok && r.pdf) {
				this.lru.set(texHash, { pdf: r.pdf, pages: r.pages, log: r.log });
				if (this.lru.size > LRU_MAX) this.lru.delete(this.lru.keys().next().value!);
				this.apply(resumeId, {
					status: 'ok',
					pdf: r.pdf,
					pages: r.pages,
					log: r.log,
					errors: [],
					ms: r.ms,
					texHash,
					compiledAt: Date.now(),
					stale: false,
					error: undefined
				});
				void this.persist(resumeId);
			} else {
				this.apply(resumeId, {
					status: 'error',
					log: r.log,
					errors: r.errors,
					ms: r.ms,
					error: r.errors[0] ?? 'Compile failed.'
				});
			}
		} catch (e) {
			if (this.seq.get(resumeId) !== mySeq) return;
			this.apply(resumeId, { status: 'error', error: e instanceof Error ? e.message : String(e) });
		}
	}

	private async persist(resumeId: string) {
		const s = this.state(resumeId);
		if (!s.pdf) return;
		const a: Artifact = {
			pdf: s.pdf,
			pages: s.pages,
			texHash: s.texHash,
			compiledAt: s.compiledAt ?? Date.now()
		};
		await dbSet(KEYS.artifact(resumeId), a).catch(() => {});
	}
}

export const compiles = new CompileManager();
