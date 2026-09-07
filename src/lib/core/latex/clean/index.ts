import { escapeLatex, escapeUrl, toLatex } from '../../markup';
import type { DateRange, ResolvedItem, ResolvedResume, ResolvedSection } from '../../resolve/types';
import type { SectionType } from '../../schema/types';
import { formatRange } from '../dates';
import type { Template } from '../template';
import { cleanDefaults, cleanOptionsSchema, type CleanOptions } from './options';
import { preamble } from './preamble';

const SECTION_TITLES: Partial<Record<SectionType, string>> = {
	education: 'Education',
	work: 'Experience',
	projects: 'Projects',
	volunteer: 'Leadership',
	skills: 'Skills',
	awards: 'Awards',
	certificates: 'Certifications',
	publications: 'Publications',
	languages: 'Languages',
	interests: 'Interests'
};

function render(resume: ResolvedResume, o: CleanOptions): string {
	const md = (s: string) => toLatex(s, { underlineLinks: o.underlineLinks });
	const link = (href: string, text: string) =>
		`\\href{${escapeUrl(href)}}{${o.underlineLinks ? `\\underline{${escapeLatex(text)}}` : escapeLatex(text)}}`;
	const dates = (d: DateRange) =>
		formatRange(d, { style: o.dateStyle, separator: ' -- ', present: 'Present' });

	const header = () => {
		const h = resume.header;
		const contacts = h.contacts.map((c) => (c.href ? link(c.href, c.text) : escapeLatex(c.text)));
		const lines = [`{\\Huge\\bfseries ${md(h.name)}}\\par`];
		if (h.tagline) lines.push(`\\vspace{2pt}{\\large ${md(h.tagline)}}\\par`);
		if (contacts.length)
			lines.push(`\\vspace{3pt}{\\small ${contacts.join(' \\textbullet{} ')}}\\par`);
		if (h.summary) lines.push(`\\vspace{4pt}{\\small ${md(h.summary)}}\\par`);
		return `${lines.join('\n')}\n`;
	};

	const bullets = (items: ResolvedItem['bullets']) =>
		items.length
			? `\\cleanListStart\n${items.map((b) => `\\cleanItem{${md(b.text)}}`).join('\n')}\n\\cleanListEnd\n`
			: '';
	const paragraph = (text: string | undefined) =>
		text ? `{\\small ${md(text)}}\\par\\vspace{-2pt}\n` : '';

	const subheading = (it: Extract<ResolvedItem, { kind: 'subheading' }>) =>
		`\\cleanEntry{${md(it.title)}}{${escapeLatex(dates(it.dates))}}{${md(it.subtitle)}}{${escapeLatex(it.location)}}\n${paragraph(it.description)}${bullets(it.bullets)}`;

	const project = (it: Extract<ResolvedItem, { kind: 'project' }>) => {
		const head = it.keywords.length
			? `\\textbf{${md(it.title)}} \\textbullet{} \\textit{${escapeLatex(it.keywords.join(', '))}}`
			: `\\textbf{${md(it.title)}}`;
		return `\\cleanLine{${head}}{${escapeLatex(dates(it.dates))}}\n${paragraph(it.description)}${bullets(it.bullets)}`;
	};

	const award = (it: Extract<ResolvedItem, { kind: 'award' }>) => {
		const head = it.awarder
			? `\\textbf{${md(it.title)}} \\textbullet{} \\textit{${md(it.awarder)}}`
			: `\\textbf{${md(it.title)}}`;
		return `\\cleanLine{${head}}{${escapeLatex(dates(it.dates))}}\n${it.summary ? bullets([{ id: it.key, text: it.summary }]) : ''}`;
	};

	const simple = (it: Extract<ResolvedItem, { kind: 'simple' }>) => {
		const name = it.url ? link(it.url, it.name) : `\\textbf{${md(it.name)}}`;
		const head = it.detail ? `${name} \\textbullet{} \\textit{${md(it.detail)}}` : name;
		return `\\cleanLine{${head}}{${escapeLatex(dates(it.dates))}}\n`;
	};

	const skillsBlock = (items: Extract<ResolvedItem, { kind: 'skills' }>[]) =>
		`\\vspace{2pt}\n${items
			.map((s) => `{\\small \\textbf{${md(s.name)}}: ${escapeLatex(s.keywords.join(', '))}}\\par`)
			.join('\n')}\n`;

	const section = (s: ResolvedSection) => {
		const title = (s.title ?? SECTION_TITLES[s.type] ?? '').toUpperCase();
		const out: string[] = [`\\section{${md(title)}}`];
		if (s.items.every((i) => i.kind === 'skills')) {
			out.push(skillsBlock(s.items as Extract<ResolvedItem, { kind: 'skills' }>[]));
		} else {
			for (const it of s.items) {
				switch (it.kind) {
					case 'subheading':
						out.push(subheading(it));
						break;
					case 'project':
						out.push(project(it));
						break;
					case 'award':
						out.push(award(it));
						break;
					case 'simple':
						out.push(simple(it));
						break;
					case 'skills':
						out.push(
							`{\\small \\textbf{${md(it.name)}}: ${escapeLatex(it.keywords.join(', '))}}\\par`
						);
						break;
				}
			}
		}
		return out.join('\n') + '\n';
	};

	return [
		preamble(o),
		'\\begin{document}',
		'',
		header(),
		...resume.sections.map(section),
		'\\end{document}',
		''
	].join('\n');
}

export const clean: Template<CleanOptions> = {
	id: 'clean',
	name: 'Clean',
	description: 'Sans-serif, left-aligned, thin rules under bold section titles. No small caps.',
	optionsSchema: cleanOptionsSchema,
	defaults: cleanDefaults,
	density: [
		{ id: 'roomy', label: 'Roomy', options: { margins: 'roomy', spacing: 'normal', fontSize: 11 } },
		{
			id: 'standard',
			label: 'Standard',
			options: { margins: 'default', spacing: 'normal', fontSize: 11 }
		},
		{
			id: 'compact',
			label: 'Compact',
			options: { margins: 'tight', spacing: 'tight', fontSize: 10 }
		}
	],
	sectionTitles: SECTION_TITLES,
	defaultSectionOrder: [
		'work',
		'projects',
		'education',
		'skills',
		'volunteer',
		'awards',
		'certificates',
		'publications',
		'languages',
		'interests'
	],
	render
};
