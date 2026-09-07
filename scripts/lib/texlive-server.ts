/**
 * Maintainer-only dev server behind `scripts/texlive-subset.ts`: serves the
 * engine, answers the engine's on-demand file requests from the machine's TeX
 * Live via kpsewhich, and records every request so the static tree can be
 * materialised from the log. Needs a local TeX Live (kpsewhich on PATH).
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// kpathsea kpse_file_format_type -> kpsewhich -format names
export const KPSE_FORMATS: Record<number, string> = {
	0: 'gf',
	1: 'pk',
	3: 'tfm',
	4: 'afm',
	5: 'base',
	6: 'bib',
	7: 'bst',
	8: 'cnf',
	9: 'ls-R',
	10: 'fmt',
	11: 'map',
	12: 'mem',
	13: 'mf',
	14: 'mfpool',
	15: 'mft',
	16: 'mp',
	17: 'mppool',
	18: 'MetaPost support',
	19: 'ocp',
	20: 'ofm',
	21: 'opl',
	22: 'otp',
	23: 'ovf',
	24: 'ovp',
	25: 'graphic/figure',
	26: 'tex',
	27: 'TeX system documentation',
	28: 'texpool',
	29: 'TeX system sources',
	30: 'PostScript header',
	31: 'Troff fonts',
	32: 'type1 fonts',
	33: 'vf',
	34: 'dvips config',
	35: 'ist',
	36: 'truetype fonts',
	37: 'type42 fonts',
	38: 'web2c files',
	39: 'other text files',
	40: 'other binary files',
	41: 'misc fonts',
	42: 'web',
	43: 'cweb',
	44: 'enc files',
	45: 'cmap files',
	46: 'subfont definition files',
	47: 'opentype fonts',
	48: 'pdftex config',
	49: 'lig files',
	50: 'texmfscripts',
	51: 'lua',
	52: 'font feature files',
	53: 'cid maps',
	54: 'mlbib',
	55: 'mlbst',
	56: 'ris',
	57: 'bltxml'
};

/** English only: everything else would be baked into the format for nothing. */
export const MINIMAL_LANGUAGE_DAT = `english hyphen.tex
=usenglish
=USenglish
=american
`;

export interface Hit {
	fmt: number;
	name: string;
	path: string | null;
}

const cache = new Map<string, string | null>();
export function kpsewhich(fmt: number, name: string): string | null {
	const key = `${fmt}/${name}`;
	if (cache.has(key)) return cache.get(key)!;
	const fmtName = KPSE_FORMATS[fmt];
	const attempts = fmtName ? [['-format=' + fmtName, name], [name]] : [[name]];
	let result: string | null = null;
	for (const args of attempts) {
		const r = spawnSync('kpsewhich', args, { encoding: 'utf8' });
		const p = r.status === 0 ? r.stdout.trim() : '';
		if (p && existsSync(p)) {
			result = p;
			break;
		}
	}
	cache.set(key, result);
	return result;
}

export interface ServerOptions {
	root: string;
	/** Raw (uncompressed) format bytes to serve as swiftlatexpdftex.fmt, if built. */
	format?: Uint8Array;
	/** HTML pages served at /<name>.html */
	pages: Record<string, string>;
	/** .tex documents served at /docs/<name>.tex */
	docs: Record<string, string>;
	onHit(hit: Hit): void;
	onUpload(name: string, bytes: Uint8Array): void;
}

export function startServer(o: ServerOptions) {
	const server = Bun.serve({
		port: 0,
		async fetch(req) {
			const url = new URL(req.url);
			const p = url.pathname;

			let m = p.match(/^\/texlive\/pdftex\/(\d+)\/([^/]+)$/);
			if (m) {
				const fmt = Number(m[1]);
				const name = decodeURIComponent(m[2]);
				if (name === 'swiftlatexpdftex.fmt') {
					o.onHit({ fmt, name, path: o.format ? 'FORMAT' : null });
					return o.format ? new Response(o.format) : new Response('not found', { status: 404 });
				}
				if (name === 'language.dat') {
					o.onHit({ fmt, name, path: 'MINIMAL' });
					return new Response(MINIMAL_LANGUAGE_DAT);
				}
				const path = kpsewhich(fmt, name);
				o.onHit({ fmt, name, path });
				return path ? new Response(Bun.file(path)) : new Response('not found', { status: 404 });
			}
			m = p.match(/^\/texlive\/pdftex\/pk\/(\d+)\/([^/]+)$/);
			if (m) {
				o.onHit({ fmt: 1, name: `pk${m[1]}/${m[2]}`, path: null });
				return new Response('not found', { status: 404 });
			}
			if (req.method === 'POST' && p.startsWith('/upload/')) {
				o.onUpload(p.slice('/upload/'.length), new Uint8Array(await req.arrayBuffer()));
				return new Response('ok');
			}
			m = p.match(/^\/docs\/(.+)\.tex$/);
			if (m && o.docs[m[1]])
				return new Response(o.docs[m[1]], { headers: { 'content-type': 'text/plain' } });
			m = p.match(/^\/([a-z-]+)\.html$/);
			if (m && o.pages[m[1]])
				return new Response(o.pages[m[1]], { headers: { 'content-type': 'text/html' } });
			const local = join(o.root, 'static', p);
			if (p.startsWith('/engine/') && existsSync(local)) return new Response(Bun.file(local));
			return new Response('not found', { status: 404 });
		}
	});
	return { url: `http://localhost:${server.port}`, stop: () => server.stop(true) };
}

export function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, 'utf8')) as T;
}
