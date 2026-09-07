export function relativeTime(iso: string | number | undefined, now = Date.now()): string {
	if (!iso) return 'never';
	const t = typeof iso === 'number' ? iso : Date.parse(iso);
	if (Number.isNaN(t)) return 'unknown';
	const s = Math.round((now - t) / 1000);
	if (s < 45) return 'just now';
	const m = Math.round(s / 60);
	if (m < 60) return `${m} min ago`;
	const h = Math.round(m / 60);
	if (h < 24) return `${h} h ago`;
	const d = Math.round(h / 24);
	if (d < 30) return `${d} d ago`;
	return new Date(t).toLocaleDateString();
}

export function nowIso(): string {
	return new Date().toISOString();
}
