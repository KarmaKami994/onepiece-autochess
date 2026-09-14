# P13 Final Production Baseline

P13 records the production state immediately before P1B bot tuning. It changes no gameplay, bot policy, content, save format, simulation, or analytics harness. Exactly one official 50-seed production-soak run was executed on the clean `task/p13-final-production-baseline` branch from the specified base; no 1,000-seed run or second aggregate baseline was performed.

## Reproducibility and hard gates

| Provenance / gate | Recorded value | Result |
| --- | --- | --- |
| Measurement Git SHA | `b2bada40ab52488423425bb4fda1abb851717fa9` | Exact requested base |
| GameContent / save schema | `1.31.0` / `6` | Match |
| Content hash / config hash | `a6d7c074` / `977295da` | Recorded from harness; canonical short hashes, not SHA-256 |
| Seeds | `production-0` through `production-49`, 50 total | Exact range |
| Completed matches / crashes | 50/50 / 0 | PASS |
| Deterministic/state invariant failures | None reported; the harness completed without a thrown seed or transition/placement error | PASS |
| Raw report | [`analysis/p13-final-production-baseline-50.json`](analysis/p13-final-production-baseline-50.json) | Preserved unchanged |
| Raw report SHA-256 | `8d02ba30bdf2030da2b4adc5b4715b179269ffd039e443ddfd2f10688246db84` | Recorded |
| Node version | `v24.3.0` | Recorded |

Command, once: `node node_modules/tsx/dist/cli.mjs scripts/run_production_soak.ts --seeds=50 --out=docs/analysis/p13-final-production-baseline-50.json`. The harness assigns all eight players to the existing seven bot personalities with its rotating duplicate, then uses normal production content and phase advancement. A successful run is evidence that these 50 seeds completed without a harness-detected failure, not a proof over all possible seeds. The report's `generatedAt` is the run timestamp; the report SHA-256 covers its exact bytes. No source file changed before measurement.

## Match length, damage, and stage reach

| Metric | Result |
| --- | ---: |
| Rounds, min / max / average | 34 / 47 / 40.06 |
| Average paced / full-clock duration | 24.926 / 34.941 min |
| Battles | 7,982 |
| Timeouts / battles | 19 / 7,982 (0.2380%) |
| Draws / battles | 1 / 7,982 (0.0125%) |
| Captain-damage events / total damage | 4,387 / 39,215 |
| Captain damage, mean / p50 / p90 / p95 / maximum single loss | 8.939 / 9 / 14 / 15 / 19 |
| First elimination round, min / median / mean / max | 22 / 25 / 24.4 / 27 |

Of the damage events, 4,258 were PvP (37,545 damage), 129 were ghost (1,670), and none were PvE. The tracked stage-reach metric requires at least two living players upon entering the stage, before it resolves:

| Stage | Matches reached |
| ---: | ---: |
| 22, 24, 27, 28, 32, 34 | 50/50 each |
| 36 | 47/50 (94%) |
| 40 | 25/50 (50%) |

Paced duration caps ordinary preparation at 15 seconds for estimation; full-clock uses the configured preparation timers. Both use measured battle ticks and carousel durations. The existing 20–30-minute report target is evaluated against **full-clock**, so its false result is a pacing signal, not a completion failure.

## Character presence and cost bands

The harness observes each player's **last deployed final board**, not bench ownership. `n` is the number of final boards containing the definition; Top 4 and win percentages are conditional on that presence. The brackets are the harness's 95% Wilson intervals for those conditional board rates. The delta column is Top 4 / win percentage points against the aggregate of the **same cost band**, which includes the character itself. Winner presence is wins divided by the 50 winning boards. These observations share games, opponents, pools, and compositions; intervals do not remove selection bias or make unit effects causal.

