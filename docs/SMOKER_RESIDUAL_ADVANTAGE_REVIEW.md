# Smoker Residual-Advantage Decision Review

## 1. Executive Decision

**C — TARGETED DIAGNOSTICS FIRST.** Smoker remains a strong 2-cost outcome signal, but the current evidence does not justify a responsible third gameplay change. His current top-four rate is 61.2717%, conditional win rate is 20.1028%, and average placement is 3.868979. Those values remain well above the full 2-cost band, yet Smoker is only modestly above the strongest comparable peer, Franky: +2.1634 percentage points top four, +3.6696 points conditional wins, and 0.152253 better placement.

Franky's stronger raw stats, faster basic cadence, higher ability power, and higher measured casts, targets, damage, and control per cast rule out a simple conclusion that Smoker's remaining advantage comes from excessive raw combat values. The current snapshot has aggregate trait reachability but no Smoker outcome split by active Navy or Guardian state. A third lever would therefore conflate intrinsic unit strength with team composition and selective retention.

## 2. Evidence Scope

No new simulation was run. This review uses only committed evidence:

- `docs/analysis/30-unit-roster-assessment-1000.json`: historical White Blow 210 context, GameContent 1.11.0.
- `docs/analysis/smoker-white-blow-180-1000.json`: historical damage intervention, GameContent 1.11.1.
- `docs/analysis/post-forms-roster-assessment-1000.json`: current-roster 180-power / 1200ms baseline, GameContent 1.15.0.
- `docs/analysis/smoker-cadence-1400-1000.json`: authoritative current state, GameContent 1.15.1.
- `docs/SMOKER_BALANCE_PASS.md` and `docs/SMOKER_CADENCE_BALANCE_PASS.md` for provenance and prior decisions.

The strongest causal comparison is the post-forms 1200ms versus 1400ms pair: same roster, forms, diagnostics, configuration hash, seed range, and one isolated gameplay value. The older 210-to-180 comparison remains useful intervention evidence, but it belongs to an older roster environment and is not treated as one continuous controlled experiment with the cadence pass.

Current baseline is main `76609beeb6e34277f000eb3a95405dad40bf39c6`, GameContent `1.15.1`, save schema `6`, 30 base units, and four production forms. Smoker remains 2-cost Navy / Guardian with White Blow power `180`, nearest-enemy line targeting, knockback, and `1400ms` attack cadence.

## 3. Smoker Intervention History

| Metric | 210 power | 180 power | Damage-pass movement | 180 / 1200ms | 180 / 1400ms | Cadence-pass movement |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Top-four rate | 65.8260% | 64.8359% | -0.9901 pp | 66.0579% | 61.2717% | -4.7863 pp |
| Conditional win rate | 21.6898% | 20.7702% | -0.9196 pp | 21.5365% | 20.1028% | -1.4338 pp |
| Average placement | 3.636192 | 3.705177 | +0.068985 | 3.640428 | 3.868979 | +0.228551 |
| Winner presence | 34.4% | 32.9% | -1.5 pp | 34.2% | 31.3% | -2.9 pp |
| Casts / battle-board appearance | 2.077512 | 2.086908 | +0.009396 | 1.996312 | 1.815074 | -0.181239 |
| Ability damage / cast | 278.428693 | 241.960584 | -36.468108 | 241.145215 | 244.274967 | +3.129753 |
| Knockbacks / cast | 0.723317 | 0.735183 | +0.011866 | 0.735850 | 0.740848 | +0.004998 |
| Total casts | 58,858 | 58,327 | -531 | 57,384 | 49,635 | -7,749 |
| Total knockbacks | 42,573 | 42,881 | +308 | 42,226 | 36,772 | -5,454 |

The damage intervention strongly changed damage per cast while frequency and knockback density did not fall; outcomes moved modestly. The cadence intervention materially reduced casts and total knockbacks while per-cast damage and knockback density remained stable; it produced materially greater top-four and placement movement. This is qualitative intervention evidence, not a precision estimate across the two different roster environments.

## 4. Current 2-Cost Peer Table

All values below come from `smoker-cadence-1400-1000.json`.

| Unit | Final boards | Final-board presence | Top four | Top-four 95% CI | Conditional win | Win 95% CI | Avg placement | Winner presence | Battle-board appearances |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Sanji | 2,304 | 28.8000% | 47.9167% | 45.8819–49.9583% | 10.6337% | 9.4398–11.9586% | 4.605903 | 24.5% | 36,050 |
| Robin | 3,220 | 40.2500% | 39.3168% | 37.6433–41.0157% | 6.8012% | 5.9821–7.7233% | 5.066770 | 21.9% | 44,257 |
| **Smoker** | **1,557** | **19.4625%** | **61.2717%** | **58.8271–63.6608%** | **20.1028%** | **18.1867–22.1660%** | **3.868979** | **31.3%** | **27,346** |
| Sabo | 2,053 | 25.6625% | 48.0273% | 45.8718–50.1901% | 12.5183% | 11.1564–14.0201% | 4.509011 | 25.7% | 32,441 |
| Franky | 2,355 | 29.4375% | 59.1083% | 57.1094–61.0775% | 16.4331% | 14.9913–17.9843% | 4.021231 | 38.7% | 39,944 |
| Brook | 2,284 | 28.5500% | 52.5832% | 50.5327–54.6250% | 11.6462% | 10.3946–13.0267% | 4.391856 | 26.6% | 36,528 |
| Ivankov | 2,097 | 26.2125% | 40.8679% | 38.7824–42.9868% | 8.7744% | 7.6376–10.0620% | 4.942299 | 18.4% | 29,368 |

