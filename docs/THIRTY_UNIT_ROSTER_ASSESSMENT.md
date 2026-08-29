# 30-Unit Roster & Combat Baseline Assessment

## Executive Summary

- **The production path is crash-stable but materially more timeout-prone.** The single final run completed 1,000/1,000 deterministic matches with zero crashes. Average rounds fell from 34.97 to 33.56, but full-clock length rose from 32.22 to 33.59 minutes and timeout rate rose from 0.126% to 1.175% (9.3×). Draw rate improved from 0.064% to 0.030%.
- **Smoker is the clearest positive same-cost signal; Luffy remains positive.** Smoker recorded 65.8% top-four, 21.7% conditional wins, and 3.64 placement across 1,586 final-board observations: +16.8 and +9.8 percentage points versus the 2-cost band. Luffy remains +14.5 pp top-four and +10.3 pp wins versus 3-cost peers, but appears on only 606 final boards.
- **The old Sabo and Ace alarms do not persist.** Sabo is now close to the 2-cost band (+0.8 pp top-four, +1.5 pp wins), and Ace is close to the 4-cost band (+2.1 pp top-four, -0.2 pp wins) with winner-board presence down from 68.1% to 17.9%. Nami and Robin remain credible negatives; Crocodile and Ivankov add new coherent negative signals.
- **High-cost deployment is scarce, but the shared pool is not exhausted.** Costs 4 and 5 account for 9.53% and 1.20% of final-board definition observations, down from 23.98% and 2.35%. However, neither tier had a zero-copy definition at any of 33,557 preparation snapshots, all 1,284,348 observed shop slots were filled, and average available copies remained 12.68/14 and 9.76/10. The evidence points to level odds, late access, roster variety, bot choice, and survival selection—not physical pool depletion.
- **Emperor is technically reachable but effectively absent.** It activated on 28 player battle-boards in only 4/1,000 matches (0.4%); Emperor + Captain has the same reach. Captain alone appeared in 34.8% of matches.
- **Combat noise shifted rather than disappearing.** Casts rose 26.7% and displacements rose 33.4% per PvP battle, while the defined control-density indicator stayed nearly flat at 19.60 events per battle. Knockback more than doubled, Energy Drain remained frequent at 3.66 events per battle without caster attribution, and 0.168 Defense Pierce casts per battle still have no dedicated cue.
- **Recommended next bounded task:** run an isolated Smoker balance pass that changes one ability-impact lever only, then rerun the same diagnostics. Do not combine it with Luffy, Emperor, timeout, or readability changes.

## Scope, Data, and Metric Definitions

This assessment uses exactly one 1,000-seed production run (`production-0` through `production-999`) from diagnostic source Git SHA `538c9fa2901c450f46d8df370cad1e1d02367133`. Content is `1.11.0`, save schema is `6`, content hash is `c59a272a`, and configuration hash is `977295da`. The exact generated snapshot is [`analysis/30-unit-roster-assessment-1000.json`](analysis/30-unit-roster-assessment-1000.json); its SHA-256 is `24D7624B1008B67D837E06CA920CF4123DF0317711FAF9D69FD43BC2C05C0D72`.

A **final-board observation** is one unique roster definition on a player's last deployed board. Duplicate copies of one definition count once. **Final-board presence** divides those observations by 8,000 final player boards. **Top-four rate** and **conditional win rate** use final boards containing the unit as their denominator. **Winner-board presence** divides winning-board observations by 1,000 matches. Same-cost deltas compare a unit with the weighted aggregate for its cost tier; negative placement deltas are better.

Uncertainty for top-four and conditional-win rates uses the existing dependency-free 95% Wilson interval (`z = 1.96`). Tables are used instead of charts because this is one cross-sectional snapshot and exact peer lookup across 30 units, five costs, and confidence intervals is the primary review need.

Trait activation is measured once per alive player battle-board and uses the domain's unique deployed-definition counting. Match reach records whether a trait activated at least once anywhere in a match. Shop offers are observed at the start of preparation, after automatic refresh and before bot turns; pool observations record each definition's remaining shared copies at the same point.

## Simulation Health: Completion Holds, Timeouts Regress

