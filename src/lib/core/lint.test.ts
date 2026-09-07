import { describe, expect, test } from 'bun:test';
import { lintResume } from './lint';
import type { ResolvedResume } from './resolve/types';

function resume(bullets: string[]): ResolvedResume {
	return {
		header: { name: 'A', contacts: [{ kind: 'email', text: 'a@b.c', href: 'mailto:a@b.c' }] },
		sections: [
			{
				id: 's',
				type: 'work',
				items: [
					{
						kind: 'subheading',
						key: 'work:x/y',
						title: 'X',
						subtitle: 'Y',
						dates: {},
						location: '',
						bullets: bullets.map((text, i) => ({ id: `h${i}`, text }))
					}
				]
			}
		]
	};
}

describe('lint', () => {
	test('flags weak starts, first person, long and number-less bullets', () => {
		const codes = lintResume(
			resume([
				'Responsible for the billing service.',
				'I cut costs by 40%.',
				'Built a pipeline that processed 10k events per second with exactly-once delivery guarantees across three regions and two cloud providers, including quarterly failover drills, runbooks and on-call rotations for the whole platform team.',
				'Mentored engineers.'
			])
		).map((h) => h.code);
		expect(codes).toContain('weak-start');
		expect(codes).toContain('first-person');
		expect(codes).toContain('long');
		expect(codes).toContain('no-number');
	});
	test('says nothing about a clean bullet', () => {
		expect(lintResume(resume(['Cut p99 latency from 900 ms to 120 ms.']))).toEqual([]);
	});
	test('notices mixed periods and a missing header', () => {
		const r = resume(['Shipped 3 features.', 'Shipped 4 features']);
		r.header.contacts = [];
		const codes = lintResume(r).map((h) => h.code);
		expect(codes).toContain('mixed-periods');
		expect(codes).toContain('no-contact');
	});
});
