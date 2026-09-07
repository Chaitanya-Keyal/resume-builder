/**
 * Whitespace- and comment-insensitive form of a .tex document, for comparing
 * generated output with a hand-written reference and for change detection.
 * Newlines are spaces to TeX, so they collapse too.
 */
export function normalizeTex(tex: string): string {
	return tex
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith('%'))
		.join(' ')
		.replace(/\s+/g, ' ');
}
