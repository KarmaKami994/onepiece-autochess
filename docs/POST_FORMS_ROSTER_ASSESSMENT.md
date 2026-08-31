# Post-Forms Roster Assessment

## 1. Executive Summary

The post-forms production baseline completed 1,000/1,000 deterministic matches with zero crashes. Timeout rate improved from 1.1959% to 0.7283% (-0.4676 percentage points; 0.609x the pre-forms rate), while duration and draw rate remained stable. All four production forms occurred naturally. Demonio Fleur produced a useful 407-final-board sample, Monster Point transformed 56,566 times, and both Gear 4 branches appeared, but only four Gear 4 final boards make branch-specific balance conclusions premature.

Smoker remains the clearest high-confidence same-cost overperformer. Chopper also moved coherently positive while Monster Point was broadly reached. The overall result is **B — SPECIFIC BALANCE FOLLOW-UP WARRANTED**, with one next task: an isolated Smoker adjustment.

## 2. Scope / Provenance

This is an analysis-only comparison of the completed 30-unit roster and four production forms against `docs/analysis/emperor-reachability-1000.json`. It changes no gameplay, balance, content, UI, assets, persistence, schema, or version.

| Provenance | Value |
|---|---|
| Base `main` | `bf6b1003da66611e2aa7d429b4cf944e79fe1189` |
| Measurement implementation | `7780b44a50da9ba0f50151b2f368f17bf5de30ec` |
| GameContent / save schema | `1.15.0` / `6` |
| Content / config hash | `0d45b798` / `977295da` |
| Node | `v24.3.0` |
| Seeds | `production-0` through `production-999` (1,000) |
| Raw snapshot | `docs/analysis/post-forms-roster-assessment-1000.json` |
| Snapshot SHA-256 | `c726cc18ea5fb3f0a1731ec7a34fe38a04ed2855ed5a632ca9de57b0ba14c236` |

The working tree was clean before measurement. Exactly one final post-forms 1,000-seed run occurred. The committed measurement code was not changed after the run; only the exact snapshot and documentation followed.

Form observations use real, non-ghost player units. Persistent final-board forms count once per player board. Combat attribution starts from each immutable battle snapshot and follows recorded `unit-transform` events in order; it does not infer battle identity from later persistent state.

## 3. Pre-Forms Baseline

The primary baseline is the Emperor reachability snapshot: the latest 1,000-seed run with White Blow 180, the one-Emperor entry tier, and the complete 30-unit base roster, but before production Character Forms. Older assessments are historical context only.

## 4. System Health

| Metric | Pre-forms | Post-forms | Change |
|---|---:|---:|---:|
| Complete matches | 1,000 | 1,000 | 0 |
| Crashes | 0 | 0 | 0 |
| Min / max rounds | 27 / 46 | 27 / 46 | unchanged |
| Average rounds | 33.551 | 33.965 | +0.414 |
| Full-clock minutes | 33.6040 | 33.5613 | -0.0427 |
| Paced minutes | 24.0496 | 23.9034 | -0.1462 |
| Battles | 133,795 | 134,971 | +1,176 |
| Timeout rate | 1.1959% | 0.7283% | -0.4676 pp; 0.609x |
| Draw rate | 0.0284% | 0.0311% | +0.0027 pp |

Timeout classification: **IMPROVED**. The small changes in duration and draws do not indicate a systemic regression. The same seeds make environment movement precise, but the three pilots entered together, so this does not identify a cause.

## 5. Form Reachability

| Form | Start appearances | Transforms | Matches reached | Final boards | Top 4 | Wins | Average placement | Share of base final boards |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Robin Demonio Fleur | 3,737 | 0 | 390 | 407 | 232 | 67 | 4.015 | 12.57% |
| Luffy Boundman | 26 | 0 | 3 | 3 | 3 | 2 | 1.333 | 0.49% |
| Luffy Snakeman | 11 | 0 | 1 | 1 | 1 | 1 | 1.000 | 0.16% |
| Chopper Monster Point | 0 | 56,566 | 1,000 | 0 | — | — | — | — |

Demonio's final-board top-four rate was 57.00% (95% Wilson CI 52.15–61.72) and win rate 16.46% (13.18–20.38). Boundman and Snakeman are naturally reachable, but their samples of three and one final boards cannot support outcome comparisons. Monster Point's zero persistent final boards is correct for a battle-temporary form.

## 6. Robin Assessment

