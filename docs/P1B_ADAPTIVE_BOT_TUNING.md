# P1B Candidate — REJECTED / NOT PRODUCTION POLICY

This document preserves the result of a rejected P1B adaptive-bot experiment. PR #57 is documentation-only after the review correction: production behavior is restored to exact base `67a0e26dd6d2b9ebf84c12c597574750dff6bc21`, GameContent is `1.31.0`, and save schema remains `6`. The candidate's round-derived target-level and XP-budget policy is **not production policy** and must not be inferred from the retained report.

The experiment adapted PAC's authored stage-aware strength progression into local round-aware level targets. The pinned PAC bot does not run this project's real shop/economy loop, so there was no direct port. PAC exact curves, category scores, Elo and authored legality budgets remained reference-only; scripted board replacement and backend/community infrastructure were rejected. Review rejected the local candidate because its intended high-cost-access goal failed.

## Historical experiment evidence

PRE is the unchanged [P13 report](analysis/p13-final-production-baseline-50.json), measured with seeds `production-0` through `production-49`. POST is the retained [rejected candidate report](analysis/p1b-post-bot-tuning-50.json), SHA-256 `289dd6ae10a0b1bebfae5b2830e94d025bfde5eecd71ac9340858a555a643855`, measured from experimental commit `3420a0ff2c723d53d8994974568d4cfcd0d32f6b`. That commit used GameContent `1.32.0` and content hash `556bb345`; those identifiers describe only the historical experiment, not the corrected PR or production. Both reports used schema `6`, config hash `977295da`, and the same 50 seeds. No PRE rerun, second candidate, additional production soak, or 1,000-seed soak was performed.

| Review metric | P13 PRE | Rejected POST |
| --- | ---: | ---: |
| Cost-4 player-board presence | 259 | 178 |
| Cost-5 player-board presence | 102 | 54 |
| Cost-4 final-board presences | 429 | 274 |
| Cost-5 final-board presences | 128 | 68 |
| Nami final-board presences | 164 | 180 |
| Robin final-board presences | 153 | 157 |

All original experiment hard gates passed: 50/50 matches completed, zero crashes, no harness-reported deterministic/state invariant failure, paced duration was 25.511 minutes, `noCharacterAbove65PercentOfWinningBoards` remained true, and `everyTraitReached` remained true. The existing full-clock 20–30-minute report target remained false, but was explicitly not a P1B gate.

Passing those stability gates does not satisfy the tuning objective. Cost-4 and cost-5 access/representation materially declined, while Nami and Robin presence did not fall. The 50-seed evidence is directional and cannot establish causality, but it is sufficient to reject this candidate. No unit, item, trait, combat, economy, shop-odds, pool, captain-damage, or Smoker change follows from it. Before proposing another P1B candidate, run a separately approved targeted bot-progression diagnostic that observes intermediate levels, roster guards, reserves, rerolls, purchases, and shop eligibility.
