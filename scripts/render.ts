// Render a resume to LaTeX from the command line.
//   bun scripts/render.ts <profile.json> <resume.json> [overlay.json] > out.tex
import { readFileSync } from 'node:fs';
import { renderTex } from '../src/lib/core/latex';
import { resolve } from '../src/lib/core/resolve/resolve';
import { resumeSchema } from '../src/lib/core/schema/resume';
import { parseProfile } from '../src/lib/core/schema/validate';
import { overlaySchema } from '../src/lib/core/schema/workspace';

const [profilePath, resumePath, overlayPath] = process.argv.slice(2);
if (!profilePath || !resumePath) {
	console.error('usage: bun scripts/render.ts <profile.json> <resume.json> [overlay.json]');
	process.exit(2);
}
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const { profile, warnings } = parseProfile(json(profilePath));
for (const w of warnings) console.error(`warning: ${w.path}: ${w.message}`);
const resume = resumeSchema.parse(json(resumePath));
const overlay = overlayPath ? overlaySchema.parse(json(overlayPath)) : undefined;
const { resolved, problems } = resolve(profile, overlay, resume);
for (const p of problems)
	console.error(`problem: ${p.kind} ${p.ref ?? ''} ${p.id ?? ''}: ${p.message}`);
process.stdout.write(renderTex(resolved, resume));
