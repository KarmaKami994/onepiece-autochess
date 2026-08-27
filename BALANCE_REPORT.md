# Production balance audit — 2026-08-14 (historical release baseline)

This report is the last committed 1,000-seed balance baseline. Routine
hardening uses the 50-seed production smoke; a new dated 1,000-seed snapshot is
only committed for an intentional balance/release audit.

## Technical summary

The final deterministic production cohort passes all three release gates:

- 1,000 of 1,000 matches reached `game-over`; crashes: 0.
- Average full configured match clock: 28.74 minutes (target: 20–30).
- Highest winner-board presence: Chopper at 64.0% (limit: 65%).
- All 12 traits activated during battle; all eight items appeared in final ownership/equipment counts.
- Timeout rate: 0.071%; draw rate: 0.045% across 136,737 battles.

The versioned raw snapshot is
[`reports/production-soak-2026-08-14.json`](reports/production-soak-2026-08-14.json).
Its SHA-256 is
`49e93f81697db1a973f806b6c73e1215a3eda7d8f404b7991cb107a1e64c7cb2`.

## Release gates

| Gate | Result | Status |
|---|---:|---|
| Complete matches | 1,000 / 1,000 | Pass |
| Crashes | 0 | Pass |
| Average full clock | 28.74 min | Pass |
| Winner-board presence | 64.0% maximum | Pass |
| Traits reached | 12 / 12 | Pass |

The 64.0% maximum leaves only one percentage point of headroom. Human playtests
should therefore treat character presence as a watch metric rather than a
permanently solved balance question.

## Character distribution

`Winner presence` is the share of the 1,000 final winning deployed boards that
contained at least one copy of the character. `Conditional win rate` divides
that numerator by all eight players' last deployed boards containing the
character; it is sensitive to small denominators and is not a causal power
estimate.

| Character | Final boards | Winner boards | Winner presence | Conditional win rate |
|---|---:|---:|---:|---:|
| Chopper | 5,269 | 640 | 64.0% | 12.1% |
| Tashigi | 4,764 | 621 | 62.1% | 13.0% |
| Usopp | 5,305 | 577 | 57.7% | 10.9% |
| Sabo | 2,336 | 538 | 53.8% | 23.0% |
| Nami | 5,308 | 509 | 50.9% | 9.6% |
| Zoro | 3,173 | 499 | 49.9% | 15.7% |
| Sanji | 3,554 | 477 | 47.7% | 13.4% |
| Ace | 1,587 | 460 | 46.0% | 29.0% |
| Smoker | 2,575 | 427 | 42.7% | 16.6% |
| Luffy | 1,245 | 413 | 41.3% | 33.2% |
| Robin | 4,219 | 371 | 37.1% | 8.8% |
| Crocodile | 2,866 | 368 | 36.8% | 12.8% |
| Kid | 1,741 | 303 | 30.3% | 17.4% |
| Hancock | 1,254 | 294 | 29.4% | 23.4% |
| Law | 1,281 | 293 | 29.3% | 22.9% |
| Doflamingo | 1,271 | 271 | 27.1% | 21.3% |
| Garp | 298 | 209 | 20.9% | 70.1% |
| Mihawk | 130 | 80 | 8.0% | 61.5% |

Garp and Mihawk have high conditional win rates on small, selected
denominators. They do not violate the presence gate, but their late-game power
should be observed in human sessions and in future placement-aware telemetry.

## Changes from the failing baseline

The corrected baseline had Luffy on 80.5%, Sabo on 73.8%, Chopper on 68.1%,
and Usopp on 68.0% of winner boards. The final implementation changes are:

- Bot preferred-trait scoring counts at most one preference match.
- Only the two strongest current trait connections contribute to bot unit
  scoring; units with more than three tags receive a connector penalty.
- A full bot bench may atomically sell one lower-cost 1-star bench unit for a
  materially better offer, using the same sell/buy commands and shared pool.
  Failed purchases roll the sale back.
- Luffy's cast power changed from 105 to 75, Sabo's from 240 to 190, and Garp's
  from 580 to 360.
- Brawler tier one changed from 12% health / 8% attack speed to 6% / 4%; tier
  two remains 25% / 18%.

The final cohort averages 34.71 rounds versus 34.50 in the baseline, so the
distribution fix did not materially shorten or lengthen matches.

## Scope and methodology

- Seeds are exactly `production-0` through `production-999`.
- The normal human slot is converted to the deterministic `balanced` bot only
  for headless legality; the other seven slots retain their configured
  personalities.
- Production shop odds, shared pools, economy, stages, timers, content, combat
  tick, and match flow are not accelerated.
- Boards are captured at battle boundaries after bot planning. Bench units and
  other owned-but-undeployed units do not count as character presence.
- Full-clock duration sums configured preparation caps, actual 100 ms combat
  ticks, and ten seconds per carousel. It is a rules-based estimate, not
  observed human wall time.
- Trait activation is sampled from every live battle board. Item usage counts
  equipped plus inventory items at match end; it does not estimate item damage
  contribution.

Data-quality checks confirm 18 character records, 12 trait records, eight item
records, bounded numerators/denominators, exact conditional-rate arithmetic,
and an average final deployed board size of 6.02 units. A regression test runs
the same three-seed production cohort twice and compares every report field
except the timestamp.

## Limitations and next actions

- This is an all-bot audit. It validates deterministic stability and catches
  large balance pathologies, but it cannot substitute for human decisions.
- Final-board statistics are selected by survival and do not isolate causal
  unit, trait, item, positioning, or matchup effects.
- In the 100-seed diagnostic cohort, the Brawler personality remained the
  strongest bot profile (42 wins). Small isolated economy, preference, and
  formation changes did not provide a principled correction, so they were not
  shipped. Human comp diversity should be checked before further tuning.
- The next telemetry pass should add placement by character, star level,
  equipped-item contribution, personality/strategy outcomes, and matchup
  matrices while preserving deterministic replay.

## Reproduce

```powershell
npm run test:production-soak
npm run test:production-smoke
npm test
npm run test:soak
```

The soak command writes the current raw report to
`tmp/production-soak-report.json`; the dated JSON above is the reviewed release
snapshot.