| Cost | Final boards | Share of all 2,477 presences | Player boards with cost | Top 4 | Win | Mean placement |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 701 | 28.3% | 371/400 (92.8%) | 41.9% | 9.0% | 4.88 |
| 2 | 710 | 28.7% | 368/400 (92.0%) | 46.1% | 10.6% | 4.70 |
| 3 | 509 | 20.5% | 323/400 (80.8%) | 59.5% | 15.7% | 4.00 |
| 4 | 429 | 17.3% | 259/400 (64.8%) | 68.5% | 19.1% | 3.59 |
| 5 | 128 | 5.2% | 102/400 (25.5%) | 88.3% | 46.9% | 2.30 |

| Cost | Character | n | Top 4 | Wins | Top 4 rate [95% CI] | Win rate [95% CI] | Δ vs cost band, Top 4 / win | Winner presence |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | Chopper | 108 | 54 | 15 | 50.0% [40.7–59.3] | 13.9% [8.6–21.7] | +8.1 / +4.9 pp | 30% |
| 1 | Koala | 96 | 41 | 6 | 42.7% [33.3–52.7] | 6.2% [2.9–13.0] | +0.8 / −2.7 pp | 12% |
| 1 | Koby | 94 | 40 | 7 | 42.6% [33.0–52.6] | 7.4% [3.7–14.6] | +0.6 / −1.5 pp | 14% |
| 1 | Nami | 164 | 54 | 8 | 32.9% [26.2–40.4] | 4.9% [2.5–9.3] | −9.0 / −4.1 pp | 16% |
| 1 | Tashigi | 98 | 42 | 8 | 42.9% [33.5–52.7] | 8.2% [4.2–15.3] | +0.9 / −0.8 pp | 16% |
| 1 | Usopp | 141 | 63 | 19 | 44.7% [36.7–52.9] | 13.5% [8.8–20.1] | +2.7 / +4.5 pp | 38% |
| 2 | Brook | 86 | 40 | 12 | 46.5% [36.3–57.0] | 14.0% [8.2–22.8] | +0.5 / +3.4 pp | 24% |
| 2 | Franky | 94 | 55 | 19 | 58.5% [48.4–67.9] | 20.2% [13.3–29.4] | +12.5 / +9.6 pp | 38% |
| 2 | Ivankov | 92 | 36 | 8 | 39.1% [29.8–49.3] | 8.7% [4.5–16.2] | −6.9 / −1.9 pp | 16% |
| 2 | Killer | 49 | 33 | 13 | 67.3% [53.4–78.8] | 26.5% [16.2–40.3] | +21.3 / +16.0 pp | 26% |
| 2 | Robin | 153 | 62 | 7 | 40.5% [33.1–48.4] | 4.6% [2.2–9.1] | −5.5 / −6.0 pp | 14% |
| 2 | Sabo | 87 | 38 | 2 | 43.7% [33.7–54.1] | 2.3% [0.6–8.0] | −2.4 / −8.3 pp | 4% |
| 2 | Sanji | 94 | 39 | 5 | 41.5% [32.1–51.6] | 5.3% [2.3–11.9] | −4.6 / −5.2 pp | 10% |
| 2 | Smoker | 55 | 24 | 9 | 43.6% [31.4–56.7] | 16.4% [8.9–28.3] | −2.4 / +5.8 pp | 18% |
| 3 | Buggy | 32 | 18 | 1 | 56.2% [39.3–71.8] | 3.1% [0.6–15.7] | −3.3 / −12.6 pp | 2% |
| 3 | Crocodile | 98 | 58 | 13 | 59.2% [49.3–68.4] | 13.3% [7.9–21.4] | −0.3 / −2.5 pp | 26% |
| 3 | Jinbe | 111 | 65 | 22 | 58.6% [49.3–67.3] | 19.8% [13.5–28.2] | −1.0 / +4.1 pp | 44% |
| 3 | Kid | 48 | 32 | 8 | 66.7% [52.5–78.3] | 16.7% [8.7–29.6] | +7.1 / +0.9 pp | 16% |
| 3 | Kuma | 86 | 52 | 14 | 60.5% [49.9–70.1] | 16.3% [10.0–25.5] | +0.9 / +0.6 pp | 28% |
| 3 | Luffy | 26 | 19 | 5 | 73.1% [53.9–86.3] | 19.2% [8.5–37.9] | +13.5 / +3.5 pp | 10% |
| 3 | Zoro | 108 | 59 | 17 | 54.6% [45.2–63.7] | 15.7% [10.1–23.8] | −4.9 / 0.0 pp | 34% |
| 4 | Ace | 51 | 33 | 5 | 64.7% [51.0–76.4] | 9.8% [4.3–21.0] | −3.8 / −9.3 pp | 10% |
| 4 | Akainu | 66 | 44 | 11 | 66.7% [54.7–76.8] | 16.7% [9.6–27.4] | −1.9 / −2.4 pp | 22% |
| 4 | Capone Bege | 59 | 40 | 14 | 67.8% [55.1–78.3] | 23.7% [14.7–36.0] | −0.7 / +4.6 pp | 28% |
| 4 | Doflamingo | 46 | 31 | 9 | 67.4% [53.0–79.1] | 19.6% [10.7–33.2] | −1.1 / +0.5 pp | 18% |
| 4 | Hancock | 42 | 31 | 9 | 73.8% [58.9–84.7] | 21.4% [11.7–35.9] | +5.3 / +2.3 pp | 18% |
| 4 | Kizaru | 48 | 35 | 14 | 72.9% [59.0–83.4] | 29.2% [18.2–43.2] | +4.4 / +10.1 pp | 28% |
| 4 | Kuzan | 72 | 47 | 12 | 65.3% [53.8–75.2] | 16.7% [9.8–26.9] | −3.3 / −2.4 pp | 24% |
| 4 | Law | 45 | 33 | 8 | 73.3% [59.0–84.0] | 17.8% [9.3–31.3] | +4.8 / −1.3 pp | 16% |
| 5 | Blackbeard | 28 | 22 | 9 | 78.6% [60.5–89.8] | 32.1% [17.9–50.7] | −9.7 / −14.7 pp | 18% |
| 5 | Garp | 36 | 32 | 13 | 88.9% [74.7–95.6] | 36.1% [22.5–52.4] | +0.6 / −10.8 pp | 26% |
| 5 | Mihawk | 26 | 23 | 15 | 88.5% [71.0–96.0] | 57.7% [38.9–74.5] | +0.2 / +10.8 pp | 30% |
| 5 | Shanks | 18 | 18 | 10 | 100.0% [82.4–100.0] | 55.6% [33.7–75.4] | +11.7 / +8.7 pp | 20% |
| 5 | Whitebeard | 20 | 18 | 13 | 90.0% [69.9–97.2] | 65.0% [43.3–81.9] | +1.7 / +18.1 pp | 26% |

