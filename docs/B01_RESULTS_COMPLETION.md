# B01 — Final crew presentation and current product handoff

Date: 2026-11-04. Base: `918d16b88e182ac9c81d05c73deb651824d51df8`.
Branch: `codex/b01-results-completion`. GameContent remains `1.31.0`; save
schema remains `6`.

## Result contract

- **Last deployed crew** is the immutable battle-start deployment, including
  every original fighter, form and held item. A battle-time merge cannot
  remove or upgrade that presentation retrospectively.
- **Reserve at voyage end** is the bench immediately before elimination
  clears it, or the winner's bench at the final result. It describes a later
  instant than the deployment. Cards and equipment totals count what is shown;
  they are not a new inventory/balance measurement.
- Optional `PlayerState.finalLineup` captures these groups for each eliminated
  player and the surviving winner. It deep-copies items and positions. The
  existing `finalCrew` ownership snapshot, pool returns, battle logs, RNG,
  placements, rewards and production-report definitions retain their meaning.
- Final bonds derive from the deployed group, excluding reserve-only traits.
- Legacy completed saves without `finalLineup` show the entire available
  saved roster as **deployment unknown**. No board/bench assignment or active
  battle bonds are guessed. Legacy battle logs without frozen equipment also
  use this fallback. No migration invents missing history.
- Result cards have no eight-unit truncation. Nine deployed units and all
  reserve cards remain readable and scrollable at both desktop sizes. Names
  and equipment wrap instead of hiding long form/item labels.

## Documentation handoff

README, product requirements and architecture now describe canonical battle
checkpoints, legacy-only `replayBattle`, P11 recruitment, P12 named PvE and
completed crafting. Current bot-roadmap text records merged PR #58 and the
rejected tuning candidate. P4/form documents distinguish their historical
asset deferrals from completed P7 art. Historical evidence and raw reports are
unchanged. This local result correction needs no additional PAC rule port.

## Verification

Final executed checks and results are recorded in [PROJECT_STATE.md](../PROJECT_STATE.md).
Focused coverage includes winner/loser nine-unit deployments, frozen fighters
after a legal battle-time purchase/merge, separate reserve/form/item retention,
schema-6 round-trip and unknown-deployment legacy fallbacks. Browser coverage
checks both desktop viewports, resume, complete card counts, readable form/item
labels and reachable result actions.
