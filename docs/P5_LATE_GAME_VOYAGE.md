# P5 Late-Game Voyage

## Scope and PAC classification

P5 was researched against `keldaanCommunity/pokemonAutoChess@a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee` and adds deterministic post-round-19 progression without changing the local match architecture.

- **DIRECT PORT:** completed-item carousels at rounds 22, 27 and 34; completed-item PvE rewards at rounds 24, 28, 32 and 36; one additional late-carousel proposition; distinct completed carousel items; at most four trait grants; and PvE enemy-count topology 3/3/3/6.
- **ADAPTED PORT:** PAC opponents become three One Piece PvE archetypes; PAC rewards use all 55 local completed recipes; PAC synergy stones map to the ten `grantedTraitId` items; the existing choose-one, victory-gated reward flow and deterministic local RNG remain authoritative.
- **REFERENCE ONLY:** stage 40, item picks at 29/33/37, Portal Carousel, Gift Shop, Additional Picks, towns, shiny encounters, special rewards, berries, tools, dishes, fishing and Fossil rarity.
- **REJECT:** PAC backend, rooms, database/network infrastructure and Pokémon-specific passives, forms or evolutions.

## Stage schedule

Early PvE rounds 1, 2, 3, 9, 14 and 19 and early carousels 4, 12 and 17 are unchanged and continue to award components with their existing waves, timing and RNG behavior.

The new completed-item carousels are New World Exchange (22), Emperor's Crossroads (27) and Final Voyage Muster (34). Each uses 30 seconds of preparation and a 45-second battle/session duration.

The new PvE encounters are:

- 24, Vice Admiral Vanguard: three Vice Admirals.
- 28, Cipher Pol Hunt: three Cipher Pol Agents.
- 32, Seraphim Deployment: three Seraphim.
- 36, World Government Onslaught: two of each archetype.

Each late PvE stage uses 30 seconds of preparation, 45 seconds of battle time and three completed-item choices after victory. Existing deterministic row-major enemy placement remains unchanged.

## PvE archetypes

- **Vice Admiral:** 3,200 Health, 130 Attack, 45 Defense, 35 Special Defense; Haki Shockwave deals 360 Physical damage to the nearest enemy and adjacent targets and stuns for 500 ms.
- **Cipher Pol Agent:** 2,800 Health, 150 Attack, 38 Defense and Special Defense; Six Powers Assault uses the existing Lunge authority for 420 Physical damage with 25% Defense Pierce.
- **Seraphim:** 4,200 Health, 140 Attack, 60 Defense, 55 Special Defense; Lunarian Laser deals 400 Special line damage toward the farthest enemy and applies 20-power Burn for 3,000 ms.

All three use `/assets/characters/placeholder.svg`. Final authored PvE art is intentionally deferred to the post-P6 asset pass.

## Deterministic reward algorithms

For every victorious player at a late PvE stage, the engine starts from completed items in stable ID order. It shuffles the non-trait subset once and takes the first two. It then excludes those IDs from the stable full completed pool, shuffles that pool once, and takes its first item. RNG state is consumed after each shuffle and the offered order is preserved as `[firstNonTrait, secondNonTrait, finalPick]`. The result is three distinct completed items with at most one trait grant; losing players receive no choice.

Late carousels start from all 55 completed items in stable ID order and perform one deterministic shuffle. The engine accepts distinct results in shuffled order until `min(10, max(6, livingPlayers + 4))` choices exist, skipping trait-grant items after four have been accepted. Early carousels retain their doubled component deck and `min(9, max(5, livingPlayers + 3))` count.

`acquirableItemIds` remains the ten-component P4 acquisition list. P5 does not add reward state, callbacks, extra rerolls or any non-seeded randomness.

## Intentional omissions

P5 adds no stage 40, portals, towns, gift shops, additional picks, new item mechanics, bot tuning, economy/captain-damage changes, generic scripting framework or backend. P6 trait work is not started. GameContent is `1.24.0`; save schema remains 6 and requires no migration.
