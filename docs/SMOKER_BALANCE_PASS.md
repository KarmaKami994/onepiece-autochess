# Smoker White Blow Balance Pass

## Decision

Smoker's White Blow base power changed from `210` to `180` (about -14.3%). No other gameplay value changed: Smoker remains a 2-cost Navy / Guardian with the same stats, line targeting, cast cadence, star scaling and knockback.

Game content moved from `1.11.0` to `1.11.1`. Save schema remains `6`, and existing schema-6 saves continue through the existing content-version handling.

## Baseline

PR #22 identified Smoker as the strongest coherent positive same-cost signal: 1,586 final-board observations, 65.8% top four, 21.7% conditional wins, 3.64 average placement and 34.4% winner-board presence. His deltas versus the 2-cost band were +16.8 percentage points for top four, +9.8 points for conditional wins and -0.89 placement.

## Validation

Focused Smoker/combat tests, save compatibility, typecheck, lint, the full unit suite, asset validation and build passed. The 50-seed smoke completed 50/50 matches with zero crashes. After those checks, exactly one 1,000-seed production soak ran over `production-0` through `production-999`; it completed 1,000/1,000 matches with zero crashes.

The post-change run uses the same schema (`6`), configuration hash (`977295da`) and deterministic seed range as the frozen baseline. Content hash changed only with the intended content revision, from `c59a272a` to `b2fe4f21`. The exact raw snapshot is [`analysis/smoker-white-blow-180-1000.json`](analysis/smoker-white-blow-180-1000.json), SHA-256 `BB6B7D466A37826ADE3605974C2E457FF26449566ED2F00AE3BD5C478A6351C5`.

## Before vs After

| Smoker metric | White Blow 210 | White Blow 180 | Absolute change |
| --- | ---: | ---: | ---: |
| Final-board observations | 1,586 | 1,584 | -2 |
| Final-board presence | 19.825% | 19.800% | -0.025 pp |
| Top-four rate | 65.83% | 64.84% | -0.99 pp |
| Top-four 95% Wilson interval | 63.46–68.12% | 62.45–67.15% | — |
| Same-cost top-four delta | +16.81 pp | +15.61 pp | -1.20 pp |
| Conditional win rate | 21.69% | 20.77% | -0.92 pp |
| Win 95% Wilson interval | 19.73–23.79% | 18.84–22.84% | — |
| Same-cost win delta | +9.78 pp | +8.79 pp | -0.99 pp |
| Average placement | 3.636 | 3.705 | +0.069 |
| Same-cost placement delta | -0.892 | -0.818 | +0.075 |
| Winner-board presence | 34.4% | 32.9% | -1.5 pp |
| Battle-board appearances | 28,331 | 27,949 | -382 |
| Casts per battle-board appearance | 2.078 | 2.087 | +0.009 |
| Total ability damage | 16,387,756 | 14,112,835 | -2,274,921 |
| Ability damage per cast | 278.43 | 241.96 | -36.47 (-13.1%) |
| Knockbacks | 42,573 | 42,881 | +308 |
| Knockbacks per cast | 0.723 | 0.735 | +0.012 |

The new internally consistent 2-cost band is 49.23% top four, 11.98% conditional wins and 4.523 average placement. The old band was 49.02%, 11.91% and 4.528 respectively. Smoker's post-change deltas above use the new band.

## System Guardrails

| Metric | Before | After | Absolute change |
| --- | ---: | ---: | ---: |
| Complete matches / crashes | 1,000 / 0 | 1,000 / 0 | none |
| Average rounds | 33.557 | 33.544 | -0.013 |
| Average full-clock minutes | 33.586 | 33.593 | +0.007 |
| Average paced minutes | 24.030 | 24.041 | +0.010 |
| Battles | 133,841 | 133,785 | -56 |
| Timeout rate | 1.175% | 1.196% | +0.021 pp |
| Draw rate | 0.030% | 0.028% | -0.001 pp |

The single-character change produced no material completion, crash, match-length, timeout or draw guardrail movement.

## Interpretation

**B — STILL CLEARLY OVERPERFORMING.** Every requested performance signal moved in the intended direction: top-four and win rates fell, average placement worsened, winner presence fell, and ability damage per cast dropped by 13.1%. However, the internally consistent post-change deltas remain coherently positive at +15.61 points top four, +8.79 points conditional wins and -0.818 placement. Sample presence remains essentially unchanged and line-control expression is preserved.

This deterministic same-seed comparison isolates one content change, but unit outcomes remain associative and composition-confounded. It does not prove that White Blow damage was the sole cause of the prior performance.

## Recommendation

Do not change `180` again in this PR. The next bounded decision should separately review whether another isolated Smoker adjustment is warranted; do not combine it with Luffy, negative-unit, Emperor, timeout or readability work.