## 5. Strong-Peer Comparison

Smoker is **modestly above the strong peer cluster**, not clearly separated from it across every metric. Against Franky, Smoker is +2.1634 pp top four, +3.6696 pp conditional wins, and 0.152253 better in average placement. Their top-four Wilson intervals overlap by 2.2504 pp. Their win intervals narrowly do not overlap: Franky's upper bound is 17.9843% and Smoker's lower bound is 18.1867%, a 0.2025 pp gap.

That is a coherent residual advantage, but much smaller than Smoker's +12.3744 pp top-four and +8.3132 pp win deltas versus the whole cost band. Franky is already a healthy strong comparator, and Brook forms a second, lower strong-peer reference. The peer context weakens the claim that Smoker is still clearly outside a reasonable strong-unit range.

## 6. Smoker vs Franky Kit Comparison

| Unit | HP | ATK | DEF | Range | Attack / move | Traits | Ability | Target / pattern | Control |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| Sanji | 720 | 68 | 22 | 1 | 900 / 400ms | Straw Hat, Brawler | 235 Diable Jambe | nearest / single | burn, knockback |
| Robin | 620 | 48 | 16 | 4 | 1200 / 500ms | Straw Hat, Revolutionary, Specialist | 205 Clutch | lowest-health / single | 1200ms stun, 15 Energy drain |
| Smoker | 820 | 62 | 28 | 2 | 1400 / 500ms | Navy, Guardian | 180 White Blow | nearest / line | knockback |
| Sabo | 760 | 72 | 23 | 1 | 1000 / 400ms | Revolutionary, Brotherhood, Brawler | 190 Dragon Claw | nearest / adjacent | 600ms stun |
| Franky | 860 | 66 | 30 | 2 | 1150 / 500ms | Straw Hat, Guardian | 205 Coup de Vent | nearest / adjacent | knockback |
| Brook | 660 | 72 | 18 | 2 | 900 / 400ms | Straw Hat, Swordsman | 215 Soul Solid | farthest / line | 400ms stun |
| Ivankov | 700 | 52 | 20 | 3 | 1200 / 500ms | Revolutionary, Specialist | 260 Healing Hormone | lowest-health ally / single ally | heal; conditional shield |

Franky has +40 HP, +4 attack, +2 defense, the same range and move interval, a 250ms faster basic cadence, and +25 nominal ability power. Both are Guardians with knockback. Smoker's differentiators are Navy rather than Straw Hat and line rather than adjacent geometry. Because Franky's raw kit is stronger, the aggregate outcome gap does not support lowering Smoker's durability, basic attack, or ability power without first resolving composition effects.

## 7. Trait Context

Active trait effects are applied teamwide to every combatant. Distinct deployed base definitions determine the active tier.

| Trait | Tiers and teamwide effects | Current player-battle-board reach | Match reach |
| --- | --- | ---: | ---: |
| Navy | 2: +14 defense; 3: +28 defense and 100 shield | any: 48,544 / 22.4739%; tier 1: 36,278 / 16.7952%; tier 2: 12,266 / 5.6787% | any 999/1000; tier 2 827/1000 |
| Guardian | 2: +15 defense and 90 shield; 3: +32 defense and 220 shield | any: 59,545 / 27.5669%; tier 1: 36,709 / 16.9948%; tier 2: 22,836 / 10.5721% | any 1000/1000; tier 2 953/1000 |
| Straw Hat | 2: +10% health; 4: +15% health and +10% attack speed; 6: +25% health and +20% attack speed | any: 158,877 / 73.5535%; tier 1: 112,675 / 52.1639%; tier 2: 42,321 / 19.5929%; tier 3: 3,881 / 1.7967% | any 1000/1000; tier 3 513/1000 |

These are aggregate reachability facts. They do not show Smoker outcomes with Navy or Guardian active versus inactive and cannot establish trait causality. Franky's much more common Straw Hat context is also not directly comparable from aggregate reach alone.

## 8. Combat Expression and Geometry

| Unit | Casts / appearance | Avg targets / cast | Damage / cast | Control events / cast | Total knockbacks | Total stuns |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Smoker | 1.815074 | 1.290642 | 244.274967 | 0.740848 | 36,772 | 0 |
| Franky | 1.958417 | 1.595293 | 325.485766 | 1.097383 | 85,845 | 0 |
| Brook | 1.601894 | 1.270038 | 271.007007 | 1.126260 | 0 | 65,902 |

