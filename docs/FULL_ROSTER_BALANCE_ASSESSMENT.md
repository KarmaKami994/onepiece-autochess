# Full Roster Balance & Combat Readability Assessment

## Executive Summary

- The production simulation completed 1,000/1,000 deterministic matches with no crashes. Overall runtime health is stable, but the average full-clock estimate is 32.22 minutes and therefore misses the existing 20–30 minute target; the paced estimate is 22.31 minutes.
- Sabo is the clearest same-cost positive outlier: 71.15% top-four rate, 28.09% conditional win rate, and 3.29 average placement across 2,218 final-board observations. Those results are +21.77 and +14.44 percentage points above the 2-cost band for top-four and win rate.
- Luffy's earlier positive signal is also supported: 74.06% top-four, 30.15% conditional wins, and 3.16 average placement across 1,642 observations, materially ahead of the 3-cost band.
- Robin is the clearest negative outlier: 37.49% top-four, 7.14% conditional wins, and 5.13 average placement across 3,654 observations, all materially worse than the 2-cost band. Nami is the corresponding negative 1-cost signal.
- Ace is a positive 4-cost watch item and appears on 68.1% of winning boards, exceeding the existing 65% winner-presence guardrail. Presence association is not proof that Ace caused those wins.
- Garp performs better than Mihawk within the two-unit 5-cost band, especially on conditional wins (53.08% versus 44.05%), but their 616 and 395 final-board samples are much smaller than the rest of the roster and their scarcity/composition context is different.
- PvP combat is event-dense: 13.30 casts, 3.83 multi-target casts, 7.73 displacements, and 19.87 defined control events per battle. These counts do not prove visual overload, but generic pull/knockback movement and unattributed Energy Drain become more consequential at this density.
- The next bounded balance task should test one small Sabo ability-impact reduction in isolation. The highest-value bounded readability follow-up is to distinguish pull from knockback using the existing `movementKind` signal.

## Methodology

The assessment uses 1,000 deterministic production seeds (`production-0` through `production-999`) from source Git SHA `46849a828657e7f99d195bfe10eba1f10fa0c56b`. Content version is `1.8.0`, save schema is `6`, and the content hash is `8d46381f` (configuration hash `977295da`). The exact machine-readable result is stored in [`analysis/full-roster-balance-1000.json`](analysis/full-roster-balance-1000.json).

A final-board observation means a unique roster definition on a player's last deployed board. Duplicate copies of the same definition count once. It is not lifetime ownership. Top four means final placement 1–4. Conditional win rate is winning final-board observations divided by all final-board observations containing that unit. Cost-band metrics aggregate the same observations for units of one cost; signed deltas compare a unit with that band. A negative placement delta is better because lower placement is better.

Top-four and conditional-win uncertainty uses a dependency-free 95% Wilson interval with `z = 1.96`. Human-facing values below are rounded; the JSON retains generated numeric precision. Exact tables are used instead of charts because this is one cross-sectional snapshot and the primary review need is peer lookup across 18 units.

Combat-expression metrics use existing events from actual PvP stages. `BattleResult.initialUnits` maps event sources to roster definitions; non-roster units and ghost-team sources are excluded from character attribution so player battle-board exposure remains counted once per alive player and round. Global readability totals include complete PvP battle results, including ghost matchups. Energy-drain events expose the affected unit but not the caster, so drain is measurable only globally without an event-schema change.

These are associations, not causal estimates. Bot preferences, traits, economy, star levels, items, positioning, and team compositions can confound unit-level results. A last-board unit may be a beneficiary of a strong composition rather than its cause; cost-band observations are also not mutually exclusive because one board contains several units.

## Match Health

| Metric | Result | Existing target | Status |
| --- | ---: | --- | --- |
| Complete matches | 1,000 / 1,000 | Complete requested run | PASS |
| Crashes | 0 | 0 | PASS |
| Average rounds | 34.97 (range 27–51) | None; diagnostic | Diagnostic |
| Full-clock minutes | 32.22 | 20–30 minutes | FAIL |
| Paced minutes | 22.31 | None; diagnostic | Diagnostic |
| Overall battle count | 138,068 | None; diagnostic | Diagnostic |
| Timeout rate | 0.126% | None; diagnostic | Diagnostic |
| Draw rate | 0.064% | None; diagnostic | Diagnostic |

