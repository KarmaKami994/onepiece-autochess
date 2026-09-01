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

## Adapt Later

### Pairing

Classification: **ADAPT LATER**.

PAC globally optimizes complete eight-player pairing combinations using encounter count and recency. Current One Piece pairing is deterministic but greedy. A later bounded P3B change should adapt the global objective while retaining project-seeded deterministic tie-breaking. No pairing behavior changes in this PR.

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
- Pairing, captain damage, phase timing, cadence, draws, ghosts and battle duration are unchanged.
- No P4 content, bot tuning, analytics change or production soak is included.
- The sole next bounded task after review and merge is **P3B — adapt PvP pairing from the current greedy local selection to a global encounter-count + recency objective inspired by PAC, while retaining project-seeded deterministic tie-breaking**.
