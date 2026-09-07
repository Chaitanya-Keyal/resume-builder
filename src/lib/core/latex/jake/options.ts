import { z } from 'zod';

export const jakeOptionsSchema = z.object({
	paper: z.enum(['letterpaper', 'a4paper']).default('letterpaper'),
	fontSize: z.union([z.literal(10), z.literal(11), z.literal(12)]).default(11),
	margins: z.enum(['tight', 'default', 'roomy']).default('tight'),
	spacing: z.enum(['tight', 'normal']).default('tight'),
	dateStyle: z.enum(['MMM yyyy', 'MMMM yyyy', 'MM/yyyy', 'yyyy']).default('MMM yyyy'),
	underlineLinks: z.boolean().default(true)
});

export type JakeOptions = z.output<typeof jakeOptionsSchema>;

export const jakeDefaults: JakeOptions = jakeOptionsSchema.parse({});

/** The five `\addtolength` values, in inches. */
export const MARGINS: Record<
	JakeOptions['margins'],
	{ side: number; width: number; top: number; height: number }
> = {
	tight: { side: -0.55, width: 1.1, top: -0.7, height: 1.5 },
	default: { side: -0.5, width: 1.0, top: -0.5, height: 1.0 },
	roomy: { side: -0.375, width: 0.75, top: -0.375, height: 0.75 }
};

/** Vertical-space constants, in pt. `tight` reproduces the hand-written resume. */
export const SPACING: Record<
	JakeOptions['spacing'],
	{
		section: number;
		sectionRule: number;
		item: number;
		subheading: number;
		subheadingAfter: number;
		projectAfter: number;
		subItem: number;
		listEnd: number;
	}
> = {
	tight: {
		section: -8,
		sectionRule: -5,
		item: -2,
		subheading: -1,
		subheadingAfter: -7,
		projectAfter: -7,
		subItem: -4,
		listEnd: -7
	},
	normal: {
		section: -6,
		sectionRule: -4,
		item: -1,
		subheading: 0,
		subheadingAfter: -6,
		projectAfter: -6,
		subItem: -3,
		listEnd: -5
	}
};
