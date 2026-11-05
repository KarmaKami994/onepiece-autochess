# B05 — Bot decision diagnostic and review gates

Base: `0a43543162d520047cc3c51255ff0d8741a6e223` (merged B04).
Branch: `codex/b05-bot-decision-diagnostics`. GameContent `1.31.0`, schema `6`.

## Authorized boundary

Delivery A instruments real buy/equip decisions without changing production
policy. The batch explicitly requires separate approval of a progression candidate
(B) and evidenced item/form changes (C). The owner subsequently approved merging
A and evaluating B once. That evaluation failed its locked cost-5 gates and was
reverted; see [the retained result](B05_LATE_SPARE_XP_EVALUATION.md). The rejected
P1B round-target policy also stays rejected. No second candidate is authorized.

## Locked observation and measurement contract

- Record every visible non-null shop offer once when reached in the actual frozen
  score/index order of each buy pass. Capture current affordability, prior purchases,
  the actually evaluated reserve/exception rule, receive/merge capacity and actual
  replacement candidates, command outcome and successful merge/item/form receipts.
- An unaffordable/unknown offer has no fabricated reserve rejection. Later offers
  show the gold remaining after earlier actions; this is observation, not a claim
  that another ordering would improve the whole match.
- Record actual equip/craft candidates, guard counts, the top three legal candidates,
  selected command and before/after inventory/carrier facts. Non-finite scores are
  represented by null. Diagnostic consumers receive detached deeply frozen JSON.
- The optional observer remains disabled in production. Do not introduce a new
  authority, RNG draw, targeting policy, item value, form unlock or mutable bot state.
- A uses existing P13/rejected-candidate/progression reports and focused reproducible
  cases. **No new aggregate production measurement in A.**
- Before any approved B/C evaluation: lock one candidate, record its exact policy,
  commit the instrumentation/implementation before measurement, then use exactly
  `production-0`–`production-49` once with diagnostics, compared to the retained
  P13/current-policy diagnostic, provided content/config hashes still match.
  Do not rerun PRE, run 1,000 seeds, create a baseline or iterate on POST.
- Evaluate actual cost-4/5 deployed/final representation and conversion alongside
  levels, offers, stability, existing target booleans and trait reach. Preserve the
  deliberate reroll channel; higher levels alone are not success. Item/form policy
  needs its own causal evidence and approval, not a guaranteed catalyst/form.

## PAC research

Pinned `keldaanCommunity/pokemonAutoChess@a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`:
[authored progress/team replacement](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/bot.ts),
[category power curves](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/bot-logic.ts).
PAC advances authored steps and rebuilds teams; it does not expose the real local
shop/XP/reserve loop. **Direct/adapted implementation: none in A. Reference only:**
stage-aware strength and legal item assignment. **Reject:** scripted replacement,
authored budgets/curves as local economy constants, Colyseus/Firebase/Mongo and
server/community infrastructure. Local diagnostics observe existing applyCommand
authority and never feed reports back into the policy.

## Findings, verification and approval handoff

### Historical population facts (no new aggregate)

The retained [P13](analysis/p13-final-production-baseline-50.json) and
[current-policy diagnostic](analysis/p1b-bot-progression-diagnostic-50.json) have
content hash `a6d7c074`, config hash `977295da`, 50 complete matches, zero crashes
and unchanged gameplay-derived metrics. The latter records 12,241 preparations:
XP was reserve-limited 7,206 times and budget-exhausted 4,473 times; roster guard
fired zero times. All 400 players reached L7; 342 reached L8 and 91 reached L9.
The rejected experiment's cost-4/5 player-board presence fell 259/102 → 178/54,
and final-board presences 429/128 → 274/68. It stays rejected.

Re-querying **existing** raw preparations for end level 7–8, original XP budget
exhausted, enough roster, gold minus the current 4-gold XP cost still at reserve,
and current `levelAggression >= 0.5` yields **534 snapshots**: Balanced 177,
Strategist 106, Sharpshooter 122, Brawler 88, Vanguard 41. Treasurer/High Roller
are excluded by that aggression predicate. This is a feasible-action observation
in historical states, not a prediction of purchases, levels or outcomes after a
policy changes subsequent shops/pools/gold. No new match/report was generated.

The exact seed-0 raw preparation sequence is also a regression fixture: current
instrumented execution matches the retained PRE's levels/gold/shop snapshots,
purchases/order, XP and reroll facts with identical content/config hashes.

### Focused causal reproductions

