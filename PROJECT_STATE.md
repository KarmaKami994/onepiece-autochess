# Project State

This file is the compact handoff between ChatGPT (architecture/planning/review) and Codex (implementation). Git history remains the detailed implementation record.

## Permanent Constraints

1. The current prototype must continue to work fully locally/offline.
2. The future target is small private server-authoritative multiplayer for a friends group.
3. `game/` must remain browser/server portable and platform-neutral.
4. Gameplay outcomes must remain deterministic from explicit state, command/input, content/config, seeds and ticks.
5. Authoritative commands, state and events must remain JSON-serializable.
6. Command intent must remain separate from trusted actor identity; client-supplied player identity must never become authorization.
7. React owns application UI; Phaser owns game presentation; rendering must not determine gameplay outcomes.
8. Preserve save compatibility unless an explicitly approved task changes it.
9. Do not implement multiplayer networking, authentication, lobbies or remote persistence until explicitly requested.
10. Prefer typed plain functions, deletion and small cohesive modules over speculative frameworks.
11. Codex implements one bounded task per branch/PR and must not begin roadmap items that are not explicitly included in the task.

## Current Objective

Expand gameplay depth and One Piece content while preserving the deterministic portable domain and local/offline prototype.

## Current Phase

Gameplay expansion — Combat Identity Pack C (Law / Ace / Hancock / Doflamingo).

## Last Completed Work

- 2026-08-27 — `3489ef4`, PR #13 on `feature/combat-identity-pack-c`: composed existing pull, knockback, Energy Drain, stun and burn mechanics for Law, Ace, Hancock and Doflamingo without engine changes. Content moved to version `1.7.0`; save schema remains version 6. Material files: `game/content.ts`, the new Pack C combat test and prior content-version regression tests.
- 2026-08-27 — `767733f`, PR #12 on `feature/combat-identity-pack-b`: added Sabo's brief AoE stun, Luffy's post-Gatling knockback, Kid's deterministic one-cell pull and Crocodile's 15-Energy Drain. Content moved to version `1.6.0`; save schema remains version 6. Material files: `game/combat.ts`, `game/content.ts`, `game/types.ts`, the new Pack B combat test and prior content-version regression tests.
- 2026-08-27 — `08d4ccd`, PR #11 on `feature/combat-identity-pack-a`: added Chopper's conditional post-heal shield and composed existing knockback, Energy Drain, burn and stun primitives for Sanji, Robin and Smoker. Content moved to version `1.5.0`; save schema remains version 6.
- 2026-08-27 — `e904305`, merged PR #10: added a validated serializable 15-Energy Drain after Thunderbolt Tempo's existing AoE damage, reusing the clamped Energy mutation/event pipeline for Nami.
- 2026-08-27 — `fc9fa91`, merged PR #9: added deterministic one-cell knockback after Exploding Star damage, lexicographic AoE collision resolution, and reusable `unit-displace` events for Usopp.
- 2026-08-27 — `d2dd7e9`, merged PR #8: added a reusable serializable sequential-strike primitive, deterministic in-range retargeting, a conditional final-hit bonus, one-based `ability-hit` events, and presentation-only rapid-slash playback for Zoro's Oni Giri.
- 2026-08-27 — `6c7d66d`, PR #7: added the current handoff and bounded Codex execution contract, a manual 1,000-match release-soak workflow, and minimal release-documentation synchronization. No runtime or gameplay files changed; stale pre-hardening PR #1 was closed as superseded.
- 2026-08-27 — `d2a4c7b` (`refactor(game): harden deterministic architecture and PAC combat`): introduced the typed command/context boundary; decomposed `GameClient`; extracted cohesive domain modules; split persistence format from browser persistence; added deterministic hashing and replay coverage; centralized scoring; added carousel structural sharing; improved Phaser asset loading; added CI, coverage, asset validation, production smoke/soak tooling, and architecture/future-multiplayer/release documentation. PAC combat cadence and Tashigi lunge gameplay changes were included in the same commit.
- Materially changed hardening areas: application/session boundaries, game domain and persistence modules, selectors/screens, Phaser board presentation, deterministic/portability tests, CI/release tooling, and architecture documentation.

