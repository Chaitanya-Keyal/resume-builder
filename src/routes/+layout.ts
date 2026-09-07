// Everything renders in the browser: the workspace lives in IndexedDB, so there
// is nothing a server (or the prerenderer) could fill in. Static routes are
// still emitted as shells so GitHub Pages answers them with a 200.
export const ssr = false;
export const prerender = true;
