# B06 — PAC phase timing and local voyage pacing

## Scope and timing decision

Owner request: implement B06; round/phase lengths may be copied one-to-one from
PAC. Base: B05-C documentation head `2e2070f08b888b5b12c9d42a789044aed10fb62f`
(PR #65), branch `codex/b06-pac-pacing`. No bot tuning or new production report.

Pinned reference: `keldaanCommunity/pokemonAutoChess@a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`.
[Stage durations](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/config/game/stages.ts),
[phase initialization and completion](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/rooms/commands/game-commands.ts#L1153-L1198).

| Phase | PAC pinned | Local decision |
| --- | --- | --- |
| Preparation R1/2/3 | 20 s | Already exact; preserve |
| Preparation R5/8/9/11/15/19 | 40 s | Already exact; preserve |
| Preparation R10/20 | 50 s | Retain content metadata; P11 has recruitment instead of preparation |
| Other preparation | 30 s | Already exact; preserve |
| Combat cap | 45 s | Already exact; preserve simulation and timeout resolution |
| Completed fights | 3 s victory animation after all fights | Use the longest frozen paired result, then 3 real seconds; cap-ended fights advance without extra wait |
| First item carousel | 16 s | Already exact; preserve |
| Later item carousel | 16 s + 2 s per living player | Already exact; preserve serialized ticks and release order |
| Portal carousel | 23 s | Use 23 s for the existing R10/R20 Voyage Recruitment choice; existing authoritative timeout auto-pick |
| Starting town / encounter extension | 23 s / +5 s | No corresponding local phase; do not add one in B06 |

**Direct timing reuse:** the table's applicable numeric durations. **Adapted:**
local recruitment UI in place of Portal Carousel, offline pause/resume,
all-fights-finished timing from frozen result durations, and application-only
timers issuing existing commands. **Reject:** network/server room clocks,
Colyseus/Redux/database infrastructure and extra town/game-mode systems.
No domain stage, combat, economy, item, bot, pairing, RNG or reward value changes.
GameContent remains `1.31.0`; match/save schema stays `6`.

## Product-time definition

PAC phase limits are the canonical default at 1× playback. Active voyage time
counts visible running preparation, combat playback/result delay, carousel and
recruitment clocks. Settings, hidden browser time, manual pause, tutorial lessons
and explicit treasure decisions are user-controlled pauses. Ready/Start remains
an explicit shortcut; battle-speed and skip controls remain local presentation
adaptations, not changed simulation time.

The retained P13 values (34.941 full-clock / 24.926 paced minutes) are harness
estimates, not measured human session lengths. The paced model assumes at most
15 s preparation; existing report formulas/booleans are not redefined. A 20–30
minute responsive voyage remains a fast-play expectation, not a gate that can
override the owner's exact PAC timing request or a demonstrated human-duration
claim. New B07–B09 phase budgets require separate decisions.

## Application behavior contract

- Use elapsed monotonic time, not one subtraction per browser callback. Cancel
  old expiry work and identify clocks by voyage/round/phase.
- Settings, background visibility and explicit Pause stop both the timer and
  board playback. Returning preserves remaining preparation/recruitment time.
  Opening settings alone must not recreate the live board or refill its timer.
- Preserve existing visual-option/speed replay semantics: an explicit visual
  change may restart the immutable battle and its presentation clock together.
  At 0.5×, show the complete playback rather than truncating it at 45 wall seconds.
- Auto-continue completed battles remains on by default and is configurable;
  off waits at zero for Continue. Ready/Skip still work through the current
  phase authority. Tutorial permissions remain authoritative.
- Recruitment displays its 23-second budget and explicit timeout behavior;
  invalid/manual selections and timeout still use existing pool-safe commands.
- Add optional application clock metadata to the existing save envelope only.
  Resume preparation/recruitment with validated matching remaining time, ignoring
  offline elapsed time; legacy/malformed/mismatched metadata uses the full phase
  budget. Battle resume intentionally replays from the initial frozen snapshot
  and restarts its presentation clock, preserving existing save compatibility.
  Carousel resumes from its existing serialized ticks.
- Visible countdown, pause reason, result/continue state and replay-speed context
  must agree. No renderer event becomes gameplay authority.

## Verification scope

Owner explicitly approved this verification scope on 2026-11-06: focused
clock/save tests, typecheck/lint, one full unit suite, build, focused browser
pacing/tutorial/resume at both existing desktop sizes and normal CI.

- PASS — final typecheck/lint; focused clock/save tests 30/30; full unit suite
  68 files / 887 tests, serial file execution; production build.
- PASS — corrected pacing/tutorial browser run 12/12 at 1280×720 and 1920×1080.
  Existing battle-economy/resume and manual R10/R20 recruitment passed 6/6 in
  the initial combined run. Final manually waiting result state passed 2/2
  after removing its unnecessary countdown warning. Screenshots inspected.
- The initial combined browser run had 16 passes and two failures because the
  timer's accessible `PREPARE` label was renamed. The implementation restores
  that label; existing tutorial assertions are unchanged. Initial lint found
  render-time ref writes; those now run in effects without disabling any rule.
- PASS — domain/content/config/schema/scripts/package files have no branch
  diff. Existing P7 content/hash and deterministic production regressions pass.
- NOT RUN locally — additional production smoke/aggregate, 1,000-seed soak or
  baseline. Normal GitHub CI (including its ordinary smoke/browser checks)
  remains the integration gate; exact remote status is reported on the PR.

Clock metadata is optional and outside MatchState. A legacy/incompatible clock
starts with a fresh phase budget; battle resume replays its frozen result.
Periodic checkpoints run every five seconds plus immediate visibility/pagehide
writes. Abrupt termination can lose an in-flight write; resume uses the last
committed checkpoint, without charging offline time. No schema migration.

Implementation is complete and locally verified. No B07 or tuning starts here.
