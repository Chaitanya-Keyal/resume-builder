/**
 * Screenshot helper for development: drives the running dev server with
 * headless Chromium and writes PNGs. Not part of the build.
 *
 *   bun scripts/shot.ts <outDir> <step> [<step> …]
 *   steps:  goto:/path   click:<css or text=…>   wait:<ms>   shot:<name>   type:<css>=<text>
 *           key:<Key>   dark   light   viewport:<w>x<h>   eval:<js>   seed:sample
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
page.on('console', (m) => {
	if (m.type() === 'error' || m.type() === 'warning')
		console.log(`[${m.type()}]`, m.text().slice(0, 300));
});

async function seed(kind: 'sample') {
	const root = join(import.meta.dir, '..', 'fixtures', kind);
	const profile = readFileSync(join(root, 'profile.json'), 'utf8');
	const overlay = readFileSync(join(root, 'overlay.json'), 'utf8');
	const resume = readFileSync(join(root, 'resume.jake.json'), 'utf8');
	await page.goto(`${BASE}/`);
	await page.evaluate(
		async ({ profile, overlay, resume }) => {
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
			await new Promise((r) => (tx.oncomplete = r));
		},
		{ profile, overlay, resume }
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
	} else if (cmd === 'key') await page.keyboard.press(rest);
	else if (cmd === 'dark') await page.evaluate(() => localStorage.setItem('theme', '"dark"'));
	else if (cmd === 'light') await page.evaluate(() => localStorage.setItem('theme', '"light"'));
	else if (cmd === 'viewport') {
		const [w, h] = rest.split('x').map(Number);
		await page.setViewportSize({ width: w, height: h });
	} else if (cmd === 'eval') console.log(await page.evaluate(rest));
	else if (cmd === 'seed') await seed('sample');
	else console.log('unknown step', step);
}
await browser.close();
