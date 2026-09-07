import { describe, expect, test } from 'bun:test';
import { fromJsonResume, looksLikeJsonResume, toJsonResume } from './jsonresume';
import { migrateProfile, MigrationError } from './migrate';
import { emptyProfile, profileSchema } from './profile';
import { resumeSchema } from './resume';
import { parseProfile, ValidationError } from './validate';
import { formatRef, listRefs, lookupRef, parseRef } from '../resolve/refs';

const sample = {
	basics: {
		name: 'Jane Doe',
		label: 'Engineer',
		email: 'jane@example.com',
		phone: '+1 555',
		profiles: [{ network: 'GitHub', username: 'jane', url: 'https://github.com/jane' }]
	},
	work: [
		{
			name: 'Acme',
			position: 'Senior Engineer',
			startDate: '2024-01',
			highlights: ['Led **platform** rewrite', 'Cut costs 30%']
		},
		{ name: 'Acme', position: 'Engineer', startDate: '2022-01', endDate: '2023-12', highlights: ['Shipped v1'] },
		{ name: 'Widgets Inc', position: 'Intern', startDate: '2021-06', endDate: '2021-08' }
	],
	volunteer: [{ organization: 'Code Club', position: 'Mentor', startDate: '2020', highlights: ['Taught 40 kids'] }],
	education: [{ institution: 'State University', area: 'CS', studyType: 'B.S.', endDate: '2021', courses: ['Algorithms'] }],
	projects: [{ name: 'Tool', keywords: ['Rust'], highlights: ['Fast'], url: 'https://t.dev' }],
	skills: [{ name: 'Languages', keywords: ['Rust', 'Go'] }],
	awards: [{ title: 'Hackathon winner', date: '2023-05', awarder: 'Big Corp' }]
};

describe('JSON Resume import', () => {
	test('detects plain JSON Resume', () => {
		expect(looksLikeJsonResume(sample)).toBe(true);
		expect(looksLikeJsonResume({ version: 1, basics: {} })).toBe(false);
	});

	test('merges consecutive same-name work items into stints', () => {
		const p = fromJsonResume(sample);
		expect(p.work.map((w) => w.id)).toEqual(['acme', 'widgets-inc']);
		expect(p.work[0].positions.map((pos) => pos.id)).toEqual(['2024', '2022']);
		expect(p.work[0].positions[0].highlights[0]).toMatchObject({ text: 'Led **platform** rewrite' });
		expect(p.work[0].positions[0].highlights[0].id).toMatch(/^h_/);
		expect(p.volunteer[0]).toMatchObject({ id: 'code-club', name: 'Code Club' });
		expect(p.education[0].id).toBe('state-university');
		expect(p.skills[0]).toMatchObject({ id: 'languages', keywords: ['Rust', 'Go'] });
	});

	test('round trip flattens back to the standard shape', () => {
		const back = toJsonResume(fromJsonResume(sample)) as typeof sample;
		expect(back.basics.name).toBe('Jane Doe');
		expect(back.work).toHaveLength(3);
		expect(back.work[0]).toMatchObject({ name: 'Acme', position: 'Senior Engineer', highlights: ['Led **platform** rewrite', 'Cut costs 30%'] });
		expect(back.volunteer[0]).toMatchObject({ organization: 'Code Club', position: 'Mentor' });
		expect('id' in back.projects[0]).toBe(false);
		expect(back.projects[0].highlights).toEqual(['Fast']);
	});
});

describe('migrate + validate', () => {
	test('plain JSON Resume migrates to version 1', () => {
		const m = migrateProfile(sample) as { version: number };
		expect(m.version).toBe(1);
	});
	test('unknown shapes and future versions are refused', () => {
		expect(() => migrateProfile({ foo: 1 })).toThrow(MigrationError);
		expect(() => migrateProfile({ version: 99, basics: {} })).toThrow(MigrationError);
	});
	test('parseProfile warns about phone and duplicate ids error', () => {
		const { profile, warnings } = parseProfile(sample);
		expect(profile.basics.name).toBe('Jane Doe');
		expect(warnings.some((w) => w.path === 'basics.phone')).toBe(true);
		const dup = structuredClone(profile);
		dup.projects.push({ ...dup.projects[0] });
		expect(() => parseProfile(dup)).toThrow(ValidationError);
	});
	test('empty profile parses', () => {
		expect(profileSchema.parse(emptyProfile('X')).basics.name).toBe('X');
	});
	test('bad dates are rejected', () => {
		const bad = structuredClone(fromJsonResume(sample));
		bad.education[0].endDate = 'May 2021';
		expect(() => parseProfile(bad)).toThrow(ValidationError);
	});
});

describe('resume schema', () => {
	test('defaults fill in', () => {
		const r = resumeSchema.parse({
			id: 'r1',
			name: 'Default',
			createdAt: 'now',
			updatedAt: 'now',
			template: 'jake',
			sections: [{ id: 's1', type: 'work', items: [{ ref: 'work:acme/2024' }] }]
		});
		expect(r.header.showPhone).toBe(true);
		expect(r.labels).toEqual([]);
		expect((r.sections[0].items[0] as { bullets: string[] }).bullets).toEqual([]);
	});
	test('bad refs are rejected', () => {
		expect(() =>
			resumeSchema.parse({
				id: 'r1',
				name: 'x',
				createdAt: '',
				updatedAt: '',
				template: 'jake',
				sections: [{ id: 's', type: 'work', items: [{ ref: 'work acme' }] }]
			})
		).toThrow();
	});
});

describe('refs', () => {
	const p = fromJsonResume(sample);
	test('parse and format', () => {
		expect(parseRef('work:acme/2024')).toEqual({ collection: 'work', id: 'acme', positionId: '2024' });
		expect(parseRef('projects:tool')).toEqual({ collection: 'projects', id: 'tool', positionId: undefined });
		expect(parseRef('work:acme')).toBeNull();
		expect(parseRef('projects:tool/x')).toBeNull();
		expect(parseRef('nope:x')).toBeNull();
		expect(formatRef('work', 'acme', '2024')).toBe('work:acme/2024');
	});
	test('lookup', () => {
		const l = lookupRef(p, 'work:acme/2022');
		expect(l && l.collection === 'work' && l.position.position).toBe('Engineer');
		expect(lookupRef(p, 'work:acme/1999')).toBeNull();
		expect(lookupRef(p, 'skills:languages')).toMatchObject({ collection: 'skills' });
	});
	test('listRefs enumerates stints', () => {
		const refs = listRefs(p).map((r) => r.ref);
		expect(refs).toContain('work:acme/2024');
		expect(refs).toContain('work:acme/2022');
		expect(refs).toContain('volunteer:code-club/2020');
		expect(refs).toContain('awards:hackathon-winner');
		expect(listRefs(p, 'skills')).toHaveLength(1);
	});
});
