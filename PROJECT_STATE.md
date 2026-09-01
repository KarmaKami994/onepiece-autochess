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
12. PAC-FIRST SYSTEM RESEARCH: before future gameplay/system work, inspect targeted behavior at the pinned official PAC source, separate what it does from why, classify direct/adapted/reference/reject ideas, check deterministic local and future-server fit, lock architecture, and only then issue bounded implementation work.

## Current Objective

Expand gameplay depth and One Piece content while preserving the deterministic portable domain and local/offline prototype.

## Current Phase

PR #36 is merged at `cff9c4ca`, completing production-soak population normalization. The first authoritative normalized pre-P4 baseline is captured from exact clean measurement SHA `cff9c4caed9b09fd64a915908589decc84f02cc8` at `docs/analysis/normalized-pre-p4-baseline-1000.json`: 1,000/1,000 matches completed with zero crashes and no systemic blocker. Balance remains deferred; the next roadmap decision is feature development, with P4 as the expected next major PAC-first research area. GameContent remains `1.15.1` and save schema remains 6.

## Last Completed Work

- 2026-09-01 — Normalized pre-P4 production baseline on `analysis/normalized-pre-p4-baseline`: exactly one 1,000-seed run from clean measurement SHA `cff9c4caed9b09fd64a915908589decc84f02cc8` completed 1,000/1,000 matches with zero crashes. Rounds were 26–51 with 34.036 average; full-clock/paced averages were 33.740/24.064 minutes; timeout/draw rates were 0.8315%/0.0325%. Shops had zero empty slots, every cost band appeared on final boards, Robin's Demonio invariant held, Monster Point reached all matches and Gear 4 remained very rare. Conclusion: baseline healthy enough to continue feature development; defer balance analysis. Snapshot: `docs/analysis/normalized-pre-p4-baseline-1000.json`, SHA-256 `80f4551af28e46f8976a014246b75da42fa1c674de7a0720924e775bfbaffd22`. Material files: the snapshot, `docs/NORMALIZED_PRE_P4_BASELINE.md`, `PROJECT_STATE.md`.
- 2026-09-01 — `cff9c4ca`, merged PR #36: the production-soak harness assigns all eight participants as bots before the first phase advancement and rotates the seven existing personality IDs with `(seedIndex + playerIndex) % personalityIds.length`. Each match contains all seven personalities plus one rotating duplicate; across seven seeds each personality has eight assignments and each player slot uses every personality once. Normal `createMatch()`, bot policy, gameplay, metrics, RNG, GameContent and schema are unchanged. Historical snapshots retain their exact-harness conclusions. Material files: `scripts/run_production_soak.ts`, `tests/production-audit.test.ts`, `docs/BOT_ARCHITECTURE_AND_BIAS_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-09-01 — `26b0a75`, merged PR #35: P3B replaced greedy local selection with exhaustive complete-round optimization bounded to eight players. Total directed encounter count is minimized first, total recency distance maximized second, and one project-seeded deterministic choice resolves exact ties. Real pairs score both histories; ghosts score only the real fighter's history. All alive players participate once directly, odd rounds add exactly one ghost, dead players are excluded, and `lastOpponents` preserves compact full PvP/ghost history while ghost owners remain unmodified. Captain damage, combat, battle seeds, cadence, economy, bots, analytics, content and schema are unchanged. Material files: `game/pairing.ts`, `game/engine.ts`, `tests/game/pairing.test.ts`, `docs/MATCH_FLOW_AND_PACING_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-09-01 — P3 Match Flow / Pacing architecture record and simultaneous-elimination correctness fix on `fix/simultaneous-elimination-placement`: same-resolution eliminations now rank best-to-worst by post-damage HP, then level, then ascending ID only for a true state tie, and receive the contiguous placement block derived from the alive count captured before cleanup. Existing final-crew, pool/shop return, winner and zero-survivor behavior remain intact. P3 Option 3 keeps the phase graph, preparation timing, 45-second battle cap, carousel sequencing, early PvE cadence, ghosts, timeout resolution and current draw semantics; pairing and captain damage are deferred without implementation. Late PAC PvE/events remain P4 reference only. No content, schema, analytics, bot or soak change. Material files: `game/matchFlow.ts`, `game/engine.ts`, `tests/game/match-flow.test.ts`, `docs/MATCH_FLOW_AND_PACING_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-09-01 — P2 Economy / Progression PAC-first audit and PR #33 review correction on `analysis/economy-progression-audit`: verified normal PAC economy at pinned commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee` and the local lifecycle at main `c3075ef`. Architecture Option 1 keeps the current deterministic finite-pool economy: liquid start values, income, interest, XP, normal shop, odds, buy price and bench values already match or deliberately adapt PAC. PAC additionally grants a Stage-0 starter selected from three propositions plus its associated item component; this opening-resource difference is REFERENCE ONLY and does not establish a local defect. Full `cost × 1/3/9` sell refund is WATCH / NEEDS MEASUREMENT rather than a defect; fixed per-unit pools preserve contest ceilings but dilute specific-unit rolls as cost bands expand. No transactional economy defect was found. Realized level, streak, reroll, high-cost and star outcomes are P3-coupled, so the sole next task is P3 PAC-first Match Flow / Pacing research. The asymmetric soak population remains a mandatory gate before a new authoritative baseline. No code, value, metric or simulation changed. Material files: `docs/ECONOMY_AND_PROGRESSION_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-08-31 — `c3075ef`, merged PR #32: completed the bot architecture/meta-bias audit and review hardening. Adaptive bots remain the real-match/production-meta class; a separate scripted benchmark concept may be added later. Retrospective source correction: pre-fix main already converted `player-1` before the first preparation transition, so the confirmed remaining harness defect was the permanent Balanced duplication, not a round-one bot-turn omission. Prior snapshots remain exact-historical-harness evidence. Smoker remains frozen. Material files: `docs/BOT_ARCHITECTURE_AND_BIAS_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-08-31 — bot architecture and meta-bias audit on `analysis/bot-architecture-bias-audit`: verified the official PAC scenario-bot model at pinned commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee` and mapped the current adaptive purchase, progression, lineup, formation and item policy. Architecture decision: retain adaptive bots for real-match/meta simulation and consider a separate adapted scripted benchmark concept later; PAC backend infrastructure is rejected. Retrospective correction confirms the production-soak harness already made all participants bots before round-one preparation; its remaining measurement defect was assigning `player-1` Balanced permanently and thereby duplicating that personality. Existing snapshots remain valid exact-historical-harness evidence. No gameplay, bot weight, harness code or simulation changed in the audit. Material files: `docs/BOT_ARCHITECTURE_AND_BIAS_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-08-31 — `f618061`, merged PR #31: reviewed the four committed Smoker snapshots, current 2-cost peers, targeted kits, Navy/Guardian/Straw Hat reachability and line/adjacent geometry without changing gameplay or running a simulation. Decision: C — targeted diagnostics first. Smoker remains strongly above the full band but only modestly above Franky (+2.16 pp top four, +3.67 pp conditional wins, 0.152 better placement), while Franky has stronger raw stats and higher measured cast, target, damage and control expression. Aggregate evidence cannot separate intrinsic Smoker strength from Navy/Guardian composition and selective retention. Smoker is now frozen as a watch item while roadmap work proceeds. GameContent remains `1.15.1`; save schema remains 6. Material files: `docs/SMOKER_RESIDUAL_ADVANTAGE_REVIEW.md`, `PROJECT_STATE.md`.
- 2026-08-31 — `76609be`, merged PR #30: changed only Smoker `attackIntervalMs` from 1200 to 1400 and GameContent from `1.15.0` to `1.15.1`; White Blow remains 180-power nearest-enemy line damage with knockback, and save schema remains 6. The clean measurement SHA is `cf07eb4a690f4437ae476de80b888d175d0b00cf`. Exactly one 1,000-seed run completed 1,000/1,000 with zero crashes. Casts per battle-board appearance fell 1.9963→1.8151, total knockbacks 42,226→36,772, while damage/cast and knockbacks/cast stayed roughly stable. Top four fell 66.06%→61.27%, conditional wins 21.54%→20.10%, average placement worsened 3.640→3.869 and winner presence fell 34.2%→31.3%; same-cost deltas remain coherently positive at +12.37 pp top four, +8.31 pp wins and -0.672 placement. Classification: B — improved but still clearly overperforming. Snapshot: `docs/analysis/smoker-cadence-1400-1000.json`, SHA-256 `b579e4be607f17996b6166a2c2288c0c21849b918cb2e0e3a67df7a4d7dd6cc4`. Material files: `game/content.ts`, focused/version tests, the raw snapshot, `docs/SMOKER_CADENCE_BALANCE_PASS.md`, `PROJECT_STATE.md`.
- 2026-08-31 — Draft PR #29 on `analysis/post-forms-roster-assessment`: review hardening replaced full-crew persistent-form outcomes with the same last deployed `player.board` observation as base `characterPresence`, excluding bench units and deduplicating forms per player board. This is an ADAPTED PORT of PAC's deployed-only endgame-statistics semantics without copying its data model. The corrected clean-commit measurement SHA is `ed1feeeac78c84a6714ba05aa13fee7097a86548`; the rejected pre-fix SHA `7780b44a` remains in history. Exactly one corrected 1,000-seed run completed 1,000/1,000 with zero crashes. A complete field comparison differed from the rejected output only in `generatedAt` and `gitSha`, so corrected deployed outcomes remain Demonio 407, Boundman 3 and Snakeman 1; Robin's deployed 3-star invariant holds, Monster Point remains 56,566 transforms, and all system/base metrics are unchanged. Smoker remains clearly overperforming; overall classification B and the sole recommendation remains an isolated Smoker adjustment. The corrected snapshot SHA-256 is `ea07805c335e81e1fd71e77172a77928625668ee8fa6f3cd9e8d9c7a53a6192e`. GameContent remains `1.15.0`; save schema remains 6. Material files: `scripts/run_production_soak.ts`, `tests/production-audit.test.ts`, the replaced raw snapshot, `docs/POST_FORMS_ROSTER_ASSESSMENT.md`, `PROJECT_STATE.md`.
- 2026-08-31 — PR #28 on `feature/chopper-monster-point`: added the first production battle-temporary form. Each living base Chopper on a team with a frozen active Straw Hat tier transforms at 8 seconds in deterministic unit-ID order, after periodic deaths and before same-tick actions. Monster Point applies star-scaled live deltas to 800/60/28/range 1, preserves absolute damage and all combat state, and replaces Emergency Cure with 250-power nearest-cluster Monster Point Slam plus 600ms stun. Generic `unit-transform` events drive immutable snapshot/save/spectator playback and a reduced-motion-safe text cue; review hardening now carries exact post-transform live HP/max HP into Phaser resource state so subsequent damage and final reconciliation use the transformed maximum. Persistent Chopper, traits, cadence, economy and next-battle setup remain base. Production forms are 4; roster remains 30; GameContent is `1.15.0`; save schema remains 6. Material files: `game/types.ts`, `game/content.ts`, `game/combat.ts`, `app/selectors.ts`, `components/PhaserBoard.tsx`, `components/unitResourceBar.ts`, focused/version tests, `docs/CHARACTER_FORM_SYSTEM.md`, `PROJECT_STATE.md`.
- 2026-08-30 — PR #27 on `feature/luffy-gear-four`: added persistent Luffy Gear 4 Boundman and Snakeman branches while preserving base Luffy and the normal nine-copy 3-star economy. A retained Armament Wraps selects Boundman; retained Sniper Goggles selects Snakeman; earliest equipped-item-array catalyst wins the initial tie, catalysts are not consumed, overflow does not select, and an assigned branch locks. Boundman is 990/86/34/range 1/1000ms with 285-power Kong Gun, 600ms stun and knockback; Snakeman is 850/78/24/range 4/700ms with 300-power four-strike Jet Culverin and in-range KO retargeting. Equip and schema-6 loading use the same explicit character reconciliation, including `finalCrew`, without rewriting frozen battle snapshots; Robin behavior remains intact. Production forms are 3; roster remains 30; GameContent is `1.14.0`; save schema remains 6. Material files: `game/content.ts`, `game/forms.ts`, `game/roster.ts`, `game/engine.ts`, `game/persistenceFormat.ts`, focused tests, content-version assertions, `docs/CHARACTER_FORM_SYSTEM.md`, `PROJECT_STATE.md`.
- 2026-08-30 — `d7673ba`, merged PR #26: added Robin's persistent Demonio Fleur form after the normal nine-copy 3-star merge while preserving the surviving anchor, base/economic `definitionId`, items, position, shop/pool accounting and sell value. Demonio replaces only Clutch with 180-power lowest-health adjacent damage, 1400ms stun and 20-Energy Drain; base stats, traits and assets remain inherited. Schema-6 loading reconciles persistent current/future 3-star Robin in `player.units` and `finalCrew` without rewriting frozen battle snapshots, clears only invalid 1/2-star Demonio assignments and preserves unrelated unknown form IDs. Production forms were 1; roster remained 30; GameContent was `1.13.0`; save schema remained 6. Material files: `game/content.ts`, `game/forms.ts`, `game/roster.ts`, `game/persistenceFormat.ts`, focused tests, content-version assertions, `docs/CHARACTER_FORM_SYSTEM.md`, `PROJECT_STATE.md`.
- 2026-08-30 — PR #25 on `feature/character-form-foundation`: added the pure serializable Character Form System seam with separate persistent and battle-temporary lifecycles, optional persistent `UnitInstance.formId`, frozen battle setup/snapshot form identity, stat/ability/trait/presentation overlays, base-definition trait uniqueness and schema-6 save compatibility. Review hardening made battle trait presentation use frozen snapshot forms and made each frozen source ability authoritative over colliding global ability IDs. Production `forms` remains empty; Robin, Luffy and Chopper are unchanged. GameContent is `1.12.0`; save schema remains 6. Material files: `game/types.ts`, `game/forms.ts`, content/trait/combat/engine exports and integration, selector/battle presentation integration, focused tests, `docs/CHARACTER_FORM_SYSTEM.md`, `PROJECT_STATE.md`.
- 2026-08-30 — `bc0faec`, merged PR #24: added a one-Emperor team-wide +4% health/+4% attack entry tier while preserving the two-distinct-Emperor +8%/+8% tier, highest-tier-only semantics, Shanks, Blackbeard and Captain. Added observational exact-tier production diagnostics. GameContent was `1.11.2`; save schema remained 6. Exactly one clean-commit 1,000-seed soak completed 1,000/1,000 matches with zero crashes: any/exact Tier 1 reached 813 boards and 176 matches, exact Tier 2 reached zero, and system guardrails were materially unchanged. Classification A, good reachability; Shanks' small-sample conditional-win increase remains a watch signal, not tuning evidence. Material files: `game/content.ts`, `scripts/run_production_soak.ts`, focused Emperor/diagnostic/version tests, `docs/analysis/emperor-reachability-1000.json`, `docs/EMPEROR_REACHABILITY_PASS.md`, `PROJECT_STATE.md`.
- 2026-08-30 — `3826307`, merged PR #23: reduced only Smoker's White Blow base power from 210 to 180 and moved GameContent from `1.11.0` to `1.11.1`; Smoker's stats, cost, Navy / Guardian traits, targeting and knockback are unchanged, and save schema remains 6. Exactly one post-change 1,000-seed soak completed 1,000/1,000 matches with zero crashes. Smoker moved from 65.83% to 64.84% top four, 21.69% to 20.77% conditional wins, 3.636 to 3.705 average placement and 34.4% to 32.9% winner presence, but remains a coherent positive 2-cost outlier; classification B, still clearly overperforming. Material files: `game/content.ts`, focused content/combat and content-version assertions, `docs/analysis/smoker-white-blow-180-1000.json`, `docs/SMOKER_BALANCE_PASS.md`, `PROJECT_STATE.md`.
- 2026-08-29 — `538c9fa`, PR #22 on `analysis/30-unit-roster-assessment`: completed the first 30-unit production assessment with exactly one 1,000-seed soak. The run completed 1,000/1,000 matches with zero crashes, 33.56 average rounds, 33.59 full-clock minutes, 24.03 paced minutes, 133,841 battles, 1.175% timeouts and 0.030% draws. Diagnostics now report final-board cost representation, observed shop/pool availability, relative trait/match reach, Emperor + Captain reach, all-enemy casts and Defense Pierce casts. Smoker and Luffy are the strongest positive same-cost signals; Nami, Robin, Crocodile and Ivankov are the clearest negatives; Sabo and Ace's old alarms do not persist. Emperor reached only 4/1,000 matches. No gameplay, content, AI, persistence, schema, economy, trait or balance value changed; content remains `1.11.0` and save schema remains 6. Material files: `scripts/run_production_soak.ts`, `tests/production-audit.test.ts`, `docs/analysis/30-unit-roster-assessment-1000.json`, `docs/THIRTY_UNIT_ROSTER_ASSESSMENT.md`, `PROJECT_STATE.md`.
- 2026-08-29 — PR #21 on `feature/live-opponent-spectating`: added client-only opponent battle spectating for living captains during the active battle phase. A pure presentation selector resolves the observed captain's existing immutable `MatchBattleResult`, reusing playerA/playerB mirroring for boards and events plus current PvE and ghost semantics. Local actor identity remains `player-1`; local Shop, Reroll, Lock and Buy XP stay interactive while the observed tactical board is read-only. Deterministic result/perspective event sequences restart only switched presentations without resetting the local battle clock. Spectator selection is cleared on phase transition and is not saved. No domain, combat, persistence, schema, content or balance change; content remains `1.11.0`, save schema remains 6. Material files: `app/selectors.ts`, `app/GameClient.tsx`, `app/screens/GameScreens.tsx`, `app/game.css`, focused selector/presentation/E2E tests and `PROJECT_STATE.md`.
- 2026-08-28 — PR #20 on `feature/combat-economy-actions`: enabled PAC-style Buy, Reroll, Lock and Buy XP actions during battle plus bench selling and bench-to-bench movement while keeping the deployed formation, item equip, pairings and precomputed `MatchBattleResult` immutable. Battle presentation now uses self-contained battle-start star/item snapshots while the live bench updates without resetting Phaser combat playback. Review hardening made deployed-fighter comparison order-independent without weakening fighter-property checks and made `ACTIVE_SAVE` writes monotonic by `updatedAt` within one IndexedDB transaction. New battle saves persist the current battle state directly; legacy schema-6 `replayBattle` saves still reconstruct once. Content remains `1.11.0`; save schema remains 6. Material files: `game/engine.ts`, `game/types.ts`, `game/combat.ts`, `app/GameClient.tsx`, `app/selectors.ts`, `app/voyagePersistence.ts`, `app/screens/GameScreens.tsx`, `components/PhaserBoard.tsx`, focused domain/selector/Phaser/save/E2E tests and `PROJECT_STATE.md`.
- 2026-08-28 — `bf96b62`, PR #19 on `feature/pac-style-shop-lock`: adapted PAC-style automatic locked-shop refill semantics. Retained offers stay in place and preserve their shared-pool reservation; only empty/purchased slots roll through the existing current-level odds and consume deterministic RNG/pool copies; the one-round lock then clears. Manual rerolls remain full and unlocked automatic refreshes are unchanged. Content remains `1.11.0`; save schema remains 6. Material files: `game/economy.ts`, `game/engine.ts`, `tests/game/economy-board.test.ts`, `PROJECT_STATE.md`.
- 2026-08-28 — `0e33663`, PR #18 on `feature/roster-expansion-pack-f`: added Kuzan, Akainu, Shanks and Blackbeard using only existing stun, burn, Defense Pierce, Energy Drain and pull mechanics. The base-shop roster is now 30 units at 6/7/6/7/4 by cost. Added the Emperor origin; two distinct Emperors grant the whole team +8% health and +8% attack. Content moved to `1.11.0`; save schema remains 6. Added no combat primitive, TraitEffect kind, engine/type/persistence/presentation change or asset, and documented the existing shared placeholder's clean-room provenance. Material files: `game/content.ts`, `tests/game/roster-expansion-pack-f.test.ts`, necessary roster/content-version assertions, `ASSET_PROVENANCE.md` and `PROJECT_STATE.md`.
- 2026-08-28 — PR #17 Browser E2E remediation on `feature/roster-expansion-pack-e`: added one neutral repository-authored SVG placeholder and routed the eight Pack D/E expansion units to it for portraits and tactical tokens. Updated the two sprite-specific E2E flows to select recruits with dedicated animation art instead of assuming the first RNG shop slot has an atlas. Pack E gameplay, content `1.10.0` and save schema 6 are unchanged. Material files: `public/assets/characters/placeholder.svg`, `game/content.ts`, `app/selectors.ts`, focused selector/roster tests, `e2e/viewport.spec.ts` and `PROJECT_STATE.md`.
- 2026-08-28 — `76e6c07`, PR #17 on `feature/roster-expansion-pack-e`: added Ivankov, Jinbe, Kuma and Kizaru as content-driven base-shop units using only existing heal, conditional shield, line targeting, Defense Pierce and knockback mechanics. The roster is now 26 units with cost distribution 6/7/6/5/2. Content moved to `1.10.0`; save schema remains 6. No existing character, trait, pool, shop, economy, combat-engine, type, persistence or presentation values changed. Material files: `game/content.ts`, `tests/game/roster-expansion-pack-e.test.ts`, necessary roster/content-version assertions and `PROJECT_STATE.md`.
- 2026-08-27 — `9419b8c`, PR #16 on `feature/roster-expansion-pack-d`: added Koby, Koala, Franky and Brook as content-driven base-shop units using only existing lunge, stun and knockback mechanics. The roster is now 22 units with cost distribution 6/6/4/4/2. Content moved to `1.9.0`; save schema remains 6. No existing character, trait, pool, shop or economy values changed. Material files: `game/content.ts`, `tests/game/roster-expansion-pack-d.test.ts`, necessary roster/content-version assertions and `PROJECT_STATE.md`.
- 2026-08-27 — `46849a8`, PR #15 on `analysis/full-roster-balance-readability`: completed the first post-identity-pass 1,000-seed full-roster assessment. Added cost-band, placement, top-four, Wilson-interval, combat-expression and PvP readability diagnostics plus the exact generated snapshot and decision report. No gameplay, content, presentation or save values changed; content remains `1.8.0` and save schema remains 6. Material files: `scripts/run_production_soak.ts`, `tests/production-audit.test.ts`, `docs/analysis/full-roster-balance-1000.json`, `docs/FULL_ROSTER_BALANCE_ASSESSMENT.md`, `PROJECT_STATE.md`.
- 2026-08-27 — `6e012d3`, PR #14 on `feature/final-high-cost-identity-pack`: replaced Garp's global stun with post-damage global knockback and added transient per-ability Defense Pierce for Mihawk. Content moved to version `1.8.0`; save schema remains version 6. Material files: `game/combat.ts`, `game/content.ts`, `game/types.ts`, the new high-cost identity test and prior content-version regression tests.
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

