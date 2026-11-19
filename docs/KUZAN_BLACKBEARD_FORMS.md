# Kuzan and Blackbeard battle forms

| Form | Trigger | Combat effect |
| --- | --- | --- |
| Kuzan — Ice Form | The saved battlefield environment is Snow when combat starts. | Ice Age keeps 190 base power and strikes the nearest eligible enemy's cluster. Freeze uses 1,000 ms before the existing Snow multiplier, or 1,300 ms before other thaw effects. Neutral and Rain retain the original battlefield-wide Ice Age. |
| Blackbeard — Darkness | The battle begins, or Blackbeard finishes Tremor Crush against a live target. | Black Hole retains its original battlefield-wide damage, 20 Energy drain and pull. A resolved cast switches Blackbeard to Quake after those effects. |
| Blackbeard — Quake | Blackbeard resolves Black Hole against a live target. | Tremor Crush deals 220 base Special damage to the nearest eligible enemy's cluster. Resolving the cast returns him to Darkness. |

The initial battle snapshot records weather and starting forms. Later Blackbeard switches reuse the `unit-transform` event after cast effects and existing item/trait hooks. The original cooldown, Energy calculation and equipment continue across switches. Phoenix Feather restores the captured starting form. Both units retain their base economic identity and traits. GameContent is `1.37.0` on this isolated batch branch. Save schema is `6`.

## PAC reference

- **Adapted — Castform.** PAC selects a weather form before simulation. Kuzan reads the frozen battle weather at the same boundary. The local form exists only during combat, including when the same environment is used for Planner, PvE or ghost simulations. PAC's other weather forms, stats and persistent player transformation are reference only. [Pinned Castform source](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/colyseus-models/pokemon.ts#L6437-L6478)
- **Adapted — Morpeko.** PAC alternates form on Aura Wheel. Blackbeard alternates abilities after each resolved cast, retaining normal Energy and action timing. PAC's speed reward and damage curve are reference only. The portable combat simulator uses existing local form and event types. [Pinned Aura Wheel source](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/abilities/aura-wheel.ts#L7-L35)

## Presentation sources and export

Kuzan keeps his original tall silhouette, white coat and existing six B11 animation clips. The form adds Grim's original ice-crystal frames from *One Piece: Gigant Battle!* Blackbeard keeps his original coat, hat, barrel stance and six B11 clips from Megadoomer's *Great Pirate Colosseum* sheet. His two effects come from Grim and Kramlack's *Gigant Battle!* sheet. Darkness uses its violet ground wave. Quake uses its pale fracture and ring. [Aokiji by Grim](https://spritedatabase.net/file/12457) · [Blackbeard by Megadoomer](https://spritedatabase.net/file/21100) · [Blackbeard by Grim and Kramlack](https://spritedatabase.net/file/12635)

The project owner confirmed reuse of One Piece game sources on 2026-11-18 and supplied the Grim/Kramlack PNG on 2026-11-19. `node scripts/assets/build_weather_stance_forms.mjs` crops the pinned effects, removes the source background, scales with nearest-neighbor sampling and combines them with the existing B11 source poses. The Phaser form overlay uses the same effect art. All runtime files are local.

| Pinned input | SHA-256 |
| --- | --- |
| `art/licensed-reference/gigant-battle/Aokiji.png` | `d23730565bc07f66630512fdc610258fbba61be1cc32ed0139ff4aff4b531550` |
| `art/licensed-reference/gigant-battle/Blackbeard.png` | `4d1f16b798b2699e8420df84dbbe009ce6ff567a92e51a80eb7c0d9877aee7e5` |
| `art/licensed-reference/great-pirate-colosseum/Blackbeard.png` | `fe10cc08d6c957516b747de3217185265f9c57619212683dc4521673bc4962a6` |
| `art/production/b11/kuzan/master.png` | `450e7c677396db95326e0ba3bc2b77b0fe06819b7d493ba954a0fc93189c567a` |
| `art/production/b11/blackbeard/master.png` | `e77ad8951953cfc4fee7ee073289e462f26d6558641a89759bfe5dae2bbbee25` |

| Form asset under `public/assets/forms/` | SHA-256 |
| --- | --- |
| `kuzan-ice-form/portrait.svg` | `35ed84d529f9bd310e6493a4647b012b65a4980784d3d1f8f8fb257f0cfced73` |
| `kuzan-ice-form/token.svg` | `3f3f770ee42dc7075ce39da3647a30f867cab16cda4c6c7c662cae797bd567e8` |
| `kuzan-ice-form/overlay.svg` | `e5455a3fe15782c7975a518c4788c1088c4d034dacaf1b03469ab5c2a8f90f65` |
| `blackbeard-darkness/portrait.svg` | `845b1faecd785c992fe2e28ca77b935cfded0186139abac7c18135b9b4d1658a` |
| `blackbeard-darkness/token.svg` | `035bf8c85bc786f6c9fd6593c2ad81b49cebb048a83f270ff77c281695806f49` |
| `blackbeard-darkness/overlay.svg` | `c25108860e08bece2574069e53bbe48f104d7b3746488f3724008ebc257a6ccb` |
| `blackbeard-quake/portrait.svg` | `234451136ee73008ff3a33bddcf72abc09f176a8c2017040d086f8a68cccfccc` |
| `blackbeard-quake/token.svg` | `e2426235b4c464e1bc194cddd2bb3b59075e1505f70fff6ad7dc76c7e3068fc3` |
| `blackbeard-quake/overlay.svg` | `3eb726a3fa01d2d09766eaf15b4469065d1e20bd7f7fc76a63e6de5ee06512f4` |
