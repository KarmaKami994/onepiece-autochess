# B08 — Status, weather and board effects

Status: locked implementation contract for the owner's requested B08 batch.
Base: B07 squash merge `d70b3c1d1aed0013edcfaf92122757367fdffbb9` / PR #69.
Branch: `codex/b08-status-weather`. Current production: content 1.32.0, schema 6.

## Bounded content

| Mechanic | Exact rule | Reachable source |
| --- | --- | --- |
| Poison | 1% Max HP per stack each second, three-stack cap, 3-second duration. Reapplication adds a stack and extends expiry without postponing the next tick. True damage through existing Shields/Protect; no damaged-Energy or Crit. | Magellan's existing PvE ability at R24, in addition to its unchanged damage/stun. |
| Freeze | Cannot move, attack or cast; remains targetable and can be healed/displaced. No stacking/refresh while active. Burn consumes remaining Freeze time twice as fast. | Kuzan's existing 700 ms stun becomes 700 ms Freeze; damage, targets and other values unchanged. Frost Patch also applies Freeze. |
| Sleep | Cannot move, attack or cast; remains targetable/healable/displaceable. 1,500 ms, no stacking/refresh; each effective damaging hit shortens remaining sleep by 300 ms. Blocked damage does not shorten it. | Caesar Clown's existing R32 PvE ability, in addition to unchanged damage/burn. |
| Locked | 2,000 ms, no stacking/refresh: cannot move or be displaced; effective range is 1. Can attack/cast within ordinary targeting rules. Original current range returns on expiry. A relocation-required Lunge waits without spending Energy; Escape cannot relocate. | Pica's existing R36 PvE ability, in addition to unchanged damage/stun. |
| Rain | Every full second, +3 Energy to each living fighter, respecting its current Energy cap and Protect. Poison damage ×0.7. | R28 Fish-Man Island; selectable in the isolated planner. |
| Snow | Freeze duration ×1.3 when applied; no additional Speed/stat/damage modifier. | R32 Punk Hazard; selectable in the isolated planner. |
| Charged Deck | At each full second, +3 Energy only to living occupants of its cells; existing cap/Protect rules. First pulse at 1,000 ms. | R14 Skypiea, cells (3,2), (4,2), (3,3), (4,3). |
| Frost Patch | Entering applies 1,000 ms Freeze (1,300 ms in Snow); one application per entry, at most once per unit per 2 seconds. Staying does not retrigger. | R32 Punk Hazard, the same four central cells. |

All durations use `ceil(milliseconds / combatTickMs)`; percent damage uses
`max(1, floor(maxHp * stacks / 100))`, then Rain's multiplier before normal
True-damage resolution. Rain and Charged Deck are additive if explicitly combined.
Neutral weather/no fields is the default, including all PvP and R1–3.

These are the only authored mechanic changes: Kuzan and three named
PvE bosses, plus three PvE environments. No new crew/items/traits, no changes
to their base stats, ability power, targeting/patterns, other boss mechanics,
generic legacy enemies, rewards, stages/cadence, acquisition, bot policy or RNG.
P12's historical profile-neutral conclusion remains historical; new tests will
identify exactly the three later boss additions instead of hiding them.

## Interactions and deterministic authority

- Rune Protect blocks new negative status applications. Protect keeps existing
  damage/Energy semantics; it does not become a new status-immunity rule.
- Freeze/Sleep/Locked are independent of existing Stun; no new global CC
  cooldown, immunities, berries or Pokémon passives. Poison can coexist with
  Burn; new poison follows the existing periodic-damage reaction exclusions.
- Locked is both movement/displacement prevention and range restriction, not
  untargetability. Every movement path, including Lunge, Knockback, Pull and
  Escape, must honor it. Escape's nonmovement Shield/status effects retain their
  existing authority. Ordinary target filters remain alive-based.
- Dead/resurrecting units cannot gain these effects, act, receive damage/heal
  or release their occupied cell. Phoenix clears negative status on revival;
  field entry is then eligible as a newly living occupant. No shared-cell change.
- Evaluate passive fields/periodic status effects before that tick's action
  eligibility. Recheck new action inhibition before resolving queued actions.
  Existing deterministic unit-ID order resolves simultaneous conflicts.
- Emit status end facts for early expiry (Burn/Freeze and damage/Sleep), so
  playback/icons never infer rules or display stale status. Neutral scenarios
  using unchanged abilities retain their event streams, damage math and battle
  RNG draws; the explicitly changed Kuzan/boss abilities remain intentional.