| Metric | 30-unit result | 18-unit baseline | Change | Assessment |
| --- | ---: | ---: | ---: | --- |
| Completed matches | 1,000 / 1,000 | 1,000 / 1,000 | 0 | Stable |
| Crashes | 0 | 0 | 0 | Stable |
| Average rounds | 33.56 (26–47) | 34.97 (27–51) | -1.41 | Shorter by rounds |
| Full-clock minutes | 33.59 | 32.22 | +1.37 | Further above 20–30 minute target |
| Paced minutes | 24.03 | 22.31 | +1.72 | Higher, still diagnostic-only |
| Total battles | 133,841 | 138,068 | -4,227 | Consistent with fewer rounds |
| Timeout rate | 1.175% | 0.126% | +1.049 pp / 9.3× | Material regression |
| Draw rate | 0.030% | 0.064% | -0.034 pp | Improvement |

The system completes every requested seed and has fewer rounds and draws, but the longer clocks and timeout increase are not explained by match count alone. This report does not infer a cause: roster composition, durability, positioning, ability cadence, and survival selection all changed between baselines. The timeout regression is a real follow-up risk, not evidence to increase `combatMaxTicks`.

## Character Findings: Smoker Replaces Sabo as the Clearest Positive Signal

Smoker has the largest coherent positive same-cost profile with a substantial sample: +16.8 pp top-four, +9.8 pp conditional wins, and 0.89 better placement across 1,586 observations. His combat expression includes 2.08 casts per battle-board appearance and 42,573 successful knockbacks, so the signal is compatible with repeatable line damage/displacement impact, but it does not prove that the ability alone causes the outcome.

Luffy remains strongly positive (+14.5 pp top-four, +10.3 pp wins, 0.75 better placement) but is much scarcer at 606 observations. Tashigi is a strong top-four/placement signal; Franky, Koby, Chopper, and Kuma are smaller coherent positives. No unit appears on more than 65% of winner boards; Jinbe is highest at 52.8%, driven partly by 2,503 final-board appearances.

Nami, Robin, Crocodile, and Ivankov are the clearest coherent negatives. Doflamingo is also below the 4-cost band, but his 458 observations make the estimate more sample-sensitive. Zoro is mildly negative; Kid is mixed rather than coherently weak because top-four is +1.3 pp while wins are -4.6 pp.

