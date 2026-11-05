# B03 — Combat contributions, effects and offline audio

Implementation contract (2026-11-05). B03 builds on B02 head
`4bdd4dbd3eceb88c436752759590361a9c7503a0`; PR #60 remains separate.
GameContent `1.31.0` and save schema `6` are unchanged.

## Locked definitions and asset inventory

- Damage dealt/taken is effective HP loss plus consumed shield, after mitigation.
  Overkill is excluded by the existing capped damage events. Intercepted damage
  belongs to the actual recipient; it is never counted again for the protected
  unit. Damage is attributed to the existing event source, including items/burn.
- Healing is actual HP restored, excluding overheal and blocked healing. Shield
  contribution is shield granted, not damage absorbed; unused shield still
  counts. Overheal converted into shield counts only as shield. Initial passive
  shield in a frozen snapshot has unknown attribution and is not fabricated.
- Resurrection HP and transformation HP/max-HP changes are separate lifecycle
  events, not healing. Contributions survive death/resurrection under the same
  fighter ID. Reserve units are excluded.
- Only events dispatched by the visible Phaser playback enter the meter, including
  staggered sequential hits. Replay/speed/perspective changes reset the meter;
  no precomputed final totals are exposed. The completed meter stays available
  until leaving that playback. A renderer failure exposes no future totals.
- Reuse all four existing form portraits/tokens/overlays and base animation
  clips. No additional character clip, external sprite or crew asset is needed.
  Add code-drawn source/target links, movement glyphs, form/cast accents and
  short labels. Reduced Motion removes travel/pulsing, not identity information.
- Add two original locally synthesized WAV music loops and extend the existing
  original Web Audio effects. No external audio is copied. The generator and
  generated manifest record exact inputs, hashes and permission basis.

## PAC research and local architecture

Reference pinned at `keldaanCommunity/pokemonAutoChess@13822d390ca0f2010881e910a6c3f73cf4df5653`:
[DPS model](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/core/dps.ts),
[preferences](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/public/src/preferences.ts),
[music selection](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/config/game/music.ts).

PAC separates dealt/reduced damage, shield damage, healing and shields and has
independent music/SFX preferences. **Adapted:** per-fighter effective contribution
views and independent local audio controls. **Reference only:** PAC's damage-type
buckets; local events describe attack/ability/item/burn rather than all damage
types. **Rejected:** Colyseus schemas, shared mutable/server-fed meter state,
wall-clock music variation and remote music infrastructure. **Direct:** none.
The local meter folds already-resolved presentation events; optional drain
source attribution is the only domain-event extension. It adds no RNG or rule.

## Verification

- PASS: typecheck, lint, focused report/audio/selector/Nami/Phoenix tests
  (5 files / 71 tests), full unit suite (65 files / 829 tests), asset validation
  and production build.
- PASS: 8 Browser E2E cases across 1280×720 and 1920×1080 cover live/final totals
  against the domain log, replay, perspective and speed changes, live economy,
  Reduced Motion/High Contrast, local audio decoding, legacy audio preferences,
  independent volume, track choice and keyboard mute. Screenshots inspected.
  Both existing battle-economy/resume cases also passed in the first run.
- The first browser attempt found a real stale-crew reset closure, now fixed.
  Two newly authored test selectors were corrected to scope fighter rows and
  operate the existing styled checkbox by keyboard. No existing assertion was
  weakened. The outdated failed run was stopped; the corrected run passed 8/8.
  Windows owned-server teardown needed targeted cleanup after assertions.
- No production aggregate, 1,000-seed soak, baseline, dependency, content value
  or save schema change. Normal CI remains the merge gate.

## Product notes

Open **COMBAT CONTRIBUTIONS** over the tactical board to inspect the viewed
crew or opponent. The small table remains closed until requested. Cast/drain/
movement/form cues name the actual participants; legacy unattributed drains
stay explicitly unknown. HP and shield damage taken and revival counts appear
under each fighter. Final contributions remain while that playback is mounted;
leaving the battle/reward screen does not create an archive (B04 is separate).
Skipping or interrupting playback never fills in unseen events.

Directional arrows and labels are semantic cues, retained when decorative
particles are off. Reduced Motion makes arrows static and removes form pulsing;
existing portraits/tokens/overlays and animation-speed controls are reused.
The same observer is used in live/spectated fights and B02 planner tests.

Settings backfills the existing local settings key with independent music and
effects volume plus a track ID. Existing master volume/mute remain effective.
Music requires a keyboard/pointer interaction, loops only local WAVs, pauses
while hidden, and releases old tracks on selection/unmount. Dense combat SFX
are bounded to one new sound per 60 ms. Browsers may still require a further
interaction after tab focus/autoplay rejection; this never affects simulation.

This is a stacked B03 branch based on the unmerged B02 PR #60, so its PR targets
the B02 branch to keep review focused. Integrate B02 first, then update/retarget
the B03 review branch against main. Neither PR is merged by this task.