Normalized pre-P4 production baseline:

- PASS — focused `tests/production-audit.test.ts` before measurement and after report creation: 1 file and 10 tests passed in each run.
- PASS — exactly one `npm run test:production-soak` equivalent through the installed npm CLI: seeds `production-0` through `production-999`, 1,000/1,000 complete matches, zero crashes, measurement SHA `cff9c4caed9b09fd64a915908589decc84f02cc8`.
- PASS — raw `tmp/production-soak-report.json` was copied byte-for-byte to `docs/analysis/normalized-pre-p4-baseline-1000.json`; both SHA-256 values were `80f4551af28e46f8976a014246b75da42fa1c674de7a0720924e775bfbaffd22`.
- PASS — `npm run typecheck` and `npm run lint` equivalents through the installed npm CLI completed with exit 0.
- PASS — final scope/diff inspection contains only the raw snapshot, `docs/NORMALIZED_PRE_P4_BASELINE.md` and `PROJECT_STATE.md`; GameContent remains `1.15.1` and save schema remains 6.
- NOT RUN — a second 1,000-seed soak; the first run produced the valid authoritative result.
- NOT RUN — full unit suite, build or Browser E2E; not required for this analysis-only artifact task.

Production-soak population normalization:

- PASS — focused `tests/production-audit.test.ts`: 1 file and 10 tests passed, including deterministic assignment, all-bot/valid-ID invariants, one rotating duplicate, seven-seed personality totals, per-slot coverage and a three-seed soak regression.
- PASS — `npm run typecheck` equivalent through the installed npm CLI: TypeScript completed with exit 0.
- PASS — `npm run lint` equivalent through the installed npm CLI: ESLint completed with exit 0.
- PASS — `npm test` equivalent through the installed npm CLI: 42 files and 385 tests passed; `tests/soak.test.ts` remained excluded by the normal script.
- PASS — `npm run test:production-smoke` equivalent through the installed npm CLI: 50/50 matches completed with zero crashes; results were not used for balance analysis.
- PASS — `npm run build` equivalent through the installed npm CLI: Vinext production build completed with exit 0; only the existing chunk-size advisory was reported.
- NOT RUN — `npm run test:production-soak`; no 1,000-seed run or authoritative baseline was generated.
- NOT RUN — Browser E2E; no UI, browser or Phaser behavior changed.

