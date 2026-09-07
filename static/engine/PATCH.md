# Engine patch notes

The files here come from the SwiftLaTeX release `v20022022` (20 Feb 2022,
https://github.com/SwiftLaTeX/SwiftLaTeX/releases): `swiftlatexpdftex.js`,
`swiftlatexpdftex.wasm` (pdfTeX 1.40.21 compiled to WebAssembly, AGPL-3.0) and
`PdfTeXEngine.js` (the worker wrapper, EPL-2.0 / GPL-2.0-with-classpath-exception).

`*.orig.js` are the untouched upstream files; `PdfTeXEngine.patch` is the diff for
the wrapper. The minified glue has no readable diff, so its three edits are listed
here instead. All of them exist so that the TeX Live tree can be served by a plain
static host (GitHub Pages) instead of SwiftLaTeX's on-demand server.

## swiftlatexpdftex.js (worker glue)

1. `kpse_find_file_impl`: the upstream server names each downloaded file with a
   `fileid` response header, which a static host cannot send. The patched glue
   saves the file as `/tex/<format>/<name>` instead, so the basename survives
   (TeX derives `\jobname` from it; the original edit that used
   `<format>_<name>` produced a `26_pdflatex.fmt`).
2. `kpse_find_pk_impl`: same change for PK fonts (`/tex/pk<dpi>/<name>`).
3. Both lookups treat HTTP `404` like the upstream `301` ("file does not exist")
   and cache the miss, so a missing optional file is asked for once per session.

## PdfTeXEngine.js (wrapper)

1. `ENGINE_PATH` points at `engine/swiftlatexpdftex.js` (relative to the page)
   rather than the page's own directory.
2. `setTexliveEndpoint()` no longer drops the worker reference after posting the
   URL (an upstream bug that made the engine unusable after changing the endpoint).
