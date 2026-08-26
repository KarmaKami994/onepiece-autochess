# Project State

This file is the compact handoff between ChatGPT (architecture/planning/review) and Codex (implementation). Keep it concise. Git history is the detailed implementation record.

## Permanent Constraints

1. Current prototype must work fully locally/offline.
2. Future target is small private server-authoritative multiplayer for a friends group.
3. `game/` must remain browser/server portable and platform-neutral.
4. Gameplay outcomes must remain deterministic from explicit state, commands, content/config, and seed/tick inputs.
5. Authoritative commands/state/events must remain JSON-serializable.
6. Command intent must remain separate from trusted actor identity; a future client-supplied `playerId` is never authorization.
7. React owns application UI; Phaser owns board/combat presentation; rendering must not determine gameplay outcomes.
8. Preserve save compatibility unless an explicit task approves a schema-breaking change.
9. Do not implement multiplayer networking, auth, lobbies, or remote persistence until explicitly requested.
10. Prefer typed plain functions, deletion, and small modules over new frameworks or speculative abstractions.

## Current Objective

Harden the local prototype, reduce architectural/performance debt, and keep the deterministic domain ready to move behind an authoritative multiplayer server later without rewriting core game rules.

## Current Phase

Preparation complete. Next implementation work should start with release verification/quality gates, then the typed domain boundary and command/actor model.

## Last Completed Work

Date: 2026-08-26

Implemented:
- Added this project-state handoff contract.
- Agreed local-now / private-multiplayer-later architecture direction.
- Defined ChatGPT as architecture/planning/review layer and Codex as execution layer.

Behavioral changes: none.

## Verification

PASS:
- Documentation-only change; no runtime behavior changed.

NOT RUN:
- Typecheck, lint, unit, E2E, soak (not required for this documentation-only change).

FAIL:
- None known.

## Deviations From Plan

None.

## Problems / Risks Found

Known high-priority work from the architecture review:
- `GameClient.tsx` erases game types behind an `unknown` engine adapter and owns too many responsibilities.
- `game/engine.ts` is oversized and deep-clones match state in hot paths.
- Bounty Regatta needs structural sharing and simulation/presentation separation.
- Phaser eagerly loads too many maps/animation sheets.
- Decision-support scoring duplicates engine rules.
- Production smoke/soak naming and reproducibility need cleanup.
- Persistence format should be separated from IndexedDB and covered by schema fixtures.
- Build/hosting stack should be simplified only where unused, without blocking a future independent authoritative server.

## Important Decisions

- Keep the current prototype offline-capable.
- Do not build online features during hardening.
- Keep `GameCommand`, `MatchState`, and useful domain events serializable.
- Introduce only a minimal local-session seam; no networking abstraction framework.
- Future multiplayer should use one authoritative server initially, not peer-to-peer authority or microservices.
- Optimize Codex work for total token efficiency: one agent by default, targeted reads/searches, targeted tests during implementation, expensive suites near phase/final boundaries.

## Next Recommended Task

Implement the first bounded hardening task: separate 50-match production smoke from the authoritative 1,000-match production soak, add reproducibility metadata, and synchronize release documentation/CI. Do not begin unrelated refactors in the same task.

## Codex Update Contract

After every Codex task, update this file before finishing. Edit only the sections that changed.

Record:
- Current Phase
- Last Completed Work (date, commit/PR if known, material changes, materially changed files)
- Verification (PASS / NOT RUN / FAIL)
- Behavioral Changes
- Deviations From Plan
- Problems / Risks Found
- Important Decisions only when a durable decision changed
- Next Recommended Task only if it is obvious from the requested work

Rules:
- Keep the whole file compact; do not copy code or diffs here.
- Do not duplicate details obvious from Git history.
- Do not rewrite Permanent Constraints unless ChatGPT/user explicitly changes project direction.
- Never mark a command PASS unless it was actually run successfully.
- If a task is partial, say exactly what remains.
- If implementation deviates from the task, record the reason in one or two bullets.