The match-length miss is small in absolute terms but stable over this sample. No new pass/fail threshold is inferred for rounds, paced time, timeouts, or draws.

## Cost-Band Overview

| Cost | Units | Final-board observations | Top-four rate | Conditional win rate | Average placement |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | nami, usopp, chopper, tashigi | 9,790 | 31.34% | 5.55% | 5.52 |
| 2 | sanji, robin, smoker, sabo | 11,071 | 49.38% | 13.65% | 4.49 |
| 3 | luffy, zoro, kid, crocodile | 10,874 | 57.15% | 14.41% | 4.12 |
| 4 | law, ace, hancock, doflamingo | 10,327 | 67.19% | 20.23% | 3.58 |
| 5 | garp, mihawk | 1,011 | 90.50% | 49.55% | 2.13 |

Outcome rates rise monotonically with cost in this bot environment, which is directionally consistent with higher-cost scarcity and late-game acquisition. This is descriptive, not evidence that bands should converge: acquisition timing, survival bias, and board strength differ systematically by cost. The 5-cost band is especially unlike the others because it has only two members and far fewer observations.

## Full Roster Table

| Unit | Cost | Final boards | Final-board presence | Top-four rate | Top-four 95% CI | Conditional win rate | Win 95% CI | Avg. placement | Win delta vs band |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- | ---: | ---: |
| chopper | 1 | 2,363 | 29.54% | 33.01% | 31.14–34.93% | 6.05% | 5.16–7.09% | 5.46 | +0.51 pp |
| nami | 1 | 2,788 | 34.85% | 25.29% | 23.71–26.93% | 3.95% | 3.28–4.73% | 5.86 | -1.60 pp |
| tashigi | 1 | 2,018 | 25.22% | 41.82% | 39.69–43.99% | 7.58% | 6.51–8.82% | 4.95 | +2.04 pp |
| usopp | 1 | 2,621 | 32.76% | 28.20% | 26.51–29.95% | 5.23% | 4.44–6.15% | 5.66 | -0.32 pp |
| robin | 2 | 3,654 | 45.68% | 37.49% | 35.94–39.08% | 7.14% | 6.35–8.02% | 5.13 | -6.51 pp |
| sabo | 2 | 2,218 | 27.72% | 71.15% | 69.22–72.99% | 28.09% | 26.26–30.00% | 3.29 | +14.44 pp |
| sanji | 2 | 2,977 | 37.21% | 44.84% | 43.07–46.64% | 13.20% | 12.03–14.46% | 4.75 | -0.45 pp |
| smoker | 2 | 2,222 | 27.78% | 53.29% | 51.21–55.35% | 10.53% | 9.32–11.88% | 4.31 | -3.12 pp |
| crocodile | 3 | 3,232 | 40.40% | 57.67% | 55.96–59.37% | 13.30% | 12.18–14.52% | 4.09 | -1.11 pp |
| kid | 3 | 2,438 | 30.48% | 53.12% | 51.13–55.09% | 10.42% | 9.27–11.69% | 4.35 | -3.99 pp |
| luffy | 3 | 1,642 | 20.52% | 74.06% | 71.88–76.12% | 30.15% | 27.97–32.41% | 3.16 | +15.74 pp |
| zoro | 3 | 3,562 | 44.52% | 51.63% | 49.99–53.27% | 10.89% | 9.91–11.96% | 4.44 | -3.52 pp |
| ace | 4 | 2,482 | 31.02% | 72.64% | 70.86–74.36% | 27.44% | 25.72–29.23% | 3.24 | +7.21 pp |
| doflamingo | 4 | 2,581 | 32.26% | 63.70% | 61.82–65.53% | 16.78% | 15.38–18.27% | 3.79 | -3.45 pp |
| hancock | 4 | 2,484 | 31.05% | 66.22% | 64.34–68.06% | 19.20% | 17.70–20.80% | 3.61 | -1.03 pp |
| law | 4 | 2,780 | 34.75% | 66.44% | 64.66–68.17% | 17.91% | 16.53–19.38% | 3.65 | -2.31 pp |
| garp | 5 | 616 | 7.70% | 91.23% | 88.74–93.22% | 53.08% | 49.14–56.99% | 2.06 | +3.53 pp |
| mihawk | 5 | 395 | 4.94% | 89.37% | 85.94–92.04% | 44.05% | 39.24–48.98% | 2.24 | -5.50 pp |