- Environment has explicit weather and typed cell fields. Production takes
  the authored stage definition at round entry; planner takes its validated
  explicit choice. No trait-vote weather system, random hazards or new RNG.
  One weather per battle; overlapping fields are distinct, deduplicated and
  applied in stable kind/cell order. Invalid input cannot silently create effects.

## Integration and compatibility

Persist the exact current environment with schema-6 additive data and copy it
into each frozen battle result. Legacy missing data means neutral/no fields for
that current checkpoint, never retroactively applying new hazards to a saved
battle; subsequent new rounds take their authored environment normally.
Replay remains observation of frozen events/snapshots, not re-simulation.

Expose weather, field cells and rules before combat, in live/spectated combat,
codex, team planner and Chronicle. Use local authored SVG/icons and static
high-contrast field marks; Reduced Motion retains information without motion.
Extend existing report counters with actual environment/status use; do not
redefine metrics or regenerate historical JSON/baselines. No bot tuning.

GameContent **1.33.0**, save schema **6**, no dependencies/migration.

## Pinned PAC evidence and adaptation

Reference: `keldaanCommunity/pokemonAutoChess@a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`.

- [Status implementation](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/colyseus-models/status.ts#L575-L814):
  poison stacks/periodic True damage and Rain reduction; nonstacking Freeze,
  Snow duration multiplier, Burn accelerating thaw; nonstacking Sleep.
  **Direct rules:** 3-stack ceiling, 1-second ticks, ×0.7 Rain, ×1.3 Snow and
  doubled thaw. **Adapt:** poison 1% rather than PAC's 5%, authored durations and
  One Piece sources, local deterministic ticks and existing damage authority.
- [Locked](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/colyseus-models/status.ts#L1155-L1199)
  and [entity eligibility](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/pokemon-entity.ts#L230-L263):
  **Direct rules:** movement/displacement blocking plus range 1, with attacks
  retained; adapt safe dynamic-range restoration and local Lunge authority.
- [Sleep damage reaction](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/pokemon-entity.ts#L1196-L1199):
  **Direct numeric rule:** damage shortens sleep by 300 ms; not instant wake-up.
- [Rain Energy](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/pokemon-state.ts#L997-L1023):
  **Direct numeric delta:** +3 per second; adapt to the local Energy cap without
  importing PAC's separate baseline recharge or weather-rock items.
- [Weather selection](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/utils/weather.ts):
  **Reference only:** an explicit battle-wide selected weather and neutral
  fallback. Reject Pokémon synergy/passive/rock scores and world services.
- **Adapt:** cell-based positive Energy / freezing hazards to the authored
  Skypiea/Punk Hazard boards. Their cadence/cells are local decisions, not claimed
  PAC constants. Reject random Storm lightning, generic event/status frameworks,
  extra modes, networking, food and broad balancing.

The newer PAC `app/config/game/weathers.ts` does not exist at this pinned ref;
the rules above were read in the pinned implementation, not copied from HEAD.

## Implementation handoff / verification NOT RUN

The owner explicitly declined the proposed B08 verification scope on 2026-11-06.
No B08 test, typecheck, lint, build, asset validation, browser check or GitHub CI
was run. Tests are authored, not passed. The task branch can be published without
opening a PR; this repository runs CI on PR creation, so that step is deferred.

The existing icon generator created four original status SVGs and the updated
contact sheet (exit 0, with a host Fontconfig cache warning); no visual QA was
performed. The normalized content snapshot expectation was generated as authored
metadata: SHA-256 `7946a123016fdcceeb1e2f3b01fe4fb74f5db118fd53f1c3b33befa5f246cbed`.
This is not a successful regression check.

Current-content observer equality tests remain. A content-hash-anchored B07
control preserves the existing complete seed-0 expectation (252 preparations,
`6e648b36`) under unchanged content; only the four explicit ability deltas and
three environments are reconstructed to their old form. The control itself is
pinned to B07 content hash `58e78178`. None of these tests were executed.

No new phase or choice budget is added (B08 additional phase budget: 0 seconds).
Control/fields operate inside the existing combat clock/cap. No measured human
duration, balance benefit or new baseline is claimed.

Deferred scope, requiring a later explicit instruction:

Focused deterministic status/expiry/immunity/DoT/movement/resurrection tests;
neutral golden/RNG equivalence, authored sources and environment precedence;
save/legacy/replay/planner/report coverage; typecheck/lint, one full unit suite,
asset/provenance validation, build; focused UI/E2E in both desktop sizes and
normal GitHub CI (including its ordinary 50-match smoke). No separate local
aggregate, new baseline, 1,000-seed soak, tuning candidate or B09 work.
