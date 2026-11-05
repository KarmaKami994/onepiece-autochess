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

Crew Tools reads the same content and item/unit descriptions as match views.
`game/teamPlanner.ts` validates an independent version-1 document and invokes
the unchanged combat/form/trait functions. `app/plannerStorage.ts` owns its
bounded local library and JSON transfers; `plannerPresentation.ts` adapts a
disposable simulated result to existing presentation/recap selectors. The tool
does not dispatch into an active session or write IndexedDB voyage state.

Canonical state is plain JSON data. Schema versions 1–6 have committed migration
fixtures. New combat checkpoints save the current canonical state, including
immutable battle results and persistent battle-time purchases/merges. Loading
does not advance the phase again. `replayBattle: true` invokes only the legacy
compatibility path. Regatta checkpoints persist explicit positions, steering
targets, and ticks; Recruitment checkpoints retain reserved offers and RNG.

Optional schema-6 `PlayerState.finalLineup` retains the frozen battle-start
deployment and the bench at voyage end for eliminated players and the winner.
It is presentation metadata captured before elimination clears the roster;
it never changes combat, pool returns, or the existing `finalCrew` field used
by historical analytics. Deployment traits come from the frozen fighters.
The two groups describe different instants: a merged persistent unit can have
changed since combat started. Totals count the cards and equipment shown, not
a new ownership/economy metric. Missing deployment metadata remains unknown;
the UI displays the available saved roster without inferring a battle lineup.

`hashMatchState` canonicalizes object keys before hashing. It is useful for
replay and soak comparisons, not security or authentication.

## Build stack audit

The app keeps Next-compatible App Router files and `vinext` because the current
scaffold uses layouts and metadata while Vite provides fast local builds.
Vinext's React/RSC peer packages therefore remain required. Empty Cloudflare,
Worker, Wrangler, D1/R2, Sites, and hosting placeholders were removed: the
local prototype does not use them, and a future game server can be an
independent process.
