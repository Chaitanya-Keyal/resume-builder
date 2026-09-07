/**
 * pdfTeX in a Web Worker. Talks the SwiftLaTeX worker protocol directly (see
 * static/engine/PATCH.md). The TeX Live subset and the format file are fetched
 * once, in parallel, and handed to the engine with a single `preload` message,
 * so a compile never touches the network.
 */
import {
	extractErrors,
	pageCount,
	type CompileProgress,
	type CompileResult,
	type Compiler
} from './types';

export interface TexliveManifest {
	version: number;
	format: { fmt: number; name: string; file: string; bytes: number };
	files: { fmt: number; name: string; bytes: number }[];
	misses: { fmt: number; name: string }[];
}

type WorkerReply =
	| { result: 'ok' | 'failed'; cmd?: undefined }
	| { cmd: 'compile'; result: 'ok' | 'failed'; status: number; log: string; pdf?: ArrayBuffer }
	| { cmd: 'preload'; result: 'ok' | 'failed'; count?: number; log?: string };

const MAIN = 'main.tex';

export class WasmCompiler implements Compiler {
	readonly id = 'wasm' as const;
	private worker: Worker | undefined;
	private initPromise: Promise<void> | undefined;
	private queue: Promise<unknown> = Promise.resolve();
	private assets:
		| { manifest: TexliveManifest; files: { fmt: number; name: string; data: ArrayBuffer }[] }
		| undefined;

	/** @param base site base path, e.g. '' or '/resume-builder' */
	constructor(private readonly base: string) {}

	init(onProgress?: (p: CompileProgress) => void): Promise<void> {
		this.initPromise ??= this.boot(onProgress).catch((e) => {
			this.initPromise = undefined;
			throw e;
		});
		return this.initPromise;
	}

	private async boot(onProgress?: (p: CompileProgress) => void) {
		const [, assets] = await Promise.all([
			this.spawn(onProgress),
			this.assets ? Promise.resolve(this.assets) : this.fetchAssets(onProgress)
		]);
		this.assets = assets;
		await this.preload();
		onProgress?.({ phase: 'ready', loaded: 1, total: 1 });
	}

	private spawn(onProgress?: (p: CompileProgress) => void): Promise<void> {
		onProgress?.({ phase: 'engine', loaded: 0, total: 1 });
		return new Promise((resolve, reject) => {
			const w = new Worker(`${this.base}/engine/swiftlatexpdftex.js`);
			w.onmessage = (ev: MessageEvent<WorkerReply>) => {
				if (ev.data.cmd === undefined && ev.data.result === 'ok') {
					this.worker = w;
					w.onmessage = null;
					onProgress?.({ phase: 'engine', loaded: 1, total: 1 });
					resolve();
				} else if (ev.data.cmd === undefined)
					reject(new Error('The LaTeX engine failed to start.'));
			};
			w.onerror = (e) => {
				reject(new Error(`The LaTeX engine failed to load: ${e.message}`));
				if (this.worker === w) this.respawn();
			};
		});
	}

