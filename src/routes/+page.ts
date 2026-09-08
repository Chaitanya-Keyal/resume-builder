// The landing page is the one route a crawler should read, so it renders on the
// server at build time; everything else waits for the browser and IndexedDB.
export const ssr = true;
