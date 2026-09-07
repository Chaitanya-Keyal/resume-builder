/**
 * Builds static/texlive: the exact TeX Live files the templates need, the
 * trimmed font map, the gzipped format file and manifest.json.
 *
 *   bun scripts/texlive-subset.ts            # capture + materialise (rebuilds the format if missing)
 *   bun scripts/texlive-subset.ts --format   # also rebuild the format file
 *
 * How: a headless Chromium runs the real engine against a local server that
 * answers file requests with kpsewhich and logs them. Every fixture and a
 * kitchen-sink document per template option that changes fonts are compiled,
 * so the captured set covers everything a user can select. Maintainer-only:
 * needs a local TeX Live and Playwright's Chromium.
 */
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { chromium } from 'playwright';
import { renderTex, templates } from '../src/lib/core/latex';
import { resolve } from '../src/lib/core/resolve/resolve';
import { listRefs } from '../src/lib/core/resolve/refs';
import { resumeSchema } from '../src/lib/core/schema/resume';
import type { Profile, Resume, Section, SectionType } from '../src/lib/core/schema/types';
import { parseProfile } from '../src/lib/core/schema/validate';
import { overlaySchema } from '../src/lib/core/schema/workspace';
import { readJson, startServer, type Hit } from './lib/texlive-server';

const ROOT = join(import.meta.dir, '..');
const OUT = join(ROOT, 'static', 'texlive');
const TREE = join(OUT, 'pdftex');
const FORMAT_GZ = join(OUT, 'swiftlatexpdftex.fmt.gz');
const rebuildFormat = process.argv.includes('--format') || !existsSync(FORMAT_GZ);

/* ---------- documents to compile ---------- */

function everythingResume(
	profile: Profile,
	templateId: string,
	options: Record<string, unknown>
): Resume {
	const t = templates[templateId];
	const sections: Section[] = t.defaultSectionOrder
		.map((type: SectionType) => ({
			id: `sec_${type}`,
			type,
			items: listRefs(profile, type === 'custom' ? undefined : type).map((r) => ({
				ref: r.ref,
				bullets: r.highlightIds
			}))
		}))
		.filter((s) => s.items.length);
	sections.push({
		id: 'sec_custom',
		type: 'custom',
		title: 'Custom Section',
		items: [
			{
				id: 'c_1',
				title: 'Custom **item**',
				subtitle: 'with _markup_',
				dateLabel: '2020 -- 2021',
				location: 'Somewhere',
				bullets: [
					{ id: 'cb_1', text: 'A bullet with a [link](https://example.com) and 100% & more.' }
				]
			}
		]
	});
	return resumeSchema.parse({
		id: 'kitchen-sink',
		name: 'Kitchen sink',
		createdAt: '',
		updatedAt: '',
		template: templateId,
		options,
		header: {
			showPhone: true,
			showEmail: true,
			showUrl: true,
			showLocation: true,
			showTagline: true,
			profiles: profile.basics.profiles.map((p) => p.network)
		},
		sections
	});
}

function documents(): Record<string, string> {
	const docs: Record<string, string> = {};
	const sample = parseProfile(readJson(join(ROOT, 'fixtures/sample/profile.json'))).profile;
	const overlay = overlaySchema.parse(readJson(join(ROOT, 'fixtures/sample/overlay.json')));
	const sampleResume = resumeSchema.parse(readJson(join(ROOT, 'fixtures/sample/resume.jake.json')));
	docs['sample'] = renderTex(resolve(sample, overlay, sampleResume).resolved, sampleResume);
	for (const t of Object.values(templates)) {
		// Options that change fonts or class files. Margins and spacing only move things.
		for (const fontSize of [10, 11, 12]) {
			for (const paper of ['letterpaper', 'a4paper']) {
				const options = { ...t.defaults, fontSize, paper, underlineLinks: fontSize !== 11 };
				const r = everythingResume(sample, t.id, options);
				docs[`${t.id}-${fontSize}-${paper}`] = renderTex(resolve(sample, undefined, r).resolved, r);
			}
		}
	}
	return docs;
}

/* ---------- browser pages ---------- */

const PAGE = (body: string) => `<!doctype html><meta charset="utf-8"><pre id="log"></pre><script>
const log=(s)=>{document.getElementById('log').textContent+=s+'\\n';console.log(s)};
window.__result=null;
const w=new Worker('/engine/swiftlatexpdftex.js');
const send=(m)=>w.postMessage(m);
const once=(cmd)=>new Promise((res)=>{const h=(ev)=>{if(ev.data.cmd===cmd){w.removeEventListener('message',h);res(ev.data)}};w.addEventListener('message',h)});
const loaded=new Promise((res)=>{const h=(ev)=>{if(ev.data.cmd===undefined&&ev.data.result==='ok'){w.removeEventListener('message',h);res()}};w.addEventListener('message',h)});
(async()=>{try{await loaded;send({cmd:'settexliveurl',url:location.origin+'/texlive/'});${body}}catch(e){log('fatal '+e);window.__result={ok:false,error:String(e)}}})();
</script>`;

const FORMAT_PAGE = PAGE(`
const t=performance.now();send({cmd:'compileformat'});const r=await once('compile');
if(r.result==='ok'){const b=new Uint8Array(r.pdf);await fetch('/upload/swiftlatexpdftex.fmt',{method:'POST',body:b});log('format '+b.length+' bytes in '+(performance.now()-t).toFixed(0)+' ms');window.__result={ok:true,bytes:b.length}}
else{await fetch('/upload/format.log',{method:'POST',body:r.log});window.__result={ok:false,status:r.status,log:r.log.slice(-3000)}}`);

