import { describe, expect, test } from 'bun:test';
import { escapeLatex, escapeUrl, escapedCharsIn, unrenderable } from './escape';
import { toHtml } from './html';
import { toLatex } from './latex';
import { linksOf, parseMarkup, textOf } from './parse';
import { toPlain } from './plain';

describe('parseMarkup', () => {
	test('plain text', () => {
		expect(parseMarkup('hello world')).toEqual([{ type: 'text', value: 'hello world' }]);
	});

	test('bold, italic, link', () => {
		expect(parseMarkup('a **b** _c_ *d* [e](https://x.y)')).toEqual([
			{ type: 'text', value: 'a ' },
			{ type: 'bold', children: [{ type: 'text', value: 'b' }] },
			{ type: 'text', value: ' ' },
			{ type: 'italic', children: [{ type: 'text', value: 'c' }] },
			{ type: 'text', value: ' ' },
			{ type: 'italic', children: [{ type: 'text', value: 'd' }] },
			{ type: 'text', value: ' ' },
			{ type: 'link', href: 'https://x.y', children: [{ type: 'text', value: 'e' }] }
		]);
	});

	test('nesting: bold inside link, link inside bold', () => {
		expect(toLatex('[**Widget:**](https://g.h/x) built')).toBe(
			'\\href{https://g.h/x}{\\underline{\\textbf{Widget:}}} built'
		);
		expect(toLatex('**see [docs](https://d.io)**')).toBe(
			'\\textbf{see \\href{https://d.io}{\\underline{docs}}}'
		);
	});

	test('underscores inside words are literal', () => {
		expect(textOf(parseMarkup('snake_case_name and _it_'))).toBe('snake_case_name and it');
		expect(toLatex('snake_case_name')).toBe('snake\\_case\\_name');
	});

	test('unclosed markers degrade to literal text', () => {
		expect(textOf(parseMarkup('2 ** 3 and a * b'))).toBe('2 ** 3 and a * b');
		expect(textOf(parseMarkup('[not a link'))).toBe('[not a link');
		expect(textOf(parseMarkup('[text](not a url)'))).toBe('[text](not a url)');
		expect(textOf(parseMarkup('[text](javascript:alert(1))'))).toBe('[text](javascript:alert(1))');
	});

	test('backslash escapes', () => {
		expect(textOf(parseMarkup('\\*literal\\* \\_and\\_ \\[x\\]'))).toBe('*literal* _and_ [x]');
	});

	test('linksOf', () => {
		expect(linksOf(parseMarkup('[a](https://a) and [**b**](mailto:b@c)'))).toEqual([
			{ href: 'https://a', text: 'a' },
			{ href: 'mailto:b@c', text: 'b' }
		]);
	});
});

describe('escapeLatex', () => {
	test('every special character has a rendering', () => {
		expect(escapeLatex('\\ { } $ & % # _ ~ ^ " < >')).toBe(
			'\\textbackslash{} \\{ \\} \\$ \\& \\% \\# \\_ $\\sim$ \\^{} \\textquotedbl{} \\textless{} \\textgreater{}'
		);
	});

	test('typography', () => {
		expect(escapeLatex('2024\u20132025 \u2014 \u201cq\u201d \u2018s\u2019 \u2026')).toBe(
			"2024--2025 --- ``q'' `s' \\ldots{}"
		);
		expect(escapeLatex('~5s \u2192 1s, 2\u00d7, \u226590%')).toBe(
			'$\\sim$5s $\\rightarrow$ 1s, 2$\\times$, $\\geq$90\\%'
		);
	});

	test('newlines become spaces; pipes are left for T1', () => {
		expect(escapeLatex('a\nb\r\nc | d')).toBe('a b c | d');
	});

	test('escapeUrl', () => {
		expect(escapeUrl('https://a.b/c%20d#e{f}')).toBe('https://a.b/c\\%20d\\#e\\{f\\}');
	});

	test('unrenderable and escapedCharsIn', () => {
		expect(unrenderable('caf\u00e9 \u2192 \u4e2d')).toEqual(['\u4e2d']);
		expect(escapedCharsIn('50% & more_')).toEqual(['%', '&', '_']);
	});
});

describe('printers', () => {
	const src = 'Cut **latency** by 90% via [_caching_](https://x.y/a?b=1&c=2)';
	test('latex', () => {
		expect(toLatex(src)).toBe(
			'Cut \\textbf{latency} by 90\\% via \\href{https://x.y/a?b=1&c=2}{\\underline{\\emph{caching}}}'
		);
		expect(toLatex(src, { underlineLinks: false })).toContain('{\\emph{caching}}');
	});
	test('html', () => {
		expect(toHtml(src)).toBe(
			'Cut <strong>latency</strong> by 90% via <a href="https://x.y/a?b=1&amp;c=2" rel="noopener"><em>caching</em></a>'
		);
		expect(toHtml('<script>')).toBe('&lt;script&gt;');
	});
	test('plain', () => {
		expect(toPlain(src)).toBe('Cut latency by 90% via caching');
		expect(toPlain(src, { showUrls: true })).toBe(
			'Cut latency by 90% via caching (https://x.y/a?b=1&c=2)'
		);
	});
});
