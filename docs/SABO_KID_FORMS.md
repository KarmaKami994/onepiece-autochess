# Battle forms for Sabo and Kid

## Combat rules

| Form | Condition | Effect |
| --- | --- | --- |
| Sabo — Flame Emperor | Once per fight, a direct enemy attack or ability deals HP damage and leaves Sabo alive below 30% of his effective maximum HP. | Fire Fist replaces Dragon Claw. It keeps 190 base power, targets a line, deals Special damage and applies Burn with base tick power 16 for 3 seconds. Sabo keeps his current HP, Energy, equipment and stats. A knockout ends the form, including when Phoenix Feather later revives Sabo. |
| Kid — Punk Rotten | At battle start, an allied Killer occupies a deployed cell sharing an edge with Kid. | Kid starts with 44 base Defense, 40 base Special Defense and range 1. Punk Vise deals 275 base Physical damage and stuns one nearby enemy for 600 ms. A diagonal Killer, an opposing Killer and movement after battle start do not activate the form. |

The simulator uses existing temporary form definitions. Kid's form is in the initial battle snapshot and remains part of his resurrection baseline. Sabo's hit triggers the existing `unit-transform` event and changes the targeting of a cast queued earlier in that tick. Shop identities, traits, star levels, shared pool, and persistent roster state use the base units. GameContent `1.36.0` reserves `1.35.0` for the concurrent Fish-Man pack. Save schema stays `6`.

## PAC references

The pinned PAC Darmanitan damage reaction is adapted into Sabo's low-HP trigger. PAC's HP/Power Point reset and relocation are reference-only. The pinned Mantyke/Remoraid proximity evolution is adapted into a temporary combat-start effect, using this game's orthogonal adjacency. No PAC stats, code, permanent evolution or server systems were imported. [Darmanitan damage reaction](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/effects/passives.ts#L365-L399) · [Mantyke / Remoraid check](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/colyseus-models/pokemon.ts#L16146-L16172)

## Sprite sources

**Sabo.** The existing six B11 animation clips keep Omega's original *One Piece: Great Pirate Colosseum* poses. The form adds a project-authored transparent fire layer. The portrait and token use the existing B11 `master.png` cropped to alpha, fitted into 64×76 with nearest-neighbor sampling and drawn centered at baseline y=112 over the same fire layer. The sheet and reuse permission were already recorded in `art/production/b11/sabo/selection.json`. [Sprite Database — Sabo, Omega](https://spritedatabase.net/file/21103)

| File | SHA-256 |
| --- | --- |
| `art/licensed-reference/great-pirate-colosseum/Sabo.png` | `4b94607b55371e078add120c002c6a37f6d6d9b10f2cdd7b4b36850198b33417` |
| `art/production/b11/sabo/master.png` | `1e16b18e4eccfa4cc795a3f1b52350cef6fcea8e62852ceb368f3d12cc819a58` |
| `public/assets/forms/sabo-flame-emperor/portrait.svg` | `41542fc197e60c3f7038b9d43fe91076843404c333c478fdd0390615fd7d28bd` |
| `public/assets/forms/sabo-flame-emperor/token.svg` | `38946eb78dd8107b0a94937cf3ab2e15f5b1574463933afb73a89b095ac11876` |
| `public/assets/forms/sabo-flame-emperor/overlay.svg` | `65b8b05437e64121291ea0931df07a7f782b971984a7be0ba1515ad10d7ec480` |

**Kid — Punk Rotten.** The reviewed Sprite Database releases depict base Kid and older attacks. The owner confirmed that the two Treasure Cruise candidates contain cutscene material without the complete form. Bounty Rush depicts the form during Punk Vise, and the public model index lacks a standalone export. The project uses a newly generated pixel drawing of the Wano design under the owner's One Piece asset-use attestation from 2026-11-18. Its three separated pieces preserve the floating skull torso, Kid's red hair, brass goggles and coat, and both detached scrap fists. [Sprite Database Kid](https://spritedatabase.net/file/15084) · [Treasure Cruise Kid & Killer](https://www.spriters-resource.com/mobile/onepiecetreasurecruise/asset/493638/) · [Treasure Cruise Kid](https://www.spriters-resource.com/mobile/onepiecetreasurecruise/asset/562023/) · [Bounty Rush model index](https://models.spriters-resource.com/mobile/onepiecebountyrush/) · [Official One Piece episode 1016](https://one-piece.com/anime/o6083/index.html) · [Official One Piece episode 1017](https://one-piece.com/anime/o6093/index.html)

Built-in ImageGen produced the transparent master. The [exact prompt](../art/production/kid-punk-rotten/prompt.md) and cut rectangles are pinned with the art. The deterministic export uses one viewport, a shared `(64,116)` pivot and independent integer offsets for the three parts. The 46-frame atlas uses all six semantic clips. The fists move toward each other during Punk Vise and fall away during defeat. The static portrait and token derive from the same drawing. The base Kid animation is the existing loading fallback.

Run `node scripts/assets/build_punk_rotten_poses.mjs` to regenerate the normalized pose board, frame map, portrait and token from the frozen master. Pack the runtime atlas with `node scripts/build_v2_assets.mjs --asset kid-punk-rotten`.

| Punk Rotten asset | SHA-256 |
| --- | --- |
| `art/production/kid-punk-rotten/master.png` | `42b74dfc24424e29e282c135a3feaac530e8d528a637506b360bc8495bbe415a` |
| `art/production/kid-punk-rotten/poses.png` | `de077d5571bceef7e086586c150967f8ba040583c897b3324a6d456c852f4b05` |
| `art/production/kid-punk-rotten/frame-map.json` | `d21b6991913b0cf71ca82712b2afcf6cf09da794e611260780a43cf9c941523d` |
| `public/assets/animations/kid-punk-rotten-v2/kid-punk-rotten-v2.png` | `a8d872ed5130b5b6cb69c982ea737cb4fb1f8012b38f6d65675062519116140d` |
| `public/assets/animations/kid-punk-rotten-v2/kid-punk-rotten-v2.json` | `dd9ecc4590da9e674916949bd742d884f85b0ed84ac5b6f2b5e014392013a5f3` |
| `public/assets/forms/kid-punk-rotten/portrait.svg` | `efb4d876f3364b9ca14ea3d102d4bdec8175a110ba096350ed6a3f7c2daa8886` |
| `public/assets/forms/kid-punk-rotten/token.svg` | `18794eb615359864f9a0573f2091c468838cbe5ddd36fa4bf72ce2365cfac0eb` |
| `public/assets/forms/kid-punk-rotten/overlay.svg` | `11b14229e50d189802c52bdcd8da39919c14c604130bb78b439744f89d2b59aa` |
