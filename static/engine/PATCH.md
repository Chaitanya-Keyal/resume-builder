# Engine patch notes

`swiftlatexpdftex.js` and `swiftlatexpdftex.wasm` come from the SwiftLaTeX
release `v20022022` (20 Feb 2022, https://github.com/SwiftLaTeX/SwiftLaTeX/releases):
pdfTeX 1.40.21 compiled to WebAssembly, AGPL-3.0. `swiftlatexpdftex.orig.js` is
the untouched upstream glue. The upstream `PdfTeXEngine.js` wrapper is not used;
`src/lib/compiler/wasm.ts` speaks the worker protocol directly.

The minified glue has no readable diff, so its edits are listed here. They exist
so the TeX Live tree can be served by a plain static host (GitHub Pages) and
handed to the engine in one go, instead of SwiftLaTeX's on-demand server.

1. `kpse_find_file_impl`: upstream names each downloaded file after a `fileid`
   response header, which a static host cannot send. The patched glue saves it as
   `/tex/<format>/<name>` so the basename survives (TeX derives `\jobname` from
   it).
2. `kpse_find_pk_impl`: the same change for PK fonts (`/tex/pk<dpi>/<name>`).
3. Both lookups treat HTTP `404` like the upstream `301` ("file does not exist")
   and cache the miss.
4. A new `preload` worker message: `{ cmd: 'preload', files: [{ fmt, name, data }],
   misses: [{ fmt, name }] }` writes every file into the in-memory FS and fills
   the engine's hit and miss caches, so a compile never issues a synchronous XHR.
   The engine answers `{ cmd: 'preload', result: 'ok', count }`.

Worker protocol (unchanged upstream messages): `settexliveurl`, `mkdir`,
`writefile`, `setmainfile`, `compilelatex`, `compileformat`, `flushcache`,
`grace`. The worker posts `{ result: 'ok' }` once the WASM is loaded and
`{ cmd: 'compile', result, status, log, pdf }` after a compile.
