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
verification. `test:production-soak` is the manual 1,000-seed release audit.
Both use production rules and write versioned reports below `tmp/`, including
the git SHA, Node and schema versions, seed range, and content/config hashes.
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

## Controls

- Click a crew member and then a highlighted deck/bench cell, or drag directly.
  Amber cells swap occupants; red cells explain illegal capacity moves.
- `1`–`6`: buy the matching shop offer. Hover or keyboard-focus a poster for
  its ability, stats, merge progress, and projected bond impact.
- `1`–`3` on treasure reward screens: choose the matching reward.
- During the Bounty Regatta, left-click the ocean to steer your boat. A bounty
  is claimed only when the boat touches it; the gold marker shows the same
  deterministic best-fit choice used by timeout auto-pick.
- `R`: reroll the shop for one gold.
- `L`: lock or unlock the shop.
- `X`: buy four XP for four gold.
- `Escape`: close the current overlay.
- Use the mute control in Settings for the synthesized interface and combat
  sounds.

The first-voyage guide pauses preparation while teaching recruitment,
deployment, battle, treasure choice, and equipping. It can be skipped or
reopened from Settings. Starting a new voyage while a save exists requires
explicit confirmation.

After each combat, a compact outcome notice reports victory, defeat, or draw,
Captain damage, and remaining team health. The final results screen preserves
the crew's names, stars, held treasure, and active bonds.

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
  settings are stored in localStorage. Closing during battle resumes from the
  stable pre-battle state and seed; closing during a Bounty Regatta resumes the
  last complete 50 ms simulation checkpoint.
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
