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

Gameplay baseline upgrades — Combat Economy complete; awaiting Live Opponent Spectating.

## Last Completed Work

- 2026-08-28 — PR #20 on `feature/combat-economy-actions`: enabled PAC-style Buy, Reroll, Lock and Buy XP actions during battle plus bench selling and bench-to-bench movement while keeping the deployed formation, item equip, pairings and precomputed `MatchBattleResult` immutable. Battle presentation now uses self-contained battle-start star/item snapshots while the live bench updates without resetting Phaser combat playback. New battle saves persist the current battle state directly; legacy schema-6 `replayBattle` saves still reconstruct once. Content remains `1.11.0`; save schema remains 6. Material files: `game/engine.ts`, `game/types.ts`, `game/combat.ts`, `app/GameClient.tsx`, `app/selectors.ts`, `app/voyagePersistence.ts`, `app/screens/GameScreens.tsx`, `components/PhaserBoard.tsx`, focused domain/selector/Phaser/save/E2E tests and `PROJECT_STATE.md`.
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

Combat Economy:

- PASS — focused domain/selector/Phaser/save and affected phase-guard tests: 6 files, 37 tests.
- PASS — `npm run typecheck`.
- PASS — `npm run lint`.
- PASS — `npm test`: 37 files, 299 tests.
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

- During normal battles, players may now buy units, fully reroll, toggle shop lock, buy XP, sell bench units and rearrange bench slots. Board movement/selling, item equip and readiness remain blocked; purchases and merges affect future persistent state only. The current combat result and deployed battle-start star/item identity remain frozen, while live bench changes synchronize without restarting Phaser playback. New battle saves preserve the current economy state and frozen results directly; legacy `replayBattle` saves remain compatible.
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

- None for Combat Economy. PAC's combat-phase economy authorization, bench-only selling and bench movement were adapted from pinned commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`; PAC networking, server state, Simulation and Pokémon-specific systems were not ported.
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
- On Windows, the first E2E process hung while tearing down its owned Vinext server after all assertions passed; a clean rerun reused that server and exited successfully.

## Important Decisions

- Active combat remains an immutable precomputed `MatchBattleResult`; battle economy mutates only persistent future state. Optional snapshot item IDs make current-fight presentation self-contained without changing combat mechanics or save schema. New battle saves store the current canonical battle state directly, while `replayBattle` remains compatibility-only for legacy saves.
- Keep the current prototype offline-capable.
- Future multiplayer is server authoritative.
- Add no multiplayer infrastructure yet.
- Keep a shared deterministic game domain.
- Defense Pierce is transient per-ability mitigation behavior, not a persistent Defense mutation, status or debuff.
- Base-roster expansion is complete at 30 units and 6/7/6/7/4 by cost. Pack F added the Emperor origin for Shanks/Blackbeard; its single two-unit tier grants +8% team health and +8% team attack through existing team-wide trait semantics.
- Gameplay roadmap order is: (1) PAC-style Shop Lock — complete, (2) Economy Actions During Battle — complete, (3) Live Opponent Spectating — next, (4) 30-unit 1,000-seed assessment, (5) balance decisions, (6) future Character Form System.
- The future Character Form System remains documentation-only: star and form progression are separate; forms are not shop/pool units; an eventual instance may carry a form identity beside `definitionId` and star and alter a controlled subset of stats/ability/role/traits/presentation; permanent and temporary forms share one conceptual model with different lifetimes. Initial pilots are Robin (star-triggered Demonio-style), Luffy (star/item-dependent Gear 4 branches) and Chopper (synergy/combat-condition Monster Point-style). No form code exists yet.
- All future Codex work must be bounded and branch/PR based.
- ChatGPT decides architecture and prioritization; Codex executes requested tasks.

## Next Recommended Task

Implement only Live Opponent Spectating as the next bounded gameplay-baseline task; do not start it automatically.

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
