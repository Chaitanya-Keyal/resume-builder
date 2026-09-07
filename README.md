# resume-builder

A local-first LaTeX resume builder. Keep one library of everything you have
done, compose any number of resumes from it, and get a one-page PDF compiled
in your browser. Nothing leaves your machine: there is no server, no account,
and the LaTeX engine runs as WebAssembly.

Live at https://resume-builder.okaybro.dev.

## How it works

- **Library**: every job, stint, project, degree, award and skill you might
  ever put on a resume, with every bullet. Bullets use a small markup:
  `**bold**`, `_italic_`, `[text](https://…)`. Everything else is escaped for
  LaTeX for you.
- **Resumes**: named compositions over the library. Each picks which entries
  and which bullets to print, in what order, with per-resume rewording where
  needed. Labels (`backend`, `intern-2027`) keep them sorted.
- **Preview**: the resume is rendered to LaTeX and compiled by pdfTeX running in
  a Web Worker. The first visit downloads the engine and a trimmed TeX Live
  (about 10 MB, cached offline by the service worker); after that a compile
  takes a few hundred milliseconds.
- **Output**: download the PDF or the `.tex`. Every PDF download takes a
  snapshot, so the exact file you sent somewhere is recoverable later.
- **Data**: the library is a `profile.json` (a superset of
  [JSON Resume](https://jsonresume.org)) that you can publish from a site and
  re-import anywhere. Private fields such as your phone number live in a
  separate local overlay that never enters the public file. A `workspace.json`
  export backs up everything.

Two templates ship: the classic single-column "Jake's Resume", reproduced
exactly (the snapshot test in `src/lib/core/core.test.ts` holds its output to
`fixtures/sample/resume.tex`), and "Clean", a sans-serif, left-aligned layout
with thin rules under bold section titles. A resume can switch between them in
the composer's Layout block; density presets and page options carry over.

## Data model

`profile.json` is JSON Resume with four additions, all reversible by the
"Plain JSON Resume" export:

1. `version: 1` at the top level.
2. `work[]` and `volunteer[]` items hold `positions[]`, so two stints at one
   organisation are two selectable entries under one name.
3. `highlights` are `{ id, text, hidden? }` objects, so a resume can pick and
   reword individual bullets.
4. Anything a consumer needs beyond the standard lives under `x` on the item
   (the portfolio's slug, one-liner, stack, links).

JSON Schemas are published at `/schema/profile-1.json`,
`/schema/resume-1.json` and `/schema/workspace-1.json`.

## Developing

```sh
bun install
bun run dev
```

| Command                | What it does                                                                |
| ---------------------- | --------------------------------------------------------------------------- |
| `bun run test`         | Unit tests, including the LaTeX snapshot against the fixture                |
| `bun run check`        | Type-check                                                                  |
| `bun run lint`         | Prettier and ESLint                                                         |
| `bun run schema`       | Regenerate the JSON Schemas from the zod definitions                        |
| `bun run render`       | `bun run render profile.json resume.json [overlay.json] > out.tex`          |
| `bun run texlive`      | Rebuild `static/texlive` (needs a local TeX Live and Playwright's Chromium) |
| `bun scripts/smoke.ts` | Build, then compile the fixture in headless Chromium against the build      |
| `bun run vendor <dir>` | Copy the types, schema and markup module into a site's source tree          |
| `bun run pdf`          | Render and compile a resume natively from the same TeX files the app uses   |

`scripts/texlive-subset.ts` is how the TeX tree is produced: it runs the real
engine in a headless browser against a server that answers file requests with
`kpsewhich`, compiles every fixture and a kitchen-sink document per font size
and paper size, and materialises exactly the files that were asked for. Add a
package to a template, re-run it, commit the result.

## Deploying

The site is static. `.github/workflows/deploy.yml` builds and publishes to
GitHub Pages on every push to `main`; `static/CNAME` carries the custom domain.

## Self-hosting a compiler instead

The browser engine is the default and needs nothing. If you would rather compile
on a machine you run, point Data → Preferences → Compiler at an endpoint that
accepts `POST { tex }` and answers `{ ok, pdf (base64), pages, log }`.

## License

AGPL-3.0, because the bundled pdfTeX engine is. See `LICENSE`,
`THIRD_PARTY.md` and `static/engine/PATCH.md`.
