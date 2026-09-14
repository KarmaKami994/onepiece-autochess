# P1B — Adaptive Bot Progression Tuning

P1B changes only the adaptive bot's deterministic preparation spending policy. The [pinned PAC bot implementation](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/bot.ts) advances authored teams by stage rather than playing this game's real shared-pool shop and economy. **DIRECT:** none. **ADAPTED:** round-aware strength progression becomes local level targets, with every action still going through `applyCommand`. **REFERENCE ONLY:** PAC power curves, category scores, Elo and legality budgets. **REJECTED:** scripted board replacement and Mongo/Firebase/Colyseus/community infrastructure. No PAC bot value or infrastructure was imported.

## Exact local policy

After the unchanged initial shop-buy pass, the bot computes `clamp(2 + floor(round / 5), startLevel, maxLevel)`. Personalities with `levelAggression >= 0.75` target one additional level, capped at `maxLevel`. The normal targets are L2 at R1–4, L3 at R5–9, L4 at R10–14, L5 at R15–19, L6 at R20–24, L7 at R25–29, L8 at R30–34 and L9 at R35 onward. The XP-action budget per preparation is `min(5, max(1, ceil(levelAggression * 5)))`; the existing reroll budget remains exactly `min(3, floor(rerollAggression * 4))`.

One loop is bounded by the sum of those budgets. Below target, legal XP has priority while respecting the existing reserve and roster-size guard. A roster deficit may consume an existing-budget reroll and buy pass, then attempt XP catch-up in the same preparation. If XP is unaffordable without breaching reserve, or its action budget is exhausted, below-target rerolls stop. At target, remaining rerolls retain their existing behavior. Purchases, XP, rerolls, sales and moves remain authoritative commands; no new RNG source or hidden bot state was added. Unit/instance scoring, formation, item equipment, voyage recruitment scoring, economy and game content values other than the required version remain unchanged. GameContent is `1.32.0`; save schema is `6`.

## Exact same-seed PRE → POST measurement

PRE is the unchanged [P13 raw report](analysis/p13-final-production-baseline-50.json), SHA-256 `8d02ba30bdf2030da2b4adc5b4715b179269ffd039e443ddfd2f10688246db84`, measured on `b2bada40ab52488423425bb4fda1abb851717fa9` / GameContent `1.31.0` / content hash `a6d7c074`. POST is the single [P1B raw report](analysis/p1b-post-bot-tuning-50.json), SHA-256 `289dd6ae10a0b1bebfae5b2830e94d025bfde5eecd71ac9340858a555a643855`, measured from clean implementation commit `3420a0ff2c723d53d8994974568d4cfcd0d32f6b` / GameContent `1.32.0` / content hash `556bb345`. Both use schema `6`, config hash `977295da`, the same production harness and seeds `production-0` through `production-49`. The subsequent documentation commit does not change measured code or content. No PRE rerun, second POST candidate, 1,000-seed soak or new authoritative broad baseline was made.

| Metric | P13 PRE | P1B POST |
| --- | ---: | ---: |
| Complete / crashes | 50/50 / 0 | 50/50 / 0 |
| Rounds min / mean / max | 34 / 40.06 / 47 | 37 / 40.74 / 47 |
| Average paced / full-clock minutes | 24.926 / 34.941 | 25.511 / 35.696 |
| Battle timeout / draw rate | 0.238% / 0.013% | 0.136% / 0.198% |
| Captain damage p50 / p90 / p95 | 9 / 14 / 15 | 9 / 14 / 15 |
| Mean first-elimination round | 24.40 | 24.48 |
| Stage 36 / 40 reach | 47/50 / 25/50 | 50/50 / 29/50 |
| Cost-4 / cost-5 final-board presence | 429 / 128 | 274 / 68 |
| Player final boards with cost-4 / cost-5 | 259/400 / 102/400 | 178/400 / 54/400 |
| Cost-4 / cost-5 shop offers per eligible slot | 13.04% / 3.54% | 8.92% / 3.28% |
| Cost-4 / cost-5 zero-available pool-definition rate | 0% / 0% | 0% / 0% |
| All traits activated | 13/13 | 13/13 |
| Final-crew item instances / item IDs represented | 4,876 / 65 | 4,902 / 65 |
| Components / completed items acquired per player | 13.000 / 5.168 | 13.000 / 5.243 |

Cost-band final-board **shares** moved from 28.3/28.7/20.5/17.3/5.2% (cost 1–5) to 32.8/31.6/20.9/11.8/2.9%. Cost-4/5 eligible shop-slot counts were 53,412/32,562 PRE and 52,602/18,300 POST; observed offers were 6,967/1,154 and 4,693/600 respectively. Thus the intended high-cost access improvement did **not** appear in this sample. The reduced 5-cost eligibility and final-board representation are material review risks, despite unchanged high-cost pool availability. The report does not record every intermediate level/roster decision, so it cannot isolate the cause; the preserved roster guard and below-target reroll suppression are plausible hypotheses, not demonstrated explanations. No second tuning iteration was made.

All 13 traits activated in both runs, but selected upper tiers became less frequent: Emperor tier 2 reached 10→3 matches, Brotherhood tier 2 4→1, Warlord tier 2 9→5, and Straw Hat tier 3 27→23. Component acquisition stayed at 13/player; completed items were 5.168→5.243/player. These are exposure counts, not effect-strength comparisons. PvP casts and defined control events per battle were 13.70→12.38 and 17.52→14.53 respectively; no readability behavior or metric definition changed.

Nami appeared on 164→180 final boards, with 54→62 Top-4 boards and 8→14 winning boards. Her conditional Top-4 rate was 32.9% [26.2–40.4]→34.4% [27.9–41.6], and conditional win rate 4.9% [2.5–9.3]→7.8% [4.7–12.6]. Robin appeared on 153→157 boards, with 62→61 Top-4 and 7→13 winning boards; her conditional Top-4 rate was 40.5% [33.1–48.4]→38.9% [31.6–46.7], and conditional win rate 4.6% [2.2–9.1]→8.3% [4.9–13.7]. Brackets are the harness's 95% Wilson intervals. These are observations of selected boards, not evidence to target either character or change their values.

## Gates and interpretation

**PASS:** 50/50 complete, zero crashes, no harness-reported deterministic/state invariant failure, and paced estimate 25.511 minutes within 20–30. Existing report targets remain `matchLength20To30Minutes: false`, `noCharacterAbove65PercentOfWinningBoards: true`, `everyTraitReached: true`. The first target uses **full-clock** minutes and was already false at P13; it is explicitly not a P1B hard gate. The other two are true. The sample is directional and composition-, survivor- and shared-pool-confounded, not proof of unit/item balance or causal bot-policy effect. In particular, the lower high-cost access signal requires review before calling P1B's design goal achieved. Smoker remains frozen/watch. No unit, item, trait, combat, economy, shop-odds, pool, captain-damage or save-schema tuning followed from POST.