P3B deterministic global PvP pairing:

- PASS — focused `tests/game/pairing.test.ts`: 13 tests passed across deterministic RNG, direct participation, even/odd and ghost structure, global count optimum, count/recency priority, exact ties, bidirectional/ghost scoring, full history and dead-player exclusion.
- PASS — focused `tests/game/match-flow.test.ts`: 17 tests passed.
- PASS — `npm run typecheck` equivalent: TypeScript completed with exit 0.
- PASS — `npm run lint` equivalent: ESLint completed with exit 0.
- PASS — normal unit suite: 42 files and 383 tests passed; `tests/soak.test.ts` excluded by the normal script.
- PASS — `npm run build`: Vinext production build completed with exit 0; only the existing chunk-size advisory was reported.
- NOT RUN — Browser E2E; no UI dependency changed.
- NOT RUN — 1,000-seed production soak or other balance/pairing simulation.

P3 simultaneous-elimination placement:

- PASS — focused `tests/game/match-flow.test.ts`: 17 tests passed, including single elimination, HP-first ordering against ID order, level fallback, exact-tie ID fallback, four-player batch, top-four boundary and cleanup.
- PASS — `npm run typecheck` equivalent: TypeScript completed with exit 0.
- PASS — `npm run lint` equivalent: ESLint completed with exit 0.
- PASS — normal unit suite: 41 files and 370 tests passed; `tests/soak.test.ts` excluded by the normal script.
- PASS — `npm run build`: Vinext production build completed with exit 0; only the existing chunk-size advisory was reported.
- NOT RUN — Browser E2E; this non-UI change does not require a special local run.
- NOT RUN — production soak, parameter sweep, balance simulation or pairing tournament.

