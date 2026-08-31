# Economy and Progression Architecture Audit

## 1. Executive Decision

Choose **Option 1 — keep the current economy architecture**. The authoritative finite pool, deterministic shops, gold/XP commands, level-based board cap, automatic progression and battle-economy boundary are structurally sound and already match or deliberately adapt most useful PAC principles. No transactional economy defect was found.

Do not tune economy values before P3 Match Flow / Pacing. Full star-copy sell refund is the highest-value P2 watch item, but current evidence supports **WATCH / NEEDS MEASUREMENT**, not a required change. Pool-size suitability beyond 30 units and realized high-cost access are also measurement questions coupled to survival and pacing.

The next bounded task is **P3 — PAC-first Match Flow / Pacing research and architecture audit**. That audit is code-backed research and does not require a production run, so it can safely precede the known soak-population fix. The participant population must still be normalized or intentionally specified before any new authoritative baseline.

## 2. Scope

Controlling sources:

- Official Pokémon Auto Chess repository at pinned commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`:
  - [`app/config/game/experience.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/config/game/experience.ts)
  - [`app/config/game/shop.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/config/game/shop.ts)
  - [`app/config/game/pools.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/config/game/pools.ts)
  - [`app/models/colyseus-models/experience-manager.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/colyseus-models/experience-manager.ts)
  - targeted economy fields in [`app/models/colyseus-models/player.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/colyseus-models/player.ts)
  - targeted pool/shop functions in [`app/models/shop.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/shop.ts)
  - targeted buy, sell, reroll, level, income, elimination and rollover ranges in [`app/rooms/commands/game-commands.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/rooms/commands/game-commands.ts)
  - targeted streak resolution in [`app/core/simulation.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/simulation.ts)
  - targeted bench helpers in [`app/utils/board.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/utils/board.ts)
  - shared shop ownership in [`app/rooms/states/game-state.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/rooms/states/game-state.ts)
- Current One Piece Autochess main `c3075ef3b1375097b31eb4f85eb12968c794df46`: [`game/economy.ts`](../game/economy.ts), [`game/content.ts`](../game/content.ts), targeted ranges in [`game/engine.ts`](../game/engine.ts), [`game/matchFlow.ts`](../game/matchFlow.ts), [`game/roster.ts`](../game/roster.ts), [`game/state.ts`](../game/state.ts), and the existing report schema in [`scripts/run_production_soak.ts`](../scripts/run_production_soak.ts).

Out of scope: value changes, simulations, new diagnostics, bot tuning, P3 implementation, soak-harness repair, PAC special-mode infrastructure and combat.

## 3. PAC Economy / Progression

### Verified normal-mode facts

- Player money starts at 5 outside development mode; progression starts at level 2 with 0 XP and caps at level 9.
- Level thresholds from levels 2 through 8 are `2 / 6 / 10 / 22 / 34 / 52 / 72` XP.
- A level purchase costs 4 gold and grants 4 XP. Each completed stage transition grants 2 automatic XP.
- The shop has six slots. A paid manual reroll costs 1 gold, releases the complete old shop to the shared pool and rolls six new offers.
- Normal shop odds are level-dependent. Levels 2–9 match the current One Piece table exactly; PAC also defines level 1 and level 10 rows outside its normal level-2-to-9 progression.
- One shared `Shop` object owns rarity pools. Standard regular pools initialize at `27 / 22 / 18 / 14 / 10` copies by Common through Ultra rarity. The pool configuration also supports smaller counts by maximum evolution depth: Common `1/18/27`, Uncommon `1/13/22`, Rare `1/9/18`, Epic `1/7/14`, Ultra `1/5/10` for one-/two-/three-stage lines; additional and regional entries use that depth-aware path.
- Rolling an offer removes one baseline copy. Full refresh and elimination release offers; sales and elimination return `1 / 3 / 9` underlying copies for one-/two-/three-star units, with duo and regional exceptions.
- Standard buy price follows rarity cost `1 / 2 / 3 / 4 / 5`.
- Standard non-duo sell price is `rarity cost × displayed stars`: `c / 2c / 3c`, not historical investment `c / 3c / 9c`. Eggs, Ditto, Falinks, Meltan, Magikarp lines, fishing lines, Unown, Hatch, Unique, Legendary, Eevee, duos, Rare Candy and Mothim have explicit exceptions.
- Normal transition income is 5 base gold plus one interest per 10 pre-income gold, capped at 5, plus a consecutive-result streak bonus capped at 5. A PvP winner receives a separate 1 gold at result time.
- Win and loss streaks share the same PAC streak counter behavior; the bonus begins on the second consecutive same non-draw result. A draw preserves the existing PAC streak. Streak income is excluded after PvE.
- Automatic rollover releases and replaces all offers when unlocked. When locked, existing offers stay reserved, empty slots refill, and the lock clears. This is the previously approved shop-lock behavior.
- The normal bench has eight cells; normal board capacity equals level.

PAC contains numerous items, special game rules, regional pools and exceptional Pokémon. They are not economy defaults and are not candidates for direct project transfer.

## 4. Why PAC Uses These Mechanics

The following are **engineering inferences**, not claims of PAC developer intent:

- Finite shared pools create contest pressure and make held/sold/eliminated copies strategically relevant.
- Partial evolved-unit sell value creates commitment cost and makes pivots more expensive than temporary ownership.
- Interest rewards delayed spending, while reroll and XP prices create explicit opportunity costs.
- Levels simultaneously increase board capacity and expensive-rarity access, creating a roll-versus-level tradeoff.
- Evolution-depth pool sizing can control upgrade feasibility where roster lines require different numbers of copies.
- Reserving shop offers until purchase, refresh or elimination makes pool ownership transactional and inspectable.

The useful lessons are behavioral. PAC's nondeterministic `Math.random`, Colyseus schemas, server rooms, special modes and content-specific exceptions are not required by this local deterministic architecture.

## 5. Current One Piece Economy

| Value | Current rule |
| --- | --- |
| Start | 5 gold, level 2, 0 XP, 100 HP |
| Limits | level 9, board cap equals level, bench 8, shop 6 |
| Round income | 5 base + interest + streak bonus |
| Interest | `min(5, floor(pre-income gold / 10))` |
| Streak | `min(5, max(winStreak, lossStreak) - 1)`, floor 0 |
| PvP win | immediate +1 gold |
| XP | automatic +2 per completed round; buy 4 XP for 4 gold |
| Thresholds | L2→3 `2`, L3→4 `6`, L4→5 `10`, L5→6 `22`, L6→7 `34`, L7→8 `52`, L8→9 `72` |
| Reroll | 1 gold, complete refresh |
| Odds L2–L9 | `100/0/0/0/0`; `70/30/0/0/0`; `50/40/10/0/0`; `36/42/20/2/0`; `25/40/30/5/0`; `16/33/35/15/1`; `11/27/35/22/5`; `5/20/35/30/10` |
| Per-unit pool | cost 1–5: `27 / 22 / 18 / 14 / 10` |
| Buy / sell | buy `cost`; sell `cost × 1/3/9` represented copies |
| Merge | three equal-star copies; 2-star represents 3, 3-star represents 9 |

Every match starts with one shared pool in `MatchState`; each player's initial shop immediately reserves its offers. Shop cost is rolled from current-level odds after masking empty cost bands, then a definition is weighted by its remaining copies. RNG state, pool, shops, gold, units, level and XP remain explicit authoritative state.

## 6. Economy Lifecycle

`battle result` → `PvP winner +1 and streak update` → `HP/elimination; owned units and shop offers return to pool` → `round increments` → `interest from current gold` → `base + interest + streak income` → `automatic XP` → `locked empty-slot refill or full automatic refresh` → `preparation spending` → `battle spending remains available within restrictions` → `sale returns represented copies`.

Important ordering consequences:

- PvP win gold is present before next-round interest is calculated and can cross an interest threshold.
- Bench sales during battle are also present before transition income and may cross a threshold.
- Interest is calculated before base/streak income is added.
- Locked non-empty offers remain out of the pool; only empty slots consume new copies.
- One Piece pays retained win/loss streak income after any completed round, including PvE; PAC excludes streak income on PvE transitions.

## 7. PAC vs One Piece Matrix

| Concept | PAC normal mode | One Piece Autochess | Meaningful difference? | Likely consequence |
| --- | --- | --- | --- | --- |
| Starting level / gold | 2 / 5 | 2 / 5 | No | Same opening budget baseline. |
| Shop / reroll | 6 slots / 1 gold | 6 / 1 | No | Same immediate roll opportunity cost. |
| XP purchase / passive XP | 4 gold→4 XP / +2 per stage | 4→4 / +2 per round | Numeric parity | Realized timing still depends on stage cadence and survival. |
| Thresholds / max level | `2/6/10/22/34/52/72`, max 9 | Same | No | Same no-spend arithmetic. |
| Shop odds | L2–L9 identical; extra L1/L10 rows | Same L2–L9 only | No in normal range | Reachability can still differ through pacing. |
| Pool | Shared; rarity and supported evolution depth | Shared; fixed by cost | Yes | Local model fits universal 3-star progression but expansion dilutes specific-unit rolls. |
| Pool copies | Regular three-stage baseline `27/22/18/14/10` | `27/22/18/14/10` for every unit | Adapted | Same initial counts for current universal 3-star units. |
| Buy price | Standard rarity cost 1–5 | Unit cost 1–5 | No for standard units | Same acquisition price. |
| Sell price | Standard `c/2c/3c`; many exceptions | `c/3c/9c` | **Yes** | Local pivots and upgraded-unit liquidity are much more forgiving. |
| Base / interest | 5; +1 per 10, cap 5 | Same | No in normal mode | Same structural savings incentive. |
| Streak / win gold | Same-result streak cap 5; +1 PvP win | Effective same curve; +1 PvP win | Yes at draw/PvE boundaries | PAC preserves draws and excludes PvE streak payout; local resets draws and pays retained streak after PvE. |
| Bench / board cap | 8 / level | 8 / level | No | Similar greed and deployment constraints. |
| Merge | Count evolution; ordinary 1/3/9 pool representation | automatic 3-copy merges; 1/3/9 | Adapted | Local merge model is uniform and content-neutral. |
| Lock rollover | retain offers, refill empties, unlock | Same deterministic behavior | No | Approved architecture already aligned. |
| Manual reroll | full release and refresh | Same | No | Pool reservations are replaced transactionally. |

Numeric parity does not establish equal outcomes: PAC and One Piece have different stage schedules, damage, elimination timing, content density and opponent behavior.

## 8. Sell / Commitment Economy

One Piece verifies the proposed formula exactly:

| Star | Copies represented | One Piece refund | Ordinary PAC refund |
| --- | ---: | ---: | ---: |
| 1★ | 1 | `1 × cost` | `1 × cost` |
| 2★ | 3 | `3 × cost` | `2 × cost` |
| 3★ | 9 | `9 × cost` | `3 × cost` |

Classification: **WATCH / NEEDS MEASUREMENT**.

Full investment refund lowers commitment risk, makes pivots cheaper, supports temporary board strength and turns upgraded units into highly liquid stored gold. It can encourage bench hoarding, late high-cost transitions and sell-to-interest-threshold timing; selling also returns all represented copies, enabling pool cycling. A 3-star 5-cost unit is 45 gold of recoverable liquidity locally versus an ordinary PAC value of 15.

This is not a clear defect. Eight bench slots still constrain greed, a sale abandons assembled strength, contested copies remain finite, and current diagnostics do not show sell frequency, liquidated value or interest gained through liquidation. Preserve the formula until a normalized harness can measure commitment and pivot behavior; do not copy PAC's exception-heavy pricing.

## 9. Interest / Streak Economy

Interest is structurally meaningful: 10/20/30/40/50 pre-income gold produces 1/2/3/4/5 extra gold each round. One reroll costs 1 and one XP bundle costs 4, so each threshold has direct spending opportunity cost. Whether players regularly hold enough gold and for how long remains unmeasured and P3-coupled.

Full-refund selling can convert board/bench investment back into interest-bearing gold immediately, including during battle before transition. That interaction is potentially forgiving, but is not quantifiable from current reports.

Both wins and losses receive the same escalating local streak compensation; winners additionally receive 1 immediate gold. Loss compensation is meaningful from the second consecutive loss onward and reaches +5 on the sixth. Classification: **P3-COUPLED** because stage cadence, draws, captain damage and elimination timing determine streak duration and lifetime payouts. Preserve current values through P3.

## 10. XP / Level Progression

Leveling buys exactly two economy powers: one more deployable board unit and the next shop-odds row, which increases access to higher costs. Commands, stage selection and merge requirements do not otherwise scale from player level.

Minimum no-purchase timing at entry to the listed round:

| Round / stage | Level | XP toward next |
| --- | ---: | ---: |
| 1 — East Blue Patrol (PvE) | 2 | 0 / 2 |
| 2 — Rifle Line (PvE) | 3 | 0 / 6 |
| 3 — Raider Ambush (PvE) | 3 | 2 / 6 |
| 4 — First Muster (carousel) | 3 | 4 / 6 |
| 5 — PvP | 4 | 0 / 10 |
| 9 — Calm Belt (PvE) | 4 | 8 / 10 |
| 10 — PvP | 5 | 0 / 22 |
| 20 — PvP | 5 | 20 / 22 |
| 21 — PvP | 6 | 0 / 34 |
| 33 — PvP | 6 | 24 / 34 |
| 38 — PvP | 7 | 0 / 52 |
| 64 — PvP | 8 | 0 / 72 |
| 100 — PvP | 9 | maximum |

PAC normal human progression has the same arithmetic because start level, passive XP and thresholds match, subject to PAC special rules and its different match lifecycle.

The structural **SAVE / LEVEL / ROLL** triangle exists. Four gold buys four rerolls or one four-XP bundle; saving can earn up to five per round; leveling increases both capacity and rarity access. Passive XP reaches only level 6 by round 21 and level 7 by round 38, so timely 4/5-cost access requires purchased XP or unusually long survival. Whether the prices produce the right practical choice is **KEEP / MEASURE**, not decidable before P3.

## 11. Shop Odds / Shop Size

The complete active odds table is identical to PAC from levels 2 through 9. Shop size six and paid reroll cost one are also identical. This is coherent architecture and should be **KEPT**.

High costs unlock late: 4-cost begins at level 5 with 2%; 5-cost begins at level 7 with 1%, then 5% at level 8 and 10% at level 9. Passive level 7 arrives only at round 38. Thus high-cost reach is jointly determined by XP buying, shop odds, pool availability and P3 survival duration. Shop odds alone cannot be diagnosed as the cause of prior sparse 5-cost observations.

## 12. Shared Pool / Expansion Scaling

Current 30-unit pool structure:

| Cost | Definitions | Copies per unit | Total cost-band copies | Initial share of one definition within cost band |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 6 | 27 | 162 | 1/6 |
| 2 | 7 | 22 | 154 | 1/7 |
| 3 | 6 | 18 | 108 | 1/6 |
| 4 | 7 | 14 | 98 | 1/7 |
| 5 | 4 | 10 | 40 | 1/4 |

The architecture distinguishes two scaling effects:

- **Per-unit pool scaling:** keeping `27/22/18/14/10` constant preserves the absolute copies available for any unit and its contest ceiling.
- **Cost-band total-pool scaling:** adding `k` units to a band grows its total pool from `n × copies` to `(n+k) × copies`, while a specific unit's initial conditional shop share falls from `1/n` to `1/(n+k)`.

Therefore four-character expansions do not reduce copies of an existing unit, but they dilute the chance of finding that specific unit within its cost roll, complicate 3-star searches and increase connector/bench choices. This may counterbalance increased roster breadth, but suitability at 34/38/42+ units requires normalized measurement. Recommendation: keep per-unit counts explicit and constant for now; do not introduce dynamic normalization until definition-level acquisition and contention data show a coherent problem.

## 13. Bench / Star Progression

The eight-slot bench matches PAC and is coherent with automatic three-copy merges: a 3-star requires nine economic copies, but intermediate merges compress them to three 2-stars before the final merge. Deployed units also store progress, so eight slots do not need to hold nine loose copies.

Expansion increases the number of attractive connectors and contested lines, which can increase opportunity cost and bench pressure even though the cap stays fixed. Catalyst forms retain items on existing units rather than requiring additional bench capacity. Adaptive bots also sell only narrowly selected one-star replacements when full. Classification: **KEEP / MEASURE**; there is no coherent basis to increase the bench.

## 14. Battle Economy

Keep the approved **ADAPTED PORT**. During battle, Buy, Reroll, Lock and Buy XP remain legal; Sell and Move are bench-only, while the deployed combat snapshot remains immutable. P2 value changes would still flow through the same command validation and future persistent state.

Battle availability increases the time window for spending and permits pre-transition liquidation/interest choices. Its strategic frequency depends on P3 battle duration, so value tuning must wait; the architecture itself remains sound.

## 15. P2 vs P3 Dependency

| Finding | Classification | Reason |
| --- | --- | --- |
| Buy/sell formulas, interest formula, XP/reroll prices, odds table | **P2-INTRINSIC** | Defined directly by economy rules. |
| Pool reservation/return correctness | **P2-INTRINSIC** | Transactional state invariant independent of match duration. |
| Roster-expansion dilution | **P2-INTRINSIC structure; measurement P3-COUPLED** | Formula follows roster/pool design, realized acquisitions require lifetime opportunities. |
| Average level and max-level frequency | **P3-COUPLED** | Depend on rounds survived and spending opportunities. |
| Total income, interest earned and reroll count | **P3-COUPLED** | Depend on transition count and survival. |
| Streak payout distribution | **P3-COUPLED** | Depends on PvP cadence, draws, damage and elimination. |
| High-cost final-board reach | **P3-COUPLED** | Level/odds/pool interact with survival duration. |
| Bench pressure and 3-star timing | **P2/P3-COUPLED** | Copy search and capacity interact with available rounds/rolls. |

P3 must lock match cadence before economy values are tuned.

## 16. Bot Dependency

Later P1B recalibration is required if P2/P3 changes any denominator:

- `economyReserve` depends on income, interest thresholds, sell liquidity and action costs.
- `levelAggression` depends on XP price/amount, thresholds, board cap value and survival.
- `rerollAggression` depends on reroll price, odds, pool dilution and available preparations.
- purchase scoring depends on cost, copies, trait accessibility and expected upgrade timing.
- full-bench replacement depends on bench pressure, sell refund, cost curve and merge probability.

No bot parameter should change in this audit.

## 17. Server-Authoritative Scalability

Current helpers already support the desired direction. Commands carry serializable intent; trusted context identifies the actor; the domain validates gold, phase, capacity and level; `MatchState` owns RNG state, shared pool, shops, units, gold and XP. Shop rolling is deterministic and platform-neutral.

A future server can execute the same domain boundary while clients remain presentation/input surfaces. The server must own RNG and the shared pool, and must never accept client-derived gold or unit outcomes. No network, account or persistence layer is needed now.

## 18. Transactional Invariants

Classification: **NO DEFECT FOUND**.

- Shop roll removes exactly one available copy; purchase consumes the reserved offer without a second decrement.
- A failed affordability/capacity check leaves state unchanged.
- Three-copy merges change representation without changing pool totals.
- Sale returns `1/3/9` represented copies exactly once and removes the unit.
- Elimination records final crew, returns every represented owned copy plus every reserved shop offer, then clears ownership.
- Full automatic/manual refresh returns old offers before rolling replacements.
- Locked rollover preserves every non-empty reservation and consumes copies only for empty slots.
- Gold checks precede buy/reroll/XP deductions; no successful command creates negative gold.
- XP stops at level 9 and resets residual XP to zero at max level.

The final winner's pieces need not return after game-over because no further shop transaction exists.

## 19. Current Diagnostic Coverage

Already observable in committed reports:

- rounds and full-clock/paced duration;
- cost-band final-board presence/outcomes;
- preparation shop offers and empty slots by cost;
- remaining pool availability and zero-availability observations by cost;
- final-crew unit counts and 2-star-or-higher share.

Important gaps:

- gold distribution by round and at elimination;
- base, interest, streak and win income decomposition;
- spend by purchases, rerolls and XP;
- reroll and XP-purchase counts;
- level distribution by round and at elimination;
- 2-star/3-star acquisition timing and definition-level contention;
- sell count, star/value liquidated, pivot timing and interest thresholds crossed by sales;
- pool returns by sale/elimination/refresh and unused gold at death.

Do not add these metrics until a bounded measurement task after the participant model is normalized or intentionally specified.

## 20. PAC Port Classification

`DIRECT PORT` below means keep behavioral/value parity, not copy source code.

| PAC concept | Classification | Decision |
| --- | --- | --- |
| Shared finite pool | **ADAPTED PORT** | Keep deterministic cost-keyed authoritative state. |
| Rarity/cost shop odds | **ADAPTED PORT** | Keep identical L2–L9 values mapped to costs. |
| Locked automatic rollover | **ADAPTED PORT** | Existing retained-offer/empty-refill behavior is approved. |
| Manual reroll refresh | **ADAPTED PORT** | Keep full deterministic return-and-refresh. |
| Interest | **DIRECT PORT** | Keep normal +1/10 gold, cap 5 behavior. |
| Streak income | **ADAPTED PORT** | Keep local explicit win/loss counters; PvE/draw boundary differs. |
| PvP win income | **DIRECT PORT** | Keep +1. |
| XP purchase / passive XP / thresholds | **DIRECT PORT** | Keep 4→4, +2 and current threshold parity pending P3 measurement. |
| Starting level / gold | **DIRECT PORT** | Keep 2 / 5. |
| Shop size / reroll cost | **DIRECT PORT** | Keep 6 / 1. |
| Pool-copy counts | **ADAPTED PORT** | Keep PAC three-stage counts for universal local 3-star progression; do not port evolution exceptions. |
| Buy-price model | **DIRECT PORT** | Standard cost 1–5 parity fits local content. |
| Sell-price/refund model | **REFERENCE ONLY** | PAC demonstrates commitment pricing; exact formulas/exceptions are unsuitable without local evidence. |
| Bench-size philosophy | **DIRECT PORT** | Keep eight slots and level-based board cap. |
| PAC special modes/content exceptions | **REJECT** | They solve Pokémon-specific problems outside the local product. |

## 21. Architecture Decision

**Option 1 — keep current economy architecture.**

- Option 1 fits because the backbone is deterministic, transactional, server-portable and already aligned with useful PAC normal-mode behavior. Values remain a baseline, not permanently locked.
- Reject Option 2: broad PAC alignment would mostly reproduce existing values while importing irrelevant exceptions and infrastructure.
- Reject Option 3 for now: no economy structure is proven to require correction. Sell refund and pool scaling are explicit measurement watches, not authorized adaptations.
- No smaller Option 4 improves on retaining the existing plain domain.

Subsystem disposition:

| Subsystem | Decision |
| --- | --- |
| Income | **KEEP** |
| Interest | **KEEP / MEASURE** |
| Streaks | **KEEP / MEASURE** |
| XP | **KEEP / MEASURE** |
| Shop odds | **KEEP / MEASURE** |
| Shop size | **KEEP** |
| Reroll | **KEEP** |
| Shared pool | **KEEP** |
| Pool sizes | **KEEP / MEASURE** |
| Sell refund | **KEEP / MEASURE** |
| Bench | **KEEP / MEASURE** |
| Battle economy | **KEEP** |

The highest-value PAC lesson is that sell value is a commitment-control lever distinct from pool-copy return. It should become observable locally before any isolated adjustment is proposed.

High-priority decision answers:

1. Full refund is currently defensible but unusually forgiving: **WATCH / NEEDS MEASUREMENT**.
2. Interest creates a meaningful structural incentive at every 10 gold through 50; realized saving behavior is unmeasured.
3. XP creates a meaningful level-versus-roll choice because four gold buys either four rerolls or four XP, while level adds capacity and rarity access.
4. Current pool sizes are structurally suitable at 30 units; expansion suitability is **KEEP / MEASURE**, not established for 34/38/42+.
5. High-cost access is **P2/P3-COUPLED**, not principally an odds-only problem.
6. Six-slot shops and the odds curve are coherent, but fit to target match length is P3-coupled.
7. Reserve, level/reroll aggression, purchase scoring and bench replacement are the bot decisions most exposed to changed values.
8. No clear transactional economy defect was found.
9. PAC's highest-value new lesson is separating pool-copy return from sell-value commitment.
10. The sole next task is the P3 PAC-first Match Flow / Pacing audit.

## 22. Roadmap Consequence

1. P2 economy/progression architecture audit — complete; keep architecture and defer tuning.
2. P3 PAC-first Match Flow / Pacing research and architecture audit.
3. P1B adaptive bot recalibration only if still needed after P2/P3.
4. P4 Items / Treasure / Form Accessibility audit.
5. Normalize or intentionally specify the production-soak participant population before any new authoritative baseline.
6. Add only necessary economy diagnostics; establish a clean baseline if required.
7. If evidence supports it, implement exactly one bounded economy change and measure once against the correct baseline.
8. New broad production baseline, then unit-level balance.

Smoker remains frozen as a watch item. No Smoker diagnostic is reactivated.

## 23. Exactly One Next Task

**P3 — PAC-first Match Flow / Pacing research and architecture audit.** Inspect only targeted pinned PAC stage cadence, preparation/battle timing, PvE/PvP schedule, damage/elimination and match-length behavior; classify ports and lock architecture without implementing P3 or running a simulation.

The known soak-population defect remains a mandatory pre-measurement gate, but it does not block this research-only P3 task.
