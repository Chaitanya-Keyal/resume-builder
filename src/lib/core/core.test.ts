import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderTex, templates } from './latex';
import { formatDate, formatRange } from './latex/dates';
import { normalizeTex } from './latex/normalize';
import { resolve } from './resolve/resolve';
import { resumeSchema } from './schema/resume';
import { parseProfile } from './schema/validate';
import { overlaySchema } from './schema/workspace';

const FIX = join(import.meta.dir, '../../../fixtures/sample');
const read = (f: string) => readFileSync(join(FIX, f), 'utf8');

function loadFixture() {
	const { profile, warnings } = parseProfile(JSON.parse(read('profile.json')));
	const overlay = overlaySchema.parse(JSON.parse(read('overlay.json')));
	const resume = resumeSchema.parse(JSON.parse(read('resume.jake.json')));
	return { profile, overlay, resume, warnings };
}

function unifiedDiff(a: string, b: string): string {
	const al = a.split('\n');
	const bl = b.split('\n');
	const out: string[] = [];
	const n = Math.max(al.length, bl.length);
	for (let i = 0; i < n; i++) {
		if (al[i] !== bl[i]) {
			out.push(`@@ line ${i + 1}`);
			out.push(`- ${al[i] ?? '<eof>'}`);
			out.push(`+ ${bl[i] ?? '<eof>'}`);
			if (out.length > 40) break;
		}
	}
	return out.join('\n');
}

describe('fixture', () => {
	test('profile parses without warnings', () => {
		const { warnings } = loadFixture();
		expect(warnings).toEqual([]);
	});

	test('resolves with no problems', () => {
		const { profile, overlay, resume } = loadFixture();
		const { resolved, problems } = resolve(profile, overlay, resume);
		expect(problems).toEqual([]);
		expect(resolved.header.contacts.map((c) => c.kind)).toEqual([
			'phone',
			'email',
			'url',
			'profile',
			'profile'
		]);
		expect(resolved.sections.map((s) => s.type)).toEqual([
			'education',
			'work',
			'projects',
			'volunteer',
			'awards',
			'skills'
		]);
	});

	test('jake renders the golden resume.tex (modulo whitespace and comments)', () => {
		const { profile, overlay, resume } = loadFixture();
		const { resolved } = resolve(profile, overlay, resume);
		const got = normalizeTex(renderTex(resolved, resume));
		const want = normalizeTex(read('resume.tex'));
		if (got !== want) console.log(unifiedDiff(want, got));
		expect(got).toBe(want);
	});

	test('every template renders the sample and its golden fixture stays a clean snapshot', () => {
		const { profile, overlay } = loadFixture();
		for (const t of Object.values(templates)) {
			const resume = resumeSchema.parse(
				JSON.parse(read(`resume.${t.id}.json`).replace(/"template": ".*"/, `"template": "${t.id}"`))
			);
			const { resolved, problems } = resolve(profile, overlay, resume);
			expect(problems).toEqual([]);
			const tex = renderTex(resolved, resume);
			expect(tex).toContain('\\begin{document}');
			expect(tex).toContain('Jane Doe');
			expect(tex.split('\\section{').length - 1).toBe(resume.sections.length);
		}
	});

	test('orphans are reported, not thrown', () => {
		const { profile, overlay, resume } = loadFixture();
		const r = structuredClone(resume);
		r.sections[1].items.push({ ref: 'work:nope/x', bullets: [] });
		(r.sections[1].items[1] as { bullets: string[] }).bullets.push('h_missing');
		const { problems } = resolve(profile, overlay, r);
		expect(problems.map((p) => p.kind).sort()).toEqual(['orphan-bullet', 'orphan-ref']);
	});

	test('overrides and stale detection', () => {
		const { profile, overlay, resume } = loadFixture();
		const r = structuredClone(resume);
		const item = r.sections[1].items[1] as {
			ref: string;
			bullets: string[];
			overrides?: Record<string, unknown>;
		};
		item.overrides = { bullets: { h_acme_e1: { text: 'New wording', baseText: 'old' } } };
		const { resolved, problems } = resolve(profile, overlay, r);
		const work = resolved.sections[1].items[1];
		expect(work.bullets[0]).toMatchObject({ text: 'New wording', overridden: true });
		expect(problems.some((p) => p.kind === 'stale-override')).toBe(true);
	});

	test('overlay never leaks into the profile', () => {
		const { profile, overlay, resume } = loadFixture();
		resolve(profile, overlay, resume);
		expect(profile.basics.phone).toBeUndefined();
	});
});

describe('dates', () => {
	test('formatDate', () => {
		expect(formatDate('2025-06', 'MMM yyyy')).toBe('Jun 2025');
		expect(formatDate('2025-06', 'MMMM yyyy')).toBe('June 2025');
		expect(formatDate('2025-06-15', 'MM/yyyy')).toBe('06/2025');
		expect(formatDate('2028', 'MMM yyyy')).toBe('2028');
	});
	test('formatRange', () => {
		const o = { style: 'MMM yyyy' as const, separator: ' -- ', present: 'Present' };
		expect(formatRange({ start: '2025-05', end: '2025-08' }, o)).toBe('May 2025 -- Aug 2025');
		expect(formatRange({ start: '2025-05' }, o)).toBe('May 2025 -- Present');
		expect(formatRange({ end: '2028' }, o)).toBe('2028');
		expect(formatRange({ label: 'Summer 2025', start: '2025-05' }, o)).toBe('Summer 2025');
		expect(formatRange({ label: '', start: '2025-05' }, o)).toBe('');
		expect(formatRange({}, o)).toBe('');
	});
});

describe('templates', () => {
	test('density presets validate against the options schema', () => {
		for (const t of Object.values(templates)) {
			for (const d of t.density)
				expect(t.optionsSchema.safeParse({ ...t.defaults, ...d.options }).success).toBe(true);
		}
	});
});

describe('core purity', () => {
	test('src/lib/core imports nothing from svelte, $app or node', () => {
		const root = join(import.meta.dir);
		const offenders: string[] = [];
		const walk = (dir: string) => {
			for (const name of readdirSync(dir)) {
				const p = join(dir, name);
				if (statSync(p).isDirectory()) walk(p);
				else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) {
					const src = readFileSync(p, 'utf8');
					if (/from\s+['"](svelte|\$app|\$lib|node:|bun:)/.test(src))
						offenders.push(p.slice(root.length));
				}
			}
		};
		walk(root);
		expect(offenders).toEqual([]);
	});
});
