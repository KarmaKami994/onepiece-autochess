# Bot Architecture and Meta-Bias Audit

## 1. Executive Decision

Choose **B — audit architecture now, tune adaptive decisions after P2 Economy / Progression and P3 Match Flow / Pacing**.

Choose **Architecture Option 3**: retain the current adaptive bot class for local matches and production meta simulation, and consider a separate PAC-inspired scripted benchmark-bot concept later. Do not replace adaptive bots with scripted boards. Scripted bots are useful for controlled combat benchmarks, tutorials and fixed difficulty curves, but they bypass the systems that production meta simulation must exercise.

Bot responsibility should stop at policy: select legal command intents for buying, leveling, rerolling, deployment, items and readiness. The deterministic game domain must continue to own costs, RNG, pools, merge rules, legality, state transitions and combat. Most current preparation decisions already use this boundary, which is compatible with future trusted server orchestration.

This is architecture research only. No bot weight, gameplay value, diagnostic or simulation changed. Existing production results remain valid measurements of the **current deterministic bot environment**; they are not direct evidence of a human or future meta.

## 2. Scope

Controlling sources:

- Official Pokémon Auto Chess repository at pinned commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`:
  - [`app/core/bot.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/bot.ts)
  - [`app/core/bot-manager.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/bot-manager.ts)
  - [`app/core/bot-logic.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/bot-logic.ts)
  - [`app/types/models/bot-v2.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/types/models/bot-v2.ts)
  - [`app/services/bots.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/services/bots.ts)
  - targeted bot-selection lines in [`app/rooms/commands/preparation-commands.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/rooms/commands/preparation-commands.ts)
  - targeted authoring lines in [`app/public/src/pages/component/bot-builder/bot-builder.tsx`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/public/src/pages/component/bot-builder/bot-builder.tsx)
- Current One Piece Autochess main `f618061b792744d8da0d038ec7eea0c70fe32813`: [`game/bots.ts`](../game/bots.ts), [`game/scoring.ts`](../game/scoring.ts), targeted bot-turn code in [`game/engine.ts`](../game/engine.ts), and personality definitions in [`game/content.ts`](../game/content.ts).

Out of scope: PAC networking and rooms beyond bot selection, current bot tuning, new diagnostics, P2/P3 implementation, Smoker work and any simulation.

## 3. PAC Bot Architecture

### Verified facts

PAC's runtime bot is scenario-driven, not an autonomous economy participant:

- `IBot` contains metadata plus `steps`; each `IStep` contains an authored `board` and `roundsRequired`.
- `Bot.initialize()` loads the scenario steps from `BotV2` persistence and immediately applies the current step. It also assigns random fairy wands outside the authored board, so the scenario is not the only runtime input.
- `BotManager.updateBots()` calls `updateProgress()` on each bot. The progress counter advances; when the next step's `roundsRequired` threshold is reached, the bot advances and reapplies its team.
- `updatePlayerTeam()` deletes the existing board, constructs every authored unit, assigns exact positions and items/TMs, inserts the units and recomputes synergies. It does not buy from a shop, manage gold, level, reroll or build a bench.
- The builder represents stages 0–30, copies the previous board into an empty next stage and normalizes imported legacy scenarios toward one stage per step.

PAC authoring and validation are stage-aware:

- category-based unit power values account for rarity, evolution/stars and special/duo categories;
- stage power is compared with a `POWER_AVERAGES` curve and displayed as an evaluation; estimated bot Elo is derived from average stage evaluations after the first three stages;
- stage-specific item-component budgets are enforced;
- scarf and tool counts are constrained by the relevant synergy tier;
- normal team size is capped at nine plus Gold Bow allowances;
- Unique, Legendary and additional-pick rarities have timing restrictions, and Unique/Legendary counts are constrained;
- the builder calls `validateBoard()` for the current stage and displays violations, item budgets, power and evaluation.

Power evaluation and its `ILLEGAL` display label are guidance, not a power-limit exception in `validateBoard()`. Validation is also not a generic synergy-quality check: synergies are computed to validate particular item capacities and authored mechanics.

PAC stored-bot selection has multiple paths:

- the targeted add-by-difficulty path maps requested difficulty to Elo bands, queries only `approved: true` bots and excludes bot IDs already present in that lobby before randomly choosing a result;
- explicitly selected bot objects bypass that random difficulty query;
- the automatic initializer queries up to seven bots within ±100 Elo of the owner, but the pinned code does not add the same `approved` or existing-ID filters there;
- bot list services can filter by approval or included Pokémon and sort metadata by Elo descending then ID;
- persistence and moderation use Mongo `BotV2`, approval state, authenticated submission and Discord announcement.

## 4. Why PAC's Architecture Is Useful

The following are **engineering inferences**, not claims of stated PAC developer intent:

- Authored board steps have the effect of making opponent strength progression controllable without requiring competent shop/economy AI.
- Exact stage boards make regression scenarios and community authoring easier to inspect than an emergent economy policy.
- Replacing a board is cheap at runtime and avoids repeated search over shop, bench, leveling and item choices; a likely engineering benefit is predictable server cost.
- Power curves, legality checks and estimated Elo provide authoring guardrails for difficulty progression.
- Scenario progression is less sensitive to shop RNG and economy changes, which is useful for stable combat benchmarks.

These benefits come from the behavior/data model, not from Mongo, Colyseus, Firebase, authentication, Discord or server-room infrastructure.

## 5. PAC Limitations for Our Product

A PAC-style scripted bot cannot be the only production-soak population. Exact board replacement bypasses:

- shop odds and shared-pool pressure;
- gold, interest, streak income and reserve behavior;
- XP costs, thresholds and level timing;
- reroll costs and decision quality;
- bench pressure, purchases, merging and star reachability;
- item acquisition and adaptive allocation.

It can therefore produce a stable **combat benchmark**, but it cannot validate the health of Economy / Progression or the emergent match meta. Authored boards can also become stale when content or legality changes and can represent teams that are legal yet economically improbable.

PAC's Pokémon-specific power categories, stage curve, rarity rules and Elo mapping are not transferable values. Its random fairy-wand assignment also means a scenario is not automatically a complete deterministic benchmark unless every additional input is explicitly controlled.

Reject for the current local prototype: Mongo BotV2 persistence, Firebase, Colyseus BotManager/rooms, community submission services, Discord integration and server bot databases.

## 6. Current One Piece Bot Architecture

One Piece bots are adaptive participants in the real deterministic match:

- seven bot players receive one of seven serializable personalities in fixed rotation; personality defines `economyReserve`, level/reroll aggression, preferred traits and formation style;
- `runBotTurn()` runs only during preparation and clones state before decisions;
- purchases, XP, rerolls, movement, item equip and readiness travel through the same `applyCommand()` legality path used by normal participants;
- selection and formation helpers are deterministic plain functions with explicit tie-breaks;
- shop rolls, pools, costs, merges, XP, level caps, board caps and item caps remain domain rules rather than bot-owned rules;
- item-choice and carousel auto-resolution use deterministic internal selection helpers; a future server bot orchestrator should express those choices through the normal command boundary where available.

This is the correct high-level class for local opponents, current production meta simulation and a future trusted server-side bot participant.

## 7. Current Decision Pipeline

1. **Round resources:** living players receive base income, interest, streak income and automatic XP; shops refresh through the real pool/odds system.
2. **Initial buy pass:** shop offers are scored and sorted deterministically.
3. **Offer score:** `cost × 25 + owned-instance count × 24 + preferred-trait match × 20 + top-two current trait-count contributions × 4 − connector penalty`.
4. **Purchase gate:** buy if reserve remains, the offer score reaches at least the cost baseline plus 24 through copies, traits and preference combinations, or the round is at most three. A preferred-trait bonus of `+20` alone does not reach that non-reserve threshold. A full bench may sell a lower-cost one-star unit only for a sufficiently stronger higher-cost offer.
5. **XP:** personality aggression becomes a fixed maximum of zero to three attempts; each purchase must preserve `economyReserve`, respect max level and have enough owned units to fill the level.
6. **Rerolls:** personality aggression becomes zero to three attempts; each must preserve reserve, and every successful reroll is followed by another buy pass.
7. **Lineup:** all owned instances are scored by unit score plus fixed star bonuses (2-star `+100`, 3-star `+260`) and `+18` per item; the top `player.level` instances are selected independently.
8. **Formation:** selected units are mapped to backline/frontline/flex/middle bands from traits/range, then placed by deterministic row, personality, spacing, last-opponent line/adjacent threat and backline-protection scores.
9. **Items:** choices/carousel use whole-roster item score. Inventory equip ranks item-unit compatibility first, then roster item score, instance score, deployed bonus and duplicate penalty.
10. **Ready:** the bot ends preparation through the command path.

## 8. P2/P3 Dependency Matrix

| Current behavior | Principal dependencies | Stability across P2/P3 |
| --- | --- | --- |
| Domain command/legality boundary and deterministic tie-breaks | explicit state, command context, content | **STABLE ACROSS P2/P3** |
| Unit/offer score | unit cost, owned instances, active trait counts | **LIKELY TO REQUIRE RECALIBRATION AFTER P2** |
| Reserve purchase gate and early-round override | gold curve, income, costs, bench pressure, round | **LIKELY TO REQUIRE RECALIBRATION AFTER P2/P3** |
| Full-bench replacement | bench size, sell value, cost curve, merge/star access | **LIKELY TO REQUIRE RECALIBRATION AFTER P2** |
| XP attempts | XP cost/amount, thresholds, auto XP, level cap, unit access, preparation count | **LIKELY TO REQUIRE RECALIBRATION AFTER P2/P3** |
| Reroll attempts | reroll cost, shop odds, pool availability, reserve, preparation count | **LIKELY TO REQUIRE RECALIBRATION AFTER P2/P3** |
| Top-score lineup selection | board cap/level, star progression, item acquisition, trait access | **LIKELY TO REQUIRE RECALIBRATION AFTER P2/P3** |
| Formation planner core | board geometry, unit archetypes, last-opponent board | **STABLE IN ARCHITECTURE; NEEDS MEASUREMENT AFTER P3** |
| Item selection/equip | item availability cadence and fixed trait/range affinities | **LIKELY TO REQUIRE RECALIBRATION AFTER P3/P4** |
| Number of adaptive decisions before elimination | preparation opportunities, stage cadence, damage and survival duration | **LIKELY TO REQUIRE RECALIBRATION AFTER P3** |

P2 changes could alter affordability, rarity access, star timing, shop/pool pressure and the value of reserve. P3 changes could alter how often the fixed decision loops execute, when streak income arrives, how long bots survive and which PvE/PvP/item opportunities occur. Tuning the weights before those systems stabilize would calibrate against moving denominators.

## 9. Current Meta-Bias Risks

No gameplay-engine logic defect was confirmed. The heuristic findings below are risks in the current environment, not proof that a result is wrong; the production-soak personality asymmetry was a separate confirmed measurement-harness defect and is resolved by the harness-only normalization described below.

| Finding | Classification | Evidence-backed risk |
| --- | --- | --- |
| Pre-fix production soak permanently assigned Balanced to `player-1`, duplicating the existing Balanced bot | **RESOLVED MEASUREMENT-HARNESS POPULATION ASYMMETRY** | Pre-fix main already converted `player-1` before the first preparation transition, so all eight participants acted as bots from round 1; the remaining defect was the fixed Balanced duplicate. The normalized harness rotates the duplicate deterministically. |
| `cost × 25` dominates base unit score | **PLAUSIBLE META BIAS / NEEDS MEASUREMENT** | Systematically favors higher-cost offers and instances before kit strength; full-bench replacement also requires the incoming unit to be higher cost. |
| Current owned-instance count gives fixed `+24` each | **INTENTIONAL SIMPLIFICATION / PLAUSIBLE META BIAS** | Encourages copies but measures instances, not marginal merge probability or copies embedded in an existing star. |
| Trait score uses raw current distinct counts, top two only | **PLAUSIBLE META BIAS** | Favors already-common traits without considering the next tier threshold, actual tier effect or marginal lineup composition. |
| Preferred-trait match is a fixed one-time `+20` | **INTENTIONAL SIMPLIFICATION** | Creates stable personality flavor but can amplify particular trait populations independent of current balance. |
| Fourth and later traits cost `12` each | **PLAUSIBLE META BIAS / NEEDS MEASUREMENT** | Can disadvantage high-connector units; three-trait connectors are unpenalized, so impact is roster-specific. |
| Fixed star bonuses `+100/+260` | **PLAUSIBLE META BIAS** | Can dominate cost/trait differences and retain starred units without evaluating whether a lower-score connector completes a stronger team. |
| Top-N independent lineup selection | **SCALABILITY CONCERN / PLAUSIBLE META BIAS** | Does not optimize the lineup as a set, so a strategically useful lower individual-score connector can be benched. |
| Trait/range item affinities use fixed multipliers | **PLAUSIBLE META BIAS / NEEDS MEASUREMENT** | Guardian, Brawler, Marksman, Swordsman, Specialist and range ≥4 receive explicit affinities; other kits receive generic valuation. |
| Formation bands are trait/range proxies | **INTENTIONAL SIMPLIFICATION / NEEDS MEASUREMENT** | Threat-aware spacing improves the model, but own ability geometry and exact targeting are mostly absent from archetype assignment. Some kits may be positioned suboptimally. |
| Reserve plus fixed aggression loops | **SCALABILITY CONCERN / PLAUSIBLE META BIAS** | Personalities attempt a fixed small number of XP/reroll actions per preparation, so progression curves are coupled to current income, costs and round cadence. |

Answers to the high-value questions:

1. **High-cost bias:** plausible and directly encoded by `cost × 25` plus higher-cost bench replacement.
2. **Already-common trait bias:** plausible; raw active trait counts increase candidate scores even without a tier-aware marginal calculation.
3. **High-connector disadvantage:** possible only beyond three traits; needs roster-specific measurement.
4. **Star distortion:** plausible because `+100/+260` is large relative to base cost scores.
5. **Ignored synergy connectors:** plausible because lineup selection ranks instances independently rather than evaluating complete sets.
6. **Formation disadvantage:** plausible but unmeasured; deterministic threat-aware placement limits, but does not eliminate, coarse archetype bias.
7. **Item-affinity bias:** plausible; explicit affinity traits and long-range units receive higher multipliers.
8. **Progression realism:** reserve and fixed XP/reroll counts are tightly coupled to current P2/P3 curves.
9. **Likely invalidation:** purchase, XP, reroll, star, trait-reach and reserve conclusions are most exposed to P2/P3; deterministic command seams and formation architecture are more stable.

Existing historical 1,000-seed runs remain valid **exact-historical-harness/current-policy evidence**. Statements such as “Smoker performed at a measured rate under that deterministic production-soak harness and bot policy” remain supported. They do not establish results for the normalized rotating eight-bot population, humans or a future bot policy.

### Production-soak population normalization

`createMatch()` still initializes `player-1` with `isBot: false` and `personalityId: null`; normal game behavior is unchanged. Pre-fix production-soak main immediately changed `player-1` to a bot and assigned Balanced before the first phase advancement, so all eight participants already received round-1 bot preparation. The confirmed defect was instead the permanent second Balanced assignment: the seven existing bot slots already covered all seven configured personalities, and the harness always added Balanced as the eighth.

The normalized harness now marks every participant as a bot and assigns personality IDs in existing content order before the first phase advancement with `personalityIds[(seedIndex + playerIndex) % personalityIds.length]`. With eight slots and seven personalities, every match contains all seven personalities plus one duplicate; the duplicate rotates by seed, and across seven seeds every personality receives eight assignments while every player slot uses each personality once. No eighth personality, bot-policy, gameplay-domain or RNG change is introduced.

Prior snapshots remain valid measurements of their exact historical harness and their conclusions are unchanged. A new authoritative broad baseline is required after this normalization PR merges; no historical snapshot is rewritten and no new 1,000-seed run is part of this fix.

## 10. Adaptive vs Scripted Bot Roles

| Role | Responsibility | Appropriate uses | Inappropriate use |
| --- | --- | --- | --- |
| **Adaptive Match Bot** | Use real shop, pool, gold, XP, rerolls, bench, items, traits and board capacity through domain intents | local opponents, production-soak meta population, future trusted server bot | fixed combat benchmark requiring identical authored teams |
| **Scripted Benchmark Bot** | Resolve serializable authored team progression into deterministic battle setups, with legality validation | combat regression, controlled difficulty calibration, tutorial/PvE opponents, mechanic tests | sole production-soak population or economy-health evidence |

Production meta simulation should primarily use adaptive bots because it must exercise the actual economy and progression. Scripted bots may supplement—not replace—that population for controlled comparisons.

## 11. Scalability / Multiplayer Fit

### Adaptive bots

Current pure scoring/planning helpers and deterministic sorting are server-portable. Most actions already use `applyCommand()` with trusted actor context. In a future server-authoritative match, a trusted bot orchestrator can choose the same intents as a player and submit them to the same domain boundary; clients remain presentation-only. No authentication or networking change is required now.

The policy should not duplicate rules. Costs, pools, RNG, merge legality, board caps and combat remain in the shared domain. Internal item-choice/carousel automation should eventually align with command intents when that server boundary is implemented.

### Scripted benchmark bots

A future benchmark definition can remain plain JSON-serializable step data plus deterministic validation/resolution functions. It needs no database, account, room, Redux or platform dependency. Benchmark setups should be kept separate from adaptive `PlayerState` economy to avoid silently bypassing real-match semantics.

## 12. PAC Port Classification

| PAC concept | Classification | One Piece decision |
| --- | --- | --- |
| Scenario step data model | **ADAPTED PORT** | Useful later as a separate serializable benchmark definition, mapped to local units/forms/items. |
| Round/stage-based progression | **ADAPTED PORT** | Useful for controlled benchmark/tutorial difficulty, using explicit local stages and deterministic advancement. |
| Authored exact board replacement | **REFERENCE ONLY** | Preserve the controlled-team effect, but resolve dedicated benchmark battle setups rather than replacing adaptive player economy state. |
| Board legality validation | **ADAPTED PORT** | A future benchmark authoring path should validate team size, content IDs, positions, items/forms and stage rules through local domain definitions. |
| Power scoring | **REFERENCE ONLY** | PAC's category and stage values are Pokémon-specific; use only the concept of an inspectable calibration score if future evidence requires it. |
| Difficulty/Elo classification | **REFERENCE ONLY** | Difficulty metadata is useful, but calibration must come from local controlled results rather than PAC thresholds. |
| Community-authored persistence/backend | **REJECT** | Mongo, Firebase, Colyseus rooms, submissions, moderation and Discord are unnecessary for the local prototype. |

No concept qualifies for a direct source port because content models, economy semantics and product needs differ.

## 13. Architecture Decision

**Option 3 — keep adaptive bots and add a separate scripted benchmark concept later.**

- Reject Option 1 because adaptive-only architecture lacks controlled authored benchmarks.
- Reject Option 2 because scripted-only bots cannot validate economy, shop, pool, leveling, rerolls, stars or item acquisition.
- Option 3 preserves current production coverage while adding a narrowly separate future tool for deterministic combat questions.
- No smaller Option 4 provides both emergent economy coverage and controlled benchmark stability without conflating responsibilities.

Architecture is locked at the role boundary, not at current weights: adaptive bot tuning waits until P2/P3 stabilize. Scripted benchmark implementation is not authorized by this audit.

## 14. Roadmap Ordering

**P1A:** current bot architecture/bias conclusion — complete with this audit; retain adaptive match bots, record current-policy generalization limits, defer tuning.

**P2:** Economy / Progression PAC-first research + audit.

**P3:** Match Flow / Pacing PAC-first research + audit.

**P1B:** adaptive bot tuning, only if still necessary after P2/P3.

**P4:** Items / Treasure / Form Accessibility research/audit.

Then: **merge the production-soak population normalization**.

Then: **run a new authoritative broad production baseline**.

Then: **unit-level balance**.

Smoker is frozen as a watch item. The previously proposed Smoker trait-state diagnostic is not the immediate roadmap task.

## 15. Exactly One Next Task

**P2 — PAC-first Economy / Progression research and architecture audit.** Inspect targeted pinned PAC economy/progression behavior, classify direct/adapted/reference/reject ideas, map deterministic/local/future-server fit and lock the P2 architecture before any economy implementation.

Do not implement P2, tune bots or run a production simulation in this PR.
