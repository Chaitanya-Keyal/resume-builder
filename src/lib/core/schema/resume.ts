import { z } from 'zod';
import type { Resume, SectionType } from './types';

export const SECTION_TYPES = [
	'work',
	'volunteer',
	'education',
	'projects',
	'skills',
	'awards',
	'certificates',
	'publications',
	'languages',
	'interests',
	'custom'
] as const satisfies readonly SectionType[];

export const sectionTypeSchema = z.enum(SECTION_TYPES);

const id = z.string().min(1);

export const bulletOverrideSchema = z.object({
	text: z.string(),
	baseText: z.string(),
	origin: z.enum(['user', 'ai']).optional()
});

export const extraBulletSchema = z.object({
	id,
	text: z.string(),
	after: z.string().optional()
});

export const itemOverrideSchema = z.object({
	title: z.string().optional(),
	subtitle: z.string().optional(),
	dateLabel: z.string().optional(),
	location: z.string().optional(),
	keywords: z.array(z.string()).optional(),
	bullets: z.record(z.string(), bulletOverrideSchema).optional(),
	extraBullets: z.array(extraBulletSchema).optional()
});

export const itemRefSchema = z.object({
	ref: z.string().regex(/^[a-z]+:[^/\s]+(\/[^/\s]+)?$/, 'expected <collection>:<id>[/<positionId>]'),
	bullets: z.array(z.string()).default([]),
	overrides: itemOverrideSchema.optional()
});

export const customItemSchema = z.object({
	id,
	title: z.string(),
	subtitle: z.string().optional(),
	dateLabel: z.string().optional(),
	location: z.string().optional(),
	bullets: z.array(z.object({ id, text: z.string() })).default([])
});

export const sectionSchema = z.object({
	id,
	type: sectionTypeSchema,
	title: z.string().optional(),
	items: z.array(z.union([itemRefSchema, customItemSchema])).default([])
});

export const headerOptionsSchema = z.object({
	showPhone: z.boolean().default(true),
	showEmail: z.boolean().default(true),
	showUrl: z.boolean().default(false),
	showLocation: z.boolean().default(false),
	showTagline: z.boolean().default(true),
	profiles: z.array(z.string()).default([]),
	tagline: z.string().optional()
});

export const resumeSchema = z.object({
	id,
	name: z.string().min(1),
	labels: z.array(z.string()).default([]),
	createdAt: z.string(),
	updatedAt: z.string(),
	template: z.string().min(1),
	options: z.record(z.string(), z.unknown()).default({}),
	header: headerOptionsSchema.prefault({}),
	sections: z.array(sectionSchema).default([])
});

const _out: Resume = null as unknown as z.output<typeof resumeSchema>;
const _in: z.output<typeof resumeSchema> = null as unknown as Resume;
void _out;
void _in;