| Metric | Pre-forms | Post-forms | Change |
|---|---:|---:|---:|
| Final boards / presence | 3,280 / 41.00% | 3,239 / 40.49% | -41 / -0.51 pp |
| Top four (95% CI) | 39.09% (37.43–40.77) | 38.62% (36.96–40.31) | -0.46 pp |
| Conditional wins (95% CI) | 6.86% (6.04–7.78) | 7.41% (6.56–8.36) | +0.55 pp |
| Average placement | 5.046 | 5.080 | +0.034 worse |
| Winner presence | 22.5% | 24.0% | +1.5 pp |
| Current same-cost deltas | — | -10.30 pp top four; -4.59 pp wins; +0.546 placement | — |

All 407 Robin 3-star final boards were Demonio Fleur; non-Demonio 3-star boards were zero, so the production invariant held. Demonio was 12.57% of all Robin final boards and showed 1.94 casts per source appearance, 1.72 targets and 568.3 ability damage per cast, 5,605 kills, and 9,969 stuns. Classification: **HEALTHY SIGNAL**. Demonio has a useful outcome sample without an isolated alarm, while overall Robin remains a coherent negative 2-cost signal. Its 3-star selection context prevents attributing the outcome gap solely to the form.

## 7. Luffy Assessment

| Metric | Pre-forms | Post-forms | Change |
|---|---:|---:|---:|
| Final boards / presence | 605 / 7.56% | 617 / 7.71% | +12 / +0.15 pp |
| Top four (95% CI) | 78.35% (74.89–81.44) | 77.63% (74.18–80.75) | -0.71 pp |
| Conditional wins (95% CI) | 26.28% (22.93–29.93) | 26.26% (22.94–29.87) | -0.02 pp |
| Average placement | 3.076 | 3.149 | +0.073 worse |
| Winner presence | 15.9% | 16.2% | +0.3 pp |
| Current same-cost deltas | — | +14.59 pp top four; +8.85 pp wins; -0.685 placement | — |

| 3-star branch | Boards | Share | Top 4 | Wins | Average placement |
|---|---:|---:|---:|---:|---:|
| Base Luffy | 97 | 96.04% | 93 | 53 | 1.928 |
| Boundman | 3 | 2.97% | 3 | 2 | 1.333 |
| Snakeman | 1 | 0.99% | 1 | 1 | 1.000 |

Only 4/101 3-star final boards selected Gear 4. Boundman appeared three times as often as Snakeman, but item/catalyst availability and bot behavior confound that frequency. Boundman recorded 86 casts across 26 source appearances; Snakeman recorded 26 across 11. These tiny samples establish functionality, not balance. **Neither branch is sufficiently sampled; overall Luffy remains the more important strong positive signal.**

## 8. Chopper Assessment

| Metric | Pre-forms | Post-forms | Change |
|---|---:|---:|---:|
| Final boards / presence | 2,450 / 30.63% | 2,446 / 30.58% | -4 / -0.05 pp |
| Top four (95% CI) | 51.18% (49.20–53.16) | 55.31% (53.34–57.28) | +4.13 pp |
| Conditional wins (95% CI) | 14.98% (13.62–16.45) | 16.39% (14.98–17.91) | +1.41 pp |
| Average placement | 4.431 | 4.203 | -0.228 better |
| Winner presence | 36.7% | 40.1% | +3.4 pp |
| Current same-cost deltas | — | +10.82 pp top four; +6.01 pp wins; -0.595 placement | — |

Chopper was deployed on 55,447 player battle boards; 51,644 (93.14%) had a frozen active Straw Hat tier. Those boards contained 64,258 eligible combatants. Monster Point transformed 56,566 times across 47,469 player battle boards and all 1,000 matches: 88.03% of eligible appearances and 0.751 transforms per PvP battle. A further 7,691 eligible Choppers died before the trigger; one battle ended with an eligible combatant neither dead nor transformed, so the observed survival-to-trigger accounting is near-exact rather than fabricated as exact.

Post-transform Monster Point recorded 54,837 casts across 56,566 source phases, 1.51 targets and 377.2 ability damage per cast, 33,305 kills, and 68,909 stuns. Classification: **OVERPERFORMING SIGNAL**. Reach is broad and Chopper moved positively across all requested outcomes, but the result is still composition-confounded and weaker as an isolated same-cost alarm than Smoker.

## 9. Full Roster Results

Rates are conditional on appearing on a final board. Placement delta is current unit average minus its cost band; negative is better.

