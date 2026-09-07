/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/info" />

declare global {
	namespace App {}

	// Injected by vite.config.ts at build time.
	const __COMMIT__: string;
}

export {};
