// Render a resume and compile it with a native pdflatex, using the very same
// TeX files the browser engine uses (static/texlive), so the PDF is identical
// to the one the app shows. Meant for CI on a site that publishes the resume.
//
//   bun scripts/pdf.ts <profile.json> <resume.json> <out.pdf> [--overlay overlay.json] [--phone "+1 ..."]
//
// Needs `pdflatex` on PATH with a plain LaTeX format (Debian: texlive-latex-base).
// Everything else (article.cls, the packages, the fonts, the map) comes from
// static/texlive, so the distribution's own packages never leak in.
import { mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve as resolvePath } from 'node:path';
import { spawnSync } from 'node:child_process';
import { renderTex } from '../src/lib/core/latex';
import { resolve } from '../src/lib/core/resolve/resolve';
import { resumeSchema } from '../src/lib/core/schema/resume';
import { parseProfile } from '../src/lib/core/schema/validate';
import { overlaySchema } from '../src/lib/core/schema/workspace';
import type { Overlay } from '../src/lib/core/schema/types';

const args = process.argv.slice(2);
const positional: string[] = [];
let overlayPath: string | undefined;
let phone: string | undefined;
for (let i = 0; i < args.length; i++) {
	if (args[i] === '--overlay') overlayPath = args[++i];
	else if (args[i] === '--phone') phone = args[++i];
	else positional.push(args[i]);
}
const [profilePath, resumePath, outPath] = positional;
if (!profilePath || !resumePath || !outPath) {
	console.error(
		'usage: bun scripts/pdf.ts <profile.json> <resume.json> <out.pdf> [--overlay overlay.json] [--phone "+1 ..."]'
	);
	process.exit(2);
}

const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const { profile, warnings } = parseProfile(json(profilePath));
for (const w of warnings) console.error(`warning: ${w.path}: ${w.message}`);
const resume = resumeSchema.parse(json(resumePath));
let overlay: Overlay | undefined = overlayPath ? overlaySchema.parse(json(overlayPath)) : undefined;
if (phone) overlay = { version: 1, ...overlay, basics: { ...overlay?.basics, phone } };
const { resolved, problems } = resolve(profile, overlay, resume);
for (const p of problems)
	console.error(`problem: ${p.kind} ${p.ref ?? ''} ${p.id ?? ''}: ${p.message}`);
const tex = renderTex(resolved, resume);

// kpathsea format ids, as the engine requests them: 26 tex, 3 tfm, 32 type1, 44 enc, 11 map.
const T = resolvePath(import.meta.dir, '..', 'static', 'texlive', 'pdftex');
const work = mkdtempSync(join(tmpdir(), 'resume-pdf-'));
writeFileSync(join(work, 'main.tex'), tex);
const r = spawnSync(
	'pdflatex',
	['-interaction=nonstopmode', '-halt-on-error', '-no-shell-escape', 'main.tex'],
	{
		cwd: work,
		encoding: 'utf8',
		env: {
			...process.env,
			TEXINPUTS: `.:${T}/26`,
			TFMFONTS: `${T}/3`,
			T1FONTS: `${T}/32`,
			ENCFONTS: `${T}/44`,
			TEXFONTMAPS: `${T}/11`,
			// Reproducible: no timestamps or ids that change per run.
			SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH ?? '0',
			FORCE_SOURCE_DATE: '1'
		}
	}
);
if (r.status !== 0) {
	const log = (() => {
		try {
			return readFileSync(join(work, 'main.log'), 'utf8');
		} catch {
			return r.stdout + r.stderr;
		}
	})();
	console.error(
		log
			.split('\n')
			.filter((l) => /^!|^l\.\d+|Emergency/.test(l))
			.join('\n') || log.slice(-3000)
	);
	console.error(`pdflatex failed (${r.status ?? r.error?.message}); tex kept at ${work}/main.tex`);
	process.exit(1);
}
const log = readFileSync(join(work, 'main.log'), 'utf8');
const pages = log.match(/Output written on main\.pdf \((\d+) page/)?.[1] ?? '?';
copyFileSync(join(work, 'main.pdf'), outPath);
rmSync(work, { recursive: true, force: true });
console.error(`wrote ${outPath} (${pages} page${pages === '1' ? '' : 's'})`);
