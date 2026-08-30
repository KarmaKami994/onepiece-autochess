# Emperor Reachability Pass

## Decision

Emperor now has two non-cumulative, highest-reached-only tiers:

- 1 distinct Emperor: +4% maximum health and +4% attack team-wide.
- 2 distinct Emperors: +8% maximum health and +8% attack team-wide.

The existing 2-Emperor payoff is unchanged. Shanks, Blackbeard, Captain, unique-definition counting, trait selection and combat effect application are unchanged. GameContent moved from `1.11.1` to `1.11.2`; save schema remains `6`.

## Baseline

The current pre-change baseline is [`analysis/smoker-white-blow-180-1000.json`](analysis/smoker-white-blow-180-1000.json). Its single Emperor tier required both definitions and appeared on only 3 active boards across 2/1,000 matches. Those activations are the direct old double-Emperor reference.

## Validation and Provenance

Focused Emperor/trait, tier-diagnostic and save/content compatibility tests passed before typecheck, lint, the full unit suite, asset validation, build and the 50-seed smoke. All measured implementation, test and diagnostic changes were then committed with a clean working tree as `41fa8927f065127f1c63a88251441f42cbd26b25` before exactly one 1,000-seed production soak ran.

The saved snapshot's `gitSha` is that implementation commit. Additional reproduction anchors are GameContent `1.11.2`, content hash `700f1d6c`, config hash `977295da`, schema `6`, and seeds `production-0` through `production-999`. The exact raw snapshot is [`analysis/emperor-reachability-1000.json`](analysis/emperor-reachability-1000.json), SHA-256 `F68BEF176134634102C5599032CEBFF55F232765EB1D3762FB4F44EDFDE97B01`.

## Reachability Before vs After

Tier metrics count only the highest active Emperor tier on each board. A Tier-2 board is not also counted as exact Tier 1.

| Reachability | Before | After | Absolute change |
| --- | ---: | ---: | ---: |
| Any Emperor active boards | 3 | 813 | +810 |
| Any Emperor activation rate | 0.0014% | 0.3801% | +0.3787 pp |
| Any Emperor matches reached | 2 / 1,000 | 176 / 1,000 | +174 |
| Any Emperor match reach | 0.2% | 17.6% | +17.4 pp |
| Exact Tier 1 active boards | not available | 813 | — |
| Exact Tier 1 matches reached | not available | 176 / 1,000 | — |
| Exact Tier 2 active boards | 3 | 0 | -3 |
| Exact Tier 2 matches reached | 2 / 1,000 | 0 / 1,000 | -2 |
| Maximum reached post-change tier | — | Tier 1 | — |

Emperor + Captain rose from 3 boards / 2 matches to 295 boards / 65 matches. This is contextual only: after the one-unit tier, the combination can mean one Emperor plus another Captain and is not a double-Emperor proxy. Exact tier diagnostics are the source of truth.

## Shanks / Blackbeard Guardrails

| Metric | Shanks before | Shanks after | Blackbeard before | Blackbeard after |
| --- | ---: | ---: | ---: | ---: |
| Final-board observations | 95 | 95 | 75 | 72 |
| Top-four rate | 95.79% | 96.84% | 92.00% | 91.67% |
| Top-four 95% Wilson interval | 89.67–98.35% | 91.12–98.92% | 83.63–96.28% | 82.99–96.12% |
| Conditional win rate | 56.84% | 69.47% | 54.67% | 54.17% |
| Win 95% Wilson interval | 46.81–66.34% | 59.61–77.83% | 43.45–65.43% | 42.74–65.17% |
| Average placement | 1.642 | 1.474 | 1.947 | 1.917 |
| Winner presence | 5.4% | 6.6% | 4.1% | 3.9% |

Shanks' conditional-win point estimate increased, but its sample stayed at 95 final boards, the Wilson intervals overlap, top-four rate was already saturated and winner presence moved only +1.2 points. Blackbeard remained stable. These small, composition-confounded 5-cost samples are guardrails, not isolated tuning evidence.

## System Guardrails

| Metric | Before | After | Absolute change |
| --- | ---: | ---: | ---: |
| Complete matches / crashes | 1,000 / 0 | 1,000 / 0 | none |
| Average rounds | 33.544 | 33.551 | +0.007 |
| Average full-clock minutes | 33.593 | 33.604 | +0.011 |
| Average paced minutes | 24.041 | 24.050 | +0.009 |
| Battles | 133,785 | 133,795 | +10 |
| Timeout rate | 1.196% | 1.196% | -0.0001 pp |
| Draw rate | 0.028% | 0.028% | effectively unchanged |

No completion, crash, duration, timeout or draw guardrail moved materially.

## Interpretation

**A — GOOD REACHABILITY / NO FURTHER IMMEDIATE EMPEROR CHANGE.** Exact Tier 1 appeared on 813 boards across 17.6% of matches, converting Emperor from effectively dead content into a meaningful but still 5-cost-constrained origin. Tier 2 remained an exceptionally rare chase state and was not reached in this run; its +8%/+8% payoff remains available and unchanged. No system guardrail problem emerged. Shanks' conditional-win movement should be watched in later evidence, but the small overlapping-interval sample is not a blocking coherent power signal.

This deterministic same-seed comparison isolates one content change, but downstream outcomes remain composition-confounded. It does not establish Emperor as the sole cause of individual unit movement.

## Recommendation

Make no further Emperor change now. With the reachability objective met and no blocking regression, the next bounded roadmap task is Character Form System foundation; do not implement it in this PR.
