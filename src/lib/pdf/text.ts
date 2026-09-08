/**
 * "What a parser sees": the extracted text plus deterministic checks that
 * catch the usual ATS failures (missing glyphs, ligature collapse, unreadable
 * contact details).
 */
import type { ResolvedResume } from '$lib/core/resolve/types';
import type { SectionType } from '$lib/core/schema/types';
import { toPlain } from '$lib/core/markup';

export interface AtsCheck {
	level: 'ok' | 'warn' | 'error';
	message: string;
}

export interface AtsReport {
	text: string;
	pages: number;
	checks: AtsCheck[];
}

/** `defaultTitles` are the template's headings for sections without a title of their own. */
export function atsReport(
	pagesText: string[],
	resolved: ResolvedResume,
	defaultTitles: Partial<Record<SectionType, string>> = {}
): AtsReport {
	const text = pagesText.join('\n\n');
	const checks: AtsCheck[] = [];
	const flat = text.replace(/\s+/g, ' ');

	const bad = [...text].filter((c) => {
		const code = c.codePointAt(0)!;
		return c === '�' || (code >= 0xe000 && code <= 0xf8ff);
	});
	checks.push(
		bad.length
			? {
					level: 'error',
					message: `${bad.length} character(s) came out as private-use or replacement glyphs.`
				}
			: { level: 'ok', message: 'Every character maps to real text.' }
	);

	const name = toPlain(resolved.header.name);
	checks.push(
		flat.includes(name)
			? { level: 'ok', message: `Name "${name}" is extractable.` }
			: { level: 'error', message: `Name "${name}" was not found in the extracted text.` }
	);

	for (const c of resolved.header.contacts) {
		const found = flat.includes(c.text);
		checks.push(
			found
				? { level: 'ok', message: `${c.kind}: ${c.text}` }
				: { level: 'warn', message: `${c.kind} "${c.text}" is not extractable as typed.` }
		);
	}

	// Ligatures: with glyphtounicode the PDF maps "fi"/"fl" glyphs back to plain letters. If a
	// parser still sees the single ligature code points, or the replacement character, some
	// keyword matchers will not find "file" or "workflow".
	const ligs = flat.match(/[\uFB00-\uFB06]/g) ?? [];
	if (ligs.length)
		checks.push({
			level: 'warn',
			message: `${ligs.length} ligature glyph${ligs.length === 1 ? '' : 's'} (fi, fl, ff) came out as single characters; keyword matchers may miss those words.`
		});
	if (/\uFFFD/.test(flat))
		checks.push({ level: 'warn', message: 'Some characters could not be mapped to text.' });

	// Section headings should appear, in order. Templates may print them in capitals.
	const titles = resolved.sections
		.map((s) => toPlain(s.title ?? defaultTitles[s.type] ?? '').toLowerCase())
		.filter(Boolean);
	const lower = flat.toLowerCase();
	let cursor = 0;
	let ordered = true;
	for (const t of titles) {
		const at = lower.indexOf(t, cursor);
		if (at === -1) {
			ordered = false;
			break;
		}
		cursor = at + t.length;
	}
	if (titles.length) {
		checks.push(
			ordered
				? { level: 'ok', message: 'Section headings appear in order.' }
				: {
						level: 'warn',
						message:
							'Some section headings were not found in order; a parser may mis-assign entries.'
					}
		);
	}

	if (pagesText.length > 1)
		checks.push({ level: 'warn', message: `${pagesText.length} pages. Many screens expect one.` });

	return { text, pages: pagesText.length, checks };
}