| Unit | Cost | Final boards (% players) | Top 4 (95% CI) | Δ vs cost | Win (95% CI) | Δ vs cost | Avg placement (Δ) | Winner boards |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| chopper | 1 | 2,439 (30.5%) | 50.6% (48.6–52.6%) | +6.1 pp | 15.6% (14.2–17.1%) | +5.1 pp | 4.44 (-0.37) | 38.0% |
| koala | 1 | 1,823 (22.8%) | 43.6% (41.3–45.8%) | -1.0 pp | 8.8% (7.6–10.2%) | -1.7 pp | 4.84 (+0.03) | 16.0% |
| koby | 1 | 1,754 (21.9%) | 51.3% (48.9–53.6%) | +6.7 pp | 14.4% (12.8–16.1%) | +3.9 pp | 4.44 (-0.37) | 25.2% |
| nami | 1 | 3,140 (39.3%) | 33.5% (31.9–35.2%) | -11.0 pp | 5.5% (4.7–6.3%) | -5.0 pp | 5.44 (+0.62) | 17.2% |
| tashigi | 1 | 2,291 (28.6%) | 56.4% (54.3–58.4%) | +11.8 pp | 14.0% (12.6–15.4%) | +3.5 pp | 4.21 (-0.60) | 32.0% |
| usopp | 1 | 2,999 (37.5%) | 38.6% (36.9–40.4%) | -5.9 pp | 7.5% (6.6–8.5%) | -2.9 pp | 5.12 (+0.31) | 22.6% |
| brook | 2 | 2,239 (28.0%) | 52.8% (50.8–54.9%) | +3.8 pp | 11.7% (10.5–13.1%) | -0.2 pp | 4.40 (-0.13) | 26.3% |
| franky | 2 | 2,367 (29.6%) | 57.3% (55.3–59.3%) | +8.3 pp | 16.6% (15.2–18.2%) | +4.7 pp | 4.08 (-0.45) | 39.3% |
| ivankov | 2 | 2,068 (25.9%) | 39.0% (36.9–41.1%) | -10.0 pp | 8.2% (7.1–9.5%) | -3.7 pp | 4.99 (+0.46) | 17.0% |
| robin | 2 | 3,260 (40.8%) | 39.2% (37.6–40.9%) | -9.8 pp | 6.6% (5.8–7.5%) | -5.3 pp | 5.07 (+0.54) | 21.4% |
| sabo | 2 | 2,080 (26.0%) | 49.9% (47.7–52.0%) | +0.8 pp | 13.4% (12.0–14.9%) | +1.5 pp | 4.43 (-0.10) | 27.8% |
| sanji | 2 | 2,266 (28.3%) | 47.2% (45.2–49.3%) | -1.8 pp | 10.1% (8.9–11.4%) | -1.9 pp | 4.64 (+0.11) | 22.8% |
| smoker | 2 | 1,586 (19.8%) | 65.8% (63.5–68.1%) | +16.8 pp | 21.7% (19.7–23.8%) | +9.8 pp | 3.64 (-0.89) | 34.4% |
| crocodile | 3 | 1,858 (23.2%) | 49.5% (47.2–51.7%) | -13.7 pp | 10.9% (9.6–12.4%) | -6.7 pp | 4.49 (+0.68) | 20.3% |
| jinbe | 3 | 2,503 (31.3%) | 66.5% (64.6–68.3%) | +3.3 pp | 21.1% (19.5–22.7%) | +3.5 pp | 3.59 (-0.21) | 52.8% |
| kid | 3 | 935 (11.7%) | 64.5% (61.4–67.5%) | +1.3 pp | 13.0% (11.0–15.4%) | -4.6 pp | 3.87 (+0.07) | 12.2% |
| kuma | 3 | 1,887 (23.6%) | 69.3% (67.2–71.4%) | +6.1 pp | 22.9% (21.1–24.8%) | +5.3 pp | 3.44 (-0.37) | 43.2% |
| luffy | 3 | 606 (7.6%) | 77.7% (74.2–80.9%) | +14.5 pp | 27.9% (24.5–31.6%) | +10.3 pp | 3.06 (-0.75) | 16.9% |
| zoro | 3 | 2,244 (28.1%) | 61.2% (59.2–63.2%) | -2.0 pp | 14.0% (12.6–15.5%) | -3.6 pp | 3.96 (+0.16) | 31.4% |
| ace | 4 | 588 (7.3%) | 80.6% (77.2–83.6%) | +2.1 pp | 30.4% (26.9–34.3%) | -0.2 pp | 2.88 (-0.07) | 17.9% |
| akainu | 4 | 897 (11.2%) | 82.1% (79.4–84.4%) | +3.5 pp | 33.3% (30.3–36.5%) | +2.7 pp | 2.76 (-0.19) | 29.9% |
| doflamingo | 4 | 458 (5.7%) | 69.9% (65.5–73.9%) | -8.7 pp | 23.8% (20.1–27.9%) | -6.9 pp | 3.42 (+0.47) | 10.9% |
| hancock | 4 | 416 (5.2%) | 78.4% (74.2–82.1%) | -0.2 pp | 31.5% (27.2–36.1%) | +0.8 pp | 3.01 (+0.06) | 13.1% |
| kizaru | 4 | 683 (8.5%) | 81.1% (78.0–83.9%) | +2.6 pp | 33.1% (29.7–36.7%) | +2.4 pp | 2.78 (-0.17) | 22.6% |
| kuzan | 4 | 727 (9.1%) | 74.0% (70.7–77.1%) | -4.5 pp | 31.6% (28.4–35.1%) | +1.0 pp | 3.09 (+0.14) | 23.0% |
| law | 4 | 536 (6.7%) | 80.8% (77.2–83.9%) | +2.2 pp | 27.2% (23.6–31.2%) | -3.4 pp | 2.95 (-0.00) | 14.6% |
| blackbeard | 5 | 79 (1.0%) | 94.9% (87.7–98.0%) | -1.9 pp | 58.2% (47.2–68.5%) | -5.6 pp | 1.77 (+0.18) | 4.6% |
| garp | 5 | 272 (3.4%) | 96.7% (93.8–98.2%) | -0.2 pp | 69.1% (63.4–74.3%) | +5.3 pp | 1.51 (-0.08) | 18.8% |
| mihawk | 5 | 103 (1.3%) | 98.1% (93.2–99.5%) | +1.2 pp | 55.3% (45.7–64.6%) | -8.5 pp | 1.74 (+0.15) | 5.7% |
| shanks | 5 | 88 (1.1%) | 97.7% (92.1–99.4%) | +0.9 pp | 62.5% (52.1–71.9%) | -1.3 pp | 1.51 (-0.08) | 5.5% |