Nami (164 boards, −9.0 pp Top 4) and Robin (153, −6.0 pp conditional wins) are frequent-presence negative signals; Sabo had only two wins in 87 boards. Franky and Killer have positive conditional signals, but Killer's 49 boards and the much smaller 5-cost samples produce wide intervals. A character on a winning board is not necessarily the reason the board won. No isolated unit or item balance change follows from this sample.

## Shop and shared-pool availability

There were 1,903 preparation snapshots, 73,446 shop slots, and **zero empty slots**. The cost-specific shop rates below use only preparations where that cost had nonzero level odds; zero-pool rates are over all observed definitions at preparation, not over eligible shop slots.

| Cost | Shop offers / eligible slots | Preparations with offer | Mean available copies / definition | Zero-copy observations | Final crew instances (2★+) |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 22,614 / 73,446 (30.79%) | 9,275 / 12,241 (75.77%) | 8.74 | 1,287 / 11,418 (11.27%) | 2,012 (1,913) |
| 2 | 24,740 / 71,046 (34.82%) | 10,818 / 11,841 (91.36%) | 13.46 | 11 / 15,224 (0.07%) | 1,501 (1,218) |
| 3 | 17,971 / 63,846 (28.15%) | 8,743 / 10,641 (82.16%) | 12.88 | 6 / 13,321 (0.05%) | 1,120 (731) |
| 4 | 6,967 / 53,412 (13.04%) | 4,555 / 8,902 (51.17%) | 11.78 | 0 / 15,224 | 1,220 (501) |
| 5 | 1,154 / 32,562 (3.54%) | 1,016 / 5,427 (18.72%) | 9.31 | 0 / 9,515 | 528 (109) |

