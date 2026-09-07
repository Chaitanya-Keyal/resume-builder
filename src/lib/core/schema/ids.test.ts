import { describe, expect, test } from 'bun:test';
import { newHighlightId, newId, slugify, uniqueSlug } from './ids';

describe('ids', () => {
	test('slugify', () => {
		expect(slugify('Acme Corp')).toBe('acme-corp');
		expect(slugify('  State University, Springfield ')).toBe('state-university-springfield');
		expect(slugify('Café — München')).toBe('cafe-munchen');
		expect(slugify('***')).toBe('item');
	});
	test('uniqueSlug', () => {
		expect(uniqueSlug('sob', ['sob'])).toBe('sob-2');
		expect(uniqueSlug('sob', ['sob', 'sob-2'])).toBe('sob-3');
		expect(uniqueSlug('new', ['sob'])).toBe('new');
	});
	test('random ids', () => {
		expect(newHighlightId()).toMatch(/^h_[a-z0-9]{8}$/);
		expect(newId('res')).toMatch(/^res_[a-z0-9]{10}$/);
		expect(newHighlightId()).not.toBe(newHighlightId());
	});
});
