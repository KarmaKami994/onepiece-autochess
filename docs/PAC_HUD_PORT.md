# PAC HUD presentation port

The accepted layout/interaction port was squash-merged in PR #75 as
`5420340d0bf91bbf29d00ed92bff7f219c3c9fef` (CI #191 green). The owner's subsequent
wood/parchment/brass finish is documented in
[`ONE_PIECE_HUD_FINISH.md`](ONE_PIECE_HUD_FINISH.md); the original grey port below
remains its source/history record.

Owner instruction: implement the PAC appearance and interactions, with direct
code reuse allowed. Base: `041741933e9459e669998c002dc5eff43356472f` (B12).
Branch: `codex/pac-hud-parity`. Visual reference is pinned to
`keldaanCommunity/pokemonAutoChess@9ab1e9a89048bec9fcac591359fad9f59c4399a3`;
the project's gameplay research pin is unchanged.

## Implemented presentation

- PAC's grey palette, black rounded panels, Jost typography, centered stage
  route and shop composition replace the broad nautical match panels. Local
  decks, portraits, B12 icons and six shop slots stay in use.
- Compact synergy rows show the selector's count and actual thresholds. A
  shared hover card shows all tiers and native crew portraits, with acquired
  crew and the active tier marked. Matching visible crew receive presentation
  markers, including item-granted memberships. Reserve portraits do not change
  the deployed distinct-line count.
- Item cards show icon/name, category/effects, description and graphical
  recipes. Recipe icons open one additional detail level without recursively
  expanding recipes. Mouse entry uses PAC's 100ms delay; moving into an item
  card keeps it open. A new primary card replaces the previous primary card.
- Keyboard focus opens the same information. F2/Right enters its interactive
  content. Escape closes nested details first and restores focus. Captain
  detail dismissal also preserves the existing Escape return from scouting.
  Hover/recipe inspection does not issue equipment, purchase or progression
  commands; popup events do not bubble into equip buttons or global shortcuts.
- The narrow captain rail remains visible beside independent crew detail
  cards. Captain hover preserves read-only scouting intel. Crew hover is
  read-only; selected-crew deploy/sell/equip still uses the original callbacks.
- Galley becomes an on-demand card, preserving recipient selection, warnings,
  stock, serving and meal receipts. The battle meal badge stays below playback
  controls. The combat report remains collapsible and retains its existing
  metrics. Local Ready/Skip, pause, save and battle-economy controls remain.
- The inspector exposes the existing separate Special Defense value using
  its normal fallback and item effect. This does not change mitigation or stats.

## Source and authority boundaries

`app/hud/PacHud.tsx` and `app/hud/pac-hud.css` adapt the documented PAC
synergy/detail/shop/stage/player sources. `third_party/pac-hud/NOTICE.md` maps
upstream paths and retains the upstream GPL-3.0 text for those portions.
The rest of the repository's MIT notice does not relicense upstream portions.

Jost is locally bundled under SIL OFL. PAC's referenced font binary was absent
from its pinned source tree, so the same variable-font family comes from the
official Google Fonts repository. SHA-256:
`6343b70971000b04c5d401c96ae08ce371086135e999d5e1e1413039c0213076`.
Font blob/licence/provenance are recorded under `third_party/jost/` and checked
by asset validation. No runtime font download or new dependency.

React owns the HUD and temporary hover/focus state. Phaser only observes actor
hover and changes existing presentation markers; that state is outside
BoardPayload and the combat timeline comparison. Selectors add display-only
tiers/member/route data. No PAC Redux, Colyseus, Firebase, Pokémon gameplay data,
server infrastructure, combat rule or RNG is imported.

GameContent **1.34.0**, Save Schema **6**. No change to `game/`, content values,
save/replay format, bot policy, shop odds, acquisition, item/trait effects or
captain damage. No separate local production aggregate, baseline or 1,000-seed
soak. Existing unit audit tests and normal CI are not new balance measurements.

## Verification and handoff

Owner approved focused HUD/selector tests, typecheck/lint, one full unit run,
build/assets, focused browser cases at 1280×720 and 1920×1080 and normal PR CI.
Initial typecheck/lint issues were fixed; focused board/item integration 26/26
and the new adapter test 1/1 passed. The full local command returned failure
with 1107 passing tests and six deadline failures under concurrent load; all six
deadline cases then passed in isolation with unchanged assertions/timeouts.
No second local full-suite run or new production report was performed.

Final typecheck, lint, asset validation and production build PASS. Build retains
the existing nonfatal chunk-size/static-route classification notices.

The 22 unique selected browser cases passed across the two desktop projects:
four new hover/keyboard cases, six Food/resume cases, two each for scouting,
battle-economy, tutorial, desktop layout, crafting/fallback and sprite picking/
drag. The picking case itself sets 1280×800 in both projects; the other cases
use 1280×720 and 1920×1080. One picking attempt missed its click, then passed
unchanged in isolation. No test timeout or assertion was relaxed. Existing
lazy-animation dev warnings appeared during view switches without console
errors. Actual captures are under `art/qa/pac-hud/browser/`.

Normal remote PR CI remains the integration gate; publication status is tracked
in PROJECT_STATE and the PR. Existing E2E instructions now open the Galley card and inspect captain details
on hover; the original consume-once, resume, read-only and command assertions
remain. No force-click, disabled check, raised timeout or changed metric.
