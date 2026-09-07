import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess(),
	compilerOptions: {
		// Runes everywhere in this project; libraries decide for themselves.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// A single-page app: every route is rendered in the browser because the
		// data lives in the browser (IndexedDB). Static routes are still
		// prerendered as shells; anything dynamic falls back to 404.html, which is
		// what GitHub Pages serves for unknown paths.
		adapter: adapter({ fallback: '404.html' }),
		paths: {
			// Empty at resume.okaybro.dev; '/resume-builder' when serving from
			// project Pages without the custom domain (set by CI).
			base: process.env.BASE_PATH || ''
		},
		prerender: {
			handleUnseenRoutes: 'ignore'
		}
	}
};
