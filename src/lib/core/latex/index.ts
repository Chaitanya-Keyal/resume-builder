import type { ResolvedResume } from '../resolve/types';
import type { Resume } from '../schema/types';
import { jake } from './jake';
import type { Template } from './template';

export const templates: Record<string, Template> = {
	[jake.id]: jake as unknown as Template
};

export const DEFAULT_TEMPLATE = jake.id;

export function getTemplate(id: string): Template {
	return templates[id] ?? templates[DEFAULT_TEMPLATE];
}

/** Parse a resume's stored options through its template's schema (fills defaults, drops junk). */
export function templateOptions(
	resume: Pick<Resume, 'template' | 'options'>
): Record<string, unknown> {
	const t = getTemplate(resume.template);
	const r = t.optionsSchema.safeParse(resume.options);
	return r.success ? r.data : t.defaults;
}

/** Render a resolved resume with the template and options recorded on the composition. */
export function renderTex(
	resolved: ResolvedResume,
	resume: Pick<Resume, 'template' | 'options'>
): string {
	return getTemplate(resume.template).render(resolved, templateOptions(resume));
}

export type { Template, DensityPreset } from './template';
export { formatDate, formatRange, type DateStyle } from './dates';