### Historical Signals Reassessed

- **Sabo:** not supported in the 30-unit environment. Top-four fell from 71.2% to 49.9%, conditional wins from 28.1% to 13.4%, and same-cost deltas are now small.
- **Luffy:** supported. Raw top-four is 77.7% and the same-cost deltas remain large, although final-board observations fell from 1,642 to 606.
- **Ace:** the old winner-board concentration is resolved. Winner presence fell from 68.1% to 17.9%, and same-cost outcomes are neutral.
- **Robin and Nami:** both negative signals persist. Their absolute rates improved in the new environment, but they remain far below stronger same-cost peers.
- **Zoro:** now a mild rather than leading negative signal. **Kid:** mixed, not coherently weak. **Doflamingo:** remains negative versus 4-cost peers, with a smaller sample.

### Expansion Units Reassessed

The 1,000-seed evidence replaces the prior 50-seed smoke signals. Franky and Kuma are the clearest positive expansion units; Koby is moderately positive. Ivankov is the clearest negative expansion unit. Jinbe, Kizaru, and Akainu are modest positives; Brook and Koala are close to their bands; Kuzan is mixed. Shanks and Blackbeard have only 88 and 79 final-board observations, and their broad win intervals overlap the 5-cost context, so neither is a credible balance outlier yet.

## Cost-Band Findings: High Costs Are Strong When Found but Rarely Deployed

| Cost | Units | Final definitions | Representation | Player boards with tier | Top-four | Conditional win | Avg placement | 18-unit representation |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 6 | 14,446 | 31.97% | 94.13% | 44.51% | 10.45% | 4.81 | 22.73% |
| 2 | 7 | 15,866 | 35.11% | 95.50% | 49.02% | 11.91% | 4.53 | 25.70% |
| 3 | 6 | 10,033 | 22.20% | 78.90% | 63.18% | 17.62% | 3.81 | 25.25% |
| 4 | 7 | 4,305 | 9.53% | 38.75% | 78.54% | 30.66% | 2.95 | 23.98% |
| 5 | 4 | 542 | 1.20% | 6.24% | 96.86% | 63.84% | 1.59 | 2.35% |

Costs 4 and 5 are far less represented than in the 18-unit baseline, despite expanding from 4/2 to 7/4 definitions. Their very high top-four and win rates do not show that the tiers are overpowered: acquisition happens late and is heavily conditioned on survival, creating strong survivorship bias. The evidence supports a scarcity/selection statement, not a demand that all cost bands converge.

Costs 1 and 2 now make up 67.1% of unique final-board definitions. Cost 3 remains broadly reachable on 78.9% of player boards. No cost tier is structurally absent, but cost 5 is a rare high-roll tier and its individual-unit comparisons remain sample-sensitive.

## Shop and Pool Findings: No High-Cost Pool Exhaustion

| Cost | Initial copies / definition | Eligible prep shops | Offers / eligible slot | Prep shops with ≥1 offer | Avg pool copies available | Zero-copy rate | Final-crew instances | 2★+ share |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 27 | 214,058 | 35.07% | 82.40% | 8.74 | 14.34% | 40,908 | 92.7% |
| 2 | 22 | 206,058 | 36.86% | 92.87% | 11.64 | 1.30% | 35,169 | 77.0% |
| 3 | 18 | 182,058 | 26.14% | 79.42% | 12.68 | 0.17% | 24,777 | 59.5% |
| 4 | 14 | 146,889 | 9.55% | 40.42% | 12.68 | 0.00% | 17,301 | 28.6% |
| 5 | 10 | 63,173 | 2.24% | 12.14% | 9.76 | 0.00% | 3,782 | 12.1% |

Across 33,557 preparation snapshots, all 1,284,348 shop slots were filled. Costs 4 and 5 never had a definition at zero shared-pool copies and retained almost all initial copies on average at the observation point. The existing configuration hash is unchanged from the 18-unit assessment, so pool copies and shop odds did not change.

The expanded roster does dilute the chance of finding one specific high-cost definition inside its cost roll, and final 4-/5-cost deployment fell. It does not create evidence of aggregate high-cost pool exhaustion. The measured bottleneck is upstream: relatively few player preparations are eligible for high-cost odds, offers are naturally rare at those levels, and only surviving players can convert late offers into final deployment. Character strength and bot preference then determine which definitions survive; the current data cannot isolate those effects causally.