| Unit | Cost | Final boards | Top 4 | Win | Avg place | Winner presence | Top-4 Δ | Win Δ | Place Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Nami | 1 | 3,170 | 33.6% | 5.5% | 5.394 | 17.5% | -10.9 pp | -4.9 pp | +0.596 |
| Usopp | 1 | 2,966 | 38.4% | 7.3% | 5.125 | 21.6% | -6.1 pp | -3.1 pp | +0.328 |
| Chopper | 1 | 2,446 | 55.3% | 16.4% | 4.203 | 40.1% | +10.8 pp | +6.0 pp | -0.595 |
| Tashigi | 1 | 2,276 | 54.2% | 14.9% | 4.269 | 33.8% | +9.7 pp | +4.5 pp | -0.528 |
| Koby | 1 | 1,741 | 49.7% | 12.8% | 4.500 | 22.3% | +5.2 pp | +2.4 pp | -0.297 |
| Koala | 1 | 1,825 | 41.9% | 7.9% | 4.968 | 14.5% | -2.6 pp | -2.4 pp | +0.170 |
| Sanji | 2 | 2,302 | 47.4% | 9.7% | 4.666 | 22.3% | -1.5 pp | -2.3 pp | +0.132 |
| Robin | 2 | 3,239 | 38.6% | 7.4% | 5.080 | 24.0% | -10.3 pp | -4.6 pp | +0.546 |
| Smoker | 2 | 1,588 | 66.1% | 21.5% | 3.640 | 34.2% | +17.1 pp | +9.5 pp | -0.894 |
| Sabo | 2 | 2,048 | 48.0% | 12.6% | 4.530 | 25.9% | -0.9 pp | +0.6 pp | -0.004 |
| Franky | 2 | 2,352 | 59.8% | 17.6% | 3.965 | 41.4% | +10.9 pp | +5.6 pp | -0.569 |
| Brook | 2 | 2,281 | 51.4% | 11.0% | 4.426 | 25.0% | +2.5 pp | -1.0 pp | -0.109 |
| Ivankov | 2 | 2,106 | 39.6% | 8.6% | 4.982 | 18.2% | -9.3 pp | -3.4 pp | +0.448 |
| Luffy | 3 | 617 | 77.6% | 26.3% | 3.149 | 16.2% | +14.6 pp | +8.9 pp | -0.685 |
| Zoro | 3 | 2,274 | 61.2% | 13.5% | 3.964 | 30.6% | -1.8 pp | -3.9 pp | +0.130 |
| Kid | 3 | 957 | 63.7% | 12.4% | 3.918 | 11.9% | +0.7 pp | -5.0 pp | +0.085 |
| Crocodile | 3 | 1,869 | 47.8% | 10.3% | 4.591 | 19.2% | -15.2 pp | -7.1 pp | +0.757 |
| Jinbe | 3 | 2,410 | 67.9% | 21.7% | 3.560 | 52.3% | +4.8 pp | +4.3 pp | -0.274 |
| Kuma | 3 | 1,855 | 69.1% | 23.5% | 3.451 | 43.5% | +6.1 pp | +6.0 pp | -0.383 |
| Law | 4 | 555 | 75.9% | 24.7% | 3.117 | 13.7% | -1.2 pp | -5.7 pp | +0.119 |
| Ace | 4 | 600 | 75.3% | 29.8% | 3.082 | 17.9% | -1.8 pp | -0.6 pp | +0.084 |
| Hancock | 4 | 454 | 73.3% | 28.6% | 3.185 | 13.0% | -3.8 pp | -1.8 pp | +0.187 |
| Doflamingo | 4 | 487 | 70.0% | 22.8% | 3.415 | 11.1% | -7.1 pp | -7.6 pp | +0.417 |
| Kizaru | 4 | 717 | 81.7% | 34.9% | 2.728 | 25.0% | +4.6 pp | +4.5 pp | -0.270 |
| Kuzan | 4 | 751 | 75.8% | 33.2% | 3.003 | 24.9% | -1.3 pp | +2.8 pp | +0.005 |
| Akainu | 4 | 890 | 82.2% | 33.5% | 2.756 | 29.8% | +5.1 pp | +3.1 pp | -0.242 |
| Garp | 5 | 291 | 97.9% | 64.3% | 1.536 | 18.7% | +0.4 pp | +3.2 pp | -0.075 |
| Mihawk | 5 | 115 | 98.3% | 60.0% | 1.600 | 6.9% | +0.7 pp | -1.1 pp | -0.011 |
| Shanks | 5 | 118 | 99.2% | 56.8% | 1.610 | 6.7% | +1.6 pp | -4.3 pp | 0.000 |
| Blackbeard | 5 | 95 | 93.7% | 57.9% | 1.853 | 5.5% | -3.9 pp | -3.2 pp | +0.242 |

