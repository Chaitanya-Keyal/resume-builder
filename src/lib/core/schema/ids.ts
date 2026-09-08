/** Slug for entries and positions: readable, stable, unique within its list. */
export function slugify(text: string): string {
	const s = text
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return s || 'item';
}

export function uniqueSlug(text: string, taken: Iterable<string>): string {
	const used = new Set(taken);
	const base = slugify(text);
	if (!used.has(base)) return base;
	for (let n = 2; ; n++) {
		const candidate = `${base}-${n}`;
		if (!used.has(candidate)) return candidate;
	}
}

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // 32 symbols, no 0/o/1/l

function randomChars(n: number): string {
	const bytes = new Uint8Array(n);
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
		crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
	}
	let out = '';
	for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
	return out;
}

/** Highlight (bullet) id. Random, so rewording a bullet keeps its identity. */
export function newHighlightId(): string {
	return 'h_' + randomChars(8);
}

/** Resume / section / snapshot ids. */
export function newId(prefix = 'id'): string {
	return `${prefix}_${randomChars(10)}`;
}
