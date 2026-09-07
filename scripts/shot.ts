/**
 * Screenshot helper for development: drives the running dev server with
 * headless Chromium and writes PNGs. Not part of the build.
 *
 *   bun scripts/shot.ts <outDir> <step> [<step> …]
 *   steps:  goto:/path   click:<css or text=…>   wait:<ms>   shot:<name>   type:<css>=<text>
 *           key:<Key>   dark   light   viewport:<w>x<h>   eval:<js>   seed:sample   file:<css>=<path>
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const [outDir, ...steps] = process.argv.slice(2);
const BASE = process.env.BASE_URL ?? 'http://localhost:5199';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const context = await browser.newContext({
	viewport: { width: 1400, height: 900 },
	deviceScaleFactor: 1
});
const page = await context.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('response', (r) => {
	if (r.status() >= 400) console.log('[http]', r.status(), r.url());
});
page.on('console', (m) => {
	if (m.type() === 'error' || m.type() === 'warning')
		console.log(`[${m.type()}]`, m.text().slice(0, 300));
});

/** `seed:sample` loads the bundled sample; `seed:/path/to/workspace.json` loads an export. */
async function seed(kind: string) {
	let profile: string,
		overlay: string | null,
		resume: string | null,
		settings: string | null = null;
	if (kind === 'sample') {
		const root = join(import.meta.dir, '..', 'fixtures', 'sample');
		profile = readFileSync(join(root, 'profile.json'), 'utf8');
		overlay = readFileSync(join(root, 'overlay.json'), 'utf8');
		resume = readFileSync(join(root, 'resume.jake.json'), 'utf8');
	} else {
		const ws = JSON.parse(readFileSync(kind, 'utf8'));
		profile = JSON.stringify(ws.profile);
		overlay = ws.overlay ? JSON.stringify(ws.overlay) : null;
		resume = ws.resumes?.[0] ? JSON.stringify(ws.resumes[0]) : null;
		settings = ws.settings ? JSON.stringify(ws.settings) : null;
	}
	await page.goto(`${BASE}/`);
	await page.evaluate(
		async ({ profile, overlay, resume, settings }) => {
			const { openDB } = await new Promise<{ openDB: () => Promise<IDBDatabase> }>((res) =>
				res({
					openDB: () =>
						new Promise((r, j) => {
							const req = indexedDB.open('resume-builder');
							req.onupgradeneeded = () => req.result.createObjectStore('kv');
							req.onsuccess = () => r(req.result);
							req.onerror = () => j(req.error);
						})
				})
			);
			const db = await openDB();
			const tx = db.transaction('kv', 'readwrite');
			const st = tx.objectStore('kv');
			st.put(JSON.parse(profile), 'profile');
			if (overlay) st.put(JSON.parse(overlay), 'overlay');
			if (resume) st.put([JSON.parse(resume)], 'resumes');
			if (settings) st.put(JSON.parse(settings), 'settings');
			await new Promise((r) => (tx.oncomplete = r));
		},
		{ profile, overlay, resume, settings }
	);
}

for (const step of steps) {
	const [cmd, ...restParts] = step.split(':');
	const rest = restParts.join(':');
	if (cmd === 'goto') await page.goto(`${BASE}${rest}`, { waitUntil: 'networkidle' });
	else if (cmd === 'click') await page.locator(rest).first().click();
	else if (cmd === 'wait') await page.waitForTimeout(Number(rest));
	else if (cmd === 'shot')
		await page.screenshot({ path: join(outDir, `${rest}.png`), fullPage: false });
	else if (cmd === 'type') {
		const [sel, text] = rest.split('=');
		await page.locator(sel).first().fill(text);
	} else if (cmd === 'file') {
		const cut = rest.lastIndexOf('=');
		await page
			.locator(rest.slice(0, cut))
			.first()
			.setInputFiles(rest.slice(cut + 1));
	} else if (cmd === 'drag') {
		// drag:<from css>=><to css>  (real mouse, in steps, so drag libraries see it)
		const [from, to] = rest.split('=>');
		const a = await page.locator(from).first().boundingBox();
		const b = await page.locator(to).first().boundingBox();
		if (!a || !b) throw new Error('drag: element not found');
		await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
		await page.mouse.down();
		await page.waitForTimeout(100);
		await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 8, { steps: 4 });
		await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 4, { steps: 20 });
		await page.waitForTimeout(400);
		await page.mouse.up();
	} else if (cmd === 'key') await page.keyboard.press(rest);
	else if (cmd === 'dark') await page.evaluate(() => localStorage.setItem('theme', '"dark"'));
	else if (cmd === 'light') await page.evaluate(() => localStorage.setItem('theme', '"light"'));
	else if (cmd === 'viewport') {
		const [w, h] = rest.split('x').map(Number);
		await page.setViewportSize({ width: w, height: h });
	} else if (cmd === 'eval') console.log(await page.evaluate(rest));
	else if (cmd === 'seed') await seed(rest);
	else console.log('unknown step', step);
}
await browser.close();
