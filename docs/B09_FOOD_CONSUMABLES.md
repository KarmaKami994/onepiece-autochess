# B09 — Food and consumables

## Locked scope

Base: B08 squash `e564e59b580a0238e309e61310231649f2b21094`; branch `codex/b09-food-consumables`. GameContent `1.34.0`, save schema 6. Local/offline commands remain authoritative. No existing crew, item, recipe, trait, P10 reward, scoring weight or battle RNG change.

## PAC source and adaptation

Pinned reference: `keldaanCommunity/pokemonAutoChess@a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`.

- **Direct principle:** [Pokemon dishes](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/colyseus-models/pokemon.ts) are separate from held items; `canEat` bounds pending meals. [Simulation start](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/simulation.ts) applies and clears them once.
- **Adapted:** [dish effects](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/effects/dishes.ts) use fight-start effects; local food uses three existing stat primitives, serialized stock and one meal per player per preparation. Harbour choices replace an option rather than adding rewards.
- **Reference only:** PAC dish catalogue, exact values, Pokemon-specific evolutions and special eating exceptions.
- **Rejected:** remote infrastructure, new crafting economy, permanent stat growth, food occupying equipment slots, new combat primitives.

## Production contract

- Three original foods: Sea-King Bento (+10% Max HP), Cola Tonic (+15 starting Energy, capped), Pirate Curry (+10% Attack). Effect lasts one battle; no captain healing. Food is separate from the 65 items / 55 recipes and their three equipment slots.
- Usopp R16/21 offers two components and one food for free; Franky R18/23 offers one component and one food for the existing 2 gold. Total option counts and skip remain unchanged. Food selection uses serialized RNG. Saved legacy component-only offers remain unchanged. P10 rewards/carousel/recruitment cadence are unchanged.
- Stock capacity: three portions, duplicates allowed. A full stock cannot accept another food and pays nothing; other offers/skip remain available. No overflow currency or new reward.
- `USE_FOOD` during preparation consumes one stocked portion and binds the meal to an owned deployed instance. At most one meal per preparation; no stacking or replacement. Invalid commands mutate nothing. Selling, benching or losing that instance in a merge before battle forfeits the portion; keeping its ID preserves the meal. This is shown before serving.
- At battle start freeze each pending meal, clear it from preparation state, and apply only to its original deployed instance. Regeneration/ghost presentation uses the frozen meal without consuming stock again. Effects are captured in combat snapshots and Phoenix's existing baseline; no new random roll or post-revival re-serving. Clear frozen meals on the next round.
- Schema-6 additive stock/meal/history backfill defaults to empty. Save/resume preserves exact offers, stock, pending/frozen meals and RNG. Factual received/served/applied/expired receipts are separate from item acquisition counters and cannot grant rewards.
- Food-only bot rule: take an affordable food when stock is empty and a deployed fighter already has a completed item; paid choice preserves the personality reserve. Otherwise retain component scoring/skip. Serve stocked food in stable ID order to the strongest deployed instance by existing instance score and ID tie-break, through normal command authority. Existing shop/XP/item/form/recruitment policy stays unchanged.
- Separate accessible Galley controls, harbour food cards, codex and original local SVG icons explain stock, target, one-battle duration and forfeiture. Planner/replay/report adapters preserve the same frozen identity without affecting voyage ownership.

## Verification / handoff

Initial source `6233c7170bc449cb24f4c4ba834b05f251f05835` was published unverified. The owner subsequently approved the bounded B09 verification scope. Corrections: typed legacy harbor dictionary, JSX escaping, native keyboard activation isolated from the global battle shortcut, and a Phoenix fixture with a surviving opponent. No item/combat value or RNG implementation was changed by verification.

Authored coverage: deterministic harbour replacement/prices/pool, full stock and invalid commands, one-battle effects/expiry, consumed merge recipient, Phoenix, save/regeneration, legacy offers/backfill, bot reserve/serving, replay validation and separate report counts, planner meal legality, icon provenance and browser keyboard/reload/full-stock/codex cases. Existing B07 content control explicitly clears B09 food definitions/options while retaining its historical content hash and exact diagnostic expectations.

PASS: final typecheck/lint/build, asset/provenance validation, whitespace inspection, focused 78/78 and affected regressions 54/54. Local full suite executed once: 945/949; the four inherited B08 foundation failures were corrected and rerun in the focused set. These were stale 8→12 status counts, a healer choosing itself before damage, and P9's old projection needing the existing hash-verified pre-B08 content control. The historical P9 hash and current Kuzan assertions remain unchanged. No second full local run; normal CI runs the complete final suite.

PASS: final Food browser 6/6 at both desktop sizes, plus existing harbor/tools 12/12. Initial combined run 16/18 found the Enter shortcut collision; corrected without relaxing assertions/timeouts. Both screenshots and three icons inspected. Normalized content contract `6bf4b1a2b130dc9699b047926be72a60587f6275d315713f0c32a9e128198613` passes. Main remains B08; [PR #71](https://github.com/KarmaKami994/onepiece-autochess/pull/71) publishes verified implementation `1438f03b7c9b611582293c94a374dbd5911ca47a` with subsequent metadata only. Its [exact-head CI checks](https://github.com/KarmaKami994/onepiece-autochess/pull/71/checks) are the remote integration result. No B09 merge, separate local production run, aggregate/baseline or 1,000-seed soak.
