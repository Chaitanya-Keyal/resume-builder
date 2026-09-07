export interface CompileResult {
	ok: boolean;
	pdf?: Uint8Array;
	pages: number;
	/** Engine transcript, for the log drawer. */
	log: string;
	/** Lines that explain a failure, extracted from the log. */
	errors: string[];
	ms: number;
}

export interface CompileProgress {
	phase: 'engine' | 'assets' | 'ready';
	loaded: number;
	total: number;
	detail?: string;
}

export interface Compiler {
	readonly id: 'wasm' | 'remote';
	/** Idempotent; downloads and warms whatever the compiler needs. */
	init(onProgress?: (p: CompileProgress) => void): Promise<void>;
	compile(tex: string, opts?: { signal?: AbortSignal; timeoutMs?: number }): Promise<CompileResult>;
	dispose(): void;
}

/** Pull the lines a person needs from a pdfTeX transcript. */
export function extractErrors(log: string): string[] {
	const lines = log.split(/\r?\n/);
	const out: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const l = lines[i];
		if (
			/^!/.test(l) ||
			/^l\.\d+/.test(l) ||
			/Emergency stop|Fatal error|File not found|TexLive File not exists/.test(l)
		) {
			out.push(l);
			if (/^!/.test(l) && lines[i + 1] && !/^!/.test(lines[i + 1])) out.push(lines[i + 1]);
		}
	}
	return out.slice(0, 40);
}

export function pageCount(log: string, jobName = 'main'): number {
	const m = log.match(new RegExp(`Output written on ${jobName}\\.pdf \\((\\d+) page`));
	return m ? Number(m[1]) : 0;
}
