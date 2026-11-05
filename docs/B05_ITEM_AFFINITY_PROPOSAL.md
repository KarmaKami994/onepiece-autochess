# B05-C — Special Defense carrier-affinity proposal

Status: owner approved this exact carrier-only candidate, focused/normal checks
and exactly one POST on 2026-11-05. Implemented on
`codex/b05-special-defense-carriers`, based on B05-B's documentation head
`9650a8be29cd373b6b2896d197afe6348204cc1c` (PR #64 pending; review independently
against that branch). Measurement pending. B05-B's late-XP candidate remains
rejected; no second progression candidate or B06 is authorized.

## Evidence and PAC classification

The current shared `scoreItemEffect` returns zero for `special-defense-flat`.
Consequently `scoreItemForUnit("sea-prism-stone", ...)` is zero for every legal
carrier even though the item grants 40 Special Defense. Current carrier tie
breakers therefore choose from roster/star/deployment ordering without valuing
that resistance. This establishes missing carrier affinity, not a population
balance deficit or evidence that the item itself needs a buff.

Physical and Special resistance use the same local mitigation curve in
`game/combat.ts`; they differ in the damage channel they resist. Existing
`defense-flat` scoring is `value * 1.6` for Guardian carriers and `value` otherwise.
Reusing that established role affinity for the other resistance needs no new
coefficient and leaves their combat meanings independent.

Pinned PAC reference:
[`app/core/bot.ts`, lines 66–157](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/bot.ts#L66-L157).
Its bots rebuild authored teams and assign authored item lists with legality
checks; they do not choose carriers through our real inventory/equip loop.
**Direct/adapted code: none. Reference only:** legal item assignment on actual
carriers. **Reject:** authored board replacement, Pokémon-specific TM rules,
unseeded selection and Mongo/Colyseus/server/community infrastructure. The local
candidate stays a pure deterministic score feeding existing `applyCommand`.

## Exact single candidate

Change only **carrier scoring** in `scoreItemForUnit`: score
`special-defense-flat` with the existing `defense-flat` value/Guardian-affinity
rule. A Guardian receives 64 points for Sea Prism Stone; another carrier 40.
Reuse the existing score rule rather than inventing a weight or changing effects.

Leave `scoreItemEffect` and `scoreItemForPlayer` behavior unchanged. Accordingly,
carousel/reward/item acquisition preferences remain unchanged. Existing equip
compatibility still takes precedence over roster/deployment tie breakers using
the same coefficients and stable ordering. Crafted results are evaluated by the
same carrier function after removing the consumed component, as today.

No change to progression, XP/reserve/reroll loops, unit/instance scores, formation,
voyage scoring, item values/passives, recipes, duplicates/caps/native-trait guards,
merge retention/overflow or persistent form eligibility/branch locks. No guaranteed
Luffy transformation, catalyst reservation, item swapping, new action or RNG draw.
Other currently unscored scalar/passive effects remain a separate decision.

Candidate GameContent is `1.32.0`, schema stays `6`; no authored content/config
value or migration changes. Main remains `1.31.0` / schema `6` until review/merge.

## Focused acceptance cases

- Guardian versus non-Guardian carrier: exact resistance scores and actual legal
  `EQUIP_ITEM` recipient, including a stronger non-Guardian roster tie breaker.
- Existing Defense and every unrelated item-effect score remain unchanged.
- Crafting into a Special Defense result uses the same carrier affinity while
  keeping duplicate/native-trait overflow and the item-cap rule authoritative.
- Full carriers, redundant completed items and invalid content remain ineligible.
- Luffy catalyst retention, overflow, pre-3-star eligibility and an already locked
  Gear 4 branch remain unchanged; no form outcome is forced.
- Repeated input is deterministic; observer on/off produces byte-identical state
  and RNG; all actions retain existing command authority and tie breaks.
- Intentional current-version/snapshot expectations must reflect the candidate;
  no historical raw report, combat assertion or E2E assertion is rewritten.

## Approved verification and one-POST protocol

Run focused carrier/craft/form/diagnostic tests, typecheck, lint and the full unit
suite once after implementation; preserve existing assertions and timeouts.
Normal CI retains its ordinary smoke/browser checks. No local UI E2E is needed
because no application/presentation flow changes.

Commit the final candidate on a clean tree **before exactly one** diagnostic
50-seed POST, `production-0` through `production-49`. Reuse P13 and the original
current-policy diagnostic as PRE; never rerun PRE or use rejected B05-B as PRE.
Persist `docs/analysis/b05-special-defense-carriers-post-50.json`, recording exact
source/content/schema/config hashes and raw SHA-256. No metric formula changes.

Locked gates: 50/50 complete, zero crashes/thrown invariant failures, paced
20–30 minutes, winner-concentration and every-trait booleans true. Preserve
cost-4/5 player-board counts at least 259/102 and final-board presences at least
429/128; the purpose is carrier correctness, so no compulsory cost-band increase.
Focused carrier/craft/form/determinism cases must all pass. Report natural shop
exposure, buys, level/trait reach and Nami/Robin as observations, not tuning goals.
Use the existing optional decision receipts to describe actual changed carrier
choices; historical PRE lacks those rich receipts, so do not invent a PRE rate.

If any gate fails, revert the candidate's behavior/version/candidate-only test
changes and retain its one raw report as rejected evidence. No second candidate
or POST, new authoritative baseline, 1,000-seed soak or automatic tuning follows.
Publish the resulting bounded evaluation PR; do not merge without instruction.

## Implementation verification before measurement

The carrier reducer reuses `scoreItemEffect`'s Defense rule for Special Defense
only in this function; the shared effect/player scorers and engine guards are
unchanged. Eight focused cases cover exact scores, the real recipient over a
stronger roster tie breaker, crafting at cap, duplicate-result return, direct
duplicate/cap/native-trait rejection, repeatable trace and observer/RNG isolation.
Initial carrier/decision/formation run: 30/30 PASS. Final focused carrier/craft/
form/diagnostic suites: 8 files / 93 tests PASS; typecheck and lint PASS.
Full suite: 68 files / 869 tests PASS, serial file execution without changed
assertions/timeouts. Historical PRE and rejected B reports retain their exact
SHA-256 values. No UI, package, schema, engine, item value or metric change.
The existing whole seed-0 regression is intentionally re-recorded as canonical
trace hash `3c5341fb` for this approved policy, while retaining report on/off
equality and exact authored-content/config PRE checks. Historical raw data is
unchanged. Current-version expectations advance to `1.32.0`; no assertion is
removed or timeout weakened. Final verification and POST disposition follow.
