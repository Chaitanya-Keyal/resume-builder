<script lang="ts">
	/**
	 * A vertical drag handle between two panes. Reports the new width of the
	 * pane to its right, measured from the pointer to the container's right edge.
	 */
	let {
		container,
		min = 320,
		reserve = 360,
		onresize
	}: {
		container: HTMLElement | undefined;
		/** Smallest width the right pane may have. */
		min?: number;
		/** Smallest width the left pane keeps. */
		reserve?: number;
		onresize: (px: number) => void;
	} = $props();

	let dragging = $state(false);

	function start(e: PointerEvent) {
		if (!container) return;
		dragging = true;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		e.preventDefault();
	}
	function move(e: PointerEvent) {
		if (!dragging || !container) return;
		const rect = container.getBoundingClientRect();
		const px = Math.round(rect.right - e.clientX);
		onresize(Math.max(min, Math.min(rect.width - reserve, px)));
	}
	function end() {
		dragging = false;
	}
	function onkeydown(e: KeyboardEvent) {
		if (!container) return;
		const rect = container.getBoundingClientRect();
		const cur = parseFloat(getComputedStyle(container).getPropertyValue('--split')) || 0;
		if (e.key === 'ArrowLeft') onresize(Math.min(rect.width - reserve, cur + 24));
		if (e.key === 'ArrowRight') onresize(Math.max(min, cur - 24));
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
	role="separator"
	aria-orientation="vertical"
	aria-label="Resize preview"
	tabindex="0"
	class="group relative z-10 -mx-[3px] w-[7px] shrink-0 cursor-col-resize touch-none outline-none select-none"
	onpointerdown={start}
	onpointermove={move}
	onpointerup={end}
	onpointercancel={end}
	{onkeydown}
>
	<div
		class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors group-hover:bg-accent group-focus-visible:bg-accent {dragging
			? 'bg-accent'
			: 'bg-border'}"
	></div>
</div>