## 10. Top Movers

| Metric | Largest movements vs pre-forms (before N → after N) |
|---|---|
| Top four | Ace -5.29 pp (578→600); Chopper +4.13 pp (2,450→2,446); Tashigi -2.37 pp (2,292→2,276); Hancock -2.35 pp (428→454) |
| Conditional win | Shanks -12.69 pp (95→118); Mihawk +9.06 pp (106→115); Garp -7.90 pp (273→291); Blackbeard +3.73 pp (72→95) |
| Average placement | Ace +0.244 worse (578→600); Chopper -0.228 better (2,450→2,446); Mihawk -0.193 better (106→115); Shanks +0.137 worse (95→118) |
| Winner presence | Chopper +3.4 pp (2,450→2,446); Koby -3.4 pp (1,751→1,741); Brook -2.4 pp (2,253→2,281); Crocodile -2.1 pp (1,858→1,869) |

Large 5-cost percentage swings arise from only 72–291 observations and are not confirmed balance findings. Chopper is the strongest coherent multi-metric mover with a large sample. Ace moved negatively, but its current same-cost results are near neutral rather than an isolated alarm.

## 11. Existing Watchlist Reassessment

- **Smoker — STILL CLEARLY OVERPERFORMING.** On 1,588 boards: 66.06% top four, 21.54% wins, 3.640 placement, 34.2% winner presence; same-cost deltas +17.13 pp, +9.54 pp, and -0.894. Versus pre-forms, these improved by +1.26 pp, +1.16 pp, -0.067 placement, and +1.9 pp. This is the clearest high-confidence unit signal.
- **Nami, Crocodile, Ivankov:** remain coherent negative same-cost signals. Crocodile is the deepest (-15.21 pp top four, -7.13 pp wins, +0.757 placement); Nami and Ivankov remain materially below their bands.
- **Doflamingo:** remains negative (-7.08 pp top four, -7.61 pp wins, +0.417 placement), with only 487 boards.
- **Shanks / Blackbeard:** 118 / 95 boards. Their large conditional-rate movement is low-sample; Shanks no longer shows the prior positive win movement. Both remain inconclusive rather than tuning alarms.
- **Sabo / Ace:** near their current cost bands overall; prior alarms do not persist. Ace's before/after decline merits observation, not isolated action.
- **Zoro / Kid:** mild-negative or mixed versus their cost band, without a coherent new alarm.

## 12. Traits / Emperor

| Trait | Match reach | Δ vs pre-forms | Activation rate |
|---|---:|---:|---:|
| Straw Hat | 100.0% | 0.0 pp | 73.502% |
| Navy | 99.9% | 0.0 pp | 22.896% |
| Warlord | 48.5% | +4.5 pp | 1.750% |
| Supernova | 79.4% | +1.9 pp | 5.127% |
| Brotherhood | 52.2% | -1.3 pp | 2.701% |
| Revolutionary | 100.0% | 0.0 pp | 66.312% |
| Emperor | 20.1% | +2.5 pp | 0.472% |
| Captain | 36.5% | +1.8 pp | 1.435% |
| Brawler | 100.0% | 0.0 pp | 28.071% |
| Swordsman | 99.4% | +0.2 pp | 15.262% |
| Marksman | 84.0% | +0.1 pp | 5.288% |
| Specialist | 100.0% | 0.0 pp | 24.921% |
| Guardian | 100.0% | 0.0 pp | 28.026% |

No trait became effectively absent. Warlord's +4.5 pp match reach is the largest change, while absolute activation remains 1.75%.

Emperor was active on 1,021 player battle boards in 201 matches, versus 813 boards / 176 matches. Exact Tier 1 occurred on 999 boards in 201 matches; exact Tier 2 occurred on 22 boards in 9 matches, versus zero. Emperor + Captain occurred on 358 boards / 84 matches, versus 295 / 65. Tier 1 remains meaningfully reachable and Tier 2 remains rare; this is not itself a problem.

## 13. Shop / Pool / Cost Bands

