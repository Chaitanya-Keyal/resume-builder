# Third-party components

| Component                                                                 | Where             | License                                                           |
| ------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------- |
| SwiftLaTeX pdfTeX engine (`swiftlatexpdftex.js`, `swiftlatexpdftex.wasm`) | `static/engine/`  | AGPL-3.0                                                          |
| SwiftLaTeX `PdfTeXEngine.js` wrapper                                      | `static/engine/`  | EPL-2.0 or GPL-2.0-with-classpath-exception                       |
| TeX Live subset (macro packages, fonts, format)                           | `static/texlive/` | LPPL, GPL, and public-domain per file; see the TeX Live catalogue |
| cm-super Type 1 fonts                                                     | `static/texlive/` | GPL with font exception                                           |

The engine is modified; the changes are documented in `static/engine/PATCH.md`.
Because the engine is AGPL-3.0, this project is distributed under AGPL-3.0 as well
(see `LICENSE`).
