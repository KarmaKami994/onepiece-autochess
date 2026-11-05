# B05-C — Special Defense carrier evaluation

**REJECTED / NOT PRODUCTION POLICY.** The owner-approved carrier candidate
passed focused correctness tests and stability gates, but failed three locked
representation gates. Behavior, version and test changes were fully reverted.
Current production remains GameContent `1.31.0`, save schema `6`.
The approved B05-C evaluation is complete; no second candidate or B06 follows.

## Scope, approval and source

On 2026-11-05 the owner explicitly requested B05-C and approved this exact
carrier rule, focused/normal checks and one diagnostic 50-seed POST, with
rejection/revert on a failed gate. Branch: `codex/b05-special-defense-carriers`.
Its base is B05-B's documentation-only head
`9650a8be29cd373b6b2896d197afe6348204cc1c` (PR #64, CI run 164 green).
The C review is stacked against that branch; neither evaluation merges here.

The candidate was measured from clean committed source
**`6e12cd222c6f54de2c528f6e6b15ff597968c706`**. That retained commit is the
canonical source for reproducing the experiment; the final reverted head is
documentation/evidence only. No historical raw report was changed.

## Evidence and exact rejected rule

The shared `scoreItemEffect` assigns zero to `special-defense-flat`, so the
original `scoreItemForUnit("sea-prism-stone", ...)` ignores its 40 Special
Defense for every legal carrier. This establishes missing carrier affinity,
not an item-value bug or proof of a population balance deficit. Physical and
Special resistance use the same local mitigation curve on different channels.

The single candidate reused the existing `defense-flat` affinity **only inside
`scoreItemForUnit`** for Special Defense: `value * 1.6` for a Guardian, otherwise
`value`. Sea Prism Stone therefore scored 64 versus 40 for those roles. No new
coefficient was invented; the item still affected Special Defense only in combat.
The shared effect/player scorers stayed unchanged, preserving reward/carousel
preferences. Crafted results used the same carrier reducer after consuming a
component; actual eligibility still came from the existing equip command.

No progression/XP/reserve/reroll, unit/instance score, formation, voyage score,
item value/passive, recipe, cap/duplicate/native-trait guard, retention/overflow,
form threshold/branch lock, RNG or metric definition changed. No Luffy catalyst
reservation, swap or guaranteed transformation was introduced. Other unscored
effects were not bundled into this experiment.

Pinned PAC research:
[`app/core/bot.ts`, lines 66–157](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/bot.ts#L66-L157).
PAC rebuilds authored teams and assigns authored item lists with legality checks;
it has no equivalent real-inventory carrier scorer. **Direct/adapted code: none.
Reference only:** legal item assignment. **Reject:** board replacement,
Pokémon-specific TM rules, unseeded selection, Mongo/Colyseus/server/community
infrastructure. The candidate remained a pure score feeding `applyCommand`.

## Single POST provenance

| Anchor | Retained PRE | Experimental POST |
| --- | --- | --- |
| Report | `analysis/p13-final-production-baseline-50.json` | `analysis/b05-special-defense-carriers-post-50.json` |
| Measured Git SHA | `b2bada40ab52488423425bb4fda1abb851717fa9` | `6e12cd222c6f54de2c528f6e6b15ff597968c706` |
| GameContent / schema | `1.31.0` / `6` | experimental `1.32.0` / `6` |
| Content / config hash | `a6d7c074` / `977295da` | `556bb345` / `977295da` |
| Seeds | `production-0`–`production-49` | `production-0`–`production-49` |
| Raw SHA-256 | `8d02ba30bdf2030da2b4adc5b4715b179269ffd039e443ddfd2f10688246db84` | `866485833f14aa91fe1adb1d680d8dfbcdebc1fae41b061e9067bbae00394cb3` |

POST generated at `2026-11-05T19:57:23.682Z`, 36,483,962 bytes, remains unchanged
after rejection. Content hashes differ only because of the candidate version;
they do not identify bot code, so the measured Git SHA is essential.
The retained current-policy diagnostic PRE has identical P13 gameplay metrics,
source `3e4cd130f8baa3b66168541bbaec89e96cb518ab`, SHA-256
`4cbdcb8a3e6ad4907e767b2663431c5b08d3181faf60fd74458d38cb194dbdf3`.
It supplies the XP/level/funnel comparison. Rejected B05-B is **not** the PRE.

Exactly one official invocation ran on the clean candidate:

```text
node node_modules/tsx/dist/cli.mjs scripts/run_production_soak.ts --seeds=50 --bot-diagnostics --out=docs/analysis/b05-special-defense-carriers-post-50.json
```

No PRE rerun, second C POST, 1,000-seed soak or authoritative baseline was run.

## Locked gates

| Gate / measure | PRE | POST | Result |
| --- | ---: | ---: | --- |
| Complete / crashes / thrown harness invariant failures | 50 / 0 / 0 | 50 / 0 / 0 | PASS |
| Exact recorded source/content/schema/config/seeds | retained PRE | matches anchors above | PASS |
| Average paced minutes, required 20–30 | 24.926 | 24.706 | PASS |
| `noCharacterAbove65PercentOfWinningBoards` | true | true | PASS |
| `everyTraitReached` | true | true | PASS |
| Cost-4 player-board presence, at least 259 | 259 | 249 | **FAIL** |
| Cost-5 player-board presence, at least 102 | 102 | 93 | **FAIL** |
| Cost-4 final-board presences, at least 429 | 429 | 431 | PASS |
| Cost-5 final-board presences, at least 128 | 128 | 111 | **FAIL** |
| Focused carrier/craft/form/determinism cases | existing policy | all pass | PASS |

No increase was required in cost-band representation for this carrier candidate,
but the approved non-regression thresholds were binding. The two definitions
remain the report's existing player-with-band and definition-presence counts.
Full-clock duration was explicitly not a gate; the existing
`matchLength20To30Minutes` boolean stays false in PRE and POST.

## Supporting observations and limitations

| Existing measure | PRE | POST |
| --- | ---: | ---: |
| Rounds min / max / average | 34 / 47 / 40.06 | 35 / 45 / 39.86 |
| Average full-clock minutes | 34.941 | 34.671 |
| Timeout / draw rates | 0.2380% / 0.01253% | 0.1385% / 0.02517% |
| Captain damage p50 / p90 / p95 | 9 / 14 / 15 | 9 / 14 / 15 |
| First elimination, mean / median round | 24.40 / 25 | 24.46 / 25 |
| Stage 36 / 40 matches reached | 47 / 25 | 46 / 26 |
| Players reaching L7 / L8 / L9 | 400 / 342 / 91 | 400 / 341 / 89 |
| Natural cost-4 / cost-5 shop offers | 6,967 / 1,154 | 6,901 / 1,071 |
| Cost-4 / cost-5 offers including rerolls | 15,527 / 2,633 | 15,393 / 2,519 |
| Cost-4 / cost-5 shop purchases | 2,303 / 678 | 2,314 / 598 |
| Mean available cost-4 / cost-5 pool copies per definition | 11.780 / 9.306 | 11.787 / 9.346 |
| Cost-4 / cost-5 zero pool availability | 0% / 0% | 0.0330% / 0% |
| XP gold spent | 38,928 | 38,704 |
| Nami / Robin final-board presences | 164 / 153 | 159 / 148 |

All tracked stages through R34 reached 50/50 in both reports; no empty natural
shop slots occurred. All 13 traits and their previously reached maximum tiers
remain represented. Straw Hat T3 match reach was 27→26, Warlord T2 9→12,
Supernova T2 19→16, Brotherhood T2 4→3 and Emperor T2 10→10. These and Nami/
Robin are observations only, not tuning instructions.

The POST records 7,446 equip decisions, 2,393 crafts and 21 crafted results
returned to inventory. It records no equip-driven form unlock; that does not
describe all merge-driven form progression. A retained actual receipt at
`production-0`, R2, `player-1` assigns Sea-Prism Shard to Chopper `unit-4`
(score 4769.000000000001 versus 3045 for the next candidates).
The controlled fixture proves the intended changed carrier priority; historical
PRE lacks these rich receipts, so no population carrier-improvement rate is
invented. This 50-seed experiment does not isolate downstream causal mechanisms
or establish unit/item balance. Passing local carrier cases did not override
the failed production gates.

## Verification and disposition

- Candidate: typecheck/lint PASS; focused carrier/decision/formation 30/30,
  final carrier/craft/form/diagnostic 93/93 and full suite 869/869 (68 files) PASS.
- Eight candidate cases covered exact affinity, real recipient over roster rank,
  crafting at cap, duplicate-result return, direct duplicate/cap/native-trait
  legality, invalid scoring and repeated observer/RNG-isolated decisions.
- The candidate intentionally locked the whole seed-0 trace at `3c5341fb` and
  updated current-version assertions; both changes and candidate-only tests
  were reverted. Original PRE equality regression is restored and passes.
- Restored typecheck/lint and 85/85 diagnostic/craft/form/formation tests PASS.
  Source/scripts/tests have zero diff to the B05-B documentation base (and A).
  Normal GitHub CI remains the review gate; no separate local E2E/build or
  additional aggregate is needed for the final documentation-only delta.
- Raw POST/PRE/B report hashes remain unchanged. No existing timeout, combat
  assertion, E2E assertion or report metric was weakened or rewritten.

The candidate is rejected and fully reverted; current carrier/form policy stays
unchanged. This completes the separately approved C evaluation and B05's
diagnostic/evaluation deliveries, with no successful production tuning claimed.
Any future bot policy needs a separate evidence-backed decision and measurement
approval. No retuning, next batch, Smoker, item/unit/economy/captain-damage work
starts automatically.