Empty shop slots remained zero across 1,297,068 observed slots. No broad physical-pool exhaustion regression appeared. Per-definition zero availability was 14.474%, 1.226%, 0.222%, 0.002%, and 0% from costs 1–5; changes were at most +0.156 pp. Average available copies per definition changed by only +0.011, 0.000, -0.019, -0.046, and -0.023.

| Cost | Final-board representation (Δ) | Player presence (Δ) | 2★+ share of final crew (Δ) |
|---:|---:|---:|---:|
| 1 | 31.77% (-0.24 pp) | 93.60% (-0.51 pp) | 92.9% (+0.2 pp) |
| 2 | 35.06% (-0.18 pp) | 95.80% (+0.21 pp) | 77.5% (+0.5 pp) |
| 3 | 21.99% (-0.22 pp) | 79.10% (+0.09 pp) | 59.7% (+0.5 pp) |
| 4 | 9.81% (+0.49 pp) | 40.40% (+2.34 pp) | 29.0% (+0.6 pp) |
| 5 | 1.36% (+0.15 pp) | 7.17% (+0.94 pp) | 12.7% (+0.9 pp) |

High-cost representation rose modestly but remains scarce. Shop offer rates moved by at most 0.28 pp per slot and do not show a structural regression.

## 14. Combat Expression / Readability

Pilot rates use source-phase appearances, so temporary Chopper denominators do not imply whole-battle Monster Point presence.

| Identity | Source phases | Casts | Casts/source | Targets/cast | Damage/cast | Kills | Stuns | Control/cast |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Chopper base | 69,069 | 39,921 | 0.58 | 1.00 | 0.0 | 3,943 | 0 | 0.00 |
| Monster Point | 56,566 | 54,837 | 0.97 | 1.51 | 377.2 | 33,305 | 68,909 | 1.26 |
| Robin base | 50,713 | 69,493 | 1.37 | 1.00 | 232.1 | 31,860 | 54,507 | 0.78 |
| Demonio Fleur | 3,737 | 7,261 | 1.94 | 1.72 | 568.3 | 5,605 | 9,969 | 1.37 |
| Luffy base | 9,353 | 16,572 | 1.77 | 1.65 | 319.9 | 8,895 | 0 | 1.15 |
| Boundman | 26 | 86 | 3.31 | 1.00 | 269.1 | 56 | 65 | 1.14 |
| Snakeman | 11 | 26 | 2.36 | 1.00 | 350.5 | 29 | 0 | 0.00 |

| Per PvP battle | Pre-forms | Post-forms | Change |
|---|---:|---:|---:|
| Casts | 16.871 | 16.495 | -2.2% |
| Cast targets | 26.452 | 26.434 | -0.1% |
| Multi-target casts | 4.846 | 5.123 | +5.7% |
| Ability-hit events | 1.829 | 1.817 | -0.6% |
| Stuns | 5.643 | 6.559 | +16.2% |
| Burns | 1.229 | 1.210 | -1.5% |
| Displacements | 10.299 | 10.105 | -1.9% |
| Energy Drain events | 3.669 | 3.684 | +0.4% |
| Control events | 19.611 | 20.349 | +3.8% |
| All-enemy casts | 1.091 | 1.078 | -1.2% |
| Defense-pierce casts | 0.162 | 0.187 | +15.2% |

The clearest density change is +0.916 stuns per PvP battle. Demonio adjacent control and Monster Point adjacent stuns plausibly contribute, while Gear 4 volume is too small to explain much; aggregated diagnostics do not establish causation. Total `unit-transform` volume was 56,566, equal to 0.751 per PvP battle and 88.03% of eligible Chopper appearances.

## 15. Limitations

This is a deterministic same-seed environment comparison, not a randomized experiment. Multiple form pilots entered between snapshots. Unit presence is conditional and composition-confounded; persistent forms are selected by star/equipment state; temporary-form outcomes include trigger-survival selection. Form-aware metrics improve attribution but do not remove those limitations. Very small Gear 4 and 5-cost samples support reachability observations, not confident balance conclusions.

## 16. Overall Classification

**B — SPECIFIC BALANCE FOLLOW-UP WARRANTED.** System health is stable-to-improved, all forms function in production, and no reachability defect outranks balance evidence. Smoker remains the strongest coherent, high-sample same-cost outlier. Monster Point/Chopper is a secondary positive watch; Gear 4 needs more natural observations before branch-specific tuning.

## 17. Next Recommended Bounded Task

Perform one isolated Smoker adjustment. Do not combine it with Chopper, form reachability, timeout, traits, shop/pool, or other roster tuning.
