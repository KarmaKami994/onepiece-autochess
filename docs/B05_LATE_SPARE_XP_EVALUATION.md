# B05-B — One late spare-gold XP evaluation

**REJECTED / NOT PRODUCTION POLICY.** The approved single candidate passed
stability gates but failed the locked cost-5 representation gates. All candidate
behavior, version assertions and candidate-only tests have been reverted to the
merged B05-A base. Production remains GameContent `1.31.0`, save schema `6`.
This is a completed evaluation, not a successful bot improvement. Item/form
policy remains unchanged; no second candidate or B06 work is authorized here.

## Approval and measured source

On 2026-11-05 the owner approved “A mergen und B einmal evaluieren” for the
exact proposal and gates in [B05-A](B05_BOT_DECISION_DIAGNOSTIC.md). PR #63
merged after green CI as `7b7b07abbc6f14c9c8ce54d223909da209210f98`.
Branch: `codex/b05-late-spare-xp`.

The experimental implementation was committed with a clean tree before its
one POST run: **`103389e0f9ccf47bbc051844cfb44aab688c1d3f`**. Use that commit,
not the final reverted branch head, to reproduce the measured candidate.
The final PR diff against B05-A contains documentation and the retained report
only; the experimental commit remains in branch history for provenance.

| Anchor | Retained PRE | Single experimental POST |
| --- | --- | --- |
| Report | `analysis/p13-final-production-baseline-50.json` | `analysis/b05-late-spare-xp-post-50.json` |
| Measured Git SHA | `b2bada40ab52488423425bb4fda1abb851717fa9` | `103389e0f9ccf47bbc051844cfb44aab688c1d3f` |
| GameContent / schema | `1.31.0` / `6` | experimental `1.32.0` / `6` |
| Content / config hash | `a6d7c074` / `977295da` | `556bb345` / `977295da` |
| Seeds | `production-0`–`production-49` | `production-0`–`production-49` |
| SHA-256 | `8d02ba30bdf2030da2b4adc5b4715b179269ffd039e443ddfd2f10688246db84` | `eaebafa86b28e42e029616ea8cdfbd4c3094f121a724b8c67354cce2cf096d6a` |

POST was generated at `2026-11-05T18:50:56.306Z`; raw size 38,367,332 bytes.
It remains byte-identical after rejection. The content-hash difference is the
experimental version bump, not changed authored values; the exact Git SHA also
identifies engine policy, which a content hash alone cannot establish.
The unchanged normalized gameplay-content SHA-256 is
`1485fd67999cd7f5a1dae170fd80d155f8f86125b46d85e70b6642f1fe12d180`.

The retained diagnostic PRE (`analysis/p1b-bot-progression-diagnostic-50.json`,
source `3e4cd130f8baa3b66168541bbaec89e96cb518ab`, SHA-256
`4cbdcb8a3e6ad4907e767b2663431c5b08d3181faf60fd74458d38cb194dbdf3`)
has identical P13 gameplay-derived metrics and supplies the additional XP/level/
offer funnel comparison below. PRE was not rerun. B05-A's exact seed-0 regression
still verifies the retained policy after the revert.

## Exact rejected policy and measurement

After all unchanged initial purchases, original XP, rerolls and subsequent buys,
but before unchanged formation/equip, allow at most one extra `BUY_XP` when:

1. `levelAggression >= 0.5`;
2. the original nonzero XP budget fully succeeded, stopping `budget-exhausted`;
3. current level is 7 or 8 and below maximum;
4. the current roster-size and existing command-legality guards pass;
5. the normal XP cost leaves at least `economyReserve`.

Every action still uses `applyCommand`. No reserve override, new target curve,
RNG draw, hidden state, scoring constant, replacement/formation/item/form rule,
shop odds, pool, economy value, unit, trait or combat mechanic changed.
PAC rationale/classification remains the pinned targeted research in B05-A:
stage progression is reference only; authored board replacement and backend
infrastructure are rejected. No PAC code was copied for this candidate.

Exactly one official invocation was run on the committed candidate:

```text
node node_modules/tsx/dist/cli.mjs scripts/run_production_soak.ts --seeds=50 --bot-diagnostics --out=docs/analysis/b05-late-spare-xp-post-50.json
```

The existing metric/target formulas were unchanged. Original-loop `xp` counters
retained their meaning; experimental `lateXp` and `allXpGoldSpent` reported the
extra action separately. These experimental instrumentation additions were also
reverted. No PRE rerun, second POST, 1,000-seed soak or new baseline was run.

## Locked gates and result

