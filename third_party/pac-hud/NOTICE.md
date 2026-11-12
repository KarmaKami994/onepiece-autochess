# PAC HUD source attribution

Upstream: keldaanCommunity/pokemonAutoChess, commit
`9ab1e9a89048bec9fcac591359fad9f59c4399a3` (12 November 2026).
Repository: https://github.com/keldaanCommunity/pokemonAutoChess
Upstream code licence: GNU GPL version 3; the unmodified licence is `LICENSE`
in this directory. The repository's MIT notice does not relicense these upstream
portions. The project owner additionally authorized direct reuse of suitable PAC
HUD code in the HUD implementation request.

Adapted source mapping:

| Local file | PAC source under `app/public/src/` |
| --- | --- |
| `app/hud/PacHud.tsx` | `pages/component/synergy/{synergies,synergy-component,synergy-detail-component}.tsx`; `game/components/item-detail.tsx` |
| `app/hud/pac-hud.css` | `style/{colors,container,fonts}.css`; `pages/component/game/{game-shop,game-stage-info,game-player,game-players,game-pokemon-detail}.css`; `game/components/item-detail.css` |
| `components/HudTooltip.tsx` | Local implementation of the pointer/focus lifecycle; PAC's `synergies.tsx` and `game/components/item-container.ts` supply the 100ms hover/handoff behaviour reference |

Adaptations replace PAC stores, enums, translations, room commands and Pokémon
data with local typed view props, existing authority callbacks and One Piece
assets. React retains UI ownership; the Phaser integration only observes hover
and changes presentation markers. No PAC networking, backend, state framework,
gameplay values or Pokémon artwork is imported.

Jost is bundled separately under SIL OFL 1.1; see `third_party/jost/`.
