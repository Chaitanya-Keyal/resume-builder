/**
 * svelte-dnd-action hides the dragged element while its shadow moves around and
 * expects the list to be re-rendered on drop. With keyed blocks Svelte keeps the
 * same element, so the inline `visibility: hidden` can survive the drop. Clear it.
 */
export function unhideAfterDrop(e: Event) {
	const zone = e.currentTarget as HTMLElement | null;
	if (!zone) return;
	const clear = () => {
		for (const child of zone.children) (child as HTMLElement).style.visibility = '';
	};
	clear();
	setTimeout(clear, 0);
	setTimeout(clear, 250);
}
