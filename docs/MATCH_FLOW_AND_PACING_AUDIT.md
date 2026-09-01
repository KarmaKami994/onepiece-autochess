# Match Flow and Pacing Architecture Record

## Decision

Select **Option 3 — keep the current deterministic domain architecture and adapt selected PAC principles**. The phase graph, timing model and portable command/state boundary remain suitable for the offline product and future server-authoritative execution.

This record transcribes the locked P3 decisions. It is not a new architecture analysis. Pokémon Auto Chess references use only the official repository at pinned commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`.

## Keep

| Area | Decision | Rationale |
| --- | --- | --- |
| Phase graph | **KEEP** | The current deterministic preparation, battle, event and transition graph remains authoritative and portable. |
| Preparation schedule | **KEEP** | Current values are closely aligned with pinned PAC timing. |
| Battle cap | **KEEP — 45 seconds** | No duration change is justified. |
| Carousel timing and sequencing | **KEEP** | The item-carousel phase occurs before the fight of its round and is already a suitable deterministic PAC adaptation. |
| Early PvE cadence | **KEEP** | Current rounds `1 / 2 / 3 / 9 / 14 / 19` align with PAC's early PvE cadence. |
| Ghost semantics | **KEEP** | Existing deterministic ghost behavior remains suitable. |
| Timeout winner | **KEEP** | Continue resolving by remaining team-health percentage. |
| Draw semantics | **KEEP FOR NOW** | PAC differs, but draws were approximately `0.030%` in the prior exact production-soak harness and are not a priority. |

Late PAC PvE rounds and later carousel, portal and additional-pick content are **REFERENCE ONLY**. They cross into P4 Items / Treasure / Form Accessibility and are not implemented here.

## Pairing Adaptation and Deferred Captain Damage

### Pairing

Classification: **ADAPTED PORT**.

P3B replaces the local greedy selector with bounded global complete-round optimization. Alive players are stably sorted, deterministically shuffled, and exhaustively combined for the maximum eight-player population. The optimizer minimizes total historical encounter count, then maximizes total recency distance, then uses one project-seeded deterministic selection among exact optimal ties.

Real pair scores sum both players' directed histories. A ghost score uses only the real fighter's directed history toward the ghost owner, preserving the existing asymmetric ghost semantics. Every alive player participates exactly once as a real/direct participant; an odd population adds exactly one ghost matchup whose owner is another alive player. `lastOpponents` now retains the compact full real/ghost history rather than only three entries, while ghost fights still leave the owner's history unchanged. Existing schema-6 histories accumulate from their saved contents without reconstructing discarded encounters.

### Captain damage

Classification: **ADAPT LATER / MEASURE FIRST**.

One Piece currently deals `1 + sum of surviving unit stars`. PAC normal mode uses `ceil(stage / 2) + surviving normal-unit count`. PAC's stage-based late-game acceleration is a useful principle, but exact damage must remain unchanged until trustworthy pacing measurement exists.

## Change Required: Simultaneous Elimination

The former same-resolution elimination loop assigned placements from lexicographic player order. That was a correctness defect because participant identity could outrank gameplay state.

This PR applies an **ADAPTED PORT** of PAC's gameplay-derived ranking principle. After every result in the batch has applied captain damage, eliminated players rank best to worst by:

1. higher post-damage HP;
2. higher player level when HP is equal;
3. ascending stable player ID only when HP and level are equal.

For `N` players alive before a batch and `K` eliminations, the ordered batch receives the contiguous block `N - K + 1` through `N`. HP is captured for ranking before eliminated players are clamped to zero. Cleanup, pool/shop returns, final crew, winner detection and zero-survivor behavior remain unchanged.

## Timer Authority

Local client-driven phase timing remains acceptable for the offline product. Future server-authoritative multiplayer must move phase-deadline authority to the server while retaining the same deterministic domain rules. No server timer or networking work is included here.

## Existing Pacing Evidence

The last committed exact production-soak harness reported:

| Metric | Prior harness result |
| --- | ---: |
| Average rounds | approximately `33.774` |
| Average full-clock duration | approximately `33.455` minutes |
| Average paced duration | approximately `23.845` minutes |
| Timeout rate | approximately `0.812%` |
| Draw rate | approximately `0.030%` |

These values describe that prior exact harness only. They are not human-play or future-meta truth, and the known participant-population asymmetry must be corrected or intentionally specified before a new authoritative broad baseline. No measurement was run for this record.

## Scope Result

- Architecture remains Option 3.
- Same-round elimination placement is corrected.
- Pairing now uses the P3B global encounter-count/recency objective with seeded deterministic ties; combat, ghost damage/streak behavior and battle seeds are unchanged.
- Captain damage, phase timing, cadence, draws and battle duration are unchanged.
- No P4 content, bot tuning, analytics change or production soak is included.
- P3B is complete on its task branch and awaits review; this bounded implementation does not select another roadmap task.
