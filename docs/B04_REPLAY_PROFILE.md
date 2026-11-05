# B04 — Local voyage chronicle

Architecture locked 2026-11-05, based on B03 `6c8c9ab13eff84c25b572577b33018feb625157a`.
GameContent remains `1.31.0`; match save schema remains `6`.

## Recording and compatibility

Replay format 1 stores chronological round/phase checkpoints (the latest observed
crew, inventory, offers and captain facts in each phase), plus immutable resolved
battle snapshots/events for every recorded perspective. No shop command log,
shared pool or executable content is needed: playback never re-simulates. Phase
navigation shows preparation/recruitment/item/carousel summaries; combat uses the
existing selector, Phaser board and B03 contributions. Pause freezes the Phaser
clock and tweens. Speed/perspective/round changes start the selected battle again.
Recording starts with a new voyage; resumed pre-B04 saves explicitly have partial
coverage from their first observed round. A voyage finishes for the local captain
on elimination or game-over. Later unobserved bot-only rounds are not fabricated.

Content version, canonical content/config hashes and match schema identify the
presentation contract. Incompatible recordings remain exportable/deletable but
cannot be played using current rules. Imports are size/structure/reference checked;
they never become an active save or executable command and never count for local
records, collection or achievements. This is local provenance, not anti-cheat.

## Storage and profile rules

A separate IndexedDB chronicle stores draft, replay records and local profile;
active-voyage persistence is untouched. Completion and profile credit share one
transaction and one stable voyage ID. The retained credit ledger prevents counting
a resumed or deleted recording twice. Archive retention is bounded independently
from lifetime profile totals; deleting recordings does not erase profile credit.
Resetting the profile does not recount the current voyage or retained replays.
Archive/profile export and destructive controls remain explicitly separate.

Limits: ten recordings / 96 MiB total, 32 MiB per recording and active draft,
10,000 distinct credited voyage IDs. Oldest archive entries are evicted at capacity;
profile credit and deleted-record tombstones remain. A deleted/evicted local replay
does not reappear merely because its completed save is resumed. Archive imports
validate all entries before one transaction and are always marked imported. Profile
restore is a separate explicit replacement, retaining the dedupe ledger. Quota,
blocked storage and malformed-data errors are displayed without blocking gameplay
or overwriting unreadable data. Recording is best-effort on abrupt browser shutdown;
phase changes/completion save immediately and same-phase checkpoints are throttled
to two seconds, with an additional pagehide/visibility flush. It is not a per-click
preparation timeline. Maxima and discovery facts survive replaced phase snapshots.

Collection meanings: discovered = visible owned crew/shop or offered/owned items;
owned = at least one persistent instance/inventory/equipment observed; deployed =
in a frozen starting battle team; form reached = persistent form observed or actual
combat transformation. Only the local captain's authoritative facts qualify.

Locked achievements: first completed voyage, first victory, first top four,
first deployed 3-star, first reached form, first completed item used, and round-20
voyager. Records: best placement, highest round/level/gold, most deployed fighters.
All are cosmetic; no unlock changes gameplay. Imported profile backups require an
explicit restore operation and remain labelled backups of local user data.

## PAC research

Pinned source `13822d390ca0f2010881e910a6c3f73cf4df5653`:
[viewer](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/public/src/pages/replay.tsx),
[format](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/public/src/game/replay-format.ts).
PAC replays recorded inbound frames without simulation, indexes phase/stage seeks,
and warns on build/serializer skew. **Adapted:** independent recorded playback,
local library, compatibility gate and navigation. **Reference only:** its binary
stream/index design. **Rejected:** Colyseus room emulation, msgpack, Firebase,
network identity/Redux state replacement and public progression. **Direct:** none.
The local JSON checkpoints/events fit existing deterministic authorities without
importing that infrastructure or changing gameplay.

## Verification

- PASS — typecheck, lint, focused recording/contribution/selector tests (initial
  30/30; final Chronicle suite 14/14), full unit suite 66 files / 843 tests, and
  production build.
- PASS — 10 Browser E2E cases across 1280×720 and 1920×1080: automatic local
  completion, durable restart, idempotent counting/deletion/reset, read-only replay
  pause/speed/perspective/phase navigation, B03 final totals/audio regressions,
  incompatible/corrupt imports, archive/profile backup round-trip and collection
  links. Active-save isolation checked; screenshots inspected.
- One focused integration test records a normally simulated complete captain
  voyage, checks state/RNG hashes after observation, validates the full JSON
  round-trip and verifies the size cap. This is not a new aggregate measurement.
- The first new browser run used an unsuitable label query for a select. The test
  now uses its actual accessible combobox role; no prior assertion was weakened.
  The known Windows owned-server teardown required targeted cleanup.
- No gameplay, bot, content, schema, dependency, production aggregate, 1,000-seed
  soak or balance baseline change. Normal CI remains the integration gate.

The owner requested B02/B03/B04 integration into main once B04 is finished. Each
batch is kept as a separate commit/PR; final remote merge results are in GitHub
history. No subsequent batch is authorized by this completion.
