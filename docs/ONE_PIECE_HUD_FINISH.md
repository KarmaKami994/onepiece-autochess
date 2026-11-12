# One Piece HUD finish

2026-11-12 — Owner requested a One Piece material/color treatment while keeping
the accepted PAC layout and interaction model. Base: PR #75 squash
`5420340d0bf91bbf29d00ed92bff7f219c3c9fef`.
Branch: `codex/one-piece-hud-polish`.

## Visual treatment

| HUD element | Finish |
| --- | --- |
| Stage bar, shop frame, synergy/crew panels, Galley, battle receipts | Dark timber, subtle CSS grain, brass inset edges |
| Active synergy | Parchment plaque, dark ink, sea-blue active threshold |
| Hover, recipe, Galley and scouting cards | Warm parchment with dark text and brass recipe slots |
| Captain medallions | Sea-blue centers, brass health arcs; green player arc retained |
| Recruitment | Existing portraits in sea-blue insets; rarity, merge and bond signals retained |
| Buttons and treasure | Beveled timber/brass; coral battle action; sea-green locked state/XP |
| Focus and warnings | Explicit gold focus on timber, contrasting focus on paper, red clock warning |

`app/hud/one-piece-hud.css` is a project-authored visual layer imported after
the retained PAC stylesheet. It adds no raster assets, font, dependency, remote
request or animation beyond short color/shadow transitions. Reduced-motion
preference disables these transitions. Existing portraits/icons remain intact.
PAC placement, panel widths, shop slots, hover delays, keyboard commands,
scouting, crafting, Food, battle economy and captain health numbers remain.

Visual inspection found that the floating crew card's inherited zero flex basis
collapsed its scrollable details. A scoped `flex-basis: auto` correction exposes
the portrait/stats within the existing height limit. The HUD browser case now
requires the crew header and Special Defense tile to intersect the viewport;
the original state, inventory, gold, recipe and keyboard assertions remain.

No domain, gameplay, balance, save/replay, RNG, bot, content or schema change.
GameContent **1.34.0**, save schema **6**. No version bump.

## Verification

Owner approved lint/build, focused hover/keyboard/crafting/scouting/layout
browser checks at 1280×720 and 1920×1080 and normal PR CI. PASS: lint, production
build and 10 unique browser cases. The six hover/keyboard/scouting cases passed
again after the crew-card correction; the final two hover/capture cases passed
after typography adjustments, including the new viewport assertions. Existing
nonfatal build notices and lazy-animation dev warnings remain unchanged. No
timeout or assertion was weakened. Remote CI status is reported on the PR.
No local full unit run, production aggregate, baseline or 1,000-seed soak.

Real browser captures: `art/qa/one-piece-hud/`. Original PAC source/licence and
font provenance remain under `third_party/`; the original port is documented in
[`PAC_HUD_PORT.md`](PAC_HUD_PORT.md).
