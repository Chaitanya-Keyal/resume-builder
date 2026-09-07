import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';

export const SECTIONS = [
	'basics',
	'work',
	'education',
	'projects',
	'leadership',
	'skills',
	'awards',
	'more'
] as const;
export type LibrarySection = (typeof SECTIONS)[number];

export const entries: EntryGenerator = () => SECTIONS.map((section) => ({ section }));

export const load: PageLoad = ({ params }) => {
	if (!(SECTIONS as readonly string[]).includes(params.section)) error(404, 'No such section');
	return { section: params.section as LibrarySection };
};
