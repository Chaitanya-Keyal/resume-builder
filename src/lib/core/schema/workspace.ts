import { z } from 'zod';
import { locationSchema, profileSchema } from './profile';
import { resumeSchema } from './resume';
import type { Overlay, Settings, Workspace } from './types';

export const overlaySchema = z.object({
	version: z.literal(1),
	basics: z
		.object({
			phone: z.string().optional(),
			email: z.string().optional(),
			url: z.string().optional(),
			location: locationSchema.optional()
		})
		.optional(),
	patches: z.array(z.object({ ref: z.string(), fields: z.record(z.string(), z.string()) })).optional()
});

export const settingsSchema = z.object({
	compiler: z.enum(['wasm', 'remote']).default('wasm'),
	remoteUrl: z.string().optional(),
	sourceUrl: z.string().optional(),
	autoCompile: z.boolean().default(true),
	theme: z.enum(['system', 'light', 'dark']).default('system')
});

export const workspaceSchema = z.object({
	$schema: z.string().optional(),
	version: z.literal(1),
	exportedAt: z.string(),
	profile: profileSchema,
	overlay: overlaySchema.optional(),
	resumes: z.array(resumeSchema).default([]),
	settings: settingsSchema.optional()
});

const _o: Overlay = null as unknown as z.output<typeof overlaySchema>;
const _s: Settings = null as unknown as z.output<typeof settingsSchema>;
const _w: Workspace = null as unknown as z.output<typeof workspaceSchema>;
void _o;
void _s;
void _w;

export const WORKSPACE_SCHEMA_URL = 'https://resume-builder.okaybro.dev/schema/workspace-1.json';

export function emptyOverlay(): Overlay {
	return { version: 1 };
}

export function defaultSettings(): Settings {
	return settingsSchema.parse({});
}
