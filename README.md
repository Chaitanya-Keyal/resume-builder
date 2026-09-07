# resume-builder

A local-first LaTeX resume builder. Keep everything you have ever done in one
library, compose named resumes from it, and get a one-page PDF compiled in your
browser. Nothing leaves your machine: there is no server, no account, and the
LaTeX engine runs as WebAssembly.

Live at https://resume.okaybro.dev.

## Status

Under construction. See `docs/spike-wasm.md` for why the compiler runs in the
browser and what that costs.

## Developing

```sh
bun install
bun run dev
```

`bun run test` runs the unit tests, `bun run check` type-checks, `bun run lint`
checks formatting and lint rules.

## License

AGPL-3.0, because the bundled pdfTeX engine is. See `LICENSE` and
`THIRD_PARTY.md`.