	private async fetchAssets(onProgress?: (p: CompileProgress) => void) {
		const url = (p: string) => `${this.base}/texlive/${p}`;
		const manifest = (await (await fetch(url('manifest.json'))).json()) as TexliveManifest;
		const total = manifest.files.reduce((n, f) => n + f.bytes, 0) + manifest.format.bytes;
		let loaded = 0;
		const report = (n: number, detail?: string) => {
			loaded += n;
			onProgress?.({ phase: 'assets', loaded, total, detail });
		};
		const fetchBytes = async (path: string): Promise<ArrayBuffer> => {
			const r = await fetch(url(path));
			if (!r.ok) throw new Error(`Missing TeX file ${path} (${r.status})`);
			return r.arrayBuffer();
		};
		const filesP = Promise.all(
			manifest.files.map(async (f) => {
				const data = await fetchBytes(`pdftex/${f.fmt}/${encodeURIComponent(f.name)}`);
				report(f.bytes, f.name);
				return { fmt: f.fmt, name: f.name, data };
			})
		);
		const formatP = (async () => {
			const r = await fetch(url(manifest.format.file));
			if (!r.ok) throw new Error(`Missing format file (${r.status})`);
			const raw = await r.arrayBuffer();
			// Some servers (Vite in dev) inflate .gz files themselves; only gunzip when the magic bytes are present.
			const head = new Uint8Array(raw, 0, 2);
			const data =
				head[0] === 0x1f && head[1] === 0x8b
					? await new Response(
							new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))
						).arrayBuffer()
					: raw;
			report(manifest.format.bytes, manifest.format.name);
			return { fmt: manifest.format.fmt, name: manifest.format.name, data };
		})();
		const [files, format] = await Promise.all([filesP, formatP]);
		return { manifest, files: [...files, format] };
	}

	private preload(): Promise<void> {
		const w = this.worker!;
		const a = this.assets!;
		return new Promise((resolve, reject) => {
			w.onmessage = (ev: MessageEvent<WorkerReply>) => {
				if (ev.data.cmd !== 'preload') return;
				w.onmessage = null;
				if (ev.data.result === 'ok') resolve();
				else reject(new Error(`Preloading TeX files failed: ${ev.data.log ?? ''}`));
			};
			// Anything not preloaded is asked for at this origin, where it 404s at once
			// instead of hanging on a remote TeX Live server.
			w.postMessage({ cmd: 'settexliveurl', url: `${location.origin}${this.base}/texlive/` });
			// Copy rather than transfer so a re-spawned worker can be preloaded again.
			w.postMessage({
				cmd: 'preload',
				files: a.files.map((f) => ({ ...f, data: f.data.slice(0) })),
				misses: [
					...a.manifest.misses,
					// The job's own aux files do not exist on the first pass.
					{ fmt: 26, name: 'main.aux' },
					{ fmt: 26, name: 'main.out' }
				]
			});
		});
	}

	compile(
		tex: string,
		opts: { signal?: AbortSignal; timeoutMs?: number } = {}
	): Promise<CompileResult> {
		const run = this.queue.then(() => this.compileNow(tex, opts));
		this.queue = run.catch(() => {});
		return run;
	}

	private async compileNow(
		tex: string,
		opts: { signal?: AbortSignal; timeoutMs?: number }
	): Promise<CompileResult> {
		await this.init();
		if (opts.signal?.aborted) throw new DOMException('Compile cancelled', 'AbortError');
		const w = this.worker!;
		const t0 = performance.now();
		const timeoutMs = opts.timeoutMs ?? 60_000;
		return new Promise<CompileResult>((resolve, reject) => {
			const timer = setTimeout(() => {
				// A runaway TeX loop cannot be interrupted; drop the worker and start fresh next time.
				this.respawn();
				reject(new Error(`Compile timed out after ${timeoutMs / 1000}s.`));
			}, timeoutMs);
			w.onmessage = (ev: MessageEvent<WorkerReply>) => {
				if (ev.data.cmd !== 'compile') return;
				clearTimeout(timer);
				w.onmessage = null;
				const { result, status, log } = ev.data;
				const pdf = result === 'ok' && ev.data.pdf ? new Uint8Array(ev.data.pdf) : undefined;
				// A fatal TeX error aborts the WASM instance; start a fresh one for the next compile.
				if (result !== 'ok' && /Engine crashed|Aborted\(/.test(log)) this.respawn();
				resolve({
					ok: result === 'ok' && status === 0 && !!pdf,
					pdf,
					pages: pageCount(log),
					log,
					errors: extractErrors(log),
					ms: Math.round(performance.now() - t0)
				});
			};
			w.postMessage({ cmd: 'writefile', url: MAIN, src: tex });
			w.postMessage({ cmd: 'setmainfile', url: MAIN });
			w.postMessage({ cmd: 'compilelatex' });
		});
	}

	private respawn() {
		this.worker?.terminate();
		this.worker = undefined;
		this.initPromise = undefined;
	}

	dispose() {
		this.worker?.postMessage({ cmd: 'grace' });
		this.respawn();
		this.assets = undefined;
	}
}
