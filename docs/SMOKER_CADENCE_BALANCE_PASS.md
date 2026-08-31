# Smoker Attack-Cadence Balance Pass

## 1. Decision

Smoker's `attackIntervalMs` changed from `1200` to `1400`. This is the only gameplay-value change. White Blow remains power `180`, `nearest-enemy`, `line`, and knockback. GameContent moves from `1.15.0` to `1.15.1`; save schema remains `6`.

The result is **B — IMPROVED BUT STILL CLEARLY OVERPERFORMING**. Production cadence fell as intended and every primary outcome signal improved, but Smoker remains a coherent positive 2-cost outlier.

## 2. Rationale

The prior isolated [White Blow pass](SMOKER_BALANCE_PASS.md) reduced power from `210` to `180` and ability damage per cast by 13.1%, but casts per battle-board appearance stayed flat (`2.078` to `2.087`) and outcomes moved only modestly. This pass tests a different isolated lever: basic-attack, self-generated Energy, and repeated line-control cadence.

## 3. Provenance

- Primary before snapshot: `docs/analysis/post-forms-roster-assessment-1000.json`
- Before measurement SHA: `ed1feeeac78c84a6714ba05aa13fee7097a86548`
- After measurement SHA: `cf07eb4a690f4437ae476de80b888d175d0b00cf`
- After snapshot: `docs/analysis/smoker-cadence-1400-1000.json`
- After snapshot SHA-256: `b579e4be607f17996b6166a2c2288c0c21849b918cb2e0e3a67df7a4d7dd6cc4`
- Seeds: `production-0` through `production-999`; exactly one 1,000-seed run
- Node: `v24.3.0`; schema: `6`; GameContent: `1.15.1`
- Content hash: `206d8fa9`; config hash: `977295da`
- Result: 1,000/1,000 complete matches, zero crashes

The measured gameplay/test/version tree was committed and clean before the run. No gameplay or measurement code changed afterward.

## 4. Current Post-Forms Baseline

The primary current-environment baseline contains all 30 units and four production forms with corrected deployed-board analytics. Its Smoker sample is 1,588 final boards and 28,745 battle-board appearances. Baseline GameContent is `1.15.0`, content hash `0d45b798`, config hash `977295da`, and save schema `6`.

## 5. Mechanical Cadence Result

| Metric | 1200 ms | 1400 ms | Absolute movement |
| --- | ---: | ---: | ---: |
| Casts | 57,384 | 49,635 | -7,749 |
| Casts / battle-board appearance | 1.996312 | 1.815074 | -0.181239 (-9.08%) |
| Total knockbacks | 42,226 | 36,772 | -5,454 |
| Knockbacks / cast | 0.735850 | 0.740848 | +0.004998 |
| Total ability damage | 13,837,877 | 12,124,588 | -1,713,289 |
| Ability damage / cast | 241.145215 | 244.274967 | +3.129753 |

**Cadence hypothesis: supported.** Casts per appearance fell materially, while knockbacks per cast and ability damage per cast remained roughly stable. The cadence lever reduced repeated White Blow opportunities without weakening White Blow's per-cast line-control identity.

## 6. Smoker Before / After

| Metric | 1200 ms | 1400 ms | Absolute movement |
| --- | ---: | ---: | ---: |
| Final boards | 1,588 | 1,557 | -31 |
| Final-board presence | 19.8500% | 19.4625% | -0.3875 pp |
| Top-four count | 1,049 | 954 | -95 |
| Top-four rate | 66.0579% | 61.2717% | -4.7863 pp |
| Top-four Wilson 95% CI | 63.6927–68.3457% | 58.8271–63.6608% | — |
| Conditional wins | 342 | 313 | -29 |
| Conditional win rate | 21.5365% | 20.1028% | -1.4338 pp |
| Win Wilson 95% CI | 19.5846–23.6258% | 18.1867–22.1660% | — |
| Average placement | 3.640428 | 3.868979 | +0.228551 |
| Winner-board presence | 34.2% | 31.3% | -2.9 pp |
| Battle-board appearances | 28,745 | 27,346 | -1,399 |

Same-cost deltas also moved toward neutral: top-four `+17.1323` to `+12.3744` pp (-4.7579 pp), win `+9.5360` to `+8.3132` pp (-1.2228 pp), and placement `-0.893814` to `-0.672483` (+0.221331, less favorable).

## 7. System Guardrails

| Metric | Before | After | Absolute movement |
| --- | ---: | ---: | ---: |
| Complete matches / crashes | 1,000 / 0 | 1,000 / 0 | none |
| Min / max rounds | 27 / 46 | 27 / 44 | 0 / -2 |
| Average rounds | 33.965 | 33.774 | -0.191 |
| Average full-clock minutes | 33.561307 | 33.455202 | -0.106105 |
| Average paced minutes | 23.903390 | 23.845035 | -0.058355 |
| Battle count | 134,971 | 134,917 | -54 |
| Timeout rate | 0.728305% | 0.812351% | +0.084047 pp |
| Draw rate | 0.031118% | 0.030389% | -0.000729 pp |

Completion and crash guardrails held. The small timeout increase is recorded, not acted on in this isolated pass.

## 8. Other-Roster Guardrail

Among the other 29 characters, the largest absolute same-seed top-four movements were Blackbeard -3.91 pp, Kid +3.35 pp, and Hancock +3.03 pp. The largest conditional-win movements were Garp +6.51 pp, Blackbeard -4.49 pp, and Shanks +3.58 pp; the largest placement movements were Blackbeard +0.238, Hancock -0.165, and Kid -0.142. These are compact composition-ripple guardrails, especially sample-sensitive for high-cost units, and no other unit was changed or tuned.

## 9. Form Guardrail

- Demonio Fleur final boards moved `407` to `400`; Robin's deployed 3-star invariant remained true with zero non-Demonio deployed 3-star boards.
- Boundman final boards moved `3` to `2`; Snakeman moved `1` to `0`. These remain too small for balance interpretation, while the focused Gear 4 regression passed.
- Monster Point transforms moved `56,566` to `56,721`, reached all 1,000 matches in both snapshots, and its focused regression passed.
- All four production form definitions remain present; no form or reconciliation code changed.

## 10. Interpretation

The mechanical and outcome hypotheses should be separated. Mechanically, 1400 ms clearly reduced repeated casts and aggregate knockbacks while leaving per-cast damage and knockback density stable. Outcomes also improved: top-four fell 4.79 pp, wins fell 1.43 pp, placement worsened by 0.229, and winner presence fell 2.9 pp. The top-four Wilson intervals are effectively separated at their boundary; the win intervals still overlap.

Despite that improvement, the after sample remains large and all same-cost signals are coherently favorable: +12.37 pp top four, +8.31 pp conditional wins, and -0.672 placement. The isolated cadence change did not normalize Smoker.

## 11. Classification

**B — IMPROVED BUT STILL CLEARLY OVERPERFORMING.**

## 12. Next Recommended Task

Run one separate bounded Smoker decision review: decide whether the remaining coherent same-cost advantage warrants one further isolated adjustment or should be frozen. Do not implement that decision inside PR #30 and do not combine it with forms, timeout, traits, economy, or other roster tuning.
