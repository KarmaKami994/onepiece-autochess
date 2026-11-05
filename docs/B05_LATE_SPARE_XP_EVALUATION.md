# B05-B — approved late spare-gold XP candidate

Owner approval: 2026-11-05, **“A mergen und B einmal evaluieren”** in response to
the exact policy/one-POST question. A is merged as PR #63 at
`7b7b07abbc6f14c9c8ce54d223909da209210f98`; candidate branch:
`codex/b05-late-spare-xp`.

## Locked candidate and measurement protocol

After the existing initial buy pass, original XP loop, rerolls and their buy
passes, and before formation/equip, attempt at most one extra `BUY_XP` if:

- `levelAggression >= 0.5`;
- the original nonzero XP budget succeeded fully and ended `budget-exhausted`;
- current level is 7 or 8 and below max;
- current gold minus the existing XP cost preserves `economyReserve`;
- the existing roster-size guard passes; the command remains authoritative.

The original buying, XP and reroll budgets/order, unit/instance/item scores,
personality values, formation, forms/items and recruitment remain unchanged.
No target curve, reserve override or new RNG/state is introduced. Candidate
GameContent is `1.32.0`; save schema is `6`. Canonical content normalized back to
version `1.31.0` must still hash to PRE `a6d7c074`, config `977295da`; P7's strict
normalized gameplay SHA-256 stays unchanged.

Diagnostics keep `xp` as the original loop, add the separate `lateXp` attempt /
success / spend / outcome, and expose `allXpGoldSpent` as their sum. No existing
production metric, report formula or target boolean is redefined.

Commit and verify a clean candidate head before the measurement. Run the existing
production harness **exactly once** for `production-0` through `production-49`,
with diagnostics, into `docs/analysis/b05-late-spare-xp-post-50.json`. Record its
SHA-256 and committed source. Do not rerun PRE, mutate historical snapshots,
run a second candidate/POST, run 1,000 seeds, or create an authoritative baseline.
The retained P13/current-policy diagnostic is PRE.

All hard gates must pass: 50 complete, zero crashes/invariant failures, paced
estimate 20–30 min, existing 65%-winner and every-trait booleans true. Cost-4/5
player-board presences must each be at least 259/102, final-board presences each
at least 429/128, with at least one of those four strictly higher. Report natural
shop access/conversion, rounds/duration, Captain damage/stage reach, traits,
Nami/Robin observations and every existing target boolean. Full-clock 20–30 min
is not a gate. Reject/revert on any failed gate; preserve this one POST unchanged.

Item-/form-policy changes (C) are excluded by the approval. No B06 work follows.

## Verification before POST

PASS — typecheck/lint; 36 focused bot/diagnostic/formation tests, including ten new
candidate cases for guard boundaries, reserve, post-level-up roster/max gates,
preserved rerolls/shop levels, deterministic execution, observer equality and RNG.
Full suite: 870/871 passed; only the unchanged static asset enumeration hit its
existing five-second local I/O timeout. Its unchanged file passed 8/8 on focused
rerun. No timeout/assertion was weakened. Normal CI remains the final PR gate.
The single POST result is recorded after completion.

## Result

Pending the single approved POST. No success or rejection is claimed yet.
