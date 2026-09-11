# P8 Captain Damage and Pacing

P8 replaces star-weighted Captain damage with deterministic round pressure plus one point per living winner survivor. The pure authority remains `calculateLossDamage(...)` in `game/matchFlow.ts`; PvP, ghost, and PvE result construction pass the current round explicitly. Damage is computed from frozen battle results before the existing simultaneous-elimination authority runs.

## Architecture classification

- **DIRECT PORT:** round/stage pressure plus survivor pressure; +1 per ordinary surviving combatant; no star multiplier; no winner/draw means zero damage.
- **ADAPTED:** PAC `ceil(round / 2)` becomes local `ceil(round / 4)` to preserve access to the P5 rounds 22–36.
- **REFERENCE ONLY:** PAC spawned-unit and Inanimate exclusions because the local combat domain has no equivalent Captain-damage entities.
- **REJECT:** Double Up damage, PAC room/backend/network architecture, Pokémon-specific passive logic, and player-damage missions.

PAC reference formula: `ceil(round / 2) + survivor count`.

PRE local formula: `1 + sum(living winner survivor star levels)`, with a minimum of 1 and zero for a draw.

POST P8 formula: `max(1, ceil(round / 4) + living winner survivor count)`, with zero for a draw. A survivor qualifies only when its team is the winner, its state is not `dead`, and its HP is positive. Cost, star, HP percentage, Max HP, items, forms, traits, definition, and shields do not otherwise affect Captain damage.

## Reproducible evidence

Both reports use the normalized eight-bot population and the identical seed range `production-0` through `production-999`. They are P8 control/comparison evidence, not the final post-system baseline; P11 owns that later baseline.

| Evidence | PRE | POST |
| --- | --- | --- |
| Formula | `1 + sum(stars)` | `ceil(round / 4) + survivors` |
| Measurement commit | `f4b1b40449b9d3984d2f1a1bc6aa538d810c8a72` | `dba043bba4bf12ff6681b189e0a955f313f3993e` |
| GameContent | `1.26.0` | `1.27.0` |
| Save schema | 6 | 6 |
| Raw report | `docs/analysis/p8-pre-captain-damage-1000.json` | `docs/analysis/p8-post-captain-damage-1000.json` |
| Report SHA-256 | `cfe1a0527298146e656b5e0bdf47f89092a5bd4a2b88659bb0e541dddcd3ddbb` | `0ce0bc301c05015860c92f17a5af0ae83368e40d0f2431e7b13cea034b3fcb1f` |
| Completed / crashes | 1,000 / 0 | 1,000 / 0 |

Exactly two 1,000-seed runs were performed for P8: one PRE control and one POST comparison. No candidate iteration or tuning run was performed.

## Same-seed comparison

| Metric | PRE | POST | Change |
| --- | ---: | ---: | ---: |
| Average rounds | 38.776 | 38.510 | -0.266 (-0.69%) |
| Min / max rounds | 30 / 56 | 33 / 47 | +3 / -9 |
| Average paced minutes | 26.034 | 26.126 | +0.092 |
| Average full-clock minutes | 36.895 | 36.920 | +0.025 |
| Timeout rate | 0.4202% | 0.4402% | +0.0200 pp |
| Draw rate | 0.0430% | 0.0425% | -0.0005 pp |
| Average Captain damage per loss | 8.944 | 8.554 | -0.389 |
| Captain damage p50 | 9 | 8 | -1 |
| Captain damage p90 | 14 | 13 | -1 |
| Captain damage p95 | 16 | 14 | -2 |
| Max single loss | 23 | 20 | -3 |
| First elimination average | 20.597 | 23.031 | +2.434 rounds |
| First elimination median | 21 | 23 | +2 rounds |
| Stage 22 reach | 100.0% | 100.0% | 0.0 pp |
| Stage 24 reach | 100.0% | 100.0% | 0.0 pp |
| Stage 27 reach | 100.0% | 100.0% | 0.0 pp |
| Stage 28 reach | 100.0% | 100.0% | 0.0 pp |
| Stage 32 reach | 96.3% | 100.0% | +3.7 pp |
| Stage 34 reach | 91.1% | 99.7% | +8.6 pp |
| Stage 36 reach | 72.8% | 83.8% | +11.0 pp |

This is a deterministic same-seed comparison of the two recorded builds. It does not establish causality beyond the Captain-damage rule change held between those builds.

## Diagnostic definitions

A match reaches round N when normal progression enters N with at least two living players before that stage resolves. A completed match is not counted merely because its terminal transition could mathematically increment the round. Eliminations are counted after Captain damage is applied; all players eliminated in the same round count, while the last living winner does not. Damage p50/p90/p95 and the first-elimination median use deterministic nearest rank over sorted values.

POST recorded one PvE Captain-damage event for 8 damage among 91,742 total damage events. This and the later first-elimination shift are observation signals only; neither authorizes an automatic system or balance response.

## Hard sanity gates

| Gate | POST | Required | Result |
| --- | ---: | ---: | --- |
| Complete matches | 1,000 / 1,000 | 1,000 / 1,000 | PASS |
| Crashes | 0 | 0 | PASS |
| Average paced duration | 26.126 min | 20–30 min | PASS |
| Stage 22 reach | 100.0% | >= 50% | PASS |
| Stage 24 reach | 100.0% | >= 40% | PASS |
| Stage 28 reach | 100.0% | >= 20% | PASS |
| Stage 32 reach | 100.0% | >= 5% | PASS |
| Stage 34 reach | 99.7% | >= 2% | PASS |
| Stage 36 reach | 83.8% | >= 0.5% | PASS |

P8 changes no stage, combat, item, trait, form, bot, economy, start-HP, timeout, draw, pairing, reward, or PvE-stat rule. Smoker remains frozen/watch. P9 is not started.
