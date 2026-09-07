/**
 * "What a parser sees": the extracted text plus deterministic checks that
 * catch the usual ATS failures (missing glyphs, ligature collapse, unreadable
 * contact details).
 */
import type { ResolvedResume } from '$lib/core/resolve/types';
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

export function atsReport(pagesText: string[], resolved: ResolvedResume): AtsReport {
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

	// Ligatures: "fi"/"fl" usually survive with glyphtounicode, but check a few known words.
	const ligWords = ['first', 'file', 'workflow', 'office', 'efficient', 'profile'];
	const lig = ligWords.filter(
		(w) => new RegExp(w.replace(/f[il]/, '.'), 'i').test(flat) && !new RegExp(w, 'i').test(flat)
	);
	if (lig.length)
		checks.push({ level: 'warn', message: `Possible ligature collapse in: ${lig.join(', ')}.` });

	// Section headings should appear, in order.
	const titles = resolved.sections.map((s) => s.title ?? '').filter(Boolean);
	let cursor = 0;
	let ordered = true;
	for (const t of titles) {
		const at = flat.indexOf(t, cursor);
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
