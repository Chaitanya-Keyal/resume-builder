import { z } from 'zod';
import type { Profile } from './types';

export const isoDate = z
	.string()
	.regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'expected YYYY, YYYY-MM or YYYY-MM-DD');

const id = z.string().min(1).max(200);
const text = z.string();

export const highlightSchema = z.object({
	id,
	text,
	hidden: z.boolean().optional()
});

export const linkSchema = z.object({ label: text, href: text });

const entryX = z.looseObject({
	slug: z.string().optional(),
	hidden: z.boolean().optional(),
	oneLiner: z.string().optional(),
	stack: z.array(z.string()).optional(),
	links: z.array(linkSchema).optional(),
	related: z.array(linkSchema).optional(),
	periodLabel: z.string().optional()
});

export const locationSchema = z.object({
	address: z.string().optional(),
	postalCode: z.string().optional(),
	city: z.string().optional(),
	countryCode: z.string().optional(),
	region: z.string().optional()
});

export const socialProfileSchema = z.object({
	network: z.string().min(1),
	username: z.string().optional(),
	url: z.string()
});

export const basicsSchema = z.object({
	name: z.string().min(1),
	label: z.string().optional(),
	image: z.string().optional(),
	email: z.string().optional(),
	phone: z.string().optional(),
	url: z.string().optional(),
	summary: z.string().optional(),
	location: locationSchema.optional(),
	profiles: z.array(socialProfileSchema).default([]),
	x: z
		.looseObject({
			handle: z.string().optional(),
			role: z.string().optional(),
			status: z.string().optional(),
			repo: z.string().optional(),
			tagline: z.string().optional()
		})
		.optional()
});

export const positionSchema = z.object({
	id,
	position: z.string(),
	startDate: isoDate.optional(),
	endDate: isoDate.optional(),
	dateLabel: z.string().optional(),
	location: z.string().optional(),
	summary: z.string().optional(),
	highlights: z.array(highlightSchema).default([])
});

export const engagementSchema = z.object({
	id,
	name: z.string().min(1),
	url: z.string().optional(),
	location: z.string().optional(),
	description: z.string().optional(),
	positions: z.array(positionSchema).default([]),
	x: entryX.optional()
});

export const educationSchema = z.object({
	id,
	institution: z.string().min(1),
	url: z.string().optional(),
	area: z.string().optional(),
	studyType: z.string().optional(),
	startDate: isoDate.optional(),
	endDate: isoDate.optional(),
	dateLabel: z.string().optional(),
	score: z.string().optional(),
	courses: z.array(z.string()).default([]),
	location: z.string().optional(),
	highlights: z.array(highlightSchema).default([]),
	x: entryX
		.extend({
			institutionShort: z.string().optional(),
			degreeLine: z.string().optional(),
			short: z.string().optional(),
			minor: z.string().optional(),
			summary: z.string().optional(),
			campus: z
				.array(
					z.object({
						text: z.string(),
						link: z.string().optional(),
						linkText: z.string().optional()
					})
				)
				.optional()
		})
		.optional()
});

export const projectSchema = z.object({
	id,
	name: z.string().min(1),
	description: z.string().optional(),
	url: z.string().optional(),
	entity: z.string().optional(),
	type: z.string().optional(),
	roles: z.array(z.string()).optional(),
	keywords: z.array(z.string()).default([]),
	startDate: isoDate.optional(),
	endDate: isoDate.optional(),
	dateLabel: z.string().optional(),
	highlights: z.array(highlightSchema).default([]),
	x: entryX.optional()
});

export const skillGroupSchema = z.object({
	id,
	name: z.string().min(1),
	level: z.string().optional(),
	keywords: z.array(z.string()).default([]),
	x: z.looseObject({ key: z.string().optional() }).optional()
});

export const awardSchema = z.object({
	id,
	title: z.string().min(1),
	date: isoDate.optional(),
	dateLabel: z.string().optional(),
	awarder: z.string().optional(),
	summary: z.string().optional(),
	url: z.string().optional()
});

export const certificateSchema = z.object({
	id,
	name: z.string().min(1),
	date: isoDate.optional(),
	dateLabel: z.string().optional(),
	issuer: z.string().optional(),
	url: z.string().optional()
});

export const publicationSchema = z.object({
	id,
	name: z.string().min(1),
	publisher: z.string().optional(),
	releaseDate: isoDate.optional(),
	dateLabel: z.string().optional(),
	url: z.string().optional(),
	summary: z.string().optional()
});

export const languageSchema = z.object({
	id,
	language: z.string().min(1),
	fluency: z.string().optional()
});

export const interestSchema = z.object({
	id,
	name: z.string().min(1),
	keywords: z.array(z.string()).default([])
});

export const referenceSchema = z.object({
	id,
	name: z.string().min(1),
	reference: z.string().optional()
});

export const profileSchema = z.object({
	$schema: z.string().optional(),
	version: z.literal(1),
	basics: basicsSchema,
	work: z.array(engagementSchema).default([]),
	volunteer: z.array(engagementSchema).default([]),
	education: z.array(educationSchema).default([]),
	projects: z.array(projectSchema).default([]),
	skills: z.array(skillGroupSchema).default([]),
	awards: z.array(awardSchema).default([]),
	certificates: z.array(certificateSchema).default([]),
	publications: z.array(publicationSchema).default([]),
	languages: z.array(languageSchema).default([]),
	interests: z.array(interestSchema).default([]),
	references: z.array(referenceSchema).default([]),
	meta: z
		.looseObject({
			canonical: z.string().optional(),
			version: z.string().optional(),
			lastModified: z.string().optional()
		})
		.optional()
});

export type ProfileInput = z.input<typeof profileSchema>;

// The zod output must be assignable to the hand-written type, and vice versa.
const _out: Profile = null as unknown as z.output<typeof profileSchema>;
const _in: z.output<typeof profileSchema> = null as unknown as Profile;
void _out;
void _in;

export const PROFILE_SCHEMA_URL = 'https://resume.okaybro.dev/schema/profile-1.json';

/** A profile with nothing in it, for "Start blank". */
export function emptyProfile(name = ''): Profile {
	return profileSchema.parse({
		$schema: PROFILE_SCHEMA_URL,
		version: 1,
		basics: { name, profiles: [] }
	});
}
