# Normalized Pre-P4 Production Baseline

## Purpose and provenance

This is the first authoritative system-health checkpoint after production-soak personality normalization and after P2, P3 and P3B. It is not a roster-balance review.

- Measurement SHA: `cff9c4caed9b09fd64a915908589decc84f02cc8`
- GameContent: `1.15.1`
- Save schema: `6`
- Content hash: `206d8fa9`
- Config hash: `977295da`
- Seeds: `production-0` through `production-999` (1,000 total)
- Raw snapshot: `docs/analysis/normalized-pre-p4-baseline-1000.json`
- Snapshot SHA-256: `80f4551af28e46f8976a014246b75da42fa1c674de7a0720924e775bfbaffd22`

The harness used eight bots before the first phase advancement and only the seven existing personalities. Assignments followed `personalityIds[(seedIndex + playerIndex) % personalityIds.length]`, so each match contained all seven personalities plus one rotating duplicate; across seven seeds each personality received eight assignments and each player slot received every personality once. The report does not expose personality-specific outcome metrics.

## System health

| Signal | Result |
| --- | ---: |
| Complete matches / crashes | 1,000 / 0 |
| Round range / average | 26–51 / 34.036 |
| Battles | 135,539 |
| Average full-clock duration | 33.740 minutes |
| Average paced duration | 24.064 minutes |
| Timeout rate | 0.8315% |
| Draw rate | 0.0325% |

The paced duration remains inside the existing 20–30 minute target. Full-clock duration remains above that target and is a continuing pacing watch, but completion, timeout and draw behavior do not indicate a pathological match-flow failure.

## Economy, progression and access

- All 1,302,912 observed shop slots were populated; the empty-slot rate was 0%.
- Every cost band appeared on final boards. Player-level final-board presence was 93.24% for 1-cost, 96.00% for 2-cost, 80.70% for 3-cost, 38.69% for 4-cost and 6.71% for 5-cost units. The 5-cost band is rare but not effectively unreachable.
- Average available pool copies per observed definition were 8.78 / 11.55 / 12.56 / 12.69 / 9.76 from costs 1 through 5. Zero-availability observations were concentrated in 1-cost units at 13.82%; costs 2 through 5 were 1.42%, 0.28%, 0% and 0.003% respectively.
- Final-crew two-star-or-higher instance counts were 37,771 / 27,413 / 15,103 / 4,866 / 458 from costs 1 through 5. The existing report exposes no gold, level, reroll or sell-value aggregates, so no additional progression inference is made.

## Form and accessibility observations

- Robin reached 388 deployed three-star final boards; all 388 were Demonio Fleur, so the existing invariant held.
- Luffy reached 130 deployed three-star final boards: 128 base, one Boundman and one Snakeman. Gear 4 remains very rare and is context for future P4 accessibility research, not a balance conclusion.
- Monster Point produced 56,386 transform events, reached all 1,000 matches and transformed 88.65% of eligible combatants that survived to the trigger window.

## Conclusion

**Baseline healthy enough to continue feature development; defer balance analysis.**

No genuine systemic blocker is visible. Full-clock duration and rare Gear 4 access remain watch/context signals for later separately authorized research. Smoker remains frozen/watch. Historical 1,000-seed snapshots remain valid evidence for their exact older harnesses and match-flow/pairing states; this checkpoint does not reinterpret them or attribute differences specifically to population normalization.

The next roadmap decision is feature development, with P4 Items / Treasure / Form Accessibility as the expected next major PAC-first research area. This baseline does not start P4, P1B, captain-damage work, economy tuning or unit balance.
