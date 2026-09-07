import { error } from '@sveltejs/kit';
import { SECTIONS, type LibrarySection } from '$lib/library-sections';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => SECTIONS.map((section) => ({ section }));

export const load: PageLoad = ({ params }) => {
	if (!(SECTIONS as readonly string[]).includes(params.section)) error(404, 'No such section');
	return { section: params.section as LibrarySection };
};
