/**
 * Deterministic hints about a composed resume: nothing here needs a model,
 * everything here is what a careful reviewer says first. Pure; runs on the
 * resolved resume so overrides and exclusions are already applied.
 */
import { toPlain } from './markup';
import type { ResolvedResume } from './resolve/types';

export type LintCode =
	| 'no-contact'
	| 'no-number'
	| 'long'
	| 'weak-start'
	| 'first-person'
	| 'duplicate'
	| 'no-bullets'
	| 'mixed-periods';

export interface LintHint {
	code: LintCode;
	level: 'warn' | 'info';
	message: string;
	/** Item key (`work:acme/senior`) when the hint is about one entry. */
	key?: string;
	/** Bullet id when the hint is about one bullet. */
	id?: string;
	/** Start of the bullet, so a list of hints reads without the resume beside it. */
	snippet?: string;
}

export interface LintOptions {
	/** Plain-text length past which a bullet almost surely wraps to a third line. */
	maxBulletChars?: number;
}

const WEAK =
	/^(responsible for|worked on|helped|assisted|participated|involved in|was |were |tasked with|duties included)/i;
const FIRST_PERSON = /\b(i|me|my|mine|we|our)\b/i;

function normalise(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

export function lintResume(resume: ResolvedResume, opts: LintOptions = {}): LintHint[] {
	const max = opts.maxBulletChars ?? 210;
	const hints: LintHint[] = [];
	if (!resume.header.contacts.length)
		hints.push({ code: 'no-contact', level: 'warn', message: 'No contact details in the header.' });

	const seen = new Map<string, string>();
	let withPeriod = 0;
	let withoutPeriod = 0;
	for (const section of resume.sections) {
		for (const item of section.items) {
			if (item.kind !== 'subheading' && item.kind !== 'project') continue;
			if (!item.bullets.length && !item.description)
				hints.push({ code: 'no-bullets', level: 'info', key: item.key, message: 'No bullets.' });
			for (const b of item.bullets) {
				const text = toPlain(b.text).trim();
				if (!text) continue;
				const at = {
					key: item.key,
					id: b.id,
					snippet: text.length > 60 ? text.slice(0, 57).trimEnd() + '...' : text
				};
				if (text.length > max)
					hints.push({
						code: 'long',
						level: 'warn',
						...at,
						message: `Long (${text.length} characters); likely wraps to a third line.`
					});
				if (!/\d/.test(text))
					hints.push({ code: 'no-number', level: 'info', ...at, message: 'No number or metric.' });
				if (WEAK.test(text))
					hints.push({
						code: 'weak-start',
						level: 'warn',
						...at,
						message: 'Starts weakly; lead with the action and the result.'
					});
				if (FIRST_PERSON.test(text))
					hints.push({ code: 'first-person', level: 'warn', ...at, message: 'First person.' });
				const norm = normalise(text);
				const prior = seen.get(norm);
				if (prior && prior !== item.key)
					hints.push({
						code: 'duplicate',
						level: 'warn',
						...at,
						message: 'Same bullet appears under another entry.'
					});
				else seen.set(norm, item.key);
				if (/[.!?]$/.test(text)) withPeriod++;
				else withoutPeriod++;
			}
		}
	}
	if (withPeriod && withoutPeriod)
		hints.push({
			code: 'mixed-periods',
			level: 'info',
			message: `${withPeriod} bullets end with a period and ${withoutPeriod} do not.`
		});
	return hints;
}