P2 Economy / Progression audit:

- PASS — PAC liquid start, Stage-0 starter/component grant, income, interest, streak, XP, odds, shop, pool, buy/sell, bench and rollover facts were verified against targeted official files at pinned commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`.
- PASS — all local values, lifecycle ordering and transactional invariants were verified against current main `c3075ef`; deterministic no-spend progression and current pool totals were recomputed from committed config.
- PASS — PAC facts are separated from engineering inference; P2-intrinsic and P3-coupled conclusions are explicit; report and project state select the same sole next task.
- PASS — final diff is documentation-only: `docs/ECONOMY_AND_PROGRESSION_AUDIT.md` and `PROJECT_STATE.md`.
- NOT RUN — tests, typecheck, lint, production smoke, build or Browser E2E; no source/config changed.
- NOT RUN — production soak, tournament, parameter sweep, Monte Carlo or match simulation.

Bot architecture and meta-bias audit:

- PASS — all PAC facts were verified against targeted official files at pinned commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`; latest PAC main was not used for architecture conclusions.
- PASS — all One Piece bot pipeline, score, formation, item and P2/P3 dependency statements were verified against current main `f618061`.
- PASS — retrospective source correction verified that pre-fix main converted `player-1` before the first preparation transition and permanently assigned Balanced, leaving a fixed personality duplication rather than a round-one bot-turn omission.
- PASS — purchase-gate wording now matches the exact `score >= cost * 25 + 24` non-reserve threshold; a lone `+20` preference does not satisfy it.
- PASS — report separates implementation facts, engineering inference, intentional simplifications, plausible bias, scalability concerns and measurement gaps.
- PASS — final diff is documentation-only: `docs/BOT_ARCHITECTURE_AND_BIAS_AUDIT.md` and `PROJECT_STATE.md`; report and next task agree.
- NOT RUN — unit tests, typecheck, lint, production smoke, build or Browser E2E; no code changed.
- NOT RUN — production soak, tournament, parameter sweep or any simulation.

Smoker residual-advantage review:

- PASS — all four cited snapshots and both prior Smoker reports exist; exact peer, intervention, trait and combat-expression values were checked against committed JSON.
- PASS — derived 2-cost-without-Smoker arithmetic was independently recomputed from peer counts and placement totals.
- PASS — documentation consistency and baseline checks: main `76609be`, GameContent `1.15.1`, schema 6, 30 units, four forms, Smoker White Blow 180 / 1400ms.
- PASS — final diff is documentation-only: `docs/SMOKER_RESIDUAL_ADVANTAGE_REVIEW.md` and `PROJECT_STATE.md`.
- NOT RUN — unit tests, typecheck, lint, production smoke, build and Browser E2E; no code changed.
- NOT RUN — production soak or any other simulation; this review uses existing committed evidence only.

Smoker cadence pass:

- PASS — focused Smoker content, White Blow and 14-tick cadence regression: 1 file / 19 tests.
- PASS — Robin Demonio Fleur, Luffy Gear 4 and Chopper Monster Point regressions: 3 files / 38 tests.
- PASS — `npm run typecheck` and `npm run lint` through the installed npm CLI.
- PASS — `npm test`: 41 files / 365 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes; no balance conclusion taken.
- PASS — `npm run build`.
- PASS — exactly one `npm run test:production-soak`: 1,000/1,000 complete matches, zero crashes, seeds `production-0` through `production-999`, measurement SHA `cf07eb4a690f4437ae476de80b888d175d0b00cf`.
- PASS — snapshot provenance and byte-identical copy: GameContent `1.15.1`, schema 6, content hash `206d8fa9`, config hash `977295da`, Node `v24.3.0`, SHA-256 `b579e4be607f17996b6166a2c2288c0c21849b918cb2e0e3a67df7a4d7dd6cc4`.
- NOT RUN — Browser E2E; no UI, browser, Phaser or presentation source changed.

Post-forms roster assessment:

- PASS — review-hardening production audit: 1 file, 8 tests; Robin/Luffy/Chopper regressions: 3 files, 38 tests.
- PASS — corrected-measurement `npm run typecheck`, `npm run lint`, `npm test`: 41 files / 364 tests, `npm run assets:validate`, 50-seed production smoke, and `npm run build`.
- PASS — exactly one corrected `npm run test:production-soak`: 1,000/1,000 complete matches, zero crashes, seeds `production-0` through `production-999`, measurement SHA `ed1feeea`.
- PASS — rejected-vs-corrected recursive snapshot comparison: exactly two differences, `generatedAt` and `gitSha`; all metrics remained identical.
- PASS — post-report `npm run typecheck` and focused production audit: 1 file, 8 tests.
- PASS — focused production-audit tests: 1 file, 5 tests; form pilot regressions: 4 files, 48 tests.
- PASS — `npm run typecheck` and `npm run lint` through the installed npm CLI before measurement.
- PASS — `npm test`: 41 files, 361 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes; diagnostic validation only.
- PASS — `npm run build`.
- PASS — exactly one `npm run test:production-soak`: 1,000/1,000 complete matches, zero crashes, seeds `production-0` through `production-999`.
- PASS — post-report snapshot/provenance reconciliation, `npm run typecheck`, and focused production-audit test: 1 file, 5 tests.
- NOT RUN — local Browser E2E; no application, UI or Phaser production code changed, as scoped.

Chopper Monster Point pilot:

- PASS — review-hardening Monster Point/resource regressions: 2 files, 22 tests; affected Robin/Luffy form regressions: 2 files, 23 tests.
- PASS — `npm run typecheck` through the installed npm CLI.
- PASS — `npm run lint` through the installed npm CLI.
- PASS — `npm test`: 41 files, 357 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes; regression safety only, not tuning evidence.
- PASS — `npm run build`.
- PASS — `npm run test:e2e`: 17 passed, 3 skipped; after all scenarios completed, the known Windows-owned Vinext server teardown hang was released by stopping that exact spawned server process and the command returned exit 0.
- NOT RUN — `npm run test:production-soak`; explicitly reserved for the separate post-forms assessment.

Luffy Gear 4 pilot:

- PASS — focused Luffy, Robin and base-Luffy regressions: 3 files, 40 tests.
- PASS — `npm run typecheck` through the installed npm CLI.
- PASS — `npm run lint` through the installed npm CLI.
- PASS — `npm test`: 40 files, 341 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes; used only for regression safety, not balance conclusions.
- PASS — `npm run build`.
- PASS — `npm run test:e2e`: 17 passed, 3 skipped; the unchanged suite returned exit 0 against a separately started local Vinext server after the owned-server Windows teardown hang reproduced.
- NOT RUN — `npm run test:production-soak`; deliberately deferred until the planned form pilots are complete.

Robin Demonio Fleur pilot:

- PASS — focused Robin pilot and affected Robin/form/persistence regressions: 4 files, 53 tests.
- PASS — `npm run typecheck` through the installed npm CLI.
- PASS — `npm run lint` through the installed npm CLI.
- PASS — `npm test`: 39 files, 327 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes; used only for regression safety.
- PASS — `npm run build`.
- PASS — `npm run test:e2e`: 17 passed, 3 skipped; the exact owned Vinext server was terminated after the known Windows teardown hang and Playwright returned exit 0.
- NOT RUN — `npm run test:production-soak`; deliberately deferred until the planned form pilots are complete.

Character Form System foundation:

- PASS — focused form foundation: 1 file, 10 tests covering resolver, traits, combat/snapshots, economy/merge, persistence and selectors.
- PASS — PR #25 review regressions: focused form foundation 10 tests; selector/battle-outcome 2 files, 17 tests.
- PASS — directly affected regressions: 8 files, 75 tests.
- PASS — `npm run typecheck` through the installed npm CLI.
- PASS — `npm run lint` through the installed npm CLI.
- PASS — `npm test`: 38 files, 318 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- PASS — `npm run test:e2e`: 17 passed, 3 skipped.
- NOT RUN — `npm run test:production-soak`; deliberately excluded because production forms are empty and default gameplay is unchanged.

Emperor reachability pass:

- PASS — focused Emperor/Pack-F test: 1 file, 11 tests.
- PASS — focused tier-diagnostic test: 1 file, 1 test.
- PASS — focused save/content compatibility tests: 2 files, 19 tests.
- PASS — `npm run typecheck`.
- PASS — `npm run lint`.
- PASS — `npm test`: 37 files, 308 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run build`.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — clean implementation commit and empty working tree verified before production measurement.
- PASS — `npm run test:production-soak`: exactly one run, 1,000/1,000 complete matches, zero crashes.
- PASS — saved snapshot byte-for-byte, provenance, metric and SHA-256 reconciliation.
- NOT RUN — `npm run test:e2e`; no UI, browser, Phaser or application source changed.

Isolated Smoker balance pass:

- PASS — focused Smoker content/combat test: 1 file, 18 tests.
- PASS — focused save/content compatibility tests: 2 files, 19 tests.
- PASS — `npm run typecheck`.
- PASS — `npm run lint`.
- PASS — `npm test`: 37 files, 307 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run build`.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run test:production-soak`: exactly one run, 1,000/1,000 complete matches, zero crashes.
- PASS — saved snapshot byte-for-byte reconciliation and SHA-256 verification.
- NOT RUN — `npm run test:e2e`; no UI, browser, Phaser or application source changed.

30-unit roster and combat baseline assessment:

- PASS — focused production-audit test: 1 file, 1 test.
- PASS — `npm run typecheck`.
- PASS — `npm run lint`.
- PASS — `npm test`: 37 files, 307 tests.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run test:production-soak`: exactly one run, 1,000/1,000 complete matches, zero crashes.
- PASS — post-soak arithmetic reconciliation and SHA-256 snapshot verification.
- NOT RUN — `npm run test:e2e`; no UI, browser, Phaser or application source changed.

Live Opponent Spectating:

- PASS — focused selector/UI/presentation tests: 2 files, 19 tests.
- PASS — focused spectator E2E: 2 passed across both desktop projects.
- PASS — `npm run typecheck`.
- PASS — `npm run lint`.
- PASS — `npm test`: 37 files, 307 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- PASS — `npm run test:e2e`: 17 passed, 3 skipped, including spectator switching and local battle economy in both desktop projects.
- NOT RUN — `npm run test:production-soak`; the 30-unit 1,000-seed assessment is the next separate task.

Combat Economy:

- PASS — PR #20 review-fix regressions: 2 files, 9 tests.
- PASS — focused domain/selector/Phaser/save and affected phase-guard tests: 6 files, 37 tests.
- PASS — `npm run typecheck`.
- PASS — `npm run lint`.
- PASS — `npm test`: 37 files, 300 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- PASS — `npm run test:e2e`: 15 passed, 3 skipped, including battle economy and direct battle resume in both desktop projects.
- NOT RUN — `npm run test:production-soak`; intentionally deferred until Live Opponent Spectating is complete.

PAC-style Shop Lock:

- PASS — focused shop/economy test: 1 file, 13 tests.
- PASS — affected economy/match-flow tests: 3 files, 35 tests.
- PASS — `npm run typecheck` (run through the installed npm CLI).
- PASS — `npm run lint` (run through the installed npm CLI).
- PASS — `npm test`: 35 files, 290 tests.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- NOT RUN — `npm run test:e2e`; no presentation/client source changed.
- NOT RUN — `npm run test:production-soak`; intentionally deferred until the three gameplay-baseline PRs are complete.

Roster Expansion Pack F:

- PASS — focused Pack F test: 1 file, 10 tests.
- PASS — affected roster/trait/combat/content/production tests: 7 files, 64 tests.
- PASS — `npm run typecheck` (run through the installed npm CLI).
- PASS — `npm run lint` (run through the installed npm CLI).
- PASS — `npm test`: 35 files, 285 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- NOT RUN — `npm run test:e2e`; no app, selector, Phaser or presentation source changed.
- NOT RUN — `npm run test:production-soak`; the deliberate 1,000-seed run belongs to the separate 30-unit assessment.

Roster Expansion Pack E:

- PASS — `npm run typecheck` (run through the installed npm CLI).
- PASS — `npm run lint` (run through the installed npm CLI).
- PASS — focused Pack E test: 1 file, 12 tests.
- PASS — affected Pack E/content/production-audit tests: 11 files, 120 tests.
- PASS — focused placeholder/selector/roster tests: 3 files, 25 tests.
- PASS — `npm test`: 34 files, 275 tests.
- PASS — `npm run assets:validate`.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- PASS — `npm run test:e2e`: 13 passed, 3 skipped; no missing-asset 404, console, external-request or request-failure violations.
- NOT RUN — `npm run test:production-soak`; the next 1,000-seed assessment is reserved for the completed 30-unit roster after Pack F.

Roster Expansion Pack D:

- PASS — `npm run typecheck` (run through the installed npm CLI).
- PASS — `npm run lint` (run through the installed npm CLI).
- PASS — focused Pack D test: 1 file, 8 tests.
- PASS — affected Pack D/content/production-audit tests: 3 files, 16 tests.
- PASS — `npm test`: 33 files, 262 tests.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- NOT RUN — `npm run test:e2e`; presentation source did not change and existing missing-character fallbacks are used.
- NOT RUN — `npm run test:production-soak`; the next 1,000-seed assessment is reserved for the completed 30-unit roster after Pack F.

Full-roster balance and combat-readability assessment:

- PASS — `npm run typecheck` (run through the installed npm CLI).
- PASS — `npm run lint` (run through the installed npm CLI).
- PASS — focused production-audit test: 1 file, 1 test.
- PASS — `npm test`: 32 files, 254 tests.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- PASS — `npm run test:production-soak`: exactly one run, 1,000/1,000 complete matches, zero crashes.
- NOT RUN — `npm run test:e2e`; no app, selector, Phaser or presentation source changed.

