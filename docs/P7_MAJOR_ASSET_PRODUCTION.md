# P7 Major Asset Production

## Outcome

P7 completes the presentation inventory for the current game without changing gameplay. GameContent is `1.26.0`; save schema remains `6`.

| Surface | Before P7 | After P7 |
|---|---:|---:|
| Crew with dedicated production visuals | 18 / 30 | 30 / 30 |
| Crew with preferred v2 combat animation | 18 / 30 | 30 / 30 |
| PvE with dedicated production visuals and v2 animation | 5 / 8 | 8 / 8 |
| Item SVG icons | 0 / 65 | 65 / 65 |
| Trait SVG icons | 0 / 13 | 13 / 13 |
| Forms with dedicated portrait, token, and board treatment | 0 / 4 | 4 / 4 |

The 12 completed crew identities are Koby, Koala, Franky, Brook, Ivankov, Jinbe, Kuma, Kizaru, Kuzan, Akainu, Shanks, and Blackbeard. The three completed PvE archetypes are Vice Admiral, Cipher Pol Agent, and the unnamed Seraphim archetype. Production `UnitDefinition` and `PvEEnemyDefinition` entries now contain zero placeholder references; the generic placeholder remains available for future and custom content.

## Animation and static identity pipeline

All preferred combat animations use the existing 46-frame `128×128` standard: idle `0–5`, move `6–13`, attack `14–21`, cast `22–33`, hit `34–37`, defeat `38–45`, packed into a `1024×768` atlas with a stable default pivot of `(64, 116)`. Builds use transparent output, nearest-neighbor resizing, integer placement, deterministic source selection, holds, offsets, defeat treatment, and hard-pixel supplements.

The source/import gate is `art/animation-v2/source-matrix.json`. It binds every imported sheet to an exact local path and SHA-256 and records the source identity, title/file page, contributor, dimensions, permission basis, strategy, frame-map pointer, and processing operations. Runtime never hotlinks or downloads assets. The 12 static character cutouts, portraits, and tokens are deterministically derived from the selected preferred idle presentation rather than maintained as unrelated crops.

Crew candidate resolution now accepts v1-only, v2-only, and v1-plus-v2 identities in explicit order. v2 is preferred. Existing 18 crew retain `v2 → v1 → portrait/token` degradation; the 12 new v2-only crew degrade to portrait/token. PvE remains separately represented. The board continues to inspect only visible content IDs and requests the next missing candidate; it does not preload all 30 crew or eight PvE atlases.

## UI visual language

`components/gameVisualManifest.ts` is the presentation-only authority for item, trait, status, and form visuals. It contains paths, fallback glyphs, colors, and form overlay paths, but no gameplay mechanics.

- `art/ui-icons/item-icons.json` explicitly authors all 65 current items. Components use a simpler frame; completed items use a finished frame; the ten trait-grant items also carry a shape badge. Runtime SVGs live under `public/assets/items/`. Existing `ItemDefinition.icon` glyphs remain the failure fallback.
- `art/ui-icons/trait-icons.json` covers all 13 production traits, including an explicit Emperor identity. Runtime SVGs live under `public/assets/traits/`; semantic name, count, tier, scope, and behavior text remain visible.
- `art/ui-icons/status-icons.json` covers only eight confirmed presentation states: stun, burn, wound, protect, blind, paralysis, resistance reduction, and resurrecting. Phaser attaches short-lived badges only to existing battle presentation events and retains textual/effect fallbacks.
- The four existing forms each receive a portrait, token, and board overlay under `public/assets/forms/`. The overlay communicates silhouette or emblem as well as color, preserves the base animation, and does not change hitboxes, coordinates, mechanics, or stored state.

React loads static icons naturally as images beside existing semantic text. Phaser Carousel loads only icons in the current choice set; failed item textures retain the existing glyph/card treatment. Board animation atlases remain visible-only. No image bytes are embedded in JavaScript, no runtime CDN is used, and presentation failure cannot change deterministic game behavior.

## Reproducibility, validation, and QA

`npm run assets:ui` rebuilds P7-authored UI, form, static identity, and QA outputs. `npm run assets:v2` rebuilds animation PNG/JSON packages. `npm run assets:all` performs the complete deterministic sequence. Generated SVG/JSON files contain no timestamps; inputs and filesystem iteration are stable; generators do not use `Math.random`.

`npm run assets:validate` enforces 30 crew, eight PvE, 65 item icons (10 component and 55 completed), 13 trait visuals, four form visual sets, eight status icons, preferred v2 clip completeness, local source hashes/provenance, non-placeholder production content, SVG safety, maps, Carousel assets, and QA sheets. P7 QA artifacts are:

- `art/qa/p7-crew-contact-sheet.png`
- `art/qa/p7-pve-contact-sheet.png`
- `art/qa/p7-item-contact-sheet.png`
- `art/qa/p7-trait-status-contact-sheet.png`

Icons remain paired with real accessible names or existing visible labels. Decorative duplicates use empty alternative text. Existing focusability, keyboard interaction, high-contrast silhouettes/borders, and reduced-motion authority are preserved.

## PAC classification

- Direct port: none. No Pokémon Auto Chess franchise art was imported.
- Adapted: only generic presentation principles such as distinct unit, item, and synergy identity.
- Reference only: PAC asset organization and presentation conventions.
- Rejected: all Pokémon sprites, icons, names, and copyrighted visual identities.

## Boundaries

P7 changes asset metadata and presentation only. Unit/PvE stats, costs, abilities, traits, thresholds, mechanics, item IDs/stats/recipes/behaviors, stages/waves, economy, pools, captain damage, bots, RNG, persistence shape, and save compatibility remain unchanged. No new unit, enemy, item, trait, form, stage, backend, network feature, audio, tuning, or production-soak baseline is introduced.
