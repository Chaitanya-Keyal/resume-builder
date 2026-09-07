import type { z } from 'zod';
import type { ResolvedResume } from '../resolve/types';
import type { SectionType } from '../schema/types';

export interface DensityPreset {
	id: string;
	label: string;
	/** Partial options applied on top of the template defaults. */
	options: Record<string, unknown>;
}

export interface Template<O extends Record<string, unknown> = Record<string, unknown>> {
	id: string;
	name: string;
	description: string;
	optionsSchema: z.ZodType<O>;
	defaults: O;
	/** Ordered, so "Try compact" knows what comes next. */
	density: DensityPreset[];
	sectionTitles: Partial<Record<SectionType, string>>;
	/** Section order for a fresh "everything included" resume. */
	defaultSectionOrder: SectionType[];
	render(resume: ResolvedResume, options: O): string;
}
