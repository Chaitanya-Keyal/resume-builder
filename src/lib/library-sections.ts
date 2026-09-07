/** The Library's pages, in nav order. */
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
