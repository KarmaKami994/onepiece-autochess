# Contributing

Thanks for helping build Grand Line Auto Chess. The repository is public for
collaboration, while the playable prototype remains a localhost-only project.

## Setup

1. Install Node.js 22.13 or newer.
2. Run `npm ci`.
3. Start the game with `npm run dev`.

The normal game build uses only committed runtime assets. Asset generation is
orchestrated by cross-platform Node scripts. Python and LibreSprite resolve via
`PYTHON_PATH` / `LIBRESPRITE_PATH`, the project-local `.venv` and
`.codex-local/tools/LibreSprite-v1.1/` locations, then `PATH`. Local tool
directories are ignored and must never be committed.

## Workflow

1. Create a short-lived branch from `main`, such as `feature/combat-telegraphs`
   or `fix/carousel-timeout`.
2. Keep each pull request focused on one coherent change.
3. Explain player-facing behavior changes and include screenshots for UI work.
4. Request review before merging into `main`.

## Required checks

Run local checks for the part of the project you change. GitHub CI selects
the affected suites and keeps the broader safety checks for shared game and
toolchain changes. See [release verification](docs/RELEASE.md) for the check
selection and commands. Run the 1,000-match `test:production-soak` only for
a deliberate release or balance audit. Reports are written below `tmp/`.
The audit is also available through the manual `Release Production Soak` workflow.
Run `npx playwright install chromium` once before the first local E2E check.

Use `npm run assets:v2` to rebuild the standard 128×128 animation atlases.
Use `npm run assets:p12` for the complete named-PvE source, atlas, portrait,
token, and contact-sheet rebuild. The combined `npm run assets:all` includes
P12 without a GUI or network service.
Licensed imports must have their local source, source-page metadata, SHA-256,
frame map, pivot, processing steps, and explicit public-redistribution
permission recorded in `art/animation-v2/source-matrix.json` before they may
replace a v1 runtime fallback.

## Engine rules

- Planning state changes go through `applyCommand`.
- Engine code must not call `Math.random()`.
- Combat behavior must remain deterministic for identical state and seed.
- Add regression tests for economy, pool, merge, pairing, combat, or save changes.
- Animations consume battle events and must never determine combat results.

## Assets and rights

- Do not copy code, sprites, maps, sounds, or animation frames from reference
  games.
- Only contribute material you created or are authorized to contribute.
- Add generation sources, prompts, processing steps, and validation notes to
  `ASSET_PROVENANCE.md`.
- Do not commit credentials, `.env` files, local tool installations, caches, or
  absolute paths containing personal workstation information.
- Public repository access does not grant rights to third-party franchise names,
  likenesses, or other protected material.

Source code is licensed under MIT. Assets and third-party franchise elements are
excluded from that license; see `ASSET_LICENSE.md`. Discuss all licensing
changes with the repository owner before modifying either boundary.