## High-Confidence Watchlist

### Potentially overtuned

- **Sabo:** The signal is large and internally consistent: top-four is +21.77 pp versus the 2-cost band, conditional wins are +14.44 pp, and average placement is 1.21 places better. The 2,218-observation sample and narrow Wilson intervals make random sample noise an implausible explanation, although composition causality remains unresolved.
- **Luffy:** The earlier signal persists at 1,642 observations: +16.91 pp top-four, +15.74 pp conditional wins, and 0.96 better average placement versus 3-cost peers. Lower final-board presence than his peers does not make the result untrustworthy; it does make selection/survival confounding important.
- **Ace:** Ace leads the 4-cost band on top-four, conditional wins, and placement, with a +7.21 pp win delta. His 681 winning-board appearances equal 68.1% of matches and trip the existing 65% guardrail. This supports a watch item, not an automatic nerf.
- **Tashigi:** Tashigi is the positive 1-cost peer outlier (+10.49 pp top-four and 0.57 better placement), but the absolute conditional win rate is only 7.58%. Treat this as a same-cost signal rather than a cross-cost power claim.

### Potentially undertuned

- **Robin:** Robin is well sampled yet trails the 2-cost band by 11.89 pp top-four and 6.51 pp conditional wins, with placement 0.63 worse. This is the strongest negative evidence in the roster.
- **Nami:** Nami trails the 1-cost band by 6.05 pp top-four and 1.60 pp conditional wins, with placement 0.34 worse across 2,788 observations.
- **Zoro and Kid:** Both are below the 3-cost band on top-four, conditional wins, and placement. Zoro has the larger top-four/placement deficit; Kid has the slightly larger win deficit. These are secondary signals behind Robin because Luffy materially elevates their shared band baseline.
- **Doflamingo:** The 4-cost result is mildly negative (+0.21 worse placement and -3.45 pp conditional wins), but much smaller than the Robin gap.

### Insufficient evidence / sample-sensitive

No roster unit has a zero or tiny final-board denominator; the minimum is Mihawk at 395 observations, and all displayed Wilson intervals are informative. Garp and Mihawk remain the most sample-sensitive comparison because their counts are far below other units and the 5-cost band contains only those two units. Garp's conditional-win interval (49.14–56.99%) sits just above Mihawk's (39.24–48.98%), supporting Garp as the stronger observed 5-cost outcome, but not proving that either ability alone causes the gap.

The previous watches resolve as follows: **Luffy supported**, **Sabo strongly supported**, **Garp supported only as stronger than Mihawk within the sparse 5-cost comparison**, and **Mihawk not globally weak but relatively behind Garp**. Mihawk's 89.37% top-four rate and 2.24 placement do not support a broad undertuned claim.

## Combat Expression

| Unit | Casts / battle-board appearance | Targets / cast | Ability damage / cast | Stuns | Displacements | Control events / cast | Why it matters |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| sabo | 1.55 | 1.47 | 324 | 96,616 | 0 | 1.31 | Strong outcomes coincide with repeatable multi-target stun expression. |
| luffy | 1.98 | 1.49 | 361 | 0 | 47,559 knockbacks | 0.93 | Highest listed cast frequency plus frequent displacement increases visible impact density. |
| robin | 1.38 | 1.00 | 252 | 67,185 | 0 | 0.76 | Robin is casting and controlling regularly despite weak placement outcomes; low results are not explained by absent expression alone. |
| ace | 1.62 | 1.52 | 578 | 0 | 45,501 knockbacks | 0.97 | Positive outcomes pair damage with burn (57,887 applications) and displacement. |
| law | 1.34 | 5.47 | 1,163 | 0 | 163,300 pulls | 4.45 | Large-area target and pull density makes generic movement readability especially relevant. |
| hancock | 1.62 | 5.09 | 1,483 | 184,169 | 0 | 4.55 | All-enemy stun creates the highest listed explicit CC density. |
| garp | 1.50 | 5.50 | 1,782 | 0 | 23,136 knockbacks | 3.33 | The reworked all-enemy impact expresses as broad damage plus displacement, not stun. |
| mihawk | 1.28 | 1.48 | 1,007 | 0 | 0 | 0.00 | The line/pierce identity produces damage but no event-level cue that distinguishes defense pierce. |

