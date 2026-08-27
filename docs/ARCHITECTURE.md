# Architecture

## Runtime layers

```text
React screens + Phaser scenes
             ↓
local session / clocks / persistence / audio
             ↓
deterministic game domain
```

`game/` is platform-neutral TypeScript. It has no React, Phaser, DOM,
IndexedDB, storage, HTTP, socket, or database dependency. `GameCommand` contains
serializable intent only; `CommandContext.actorPlayerId` supplies trusted local
identity. `applyCommand`, `advanceCarousel`, and battle simulation receive all
state, content, seeds, and ticks explicitly.

The domain is divided by responsibility:

- `engine.ts` coordinates match creation, commands, and phase progression;
- `economy.ts`, `roster.ts`, `bots.ts`, `pairing.ts`, and `matchFlow.ts` own
  their focused rules;
- `carousel.ts` owns fixed-step Regatta state and geometry;
- `combat.ts` owns deterministic 100 ms combat;
- `scoring.ts` is shared by bots and React decision support;
- `persistenceFormat.ts` owns schema migration and pure JSON conversion;
- `hash.ts` provides canonical non-security state/content hashes.

## Application and presentation

`useLocalGameSession` applies typed commands locally and is the future
local/remote seam. IndexedDB is isolated in `voyagePersistence.ts`; clocks,
tutorial state, audio, and the bounded local diagnostic buffer are separate.
Typed selectors turn `MatchState` into screen views. Carousel ticks use the
focused `selectCarouselView` instead of rebuilding the complete match view.

Phaser consumes snapshots and events but never determines outcomes. Board
camera, assets, tokens, combat presentation, and scene configuration are split
into focused modules. Initial loading requests only the current map and the
preferred sheet for each visible unit; legacy sheets load only after failure.

## Persistence and determinism

Canonical state is plain JSON data. Schema versions 1–6 have committed migration
fixtures. Closing during combat saves the pre-battle state; continuing
regenerates the same result from its seed. Regatta checkpoints persist explicit
positions, steering targets, and ticks.

`hashMatchState` canonicalizes object keys before hashing. It is useful for
replay and soak comparisons, not security or authentication.

## Build stack audit

The app keeps Next-compatible App Router files and `vinext` because the current
scaffold uses layouts and metadata while Vite provides fast local builds.
Vinext's React/RSC peer packages therefore remain required. Empty Cloudflare,
Worker, Wrangler, D1/R2, Sites, and hosting placeholders were removed: the
local prototype does not use them, and a future game server can be an
independent process.