## Trait Findings: Emperor Is Effectively Unreachable

| Trait | Player battle-board activations | Activation share | Matches reached | Match reach | Max tier |
| --- | ---: | ---: | ---: | ---: | ---: |
| Straw Hat | 157,067 | 73.38% | 1,000 | 100.0% | 3 |
| Navy | 48,607 | 22.71% | 1,000 | 100.0% | 2 |
| Warlord | 3,595 | 1.68% | 446 | 44.6% | 2 |
| Supernova | 10,556 | 4.93% | 790 | 79.0% | 2 |
| Brotherhood | 5,670 | 2.65% | 525 | 52.5% | 2 |
| Revolutionary | 142,110 | 66.39% | 1,000 | 100.0% | 2 |
| Emperor | 28 | 0.013% | 4 | 0.4% | 1 |
| Captain | 2,802 | 1.31% | 348 | 34.8% | 2 |
| Brawler | 60,419 | 28.23% | 1,000 | 100.0% | 2 |
| Swordsman | 32,127 | 15.01% | 993 | 99.3% | 2 |
| Marksman | 11,370 | 5.31% | 833 | 83.3% | 2 |
| Specialist | 52,631 | 24.59% | 1,000 | 100.0% | 2 |
| Guardian | 58,959 | 27.54% | 1,000 | 100.0% | 2 |

Every trait activated at least once and every defined tier was reached. That binary pass hides a major reachability difference: Emperor activated on 0.013% of 214,058 player battle-boards and in only four matches. Because both current Emperors are also Captains, Emperor + Captain has exactly the same 28 activations and four-match reach. Captain without Emperor is uncommon but meaningfully reachable.

Straw Hat and Revolutionary are common rather than universal: they appear on 73.4% and 66.4% of alive player battle-boards. Warlord and Captain are rare, but each appears in hundreds of matches. Emperor is the only trait that is effectively absent at production scale. This is reachability evidence, not evidence that the +8% health/+8% attack effect is too weak or too strong once active.

## Combat and Readability Findings: More Casts and Knockback, Similar Total Control

| PvP event metric | 30-unit / battle | 18-unit / battle | Relative change |
| --- | ---: | ---: | ---: |
| Casts | 16.85 | 13.30 | +26.7% |
| Cast targets | 26.43 | 21.60 | +22.3% |
| Multi-target casts | 4.84 | 3.83 | +26.3% |
| Sequential ability hits | 1.85 | 2.44 | -24.3% |
| Stuns | 5.62 | 6.22 | -9.7% |
| Burns | 1.23 | 1.71 | -28.2% |
| Lunges | 1.74 | 0.58 | +198.5% |
| Knockbacks | 7.85 | 3.84 | +104.5% |
| Pulls | 0.72 | 3.31 | -78.2% |
| Energy Drain events | 3.66 | 5.92 | -38.1% |
| Effective Energy drained | 49.46 | 71.25 | -30.6% |
| Defined control indicator | 19.60 | 19.87 | -1.4% |
| All-enemy ability casts | 1.08 | Not captured | New metric |
| Defense Pierce casts | 0.168 | Not captured | New metric |

The 30-unit roster did not increase the aggregate defined control indicator, but it increased action and movement density. The mix shifted sharply from pulls, stuns, and drains toward lunge and especially knockback. Kuma alone produced 180,826 knockbacks; Smoker 42,573, Franky 88,465, and Jinbe 67,388. This is combat expression, not standalone proof of imbalance.

Presentation risk remains distinct from balance:

- **Knockback vs pull:** knockback now occurs 7.85 times per battle and still shares generic displacement presentation with pull. Pull is rarer, but the source/mechanic distinction remains ambiguous.
- **Energy Drain:** frequency fell but remains 3.66 events per battle. The event stream still identifies the victim rather than the caster, so attribution remains impossible without a separately scoped event/presentation change.
- **Defense Pierce:** 12,480 observed casts equal 0.168 per battle and still have no dedicated event or visual cue.
- **Board-wide effects:** all-enemy abilities cast 80,472 times, or 1.08 per battle. Kuzan and Blackbeard average more than five targets per cast; high-impact board-wide effects contribute visible density even when their unit outcomes are not outliers.

## Comparison with the 18-Unit Baseline

The current run uses the same production seed naming, save schema, and configuration hash as the historical assessment, but content changed from `1.8.0` to `1.11.0` and the roster grew from 18 to 30. Comparisons are descriptive environment changes, not controlled treatment effects.

