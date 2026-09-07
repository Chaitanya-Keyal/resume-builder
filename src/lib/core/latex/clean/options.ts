import { z } from 'zod';

/** Same option keys as Jake's template, so density presets and the layout block work for both. */
export const cleanOptionsSchema = z.object({
	paper: z.enum(['letterpaper', 'a4paper']).default('a4paper'),
	fontSize: z.union([z.literal(10), z.literal(11), z.literal(12)]).default(11),
	margins: z.enum(['tight', 'default', 'roomy']).default('default'),
	spacing: z.enum(['tight', 'normal']).default('normal'),
	dateStyle: z.enum(['MMM yyyy', 'MMMM yyyy', 'MM/yyyy', 'yyyy']).default('MMM yyyy'),
	underlineLinks: z.boolean().default(false)
});

export type CleanOptions = z.output<typeof cleanOptionsSchema>;

export const cleanDefaults: CleanOptions = cleanOptionsSchema.parse({});

/** Page margins, in inches, as `fullpage` leaves them plus these adjustments. */
export const MARGINS: Record<
	CleanOptions['margins'],
	{ side: number; width: number; top: number; height: number }
> = {
	tight: { side: -0.5, width: 1.0, top: -0.6, height: 1.2 },
	default: { side: -0.4, width: 0.8, top: -0.45, height: 0.9 },
	roomy: { side: -0.25, width: 0.5, top: -0.3, height: 0.6 }
};

/** Vertical rhythm, in pt. */
export const SPACING: Record<
	CleanOptions['spacing'],
	{
		section: number;
		afterRule: number;
		entry: number;
		itemSep: number;
		listTop: number;
		listEnd: number;
	}
> = {
	tight: { section: 6, afterRule: -5, entry: 3, itemSep: -1, listTop: 2, listEnd: -3 },
	normal: { section: 9, afterRule: -4, entry: 4, itemSep: 0, listTop: 3, listEnd: -2 }
};
