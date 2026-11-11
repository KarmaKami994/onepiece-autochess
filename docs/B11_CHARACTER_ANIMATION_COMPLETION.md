# B11 — Character, form and PvE animation completion

2026-11-11. Base: B10 squash `45556741eb512454e7f420a42c835ad6e3847c5d`.
Branch: `codex/b11-character-animation-completion`; [PR #73](https://github.com/KarmaKami994/onepiece-autochess/pull/73), source
`8fabfb574a64c36c18b9cdae746a8b3114d24c63`. Owner requested the B10
squash and B11 implementation, accepting its frozen standard/pilots. This is
presentation work only; GameContent remains **1.34.0**, save schema **6**.

## Coverage and retained art

| Source class | Visual identities | Treatment |
| --- | ---: | --- |
| Accepted B10 pilots + original Luffy | 4 | Koala, Kaido, Demonio and original explicitly mapped Luffy retained byte-for-byte; matching static derivatives |
| Complete licensed sheets | 33 | Original pixel drawings/palette retained; explicit semantic source rectangles replace heuristic clip assignment |
| Short licensed sheets | 3 | Garp keeps idle/cannonball cast; Capone Bege keeps idle; Arlong keeps idle/attack/shark dash. Only missing clips are supplemented |
| Weak support identities | 3 | Killer, Caesar Clown and Pica receive complete body drawings, grounded in their archived approved identity references |
| Remaining forms | 3 | Separate Boundman, Snakeman and Monster Point bodies, portraits and tokens |
| Existing procedural PvE cutouts | 16 | Full articulated pixel poses matching each existing identity, palette, faction marks and equipment; no new enemy definition |
| **Total** | **62** | **34 crew + 4 forms + 24 PvE visual bases**, resolving **29 PvE definitions** |

There are 58 new preferred packages. All previous v1/v2 atlases and archived
reference PNGs remain available. CP9, Donquixote and Beast-Pirate variants keep
their shared faction body; they never fall back to a different character.
The original editable P7/P12 vector designs remain in their existing generators;
their simple geometry is an identity reference for the new shaded pixel bodies,
not the production character drawing. The eleven flat articulated vector drafts
were excluded at contact-sheet curation because they missed the B10 style.
They remain clearly marked as rejected authoring evidence; the export does not
read them. Automatic approval review declined their optional deletion because
of possible irreversible source loss; retaining them is safe and unblocking.

## Fixed production contract

- Transparent hard-pixel 128×128 cells, 46 frames in a 1024×768 atlas; nearest
  neighbour only. New bodies use pivot `(64,116)`; original Luffy stays `(40,116)`.
- Six unchanged clip ranges/FPS/repeats: idle `0–5 / 8 / loop`, move
  `6–13 / 16`, attack `14–21 / 14`, cast `22–33 / 12`, hit `34–37 / 12`,
  defeat `38–45 / 10`. No combat/event timing change.
- Newly drawn clips require at least 3/6/5/6/2/5 distinct body drawings.
  Holds, offsets, mirroring or whole-body scaling are not new poses.
  Short faithful original clips are retained explicitly: e.g. Garp's original
  idle and Arlong's shark dash. `selection.json` records every reused drawing;
  no unsupported claim that a short source contains a complete animation.
- One scale per identity/source, integer foot registration, hard alpha and
  shared non-dithered palette. Original drawings keep their source colours.
  Supplemental bodies use the imported body's height in hybrid packages.
- Body and FX are separate editable sources. Existing combat FX remain owned
  by the renderer. The body atlas budget remains ≤512 KiB.

## Local sources, export and provenance

`art/production/b11/` contains the frozen drafts/prompts where used, curated
body/FX boards, masters, explicit maps, editable `.aseprite` files and per-identity
source selections. Original clips record actual archived sheet rectangles;
new clips record their draft pose IDs. Candidate scanning is an **authoring aid
only**; normal export reads frozen SHA-pinned sources/maps.

`provenance.json` records original source pages/contributors/permission, source
hashes, reference hashes and tool limits. `outputs.json` records generated
hashes. `ASSET_PROVENANCE.md` lists every package, source/atlas hash and editable
body. No new external sheet was downloaded. The requested Kaido source
[SpriteDatabase 21137](https://spritedatabase.net/file/21137), Megadoomer, remains
the accepted B10 reference and master. Existing owner attestations and the
franchise/downstream licensing boundary in `ASSET_LICENSE.md` remain unchanged.

PixelLab was unavailable in this session. As in B10, missing raster poses use
frozen built-in `image_gen` drafts, followed by local selection, alpha cleanup,
palette reduction and registration. Exact provider model/seed/settings were
not exposed. Reproducibility means exporting the committed local source, not
regenerating the same AI draft. No provider/network/scanner runs in build, CI
or gameplay. No dependency was added.

Export: `npm run assets:b11`; intentional editable export:
`node scripts/assets/build_b11_assets.mjs --editable`. `--resume` reuses
completed packages only when the pinned body hash still matches. Ordinary
v2 rebuilds retain the authored source, and the existing static exporters
select the preferred body from the same source matrix.

## Runtime and review

Manifests append preferred packages while keeping identity-safe old fallbacks.
The board preloads only visible bodies and forms actually referenced by that
visible frozen battle's transform/resurrection events, never the whole roster.
Transformation, Phoenix reset and replay reset swap only the sprite body and
its origin/resource-bar layout. Position/tweens, facing, HP/shield/Energy,
statuses, playback generation and authoritative combat data are retained.
An explicit undefined presented form means base-body reversion.

The Animation Lab shows the latest two variants without a clipped third panel;
“Compare oldest fallback” retains access to v1. Per-identity six-clip contact
boards, combined GIFs and before/after masters are under `art/qa/b11/`.
`all-identities.png` covers all 62 masters. Browser captures are recorded after
the owner-approved checks; asset source generation alone is not runtime PASS.

## Verification / limits

Owner explicitly approved the focused B11 atlas/form/fallback/save/replay/Phoenix
scope, typecheck/lint, assets, build, both desktop browser sizes and normal PR CI.
Local results: **245/245 focused test cases**, **12/12 browser cases** in both desktop
sizes, typecheck/lint/assets/build PASS; 137 atlases validated. Normal PR CI
is the [live PR gate](https://github.com/KarmaKami994/onepiece-autochess/pull/73/checks). Results and initial fixture/provenance corrections are
recorded in `PROJECT_STATE.md` and the PR. Initial CI passed 958/959; its sole
P9 single-v2 expectation now explicitly covers retained original + preferred
B11 variants (affected P9 20/20, typecheck and affected lint PASS). CI #185
then passed all 959 normal tests; its coverage run hit the new monolithic
58-package test deadline. The same assertions are now isolated per package
under the unchanged timeout (B11 62/62). This adds 57 case boundaries, no
extra package checks or weakened thresholds. No separate local
production aggregate, baseline or 1,000-seed soak. No gameplay, unlock/catalyst,
item/form numbers, bot, economy, RNG or save-format change. No B12 work.

Pixel hashes establish distinct drawings and reproducible exports, not artistic
quality; contact-sheet and in-context review remain necessary. Historic source
limits and old fallback quality are visible rather than silently replaced with
another character. Future new characters remain outside B11.