## Verification

Current `main` baseline (`f0a2d3b`, merged PR #12) includes the verified Combat Identity Pack B:

- PASS — `npm run typecheck`
- PASS — `npm run lint`
- PASS — `npm test`
- PASS — `npm run test:coverage`
- PASS — `npm run assets:validate`
- PASS — `npm run test:production-smoke`
- PASS — `npm run build`
- PASS — `npm run test:e2e`

This Zoro vertical slice:

- PASS — `npm run typecheck` (run through the installed npm CLI).
- PASS — `npm run lint` (run through the installed npm CLI).
- PASS — focused combat/presentation tests: 4 files, 26 tests.
- PASS — `npm test`: 26 files, 174 tests.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- PASS — `npm run test:e2e`: 13 passed, 3 skipped.
- NOT RUN — `npm run test:production-soak`; it remains a deliberate manual release action.

This Usopp vertical slice:

- PASS — `npm run typecheck` (run through the installed npm CLI).
- PASS — `npm run lint` (run through the installed npm CLI).
- PASS — focused combat/presentation regressions: 5 files, 37 tests.
- PASS — `npm test`: 27 files, 182 tests.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- NOT RUN — `npm run test:e2e`; no app, selector or Phaser source changed.
- NOT RUN — `npm run test:production-soak`; it remains a deliberate manual release action.

This Nami vertical slice:

- PASS — `npm run typecheck` (run through the installed npm CLI).
- PASS — `npm run lint` (run through the installed npm CLI).
- PASS — focused combat/presentation regressions: 6 files, 47 tests.
- PASS — `npm test`: 28 files, 193 tests.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- NOT RUN — `npm run test:e2e`; no app, selector or Phaser source changed.
- NOT RUN — `npm run test:production-soak`; it remains a deliberate manual release action.

Combat Identity Pack A:

- PASS — `npm run typecheck` (run through the installed npm CLI).
- PASS — `npm run lint` (run through the installed npm CLI).
- PASS — focused combat regressions: 5 files, 57 tests.
- PASS — `npm test`: 29 files, 211 tests.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- NOT RUN — `npm run test:e2e`; no app, selector or Phaser source changed.
- NOT RUN — `npm run test:production-soak`; it remains a deliberate manual release action.

Combat Identity Pack B:

- PASS — `npm run typecheck` (run through the installed npm CLI).
- PASS — `npm run lint` (run through the installed npm CLI).
- PASS — focused combat regressions: 6 files, 74 tests.
- PASS — `npm test`: 30 files, 228 tests.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- NOT RUN — `npm run test:e2e`; no app, selector, Phaser or presentation source changed.
- NOT RUN — `npm run test:production-soak`; it remains a deliberate manual release action.

Combat Identity Pack C:

- PASS — `npm run typecheck` (run through the installed npm CLI).
- PASS — `npm run lint` (run through the installed npm CLI).
- PASS — focused combat regressions: 7 files, 85 tests.
- PASS — `npm test`: 31 files, 239 tests.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- NOT RUN — `npm run test:e2e`; no app, selector, Phaser or presentation source changed.
- NOT RUN — `npm run test:production-soak`; it remains a deliberate manual release action.

## Behavioral Changes

- Combat Identity Pack C adds Law's global post-damage pull, Ace's post-burn knockback, Hancock's global 10-Energy Drain after stun, and Doflamingo's post-stun cluster pull using only existing primitives.
- Combat Identity Pack B adds Sabo's 600ms AoE stun, Luffy's post-three-hit knockback, Kid's deterministic one-cell pull toward himself, and Crocodile's 15-Energy Drain after line damage.
- Combat Identity Pack A adds Chopper's post-heal emergency shield at or below 35% pre-heal HP, Sanji's post-burn knockback, Robin's post-stun 15-Energy Drain, and deterministic line knockback for Smoker.
- Nami's Thunderbolt Tempo now resolves its existing damage and damaged-Energy gains before draining up to 15 Energy from each surviving original affected target. Invalid drain configuration and zero-Energy targets produce no drain event.
- Usopp's Exploding Star now damages its existing target set before surviving affected enemies attempt a deterministic one-cell orthogonal knockback. Occupied or out-of-board destinations fail without preventing damage, and AoE collisions resolve by unit ID.
- Zoro's Oni Giri now resolves as 30% / 30% / remainder strikes, redirects remaining strikes after a KO to the nearest living enemy in range, and grants the third strike 25% raw bonus damage when its current target is at or below 35% HP.
- The previous large hardening commit also changed combat behavior through PAC-inspired action cadence and Tashigi lunge mechanics; those behaviors were not modified here.

## Deviations From Plan

- Combat Identity Pack C stayed within scope with zero new primitives and no combat-engine, type or presentation changes, so E2E was not run.
- Combat Identity Pack B stayed within scope; existing generic displacement, status and Energy presentation required no source changes, so E2E was not run.
- Combat Identity Pack A stayed within scope; existing generic heal, shield, Energy, status and displacement presentation required no source changes, so E2E was not run.
- The Nami vertical slice stayed within scope; existing generic Energy presentation required no source changes, so E2E was not run.
- The Usopp vertical slice stayed within scope; existing generic displacement presentation required no source changes, so E2E was not run.
- The Zoro vertical slice stayed within its requested scope with no gameplay implementation deviations.
- The previous execution exceeded the intended bounded scope and combined architecture refactoring, tooling changes and gameplay changes in one commit.
- `PROJECT_STATE.md` was not present on `main` during that execution.

## Problems / Risks Found

- PAC/Tashigi gameplay changes need separate product/balance review.
- The current historical 1,000-match `BALANCE_REPORT` predates the newest combat behavior.
- The `GameClient`/session boundary is improved, but some direct domain calls remain.
- `engine.ts`, `GameScreens.tsx`, `selectors.ts` and `PhaserBoard` still contain substantial responsibilities.
- `game/index.ts` still exposes a broad internal API.
- The host's default `npm` shim resolves to a missing roaming npm CLI; verification passed through the installed npm CLI without repository changes.
- The Pack A 50-match smoke showed no obvious dominance among Chopper (9.4%), Sanji (14.5%), Robin (3.8%) or Smoker (11.7% conditional win rates). Average full-clock length remained above target at 31.26 minutes; no balance values were changed in response.
- The Pack B 50-match smoke showed Luffy (32.5%) and Sabo (27.4%) above Kid (12.6%) and Crocodile (13.3%) in conditional win rate. The sample is small, Garp remained marginally above the report's 65% target at 65.4%, and average full-clock length remained above target at 31.34 minutes; no values were tuned.
- The Pack C 50-match smoke showed no obvious dominance among Law (21.7%), Ace (26.0%), Hancock (17.7%) or Doflamingo (19.4%). Luffy (35.4%) and Sabo (27.6%) remained elevated in the small sample, and average full-clock length remained above target at 31.54 minutes; no values were tuned.
- On Windows, the first E2E process hung while tearing down its owned Vinext server after all assertions passed; a clean rerun reused that server and exited successfully.

## Important Decisions

- Keep the current prototype offline-capable.
- Future multiplayer is server authoritative.
- Add no multiplayer infrastructure yet.
- Keep a shared deterministic game domain.
- All future Codex work must be bounded and branch/PR based.
- ChatGPT decides architecture and prioritization; Codex executes requested tasks.

## Next Recommended Task

Review Combat Identity Pack C and choose the final high-cost character pack.

## Codex Update Contract

After every Codex task:

- update only changed sections of `PROJECT_STATE.md`;
- record material implementation changes;
- record commands actually run under PASS / NOT RUN / FAIL;
- record deviations;
- record newly discovered risks;
- do not rewrite Permanent Constraints unless explicitly instructed;
- do not copy diffs or code;
- if partial, state what remains;
- never mark tests PASS unless actually executed successfully.

Keep `PROJECT_STATE.md` compact.
