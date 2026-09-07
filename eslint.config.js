import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				__COMMIT__: 'readonly'
			}
		},
		rules: {
			// Storage throws in private browsing; the empty catch is the handling.
			'no-empty': ['error', { allowEmptyCatch: true }],
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/no-useless-mustaches': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		// The engine is third-party minified output, patched by hand (see static/engine/PATCH.md).
		ignores: ['build/', '.svelte-kit/', 'static/engine/', 'static/texlive/']
	}
);