Current `main` baseline (`c6a7e5b`, merged PR #13) includes the verified Combat Identity Pack C:

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

Final current-roster high-cost identity pack:

- PASS — `npm run typecheck` (run through the installed npm CLI).
- PASS — `npm run lint` (run through the installed npm CLI).
- PASS — focused combat regressions: 9 files, 104 tests.
- PASS — `npm test`: 32 files, 254 tests.
- PASS — `npm run test:production-smoke`: 50/50 complete matches, zero crashes.
- PASS — `npm run build`.
- NOT RUN — `npm run test:e2e`; no app, selector, Phaser or presentation source changed.
- NOT RUN — `npm run test:production-soak`; it remains a deliberate manual release action.

## Behavioral Changes

- None for the normalized pre-P4 baseline. It records existing harness output and changes no gameplay, bot policy, economy, pairing, captain damage, combat, content, schema, metrics or RNG.
- The production-soak harness now makes every participant a bot before the first phase advancement and assigns existing personality IDs by `(seedIndex + playerIndex) % personalityIds.length`. The eighth slot duplicates one of seven personalities per match, rotating deterministically by seed. Normal match creation, bot decisions, gameplay and analytics definitions are unchanged.
- PvP rounds now choose one globally optimal complete pairing combination by encounter count, recency and seeded deterministic tie selection. Opponent history grows for the full match instead of truncating to three entries; ghost-owner history remains unchanged by ghost fights.
- Players eliminated in one result-resolution batch now receive unique contiguous placements ordered by higher post-damage HP, then higher level, then ascending stable ID only for an exact tie. Single eliminations and all existing cleanup/game-over behavior remain unchanged.
- None for the P2 Economy / Progression audit. Gold, income, interest, streaks, XP, shops, pools, sells, bench, battle economy, bots, content and saves are unchanged.
- None for the bot architecture and bias audit. Bot logic, personalities, weights, gameplay, content and simulation behavior remain unchanged.
- None for PR #31. The residual-advantage review records decision C — targeted diagnostics first; Smoker, all peers, traits, forms, content, schema and runtime behavior are unchanged.
- Smoker's base attack interval is now 1400ms instead of 1200ms, reducing basic-attack and self-generated Energy frequency through the existing generic cadence path. Health 820, attack 62, defense 28, range 2, move interval 500, cost 2, Navy/Guardian traits and White Blow 180/nearest-enemy/line/knockback remain unchanged. GameContent is `1.15.1`; save schema remains 6.
- None for the post-forms assessment. Diagnostics add form-aware reachability, eligibility, event-volume and pilot combat attribution without changing existing aggregate semantics, gameplay, RNG, content, AI, presentation, persistence or saves. Persistent-form final-board outcomes now explicitly share the base-character last-deployed-board grain and exclude bench/full-crew-only units.
- Base Chopper now transforms battle-locally into Monster Point at 8 seconds only when its frozen battle-start team has an active Straw Hat tier and it is still alive. The transition preserves absolute damage, items, star, trait effects, resources, statuses and cadence while applying star-scaled deltas to 800/60/28/range 1 and switching to 250-power adjacent Monster Point Slam with 600ms stun. A generic `unit-transform` event provides immutable playback/save/spectator identity, exact post-transform live HP/max HP and a text cue; Phaser adopts that maximum before subsequent damage/heal playback and final HP reconciliation. `definitionId`, persistent `UnitInstance`, team traits, shops/pools and the next battle remain base Chopper. GameContent is `1.15.0`; save schema remains 6.
- A normal 3-star Luffy remains base Luffy without a retained catalyst. Retained Armament Wraps selects persistent Boundman and retained Sniper Goggles selects persistent Snakeman; the earliest catalyst in `instance.items` wins only the first selection, overflow is ignored, catalysts remain equipped, and the assigned branch locks. Boundman uses the locked 990/86/34/range 1/1000ms overlay and 285-power single-target Kong Gun with 600ms stun/knockback. Snakeman uses 850/78/24/range 4/700ms and 300-power four-strike Jet Culverin with in-range KO retargeting. Normal scaling, base/economic `luffy` identity and active battle snapshot freezing remain unchanged. GameContent is `1.14.0`; save schema remains 6.
- A normal Robin merge remains base Robin at 2-star; the normal nine-copy 3-star merge now assigns persistent `formId: "robin-demonio-fleur"` to the surviving Robin anchor. Demonio Fleur inherits Robin's unchanged stats, traits and assets, replaces Clutch with 180-power lowest-health adjacent damage, 1400ms stun and 20-Energy Drain, and uses normal 3-star stat/ability scaling. Shop, pool, purchase, sale and analytics identity remain `robin`; active battle snapshots stay frozen. GameContent is `1.13.0`; save schema remains 6.
- GameContent now has a separate serializable `forms` collection and is version `1.12.0`; production contains zero forms. Valid persistent form IDs can overlay unit name, selected stats, complete ability, traits and portrait/token presentation, while battle setup/snapshots can also carry a battle-temporary form ID. Battle tactical traits and ability presentation resolve from frozen source snapshots, including when form abilities reuse base ability IDs. Invalid or unknown IDs resolve safely to base behavior. `definitionId` remains shop, pool, purchase, sell, merge and analytics identity; save schema remains 6. Robin, Luffy, Chopper and all default gameplay remain unchanged.
- Emperor now activates team-wide +4% maximum health and +4% attack with one distinct Emperor definition, and the unchanged +8%/+8% payoff with two distinct definitions. Only the highest reached tier applies; duplicate definitions still count once. Shanks, Blackbeard and Captain are unchanged. GameContent is `1.11.2`; save schema remains 6.
- Smoker's White Blow base ability power is now 180 instead of 210. Smoker remains a 2-cost Navy / Guardian with unchanged stats, line targeting, cast cadence, star scaling and knockback. GameContent is `1.11.1`; save schema remains 6.
- None for the 30-unit assessment. Diagnostic output is additively richer, observes existing deterministic state/events after decisions, and changes no gameplay, RNG order, content, AI, presentation, persistence or save behavior.
- During active battles with the tutorial inactive, living captain rows can switch the tactical board, observed traits and combat events to that captain's immutable current fight. The selected captain is always viewer-side through existing mirroring, PvE uses the stage opponent, and ghost fights use the frozen ghost copy. Standings and a WATCHING ribbon allow direct rival-to-rival switching and return to the local fight. The observed board is read-only; local shop economy remains interactive, the global phase clock remains local, and spectator selection clears after resolution and is not persisted.
- During normal battles, players may now buy units, fully reroll, toggle shop lock, buy XP, sell bench units and rearrange bench slots. Board movement/selling, item equip and readiness remain blocked; purchases and merges affect future persistent state only. The current combat result and deployed battle-start star/item identity remain frozen, while live bench changes synchronize without restarting Phaser playback even if fighter arrays are reconstructed in a different order. New battle saves preserve the current economy state and frozen results directly; stale writes cannot overwrite a newer `updatedAt`, and legacy `replayBattle` saves remain compatible.
- Automatic round refreshes of locked shops now retain every non-empty offer in its slot, fill only empty/purchased slots through existing current-level shop odds, preserve retained pool reservations, consume RNG only for replacement slots and clear the one-round lock. Manual rerolls remain full; unlocked refreshes are unchanged.
- Kuzan adds global damage plus 700ms stun; Akainu adds nearest-cluster damage plus 32-power/4000ms burn; Shanks adds nearest-cluster burst with 35% transient Defense Pierce; Blackbeard adds global damage, 20-Energy Drain and deterministic pull. The new Emperor 2 origin grants +8% team health and attack. The roster is 30 units at 6/7/6/7/4; content is `1.11.0` and save schema remains 6.
- Koby, Koala, Franky, Brook, Ivankov, Jinbe, Kuma and Kizaru now use one neutral local placeholder for portraits and tactical tokens until dedicated art exists; existing units with real art keep their current portrait/token assets.
- The base shop roster now also includes Ivankov (2-cost Revolutionary/Specialist targeted heal with an inclusive 50%-HP pre-heal shield condition), Jinbe (3-cost Straw Hat/Guardian adjacent knockback), Kuma (3-cost Revolutionary/Guardian all-enemy knockback) and Kizaru (4-cost Navy/Marksman farthest line damage with transient 40% Defense Pierce). Content is `1.10.0`; save schema remains 6.
- The base shop roster now includes Koby (1-cost Navy/Brawler lunge), Koala (1-cost Revolutionary/Brawler adjacent 300ms stun), Franky (2-cost Straw Hat/Guardian adjacent knockback) and Brook (2-cost Straw Hat/Swordsman line 400ms stun). Content is `1.9.0`; save schema remains 6.
- The prior assessment changed no gameplay or presentation behavior. Production-soak output is additively richer and now reports same-cost placement/performance uncertainty plus PvP combat-expression/readability density.
- Galaxy Impact now replaces Garp's previous global 1000ms stun with deterministic one-cell knockback after its unchanged global damage; Black Blade Wave now ignores 50% of each target's current non-negative Defense for that ability's mitigation only.
- Combat Identity Pack C adds Law's global post-damage pull, Ace's post-burn knockback, Hancock's global 10-Energy Drain after stun, and Doflamingo's post-stun cluster pull using only existing primitives.
- Combat Identity Pack B adds Sabo's 600ms AoE stun, Luffy's post-three-hit knockback, Kid's deterministic one-cell pull toward himself, and Crocodile's 15-Energy Drain after line damage.
- Combat Identity Pack A adds Chopper's post-heal emergency shield at or below 35% pre-heal HP, Sanji's post-burn knockback, Robin's post-stun 15-Energy Drain, and deterministic line knockback for Smoker.
- Nami's Thunderbolt Tempo now resolves its existing damage and damaged-Energy gains before draining up to 15 Energy from each surviving original affected target. Invalid drain configuration and zero-Energy targets produce no drain event.
- Usopp's Exploding Star now damages its existing target set before surviving affected enemies attempt a deterministic one-cell orthogonal knockback. Occupied or out-of-board destinations fail without preventing damage, and AoE collisions resolve by unit ID.
- Zoro's Oni Giri now resolves as 30% / 30% / remainder strikes, redirects remaining strikes after a KO to the nearest living enemy in range, and grants the third strike 25% raw bonus damage when its current target is at or below 35% HP.
- The previous large hardening commit also changed combat behavior through PAC-inspired action cadence and Tashigi lunge mechanics; those behaviors were not modified here.

## Deviations From Plan

- None for the normalized pre-P4 baseline. Exactly one 1,000-seed soak was run from the required clean SHA; no instrumentation, historical snapshot, implementation, tuning or follow-on feature work was added.
- None for production-soak population normalization. No personality, policy, gameplay/domain, metric, RNG, content, schema, baseline artifact or 1,000-seed run was added or changed.
- None for P3B. No captain-damage, combat, battle-seed, timing, economy, bot, P4, analytics, persistence-schema or soak-harness change was added.
- None for the simultaneous-elimination fix and locked P3 record. Captain damage, pairing, late PAC cadence, P4 content, bots, analytics and production measurement were not changed.
- None for the P2 audit. Research stayed on pinned targeted PAC economy sources, targeted local domain ranges and the existing report schema; no P3, harness fix, diagnostic, tuning or simulation was added.
- None for the bot architecture and bias audit. Research stayed on the pinned targeted PAC files and current targeted bot files; no PAC backend, bot tuning, P2/P3 work, Smoker diagnostic or simulation was added.
- None for PR #31. No gameplay, production code, analytics code, diagnostics, snapshot, test or simulation was added or changed; only the requested decision report and project handoff were updated.
- None for PR #30. The locked 1400ms value was not tuned after smoke or measurement; all gameplay/test/version changes were committed cleanly before exactly one 1,000-seed run. No PAC source, analytics semantic, combat system, form, UI, asset or unrelated balance value changed; E2E was not required for this content/tests/docs-only surface.
- The initial PR #29 snapshot is rejected because review found a full-crew versus deployed-board instrumentation mismatch. Corrected diagnostics/tests were committed with a clean tree before exactly one corrected 1,000-seed run; corrected measured code remained frozen afterward. The corrected snapshot retained every metric and changed only provenance. Browser E2E was not required locally because no app, UI or Phaser production source changed.
- No gameplay implementation deviation for Monster Point or its review hardening. No generic trigger/duration framework, command, trait recomputation, art/audio, persistent assignment, schema change, balance revision or 1,000-seed soak was added. Browser E2E hit only the known Windows-owned Vinext server teardown hang after all scenarios passed; stopping that exact spawned server allowed the command to return exit 0.
- No implementation deviation for Luffy Gear 4. No Chopper work, generic trigger system, form command/UI/assets, schema change, unrelated balance change or 1,000-seed soak was added. Browser E2E's owned Vinext server hung during Windows teardown twice after all scenarios completed; the unchanged suite then passed against a separately started local server and returned exit 0.
- None for Robin Demonio Fleur. No generic trigger system, command, UI, asset, stat/trait override, unrelated balance change or production soak was added; the locked values were unchanged after the 50-seed smoke.
- None for the Character Form System foundation. No production form, pilot trigger, form command, UI, VFX, asset, schema change or 1,000-seed soak was added.
- None for the Emperor reachability pass. Locked +4%/+4% and +8%/+8% values were not revised after smoke or production results; all measured code was committed with a clean tree before exactly one 1,000-seed soak.
- None for the isolated Smoker pass. The locked value 180 was not revised after smoke or production results, and exactly one post-change 1,000-seed soak was run.
- None for the 30-unit assessment. Exactly one 1,000-seed soak was run after all required pre-soak checks passed; no Pokémon Auto Chess source or external balance guidance was inspected.
- None for Live Opponent Spectating. PAC's separation of spectated identity/simulation from local economy was adapted as reference-only architecture from pinned commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`; no Redux, Colyseus, live Simulation, networking or server synchronization was ported.
- None for Combat Economy or its two review fixes. PAC's combat-phase economy authorization, bench-only selling and bench movement were adapted from pinned commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`; PAC networking, server state, Simulation and Pokémon-specific systems were not ported.
- None for PAC-style Shop Lock. Only PAC `Shop.refillShop(...)` empty/default-slot behavior from pinned commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee` was adapted; unrelated PAC systems were not ported.
- None for Pack F. It reused the existing shared placeholder and all required combat/trait infrastructure; E2E and the 1,000-seed soak were omitted exactly as scoped.
- Pack E gameplay stayed within scope. CI remediation required exactly one generic repository-authored SVG plus the smallest selector and E2E fixture corrections because active missing portrait/token requests violated the browser QA contract; no gameplay, combat, type, persistence or version value changed.
- None for Pack D. No new primitive, combat/type/persistence/presentation change or fabricated asset was needed; intended character paths rely on existing portrait/token fallbacks.
- None for the full-roster assessment; the 1,000-seed production soak was run exactly once after all required pre-soak verification passed.
- The final high-cost identity pack stayed within scope; Defense Pierce required only a small central mitigation parameter and no persistent status or presentation change, so E2E was not run.
- Combat Identity Pack C stayed within scope with zero new primitives and no combat-engine, type or presentation changes, so E2E was not run.
- Combat Identity Pack B stayed within scope; existing generic displacement, status and Energy presentation required no source changes, so E2E was not run.
- Combat Identity Pack A stayed within scope; existing generic heal, shield, Energy, status and displacement presentation required no source changes, so E2E was not run.
- The Nami vertical slice stayed within scope; existing generic Energy presentation required no source changes, so E2E was not run.
- The Usopp vertical slice stayed within scope; existing generic displacement presentation required no source changes, so E2E was not run.
- The Zoro vertical slice stayed within its requested scope with no gameplay implementation deviations.
- The previous execution exceeded the intended bounded scope and combined architecture refactoring, tooling changes and gameplay changes in one commit.
- `PROJECT_STATE.md` was not present on `main` during that execution.

## Problems / Risks Found

- Existing all-player-elimination behavior still leaves `winnerId` null when no survivor remains. The new deterministic batch ranking applies, but winner semantics remain a separate edge-case watch and were intentionally not redesigned here.
- Full star-copy sell refund (`cost × 1/3/9`) makes 2-star/3-star units fully liquid, lowers pivot commitment and can move battle-time sales into interest thresholds; classify WATCH / NEEDS MEASUREMENT, not a defect. Constant per-unit pools preserve absolute copies while four-character expansions grow cost-band totals and dilute each specific definition's conditional roll share. Realized gold, levels, streaks, high-cost access, rerolls and star timing are P3-coupled and not currently observable at sufficient grain.
- The normalized baseline completed 1,000/1,000 matches without crashes and exposes no systemic blocker. Full-clock average duration remains above the 20–30 minute target at 33.740 minutes while paced duration is 24.064 minutes; this remains a pacing watch, not a development blocker. Gear 4 appeared on only two of 130 deployed three-star Luffy final boards and remains accessibility context for future P4 research, not a balance conclusion. Historical results remain valid exact-historical-harness evidence and are not reinterpreted as normalized measurements.
- Current adaptive bot policy plausibly favors high-cost units (`cost × 25`), existing trait concentration, large fixed star bonuses and explicit item-affinity traits; independent top-score lineup selection can miss lower-score synergy connectors. Fixed reserve/XP/reroll loops are coupled to current economy and round cadence and should not be tuned before P2/P3. These are current-policy bias risks, not confirmed gameplay bugs.
- Current Smoker remains a suspiciously strong conditional outcome signal, but the full-band delta overstates his distance from the strongest peer because Robin and Ivankov materially pull the band down. Smoker is only modestly above Franky while trailing Franky's raw stats and measured combat expression. Existing snapshots lack Smoker outcomes conditioned on active Navy/Guardian state, so another balance lever cannot yet be attributed responsibly.
- Smoker's cadence and outcomes moved in the intended direction, but the large after sample still shows coherent same-cost advantages of +12.37 pp top four, +8.31 pp conditional wins and -0.672 placement; classification is B — improved but still clearly overperforming. Timeout rate increased by 0.084 pp while completion/crash guardrails held; it is recorded without scope expansion. Other-roster changes were compact high-cost/sample-sensitive ripples, Demonio's invariant held, Monster Point remained fully reached, and Gear 4 samples remain too small for balance conclusions.
- The corrected post-forms system baseline is crash-stable and timeout rate improved to 0.7283%. Review's board-vs-bench grain defect is fixed; the corrected same-seed values were numerically identical, so no conclusion changed. Smoker remains the clearest coherent high-sample positive same-cost outlier. Chopper remains a secondary overperforming watch signal; Gear 4 has only four deployed final boards. Robin, Nami, Crocodile and Ivankov remain negative signals; small 5-cost samples remain inconclusive.
- No blocking Monster Point risk found. The 50-seed smoke completed 50/50 matches with zero crashes and is not balance evidence; the required post-forms 1,000-seed assessment remains separate. Browser E2E retained the existing Windows owned-server teardown/flaky immediate-save-resume risk, but the focused retry and subsequent full suite passed.
- No blocking Luffy-pilot risk found. The 50-seed smoke completed 50/50 matches with zero crashes and is not balance evidence. Chopper temporary-transform timing remains intentionally unvalidated until its separate bounded pilot.
- Emperor Tier 1 now reaches 17.6% of matches, while the two-Emperor Tier 2 was not reached in the post-change run versus 2/1,000 baseline matches; the preserved chase payoff remains exceptionally rare. Shanks' conditional-win estimate rose from 56.84% to 69.47% on the same 95 final-board observations, but Wilson intervals overlap, top-four rate was stable and winner presence moved only +1.2 pp. Blackbeard and system guardrails were stable; Shanks is a future watch signal, not sufficient isolated tuning evidence.
- White Blow 180 moved every requested Smoker outcome signal in the intended direction, but only modestly: post-change same-cost deltas remain +15.61 pp top four, +8.79 pp conditional wins and -0.818 placement, so Smoker is still a coherent positive outlier. Sample presence stayed stable, ability damage per cast fell 13.1%, and system guardrails were materially unchanged. A further adjustment, if approved, must be a separate isolated decision rather than an iteration in PR #23.
- The 30-unit baseline remains crash-stable but has elevated timeout/full-clock length. Luffy remains positive; Nami, Robin, Crocodile and Ivankov remain negative signals; Emperor is effectively unreachable; high-cost scarcity and combat readability remain separate follow-up concerns outside PR #23.
- The Pack F 50-seed smoke completed without structural failure: 50/50 matches, zero crashes, 1.00% timeout rate and 0.05% draw rate. Kuzan, Akainu, Shanks and Blackbeard recorded respectively 34/82.4%/38.2%, 38/81.6%/39.5%, 5/100%/80.0% and 6/100%/50.0% final-board observations/top-four rates/conditional win rates. Emperor was not reached. The high-cost samples are very small and are not tuning evidence; reachability belongs to the separate 1,000-seed assessment.
- PAC/Tashigi gameplay changes need separate product/balance review.
- The Pack E 50-seed smoke completed without structural failure. Ivankov, Jinbe, Kuma and Kizaru had respectively 95/5.3%, 113/21.2%, 96/24.0% and 57/33.3% final-board observations/conditional win rates; these small-sample observations are not tuning evidence.
- The Pack D 50-seed smoke completed without structural failure. Koby, Koala, Franky and Brook had respectively 87/14.9%, 88/14.8%, 137/15.3% and 121/6.6% final-board observations/conditional win rates; these small-sample observations are not tuning evidence.
- Dedicated Pack D/E character art remains pending. The eight expansion units temporarily share one neutral local placeholder; intended future files `koby.png`, `koala.png`, `franky.png`, `brook.png`, `ivankov.png`, `jinbe.png`, `kuma.png` and `kizaru.png` are documentation-only until a bounded art pass adds them.
- The 1,000-seed assessment shows high-confidence same-cost positive outliers for Sabo and Luffy and negative outliers for Robin and Nami; unit presence remains associative and composition-confounded, so tuning must stay isolated.
- Ace appears on 68.1% of winning boards and exceeds the existing 65% presence guardrail; this is a watch signal, not causal proof.
- Garp outperforms Mihawk within the two-unit 5-cost band, but their 616 and 395 final-board observations are the roster's smallest samples and are strongly affected by 5-cost availability.
- Average full-clock match length is 32.22 minutes, above the existing 20–30 minute target; paced length is 22.31 minutes.
- Pull and knockback share generic movement presentation, Energy Drain lacks caster attribution, and Defense Pierce has no dedicated cue. Their readability risk is amplified by 19.87 defined control events per PvP battle.
- The `GameClient`/session boundary is improved, but some direct domain calls remain.
- `engine.ts`, `GameScreens.tsx`, `selectors.ts` and `PhaserBoard` still contain substantial responsibilities.
- `game/index.ts` still exposes a broad internal API.
- The host's default `npm` shim resolves to a missing roaming npm CLI; verification passed through the installed npm CLI without repository changes.
- On Windows, Playwright can hang while tearing down its owned Vinext server after all assertions pass; this run exited successfully after that exact owned server process was stopped.

## Important Decisions

- P3 Match Flow / Pacing selects Option 3: keep the current deterministic domain architecture and adapt selected PAC principles. Keep the phase graph, preparation timing, 45-second battle cap, carousel sequencing, early PvE rounds, ghosts, remaining-team-health timeout winner and current draw semantics. Same-round elimination ordering is corrected; P3B implements an ADAPTED PORT of global encounter-count/recency pairing with local seeded deterministic ties and asymmetric ghost scoring. Captain damage remains ADAPT LATER / MEASURE FIRST, and late PAC PvE/event cadence remains P4 REFERENCE ONLY. Future server multiplayer moves deadline authority server-side without changing domain rules.
- P2 Economy / Progression selects Architecture Option 1: keep the current deterministic authoritative finite-pool economy and treat values as the measurement baseline, not permanent locks. PAC liquid start values and normal interest/XP/odds/shop/buy/bench behavior are direct or adapted parity, but PAC also has a Stage-0 starter plus component opening grant; that cross-cutting difference and PAC's partial evolved-unit sell pricing are REFERENCE ONLY. No transactional defect requires implementation. Economy tuning waits for P3; per-unit pool scaling and full-refund selling remain KEEP / MEASURE.
- Roadmap is P2/P3 and production-soak normalization complete → normalized pre-P4 baseline complete and healthy → proceed only through a separately approved feature-development decision, with P4 as the expected next major PAC-first research area. P1B, economy, captain damage and balance remain deferred; Smoker remains frozen/watch.
- Bot architecture uses two distinct future roles: adaptive match bots remain the production-meta/local-opponent class using real domain systems and command intents; a PAC-inspired scripted benchmark-bot concept may later provide authored deterministic combat setups but cannot replace adaptive production bots. PAC Mongo/Firebase/Colyseus/community/Discord infrastructure is rejected. Architecture Option 3 is locked; adaptive tuning waits until P2/P3 stabilize.
- The authoritative pre-P4 comparison point is `docs/analysis/normalized-pre-p4-baseline-1000.json` measured at `cff9c4caed9b09fd64a915908589decc84f02cc8`. Historical snapshots are not rewritten or treated as normalized measurements.
- PR #31 historically selected targeted diagnostics because aggregate evidence could not justify another Smoker nerf. Subsequent roadmap review superseded that immediate diagnostic; White Blow remains 180 at 1400ms with line, knockback, Navy and Guardian, and Smoker is now frozen as a watch item.
- PR #30 classification was B — improved but still clearly overperforming. Smoker remained locked at 1400ms and White Blow at 180/line/knockback; the separate decision review is completed by PR #31 without an automatic balance change.
- The post-forms assessment historically recommended an isolated Smoker adjustment; PR #30 completed that adjustment, and later roadmap review superseded further immediate Smoker tuning. Its persistent-form statistics still use the same last deployed `player.board` observation as base-character presence, exclude bench units and retain `definitionId` as economic identity; Chopper remains a secondary watch and Gear 4 requires more observations.
- Monster Point is battle-temporary only: frozen battle-start Straw Hat eligibility triggers living base Choppers at 8 seconds after periodic effects and before action selection. The live combatant receives star-scaled base/form deltas and a new ability without reinitialization; `unit-transform` records battle-local identity, while persistent Chopper and the next battle remain base. No generic trigger or duration system exists.
- Luffy Gear 4 requires 3-star plus a retained catalyst: Armament Wraps selects Boundman and Sniper Goggles selects Snakeman. The earliest catalyst in serialized item-array order wins only when no form is assigned; `formId` then locks the branch. Known Gear 4 IDs are cleared only from invalid 1/2-star Luffy, unrelated unknown IDs survive, and persistent load reconciliation never mutates frozen battle results.
- Robin's production cap is `definitionId: "robin"`, `star: 3`, `formId: "robin-demonio-fleur"` after the normal nine-copy merge. Only the ability is replaced; legacy schema-6 persistent 3-star Robin reconciles to the form, invalid 1/2-star Demonio is cleared, unrelated unknown IDs survive, and frozen battle results are never rewritten.
- Forms are optional overlays separate from stars and `content.units`. `definitionId` remains base/economic identity; `UnitInstance.formId` is persistent-only, while battle setup/snapshot form identity may be persistent or temporary and is frozen at battle start. Forms may overlay stats and presentation or replace ability/traits, but cannot alter cost, base identity, shop/pool identity, star or items. Trait uniqueness remains distinct base definitions per effective trait. No trigger framework or form command exists.
- Emperor uses two non-cumulative, highest-reached-only tiers: one distinct definition grants team-wide +4% health/+4% attack, while two grant the preserved +8%/+8%. Exact tier reachability is the source of truth; Emperor + Captain is contextual and not a double-Emperor proxy.
- White Blow remains fixed at 180 for PR #23 despite classification B. Any further Smoker adjustment requires a separate bounded architecture/game-design decision and must not be combined with Luffy, Emperor, timeout, negative-unit or readability changes.
- Spectating separates the local actor from a client-only viewer target. The viewer target selects an existing immutable battle result and perspective only; it never enters `MatchState`, command context or persistence. Presentation sequences encode round, result index and perspective side deterministically so switching fights replays Phaser without affecting the local phase clock.
- Active combat remains an immutable precomputed `MatchBattleResult`; battle economy mutates only persistent future state. Optional snapshot item IDs make current-fight presentation self-contained without changing combat mechanics or save schema. New battle saves store the current canonical battle state directly, `ACTIVE_SAVE` accepts only equal-or-newer `updatedAt` writes, and `replayBattle` remains compatibility-only for legacy saves.
- Keep the current prototype offline-capable.
- Future multiplayer is server authoritative.
- Add no multiplayer infrastructure yet.
- Keep a shared deterministic game domain.
- Defense Pierce is transient per-ability mitigation behavior, not a persistent Defense mutation, status or debuff.
- Base-roster expansion is complete at 30 units and 6/7/6/7/4 by cost. Pack F added the Emperor origin for Shanks/Blackbeard; its single two-unit tier grants +8% team health and +8% team attack through existing team-wide trait semantics.
- The Character Form System foundation and Robin, Luffy and Chopper production pilots are complete; the next bounded work is the separate post-forms assessment.
- Character forms remain separate from stars and shop/pool identity. Robin and Luffy are persistent production pilots; Chopper is the first battle-temporary production pilot.
- All future Codex work must be bounded and branch/PR based.
- ChatGPT decides architecture and prioritization; Codex executes requested tasks.

## Next Recommended Task

Await review of the normalized pre-P4 baseline. If accepted, the next roadmap decision is feature development, with P4 as the expected next major PAC-first research area unless a separately approved decision changes ordering. Do not start P1B, P4, captain-damage, economy tuning or balance work automatically.

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