- Structural completion remains 100% with zero crashes.
- Matches end 1.41 rounds earlier but take 1.37 full-clock and 1.72 paced minutes longer; timeout rate is the clearest health regression.
- Costs 4 and 5 lost final-board representation while their conditional outcomes improved, consistent with stronger late-survivor selection.
- Sabo's former high-confidence positive signal disappeared; Luffy persisted. Ace's winner-board concentration disappeared. Robin and Nami remained negative relative to peers.
- Cast and displacement density increased, while total control density stayed flat because stun, pull, and Energy Drain density fell.
- The old report could not assess Emperor, high-cost pool availability, all-enemy casts, or Defense Pierce usage; the new diagnostics supply those denominators without changing simulation decisions or RNG order.

## Ranked Evidence-Backed Concerns

1. **Smoker same-cost overperformance:** largest coherent positive signal with 1,586 observations and narrow Wilson intervals. This is the smallest actionable character target.
2. **Emperor reachability:** only 4/1,000 matches and 28/214,058 player battle-boards activate it. The effect itself cannot be assessed reliably at this usage level.
3. **Timeout and match-clock regression:** 1.175% of battles time out versus 0.126% historically, and full-clock length reaches 33.59 minutes despite fewer rounds.
4. **Persistent and new negative character signals:** Nami and Robin remain below peers; Crocodile and Ivankov are newly coherent negatives. Composition and trait confounding prevent a multi-unit correction from this report alone.
5. **Displacement-heavy readability:** knockback doubled to 7.85 events per battle while pull/knockback distinction, Energy Drain attribution, and Defense Pierce visibility remain incomplete.
6. **High-cost representation:** cost 5 appears on only 6.24% of final player boards. Pool snapshots rule out exhaustion, so shop odds should not be changed solely from this evidence.

## Limitations, Uncertainty, and Robustness Checks

- Unit and trait outcomes are associative. Bot preferences, traits, star levels, items, positioning, acquisition timing, and survival all confound final-board results.
- Cost-band observations are weighted definition observations and are not mutually exclusive within one board. High-cost outcomes have strong survivorship bias.
- Shanks, Blackbeard, and other 5-cost units have wide Wilson intervals despite 1,000 seeds. Raw percentages must not be interpreted without their denominators.
- Shop instrumentation observes automatic preparation shops and shared-pool availability, not every manual reroll. Deterministic bots do not toggle shop lock or perform battle-phase economy actions, so this run validates the surrounding production baseline but cannot measure adoption or strategic value of those two player-facing mechanics. AI behavior was intentionally unchanged.
- Character combat attribution excludes ghost copies to avoid double-counting exposure; global readability totals include ghost combat. Trait counting uses unique deployed definitions as the domain does.
- Energy Drain cannot be attributed to a caster with the current event schema. Heal/shield counters may include trait/item effects attributed to the acting unit, so they describe expression rather than ability-only output.
- Pre-soak validation passed: focused production-audit test, typecheck, lint, 307-test normal suite, and 50/50 production smoke with zero crashes. The audit test recomputes bounds and verifies a repeated three-seed result is deterministic.
- Post-soak arithmetic validation independently reconciled all 30 characters, cost-band totals and 100% representation, rate formulas, trait denominators, shop ratios, combat ratios, and the 52.8% maximum winner presence. Exactly one 1,000-seed soak was run.

## Recommended Next Bounded Task

Run **one isolated Smoker balance pass**. Change one ability-impact lever only, preserve every trait/shop/economy/timing value, and rerun the same focused diagnostics before any production-scale comparison. Do not tune Luffy, Emperor, Nami, Robin, Crocodile, Ivankov, or readability in the same PR.

This recommendation is narrower than the other credible issues and has the strongest combination of same-cost effect size, sample size, and internally consistent top-four/win/placement evidence. Sabo should not be tuned from the old plan: the current data no longer supports it.

## Further Questions

- Which compositions, traits, stars, and opponent contexts account for Smoker's result, and does one ability lever preserve his Navy/Guardian identity?
- Are timeouts concentrated in specific compositions or mechanics, particularly durable boards and repeated displacement?
- What single Emperor reachability lever preserves its intended two-character identity without making the effect automatic or ubiquitous?
- Does cost-5 deployment remain at 6.24% after a balance-neutral bot-policy audit, or is the low rate partly a deterministic preference artifact?
