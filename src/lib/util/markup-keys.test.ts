import { describe, expect, test } from 'bun:test';
import { onMarkupKey } from './markup-keys';

/** A minimal stand-in for an input: value, selection, setRangeText, events. */
function field(value: string, start: number, end = start) {
	const el = {
		value,
		selectionStart: start,
		selectionEnd: end,
		events: [] as string[],
		setRangeText(text: string, s: number, e: number) {
			this.value = this.value.slice(0, s) + text + this.value.slice(e);
		},
		setSelectionRange(s: number, e: number) {
			this.selectionStart = s;
			this.selectionEnd = e;
		},
		dispatchEvent(ev: Event) {
			this.events.push(ev.type);
			return true;
		}
	};
	return el;
}
function press(el: ReturnType<typeof field>, key: string) {
	let prevented = false;
	const e = {
		ctrlKey: true,
		metaKey: false,
		altKey: false,
		key,
		currentTarget: el,
		preventDefault: () => (prevented = true)
	} as unknown as KeyboardEvent;
	const handled = onMarkupKey(e);
	return { handled, prevented };
}

describe('markup shortcuts', () => {
	test('Ctrl+B wraps a selection and Ctrl+B again unwraps it', () => {
		const el = field('cut costs by 40%', 0, 3);
		expect(press(el, 'b')).toEqual({ handled: true, prevented: true });
		expect(el.value).toBe('**cut** costs by 40%');
		expect([el.selectionStart, el.selectionEnd]).toEqual([2, 5]);
		press(el, 'b');
		expect(el.value).toBe('cut costs by 40%');
		expect(el.events).toEqual(['input', 'input']);
	});
	test('Ctrl+I with no selection inserts markers around the caret', () => {
		const el = field('abc', 3);
		press(el, 'i');
		expect(el.value).toBe('abc__');
		expect(el.selectionStart).toBe(4);
	});
	test('Ctrl+K links text, or uses a selected URL as the target', () => {
		const a = field('see docs', 4, 8);
		press(a, 'k');
		expect(a.value).toBe('see [docs](https://)');
		const b = field('https://x.dev', 0, 13);
		press(b, 'k');
		expect(b.value).toBe('[](https://x.dev)');
		expect(b.selectionStart).toBe(1);
	});
	test('other keys pass through', () => {
		const el = field('abc', 0, 3);
		expect(press(el, 's').handled).toBe(false);
		expect(el.value).toBe('abc');
	});
});
