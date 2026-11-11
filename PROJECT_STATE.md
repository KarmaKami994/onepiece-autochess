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

B11 character/form/PvE animation completion on `codex/b11-character-animation-completion`, based on B10 squash `45556741eb512454e7f420a42c835ad6e3847c5d`. Owner explicitly requested the squash and next batch on 2026-11-11, accepting the B10 standard/pilots as the B11 reference. Existing complete sheets are curated first; only missing poses/forms are authored. GameContent `1.34.0`, schema 6. Owner approved focused B11 verification, typecheck/lint/assets/build, both desktop browser sizes and normal PR CI on 2026-11-11. No B12, gameplay/tuning or baseline work.

## Last Completed Work

- 2026-11-11 — B11 candidate: 58 new preferred packages across all 62 existing visual identities; explicit original-sheet curation, missing-clip supplements, own Gear 4/Monster Point bodies, sixteen articulated PvE pixel bodies, static derivatives, frozen maps/editables/QA/provenance. Retained B10 masters and original Luffy/v1/v2 sources. Body-only transform/Phoenix/replay swaps, actual-visible-event preload, identity-safe fallback and two-card Lab with oldest-variant toggle. Material files: presentation manifests/board/assets/Lab/codex, existing static exporters/matrix, B11 authoring/export/source/QA/runtime packages, affected regression/browser specifications and B11/strategy/provenance/state docs. Owner-approved verification complete locally: 168 focused tests, 12 browser cases, typecheck/lint/assets/build PASS. Normal PR CI pending publication; no local aggregate or baseline.
- 2026-11-11 — Squash-merged PR #72 at owner request, reviewed head `cc0b16c396de8879547de9c50bfeadb4ebdf0b17`, into main as `45556741eb512454e7f420a42c835ad6e3847c5d`. CI #181 had completed green: 954/954 tests and coverage, assets, ordinary 50/50 smoke with zero crashes, build, 76/76 browser tests and dependency review. Local main fast-forwarded; started the separately requested B11 branch from that squash. No merge-finalization source edits or new checks. B10 masters/pilots are retained for B11.
- 2026-11-11 — Opened PR #72 on verified/pushed head `86dec9a762aaafaa9c48fa288d8556fb0a77b5f2`; CI #180 passed typecheck/lint/dependency review and 953/954 tests. Its single failure was the resource-bar test's stale 63-v2 count after adding three pilots. Corrected only that fixture to 66, explicitly asserted all three pilot IDs and preserved every metadata-anchor comparison. Affected resource/B10 tests 13/13 PASS; total focused scope now seven files / 41 tests. Material files: `tests/resource-bars.test.ts`, B10/state documentation. Same PR/branch, normal CI gate; no gameplay, asset regeneration, local full suite or additional production run.
- 2026-11-11 — Owner-approved B10 verification: focused 33/33, final browser 4/4 at 1280×720 / 1920×1080, typecheck/lint/assets/build PASS. Corrected Sharp crop/trim ordering in the new test, the Lab entry's startup readiness and its clipped third form-comparison card; retained ordinary Robin v1/v2 access. Strengthened browser geometry/visibility assertions and saved eight comparison/board images. Material correction files: `app/screens/GameScreens.tsx`, `components/AnimationLab.tsx`, B10 unit/browser tests, `art/qa/b10/browser`, B10/state docs. Published source predecessor `6a1a2a6`; correction stays on the same task branch. No local aggregate/full-suite/soak, gameplay change or merge; normal PR CI runs the full remote gate.
- 2026-11-11 — B10 candidate, source commit `e341194`: complete 62-identity/six-clip inventory; style/size card; Koala, Kaido and Robin Demonio body masters, explicit 46-slot maps, six-clip GIFs, editable sources, atlases/static identities; three pixel/SVG icon pilots. Kept existing atlases/references and added form-aware visible-only presentation/fallback, frozen authored-map export with source/map SHA pins and overwrite protection, regression specifications and provenance. Kaido uses the requested existing SpriteDatabase 21137 reference (Megadoomer). Material files: animation/board/Lab/Phaser presentation, existing asset exporters/matrix, B10 authoring/export/inventory scripts, B10 sources/QA/runtime pilots, three item SVGs/two form SVGs, focused unit/browser specifications, provenance/B10/strategy/state docs, package asset command and B10-only prompt LF attributes (stable cross-platform hashes). Asset authoring/export completed; tests/CI NOT RUN pending the separately requested permission. No PR/merge or production report yet.
- 2026-11-09 — Merged exact B09 head `569edbdf059db6945db2c03f9fdb6105495c1ce9` through PR #71 with completed green CI #178; squash `74cea3577eba98a07911b2d488abd3ece20b373d`. Local main fast-forwarded and equals origin/main. Then prepared the requested fixed asset-production strategy and B10/B11/B12 task batches: standard/pilots, missing character/form/PvE animation, item/Food/UI icon production. Source/metadata/contact-sheet inspection found five 2–4-pose sheets reused over 46 slots and four forms without own body atlases; no new assets created. Material files: new asset strategy, batch-plan progress header/B09 closure, this state. No implementation or new checks/CI for the planning document.
- 2026-11-06 — CI #177 confirmed 949/949 unit tests, coverage, assets, normal 50-match smoke (50 complete / 0 crashes), build and dependency review; coverage's existing 30-second audit timeout passed on one unchanged job retry. Browser found two B08 weather-disclosure clicks hidden by the left rail. Corrected only overlay CSS; also kept the Food badge below playback controls with a new geometry assertion. Local affected weather/Food/combat-report/full-voyage run: 19/20; unchanged failed voyage case passed once in isolation, and final Food placement 2/2. Both sizes/screenshots inspected. Material files: `app/game.css`, `e2e/b09-food-consumables.spec.ts`, B09/batch/state docs. Final CSS head goes through normal PR CI; no further local tests or gameplay changes.
- 2026-11-06 — Published verification correction `1438f03b7c9b611582293c94a374dbd5911ca47a`, opened PR #71 against exact B08 main and started owner-approved normal CI. Local/remote branch heads matched and working tree was clean before this metadata update. CI's live exact-head result is linked above; handoff-only metadata does not rerun local checks or alter measured content.
- 2026-11-06 — Owner-approved B09 verification: fixed saved-offer TypeScript narrowing, escaped JSX apostrophe, food-only native Enter/Space propagation, and lethal Phoenix test fixture. Full suite exposed four previously unverified B08 fixture/count/legacy-anchor issues; corrected those test foundations without changing B08 gameplay, old hashes or weakening assertions. Typecheck/lint/build/assets, focused 78/78 and affected regressions 54/54 PASS; local full run once 945/949 before those four corrections, not repeated. Final Food browser 6/6 plus existing harbor/tools 12/12 in both desktop sizes, screenshots/icons inspected. Material correction files: `app/GalleyTray.tsx`, `game/persistenceFormat.ts`, B09 browser/unit, B08/P9/P7/reference assertions, B09/asset/batch/README/state docs. Normal CI pending publication; no separate production run.
- 2026-11-06 — B09 source handoff: committed/pushed `6233c7170bc449cb24f4c4ba834b05f251f05835` on `codex/b09-food-consumables` (79 files, including current-version expectations). No PR/CI or merge triggered while the verification request remains unanswered. The implementation is unverified; this follow-up records publication only.
- 2026-11-06 — B09 candidate: separate three-food catalogue/three-portion galley, one-meal preparation command, harbor option substitution at existing Usopp/Franky prices, deterministic food selection, frozen one-battle effects through existing stat primitives, loss/merge/bench forfeiture and food-only bot selection/serving. Added schema-6 stock/meal/history backfill, replay/import guards, planner/codex/galley/harbor/battle/Chronicle presentation, separate factual report counts and three original reproducible SVGs. Material files: `game/{food,types,content,voyageEncounters,engine,combat,persistenceFormat,teamPlanner,index}.ts`, selector/Galley/client/screens/reference/Chronicle/validation/styles, board meal metadata/legend, food report/harness, generator/spec/provenance/SVGs/asset-validation/package scripts, B09 unit/browser/asset specifications, B07 control/offer assertions and current version/hash expectations, B09/B07/batch/README/state docs. No B09 check run; permission pending. No new report or raw artifact edited.
- 2026-11-06 — Pushed B08 head `ace44f1f0e81fc57cb27d3de656b46cdd44af807`, created PR #70 and squash-merged as `e564e59b580a0238e309e61310231649f2b21094` on explicit owner instruction. Local main fast-forwarded, then started requested B09 branch. No merge-finalization source changes or local checks; no CI result claimed. Targeted pinned PAC dishes/eating/simulation-start research established the B09 contract before code.
- 2026-11-06 — B08 source handoff: implementation commit `02c6ea052ede6f13a67a65873394cc1738cc8f78` pushed to `origin/codex/b08-status-weather`. No PR opened and no B08 CI/checks run, as explicitly requested. This source commit is unverified; later handoff metadata does not change its implementation.
- 2026-11-06 — B08 implementation prepared: Poison/Freeze/Sleep/Locked lifecycle, narrow Locked movement/range guards, authored Rain/Snow and Charged Deck/Frost Patch at R14/R28/R32; Kuzan and three named PvE bosses are the only ability changes. Added explicit frozen environment/save backfill, validated planner choices, mirrored board marks/legend, early-expiry events, codex/Chronicle/import boundaries, separate factual report counters, four original SVGs and regression specifications. Material files: `game/{types,content,combat,engine,battleEnvironment,persistenceFormat,teamPlanner,index}.ts`, selector/Chronicle/planner/codex/environment presentation, BattleBoard/Phaser/manifest/report, report script/helper, SVG spec/generator/outputs/QA sheet, B08 unit/browser cases, B07 neutral-content control, current-version/hash/source expectations, README/provenance/batch/B08/state docs. Verification explicitly declined: all B08 checks NOT RUN; no PR/CI triggered.
- 2026-11-06 — PR #69 merged by owner request, exact head `606899bbe6822353b36aa8efe1b59c91042cfb77`, CI 172 fully green; squash `d70b3c1d1aed0013edcfaf92122757367fdffbb9`. Local main fast-forwarded without source edits, then created the requested B08 branch. Targeted PAC status/entity/weather research established the source-linked bounded contract before B08 behavior changes.
- 2026-11-06 — Merge handoff: all three open work PRs (#68, #65, #64) squash-merged tip-to-base; main `93b1874ef760bf07d317771d8527d3240c0d339a` is tree-identical to fully green B06 head `9a0dfa412ed168dcb1eb9d209d442009cfd5426f` / CI 168. Local main fast-forwarded; no force push/manual rebase or merge-finalization file edits. Then started the requested isolated B07 branch.
- 2026-11-06 — B07: pinned PAC starter/region/encounter research and `docs/B07_VOYAGE_CHOICES.md` contract; production `createVoyage` starter entry (normal 1-gold price, unchanged starting gold 5), harbor phase/commands, origin routes/wildcard, shared-copy lifecycle, safe skip and once-only receipts. Added schema-6 backfill, choice/timer UI, tutorial/Chronicle/codex/source-report adapters and regressions. Browser verification exposed/fixed decorative rays intercepting skip clicks; corrected new-test start-gold/persistence assumptions and explicitly covered R20→R21 harbor. Material files: voyage types/content/engine/recruitment/new encounters, save/clock/selector/client/screens/tutorial/reference/Chronicle validation, production-report sources, domain/browser tests/helpers, current-version/hash expectations, README/B07/batch/state docs. No aggregate/baseline executed.
- 2026-11-06 — B06: pinned PAC phase-time contract, monotonic elapsed clock, three-second last-fight result display, 23-second recruitment timeout through existing authority, Pause/Resume and auto-continue setting, retained board while settings are open, validated optional envelope clock metadata and periodic/visibility checkpoints. Browser checks found/fixed render-time ref writes and restored the existing accessible PREPARE label without changing tutorial assertions. Branch/base above. Material files: `app/phaseClock.ts`, `app/useMatchClock.ts`, `app/PhaseClockDisplay.tsx`, `app/GameClient.tsx`, `app/screens/GameScreens.tsx`, `app/game.css`, `app/voyagePersistence.ts`, `components/PhaserBoard.tsx`, `tests/phase-clock.test.ts`, `e2e/pacing.spec.ts`, B06/README/batch/state docs. Locally verified; normal CI pending publication.
- 2026-11-05 — B05-C: owner approved carrier-only reuse of existing Defense/Guardian affinity for Special Defense and one POST. Clean measured source `6e12cd222c6f54de2c528f6e6b15ff597968c706`; 50/50 complete, zero crashes, but cost-4/5 player-board presence 259/102→249/93 and cost-5 final presences 128→111 failed the locked non-regression gates. Fully reverted behavior/version/tests; retained exact POST SHA-256 `866485833f14aa91fe1adb1d680d8dfbcdebc1fae41b061e9067bbae00394cb3`. Material final files: C evaluation doc/raw, B05 diagnostic, batch plan, bot architecture audit, this state. No second candidate, progression/reward/form rule, metric or baseline change.
- 2026-11-05 — B05-B: evaluated exactly the approved one-extra-XP candidate from clean committed source `103389e0f9ccf47bbc051844cfb44aab688c1d3f` on A merge `7b7b07abbc6f14c9c8ce54d223909da209210f98`; one `production-0`–`production-49` POST completed 50/50, zero crashes. Rejected because cost-5 player-board/final presences fell 102/128→88/102; restored all behavior/version/tests to A. Raw SHA-256 `eaebafa86b28e42e029616ea8cdfbd4c3094f121a724b8c67354cce2cf096d6a` is immutable historical evidence. Material final delta: `docs/B05_LATE_SPARE_XP_EVALUATION.md`, raw POST, B05-A/batch/bot-audit/state documentation. No C policy change or second experiment.
- 2026-11-05 — B05-A: extended the existing optional frozen observer with real frozen offer rank/score, affordability after earlier purchases, actually evaluated reserve exceptions, receive/merge/replacement guards and command/merge receipts; added equip/craft guard counts, bounded top candidates, inventory/carrier/form before/after facts and bounded report examples. Added causal reproduction tests, exact retained PRE seed-0 preparation regression and separate progression/item approval proposals. Branch `codex/b05-bot-decision-diagnostics`; base `0a43543162d520047cc3c51255ff0d8741a6e223`. Material files: `game/engine.ts`, `game/botDecisionDiagnostics.ts`, production-report integration/summary helper, new and existing diagnostic tests, B05/batch/bot-audit/diagnostic/state docs. No B/C policy change implemented.
- 2026-11-05 — B04: added automatic phase/checkpoint and immutable battle recording, bounded local replay archive, import/export and read-only round/phase/perspective/speed/pause playback with B03 contributions. Added captain statistics/maxima, seven cosmetic achievements and distinct discovered/owned/deployed/form collections linked to the codex; transactional once-per-voyage credit, retained dedupe ledger, explicit backup restore and independent archive/profile resets. Legacy resumes are labelled partial. Branch `codex/b04-replay-profile`; base `6c8c9ab13eff84c25b572577b33018feb625157a` (B03 PR #61). Material files: Chronicle model/validation/IndexedDB/recorder hook/screen/styles, GameClient/menu/codex integration, Phaser pause, focused unit/browser tests, B04/README/analysis/batch/state docs.
- 2026-11-05 — B03: added event-dispatched per-fighter HP/shield damage, healing/shield grants, received damage, drained Energy and revival counts; shared live/spectated/planner observer resets on replay/speed/perspective and never exposes unseen events. Added actual ability/item drain sources with legacy fallback, labelled directional movement/drain cues, four existing form accents and local music/SFX controls. Two original reproducible WAV loops have source/output hashes. Branch `codex/b03-combat-analysis-audio`; base `4bdd4dbd3eceb88c436752759590361a9c7503a0` (B02 PR #60). Material files: combat event type/attribution, selectors, BattleBoard/report and Phaser/VFX helpers, audio settings/hook, screens/styles, audio generator/manifest/WAVs, two focused unit files, browser coverage, B03/provenance/README/batch/analysis/state docs.
- 2026-11-05 — B02: added main-menu Crew Tools, searchable crew/item/recipe/bond/form/status/PvE/stage reference, two-team deployment editor, production form/trait validation, deterministic mirrored combat tests and existing Phaser/recap playback. Added a separate bounded local plan library and validated JSON import/export. Main-menu readiness protects keyboard entry; active voyage checkpoints remain byte-identical during tool usage. Branch `codex/b02-codex-team-planner`; base `1a294a9c7f068ac983c94109c95b5ac1c9009427`. Material files: `game/teamPlanner.ts`, application reference/storage/presentation helpers, Crew Tools/Team Planner screens and styles, main-menu/selector integration, two focused unit-test files, `e2e/crew-tools.spec.ts`, `docs/B02_CODEX_TEAM_PLANNER.md`, README and current architecture/product/roadmap/analysis/batch/state documentation.
- 2026-11-04 — B01 / PR #59: optional schema-6 `finalLineup` captures frozen fighters and reserve for eliminated players and the winner without reinterpreting `finalCrew` analytics. Results show every card, forms/items and deployed-only bonds; old saves remain explicitly unclassified, including a duplicate-free winner fallback. Updated current crafting, battle-save, P11/P12, P7-art and bot-roadmap documentation, and published the prior analysis/batch plan with B01 completion marked. Initial implementation commit `1c7bd9bf5b9cf440acba8cd5355c19887535b4ed`. Material files: `game/types.ts`, `game/engine.ts`, `app/selectors.ts`, `app/screens/GameScreens.tsx`, `app/game.css`, `tests/results-lineup.test.ts`, `e2e/results.spec.ts`, README, product/architecture/bot/form/P4 documents, `docs/B01_RESULTS_COMPLETION.md`, `docs/OFFENE_FEATURES_PAC_ABGLEICH.md`, `docs/TASK_BATCHES_PAC_AUSBAU.md`, `PROJECT_STATE.md`.
- 2026-09-15 — P1B Bot Progression Diagnostic: added disabled-by-default immutable observation around the real `runBotTurn`, opt-in `--bot-diagnostics` production-soak aggregation, behavioral-equivalence tests, one official `production-0`–`production-49` report, and a facts/inferences/limitations analysis. The report completed 50/50 with zero crashes and exactly matched all P13 gameplay-derived metrics; SHA-256 `4cbdcb8a3e6ad4907e767b2663431c5b08d3181faf60fd74458d38cb194dbdf3`. No bot policy, content, schema, tuning or baseline was changed. Material files: `game/engine.ts`, `scripts/run_production_soak.ts`, `tests/game/bot-progression-diagnostics.test.ts`, the raw report, `docs/P1B_BOT_PROGRESSION_DIAGNOSTIC.md`, and `PROJECT_STATE.md`.
- 2026-09-15 — PR #57 review correction: rejected the P1B round-target/XP-budget candidate and reverted all production behavior, version assertions, and candidate-only tests to exact base `67a0e26dd6d2b9ebf84c12c597574750dff6bc21`. Retained the exact POST raw report as historical rejected-experiment evidence and rewrote its interpretation. No P1B tuning is production policy or merged. Material branch delta: the raw report, `docs/P1B_ADAPTIVE_BOT_TUNING.md`, and `PROJECT_STATE.md` only.
- 2026-09-14 — P13 Final Production Baseline from exact `b2bada40ab52488423425bb4fda1abb851717fa9`: one unchanged-harness 50-seed run completed 50/50 matches with zero crashes, 34–47 rounds (40.06 average), 24.926 paced / 34.941 full-clock minutes. Raw report and SHA-256 are pinned above. The full-clock 20–30-minute target is false; other existing target booleans are true. These are directional signals before P1B, not tuning authority. Material files: raw report, `docs/P13_FINAL_PRODUCTION_BASELINE.md`, `PROJECT_STATE.md` only.
- 2026-09-14 — P12 Named PvE Boss Identity, PR #55, merge commit `b2bada40ab52488423425bb4fda1abb851717fa9`: named bosses and faction enemies for eight late PvE waves, 16 reproducible v2 visual bases, portraits/tokens, local headless asset pipeline, provenance and validation; preserved existing combat stat/effect profiles and rewards. GameContent `1.31.0`; schema 6. Asset chain of title remains independently unverified and is explicitly documented for rights review.
- 2026-09-13 — P11 Voyage Recruitment Choice, merged PR #54 at `08c9b20c5a93aa653002583c2a7f75b9f272a9a6` (implementation commit `5c68cd3cff61ba8383a830480212dbec29080ffc`): added explicit non-combat rounds 10/20 with persisted trait-aware deterministic offers, shared-pool reservations/release, existing-score bot picks, full-bench gold conversion, schema-6 legacy checkpoint/replay reconciliation, dedicated recruitment presentation and focused domain/browser regressions. No new item rewards, combat, balance or 1,000-seed baseline. GameContent `1.30.0` at P11; superseded by P12's `1.31.0`.
- 2026-09-12 — PR #53 review correction: removed the 10/20 special stage definitions; both rounds now use the pre-existing default PvP fallback, including 50-second preparation, ordinary PvP damage and no extra item reward. Corrected exact PvE topology is `1,2,3,9,14,19,24,28,32,36,40`. No other P10 reward, carousel, supply-choice, version or schema behavior changed. Material files: `game/content.ts`, focused/affected topology tests, `docs/P10_FIXED_PVE_ITEM_ECONOMY.md`, `PROJECT_STATE.md`.
- 2026-09-12 — P10 Fixed PvE Cadence and Item Economy, PR #53, initial implementation commit `aa925bf6f306e49722ada44a623d78972a74b9bc`: added explicit seeded stage rewards, final round-40 PvE, automatic/choice/multi-item component and completed-item rewards, supply choices at 5/8/11, generic reward/tutorial presentation, save/choice regressions and item-source production-audit counters. Pinned PAC commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee` has PvE `1,2,3,9,14,19,24,28,32,36,40`, item carousels `4,12,17,22,27,34`, Additional Picks `5,8,11`, and Portal Carousels `0,10,20` (not PvE). The initial same-seed 50-match POST audit in `docs/P10_FIXED_PVE_ITEM_ECONOMY.md` predates the review correction and must not be treated as corrected-head measurement; exact-base PRE 1,000 raw report is retained. GameContent `1.29.0`; schema 6.
- 2026-09-11 — P9 Four-Character Expansion: added Killer, Buggy, Capone Bege and Whitebeard with locked content-driven identities; completed distinct static/portrait/token/v2 asset integration from four SHA-pinned licensed-reference sheets; added own-property missing-pool-key backfill for schema-6 saves; expanded focused, affected, asset and browser coverage. GameContent is `1.28.0`; schema remains 6. Material files: `game/content.ts`, `game/persistenceFormat.ts`, animation manifests/pipeline/source matrix, four source sheets and derived asset families, focused/affected tests, `e2e/p7-assets.spec.ts`, `ASSET_PROVENANCE.md`, `docs/P9_FOUR_CHARACTER_EXPANSION.md`, `PROJECT_STATE.md`.
- 2026-09-11 — P8 Captain Damage & Pacing: added reporting-only Captain-damage/stage-reach/elimination diagnostics, captured the old star-weighted PRE control, replaced the domain formula with explicit round pressure plus one per living winner survivor across PvP/ghost/PvE, preserved frozen-result elimination fairness/history/save behavior, and captured the same-seed POST comparison. PRE/POST report SHA-256: `cfe1a0527298146e656b5e0bdf47f89092a5bd4a2b88659bb0e541dddcd3ddbb` / `0ce0bc301c05015860c92f17a5af0ae83368e40d0f2431e7b13cea034b3fcb1f`. Average rounds 38.776→38.510, paced minutes 26.034→26.126, damage/loss 8.944→8.554, first elimination average 20.597→23.031, and stage-36 reach 72.8%→83.8%; all hard gates passed. GameContent is `1.27.0`; schema remains 6. Material files: `game/matchFlow.ts`, `game/engine.ts`, `game/content.ts`, production-soak diagnostics, focused/affected tests, two raw P8 reports, `docs/P8_CAPTAIN_DAMAGE_AND_PACING.md`, `PROJECT_STATE.md`.
- 2026-09-11 — P7 Major Asset Production: replaced the remaining 12 shared-placeholder crew and three P5 PvE placeholders with distinct static and 46-frame v2 identities; completed v2 coverage for all 30 crew/eight PvE units; added 65 item, 13 trait, eight status and four form visual families, explicit manifests/fallbacks, visible-only loading, deterministic generators/editables, four QA contact sheets and source/hash provenance. Runtime public assets increased by 971,677 bytes (0.93 MiB). GameContent is `1.26.0`; schema remains 6. Material files: animation/UI asset sources, generated runtime assets and QA sheets, asset manifests/loaders, selectors/screens/styles, validation/generation scripts, focused/affected tests, `e2e/p7-assets.spec.ts`, `ASSET_PROVENANCE.md`, `docs/P7_MAJOR_ASSET_PRODUCTION.md`, `PROJECT_STATE.md`.
- 2026-09-10 — PR #49 review correction: Brawler Counterstrike and Marksman bonus shots suppress only victim damaged-Energy; split basic bundles, including Bodyguard cover, resolve Guardian/Brawler once per actual recipient in stable ID order and preserve covered Marksman success; P6 Navy/Emperor start Shields remain visible without entering Bombardier's runtime meter; active trait semantics now state current, active and next thresholds or maximum tier. GameContent remains `1.25.0`; schema remains 6. Material files: `game/combat.ts`, `app/selectors.ts`, focused P6 regressions, `PROJECT_STATE.md`.
- 2026-09-09 — P6 Trait Identity & Depth: added explicit tier scope, typed battle-local behaviors and final deterministic identities for all 13 existing traits; integrated trait-grant holders, persistent forms, P4 damage/status/item authorities and Phoenix per-unit/team reset semantics; expanded semantic keyboard-reachable trait presentation without bot tuning. GameContent is `1.25.0`; schema remains 6. Material files: trait/content/combat/type modules, selectors/screens/styles, focused and affected regressions, `docs/P6_TRAIT_IDENTITY_AND_DEPTH.md`, `PROJECT_STATE.md`.
- 2026-09-09 — P5 Late-Game Voyage: added completed-item carousels at rounds 22/27/34, completed-item PvE stages at 24/28/32/36, Vice Admiral/Cipher Pol Agent/Seraphim placeholder archetypes, stable seeded late reward generation and focused topology/reward/bot/save regressions. Early component acquisition, carousel sessions, PvE placement, bots, combat, economy and schema 6 remain unchanged; GameContent is `1.24.0`. Material files: `game/types.ts`, `game/content.ts`, `game/engine.ts`, focused/affected tests, README, `docs/P5_LATE_GAME_VOYAGE.md`, `PROJECT_STATE.md`.
- 2026-09-09 — PR #47 review correction: merge retention now excludes native/form-redundant trait grants before final cap allocation and deterministically backfills later valid completed items or one component; bots reject direct completed duplicates during candidate scoring while duplicate/redundant craft results remain legal and use structural scoring only; inventory items expose associated semantic kind/effect/recipe/grant details, and focusable `aria-disabled` items suppress activation. GameContent remains `1.23.0`, schema remains 6. Material files: `game/roster.ts`, `game/engine.ts`, `app/selectors.ts`, `app/screens/GameScreens.tsx`, focused P4C/P4A and tutorial E2E tests, `PROJECT_STATE.md`.
- 2026-09-08 — P4C complete item integration: added the ten approved trait-grant identities with exact locked stats, deployed-only effective-trait resolution across persistent forms/items, redundant direct/craft/merge handling, component-only PvE/carousel acquisition, canonical recipe/grant selector data, keyboard-focus tooltips and craft previews, generic non-sheet bounty rendering, tutorial updates and recipe-aware bot equipping. P4 is complete; GameContent is `1.23.0`, schema remains 6, and no trait tier, P4B behavior, Gear 4 catalyst, cadence or save ID changed. Material files: item/trait/roster/engine/scoring domain modules, selectors/decision support/screens/Carousel presentation, focused/affected tests, README, `docs/P4_ITEM_SYSTEM_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-09-08 — PR #46 review correction: resurrecting Phoenix Feather units now reserve their board coordinate for movement, Lunge, Knockback, Pull, Smoke-Star Escape and end-of-tick movement resolution while remaining untargetable and otherwise inactive. Focused regressions cover the full two-second delay, all affected spatial paths, continued team activity and unique coordinates after resurrection. Material files: `game/combat.ts`, `tests/game/p4b7-final-core-items.test.ts`, `PROJECT_STATE.md`.
- 2026-09-08 — P4B7 final core non-trait item pack: implemented Flame-Flame Grimoire, Miracle Talisman, Mystery Treasure Chest, Smoke-Star Escape, Phoenix Feather, Banquet Belt, Reversal Band, Mera Mera Ember, Bombardier Band, Bodyguard Band, Nullification Bandanna and Efficient Bandanna. Added only the required battle-local Protect/Blind/Paralysis/resurrection/Max-Energy, threshold-consumption, generated-item, escape/interception and ordered stat-delta primitives. All 45 non-trait completed outputs now have mechanics; 10 trait grants remain deferred. GameContent is `1.22.0`; schema remains 6. Material files: `game/types.ts`, `game/content.ts`, `game/combat.ts`, snapshot/presentation consumers, production-audit compatibility, focused/version regressions, `docs/P4_ITEM_SYSTEM_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-09-08 — PR #45 review correction: sequential abilities retain one shared Ability Crit roll per cast while each strike now selects normal- or Crit-weighted damage from its current target's Iron Pirate Helm state after deterministic retargeting. Both normal→Helmet and Helmet→normal directions are covered without adding an RNG roll. Material files: `game/combat.ts`, focused P4B6 tests, `PROJECT_STATE.md`.
- 2026-09-08 — P4B6 defense/control/retaliation item pack: implemented Ability Shield, Gracidea Flower, Heavy-Duty Boots, X-Ray Vision, Safety Goggles, Razor Fang, Protective Pads, Rocky Helmet, Assault Vest, Poké Doll, Power Lens and Sticky Barb under the approved One Piece IDs. Added deterministic horizontal start support, battle-local Rune Protect/Wound/resistance reduction, forced-movement immunity, cannot-miss adaptation, ordered shield/non-True mitigation, target-specific Crit-bonus negation and bounded non-recursive retaliation. Sea Prism Stone intentionally changes to +40 Special Defense/Burn mitigation while retaining its stable acquisition ID. GameContent is `1.21.0`; schema remains 6. Material files: `game/types.ts`, `game/content.ts`, `game/combat.ts`, focused/version regressions, `docs/P4_ITEM_SYSTEM_AUDIT.md`, `PROJECT_STATE.md`. Publication SHA/PR is reported in the task handoff.
- 2026-09-07 — P4B5 advanced combat item pack: implemented the seven approved periodic, critical-shield, max-HP attack, chain, bounce, damage-received stack and True-damage conversion identities. Basic attacks now resolve a narrow raw Physical/Special/True bundle; item family order is deterministic and private counters are battle-only. Armament Wraps and Den Den Mushi intentionally replace their temporary legacy combat values while retaining stable IDs/acquisition positions and Gear 4. Material files: `game/types.ts`, `game/content.ts`, `game/combat.ts`, focused/version regressions, `docs/P4_ITEM_SYSTEM_AUDIT.md`, `PROJECT_STATE.md`. Publication SHA/PR is reported in the task handoff.
- 2026-09-07 — `23c26ca`, merged PR #43: P4B4 cast/sustain items added post-cast Energy/Shield, battle-start native Ability Crit Power and actual-damage healing for the four approved mappings. Private cast count advances once per resolved cast; Shell Bell includes shield damage and attributed burn while preserving omnivamp. Material files: `game/types.ts`, `game/content.ts`, `game/combat.ts`, focused/version tests, `docs/P4_ITEM_SYSTEM_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-09-07 — P4B3 periodic/basic-attack item effects on `feat/p4b3-periodic-attack-items`: added exactly five PAC mappings for Clima-Tact, Jet Sash, Cola Engine, Shark Tooth Charm and Energy-Siphon Scope. Periodics begin after one complete tick-derived interval before intent selection; post-attack effects include dodge attempts, exact kill attribution and critical Energy transfer. Dynamic Speed accumulates against the post-static resolved interval without changing the P4B2 static formula. Legacy acquisition order, Gear 4 catalysts and schema 6 remain intact; GameContent is `1.18.0`. Material files: `game/types.ts`, `game/content.ts`, `game/combat.ts`, focused/version regression tests, `docs/P4_ITEM_SYSTEM_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-09-02 — P4B2 component/simple-item effects on `feat/p4b2-simple-item-effects`: activated all ten component stat identities plus Devil Fruit Codex, Black Blade, Sniper Goggles, Meat Platter and Lucky Pirate Ribbon using the locked HP/Attack/Shield ×3 translation, direct AP/Crit/Luck/Defense/Special Defense/Range/PP values and adapted Speed-to-attack-speed mapping. Added only `dodge-percent` and deterministic final-starting-Max-HP shield primitives. Stable IDs, legacy acquisition order, Gear 4 catalysts, schema 6 and deferred item behavior remain intact; GameContent is `1.17.0`. Material files: item/combat/types/scoring/presentation source, focused and version/behavior regression tests, `docs/P4_ITEM_SYSTEM_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-09-02 — `8130a5c`, PR #40, P4B1 combat primitive foundation on `feat/p4b1-combat-primitives`: added Physical/Special/True damage selection with the existing mitigation curve, Special Defense with Defense fallback across forms, default 200% Crit Power, the deterministic PAC Luck probability helper, one opt-in Ability-Crit result per cast and item-effect support for Special Defense, starting shield, Crit Power, Luck and Ability Crit. Review correction made item Defense and Special Defense independent while retaining dual-resistance trait compatibility; Sea Prism Stone and Armament Wraps now carry matching explicit Special Defense to preserve their previous effective resistance. Event shape, production combat hash, GameContent `1.16.0` and schema 6 remain unchanged. P4B item behavior implementation and P4C were not started. Material files: `game/types.ts`, `game/combat.ts`, `game/content.ts`, `game/scoring.ts`, exhaustive dormant-effect labels, focused tests, `docs/P4_ITEM_SYSTEM_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-09-01 — P4A item-domain foundation on `feat/p4a-item-domain-foundation`: added typed component/completed kinds, a pure sorted-pair recipe domain, ten components, all 55 approved completed outputs/recipes, explicit legacy-eight acquisition, preparation-only crafting, completed uniqueness, deterministic completed-first merge retention and schema-6/form-catalyst regressions. Existing eight effects/IDs, reward/carousel RNG, selling, Robin and Gear 4 contracts remain intact. GameContent is `1.16.0`; P4B/P4C, tuning and the 1,000-seed soak were not started. Material files: `game/types.ts`, `game/items.ts`, `game/content.ts`, `game/engine.ts`, `game/roster.ts`, `game/index.ts`, focused/affected tests, `docs/P4_ITEM_SYSTEM_AUDIT.md`, `PROJECT_STATE.md`.
- 2026-09-01 — P4 core item-system PAC-first architecture audit on `analysis/p4-item-system-audit`: verified the ten components, all 55 recipes, stats, behavior identities, triggers, uniqueness/cap rules, early PvE rewards and carousel pools at pinned PAC commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`; mapped current local inventory/equip/merge/sell/RNG/bot/combat/save/UI support; recorded missing primitives; proposed complete One Piece naming and a four-part bounded decomposition. No gameplay, content, schema, metric, baseline or simulation changed. Material files: `docs/P4_ITEM_SYSTEM_AUDIT.md`, `PROJECT_STATE.md`.
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

B11 / B10 merge handoff (2026-11-11):

- Executed — expected-head GitHub squash merge and local main fast-forward to `45556741eb512454e7f420a42c835ad6e3847c5d`; B11 branch created from that main. Prior exact-head CI #181 was green; no merge-finalization tests rerun.
- PASS — final typecheck, lint (zero warnings), asset validation (137 atlases) and production build. All source/map/atlas hashes and original fallback packages remain checked; build retains existing nonfatal chunk/static-route notices. No local full-suite or production aggregate.
- PASS — form/save/replay focused six files / 71 tests; four in-context form/Phoenix browser cases plus two existing save/Chronicle/perspective cases in both desktop sizes. Actual canvas captures retained. New pose test's repeated Sharp I/O was replaced by one raw read per body board; no timeout or assertion weakened.
- PASS — final ten affected atlas/fallback/anchors/codex/Chopper/Phoenix/P12 files: 97/97; the six form/save/replay files above add 71/71 (168 focused tests total). Final Lab/fallback browser 6/6 plus the four form/Phoenix and two Chronicle cases above: 12/12 at 1280×720 and 1920×1080. Actual master/clip boards and browser captures inspected.
- NOT RUN locally — full unit/coverage suite and production smoke; those remain normal PR CI checks. No separate aggregate, baseline or 1,000-seed soak. Normal PR CI pending publication.

2026-11-11 B10 candidate:

- Executed (asset creation, not verification) — one built-in image draft per pilot; local pose curation; frozen atlas/GIF/static/icon exports; LibreSprite editable-source creation. Its initial restricted-profile write failed, then succeeded using an ignored workspace-local editor profile. Original sheets, prior atlases and historical reports are retained.
- PASS — owner-approved typecheck, lint, final production build and asset/provenance validation: 79 atlases, 34 crew, 29 PvE definitions, 65 items, 13 traits and 4 forms. Existing nonfatal Vinext chunk/static-route notices remain; no build configuration change.
- PASS — focused seven files / 41 tests, including affected resource/B10 13/13 after the CI count correction and earlier B10/static-quality 13/13. Initial Windows temp-cache EPERM prevented collection; workspace cache resolved it. The new crop/trim test helper was corrected; an unchanged static asset I/O timeout passed on the earlier focused rerun. No assertion or timeout weakened. P7 preserves the current normalized content hash and schema/version checks.
- PASS — final four B10 browser cases in both desktop sizes; final targeted board capture 2/2. Lab's menu entry now waits for save readiness, form comparison shows preferred base/form side by side and old v1 stays under ordinary Robin. Exact two-card count, full card bounds, six clips, facing, visible-only atlas requests and on-screen canvas are asserted. Eight actual Lab/board PNGs retained in `art/qa/b10/browser`; snapshots inspected. Source/body boards and icon sizes remain separate from owner style acceptance.
- PASS — no diff to B09 main in `game/`, production harness, historical analyses, licensed-reference sheets or existing Luffy/Koala/Kaido v2 atlases; whitespace inspection passed. No content/schema/metric/battle-RNG change.
- FAIL then corrected — CI #180 on `86dec9a`: 953/954 tests; only the stale 63-v2 expectation failed. The count is now 66 with explicit pilot coverage and all anchor comparisons intact. No workflow/production change. Normal [PR #72 checks](https://github.com/KarmaKami994/onepiece-autochess/pull/72/checks) are the exact-head integration gate; local checks do not imply remote CI success.
- NOT RUN locally — full unit suite, separate production smoke/aggregate, 1,000-seed soak or new baseline. Normal CI retains full tests/coverage/assets/ordinary smoke/build/browser/dependency review.

2026-11-09 merge / asset planning:

- PASS — GitHub reported PR #71 merged with expected-head squash; prior CI #178 completed success on `569edbd`. Local `main` and `origin/main` both `74cea3577eba98a07911b2d488abd3ece20b373d`; clean before creating the isolated documentation branch. Merge finalization changed no source files.
- Source inventory only — read content exports, matrix/atlas metadata, import/export/visual manifests and existing Crew/Item contact sheets; consulted local PixelLab skill and official provider docs. These are planning findings, not new test/asset-validation PASS claims. No PixelLab tool is exposed in the active catalogue; B10 must establish access before using it.
- NOT RUN — new typecheck/lint/unit/build/E2E/asset-validation/CI for the documentation plan; no gameplay/config/source/asset change. No production run, new baseline or 1,000-seed soak. No B10/B11/B12 execution.

B09 candidate / B08 merge:

- Executed — normal B08 push, PR #70 creation and expected-head squash merge; main fast-forwarded to `e564e59b580a0238e309e61310231649f2b21094`, then B09 branch created. No B08 check/CI result claimed.
- Source inspection — pinned PAC dish ownership, eating limits, command consumption and battle-start application; direct/adapt/reference/reject contract fixed before B09 code.
- PASS — owner-approved final typecheck/lint, final production build, asset/provenance validation and diff whitespace check. Three icons and both Galley screenshots visually inspected. Normalized content contract `6bf4b1a2b130dc9699b047926be72a60587f6275d315713f0c32a9e128198613` passes its regression.
- PASS — final focused 6 files / 78 tests; affected B08/P9/P7/reference 4 files / 54 tests. Initial focused 77/78 exposed the new lethal-vs-lethal Phoenix fixture; corrected to retain a living opponent through revival. Full local unit run once: 945/949, with four stale B08 foundations corrected and passing in the focused run; no second full local run. Exact B07 content/control hash `58e78178` and historic trace expectations passed in that full run; raw reports remain unchanged.
- PASS — corrected B09 browser 6/6 at 1280×720 and 1920×1080; existing harbor/tools 12/12 in the initial combined run. Initial combined result 16/18 exposed native Enter being intercepted by the global battle shortcut; food buttons now stop only Enter/Space propagation. No timeout/assertion relaxed. Known Windows teardown completed by stopping only the identified owned test server. Normal GitHub CI (full suite/coverage/assets/50-match smoke/build/browser/dependency review) is enabled on PR #71; use its linked exact-head checks for the remote result.
- PASS — CI #177 on `58a6f94`: 949/949 normal and coverage tests; coverage statements/branches/functions/lines 94.55/88.17/98.27/95.93%; assets, 50/50 smoke with zero crashes, build and dependency review. One unchanged failed-job retry resolved the existing 30-second coverage-audit timeout; no threshold/config change.
- FAIL then corrected — that CI's two weather browser cases: left rail intercepted the disclosure click. A scoped CSS position moves it into the board's free area; Food badges similarly sit below playback controls. PASS — affected 20-case local browser set: 19 passed initially, the unchanged 1920 full-voyage case passed on one isolated retry; final Food placement/keyboard/save cases 2/2 with explicit non-overlap assertion. Both desktop screenshots inspected. No second local full unit suite or further local test run; latest normal CI checks the CSS head.
- NOT RUN — separate production smoke/aggregate, new baseline or 1,000-seed soak. Historical raw JSON/hashes untouched. No B09 merge or next batch.

B08 preparation / B07 merge:

- PASS — GitHub squash merge of exact approved B07 head; completed green CI 172; local `main` fast-forwarded to `d70b3c1` before creating B08. No new merge-finalization tests or source changes.
- Source inspection — pinned PAC status/entity eligibility/damage reaction, weather selection, passive Rain Energy and simulation paths; exact source links and direct/adapt/reference/reject split in B08 contract.
- Implementation artifacts generated — four original SVG status icons / updated contact sheet; generator exit 0 with a host Fontconfig cache warning. Normalized content snapshot expectation generated: SHA-256 `7946a123016fdcceeb1e2f3b01fe4fb74f5db118fd53f1c3b33befa5f246cbed`. Generation is not validation; no image QA or comparison was performed.
- NOT RUN — all B08 focused/full tests, typecheck, lint, asset validation, build, E2E and GitHub CI: owner answered “Nein, vorerst keine Prüfungen ausführen”. Test cases are authored, not passed. Existing seed-0 control expectations 252 / `6e648b36` remain under hash-anchored B07 content `58e78178`; current-content observer equivalence remains in the test. Historical raw reports are not rewritten.
- NOT RUN — separate production smoke/aggregate, 1,000-seed soak or new baseline. PR creation is deferred because it starts normal CI; task-branch publication does not authorize checks or merging B08.

B07 implementation / merge handoff:

- PASS — GitHub merged flags for #68/#65/#64; local/origin main SHA `93b1874ef760bf07d317771d8527d3240c0d339a`, byte-identical tree to CI-green B06 `9a0dfa4`, clean before starting B07. No additional test/soak run for merge finalization.
- Source inspection — pinned PAC starter/synergy/region proposition and NPC/town definitions; bounded local adaptation documented before implementation. Existing low-level prepared-match constructor retained; actual client and production harness use the new starter entry point.
- PASS — owner-approved typecheck/lint; 13 focused files / 181 tests; full unit suite once, 69 files / 903 tests; production build, asset/provenance validation and diff whitespace inspection. Legacy authored content hash `a6d7c074` and config `977295da` remain pinned; new content hash `58e78178` and complete new seed-0 diagnostic trace are locked. Historical raw JSON reports unchanged.
- PASS — corrected final browser run 22/22 at 1280×720 and 1920×1080; existing tutorial/Chronicle 6/6 in the initial combined run. Screenshots inspected. Initial 21/28 exposed new-test async-save/start-gold assumptions, stale R21 expectations and a starter-induced merge in an old empty-roster fixture. The first corrected run exposed decorative rays intercepting skip; stopped that known-failing run, fixed the UI and tested actual starter/harbor skips. No assertion/timeout relaxed. Windows teardown required stopping only the identified owned test server.
- NOT RUN locally — separate production smoke/aggregate, 1,000-seed soak or new baseline. Single-match unit fixtures remain regressions only. Normal GitHub CI is the remote review gate; its ordinary smoke/browser checks remain enabled.

B06 implementation:

- Source inspection — pinned PAC `app/config/game/stages.ts` and targeted phase initialization/update paths in `app/rooms/commands/game-commands.ts`; existing local stage durations, combat tick cap and carousel duration formula already match exactly.
- PASS — final typecheck/lint; focused clock/save tests 30/30; full unit suite 68 files / 887 tests (serial file execution); production build.
- PASS — corrected pacing/tutorial browser run 12/12 at 1280×720 and 1920×1080; existing battle-economy/resume and manual recruitment 6/6 in the initial combined run; final manual-result waiting state 2/2. Screenshots inspected. Initial combined run was 16/18 because the accessible timer label changed; restoring PREPARE fixes both unchanged tutorial assertions. No test/timeout/lint rule weakened.
- PASS — domain/content/config/schema/scripts/packages unchanged; existing deterministic and P7 hash regressions pass. Normal CI remains the remote integration gate.
- NOT RUN locally — additional production smoke/aggregate, 1,000-seed soak or new baseline. Normal CI retains its ordinary smoke/browser checks.

B05-C separately approved carrier evaluation / rejection:

- PASS — candidate typecheck/lint; focused initial tests 30/30, final carrier/craft/form/diagnostic set 93/93, full suite 68 files / 869 tests with serial file execution. Existing assertions/timeouts unchanged; eight candidate causal/legality cases passed.
- PASS — exactly one committed-head POST, `production-0`–`production-49`: 50/50 complete, zero crashes/thrown harness invariant failures; measured experimental content `1.32.0`, schema 6, content/config hashes `556bb345` / `977295da`, paced 24.706 minutes, winner/trait booleans true. FAIL — cost-4/5 player presence and cost-5 final-presence gates; rejected/reverted as approved.
- PASS — restored source/scripts/tests have zero diff to B documentation head (and A); original full PRE seed-0 equality restored. Restored typecheck/lint and focused diagnostic/craft/form/formation set 7 files / 85 tests pass. Current GameContent `1.31.0`, schema 6.
- PASS — exact C POST SHA-256 above, retained PRE hashes and B POST hash unchanged. Final branch delta to its B base is documentation/report only. Base PR #64 CI run 164 completed green; C normal CI remains its review gate.
- NOT RUN locally after revert — repeated full suite, build, Browser E2E or additional aggregate/smoke; normal CI retains those checks. No PRE rerun, second C POST, 1,000-seed soak or new baseline.

B05-B approved one-candidate evaluation / rejection:

- PASS — measured candidate typecheck/lint and focused tests (36/36); candidate full suite 870/871 with one existing asset-enumeration I/O timeout, unchanged file 8/8 on focused rerun (316 ms). No timeout or assertion weakened.
- PASS — exactly one POST at the committed source above: 50/50 complete, zero crashes/thrown harness invariant failures, experimental GameContent `1.32.0`, schema 6, content/config hashes `556bb345` / `977295da`, paced 25.128 minutes, existing winner/trait booleans true. FAIL — locked cost-5 representation gates; candidate rejected/reverted rather than retuned.
- PASS — restored source/scripts/tests have zero diff to A merge; current version `1.31.0` / schema 6. Restored typecheck, lint, focused diagnostics (18/18) and full suite (67 files / 861 tests, serial file execution to avoid OneDrive contention). Existing PRE seed-0 equality regression passes again.
- PASS — POST SHA-256 above and retained PRE hashes `4cbdcb8a3e6ad4907e767b2663431c5b08d3181faf60fd74458d38cb194dbdf3` / `8d02ba30bdf2030da2b4adc5b4715b179269ffd039e443ddfd2f10688246db84` verified unchanged. Final PR delta is documentation/report only.
- NOT RUN locally — separate build/Browser E2E/additional smoke after rejection; no UI change. Normal GitHub CI remains the PR gate. No PRE rerun, second POST, 1,000-seed soak or new baseline.

B05-A decision diagnostics:

- PASS — typecheck, lint, focused diagnostic/form runs (41/41 and 62/62), final new decision suite (14/14). Diagnostics on/off serialize to identical end state/RNG; successful receipts preserve purchase order/source. Current seed-0 legacy facts exactly match the retained PRE with equal content/config hashes.
- Full suite: 860/861 passed; only existing asset enumeration exceeded its five-second I/O limit while lint also ran. PASS — unchanged asset-test file on focused rerun (8/8, 335 ms). No assertion or timeout changed; normal CI remains the PR gate.
- PASS — historical diagnostic SHA-256 remains `4cbdcb8a3e6ad4907e767b2663431c5b08d3181faf60fd74458d38cb194dbdf3`; content/scoring/forms/roster/bot policy files and raw reports remain unchanged.
- NOT RUN locally — Browser E2E (no UI/Phaser behavior affected), separate production smoke, new aggregate/POST, 1,000-seed soak or baseline. Ordinary CI smoke/browser checks remain enabled.
- PASS — exact A head `f5287034a33414b6c3a636f044fe103df1319f4c`, GitHub CI run `42050651954`: validation and dependency review completed green before PR #63 squash merge.

B04 voyage chronicle:

- PASS — typecheck, lint, focused recording/contribution/selector suite (30 tests initially; final Chronicle 18/18), full unit suite (66 files / 843 tests before four final import-hardening cases) and production build. Final import hardening plus typecheck pass; normal CI validates the resulting 847-test full suite.
- PASS — corrected Browser E2E run: 10/10 across 1280×720 and 1920×1080. Covers persisted completion, duplicate resumes, collection links, actual playback pause/navigation/perspective/speed, B03 totals/audio, malformed/incompatible imports, archive/profile backup round-trip, independent resets and unchanged active save. Screenshots inspected. Owned Windows server required targeted teardown.
- PASS — one normal deterministic captain-voyage recording regression: observation preserves state/RNG hashes; complete JSON round-trip validates and stays under its size limit. No game/content/schema/package/asset change.
- NOT RUN — local aggregate production report, 1,000-seed soak or new baseline. Normal CI remains the integration gate. No B05 work.

B03 combat readability/audio:

- PASS — typecheck, lint, focused report/audio/selector/Nami/Phoenix tests (5 files / 71 tests), full unit suite (65 files / 829 tests), asset validation and production build.
- PASS — corrected Browser E2E run: 8/8 across 1280×720 and 1920×1080 (exact final log totals, no future totals, replay/perspective/speed reset, spectating/economy, Reduced Motion/High Contrast, decoded local tracks and independent/legacy volume/mute settings); screenshots inspected. Both existing battle-economy/resume cases passed in the first run. Windows teardown required stopping only the verified owned server.
- NOT RUN — production aggregate, 1,000-seed soak or baseline. Normal GitHub CI remains the merge gate. No B04 work.

B02 Crew Tools:

- PASS — typecheck, lint, focused planner/reference/selector suite (3 files / 37 tests), full unit suite (63 files / 822 tests) and production build.
- PASS — all 6 new Browser E2E cases across 1280×720 and 1920×1080: 4 codex/isolation cases and 2 planner cases on the focused corrected rerun. Covers keyboard entry, filters, coordinates, invalid equipment, save/reload, import/export, repeatable combat/replay and byte-identical active-voyage checkpoints. Screenshots inspected. Windows owned-server teardown required targeted cleanup after assertions.
- PASS — production content, match schema, combat/engine/scoring rules, package files and historical raw reports remain unchanged. Normal GitHub CI remains the PR merge gate.
- NOT RUN — local production aggregate, 1,000-seed soak or new baseline. No subsequent batch was started.

B01 result completion:

- PASS — typecheck; lint; focused result/selector/save/match-flow/Robin/Luffy tests (6 files / 75 tests); full unit suite (61 files / 797 tests).
- PASS — focused Browser E2E plus the existing complete-voyage flow: 8/8 across 1280×720 and 1920×1080; result screenshots inspected. The Windows owned-server teardown needed targeted cleanup after all assertions passed; Playwright then exited 0.
- PASS — production build (`npm run build` through the installed npm CLI). Normal GitHub CI remains the PR merge gate.
- NOT RUN — local production aggregate, 1,000-seed soak or new baseline. Content/schema and historical raw reports are unchanged; normal CI smoke remains regression-only.

P1B Bot Progression Diagnostic:

- PASS — focused diagnostic and production-audit tests: 2 files / 14 tests; observer-enabled and disabled runs preserve exact serialized `MatchState` and RNG, deterministic order, detached/frozen events, and normal-report equality.
- PASS — TypeScript (`tsc --noEmit`), ESLint, and full unit suite (60 files / 790 tests).
- PASS — exactly one official diagnostic 50-seed production run: 50/50 complete, zero crashes, GameContent `1.31.0`, schema 6, content/config hashes `a6d7c074` / `977295da`, 12,241 observed preparations; raw SHA-256 `4cbdcb8a3e6ad4907e767b2663431c5b08d3181faf60fd74458d38cb194dbdf3`.
- PASS — every P13 gameplay-derived report field is exactly equal. Only expected diagnostic/metadata fields differ (`generatedAt`, Git SHA, Node version).
- NOT RUN — P13 PRE rerun, any second diagnostic aggregate, 1,000-seed soak, local Browser E2E or local build. Normal GitHub CI remains the merge gate.

Rejected P1B candidate / PR #57 documentation-only correction:

- PASS — branch diff inspection confirms production source and tests match exact base `67a0e26dd6d2b9ebf84c12c597574750dff6bc21`; only the two P1B documentation artifacts and retained raw report differ.
- PASS — the historical POST report remains byte-identical at SHA-256 `289dd6ae10a0b1bebfae5b2830e94d025bfde5eecd71ac9340858a555a643855`.
- PASS — GitHub CI run 147 on reverted head `8732462c841f6e08aa99d92efbb9fe2eb6e22f0b`: typecheck, lint, tests, coverage, asset validation, normal 50-match production smoke, build, Browser E2E, and dependency review all completed successfully.
- NOT RUN locally — tests, production smoke, Browser E2E, build, or any aggregate soak after the revert. No 1,000-seed run or additional authored baseline was generated.

P13 Final Production Baseline:

- PASS — exactly one official 50-seed production-harness run from the clean base `b2bada40ab52488423425bb4fda1abb851717fa9`: report identifies GameContent `1.31.0`, schema 6, hashes `a6d7c074` / `977295da` and seeds `production-0`–`production-49`; 50/50 complete, zero crashes, no thrown transition/placement or other harness invariant failure. Raw report SHA-256 `8d02ba30bdf2030da2b4adc5b4715b179269ffd039e443ddfd2f10688246db84`.
- PASS — TypeScript (`tsc --noEmit`), ESLint, full unit suite (59 files / 786 tests).
- NOT RUN — additional local production smoke, 1,000-seed soak, browser E2E or production build; no gameplay or UI code changed. Standard GitHub CI remains the PR merge gate.

P11 Voyage Recruitment Choice:

- PASS — focused P11/P10/P5/P7: 4 files / 74 tests; focused P11/content RNG: 2 files / 16 tests; focused P11/save replay: 2 files / 13 tests.
- PASS — typecheck, lint, full test suite (58 files / 782 tests), 50-match production smoke (50/50 complete, zero crashes), production build, and focused 1280-px Browser E2E (rounds 10/20, 2/2).
- NOT RUN locally for P11 — 1,000-seed production soak, new authoritative baseline, full Browser E2E. PR #54 has since merged at `08c9b20c5a93aa653002583c2a7f75b9f272a9a6`.

PR #53 10/20 topology review correction:

- PASS — focused affected tests: P10, P5, P8, content RNG and P4C item integration; 5 files / 121 tests.
- NOT RUN — additional local typecheck, lint, full suite, Browser E2E, production smoke or 1,000-seed soak; the requested verification scope is focused tests plus normal GitHub CI. No new baseline was generated.
- NOT RUN — GitHub CI at the corrected head as of this handoff; it is left to the normal PR workflow.

P10 Fixed PvE Cadence and Item Economy, initial implementation (historical results before the 10/20 review correction):

- PASS — focused P10 tests: 31/31; directly affected focused set: 10 files / 188 tests before the final terminal-grant regression.
- PASS — typecheck, lint, full unit/integration suite (57 files / 771 tests), asset validation and production build as run before the final UI/tutorial corrections.
- PASS — initial pre-correction production smoke: 50/50 complete, zero crashes, GameContent `1.29.0`, schema 6; same-seed exact-base PRE 50 audit also completed 50/50 with zero crashes. These are not corrected-head results.
- PASS — focused Browser E2E after UI/tutorial corrections: match-flow and tutorial passed at 1280 px; tutorial passed at 1920 px; the 1920-px match-flow retry passed after a temporary audit checkout interrupted its earlier run.
- NOT RUN — final full Browser E2E and post-UI-change typecheck/lint/unit/build reruns. The user explicitly stopped further verification. The first full Browser E2E run before test updates had 15 passed, 4 failures from the old R1-choice expectation, and 3 expected skips; those two affected tests passed in focused reruns.
- NOT RUN — POST 1,000-seed soak. The user stopped further 1,000-seed execution; the POST audit uses the same first 50 seeds as the PRE comparison.

P9 Four-Character Expansion:

- PASS — focused P9 suite: 20/20 tests; directly affected cross-system suites: 18 files / 253 tests after updating canonical roster expectations.
- PASS — deterministic source pipeline: all four P9 runtime PNG/JSON pairs rebuilt twice with byte-identical SHA-256 values; focused asset/runtime suites: 2 files / 13 tests.
- PASS — TypeScript typecheck and ESLint through the installed project npm CLI.
- PASS — full test suite: 56 files / 744 tests.
- PASS — asset validation: 34 crew, eight PvE, 65 item, 13 trait, four form assets and 60 animation atlases.
- PASS — production smoke: 50/50 complete, zero crashes, content `1.28.0`, schema 6.
- PASS — production build.
- PASS — Browser E2E final full rerun: 19 passed / 3 expected project skips. The first full run had one isolated 1280 full-voyage transition timeout; that case passed alone and the complete rerun passed.
- NOT RUN — `npm run test:production-soak`; P9 explicitly forbids the 1,000-seed soak.

P8 Captain Damage & Pacing:

- PASS — instrumentation-only focused tests and typecheck/lint before the PRE control; old Captain-damage formula and GameContent 1.26.0 were unchanged at measurement SHA `f4b1b40449b9d3984d2f1a1bc6aa538d810c8a72`.
- PASS — PRE normalized production soak: 1,000/1,000 complete, zero crashes, seeds `production-0` through `production-999`; raw SHA-256 `cfe1a0527298146e656b5e0bdf47f89092a5bd4a2b88659bb0e541dddcd3ddbb`.
- PASS — focused P8 and affected P3/pairing/P4B7/P4C/P5/P6/save/production/history/carousel suites before POST: 13 files / 239 tests; focused P8 plus production audit: 2 files / 43 tests.
- PASS — POST normalized production soak at implementation SHA `dba043bba4bf12ff6681b189e0a955f313f3993e`: 1,000/1,000 complete, zero crashes, same seeds; raw SHA-256 `0ce0bc301c05015860c92f17a5af0ae83368e40d0f2431e7b13cea034b3fcb1f`.
- PASS — POST hard gates: 26.126 paced minutes; stage 22/24/28/32/34/36 reach 100%/100%/100%/100%/99.7%/83.8%.
- PASS — final post-measurement verification: affected cross-system suites 13 files / 239 tests; typecheck; lint; full suite 55 files / 724 tests; asset validation; production smoke 50/50 with zero crashes; build; Browser E2E 19 passed / 3 expected project skips. The unchanged full-voyage assertions passed after raising only that test's timeout from 90 to 180 seconds.

P7 Major Asset Production:

- PASS — all 12 external source imports and three project-owned PvE sources validated against the recorded matrix and SHA-256 anchors; all 15 new editable `.aseprite` sources generated.
- PASS — complete asset pipeline rebuilt twice byte-identically; final UI/QA rebuild also reproduced 337 runtime/QA files byte-for-byte.
- PASS — focused P7/runtime-anchor tests: 2 files / 15 tests; affected suites are included in the green full run.
- PASS — TypeScript typecheck and ESLint through the installed project npm CLI.
- PASS — full test suite: 54 files / 691 tests.
- PASS — asset validation: 30 crew, eight PvE, 65 item, 13 trait, four form assets, eight status icons, 56 animation atlases, maps, Carousel assets and provenance inputs.
- PASS — production smoke: 50/50 completed matches, zero crashes; regression evidence only, no tuning conclusion.
- PASS — production build; only existing chunk-size/plugin-timing and route-classification advisories were reported.
- PASS — Browser E2E: 22/22 across both configured desktop projects, including the P7 representative-asset gallery; no failed test IDs.
- PASS — four generated QA contact sheets visually inspected for crew, PvE, items and trait/status coverage.
- NOT RUN — `npm run test:production-soak`; no 1,000-seed report or baseline was generated.

PR #49 P6 review correction:

- PASS — focused P6: 1 file / 30 tests; affected P4B5/P4B6/P4B7, P4C, P5, selectors, forms and save regressions: 12 files / 231 tests.
- PASS — TypeScript typecheck, ESLint and `git diff --check` through the installed project binaries.
- PASS — full test suite: 53 files / 684 tests.
- PASS — asset validation: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — production smoke: 50/50 completed matches, zero crashes, round range 31–56; regression evidence only, no tuning conclusion.
- PASS — production build; only existing chunk-size and route-classification advisories were reported.
- PASS — Browser E2E: 17 passed / 3 expected project-matrix skips.
- NOT RUN — `npm run test:production-soak`; no 1,000-seed report or baseline was generated.

P6 Trait Identity & Depth:

- PASS — focused P6: 1 file / 25 tests; affected P4/P5, combat, forms, bot, save, pairing and match-flow group: 29 files / 483 tests.
- PASS — `npm run typecheck`, `npm run lint`, `npm test` (53 files / 679 tests) and `git diff --check`.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 completed matches, zero crashes, round range 30–50; all 13 traits were observed. Regression evidence only; no tuning conclusion.
- PASS — `npm run build`; only existing chunk-size and route-classification advisories were reported.
- PASS — Browser E2E: 17 passed / 3 expected project-matrix skips.
- NOT RUN — `npm run test:production-soak`; no 1,000-seed report or baseline was generated.

P5 Late-Game Voyage:

- PASS — focused P5: 1 file / 33 tests; affected P4C/P4B7/P4B6/P4A, carousel, match-flow, reward, bot, save and form/Gear 4 group: 13 files / 214 tests.
- PASS — `npm run typecheck`, `npm run lint`, and `npm test`: 52 files / 654 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 completed matches, zero crashes, round range 30–50; all seven new late stages were exercised in observed matches. Regression evidence only; no tuning conclusion.
- PASS — `npm run build`; only existing chunk-size and route-classification advisories were reported.
- PASS — Browser E2E: 17 passed / 3 expected project-matrix skips.
- NOT RUN — `npm run test:production-soak`; no 1,000-seed report or baseline was generated.

P4C complete item integration with PR #47 review correction:

- PASS — focused P4C/P4A: 2 files / 46 tests; affected bot/P4B7/form/Gear 4/decision group: 6 files / 99 tests.
- PASS — `npm run typecheck`, `npm run lint`, and `npm test`: 51 files / 621 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 completed matches, zero crashes; regression evidence only, no tuning.
- PASS — `npm run build`; only existing chunk-size and route-classification advisories were reported.
- PASS — Browser E2E: 17 passed / 3 expected project-matrix skips across the configured desktop viewports.
- NOT RUN — `npm run test:production-soak`; no 1,000-seed report or baseline was generated.

PR #46 Phoenix spatial-occupancy review correction:

- PASS — focused P4B7: 1 file / 41 tests; focused P4B6: 1 file / 34 tests.
- PASS — affected movement, Lunge, Knockback and Pull regressions: 12 files / 143 tests.
- PASS — typecheck and lint through the installed local binaries.
- PASS — full test suite: 50 files / 600 tests.
- PASS — production smoke: 50/50 completed, zero crashes; regression evidence only, no tuning.
- PASS — production build; only the existing chunk-size and route-classification advisories were reported.
- NOT RUN — Browser E2E (CI may run it) and the 1,000-seed production soak/new baseline.

P4B7 final core non-trait item pack:

- PASS — focused `tests/game/p4b7-final-core-items.test.ts`: 1 file / 37 tests covering all 12 identities, cross-item ordering/interactions, generated battle items, resurrection, acquisition, Gear 4, saves, version and determinism.
- PASS — P4A–P4B6 focused group: 7 files / 173 tests; affected combat/form/acquisition/save group: 19 files / 210 tests.
- PASS — `npm run typecheck`, `npm run lint`, and `npm test`: 50 files / 596 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 completed, zero crashes; regression evidence only, no tuning.
- PASS — `npm run build`; only the existing chunk-size and route-classification advisories were reported.
- NOT RUN — Browser E2E (CI may run it) and the 1,000-seed production soak/new baseline.

P4B6 defense/control/retaliation item pack:

- PASS — pinned PAC item stats and targeted executable behavior were rechecked at `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee` before implementation.
- PASS — focused `tests/game/p4b6-defense-control-items.test.ts`: 1 file / 34 tests covering all 12 identities, sequential Helm retarget directions, runtime ordering/statuses/interactions, acquisition, fixed-seed rewards, Gear 4, saves, version and determinism.
- PASS — P4A–P4B5 focused group: 7 files / 171 tests; affected combat/form/acquisition/save group: 20 files / 234 tests.
- PASS — `npm run typecheck`, `npm run lint`, and `npm test`: 49 files / 556 tests.
- PASS — `npm run assets:validate`: 41 atlases and supporting assets/provenance validated.
- PASS — `npm run test:production-smoke`: 50/50 completed, zero crashes; regression evidence only, no tuning.
- PASS — `npm run build` and `git diff --check`; only the existing chunk-size and route-classification advisories were reported.
- NOT RUN — Browser E2E (CI may run it) and the 1,000-seed production soak/new baseline.

P4B5 advanced combat item pack:

- PASS — focused `tests/game/p4b5-combat-item-pack.test.ts`: 1 file / 23 tests covering all seven identities, runtime ordering/counters, interactions, acquisition, Gear 4, saves, version and determinism.
- PASS — directly affected P4B4/P4B3/P4B2/P4B1/P4A, form/acquisition/save group: 8 files / 156 tests.
- PASS — `npm run typecheck`, `npm run lint`, and `npm test`: 48 files / 524 tests.
- PASS — `npm run assets:validate`: 41 atlases and supporting assets/provenance validated.
- PASS — `npm run test:production-smoke`: 50/50 completed, zero crashes; regression evidence only, no tuning.
- PASS — `npm run build` and `git diff --check`; only the existing chunk-size and route-classification advisories were reported.
- NOT RUN — Browser E2E (CI may run it), 1,000-seed soak or new baseline.

P4B4 cast and sustain item effects:

- PASS — focused P4B4: 16 tests; combined P4B4/P4B3/P4B2/P4B1/P4A and affected regressions: 14 files / 206 tests.
- PASS — `npm run typecheck`, `npm run lint`, and `npm test`: 47 files / 501 tests.
- PASS — `npm run assets:validate`: 41 atlases and supporting assets/provenance validated.
- PASS — `npm run test:production-smoke`: 50/50 completed, zero crashes; regression evidence only, no tuning.
- PASS — `npm run build` and `git diff --check`.
- NOT RUN — Browser E2E (no UI/Phaser changes), 1,000-seed soak or new baseline.

P4B3 periodic and basic-attack item effects:

- PASS — focused `tests/game/p4b3-periodic-attack-items.test.ts`: 1 file / 14 tests covering the 52 required metadata, periodic timing, dynamic Speed, OnAttack, Energy transfer, acquisition, determinism, version and schema regressions.
- PASS — P4B2, P4B1 and P4A focused group: 4 files / 100 tests.
- PASS — affected item/form/Gear 4, combat/identity, carousel and save group: 19 files / 255 tests.
- PASS — affected match-flow and decision-support regressions: 2 files / 25 tests; no scoring implementation changed.
- PASS — `npm run typecheck` and `npm run lint` through the installed npm CLI.
- PASS — `npm test`: 46 files / 485 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 matches completed with zero crashes; guardrail only, no tuning conclusion.
- PASS — `npm run build`; only the existing chunk-size advisory was reported.
- NOT RUN — Browser E2E; no browser/UI production source or Phaser behavior changed.
- NOT RUN — `npm run test:production-soak`; no 1,000-seed run or baseline artifact was generated.

P4B2 component and simple item effects:

- PASS — focused `tests/game/p4b2-simple-item-effects.test.ts`: 1 file / 16 tests covering all 42 required component, completed-item, ordering, combat, acquisition, Gear 4, version and schema assertions.
- PASS — P4B1 combat primitives: 1 file / 45 tests; representative production combat SHA-256 remains `eb0ceb385e0c2c497238507a26067bd6c82572b2a2491b6611849d6a13d6486a`.
- PASS — P4A item domain: 1 file / 25 tests; 10 components / 55 recipes / 65 definitions remain intact.
- PASS — existing item/form/Gear 4 group: 5 files / 61 tests.
- PASS — affected combat/identity group: 11 files / 116 tests.
- PASS — fixed-seed PvE/carousel group: 3 files / 30 tests.
- PASS — save/migration group: 4 files / 54 tests; schema remains 6.
- PASS — affected decision-support regression: 1 file / 8 tests.
- PASS — `npm run typecheck` and `npm run lint`.
- PASS — `npm test`: 45 files / 471 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 matches completed with zero crashes; regression evidence only and no tuning conclusion taken.
- PASS — `npm run build`; only the existing chunk-size advisory was reported.
- NOT RUN — Browser E2E; no browser/UI production source or Phaser behavior changed.
- NOT RUN — `npm run test:production-soak`; no 1,000-seed run or baseline artifact was generated.

P4B1 combat primitive foundation:

- PASS — focused `tests/game/p4b1-combat-primitives.test.ts`: 1 file / 45 tests covering damage types, independent item resistance effects, dual-resistance trait compatibility, legacy item preservation, Special Defense/form fallback, mitigation/pierce, burn, Crit Power, Luck, Ability Crit, Gear 4, deterministic sharing, production combat hash, version and schema.
- PASS — affected existing combat, identity, form and P4A item-domain suites: 16 files / 189 tests.
- PASS — `npm run typecheck` and `npm run lint` through the installed npm CLI.
- PASS — `npm test`: 44 files / 455 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 matches completed with zero crashes; guardrail only, no tuning conclusion.
- PASS — `npm run build`; only the existing chunk-size advisory was reported.
- NOT RUN — Browser E2E; the new effect labels are dormant and no production screen, asset or Phaser behavior changed.
- NOT RUN — `npm run test:production-soak`; no 1,000-seed run or baseline artifact was generated.

P4A item-domain foundation:

- PASS — focused `tests/game/item-domain-foundation.test.ts`: 1 file / 25 tests covering catalog, all pair keys, acquisition RNG, crafting, uniqueness/cap/errors, sell, deterministic merge, forms and schema-6 legacy IDs.
- PASS — affected existing item/form/save/carousel tests: 9 files / 100 tests.
- PASS — `npm run typecheck` and `npm run lint` equivalents through the installed npm CLI.
- PASS — `npm test`: 43 files / 410 tests.
- PASS — `npm run assets:validate`: 41 animation atlases, maps, Carousel assets and provenance files validated.
- PASS — `npm run test:production-smoke`: 50/50 matches completed with zero crashes; guardrail only, no tuning conclusion.
- PASS — `npm run build`; only the existing chunk-size advisory was reported.
- NOT RUN — Browser E2E; no browser/UI/Phaser source changed.
- NOT RUN — `npm run test:production-soak`; no 1,000-seed run or baseline artifact was generated.

P4 core item-system audit:

- PASS — all seven required PAC sources were inspected at pinned commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`; targeted pinned combat files and English descriptions resolved trigger details and two source discrepancies.
- PASS — exact inventory reconciliation accounts for 10 components and 55 unique unordered recipes, with complete proposed One Piece naming and no unrelated PAC item family.
- PASS — local facts were inspected at exact base `3259895231fde3b77c01f79a62d4cccc32555ca4`; final diff is documentation-only.
- NOT RUN — tests, typecheck, lint, build, Browser E2E, production smoke or production soak; no source/config/runtime behavior changed.

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

- B11 changes presentation only: preferred semantic clip packages, own form bodies and matching static identities; sprite-only transform/Phoenix/replay updates preserve the active combat timeline and resource state. Visible-only loading includes actual future forms in that frozen battle; old identity-correct fallbacks remain. No gameplay/content/schema value changed.
- B10 changes presentation only: additional Koala/Kaido candidates, Robin-only Demonio form body with base fallback, three existing-path icons and derived Demonio static identity. Lab waits for startup readiness and compares form/preferred base without a clipped third card; legacy variants remain selectable. Clip timing, facing, Luffy pivot and visible-only loading remain. Local verification passed; owner accepted the pilots by requesting their squash and B11 on 2026-11-11.
- B09 replaces one component option per existing harbor with Bento (+10% Max HP), Cola (+15 starting Energy, capped) or Curry (+10% Attack); no additional option/reward, and existing prices/skip remain. Separate stock cap 3; one preparation meal on a deployed instance, consumed immediately, expires after the next battle or if the recipient is lost/benched before it. Frozen meals make regeneration/ghosts/save/replay consumption-free. Existing equipment/55 recipes/P10 cadence untouched; food-only bot choice/use reuses instance scoring and reserve. Native keyboard serving remains in preparation. Content 1.34.0/schema 6; local checks complete, CI pending.
- B08 candidate: Poison at 1% Max HP/stack/second (cap 3), Freeze with Burn/Snow interaction, damage-shortened Sleep and movement/displacement/range-1 Locked. Kuzan substitutes 700 ms Freeze for 700 ms Stun; Magellan/Caesar/Pica gain the documented status additions. R14 has Charged Deck, R28 Rain, R32 Snow/Frost Patch; other rounds/PvP stay neutral. Exact environment is frozen/saved, legacy missing data stays neutral for that checkpoint, and rendering remains observational. No new phase/time budget; existing combat cap and economic/bot values remain unchanged. Candidate 1.33.0 / schema 6, unverified.
- B07 opens the production voyage with three reserved cost-1 choices at normal price (5 gold → 4 + recruit), or free skip. R10/R20 use crew-origin route focus plus an open-band wildcard; legacy offers remain exact. Usopp gives one component at R16/R21; Franky offers an optional 2-gold component at R18/R23. Both return to same-round preparation after once-only choice; bots retain existing scores/reserves. Persisted phases/offers/receipts, clocks, tutorial, codex, Chronicle and report sources are integrated; schema remains 6.
- B06 applies the existing PAC phase limits coherently to the local UI: all-fights playback plus a three-second result delay, 23-second recruitment with existing auto-pick, explicit pause and configurable auto-continue. Settings/background pause without refilling clocks; preparation/recruitment resume the last committed matching timer, while battles replay the immutable initial snapshot. Only optional save-envelope metadata/settings are added; domain outcomes, rewards, stage cadence and RNG stay unchanged.
- B05-A extends opt-in reporting only. Each visible shop offer and attempted equip can be explained from actual authority inputs/outcomes; reports bound rich examples while preserving legacy raw preparation shape. B05-B's extra XP rule and C's carrier affinity were evaluated separately, rejected and fully reverted. Default production policy, commands, RNG, rewards, item/form contracts and saves remain unchanged. No B/C tuning is production policy.
- B04 adds offline Voyage Chronicle, a bounded archive and non-authoritative playback, plus cosmetic profile/collection/achievements/records. Only completed local captain voyages count; imports never credit. Profile reset retains dedupe, and archived-record deletion does not resurrect it on resume. Pre-B04 resumes have partial coverage; incompatible content/config/schema disables playback. Active saves and gameplay remain separate.
- B03 adds a collapsible playback-only combat meter and clearer semantic source/target cues to live, spectated and planner battles. Offline original music starts after interaction with independent effects/music controls, mute and track selection. Legacy Energy events without a source remain usable and explicitly unattributed; no gameplay/content/save behavior changes.
- B02 adds offline Crew Tools to the main menu. Plan drafts/library/files live outside the active match; only validated isolated teams reach the unchanged simulator. Codex values use current content and shared item/unit/trait presentation. Production gameplay, saves, rewards, pool and adaptive bots retain their behavior.
- B01 changes final-result presentation only: complete last deployed crew, separate reserve, frozen form/equipment retention and deployed-only bonds. Optional `finalLineup` is reporting metadata; existing `finalCrew` ownership semantics and gameplay remain unchanged. Older saves show an unclassified roster instead of guessed battle/bench roles.
- P1B diagnostics add no default production behavior change. A supplied observer receives deeply frozen, detached end-of-turn facts from commands the unchanged bot policy already executed; the production-soak report includes diagnostics only with `--bot-diagnostics`. No observer data enters `MatchState`, saves, command decisions or RNG.
- PR #57 changes no production behavior after review correction. The rejected P1B target-level/XP-budget policy and its tests/version changes are fully reverted; GameContent remains `1.31.0` and schema 6. Its raw POST report is historical evidence, not production policy.
- P13 changes no production behavior or harness instrumentation. The raw 50-seed measurement and documentation are its only artifacts; GameContent `1.31.0` and schema 6 remain fixed.
- P12 replaces eight late-wave generic PvE presentations with named bosses and faction enemies and adds corresponding static/v2 assets and provenance, while preserving the established PvE combat profiles/rewards. GameContent is `1.31.0`; schema remains 6.
- P11 supersedes the P10 round-10/20 PvP fallback with immediate non-combat Voyage Recruitment. Each living player chooses one of three distinct reserved cost-4/cost-5 offers (cost-3/cost-4 fallback only if needed); bots use existing scoring. No battle, damage, streak/history/result or item reward occurs. A full-bench non-combining choice converts to its normal gold cost. Choice advances to R11/R21 preparation; schema-6 legacy PvP checkpoints reconcile once. GameContent is `1.30.0`; schema 6.
- P10's other stage cadence and reward delivery remain unchanged: PvE 40 grants three distinct non-trait completed items on victory, including terminal victory; PvP 5/8/11 grant a living-player component choice regardless of result; R1/3/9 grant one component, R19 two, R2/14 offer one of three, and R24/28/32/36 offer completed-item choices. Existing carousel rounds/mechanics and seeded item-choice behavior remain.
- P9 adds Killer (2-cost Supernova/Swordsman), Buggy (3-cost Emperor/Warlord/Captain), Capone Bege (4-cost Supernova/Captain/Marksman) and Whitebeard (5-cost Emperor/Captain/Guardian) through existing Physical/Special, area, Pierce and Knockback data. The production roster is 34 at `6/8/7/8/5`; trait definitions/effects, shop odds, pool constants, economy, bots and combat RNG are unchanged. Schema-6 loads add only absent current-definition pool keys at their cost's full pool count; present zero/custom counts and unknown keys remain untouched. GameContent is `1.28.0`; schema remains 6.
- P8 Captain damage now equals `max(1, ceil(round / 4) + living winner survivor count)` for a resolved winner and zero for a draw. Each qualifying survivor contributes exactly one regardless of star or other properties. PvP losers and real players losing to ghosts take the result; ghost owners remain unmodified; PvE losses use the same formula. Recent battle values reflect the new exact damage. GameContent is `1.27.0`; schema remains 6 and historical saved battle records are not rewritten.
- Presentation only for P7: every production crew/PvE definition now resolves to a distinct local static asset and preferred v2 atlas, while item, trait, status and form surfaces render their manifest-backed SVG identity with accessible text/glyph fallback. Board animation loading remains current-board/visible-content driven; new crew support is v2-only. Combat, economy, bots, content values, stage behavior, deterministic RNG and schema 6 are unchanged.
- P6 secondary Counterstrike/Volley damage no longer grants victim damaged-Energy. One primary basic now aggregates direct Guardian/Brawler reactions once per actual damaged recipient, including Bodyguard cover, in stable ID order; covered damage still advances Marksman while its volley retains the original selected target. Navy/Emperor tick-zero Shields emit normally but do not inflate Bombardier's runtime-Shield meter; Guard Point and other in-combat Shields still count. Trait semantics explicitly announce current, active and next thresholds or maximum tier.
- P6 replaces production traits' implicit all-team stat application with explicit tier scope: Straw Hat, Emperor and Captain remain crew-wide; Navy, Warlord, Supernova, Brotherhood, Revolutionary, Brawler, Swordsman, Marksman, Specialist and Guardian affect holders only. All 13 traits now expose their approved deterministic start/cast/dodge/direct-hit/kill/death/attack identities through existing combat authorities. Effective persistent form and trait-grant-item membership applies identically; Phoenix resets per-unit P6 runtime without replaying start effects or team-consumed triggers. Trait details now state threshold, scope, static effects and dynamic behavior semantically. GameContent is `1.25.0`; schema remains 6.
- P5 adds completed-item carousels at 22/27/34 with distinct seeded choices, late count `min(10, max(6, living + 4))` and at most four trait grants. PvE rounds 24/28/32/36 field the new Vice Admiral, Cipher Pol Agent and Seraphim archetypes and award victorious players two guaranteed non-trait completed choices plus one distinct completed choice. Early component rewards/carousels, row-major PvE placement, match flow and `acquirableItemIds` remain unchanged. GameContent is `1.24.0`; schema remains 6.
- P4C adds ten typed trait-grant completed items. Effective traits combine the resolved persistent form/native traits with equipped grants, dedupe within a unit and still count distinct base definitions only; bench holders do not contribute. Direct redundant grants fail with `ITEM_TRAIT_DUPLICATE`, while redundant craft/merge results return to inventory without deletion or auto-crafting. Merge retention excludes form/native-redundant grants before final cap allocation and backfills the first remaining valid completed items, then at most one component. Normal PvE/carousel rewards use the stable ten-component pool; bots craft recipes at cap, reject illegal direct duplicates/redundant grants during scoring and continue processing legal inventory. Recipe/grant metadata, selected-holder previews, semantic associated recipe details, focusable non-activating `aria-disabled` items, ten component glyphs and generic non-sheet bounty presentation complete the accessible production flow. P4 is complete; GameContent is `1.23.0`, schema remains 6.
- Resurrecting Phoenix Feather units now count as occupied only for board-space reservation. Ordinary movement, Lunge, Knockback, Pull, Smoke-Star Escape and simultaneous end-of-tick movement cannot enter their coordinate during the two-second delay; targeting, damage, healing and action eligibility remain `alive()`-based and unchanged.
- P4B7 completes the remaining 12 non-trait core identities. Grimoire adds per-Special-hit Burn/Special-Defense reduction; Miracle provides one post-Shield Protect threshold; Chest resolves up to two deterministic battle-only non-trait items; Smoke adds one low-health Blind/Paralysis/shield escape; Phoenix provides one delayed baseline resurrection; Banquet/Reversal transform supported combat stat deltas; Mera doubles star-scaled base Attack through that helper and self-Burns; Bombardier explodes from runtime Shield gained; Bodyguard intercepts adjacent lethal damage; Nullification blocks casting and converts AP/Energy to attacks; Efficient applies horizontal multiplicative Max-Energy reduction. All 45 non-trait completed outputs now have mechanics; GameContent is `1.22.0` and schema remains 6.
- P4B6 adds the 12 locked defense/control/retaliation identities. Rune Protect blocks only Stun, Burn application, Wound and timed resistance reduction; Razor halves current Defense/Special Defense before its successful hit; Pads double post-reduction damage entering Shield with HP overflow and suppress retaliation; Helmet preserves Crit identity but removes bonus damage per target; Doll adds post-resistance non-True reduction and nearest-tie basic priority; Lens reflects only resistance-blocked Special damage; Barb retaliates against adjacent attempts and Wounds. Sea Prism Stone is now exactly +40 Special Defense with half Burn ticks. GameContent is `1.21.0`; schema remains 6.
- P4B5: Healing Bubble heals its Chebyshev-adjacent living team area every 2 seconds and converts adapted overheal to Energy; Armament Sash grants a raw-primary-damage Crit shield; Impact Dial adds dodge-surviving target-Max-HP Physical damage; Den Den Mushi chains every third attempt; Ricochet Dial performs one Luck-adjusted component bounce; Armament Wraps stacks Attack/Defense/dynamic attack speed every second positive damage event; Advanced Armament Orb converts 25% of normal attack damage to True before Impact Dial. Armament Wraps and Den Den Mushi intentionally adopt their PAC stat identities. GameContent is `1.20.0`; schema remains 6.
- P4B4: Cola Reservoir restores 22 Energy after the first cast, 24 after the second, up to 90; Star Shield Dial grants 50 post-cast Shield. Observation Haki Mantle enables Ability Crit and grants +50 Crit Power only for a natively critical battle-start ability. Healing Dial heals rounded-up 33% of actual damage to others per application, including shield damage and attributed burn.
- Clima-Tact now gains +5 AP/+5 Energy every second; Jet Sash grants +45 Shield/+10% static attack speed and +20% dynamic attack speed every three seconds; Cola Engine grants +10 AP/+10% static attack speed and +5% dynamic attack speed after each basic-attack attempt; Shark Tooth Charm grants +21 Attack/+15 starting Energy and +5 Energy per attack plus +15 on that attack's kill; Energy-Siphon Scope grants +15 starting Energy/+25% Crit Chance and transfers up to 10 Energy on a critical basic attack. Periodic and attack-time Speed gains are battle-local and cumulative; Energy retains the 100 cap. Clima-Tact and Cola Engine intentionally change production combat as feature ports, not tuning.
- All ten components now apply their locked battle stats while held. Devil Fruit Codex grants +100 AP; Black Blade grants +50% Crit Chance/+9 Attack; Sniper Goggles grants +2 Range/+15% Crit Chance/+3 Special Defense; Meat Platter grants +300 Max HP plus 20% final-starting-Max-HP shield; and Lucky Pirate Ribbon grants +45 Shield/+50 AP/+20 Luck/+15% Dodge. Percentage starting shields are summed and applied once after static items and traits. Black Blade, Meat Platter and Sniper Goggles intentionally change production combat as approved PAC ports, not tuning. Acquisition, Gear 4 catalysts, deferred legacy items, schema 6 and normal preparation behavior are unchanged.
- The combat domain supports Physical damage against Defense, Special damage against Special Defense, and shield-first True damage without resistance. Absent Special Defense falls back to Defense; existing direct abilities default to Special and burn is Special. Item Defense and Special Defense are independent, while legacy trait Defense remains dual-resistance. Sea Prism Stone explicitly carries equal bonuses to both channels; P4B5 supersedes Armament Wraps' temporary matching-resistance compatibility with its final Defense-only PAC identity. Crit Power defaults to 200%, Luck adjusts existing seeded probabilities, and Ability Crit is opt-in with one shared cast result.
- GameContent `1.16.0` defines ten zero-effect components and the approved 55 completed recipe outputs. Equipping a second component crafts deterministically even at cap, replaces the held component in place, and returns duplicate results to inventory; direct completed duplicates now fail with `ITEM_DUPLICATE`. Unit merges retain distinct completed items before at most one component and return duplicates/excess without auto-crafting. Normal PvE/carousel acquisition and RNG remain restricted to the unchanged legacy eight-item order; existing legacy effects, selling, forms and schema 6 remain intact.
- None for the P4 item-system audit. It locks an architecture direction and changes no inventory, item, combat, acquisition, bot, persistence, content or presentation behavior.
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

- B11: PixelLab remains unavailable, so missing raster poses use the same accepted B10 frozen image_gen/local-curation process. Eleven native-vector motion drafts were rejected for flat appearance and retained as clearly excluded working-source evidence; production uses shaded pixel bodies with their existing palette/marks/equipment. Automatic approval review declined optional source deletion because of irreversible-loss risk; retention avoids that risk and does not block delivery.
- B10 tool deviation: PixelLab is not exposed and plugin search found no provider. Used one referenced built-in image draft per identity plus local curation/export, with actual unexposed model/seed limitations recorded. New bodies are AI-assisted derivatives, not original rips. Checks/normal CI were explicitly approved on 2026-11-11. Windows verification required a workspace temp cache and host access for the local browser server; no project test/workflow was disabled. B11/B12 are not started.
- Normal CI additionally exposed the inherited B08 weather disclosure under the rail; fixed only its scoped CSS, plus the Food badge's related HUD overlap. No gameplay/content/hash/metric/timeout/assertion change. Existing full-voyage assertions were retained through an unchanged isolated retry. Final CI result remains on the exact-head PR checks, not inferred from earlier green steps.
- B09 verification was explicitly approved after the unverified source handoff. Corrected four inherited B08 test foundations exposed by the one full run: 12 status assets, reachable frozen-heal fixture and hash-anchored historical P9 control. Historical hash and current Kuzan assertions remain strict; no B08 gameplay change. No tests/workflows disabled. No second full local suite or separate aggregate; final complete coverage is delegated to normal CI as approved.
- B08 verification/publication gate is intentionally deferred after the owner's explicit refusal. No tests/CI were disabled or assertions relaxed. The existing B07 trace is retained as a complete hash-verified control specification, alongside current-content observer equality, rather than inventing an unexecuted new trace or rerunning a production report. No B08 PR is opened while CI execution lacks permission.
- No B07 scope deviation. PAC timing is direct; normal-price starter, authored origin routes and two-NPC catalog are explicit local adaptations. The low-level prepared `createMatch` API remains compatible while actual client/harness use `createVoyage`. Browser-found skip click interception is fixed without force-clicks, relaxed assertions or gameplay changes. Host npm shim requires installed Node/package entrypoints as in B06.
- B06 uses the owner's explicit PAC timing direction; the existing 20–30-minute paced estimate is not redefined or presented as measured human playtime. Existing domain times already match, so no domain/content/version change was necessary. Local verification was run only after explicit approval. React ref timing and accessible-label regressions found during verification were corrected without weakening checks.
- B05 followed its separate approvals: A merged green, then one B and one C evaluation were approved and run independently. Each failure triggered the required behavior/version/test revert, preserving each immutable POST; no iteration or production tuning followed. C's full candidate suite passed without timeout; B's earlier unrelated asset timeout was not hidden or relaxed.
- No B04 scope deviation. Complete replay uses resolved battle events/snapshots and latest per-phase crew/offer checkpoints, rather than adding a command/event-sourcing layer. The first new browser test's select lookup was corrected to the accessible combobox role; no existing assertion changed. The owner separately authorized integration of all current Batch branches after completion.
- No B03 product deviation. B02 PR #60 was still open, so B03 is a stacked review branch rather than merging B02 without instruction. Browser tests found and fixed a stale-crew reset closure; new test selectors were corrected without weakening existing assertions. An outdated failed run was stopped before the corrected 8/8 run. No external audio or additional form clips were necessary after locking the existing-asset inventory.
- None for B02 scope. Initial browser checks exposed an early keyboard-entry readiness gap and unsuitable selectors in the newly authored tests; readiness was fixed and selectors use actual accessible combobox roles/explicit coordinate values. All intended cases then passed. The existing Windows Playwright teardown issue was resolved by stopping only the verified owned server. No existing assertion was weakened and no dependency was added.
- None for B01 product scope. The host's npm shim still targets a missing roaming CLI, so installed Node/package entrypoints run verification. The known Windows Playwright teardown hung after 8/8 assertions; stopping only its verified Vinext server allowed a successful exit. The frozen last deployment and the end-of-voyage bench are explicitly different instants; displayed totals describe cards/equipment, not a new ownership metric.
- None in product scope for P1B diagnostics. The first full-suite attempt exceeded Vitest's default five-second timeout only in the newly added test that runs two production matches; that test's timeout was narrowly set to 20 seconds and the focused and full suites then passed. No production behavior or E2E assertion changed.
- P1B candidate was rejected in review because its high-cost-access objective failed. The branch was intentionally converted to documentation-only instead of retuning; no additional soak or second candidate was run.
- None for P13. Exactly one 50-seed official baseline was run and no balancing, bot heuristic, content/config, save, stage, RNG, combat, economy, harness, or gameplay change was made.
- None for P11. The global `npm` shim was broken locally, so equivalent installed Node package entrypoints ran the authorized checks. No 1,000-seed soak, new baseline, portal mechanics or tuning was added.
- P10's POST 1,000-seed audit and final CI-equivalent local rerun were stopped at the user's explicit request. The prior 50-seed PRE/POST item comparison measured the initial, now-superseded 10/20 topology; no new large baseline is generated for this correction. No unit/trait/item-value, bot-heuristic, captain-damage, combat, shop/XP/pool, persistence-schema, asset or balance tuning was added. No Voyage Choice or Portal Carousel implementation was started.
- None for P9. Exactly four units and the required narrow save backfill were added; no trait tier/effect, existing unit, item/form, bot, economy, captain-damage, stage, metric, schema, RNG, dependency, tuning, baseline or 1,000-seed soak changed. The four complete licensed-reference PNGs are explicitly retained as their editable source instead of fabricating failing LibreSprite conversions.
- None for P8. The locked divisor/formula was not changed after measurement; exactly two authorized 1,000-seed runs were performed, with no candidate iteration, bot/unit/item/trait/economy/P5/P6 tuning, stage/start-HP/timeout/draw/pairing change, P9 work or P11 baseline.
- None for P7. No gameplay/domain behavior, item/trait/form value, bot/economy/captain-damage logic, RNG, save schema, dependency, P8 work, tuning, baseline or 1,000-seed soak changed. The first Browser E2E run exposed missing SVG image namespaces; the deterministic generator, validator and regression contract were corrected before the final 22/22 pass.
- None for the PR #49 review correction. No trait values/scopes, item values, P5 content, unit data, bot/economy/captain-damage behavior, version, schema, RNG, dependency, P7/P8, tuning, baseline or 1,000-seed soak changed.
- None for P6. No threshold, unit trait, item value/acquisition, stage, economy, captain damage, bot weight, unit balance, schema, dependency, P7/P8 work, baseline or 1,000-seed soak was changed or added.
- None for P5. No stage 40, extra item-pick round, portal/town/gift system, P6 work, new item/mechanic, bot tuning, economy/captain-damage/unit balance, final art, schema migration, baseline or 1,000-seed soak was added.
- None for the PR #47 review correction. No item mapping/value, trait tier, acquisition/cadence, P4B mechanic, Gear 4 catalyst, form identity, schema, tuning, dependency, P5/P6, final art, baseline or 1,000-seed soak changed.
- None for P4C. No P4B item behavior/value, trait tier, gameplay cadence, Gear 4 catalyst, save schema/ID, metric, tuning, new dependency, authored final-art pack, production baseline or 1,000-seed soak was changed or added.
- None for the PR #46 review correction. No item value/contract, `alive()`/`battleActive()` semantics, targeting, RNG, content, schema, acquisition, P4C, tuning or 1,000-seed soak changed.
- None for P4B7. No trait-grant mechanic, new trait, generic status/event/lifecycle framework, component acquisition, item UI/bot/P4C work, tuning, schema change, baseline or 1,000-seed soak was added. Browser E2E is left to CI as scoped.
- None for P4B6. No generic status/lifecycle/event/retaliation framework, unavailable Sleep/Locked/Poison/board-effect system, additional item family, acquisition/UI/bot work, P4C, tuning, schema change or 1,000-seed soak was added. Browser E2E is left to CI as scoped.
- None for P4B5. No additional item identity, generic event/status framework, acquisition/UI/bot work, P4C, tuning, schema change or 1,000-seed soak was added.
- None for P4B4. No additional item family, acquisition/UI/bot policy, P4C, tuning or soak work.
- None for P4B3. No other item behavior, generic event/lifecycle framework, battle-time removal, acquisition/UI/bot work, P4C, tuning, schema change or 1,000-seed soak was added.
- None for P4B2. No other completed-item behavior, generic trigger framework, acquisition/UI/asset redesign, bot optimization, P4B3/P4C, schema change, tuning or 1,000-seed soak was added. Existing generic item scoring naturally reflects the approved Black Blade and Sniper Goggles static-value changes; both new effect kinds remain neutral-scored.
- None for P4B1. The only production data additions are matching Special Defense on Sea Prism Stone and Armament Wraps to preserve historical resistance; no component assignment, completed PAC behavior, triggered effect, acquisition, screen flow, asset, bot strategy, P4C work, tuning, schema change or 1,000-seed soak was added.
- None for P4A. No combat primitive/effect, component stat, component acquisition, UI/asset work, bot strategy, tuning, schema change, P1B or 1,000-seed soak was added.
- None for the P4 audit. Research stayed on the pinned PAC core craftable matrix and targeted local item paths; no implementation, value, version, schema, metric, artifact or simulation was added.
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

- B11 artistic acceptance depends on contact sheets and actual board review; hashes prove distinct/reproducible drawings, not anatomy. Exact provider model/seed are unavailable; only the pinned local export is reproducible. Short faithful original clips retain documented source limits. Normal PR CI is still required.
- B10 passed the approved local technical checks and both browser sizes; owner acceptance of identity/choreography/style is still open. Only the frozen local export is repeatable; image generation exposes no model/seed or identical-regeneration guarantee. Legacy Koala/Kaido assets remain available. Killer/Caesar/Pica and three other form bodies remain B11 work, not approved by B10 metadata. Remote CI is independently reported on the exact PR head.
- B09 local blockers found during verification are corrected; normal CI remains the PR integration gate (live checks linked above). Food intentionally changes harbor choice composition and affected combat strength; no aggregate or balance/duration conclusion is available. A meal follows an instance ID, so selling/benching/merging away that instance forfeits it; the UI explains this before use. Previous content-hash replays remain exportable but incompatible, as before. Build retains existing nonfatal chunk-size/static-route classification notices.
- B08 is unverified: compilation, regression behavior, browser presentation and asset validation have not been established by checks. Source/asset generation must not be reported as PASS verification. The next step requires a new owner instruction permitting the deferred checks; no balance/duration conclusion follows from the candidate.
- B07 adds up to 171 seconds of explicit choice budgets at eight living captains, before early choices. Reported legacy clock estimates exclude these and label the separate added budget; no human-duration or balance claim follows. New harbor acquisition is intentional, but no aggregate/baseline was requested or generated. Legacy saves never receive retroactive current-round starter/harbor choices; old content-hash replays remain explicitly incompatible.
- B06 clocks resume the latest committed application checkpoint; abrupt termination can lose an in-flight periodic/visibility write. Legacy/mismatched clock metadata uses the full phase budget, and battle resume intentionally replays from the start. Visual-option/speed changes retain the existing replay-reset behavior. The 20–30-minute scenario remains an estimate; exact PAC phase limits do not establish a measured human session duration.
- B05-B confirms that the 534 historical opportunity snapshots did not establish benefit. The rejected POST has cost-4 player/final presence 259/429→262/439 but cost-5 102/128→88/102; L8 reach 342→336, L9 unchanged at 91. Fifty seeds are directional and do not isolate the downstream mechanism. Current item scoring leaves some scalar/passive affinities unvalued; no outcome-backed C policy, form guarantee or second progression candidate follows automatically. Smoker remains frozen/watch.
- B05-C's controlled carrier cases pass, but cost-4/5 player representation falls 259/102→249/93 and cost-5 final presence 128→111 in its one POST. This rejects that approved candidate under its gates; it does not prove that ignoring Special Defense is optimal or justify item/unit/form tuning. The unvalued-affinity observation remains; rich PRE carrier receipts are unavailable, so a population improvement rate must not be invented.
- B04 is bounded to ten archive entries / 96 MiB and one 32 MiB draft; oldest archive entries are evicted without erasing profile credit. A 10,000-ID credit ledger prevents duplicate credit, including after resets; quota/format/storage failures are surfaced while gameplay continues. Abrupt shutdown can lose an in-flight same-phase checkpoint (two-second throttle); pre-B04 history cannot be reconstructed. Local imports/backups are not anti-cheat or public records. A future build with different content/config requires its own compatible viewer rather than replay re-simulation.
- B03 contributions intentionally stop with interrupted/skipped playback and are not archived across screens; a future B04 archive is separate. Old battle logs cannot reconstruct an unrecorded drain source or passive-shield source. Browser autoplay may require a fresh interaction after focus; audio never gates combat. B02 must be integrated before retargeting the stacked B03 PR to main.
- B02 imports require the current content version; incompatible/corrupt plan libraries are reported without overwriting stored bytes. Drafts must be explicitly saved before leaving the tool. Combat tests are isolated authored setups, not evidence for economic/bot balance. No blocking B02 issue remains after local verification.
- B01 legacy saves cannot recover an exact deployment if it was never recorded. The UI labels this gap rather than inferring a lineup or bonds; it also handles legacy battle logs without frozen item arrays. No gameplay defect or balance conclusion is inferred from this presentation work.
- P1B diagnostics rule out the roster-size guard as the measured progression bottleneck (0 stops in 12,241 preparations). XP stops were reserve-limited 58.9% and budget-limited 36.5%; all 400 players reached L7, but only 342 reached L8 and 91 L9. Cost-5 offers appeared in 3.6% of eligible shop slots and 32.2% of eligible preparations; personality offer-to-buy conversion varied from 8.5% to 55.1%. The observer does not distinguish affordability, reserve, receive/replacement legality, scoring or competing-purchase reasons for a skipped visible offer, so another policy must not be selected from conversion totals alone.
- The rejected P1B candidate passed its original stability gates but failed its objective: cost-4/5 player-board presence fell 259/102→178/54 and final-board presences fell 429/128→274/68, while Nami/Robin presence rose 164/153→180/157. The existing reports lack intermediate level/roster traces, so a targeted bot-progression diagnostic is required before another candidate. No production tuning follows from this historical experiment. Smoker remains frozen/watch.
- P13's 50-match report is directional evidence, not balance proof: all hard gates passed, but full-clock duration averaged 34.941 minutes versus the existing 20–30-minute target, while paced duration was 24.926 minutes. Frequent Nami/Robin final-board presence with below-band conditional results and low observed 5-cost offer frequency are P1B investigation candidates, not automatic weight or unit-value changes. Gear 4's zero observed transitions rests on only four 3★ Luffy final boards. The recorded P12 asset permission attestations do not independently establish chain of title; rights review remains necessary beyond the existing recorded scope.
- P11's historical 50-match smoke is crash/regression evidence only, not balance authority. PR #54 is merged; Smoker remains frozen/watch.
- P10's old 50-seed POST item-economy averages include the removed 10/20 stages and do not describe the corrected PR. They remain historical evidence only, not tuning authority. Normal GitHub CI must complete before review/merge; Smoker remains frozen/watch.
- No blocking P9 defect remains. The first Browser E2E full run had one isolated 1280 full-voyage transition timeout; its focused rerun and the subsequent complete run passed. The 50-match smoke is crash/regression evidence only and is not balance authority. Imported asset redistribution remains bounded by the recorded owner attestation and requires separate rights review for any broader use.
- No hard P8 gate failed. POST first elimination moved 2.434 rounds later and stage-36 reach increased 11.0 percentage points; average rounds changed only -0.69%, timeout/draw were materially stable, and the sole PvE damage event was 8 damage. These are review observations, not tuning authority. Smoker remains frozen/watch.
- No blocking P7 defect remains. The 12 imported crew reference sheets retain their recorded third-party source-page permissions and hashes; any distribution beyond those permissions requires a separate rights review. Generated runtime/QA files are deterministic, but external reference provenance must remain with the assets.
- No blocking P6 issue found. Dynamic behavior remains intentionally absent from bot valuation; bots continue using existing structural affinity and active-trait counts. The 50-match smoke is regression evidence only and must not be used for tuning.
- No blocking P5 issue found. The three new PvE archetypes intentionally share the existing placeholder until the post-P6 asset pass. The 50-match smoke is regression evidence only and must not be used as balance evidence.
- P4 is complete with no blocking integration defect found. Bots now understand recipes, cap legality and trait redundancy, but conditional combat identities remain valued only through existing static/structural signals; no tuning was authorized. Final authored item art remains scheduled after P6.
- Decision support and bots remain intentionally structural: recipes, cap legality, resolved traits and static item effects are understood, while delayed/conditional combat triggers are not assigned new tuning weights. That is a future measurement/tuning concern, not an incomplete P4 production rule.
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

- 2026-11-11 — Owner's explicit B10 squash/B11 instruction accepts the B10 pilot/style contract for series completion: keep Koala/Kaido/Demonio masters, source-first curation, frozen local exports and separate body/FX. No new style/provider experiment or automatic B12 work.
- B09 separates consumable stock/meal facts from equipment, recipes and profile item collection. Freeze a meal once before pairings and reuse its immutable battle identity; no combat RNG draw or duplicate stock/reward mutation during replay/regeneration. One replaced harbor option and the existing price avoid adding reward stages or currency. Schema 6 uses additive empty defaults; saved legacy offers are never regenerated.
- B08 uses four fixed status counters/plain helpers and explicit authored PvE environment data; no generic status/event framework or weather-voting infrastructure. Neutral is the default; no environment RNG draw. Only four documented ability changes and three PvE environments are authored. Fields, actual status end facts, schema-6 additive backfill, planner/Chronicle/observer integration are part of the same candidate. Content 1.33.0 / schema 6; verification remains explicitly withheld by the owner.
- B07 uses normal-price cost-1 starters (5 initial gold → 4 + one recruit), not extra opening resources. Keep `createMatch` for compatible prepared states; production uses `createVoyage`. Route focus seeds at most two slots before open-band fill; primary cost scarcity precedes existing lower-band fallback. Usopp gifts / Franky 2-gold components use authored fixed slots, free skip, existing bot scores/reserve and existing assets; no XP/healing/food mechanics. New fields are schema-6 additive; legacy saves never receive retroactive starter/harbor rewards.
- B06 adopts pinned PAC numerical phase limits, including a 23-second recruitment adaptation and three-second completed-round display; network clocks/frameworks remain rejected. Application deadlines issue existing authoritative phase commands; renderer completion is not authority. Clock metadata lives outside MatchState/schema 6. Offline pause, ready/skip and speed controls are explicit local adaptations; report formulas/target booleans remain unchanged.
- B05-A records actual guard evaluation: an unaffordable offer gets no fabricated reserve rejection, and rank uses the policy's frozen pass score. Item candidate-pair guards and iteration outcomes have different denominators. Receipts are detached/frozen JSON and never affect command selection. Reject both separately approved B/C candidates on their locked gates; preserve each committed measured source/report and restore production. Future candidates require separate approval. The old target-level experiment remains rejected, Smoker frozen/watch, historical reports immutable.
- B04 records presentation checkpoints/events outside MatchState, uses no new command or gameplay RNG, and reuses existing selectors/Phaser/B03 read-only. A separate IndexedDB transaction atomically archives completion and credits the local profile by stable voyage ID. Import provenance is assigned locally, never trusted from files; imported replays never count. Seven locked achievements are cosmetic. Discovered, owned, deployed and reached-form facts stay distinct; no public/online progression is implied.
- B03 meters consume dispatched presentation events only; effective HP/shield loss excludes overkill, healing excludes overheal, shield grants include unused shields, interception follows the actual recipient, and resurrection/form HP changes are not healing. Existing passive starting shields get no invented source. Optional Energy source attribution is reporting-only and schema-6 compatible. PAC meter/preferences principles are adapted without its server/store stack or remote audio.
- B02 uses production form reconciliation, distinct-definition traits and `simulateBattle` as authorities. PAC wiki/editor principles are adapted; its network/store/database/scenario stack is not imported. Team-plan format 1 and its 20-plan local library are independent of MatchState/schema 6. Disposable renderer state never enters the local session or IndexedDB voyage persistence.
- B01 preserves the original frozen battle-start crew even after legal battle-time merges, and snapshots the reserve before elimination clears it. `finalCrew` keeps its historical all-owned meaning. The optional presentation field needs no schema/version bump; old saves remain unknown rather than backfilled with fabricated deployment data.
- P1B measurement uses one optional observer on the real bot-turn authority. It is disabled by default, receives detached deeply frozen facts only after existing actions execute, and cannot add RNG draws, commands, state/save fields or control flow. The diagnostic identifies reserve/budget-limited upper-level progression, narrow cost-5 exposure and personality-dependent conversion as review inputs, not an automatic tuning prescription.
- The first P1B target-level/XP-budget candidate is rejected and not production policy. Its report remains immutable historical evidence. A targeted diagnostic must precede any separately approved replacement candidate; there is no automatic bot, unit, item, economy, or Smoker tuning.
- P11 adapts PAC's round-10/20 non-combat portal slots into local Voyage Recruitment, not PAC Portal Carousel. Offers are separate persisted state and explicit shared-pool reservations; serialized RNG, existing bot scoring and schema 6 remain authoritative. No networking, new roster or item system was introduced.
- P10 superseded P5's optional `rewardItemKind`/`itemChoices` stage fields with a narrow explicit `itemReward` and separate `carouselItemKind`. Its fixed PvE/carousel schedule and reward modes remain; local 5/8/11 item-only supply choices are adapted. Its historical round-10/20 default PvP fallback was superseded by P11.
- P9 keeps roster expansion content-driven and reuses existing typed traits/combat fields. Save compatibility uses own-property presence on `pool`: only missing current-definition keys receive the existing full cost-band pool count, preserving explicit zero/custom counts and future keys. The four P9 licensed-reference PNGs are the retained editable sources; runtime atlases and static identity assets remain offline deterministic derivatives recorded by matrix and SHA-256.
- P8 keeps one pure Captain-damage authority in `game/matchFlow.ts` and explicitly passes round from PvP/ghost/PvE result construction. PAC round-plus-survivor topology, one point per ordinary survivor, no star multiplier and draw-zero semantics are direct; `ceil(round / 2)` is adapted to `ceil(round / 4)`. Spawn/Inanimate exclusions remain reference-only; Double Up/backend/network/Pokémon passive/mission systems are rejected. Diagnostics remain production-harness-only and cannot influence gameplay.
- P7 keeps presentation authority in explicit local manifests: deterministic content IDs map to static/v2, item, trait, status and form assets; unknown or failed assets retain semantic glyph/text fallbacks. Only currently visible board definitions and choice assets are loaded. Third-party sprite sheets remain traceable source inputs, while project-owned generators produce derived atlases, SVG families, editables and QA artifacts without affecting gameplay state or RNG.
- Primary-basic direct reactions use a private per-bundle recipient collector shared through Bodyguard recursion, then resolve once per recipient in ID order; ability hits remain immediate per hit. Damage and Shield options narrowly suppress secondary-trait damaged-Energy and tick-zero P6 Shield metering without changing central formulas or defaults.
- P6 keeps `getActiveTraitEffects(...)` compatible and adds serializable scoped effect/behavior grants. Production tiers explicitly select `team` or `holders`; holder authority is `getEffectiveUnitTraits(...)`. Typed content contains data only, while narrow combat switches attach behaviors to existing start, dodge, damage, cast, kill and death authorities in explicit order. Runtime and counters are battle-local, add no P6 RNG draws and never enter `MatchState`; schema remains 6.
- P5 uses optional serializable `StageDefinition.rewardItemKind`, defaulting to components. Late PvE derives completed rewards directly from typed item content with exactly two seeded shuffles per rewarded player; late carousel uses one seeded shuffle of stable distinct completed IDs and skips trait grants after four. Existing carousel sessions, PvE placement, bot scoring, P4 component acquisition and schema 6 remain authoritative. PAC stage 40, portals, towns and additional picks remain intentionally omitted.
- P4C treats `grantedTraitId` as typed item content and derives effective traits from resolved form/native traits plus held grants. Distinct-definition counting and deployed-only activation remain authoritative. Redundant direct grants are illegal; redundant crafted/merged outputs are preserved in inventory, and merge cap allocation backfills from later valid candidates after form/native redundancy is known. Bot direct candidates must be command-legal, while duplicate/redundant craft results remain legal without holder-level behavior valuation. Focusable `aria-disabled` inventory items expose the reason and cannot dispatch equip; selector-derived item kind/effects/recipes/grants are associated semantic descriptions. Normal early acquisition is the stable ten-component pool, while legacy completed IDs remain valid for recipes, saves and Gear 4. Unknown/non-sheet bounties use generic icon/color presentation rather than an arbitrary legacy column. GameContent is `1.23.0`, schema remains 6, P4 is complete and final authored item art waits until after P6.
- Board-cell reservation uses a private combat-only predicate that includes living and resurrecting units; all ordinary target and action eligibility continues to use `alive()`, preserving Phoenix untargetability and inactivity during its delay.
- P4B7 keeps generated Chest items, one-shot consumption, statuses, Max Energy, Shield-gain meters and resurrection state private to deterministic combat. Chest consumes two seeded draws from stable non-trait candidates and freezes resolved battle item IDs in snapshots without persistent mutation. Combat stat deltas resolve Reversal inversion, Banquet amplification, then Nullification AP→Attack conversion at local ×3 scaling. PAC dish, stolen-buff and Flame-Orb Freeze clauses remain non-applicable because no host systems exist. All stable IDs, acquisition order, Gear 4 catalysts and schema 6 remain unchanged.
- P4B6 keeps all new state private to battle ticks. Horizontal start support is resolved after individual static items/traits and before dynamic-Speed baseline capture. Rune Protect is intentionally narrow; Razor is a timed non-mutating dual-resistance reduction; Lens uses the existing local mitigation curve; Helmet's Ability Crit negation is target-specific without rerolls; Sticky Barb scales the complete PAC retaliation result ×3. Sleep, Locked, Poison and board-effect clauses remain non-applicable. Sea Prism Stone intentionally replaces its temporary legacy stats with final Assault Vest identity.
- P4B5 adds flat HP-scale item damage at PAC ×3, while Green Orb overheal converts at 10% after local HP scaling. Basic attacks use one private Physical/Special/True bundle and fixed family order; item damage is non-recursive through `applyDamage`, Loaded Dice uses the existing seeded Luck formula, and only Blue Orb/Muscle Band receive private non-persisted counters. Armament Wraps keeps only Defense, not Special Defense, under its final PAC identity.
- P4B4 counts only resolved casts and applies item bonuses after complete ability resolution. Native Crit Power is battle-start-only. Shell Bell uses shield plus health damage, separately from unchanged health-only omnivamp; local Energy stays capped at 100.
- P4B3 keeps item behavior as five plain serializable metadata shapes with private battle-only counters. PAC full-interval periodic timing and every-attempt OnAttack semantics are direct; dynamic Speed is adapted as cumulative attack-speed percentage against the unchanged post-static interval, and local Energy remains capped at 100. GameContent is `1.18.0`; schema remains 6.
- P4B2 locks HP/Attack/Shield flat translations at PAC ×3; AP/Crit/Luck/Defense/Special Defense/Range/PP remain direct; PAC Speed maps 1:1 to local attack-speed percentage. Start-shield percentage is a narrow derived initialization primitive calculated once from final starting Max HP after static items and traits. GameContent is `1.17.0`; schema remains 6.
- P4B1 directly adopts PAC's Physical/Special/True categories, independent item Defense/Special Defense, 10% default Crit Chance, 200% default Crit Power, Luck exponent and one Ability-Crit decision per cast. It adapts them to the existing local mitigation curve and seeded RNG, explicitly rejects PAC's `ARMOR_FACTOR = 0.05`, leaves `BattleEvent.damageKind` unchanged and temporarily keeps legacy trait Defense dual-resistance. Sea Prism Stone and Armament Wraps receive matching Special Defense only to preserve their pre-split effective resistance.
- P4A keeps `EQUIP_ITEM` as the preparation-only authority, uses `minComponentId::maxComponentId` recipe keys, preserves all eight legacy completed IDs/effects, and isolates the current acquisition pool through `acquirableItemIds`. Merge handling is an adapted deterministic completed-first policy with at most one retained component and no merge-time crafting. GameContent is `1.16.0`; schema remains 6.
- P4 adopts the PAC core craftable architecture: ten components, all 55 unordered self-inclusive recipes, automatic second-component crafting, completed-item uniqueness and cap three. General behavior identities are direct; flat units/missing primitives, existing-trait candidates, names/assets/tooltips and local deterministic early acquisition are adapted. Post-20 cadence and later PvE are reference only; unrelated item families and backend/Pokémon-specific systems are rejected. Proposed trait-item mappings remain pending ChatGPT approval, and no non-obvious scaled value is locked.
- P3 Match Flow / Pacing selects Option 3: keep the current deterministic domain architecture and adapt selected PAC principles. Keep the phase graph, preparation timing, 45-second battle cap, carousel sequencing, early PvE rounds, ghosts, remaining-team-health timeout winner and current draw semantics. Same-round elimination ordering is corrected; P3B implements an ADAPTED PORT of global encounter-count/recency pairing with local seeded deterministic ties and asymmetric ghost scoring. Captain damage remains ADAPT LATER / MEASURE FIRST, and late PAC PvE/event cadence remains P4 REFERENCE ONLY. Future server multiplayer moves deadline authority server-side without changing domain rules.
- P2 Economy / Progression selects Architecture Option 1: keep the current deterministic authoritative finite-pool economy and treat values as the measurement baseline, not permanent locks. PAC liquid start values and normal interest/XP/odds/shop/buy/bench behavior are direct or adapted parity, but PAC also has a Stage-0 starter plus component opening grant; that cross-cutting difference and PAC's partial evolved-unit sell pricing are REFERENCE ONLY. No transactional defect requires implementation. Economy tuning waits for P3; per-unit pool scaling and full-refund selling remain KEEP / MEASURE.
- P11/P12 and P13 measurement are complete. The first P1B candidate was rejected; PR #58 completed the subsequent diagnostic. Any replacement policy still requires a separately approved decision based on those bounded, confounded measurements. Smoker remains frozen/watch.
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
- The base-roster expansion historically reached 30 units; P9 subsequently expanded it to 34 at 6/8/7/8/5 by cost. P6 superseded the original Emperor-tier values; current content is authoritative.
- The Character Form System foundation, Robin/Luffy/Chopper pilots and subsequent post-forms assessment are complete. P7 supplies their presentation assets.
- Character forms remain separate from stars and shop/pool identity. Robin and Luffy are persistent production pilots; Chopper is the first battle-temporary production pilot.
- All future Codex work must be bounded and branch/PR based.
- ChatGPT decides architecture and prioritization; Codex executes requested tasks.

## Next Recommended Task

Review the published B11 character/form/PvE presentation and its normal PR CI. B12 needs a separate instruction; no automatic next batch, gameplay/tuning or baseline work.

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
