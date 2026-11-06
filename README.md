# Grand Line Auto Chess

A clean-room auto-battler prototype for desktop browsers, developed publicly
but designed to run entirely on localhost. Build a crew, arrange it on an 8×6
ship-deck board, and outlast seven deterministic bot captains through PvE waves,
item drafts, and player battles.

This project uses the broad genre conventions and publicly documented behavior
of auto-battlers as design reference. It does not contain code or assets copied
from Pokémon Auto Chess.

## Run locally

Requirements: Node.js 22.13 or newer.

```powershell
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). No account, server,
external database, or runtime internet connection is required.

Useful checks:

```powershell
npm test
npm run test:soak
npm run test:production-smoke
npm run test:production-soak
npm run test:coverage
npm run assets:validate
npm run test:e2e
npm run typecheck
npm run build
npm run lint
```

`test:production-smoke` simulates 50 complete matches for normal CI and local
verification. `test:production-soak` is the manual 1,000-seed release audit and
can also be started through the GitHub Actions `Release Production Soak`
workflow. Both use production rules and write versioned reports below `tmp/`,
including the git SHA, Node and schema versions, seed range, and content/config
hashes.
On a fresh workstation, install the bundled
E2E browser once with `npx playwright install chromium` before running
`test:e2e`; the tests cover both supported desktop viewport sizes.

The latest reviewed production metrics, definitions, limitations, and dated
raw snapshot are documented in [BALANCE_REPORT.md](BALANCE_REPORT.md).

The committed v2 runtime assets can be rebuilt cross-platform with
`npm run assets:v2`. Use `npm run assets:v2:editable` to also recreate editable
files. External tools resolve from `LIBRESPRITE_PATH`/`PYTHON_PATH`, the
documented project-local directories, and then `PATH`; the game and normal
build require neither tool.
The original Bounty Regatta arena, boat palettes, and animated bounty tokens
can be rebuilt reproducibly with `npm run assets:carousel`.
The named PvE bosses and faction crews for rounds 9–40 can be rebuilt from
local, SHA-pinned sources with `npm run assets:p12`; their source and permission
records are in [ASSET_PROVENANCE.md](ASSET_PROVENANCE.md).

## Controls

Open **CREW TOOLS** from the main menu for the searchable crew/item/bond codex
and local team planner. Build two crews, inspect bond thresholds, save or
import/export named plans, and run a seeded combat test using the production
simulator. These tools never change an active voyage or shared pool. Plans use
a separate local library; save drafts before leaving Crew Tools.

**VOYAGE CHRONICLE** archives completed local captain voyages with read-only
round/phase playback, pause, speed, perspectives and combat contributions. It also
contains a cosmetic captain profile, collection linked to the codex, seven
achievements and personal records. Recording is separate from the active voyage;
resumed older saves have labelled partial coverage. Imports never count for profile
credit. Individual replay/archive export/import, explicit profile backup restore
and separate reset controls are available. Retention is ten replays / 96 MiB;
oldest recordings are evicted while lifetime credit remains. See
[the recording contract](docs/B04_REPLAY_PROFILE.md) for limits and compatibility.

- Click a crew member and then a highlighted deck/bench cell, or drag directly.
  Amber cells swap occupants; red cells explain illegal capacity moves.
- `1`–`6`: buy the matching shop offer. Hover or keyboard-focus a poster for
  its ability, stats, merge progress, and projected bond impact.
- `1`–`3` on item reward screens: choose the matching item.
- During the Bounty Regatta, left-click the ocean to steer your boat. A bounty
  is claimed only when the boat touches it; the gold marker shows the same
  deterministic best-fit choice used by timeout auto-pick.
- `R`: reroll the shop for one gold.
- `L`: lock or unlock the shop.
- `X`: buy four XP for four gold.
- `Escape`: close the current overlay.
- Open **COMBAT CONTRIBUTIONS** during a battle or planner test for playback-only
  HP/shield damage, healing and granted shields; switch between the viewed crew
  and opponent. Totals reset when that combat is replayed or perspective changes.
- Settings provides master, music and effects volume, mute and two original
  offline music tracks. Audio starts after interaction and pauses in background.

The first-voyage guide pauses preparation while teaching recruitment,
deployment, battle, component choice, equipping, and two-component crafting.
Hover or keyboard-focus an inventory component to see its canonical recipe
results and the selected holder's craft preview. The guide can be skipped or
reopened from Settings. Starting a new voyage while a save exists requires
explicit confirmation.

After each combat, a compact outcome notice reports victory, defeat, or draw,
Captain damage, and remaining team health. The final results screen shows every
member of the last deployed crew, including nine-unit lineups, separately from
the reserve at voyage end. Names, stars, forms, equipment and the deployed
crew's bonds are preserved. Older saves without a final deployment record show
an explicitly unclassified saved crew.

## Architecture

- React renders menus, match HUD, shop, standings, traits, tooltips, drafts, and
  results.
- Phaser renders the board, bench, draggable units, combat interpolation, and
  hit effects.
- The `game/` package is UI-independent. Serializable commands carry intent;
  trusted actor identity is supplied separately through `CommandContext`.
  Battles and the Regatta are resolved from explicit seeds/ticks before any
  animation.
- `useLocalGameSession` is the local application seam. Typed selectors build UI
  views, while IndexedDB access, clocks, tutorials, audio, and diagnostics stay
  outside the domain.
- The active match is stored in IndexedDB. Small accessibility and audio
  settings are stored in localStorage. Battle checkpoints preserve the current
  canonical state and immutable combat result, including battle-time economy
  actions. Only legacy `replayBattle` saves use the compatibility replay path.
  Closing during a Bounty Regatta resumes the last complete 50 ms checkpoint;
  Voyage Recruitment preserves pending offers and shared-pool reservations.
  Preparation/recruitment clock checkpoints exclude offline time; battles resume
  as full immutable replays. Pause, settings and hidden tabs stop the voyage.
- [B06 pacing](docs/B06_PAC_PACING.md) uses the pinned PAC phase limits, a
  three-second completed-round display and 23-second recruitment timeout.
  Auto-continue battles is configurable; Ready and Skip remain available.
- [B07 voyage choices](docs/B07_VOYAGE_CHOICES.md) adds a normal-price first
  recruit before R1, crew-origin routes at R10/R20, Usopp's component gifts at
  R16/R21 and Franky's optional 2-gold supplies at R18/R23. Choices, prices,
  reservations and clocks resume exactly; each stop always permits a free skip.
  The codex and Chronicle record these decisions; B07 introduced content `1.32.0`.
- [B08 status/weather contract](docs/B08_STATUS_WEATHER_CONTRACT.md) adds Poison,
  Freeze, Sleep and Locked, authored Rain/Snow and marked Charged Deck/Frost Patch
  cells. Configuration is saved with frozen battles and available in the codex,
  isolated planner and Chronicle. Content `1.33.0`, save schema `6`.
  B08 local verification is **NOT RUN** at the owner's request. PR #70 was
  subsequently squash-merged by explicit instruction; its CI was not inspected.
- [B09 food](docs/B09_FOOD_CONSUMABLES.md) adds three one-battle meals in a
  separate three-portion galley. Usopp/Franky replace one component option with
  food, preserving option counts/prices and P10 rewards. Serve one deployed
  fighter per preparation; sale, benching or merging away that instance forfeits
  the portion. Frozen battle meals survive save/replay without a second use.
  Food has a separate codex, planner choice, history and acquisition/use counts;
  all 65 equipment items / 55 recipes remain. Content `1.34.0`, schema `6`.
  Original food icons: `npm run assets:food`; reproducible inputs/output hashes
  in `art/ui-icons/food-provenance.json`. B09 local checks are complete after
  owner approval; normal PR CI remains the integration gate.
- All artwork is bundled under `public/assets`; Web Audio effects are generated
  locally. Gameplay makes no network requests.

## Contributing

Development happens through short-lived branches and pull requests. Before
opening a PR, run:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, review, asset-provenance,
and deterministic-engine rules. The repository is public for source
collaboration; the game itself is not deployed or hosted as a public service.
Product, architecture, future multiplayer, and release notes live under
[`docs/`](docs/).

## Rights and fan-project notice

This is an unofficial, non-commercial fan prototype. One Piece character names
and related concepts belong to their respective rights holders. Generated
illustrations and this clean-room implementation are not official or endorsed.
Public access to this repository does not grant a license to third-party
franchise names, character likenesses, or related intellectual property.

Source code is available under the [MIT License](LICENSE). That license does not
cover artwork, sprites, maps, portraits, animation sheets, franchise names, or
character likenesses. See [ASSET_LICENSE.md](ASSET_LICENSE.md) for the asset
boundary. Contributors should only add material they created themselves or are
authorized to contribute, and must document new visual assets in
`ASSET_PROVENANCE.md`.

“Local-only” is a technical product constraint, not a legal determination.
