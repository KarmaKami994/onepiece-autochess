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

Implementation is prepared, unverified. The owner declined B08 verification; the bounded B09 verification request is pending. No local test/typecheck/lint/build/browser/asset-validation or production run has been executed. New regression specifications are NOT RUN until permission is granted. No new aggregate, baseline or 1,000-seed soak.

Authored coverage: deterministic harbour replacement/prices/pool, full stock and invalid commands, one-battle effects/expiry, consumed merge recipient, Phoenix, save/regeneration, legacy offers/backfill, bot reserve/serving, replay validation and separate report counts, planner meal legality, icon provenance and browser keyboard/reload/full-stock/codex cases. Existing B07 content control explicitly clears B09 food definitions/options while retaining its historical content hash and exact diagnostic expectations.

Generation only: `node scripts/assets/build_food_icons.mjs` (three icons/provenance; exit 0), plus normalized content-snapshot metadata `6bf4b1a2b130dc9699b047926be72a60587f6275d315713f0c32a9e128198613`. This is not a test/validation PASS. Main remains the B08 squash; no B09 PR/CI or merge while verification permission is pending.
