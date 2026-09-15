# P1B — Bot Progression Diagnostic Pass

This pass adds opt-in, behavior-neutral instrumentation to explain the progression funnel before another bot-policy candidate is designed. It does not tune bots. Production still uses the original initial buy pass, XP/reroll budgets and guards, post-reroll purchases, scoring, lineup, formation, items and voyage behavior. GameContent remains `1.31.0`; save schema remains `6`.

PAC classification remains locked: **DIRECT:** none; **ADAPTED:** PAC's stage-aware progression rationale becomes local measurement by round; **REFERENCE ONLY:** authored PAC board/power progression; **REJECTED:** scripted board replacement as production AI. The observer instruments the real local shop/economy loop without adding RNG, commands, save state or mutable gameplay references.

## Provenance and equivalence gate

The one official diagnostic run used clean instrumentation commit `3e4cd130f8baa3b66168541bbaec89e96cb518ab`, `production-0` through `production-49`, and `--bot-diagnostics`. Raw report: [p1b-bot-progression-diagnostic-50.json](analysis/p1b-bot-progression-diagnostic-50.json), SHA-256 `4cbdcb8a3e6ad4907e767b2663431c5b08d3181faf60fd74458d38cb194dbdf3`.

| Gate | Result |
| --- | --- |
| Completed matches / crashes | 50/50 / 0 — PASS |
| GameContent / save schema | `1.31.0` / `6` — PASS |
| Content / config hash | `a6d7c074` / `977295da` — PASS |
| Diagnostics on/off serialized state and RNG | Exact equality in focused tests — PASS |
| P13 gameplay-derived metrics | Exact equality — PASS |

The comparison checked every legacy report field. Ignoring diagnostic-only data and metadata, all completion/crash, round/pacing, battle/draw/timeout, Captain-damage/stage-reach, character, cost-band, shop/pool, trait/tier, item, form, combat-readability and target fields exactly equal [P13](analysis/p13-final-production-baseline-50.json). Metadata differences are `generatedAt`, Git SHA and Node `v24.3.0`→`v24.19.0`; Node version is not a gameplay-derived metric. The P13 PRE was not rerun. No other diagnostic aggregate or 1,000-seed soak was run.

## FACTS — measured progression

The report contains 12,241 end-of-preparation observations. "Reached" below means the level appeared by the end of a real bot preparation; the observer did not invent a target level.

| Level | Players reaching level (of 400) | First round min / median / p90 / max |
| ---: | ---: | ---: |
| 2 | 400 | 1 / 1 / 1 / 1 |
| 3 | 400 | 2 / 2 / 2 / 2 |
| 4 | 400 | 5 / 5 / 5 / 5 |
| 5 | 400 | 7 / 9 / 11 / 11 |
| 6 | 400 | 11 / 13 / 14 / 15 |
| 7 | 400 | 14 / 19 / 21 / 23 |
| 8 | 342 | 19 / 26 / 30 / 34 |
| 9 | 91 | 27 / 34 / 41 / 42 |

All 400 players reached the first cost-5-eligible level (L7), but only 342 reached L8 and 91 reached L9. End-of-preparation examples: R9 had 122 L4 / 278 L5; R19 had 158 L6 / 241 L7 / 1 L8; R29 had 52 L7 / 229 L8 / 9 L9. Counts later decline with eliminations.

### XP and reroll stops

| XP final stop reason | Preparations | Share |
| --- | ---: | ---: |
| Reserve | 7,206 | 58.9% |
| Budget exhausted | 4,473 | 36.5% |
| Max level | 562 | 4.6% |
| Roster guard | 0 | 0.0% |
| Command rejected / not applicable | 0 / 0 | 0.0% / 0.0% |

The configured XP attempt budget totaled 23,012. There were 9,732 actual XP commands, all successful, spending 38,928 gold. The roster-size guard never stopped XP in this sample.

| Reroll final stop reason | Preparations | Share |
| --- | ---: | ---: |
| Reserve | 5,685 | 46.4% |
| Budget exhausted | 5,024 | 41.0% |
| Not applicable (zero budget) | 1,532 | 12.5% |
| Command rejected | 0 | 0.0% |

The configured reroll budget totaled 19,621. All 10,540 attempted rerolls succeeded and spent 10,540 gold. Of that, 374 gold was spent while still below cost-4 eligibility and 3,794 gold while below cost-5 eligibility. The initial buy pass made 15,916 purchases; post-reroll passes made 4,289.

### High-cost funnel

Eligibility counts use end-of-preparation level. Offer exposure includes the initial shop plus each successful reroll snapshot at an eligible level. A preparation can therefore contain multiple six-slot snapshots.

