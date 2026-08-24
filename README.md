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
npm run test:production-soak
npm run test:e2e
npm run typecheck
npm run build
npm run lint
```

`test:production-soak` simulates 50 complete matches with the unchanged
production configuration and writes its balance report to
`tmp/production-soak-report.json`. On a fresh workstation, install the bundled
E2E browser once with `npx playwright install chromium` before running
`test:e2e`; the tests cover both supported desktop viewport sizes.

The latest reviewed production metrics, definitions, limitations, and dated
raw snapshot are documented in [BALANCE_REPORT.md](BALANCE_REPORT.md).

The committed v2 animation assets can be rebuilt headlessly with
`npm run assets:v2`. LibreSprite is only needed to recreate the editable
`.aseprite` files; the game itself and normal build do not require it.

## Controls

- Click a crew member and then a highlighted deck/bench cell, or drag directly.
  Amber cells swap occupants; red cells explain illegal capacity moves.
- `1`–`6`: buy the matching shop offer. Hover or keyboard-focus a poster for
  its ability, stats, merge progress, and projected bond impact.
- `1`–`8` on treasure screens: choose the matching reward or carousel token;
  the highlighted best fit uses the same deterministic scoring as auto-pick.
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
- The `game/` package is UI-independent. Serializable state is changed through
  `applyCommand`, and battles are resolved from a seed before any animation.
- The active match is stored in IndexedDB. Small accessibility and audio
  settings are stored in localStorage. Closing during battle resumes from the
  stable pre-battle state and seed.
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
