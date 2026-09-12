# P10 — Fixed PvE Cadence and Item Economy

## Pinned PAC reference

Inspected `keldaanCommunity/pokemonAutoChess` at commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`: `app/models/pve-stages.ts`, `app/config/game/stages.ts`, the stage wiki, and the relevant game-room/command flow. PAC has PvE at rounds `1,2,3,9,14,19,24,28,32,36,40`, item carousels at `4,12,17,22,27,34`, Additional Picks at `5,8,11`, and Portal Carousels at `0,10,20`. In particular, PAC rounds 10 and 20 are **not PvE**.

- **Direct:** fixed special-round cadence; early components, late completed items, distinct automatic/choice/multi-item reward modes; the six unchanged item-carousel slots; a final round-40 PvE encounter.
- **Adapted:** local rounds 5, 8 and 11 retain only the Additional Pick item contribution: one component choice for every living player, regardless of PvP result. PAC's Portal slots at 10 and 20 have no local equivalent yet; those rounds retain the existing default PvP fallback until a separately approved Voyage/Portal Choice system exists.
- **Reference only:** PAC roster, shiny/evolution/synergy rewards, held-item setups, rarity and online systems.
- **Rejected for P10:** Portal Carousel gameplay, Gift Shop, extra unit acquisition, new items/enemies, networking and nondeterministic rewards.

## Local cadence and reward contract

Pre-P10 PvE: `1,2,3,9,14,19,24,28,32,36`. P10 PvE: `1,2,3,9,14,19,24,28,32,36,40`. Carousels remain `4,12,17,22,27,34` (components through 17, completed items from 22). Supply choices are `5,8,11`. Rounds 10 and 20 remain ordinary fallback PvP rounds with their existing 50-second preparation timing, normal PvP captain damage, and no additional item reward.

| Round | Reward on PvE victory, unless noted |
| --- | --- |
| 1, 3, 9 | One automatic component each |
| 2, 14 | One of three distinct components |
| 5, 8, 11 | One of three distinct components for every living player after PvP, win or lose |
| 19 | Two distinct automatic components |
| 24, 28, 32, 36 | One of three distinct completed items; the first two offers are non-trait grants |
| 40 | Three distinct automatic completed items, excluding trait grants |

Assuming victories, survival and participation, the structural schedule supplies 7 PvE components + 3 supply components + 3 component-carousel pickups = **13 components**; 4 late PvE choices + 3 completed-carousel pickups = **7 completed items through round 36**, then 3 more on a round-40 victory. Actual match averages below include losses and eliminations. These are item-economy measurements, not balance targets.

## Deterministic PRE / POST audit

The exact pre-change `main` was `e8d9b76683d9d335fdc702542b386f11ada50f17`, GameContent `1.28.0`, content hash `8056588a`. Its original 1,000-seed report is `docs/analysis/p10-fixed-pve-item-economy-pre-1000.json` (SHA-256 `86445bbf4f64340158a5ec42c28d5dbef933c5e195270b564dd42bea7234e0b8`): 1,000/1,000 complete, zero crashes, 38.55 average rounds, 36.469 full-clock / 25.665 paced minutes, 100% reach at 24 and 84.3% at 36. That original report did not record round-40 reach or acquisition-source totals.

The same `production-0` through `production-49` seeds were run on exact-base code and the **initial, pre-review P10 implementation**. A temporary PRE-only observer counted inventory increases by source; it changed no base gameplay or bot policy. The POST observer is retained in `scripts/run_production_soak.ts`. Both count acquired inventory items, not crafting/equipping or final held-item usage. The initial POST used GameContent `1.29.0`, content hash `bbe62d57`, config hash `977295da`; its recorded `gitSha` was the unchanged base HEAD because the P10 tree was not yet committed. Commit `aa925bf6f306e49722ada44a623d78972a74b9bc` contains that measured, now-superseded implementation. **Its POST averages include the removed 10/20 PvE stages and do not measure the corrected PR.** No replacement large baseline was generated for the review correction.

| Historical same 50 seeds, before review correction | PRE | Initial POST (superseded) |
| --- | ---: | ---: |
| Complete matches / crashes | 50 / 0 | 50 / 0 |
| Average rounds | 38.72 | 40.32 |
| Average full-clock / paced minutes | 36.650 / 25.804 | 37.351 / 26.104 |
| Match reach at rounds 24 / 36 / 40 | 100% / 88% / 42% | 100% / 100% / 50% |
| Components acquired per participant | 9.0000 | 13.0000 |
| Completed items acquired per participant | 4.2725 | 5.1300 |
| All items acquired per participant | 13.2725 | 18.1300 |
| All items acquired per surviving player | 15.86 | 21.50 |
| PvE automatic items per participant | 0 | 5.39 |
| PvE choice items per participant | 8.2125 | 4.50 |
| Supply choice items per participant | 0 | 3.00 |
| Carousel items per participant | 5.06 | 5.24 |

The historical 50-seed comparison is descriptive, not a new authoritative broad baseline or evidence of corrected-head averages. No combat, unit, trait, bot, captain-damage or economy tuning follows from it. GameContent remains `1.29.0`; save schema remains `6`. P1B remains deferred.