| Funnel | Cost 4 | Cost 5 |
| --- | ---: | ---: |
| Eligible preparations | 9,112 / 12,241 (74.4%) | 5,663 / 12,241 (46.3%) |
| Eligible shop snapshots / slots | 19,068 / 114,408 | 12,173 / 73,038 |
| Offers seen | 15,527 (13.6% of eligible slots) | 2,633 (3.6%) |
| Eligible preparations with ≥1 offer | 6,186 (67.9%) | 1,825 (32.2%) |
| Purchases | 2,303 | 678 |
| Purchases / offer exposures | 14.8% | 25.8% |
| Initial / post-reroll purchases | 1,364 / 939 | 397 / 281 |
| First eligibility / offer / purchase round | 7 / 8 / 8 | 14 / 15 / 15 |

| Round bucket | Preparations | C4 eligible / offers / purchases | C5 eligible / offers / purchases |
| --- | ---: | ---: | ---: |
| 1–9 | 3,600 | 471 / 82 / 24 | 0 / 0 / 0 |
| 10–19 | 3,600 | 3,600 / 2,532 / 691 | 646 / 74 / 30 |
| 20–29 | 3,203 | 3,203 / 6,872 / 1,074 | 3,179 / 911 / 265 |
| 30–39 | 1,649 | 1,649 / 5,257 / 469 | 1,649 / 1,362 / 321 |
| 40+ | 189 | 189 / 784 / 45 | 189 / 286 / 62 |

### Personality comparison

| Personality | Players | L8 reach / median round | L9 reach / median round | C4 offers→buys | C5 offers→buys |
| --- | ---: | ---: | ---: | ---: | ---: |
| Balanced | 58 | 54 / 24 | 17 / 32 | 1,972→375 (19.0%) | 356→117 (32.9%) |
| Treasurer | 57 | 26 / 29 | 3 / 41 | 598→97 (16.2%) | 69→38 (55.1%) |
| High Roller | 57 | 46 / 30 | 8 / 41 | 3,366→310 (9.2%) | 496→119 (24.0%) |
| Vanguard | 57 | 57 / 26 | 28 / 32 | 2,487→357 (14.4%) | 487→158 (32.4%) |
| Strategist | 57 | 55 / 26 | 15 / 36 | 2,502→434 (17.3%) | 438→112 (25.6%) |
| Sharpshooter | 57 | 51 / 26 | 9 / 34 | 2,267→337 (14.9%) | 402→34 (8.5%) |
| Brawler | 57 | 53 / 26 | 11 / 34 | 2,335→393 (16.8%) | 385→100 (26.0%) |

Vanguard has the strongest progression/reach funnel and the most cost-5 purchases. Treasurer has the weakest L8/L9 reach and least offer exposure, consistent with its high reserve and zero reroll budget, but buys a high share of the few cost-5 offers it sees. High Roller creates the most cost-4 exposure but has the weakest cost-4 conversion. Sharpshooter has the weakest cost-5 conversion despite material exposure.

## INFERENCES

1. **Roster capacity is not the progression bottleneck measured here.** The roster guard fired zero times. The rejected candidate's special roster-deficit reroll path addressed a condition absent from all 12,241 current-policy preparations.
2. **Reserve and finite XP budgets explain delayed upper levels better than the roster guard.** Reserve was the XP stop in 58.9% of preparations and budget exhaustion in 36.5%. Every player reached L7, but only 22.8% reached L9.
3. **Cost-5 exposure is structurally narrow before late levels.** Even eligible snapshots showed cost-5 offers in only 3.6% of slots, and just 32.2% of eligible preparations saw one. Spending 3,794 reroll gold before cost-5 eligibility cannot produce a cost-5 offer.
4. **Offer-to-buy conversion is a second bottleneck.** Only 678 of 2,633 cost-5 offer exposures converted. The 8.5%–55.1% personality spread cannot be explained by shared shop odds alone and points to reserve, ownership/synergy scoring, affordability or roster replacement legality as likely contributors.
5. **The rejected candidate's exact regression is not causally reconstructable from its aggregate POST.** Its raw report recorded fewer eligible slots and less high-cost representation, but it did not contain this event-level instrumentation. The current diagnostic shows that its premise around roster-guard recovery was unsupported and that suppressing ordinary below-target rerolls changed a real exposure channel. It does not prove which changed condition caused every lost high-cost board.

The evidence-backed primary bottlenecks are **reserve/budget-limited progression to stronger high-cost odds**, **limited cost-5 shop exposure**, and **personality-dependent purchase conversion**. Roster guard is ruled out for this sample. Progression alone is not sufficient: all players reached L7, yet cost-5 visibility and conversion remained limited.

## Unknowns and candidate directions (not policy)

The required observer records successful purchases but not the reason each visible offer was skipped. It therefore cannot separate affordability, reserve, `canReceiveUnit`, replacement threshold, owned-copy/synergy scoring or competing earlier purchases. It also observes 50 deterministic seeds, not all states or human play.

Before locking another candidate, review two possible directions against the evidence: (a) milestone-aware progression aimed at measured shop-eligibility odds while preserving a deliberate reroll channel, rather than an arbitrary target curve; and (b) personality-aware high-cost offer conversion after adding or manually auditing offer-rejection reasons. Neither direction is implemented, recommended as balance truth, or authorized by this pass. No unit/item buff or nerf follows from these measurements.