The high-cost shop-offer rate is low while observed 5-cost definitions were never fully depleted. This alone cannot distinguish level odds, timing, purchases, P11 recruitment, or bot policy; it is an access-path diagnostic for P1B, not a pool defect.

## Traits and tiers

Across 12,241 player battle-board observations, all 13 traits and every defined tier appeared at least once. The table records **matches reaching** each tier, not exclusive end-of-match tier ownership; the raw report also holds board activations and rates.

| Trait | Any activation, boards | Matches with trait | Tier reach, matches (threshold) |
| --- | ---: | ---: | --- |
| Straw Hat | 8,623 (70.44%) | 50/50 | T1 50 (2), T2 50 (4), T3 27 (6) |
| Navy | 3,450 (28.18%) | 50/50 | T1 50 (2), T2 46 (3) |
| Warlord | 704 (5.75%) | 43/50 | T1 43 (2), T2 9 (4) |
| Supernova | 1,335 (10.91%) | 48/50 | T1 48 (2), T2 19 (4) |
| Brotherhood | 527 (4.31%) | 33/50 | T1 33 (2), T2 4 (3) |
| Revolutionary | 8,244 (67.35%) | 50/50 | T1 50 (1), T2 50 (2) |
| Emperor | 1,130 (9.23%) | 44/50 | T1 44 (1), T2 10 (2) |
| Captain | 1,012 (8.27%) | 49/50 | T1 49 (2), T2 25 (3) |
| Brawler | 3,799 (31.04%) | 50/50 | T1 50 (2), T2 36 (4) |
| Swordsman | 2,277 (18.60%) | 50/50 | T1 50 (2), T2 41 (3) |
| Marksman | 1,625 (13.28%) | 50/50 | T1 50 (2), T2 28 (3) |
| Specialist | 3,961 (32.36%) | 50/50 | T1 50 (2), T2 41 (4) |
| Guardian | 3,189 (26.05%) | 50/50 | T1 50 (2), T2 49 (3) |

The Emperor + Captain combination activated on 450 boards (3.68%) and reached 33/50 matches. Low Brotherhood/Warlord upper-tier reach is an observation, not proof that those compositions are unreachable or underpowered.

## Items, economy, and forms

Across 400 participant-player matches the harness counted 5,200 component and 2,067 completed-item acquisitions: **13.000 / 5.168 / 18.168** component / completed / total acquisitions per participant. For the 50 surviving winners, total acquisitions averaged 21.44. Acquisition is measured from inventory deltas at reward transitions; a crafted or equipped item is not counted as a new source acquisition.

| Reward source | Components | Completed | Total | Per participant |
| --- | ---: | ---: | ---: | ---: |
| PvE automatic | 2,000 | 168 | 2,168 | 5.420 |
| PvE choice | 800 | 999 | 1,799 | 4.498 |
| Supply choice | 1,200 | 0 | 1,200 | 3.000 |
| Carousel | 1,200 | 900 | 2,100 | 5.250 |

`itemUsage` is a count of item instances **held by final crews**, not a purchase rate or a per-battle effect count: 4,876 instances over 65/65 item IDs with nonzero usage. Highest counts were Energy-Siphon Scope 270, Den Den Mushi 234, Sea Prism Boots 220, Observation Haki Mantle 190, Flame-Flame Grimoire 188, Shark Tooth Charm 187, Black Blade 172, Lucky Pirate Ribbon 157, Cola Engine 149, and Cola Reservoir 146. Sea Prism Stone had only three final-crew instances. The complete per-item counts are in the raw report; these totals alone cannot diagnose effectiveness or bot preference independent of recipe/access.