const COMPILE_PAGE = PAGE(`
const names=JSON.parse(decodeURIComponent(location.hash.slice(1)));const results={};
for(const name of names){const tex=await (await fetch('/docs/'+name+'.tex')).text();
send({cmd:'writefile',url:'main.tex',src:tex});send({cmd:'setmainfile',url:'main.tex'});
const t=performance.now();send({cmd:'compilelatex'});const r=await once('compile');
const pages=(r.log.match(/Output written on main\\.pdf \\((\\d+) page/)||[])[1];
results[name]={status:r.status,pages:Number(pages),ms:Math.round(performance.now()-t)};log(name+' status='+r.status+' pages='+pages+' '+results[name].ms+'ms');
if(r.status!==0)await fetch('/upload/'+name+'.log',{method:'POST',body:r.log});}
window.__result={ok:Object.values(results).every(r=>r.status===0),results}`);

/* ---------- main ---------- */

async function main() {
	const hits: Hit[] = [];
	const uploads: Record<string, Uint8Array> = {};
	let format: Uint8Array | undefined;
	if (!rebuildFormat) format = Bun.gunzipSync(readFileSync(FORMAT_GZ));

	const docs = documents();
	const server = startServer({
		root: ROOT,
		get format() {
			return format;
		},
		pages: { format: FORMAT_PAGE, compile: COMPILE_PAGE },
		docs,
		onHit: (h) => hits.push(h),
		onUpload: (name, bytes) => (uploads[name] = bytes)
	});
	const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
	const page = await browser.newPage();
	page.on('console', (m) => {
		const t = m.text();
		if (!/^(Start downloading|TexLive File not exists)/.test(t))
			console.log('  [page]', t.slice(0, 200));
	});
	const run = async (url: string) => {
		await page.goto(url);
		await page.waitForFunction(
			() => (window as unknown as { __result: unknown }).__result != null,
			null,
			{ timeout: 600_000 }
		);
		return page.evaluate(() => (window as unknown as { __result: unknown }).__result) as Promise<{
			ok: boolean;
			[k: string]: unknown;
		}>;
	};

	try {
		if (rebuildFormat) {
			console.log('building format…');
			const r = await run(`${server.url}/format.html`);
			if (!r.ok) throw new Error(`format build failed: ${JSON.stringify(r).slice(0, 2000)}`);
			format = uploads['swiftlatexpdftex.fmt'];
			hits.length = 0; // format-build files are baked into the .fmt; not shipped
		}
		console.log(`compiling ${Object.keys(docs).length} documents…`);
		const r = await run(
			`${server.url}/compile.html#${encodeURIComponent(JSON.stringify(Object.keys(docs)))}`
		);
		if (!r.ok) throw new Error(`a document failed to compile: ${JSON.stringify(r.results)}`);
	} finally {
		await browser.close();
		server.stop();
	}

	/* ---------- materialise ---------- */
	const files = new Map<string, Hit>();
	const misses = new Map<string, { fmt: number; name: string }>();
	for (const h of hits) {
		const key = `${h.fmt}/${h.name}`;
		if (h.name === 'swiftlatexpdftex.fmt') continue;
		if (h.name === 'main.aux' || h.name === 'main.out' || h.name.startsWith('main.')) continue;
		if (h.path && h.path !== 'MINIMAL') files.set(key, h);
		else if (!h.path) misses.set(key, { fmt: h.fmt, name: h.name });
	}
	const tfms = new Set([...files.values()].filter((h) => h.fmt === 3).map((h) => h.name));

	if (existsSync(TREE)) rmSync(TREE, { recursive: true });
	const manifestFiles: { fmt: number; name: string; bytes: number }[] = [];
	for (const h of [...files.values()].sort(
		(a, b) => a.fmt - b.fmt || a.name.localeCompare(b.name)
	)) {
		let bytes: Uint8Array;
		if (h.fmt === 11 && h.name === 'pdftex.map') {
			// 5 MB upstream; keep the lines for fonts we actually load.
			bytes = new TextEncoder().encode(
				readFileSync(h.path!, 'utf8')
					.split('\n')
					.filter((l) => tfms.has(l.split(' ')[0]))
					.join('\n') + '\n'
			);
		} else bytes = new Uint8Array(readFileSync(h.path!));
		const dest = join(TREE, String(h.fmt), h.name);
		mkdirSync(dirname(dest), { recursive: true });
		writeFileSync(dest, bytes);
		manifestFiles.push({ fmt: h.fmt, name: h.name, bytes: bytes.length });
	}
	writeFileSync(FORMAT_GZ, Bun.gzipSync(format!, { level: 9 }));
	const manifest = {
		version: 1,
		engine: 'swiftlatexpdftex v20022022 (pdfTeX 1.40.21)',
		format: {
			fmt: 10,
			name: 'swiftlatexpdftex.fmt',
			file: basename(FORMAT_GZ),
			bytes: format!.length
		},
		files: manifestFiles,
		misses: [...misses.values()].sort((a, b) => a.fmt - b.fmt || a.name.localeCompare(b.name))
	};
	writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, '\t') + '\n');

	const total = manifestFiles.reduce((n, f) => n + f.bytes, 0);
	console.log(
		`wrote ${manifestFiles.length} files (${(total / 1e6).toFixed(2)} MB), ${manifest.misses.length} known misses,`
	);
	console.log(
		`format ${(format!.length / 1e6).toFixed(1)} MB raw / ${(statSync(FORMAT_GZ).size / 1e6).toFixed(1)} MB gzipped`
	);
	console.log(
		`tree: ${readdirSync(TREE)
			.map((d) => `${d}/ (${readdirSync(join(TREE, d)).length})`)
			.join(', ')}`
	);
}

await main();
