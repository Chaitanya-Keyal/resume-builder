import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

function commitHash(): string {
	try {
		return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return 'dev';
	}
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			injectRegister: null,
			kit: { adapterFallback: '404.html' },
			manifest: {
				name: 'Resume Builder',
				short_name: 'Resume',
				description:
					'A local-first LaTeX resume builder: one library, many resumes, PDF compiled in your browser.',
				start_url: '/resumes',
				display: 'standalone',
				background_color: '#f7f7f5',
				theme_color: '#2f6fed',
				icons: [
					{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: 'icons/maskable-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				// The engine and the TeX Live tree are what make offline compiles possible;
				// most TeX files have no extension, hence the bare directory globs.
				globPatterns: [
					'client/**/*.{js,css,ico,png,svg,webp,woff,woff2,wasm,json}',
					'client/engine/*',
					'client/texlive/**/*',
					'prerendered/**/*.html'
				],
				globIgnores: ['client/engine/*.orig.js', 'client/engine/*.md'],
				maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
				navigateFallback: null
			},
			devOptions: { enabled: false }
		})
	],
	define: {
		__COMMIT__: JSON.stringify(commitHash())
	}
});