| Form | Reach / expression | Final-board signal |
| --- | --- | --- |
| Robin Demonio Fleur | 15/50 matches; 124 persistent-form battle-start appearances | 15 boards, 9 Top 4, 1 win; all 15 were 3★ Robin; zero non-Demonio 3★ Robin (invariant holds) |
| Luffy Gear 4 Boundman / Snakeman | 0/50 matches, zero battle-start appearances each | Zero; only four 3★ Luffy final boards, all base form |
| Chopper Monster Point | 50/50 matches; 2,096 temporary transforms; 76.19% of 2,751 eligible combatants transformed | 1,742 transformed player battle boards; no persistent final-board form is expected |

Gear 4's zero in this **small** sample does not prove impossibility; the catalyst/3★ conjunction and bot item/retention path warrant a separately scoped diagnostic before any P1B policy change.

## Combat-readability counters

The report observed 3,452 PvP battles: 47,293 casts (13.70/battle), 80,548 cast targets (23.33/battle), 15,500 multi-target casts (4.49/battle), and 4,012 ability-hit events (1.16/battle). There were 18,471 stuns, 6,443 burns, 672 emergency shields (7.41 status applications/battle); 4,706 lunges, 20,673 knockbacks, 3,060 pulls (8.24 displacements/battle); and 13,568 Energy-drain events (3.93/battle, 54.29 Energy drained/battle). The aggregate defined control-event density is 17.52/battle. Global-ability casts were 4,378 (1.27/battle) and Defense-Pierce casts 2,252 (0.65/battle). These are event-volume/readability-pressure counters, not a visual usability test or a reason to change combat in P13.

## Interpretation and P1B handoff

**Correctness/stability:** The four hard gates passed: exact base/content/schema provenance, 50/50 completed matches, zero crashes, and no detected deterministic/state invariant failure. All 13 traits and their tiers occurred and shops never had empty slots. This is bounded 50-seed evidence, not exhaustive correctness or a new 1,000-seed authority.

**Directional balance/pacing signals:** The report's existing `targets` booleans are `matchLength20To30Minutes: false` (34.941 full-clock minutes), `noCharacterAbove65PercentOfWinningBoards: true` (maximum observed winner presence: Jinbe 44%), and `everyTraitReached: true`. The 24.926-minute paced estimate is inside 20–30 minutes; neither estimate is observed human play time. Character conditional outcomes, upper-tier reach, item holdings and form rarity are association-heavy with broad/small-sample CIs, especially at cost 5. Do not infer a unit/item nerf or buff from 50 seeds.

**Evidence-backed P1B investigation candidates, not tuning decisions:**

1. Inspect round-by-round bot deployment and replacement decisions for frequent lower-cost holdovers: Nami (164 boards, −9.0 pp Top 4 versus cost 1) and Robin (153 boards, −6.0 pp conditional wins versus cost 2) are present often despite negative same-band associations. Distinguish intentional synergy/economy from retention errors before changing weights.
2. Trace bot level, savings, reroll and recruitment choices against high-cost access: 5-cost offers filled only 1,154/32,562 eligible shop slots, 5-cost units appeared on 102/400 final player boards, yet zero observed 5-cost definitions were pool-empty. This motivates policy diagnostics, not a new shop/pool rule or a claim that bots are wrong.
3. If P1B includes item/catalyst valuation, instrument the four observed 3★ Luffy final boards and their item paths before judging zero Gear 4 transitions. The sample is too small to rank a catalyst adjustment.

P13 performs none of those investigations or changes. Standard PR CI remains the merge gate; no gameplay, bot weights, economy, stages, RNG, content version, or save schema changed.