| Gate / metric | PRE | POST | Decision |
| --- | ---: | ---: | --- |
| Complete matches / crashes | 50 / 0 | 50 / 0 | PASS |
| Thrown deterministic/state invariant failures | 0 | 0 | PASS |
| Exact recorded candidate/content/schema/config/seeds | retained PRE | matches anchors above | PASS |
| Average paced minutes, required 20–30 | 24.926 | 25.128 | PASS |
| `noCharacterAbove65PercentOfWinningBoards` | true | true | PASS |
| `everyTraitReached` | true | true | PASS |
| Cost-4 player-board presence, at least 259 | 259 | 262 | PASS |
| Cost-5 player-board presence, at least 102 | 102 | 88 | **FAIL** |
| Cost-4 final-board presences, at least 429 | 429 | 439 | PASS |
| Cost-5 final-board presences, at least 128 | 128 | 102 | **FAIL** |
| At least one of those four counts improves | — | two improve | PASS; cannot override failures |

`finalBoardPlayerPresence` counts players with that cost band on their final
deployed board; `finalBoards` counts definition presences within those boards.
These are the existing report definitions, not a new measurement formula.
Higher levels or a cost-4 gain cannot compensate for the failed cost-5 gates.

## Supporting observations

| Existing measure | PRE | POST |
| --- | ---: | ---: |
| Rounds min / max / average | 34 / 47 / 40.06 | 35 / 46 / 40.32 |
| Average full-clock minutes | 34.941 | 35.208 |
| Timeout / draw rates | 0.2380% / 0.01253% | 0.2137% / 0.01257% |
| Captain damage p50 / p90 / p95 | 9 / 14 / 15 | 9 / 14 / 15 |
| First elimination, mean / median round | 24.40 / 25 | 24.42 / 25 |
| Stage 36 / 40 matches reached | 47 / 25 | 48 / 25 |
| Players reaching L7 / L8 / L9 | 400 / 342 / 91 | 400 / 336 / 91 |
| Natural preparation cost-4 / cost-5 shop offers | 6,967 / 1,154 | 7,021 / 1,148 |
| Cost-4 / cost-5 offers seen including rerolls | 15,527 / 2,633 | 15,649 / 2,597 |
| Cost-4 / cost-5 successful shop purchases | 2,303 / 678 | 2,365 / 589 |
| Cost-4 / cost-5 available pool copies per definition, mean | 11.780 / 9.306 | 11.762 / 9.342 |
| Cost-4 / cost-5 zero pool availability | 0% / 0% | 0% / 0% |
| Original-loop XP gold spent | 38,928 | 37,928 |
| All XP gold spent | 38,928 | 39,196 |
| Nami / Robin final-board presences | 164 / 153 | 163 / 147 |

All stages tracked through R34 were reached in 50/50 matches in both reports;
R36 and R40 are listed above. No empty natural shop slots occurred in either.
Natural preparation snapshots and offer counts do not include the same
observations as the diagnostic funnel, which additionally records rerolls.

There were 317 successful extra XP actions, spending 1,268 gold. The candidate
records 1,009 reserve blocks and 10,880 non-applicable preparations. Total XP
spend increased by only 268 because original-loop spend also changed. This
observation does not isolate the downstream causal effect on purchases or wins.

All 13 traits and their previously reached maximum tiers remain reachable in
the sample. For the rarer/higher tiers, matches reaching Straw Hat T3 fell
27→22, Warlord T2 9→5, Supernova T2 19→16 and Emperor T2 10→7; Brotherhood T2
rose 4→5. These are observations, not approval to adjust traits or characters.
Nami/Robin counts are also observations only. The existing
`matchLength20To30Minutes` boolean stays **false** in both reports because it
uses full-clock duration; it was explicitly not a B05-B gate.

## Verification and disposition

- Candidate: typecheck/lint PASS; focused candidate/diagnostic/formation tests
  36/36 PASS. Full suite 870/871; the unchanged asset enumeration hit its existing
  five-second Windows/OneDrive I/O timeout and passed unchanged 8/8 on focused
  rerun (316 ms). No timeout or assertion was weakened.
- POST: 50/50 complete, zero crashes and no thrown harness invariant failure.
  The representation gates above failed, so the candidate was rejected.
- Reverted tree: production source/scripts/tests match the B05-A merge exactly;
  typecheck/lint, focused diagnostics 18/18 and full suite 861/861 PASS. Full-suite
  files ran serially to avoid OneDrive I/O contention; assertions/timeouts are
  unchanged. Normal GitHub CI status is recorded in the PR.
- Browser behavior is unchanged; no separate local E2E or additional aggregate
  was run after rejection. Normal CI retains its standard smoke/browser jobs.

The final published change is documentation/evidence only. The owner-approved
evaluation is complete. Keep B05-C's item/form policy unchanged as recommended
in A; there is no demonstrated outcome-backed policy to implement here. Any
future progression or item-affinity candidate needs a separate decision, scope
and measurement approval. No automatic tuning or roadmap work follows.
