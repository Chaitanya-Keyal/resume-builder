/**
 * Keyboard shortcuts for the inline markup in any text field:
 * Ctrl/Cmd+B wraps the selection in `**`, Ctrl/Cmd+I in `_`, Ctrl/Cmd+K makes a
 * `[text](url)` link. Wrapping an already wrapped selection unwraps it. With no
 * selection the markers are inserted and the caret lands between them.
 */
type Field = HTMLInputElement | HTMLTextAreaElement;

function replaceSelection(el: Field, text: string, caret: [number, number]) {
	const start = el.selectionStart ?? 0;
	const end = el.selectionEnd ?? start;
	// setRangeText keeps the browser's own undo stack intact and fires no event by itself.
	el.setRangeText(text, start, end, 'preserve');
	el.setSelectionRange(start + caret[0], start + caret[1]);
	el.dispatchEvent(new Event('input', { bubbles: true }));
}

function wrap(el: Field, marker: string) {
	const start = el.selectionStart ?? 0;
	const end = el.selectionEnd ?? start;
	const value = el.value;
	const selected = value.slice(start, end);
	const m = marker.length;
	// Toggle off when the selection itself, or the text around it, already carries the marker.
	if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= 2 * m) {
		const inner = selected.slice(m, -m);
		replaceSelection(el, inner, [0, inner.length]);
		return;
	}
	if (value.slice(start - m, start) === marker && value.slice(end, end + m) === marker) {
		el.setSelectionRange(start - m, end + m);
		replaceSelection(el, selected, [0, selected.length]);
		return;
	}
	replaceSelection(el, `${marker}${selected}${marker}`, [m, m + selected.length]);
}

function link(el: Field) {
	const start = el.selectionStart ?? 0;
	const end = el.selectionEnd ?? start;
	const selected = el.value.slice(start, end);
	if (/^https?:\/\//.test(selected)) {
		// A selected URL becomes the target; the caret waits in the label.
		replaceSelection(el, `[](${selected})`, [1, 1]);
	} else if (selected) {
		const text = `[${selected}](https://)`;
		replaceSelection(el, text, [text.length - 1, text.length - 1]);
	} else {
		replaceSelection(el, '[](https://)', [1, 1]);
	}
}

export function onMarkupKey(e: KeyboardEvent): boolean {
	if (!(e.ctrlKey || e.metaKey) || e.altKey) return false;
	const el = e.currentTarget as Field;
	const key = e.key.toLowerCase();
	if (key === 'b') wrap(el, '**');
	else if (key === 'i') wrap(el, '_');
	else if (key === 'k') link(el);
	else return false;
	e.preventDefault();
	return true;
}

/** Svelte action: `use:markupKeys` on an input or textarea. */
export function markupKeys(node: Field) {
	const handler = (e: Event) => void onMarkupKey(e as KeyboardEvent);
	node.addEventListener('keydown', handler);
	return { destroy: () => node.removeEventListener('keydown', handler) };
}
