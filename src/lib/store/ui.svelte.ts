/** Per-browser UI preferences. localStorage, synchronous, never important. */

type Theme = 'system' | 'light' | 'dark';

function read<T>(key: string, fallback: T): T {
	try {
		const v = localStorage.getItem(key);
		return v === null ? fallback : (JSON.parse(v) as T);
	} catch {
		return fallback;
	}
}

function write(key: string, value: unknown) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {}
}

class UiStore {
	theme = $state<Theme>('system');
	previewOpen = $state(true);
	splitterPx = $state(560);
	/** Expanded entry ids per route. */
	expanded = $state<Record<string, string[]>>({});
	/** Where "back" goes after an "edit in library" hop. */
	returnTo = $state<{ href: string; label: string } | null>(null);
	/** Last opened resume, pinned in the rail. */
	lastResumeId = $state<string | null>(null);

	init() {
		this.theme = read('theme', 'system');
		this.previewOpen = read('previewOpen', true);
		this.splitterPx = read('splitterPx', 560);
		this.expanded = read('expanded', {});
		this.lastResumeId = read('lastResumeId', null);
		this.applyTheme();
		if (typeof matchMedia !== 'undefined') {
			matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () =>
				this.applyTheme()
			);
		}
	}

	setTheme(t: Theme) {
		this.theme = t;
		write('theme', t);
		this.applyTheme();
	}

	cycleTheme() {
		const order: Theme[] = ['system', 'light', 'dark'];
		this.setTheme(order[(order.indexOf(this.theme) + 1) % order.length]);
	}

	get isDark(): boolean {
		return (
			this.theme === 'dark' ||
			(this.theme === 'system' &&
				typeof matchMedia !== 'undefined' &&
				matchMedia('(prefers-color-scheme: dark)').matches)
		);
	}

	private applyTheme() {
		if (typeof document === 'undefined') return;
		document.documentElement.classList.toggle('dark', this.isDark);
	}

	setPreviewOpen(v: boolean) {
		this.previewOpen = v;
		write('previewOpen', v);
	}

	setSplitter(px: number) {
		this.splitterPx = px;
		write('splitterPx', px);
	}

	isExpanded(route: string, id: string): boolean {
		return this.expanded[route]?.includes(id) ?? false;
	}

	/** Collapse an open entry, or open this one alone. */
	toggleExpanded(route: string, id: string) {
		const cur = this.expanded[route] ?? [];
		this.expanded = { ...this.expanded, [route]: cur.includes(id) ? [] : [id] };
		write('expanded', this.expanded);
	}

	setExpanded(route: string, id: string) {
		this.expanded = { ...this.expanded, [route]: [id] };
		write('expanded', this.expanded);
	}

	setLastResume(id: string | null) {
		this.lastResumeId = id;
		write('lastResumeId', id);
	}
}

export const ui = new UiStore();
