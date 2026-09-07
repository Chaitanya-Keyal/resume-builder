/**
 * End-to-end engine check against the production build: builds the site, serves
 * `build/` statically, opens /debug in headless Chromium and reports the
 * result. `CHROME=/path/to/chrome` overrides Playwright's browser.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = join(import.meta.dir, '..');
const BUILD = join(ROOT, 'build');

if (!process.argv.includes('--no-build') || !existsSync(BUILD)) {
	const b = Bun.spawnSync(['bun', 'run', 'build'], {
		cwd: ROOT,
		stdout: 'inherit',
		stderr: 'inherit'
	});
	if (b.exitCode !== 0) process.exit(b.exitCode);
}

const server = Bun.serve({
	port: 0,
	async fetch(req) {
		const p = new URL(req.url).pathname;
		const candidates = [join(BUILD, p), join(BUILD, p, 'index.html'), join(BUILD, p + '.html')];
		for (const c of candidates)
			if (existsSync(c) && (await Bun.file(c).exists())) return new Response(Bun.file(c));
		return new Response(Bun.file(join(BUILD, '404.html')), { status: 404 });
	}
});

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => {
	if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300));
});
await page.goto(`http://localhost:${server.port}/debug`);
await page.waitForFunction(
	() => (window as unknown as { __result: unknown }).__result !== null,
	null,
	{ timeout: 300_000 }
);
const result = (await page.evaluate(
	() => (window as unknown as { __result: unknown }).__result
)) as { ok: boolean };
console.log(JSON.stringify(result));
await browser.close();
server.stop(true);
process.exit(result.ok ? 0 : 1);
