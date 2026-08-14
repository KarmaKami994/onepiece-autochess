# Contributing

Thanks for helping build Grand Line Auto Chess. The repository is public for
collaboration, while the playable prototype remains a localhost-only project.

## Setup

1. Install Node.js 22.13 or newer.
2. Run `npm ci`.
3. Start the game with `npm run dev`.

The normal game build uses only the committed runtime assets. Regenerating
sprite sheets additionally requires Python 3.11 or newer and LibreSprite
`1.1-dev`. Place the portable LibreSprite installation at
`.codex-local/tools/LibreSprite-v1.1/`; that directory is intentionally ignored
and must never be committed. The PowerShell asset scripts call LibreSprite in
headless batch mode.

## Workflow

1. Create a short-lived branch from `main`, such as `feature/combat-telegraphs`
   or `fix/carousel-timeout`.
2. Keep each pull request focused on one coherent change.
3. Explain player-facing behavior changes and include screenshots for UI work.
4. Request review before merging into `main`.

## Required checks

Run these before opening a pull request:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Use `npm run test:soak` for engine, economy, bot, pairing, or match-flow changes.
Before balance or release changes, also run `npm run test:production-soak`; its
1,000-match report is written below `tmp/` and intentionally remains untracked.
Run `npx playwright install chromium` once before the first local E2E check.

Use `npm run assets:v2` to rebuild the standard 128×128 animation atlases.
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
