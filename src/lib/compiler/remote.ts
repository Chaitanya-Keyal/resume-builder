/**
 * Optional server-side compiler for self-hosters: POST `{ tex }` to a URL and
 * get `{ ok, pdf: base64, pages, log }` back. Nothing in this repo deploys one;
 * it exists so the UI can be pointed at a pdflatex box when WASM is not wanted.
 */
import { extractErrors, type CompileResult, type Compiler } from './types';

export class RemoteCompiler implements Compiler {
	readonly id = 'remote' as const;
	constructor(private readonly url: string) {}

	async init() {}

	async compile(
		tex: string,
		opts: { signal?: AbortSignal; timeoutMs?: number } = {}
	): Promise<CompileResult> {
		const t0 = performance.now();
		const r = await fetch(this.url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ tex }),
			signal: opts.signal ?? AbortSignal.timeout(opts.timeoutMs ?? 60_000)
		});
		const body = (await r.json().catch(() => ({}))) as {
			ok?: boolean;
			pdf?: string;
			pages?: number;
			log?: string;
		};
		const log = body.log ?? `HTTP ${r.status}`;
		const pdf = body.pdf ? Uint8Array.from(atob(body.pdf), (c) => c.charCodeAt(0)) : undefined;
		return {
			ok: r.ok && !!body.ok && !!pdf,
			pdf,
			pages: body.pages ?? 0,
			log,
			errors: extractErrors(log),
			ms: Math.round(performance.now() - t0)
		};
	}

	dispose() {}
}
