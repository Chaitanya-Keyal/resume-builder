import { escapeLatex, escapeUrl, toLatex } from '../../markup';
import type { DateRange, ResolvedItem, ResolvedResume, ResolvedSection } from '../../resolve/types';
import type { SectionType } from '../../schema/types';
import { formatRange } from '../dates';
import type { Template } from '../template';
import { jakeDefaults, jakeOptionsSchema, type JakeOptions } from './options';
import { preamble } from './preamble';

const SECTION_TITLES: Partial<Record<SectionType, string>> = {
	education: 'Education',
	work: 'Experience',
	projects: 'Projects',
	volunteer: 'Leadership & Involvement',
	skills: 'Technical Skills',
	awards: 'Awards',
	certificates: 'Certifications',
	publications: 'Publications',
	languages: 'Languages',
	interests: 'Interests'
};

function render(resume: ResolvedResume, o: JakeOptions): string {
	const md = (s: string) => toLatex(s, { underlineLinks: o.underlineLinks });
	const link = (href: string, text: string) =>
		`\\href{${escapeUrl(href)}}{${o.underlineLinks ? `\\underline{${escapeLatex(text)}}` : escapeLatex(text)}}`;
	const dates = (d: DateRange) =>
		formatRange(d, { style: o.dateStyle, separator: ' -- ', present: 'Present' });

	const banner = (title: string) => `%-----------${title.toUpperCase()}-----------`;

	const header = () => {
		const h = resume.header;
		const contacts = h.contacts.map((c) => (c.href ? link(c.href, c.text) : escapeLatex(c.text)));
		const lines = [`    \\textbf{\\Huge \\scshape ${md(h.name)}} \\\\ \\vspace{2pt}`];
		if (contacts.length) {
			lines.push(`    \\small ${contacts.join(' $|$ ')}${h.tagline ? ' \\\\ \\vspace{4pt}' : ''}`);
		}
		if (h.tagline) lines.push(`    \\small ${md(h.tagline)}`);
		const summary = h.summary
			? `\\vspace{-14pt}\n\\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{${md(h.summary)}}}\n\\end{itemize}\\vspace{-4pt}\n`
			: '';
		return `${banner('heading')}\n\\begin{center}\n${lines.join('\n')}\n\\end{center}\n${summary}`;
	};

	const bullets = (items: ResolvedItem['bullets']) =>
		items.length
			? `\\resumeItemListStart\n${items.map((b) => `\\resumeItem{${md(b.text)}}`).join('\n')}\n\\resumeItemListEnd\n`
			: '';

	// A description prints as a short paragraph aligned with the bullet text,
	// using the same label-less list the skills block uses.
	const paragraph = (text: string | undefined) =>
		text
			? `\\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{${md(text)}}}\n\\end{itemize}\\vspace{-14pt}\n`
			: '';

	const subheading = (it: Extract<ResolvedItem, { kind: 'subheading' }>, type: SectionType) => {
		// Education prints location on the first line and the date on the second;
		// everything else prints the date first.
		const [b, d] =
			type === 'education'
				? [escapeLatex(it.location), escapeLatex(dates(it.dates))]
				: [escapeLatex(dates(it.dates)), escapeLatex(it.location)];
		return `\\resumeSubheading\n{${md(it.title)}}{${b}}\n{${md(it.subtitle)}}{${d}}\n${paragraph(it.description)}${bullets(it.bullets)}`;
	};

	const project = (it: Extract<ResolvedItem, { kind: 'project' }>) => {
		const head = it.keywords.length
			? `\\textbf{${md(it.title)}} $|$ \\emph{${escapeLatex(it.keywords.join(', '))}}`
			: `\\textbf{${md(it.title)}}`;
		return `\\resumeProjectHeading\n{${head}}{${escapeLatex(dates(it.dates))}}\n${paragraph(it.description)}${bullets(it.bullets)}`;
	};

	const award = (it: Extract<ResolvedItem, { kind: 'award' }>) => {
		const head = it.awarder
			? `\\textbf{${md(it.title)}} $|$ \\emph{${md(it.awarder)}}`
			: `\\textbf{${md(it.title)}}`;
		const body = it.summary ? bullets([{ id: it.key, text: it.summary }]) : '';
		return `\\resumeProjectHeading\n{${head}}{${escapeLatex(dates(it.dates))}}\n${body}`;
	};

	const simple = (it: Extract<ResolvedItem, { kind: 'simple' }>) => {
		const name = it.url ? link(it.url, it.name) : `\\textbf{${md(it.name)}}`;
		const head = it.detail ? `${name} $|$ \\emph{${md(it.detail)}}` : name;
		return `\\resumeProjectHeading\n{${head}}{${escapeLatex(dates(it.dates))}}\n`;
	};

	const skillsBlock = (items: Extract<ResolvedItem, { kind: 'skills' }>[]) =>
		`\\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n${items
			.map((s) => `          \\textbf{${md(s.name)}}{: ${escapeLatex(s.keywords.join(', '))}} \\\\`)
			.join('\n')}\n          }}\n\\end{itemize}\n`;

	const section = (s: ResolvedSection) => {
		const title = s.title ?? SECTION_TITLES[s.type] ?? '';
		const out: string[] = [banner(title), `\\section{${md(title)}}`];
		if (s.items.every((i) => i.kind === 'skills')) {
			out.push(skillsBlock(s.items as Extract<ResolvedItem, { kind: 'skills' }>[]));
		} else {
			out.push('\\resumeSubHeadingListStart');
			for (const it of s.items) {
				switch (it.kind) {
					case 'subheading':
						out.push(subheading(it, s.type));
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
							`\\resumeItem{\\textbf{${md(it.name)}}{: ${escapeLatex(it.keywords.join(', '))}}}`
						);
						break;
				}
			}
			out.push('\\resumeSubHeadingListEnd');
		}
		return out.join('\n') + '\n';
	};

	return [
		preamble(o),
		'%-------------------------------------------',
		'%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%',
		'',
		'\\begin{document}',
		'',
		header(),
		...resume.sections.map(section),
		'\\end{document}',
		''
	].join('\n');
}

export const jake: Template<JakeOptions> = {
	id: 'jake',
	name: "Jake's Resume",
	description: 'The classic single-column, small-caps-sections, one-page resume.',
	optionsSchema: jakeOptionsSchema,
	defaults: jakeDefaults,
	// Loosest first, so "next denser" is the next entry.
	density: [
		{
			id: 'roomy',
			label: 'Roomy',
			options: { fontSize: 11, margins: 'default', spacing: 'normal' }
		},
		{
			id: 'standard',
			label: 'Standard',
			options: { fontSize: 11, margins: 'tight', spacing: 'tight' }
		},
		{
			id: 'compact',
			label: 'Compact',
			options: { fontSize: 10, margins: 'tight', spacing: 'tight' }
		}
	],
	sectionTitles: SECTION_TITLES,
	defaultSectionOrder: [
		'education',
		'work',
		'projects',
		'volunteer',
		'skills',
		'awards',
		'certificates',
		'publications',
		'languages',
		'interests'
	],
	render
};
