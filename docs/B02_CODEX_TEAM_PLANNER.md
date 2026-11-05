# B02 — Crew codex and isolated team planner

Completed implementation: 2026-11-05. Base: `1a294a9c7f068ac983c94109c95b5ac1c9009427`.
Branch: `codex/b02-codex-team-planner`. GameContent stays `1.31.0`, save schema
stays `6`; no gameplay, production bot policy or balance value changes.

## Product

The main menu's **CREW TOOLS** opens the codex and planner. The codex searches
current crew, abilities, equipment/recipes, bond tiers, forms, supported status
effects, PvE definitions and rounds 1–40. Cost, bond, star preview, item kind,
form lifecycle and stage-kind controls narrow the view. PvE remains separate
from shop crew. All 55 completed recipes and four production forms are covered;
entries derive from `GameContent`, shared item/unit views and trait descriptions.
The codex reads form prerequisites; it does not unlock anything in a voyage.

The team planner edits up to nine units on each side's deployment half with
stars, equipment and persistent-form choices. Cells and coordinates are
keyboard accessible; bond thresholds use the production distinct-definition
rule. Production form reconciliation resolves automatic Robin/Gear 4 progress.
Explicit persistent forms require a reachable star/catalyst combination;
temporary Monster Point is not an arbitrary starting form and still triggers
inside the unchanged simulator.

A combat test uses the existing `simulateBattle` with an explicit seed and
mirrored Team B. The existing Phaser battle presentation and outcome recap
render a disposable result. Replay replays that result. This is a setup/tool
context, not a new economic match mode: it grants no rewards, performs no pool
transactions and never replaces adaptive match bots or an active voyage.

## Files and persistence

`game/teamPlanner.ts` owns the portable tool document, whitelist validation,
production-rule resolution and simulation adapter. The application owns all
browser/file access. `plannerPresentation` creates a disposable renderer view;
it never enters `useLocalGameSession` or voyage persistence.

Team-plan format version **1** is independent of match schema 6 and requires
the current content version. Import validates two bounded teams, known crew and
item IDs, unique IDs/cells, integer coordinates, valid stars, equipment caps,
component/completed uniqueness and form legality. Two components must first be
resolved to their existing completed recipe. Invalid documents do not replace
the draft. Imports discard unknown fields, including supplied match data.

The separate localStorage key `grand-line-auto-chess.team-plans.v1` stores up to
20 named plans. Save replaces the matching name; load/delete affect only this
library. Corrupt/incompatible libraries and storage failures are reported
without overwriting their bytes. The draft survives codex/planner tab changes;
leaving the tool discards unsaved edits. Imported files remain drafts until
explicitly saved; exported JSON contains the validated normalized plan. Import
is limited to 100 KB. There is no migration of saved voyages or runtime network
dependency.

## PAC-first classification

Targeted source checked at `keldaanCommunity/pokemonAutoChess@13822d390ca0f2010881e910a6c3f73cf4df5653`:

- [Wiki tabs](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/public/src/pages/component/wiki/wiki.tsx)
  organize rules by units, abilities, items, synergies, status and stages.
- [Team builder](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/public/src/pages/component/bot-builder/team-builder.tsx)
  combines positions/items and computes synergy previews, while depending on
  PAC's stores, schemas and network room.

**DIRECT:** none. **ADAPTED:** category-based reference, composition editor and
shared production-rule previews. **REFERENCE ONLY:** PAC builder/scenario
format. **REJECTED:** importing its room/database/account/state-container stack
or replacing production bot boards. No PAC source code or franchise asset was
copied for this batch; the supplied permission context remains in the original
analysis. No multiplayer, extra match modes, languages or subsequent batch is
implemented.

## Verification

Executed results are recorded in [PROJECT_STATE.md](../PROJECT_STATE.md).
Focused tests cover content/recipe completeness, exact stage topology,
asset resolution, deterministic direct-simulator equivalence, mirrored positions,
invalid imports, form/item legality and isolated persistence. Browser tests
cover both desktop sizes, keyboard entry, filters, editing, save/reload,
import/export, replay and byte-for-byte preservation of the active voyage.