Ability damage per cast is not directly comparable across target patterns or costs, and heal/shield events can arise from traits or items attributed to their acting source. These expression counters explain what occurred, not which mechanic caused the placement result.

## Combat Readability

Across 78,467 PvP battles, the runner recorded 1,043,816 casts (13.30/battle), 1,694,814 cast targets (21.60/battle), 300,880 multi-target casts (3.83/battle), and 191,585 sequential ability-hit events (2.44/battle). Status density was 6.22 stuns, 1.71 burns, and 1.78 emergency shields per battle. Displacement density was 0.58 lunges, 3.84 knockbacks, and 3.31 pulls per battle. Energy Drain occurred 5.92 times per battle for 71.25 effective energy removed per battle.

The defined control-density indicator—stuns plus successful displacements plus Energy Drain events—is 19.87 events per PvP battle. This is mechanically busy, but there is no validated threshold that makes the count inherently bad. The static audit instead identifies where this density is likely to become ambiguous:

| Mechanic | Current presentation | Classification | Readability concern |
| --- | --- | --- | --- |
| Lunge | Rapid movement plus a dedicated slash trail when particles/motion are enabled | A. distinct visible cue | Reduced-motion mode necessarily retains movement without the trail. |
| Knockback | Generic short positional tween | C. state changes, source/mechanic may be ambiguous | Shares the same movement treatment as pull despite 3.84 events per PvP battle. |
| Pull | Generic short positional tween | C. state changes, source/mechanic may be ambiguous | Direction changes position, but there is no pull-specific visual; 3.31 events occur per battle. |
| Sequential ability hits | Timed `ability-hit` offsets, per-hit impact/slash and damage floaters; finisher slash can be wider | A. distinct visible cue | Simultaneous effects may still compete during high AoE density, but sequence timing is explicit. |
| Stun | Dedicated `✦` status icon with duration tracking | A. distinct visible cue | All-enemy casts can place many icons at once; source attribution relies on the cast telegraph. |
| Burn | Dedicated fire icon plus ordinary periodic damage presentation | A. distinct visible cue | Damage itself remains generic, but the persistent state is distinct. |
| Energy Drain | Victim energy bar decreases; selector has no caster source for the drain | C. state changes, source/mechanic may be ambiguous | No label or source-to-target cue; attribution is impossible from the current event alone. |
| Heal | Dedicated heal VFX and green positive-number floater | A. distinct visible cue | Low concern in the inspected path. |
| Shield | Dedicated shield VFX, blue `SHIELD` floater, and shield bar | A. distinct visible cue | Low concern in the inspected path. |
| Defense Pierce | Ordinary cast/damage presentation only; no pierce event, status, label, or VFX | D. effectively no dedicated cue | Mihawk's damage can be seen, but the defense-piercing reason cannot. |

## Recommended Next Actions

1. **BALANCE:** Test one small reduction to Sabo's ability impact in an isolated balance PR; change one lever only and rerun the same production diagnostics.
2. **BALANCE:** Keep Luffy as the next independent balance candidate if the Sabo-isolated result does not explain the 3-cost composition signal; do not tune both together.
3. **READABILITY:** Differentiate pull from knockback using the already available `movementKind`, prioritizing source/direction clarity without changing mechanics.
4. **READABILITY:** Add a dedicated Defense Pierce cue; separately scope Energy Drain attribution because current events do not identify the caster.
5. **MEASUREMENT:** Add star-level and composition/trait stratification before attributing the remaining unit deltas causally.