| Case | Existing authority's observed outcome |
| --- | --- |
| Cost-5 offer, zero gold | Unaffordable; reserve/capacity not evaluated |
| Cost-5 offer, 5 gold, reserve 10, no exception | Actual reserve-policy rejection |
| Tutorial offers Shanks then Zoro, 5 gold | Frozen score ranks Shanks first; purchase leaves zero; later Zoro is unaffordable |
| Existing-copy offer below reserve | Original score exception may buy; reserve is not a universal purchase invariant |
| Full eight-slot bench, two matching 1-stars | Third copy can merge without replacement |
| Full bench protected by 2-stars | No legal replacement; those fighters are not sold |
| Cheaper eligible 1-star bench replacement | Real sale/purchase path and candidate score gap recorded |
| Three item slots with a component | Legal recipe still crafts at the cap through EQUIP_ITEM |
| Recipe duplicates held completed item | Crafted result returns to inventory; direct duplicate then blocks re-equip |
| Native trait grant / full completed slots / no carrier | Actual guard counts explain the stopped equip loop |
| Catalyst retained during Luffy's final merge | Normal authority reaches Boundman |
| Catalyst overflows behind three retained items | Catalyst returns to inventory; capped carrier stays untransformed |
| Catalyst below 3-star / second branch catalyst | Star gate and existing branch lock are preserved |

Offer scores/ranks are the real frozen buy-pass values, not recomputed after
earlier purchases. Replacement scores come from the actual filtered candidates.
Item guard counts count candidate pairs, while item outcomes count iterations;
these denominators are distinct. Rich summaries retain at most three examples
per outcome/cost key and six merge examples; legacy raw preparation fields stay
unchanged in shape. No shadow decisions, extra commands or RNG enter production.

`scoreItemEffect` still assigns zero to several newer scalar effects (including
Special Defense, Luck and Crit Power), and passive behavior is not scored there.
This is a code-level affinity blind spot, not evidence of an item value bug or a
population outcome deficit. These focused cases establish legal behavior, not
how often catalysts/overflow or a different carrier would matter in matches.

### B — approved once, evaluated and REJECTED

The following is the historical locked proposal. The owner approved it on
2026-11-05; its one POST failed the cost-5 gates (102→88 players; 128→102 final
presences). Production behavior/version/tests are restored to A. PR #63 merged
as `7b7b07abbc6f14c9c8ce54d223909da209210f98`; the measured candidate source is
`103389e0f9ccf47bbc051844cfb44aab688c1d3f`. The linked evaluation records exact
provenance, supporting observations and the unchanged raw POST.

**One late spare-gold XP action**, after the entire unchanged initial buy/XP/
reroll/post-reroll-buy sequence and before formation/equip:

1. Personality `levelAggression >= 0.5`.
2. Original XP budget fully succeeded and stopped as `budget-exhausted`.
3. Current level is 7 or 8 and below max; roster-size guard passes.
4. The existing XP command is legal and preserves `economyReserve`.
5. Issue at most **one** additional `BUY_XP` through `applyCommand`.

No target-level curve, withheld reroll budget, reserve override, unit/cost-band
preference, scoring change, new randomness or hidden state. The recorded 534
snapshots motivate testing this bounded opportunity; they do not prove benefit.
It preserves this turn's existing shop decisions but can reduce next-turn gold,
so regression remains possible. An approved behavioral candidate would use
GameContent `1.32.0`, schema `6`, with no unit/item/economy/config value change.

The approved single POST protocol used these success gates: 50/50 complete,
zero crashes/invariant failures,
paced estimate 20–30 min, existing 65%-winner and every-trait booleans true;
cost-4/5 player-board counts each at least **259/102**, final-board counts each
at least **429/128**, with at least one of those four counts strictly higher.
Report natural shop exposure/conversion and trait reach separately. Nami/Robin
are observations only. Full-clock 20–30 min remains separate B06 pacing work.
If a gate fails, reject/revert the candidate and retain its one POST as evidence;
do not retune a second candidate. A new baseline is not authorized.

### C — separate item/form decision

The reproduced legality/crafting/retention/form-lock paths work as specified.
Recommendation: retain the current item/form policy for this candidate; do not
manufacture a change or force transformations. Use the new reason counts and
candidate receipts in an explicitly approved measurement before proposing a
separate generic item-affinity improvement. B and C must stay independently
reviewable; no item/form weights or policy are changed in A.

### Verification

- PASS — typecheck and lint. Focused diagnostic/form runs: 41/41 and 62/62.
- Full suite: 860/861 passed initially; only the unrelated asset enumeration hit
  its existing five-second I/O timeout while lint also ran. The unchanged asset
  test file passed 8/8 on focused rerun (335 ms). No timeout or assertion weakened.
- Diagnostics on/off have byte-identical serialized end states/RNG; the retained
  PRE's exact seed-0 preparation facts match. Successful decision receipts match
  the existing purchase command records, including order and source.
- Historical diagnostic SHA-256 remains
  `4cbdcb8a3e6ad4907e767b2663431c5b08d3181faf60fd74458d38cb194dbdf3`.
- NOT RUN locally — Browser E2E (no UI/Phaser change), separate production smoke,
  new aggregate diagnostic/POST, production soak or baseline. Normal CI remains
  the PR gate, including its ordinary smoke/browser checks.

**Status: A merged with green CI; B's approved one-candidate evaluation complete,
rejected and reverted. C's existing policy is retained without a new rule or
measurement. No successful progression improvement is claimed; a future policy
requires separate evidence/approval. No B06 work starts here.**