Smoker no longer stands out mechanically against these peers. Franky casts more often and reaches more targets, damage, and control per cast. Brook applies more control per cast and slightly more damage per cast, although he casts less often.

The generic line pattern traces a deterministic ray from the caster through the primary target to the board edge and affects enemies occupying cells on that ray, falling back to the primary target if necessary. Adjacent selects enemies within Chebyshev distance 1 of the primary target, a local 3×3 footprint. Line geometry can plausibly reach aligned enemies at greater depth, while adjacent can cover a denser local cluster. The current measurements do not show White Blow as broader or more reliable: Smoker averages 1.2906 targets per cast versus Franky's 1.5953. Line remains a plausible composition- and positioning-dependent differentiator, not a measured causal explanation.

## 9. Presence vs Conditional Performance

Smoker appears on only 19.4625% of final boards and 27,346 battle boards, versus Franky's 29.4375% and 39,944. Smoker's winner presence is also lower, 31.3% versus 38.7%, while his conditional top-four and win rates are higher. Winner presence answers how often winners contain a unit; conditional rates answer how often boards containing that unit succeed. They are not interchangeable.

The pattern is consistent with several possibilities that the current aggregates cannot separate: composition-specific value, selective retention in stronger teams, genuine intrinsic strength, or a mixture.

For context, the canonical seven-unit 2-cost band is 48.8973% top four, 11.7895% conditional wins, and 4.541462 average placement. Excluding Smoker, the six peers total 14,313 final boards, 6,806 top-four boards and 1,558 winning boards:

- top four = `6,806 / 14,313` = **47.5512%**;
- conditional wins = `1,558 / 14,313` = **10.8852%**;
- average placement = `sum(peer average placement × peer final boards) / 14,313` = `66,049 / 14,313` = **4.614616**.

Smoker raises the canonical band by 1.3461 pp top four and 0.9043 pp wins and improves average placement by 0.073154. Conversely, Robin and Ivankov's large samples and weak outcomes materially pull the band downward. This makes Smoker's band delta look substantially more extreme than his distance from Franky, without turning the peer weakness into a tuning conclusion.

## 10. Candidate Lever Review

| Candidate | Assessment | Reason |
| --- | --- | --- |
| Durability | **REJECT** | Smoker already has lower HP and defense than Franky; aggregate trait data cannot isolate survivability. |
| Attack/basic stat | **REJECT** | Smoker has lower attack and slower basic cadence than Franky and does not lead mechanical expression. |
| Further cadence | **WEAKLY SUPPORTED** | The prior cadence intervention caused meaningful movement, but current casts per appearance are below Franky's and do not identify excess cadence now. |
| White Blow damage | **REJECT** | The damage pass sharply reduced damage per cast with only modest outcomes; current damage per cast trails Franky and Brook. |
| White Blow geometry/control | **WEAKLY SUPPORTED** | Line is a plausible positioning differentiator, but observed targets and control per cast do not exceed the closest peers; changing it would also risk core identity. |
| No further change | **WEAKLY SUPPORTED** | Strong-peer context makes an immediate third nerf unsafe, but the narrowly separated win interval leaves a residual signal worth resolving. |
| Targeted diagnostics first | **SUPPORTED** | It directly addresses the missing composition/trait conditional needed to select or reject a third lever. |

White Blow, line geometry, knockback, Navy, and Guardian remain identity constraints; none should be removed on the present evidence.

## 11. Limitations

- Final-board unit outcomes are associative and composition-confounded, not causal estimates.
- The snapshot has no Smoker×Navy or Smoker×Guardian conditional outcome data.
- Aggregate trait reachability cannot attribute Smoker's outcomes to either trait.
- Selection and retention effects cannot be separated from intrinsic strength.
- The damage and cadence interventions occurred in different roster environments; only the cadence pair is the strongest current causal comparison.
- Combat-expression totals describe observed mechanics but do not measure positional value of line control directly.

## 12. Final Classification

**C — TARGETED DIAGNOSTICS FIRST.** Smoker remains suspiciously strong and is modestly above Franky, including a narrow non-overlap in conditional-win intervals. However, he is not clearly above the strong peer cluster across all metrics, does not lead the closest peers in raw stats or combat expression, and has materially lower presence. Existing evidence cannot distinguish Navy/Guardian composition effects and selective retention from intrinsic unit strength well enough to justify a specific third balance lever.

No gameplay change is implemented. GameContent remains `1.15.1`, save schema remains `6`, White Blow remains `180` / line / knockback, and Smoker's attack cadence remains `1400ms`.

## 13. Exactly One Next Task

Add one analysis-only production diagnostic that answers exactly this question: **How do Smoker's final-board top-four rate, conditional win rate, and average placement differ across active trait state—neither Navy nor Guardian, Navy only, Guardian only, and both—on boards containing Smoker?**

That diagnostic is not implemented in this PR and must not include a balance change.
