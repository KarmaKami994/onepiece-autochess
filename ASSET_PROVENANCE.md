# Asset provenance

## Use and rights notice

This non-commercial, localhost-only fan prototype has both original generated project art and the separately documented v2 crew derivatives below. It is not affiliated with or endorsed by Eiichiro Oda, Shueisha, Toei Animation, or any other One Piece rights holder. One Piece character names and recognizable character elements remain the property of their respective rights holders.

On `2026-08-14`, the project owner explicitly attested in the project conversation that the initial 17 listed source sheets may be used, adapted, and distributed in this public collaboration repository. Later source additions record their own permission basis in `art/animation-v2/source-matrix.json`. An owner attestation is not independent verification of chain of title; a Sprite Database URL is not treated as permission, and this repository grants no downstream asset license. The MIT license applies to code only. Reuse, redistribution, or commercialization of franchise or imported art requires its own appropriate rights clearance.

## B03 original offline audio

Two original instrumental loops, **Harbor at Dawn** (96 BPM, 20 seconds) and
**Grand Line Pursuit** (120 BPM, 16 seconds), are project-authored note sequences
and additive synthesis in `scripts/assets/build_b03_audio.mjs`. They use no
external melody, recording, sample or PAC asset. Permission basis: original
generated project audio, contributed for this repository under its terms.
Run `node scripts/assets/build_b03_audio.mjs` to reproduce the mono PCM16,
22,050 Hz WAVs. `public/assets/audio/manifest.json` records the exact note/bass
arrays, generator SHA-256, sizes, duration and generated hashes:

- `public/assets/audio/harbor.wav`: `0b0765db8fc867472161655d4fb15f65bf60f94ec2fbf095b47bb66ceb73544d`
- `public/assets/audio/pursuit.wav`: `678c07e47e69238fbab8d7ac9e55481a951fab3e50617d0dc7ab493c72160a8f`

Interface and combat cues are original oscillator/envelope definitions in
`app/useGameAudio.ts`; they are synthesized locally and have no sampled file.
B03 reuses existing form portraits/tokens/overlays and base animation clips;
its directional arrows, form accents and labels are code-drawn presentation.
No existing crew source or derivative is replaced.

## P12 named PvE encounters

P12 replaces the anonymous combat presentation in the eight PvE waves from rounds 9–40 with named bosses and matching faction enemies. The eight boss atlases use the exact, SHA-pinned local source sheets below; the eight faction minions are original deterministic vector/pixel compositions in `scripts/assets/build_p12_pve_assets.mjs`. Each of the 16 visual bases has a transparent `1024×768` atlas with 46 frames, a static enemy cutout, portrait, and token. Five extra combat-role profiles share their faction base atlas without duplicating image files. Source dimensions, contributor basis, source SHA-256, frame-map method, pivot, and permission note for every base are in `art/animation-v2/source-matrix.json`.

| Boss atlas | Source page | Contributor |
|---|---|---|
| Arlong | [Gigant Battle! file 12051](https://spritedatabase.net/file/12051) | Alejo |
| Enel | [Gigant Battle! 2 file 15207](https://spritedatabase.net/file/15207) | Grim |
| Rob Lucci | [Gigant Battle! 2 file 14627](https://spritedatabase.net/file/14627) | Grim |
| Magellan | [Gigant Battle! file 12485](https://spritedatabase.net/file/12485) | Grim |
| Hody Jones | [Gigant Battle! 2 file 14847](https://spritedatabase.net/file/14847) | Grim |
| Caesar Clown | [Great Pirate Colosseum file 21059](https://spritedatabase.net/file/21059) | Omega |
| Pica | [Great Pirate Colosseum file 21146](https://spritedatabase.net/file/21146) | Grim |
| Kaido | [Great Pirate Colosseum file 21137](https://spritedatabase.net/file/21137) | Megadoomer |

| Atlas key | Local source | Source SHA-256 | Atlas SHA-256 |
|---|---|---|---|
| `arlong-v2` | `art/licensed-reference/gigant-battle/Arlong.PNG` | `2d2dca0ffea6462a47c3cb56ec5c68b02b3e9072e4a1ca23cd9c44bc85b87fd2` | `2fdc66b232cf2dc973d9db1a351561fac8758f52ab876286d952782c10b6efc7` |
| `fish-man-raider-v2` | `public/assets/enemies/fish-man-raider.png` | `98c0fbe10760687a8d0d374666a3e6957dd27a13ab984da4aa280bea10b8f8fa` | `820cf6283a72ae36121ec2345574889d19e9049bd62fb1bc500e1914a789cba0` |
| `enel-v2` | `art/licensed-reference/gigant-battle-2/Enel.png` | `3e0d6f5930123fd26212af101e2bc4536abb8a791121d39412feb90e662d96c3` | `15addfd47ed3a89963179e35bdac79898f927649775ad11c4679b669fcc572a6` |
| `skypiea-priest-v2` | `public/assets/enemies/skypiea-priest.png` | `ef4acbb167707a8efccde3cd8994ee09eba7c6a38525d5f061a8477025311a7c` | `1eeda37a2c7a7f47fb4cb4c69a2e15a36978ac940a50c23d976b834eef8562b2` |
| `rob-lucci-v2` | `art/licensed-reference/gigant-battle-2/RobLucci.png` | `df73e9c50321649f5db252d86a5d9a5c504d13787980099d8bb718efd4f0a57a` | `49660a6d0b814bae9c62cf2d57af5a2d9e0d3eb888922890b454658c6cc0c898` |
| `cp9-elite-v2` | `public/assets/enemies/cp9-elite.png` | `c3667a1639a389e8163217733993f197e21762cb33a2be9da8ec019a4a2145ab` | `840a2fcc76fb30c586da92c70a7b1656a78b103a0c726acf6426af3f32352525` |
| `magellan-v2` | `art/licensed-reference/gigant-battle/Magellan.png` | `9ad3ac06697c731d37df7ad3f4025aedf298fe5e062bfbf5702462d6508b983b` | `bd3d3a1f38cfdf467386d91b86e2f9386a5d54e9545b2c01f8380cbf289cc793` |
| `impel-down-guard-v2` | `public/assets/enemies/impel-down-guard.png` | `3858021d5aad82cf91999a7fe0caace175551d93468d2453672a95415a5f3f24` | `81f4f5863e4fba4e3499493dfce9e0ebf44ee30c78fda33ece4210853e2555ee` |
| `hody-jones-v2` | `art/licensed-reference/gigant-battle-2/HodyJones.png` | `951c8489a717f445186e6758891853ee0b1abb5ee0c2b824375bc973aff9d31a` | `a109480d5f5d0b87b92bfc06dd0865565998d7dac543f4dcc08f6abf37dd49c7` |
| `new-fish-man-officer-v2` | `public/assets/enemies/new-fish-man-officer.png` | `ed7f39d55f360a3306b11a60b190617f55b5d2002313e63b1088fbfb520cdcaf` | `4aef0a15c4a7ccf874034ed78a573946cd533c0a49804f560ce3e66b76b08fd8` |
| `caesar-clown-v2` | `art/licensed-reference/great-pirate-colosseum/CaesarClown.png` | `45e594abd8d4f50cab78c65e29f316c7788f7c23dfedf79e3adfc59b668a71a1` | `11b9e77aaef721e01a04c4c4a7527bd64026003524c355b9ad869da84c601a9f` |
| `punk-hazard-guard-v2` | `public/assets/enemies/punk-hazard-guard.png` | `286c448cb41c3d78cba59721bd9a79b6aab1067428d8ec5de23d40c830302e59` | `9dd71165709aafe9b035f46c3390aa5bf18822481391a1e2059c1f0a8133d3fa` |
| `pica-v2` | `art/licensed-reference/great-pirate-colosseum/Pica.png` | `51b419bed175b54da00ca5eed01b8fb3385f2c2b163cd69329ef15746f23c2a7` | `5bb2658c9c1e58acc8b916a009c5834800c4ab8d0eae3acf07964306f4b106ae` |
| `donquixote-officer-v2` | `public/assets/enemies/donquixote-officer.png` | `132d020d58a64631a0e51d040cf63411df147185515c8364a0761fae60f1a27f` | `ad01354650ad58085a7233565804b5b18d42e0a519638cc8412312d408da6c9c` |
| `kaido-v2` | `art/licensed-reference/great-pirate-colosseum/Kaido.png` | `6d79b1b23f29ae8114551b7626b2dead05f186cd060795c258cef9fd30197458` | `0c9375fc29c32b45bc3b93282e77d9645d528e712813c0b6829daa166981e832` |
| `beast-pirate-v2` | `public/assets/enemies/beast-pirate.png` | `a75322629000bf2a36a98079ee13661bc7e5b1f4d0aba0991199eca395cc3fc9` | `48bb8ab34085a75a076c5c49de22679bce401a0bb7e2bbd3e17bbf1e925ca95f` |

The compact Great Pirate Colosseum sheets provide support poses, not complete full-body walk cycles. Pica therefore appears as a stone-head boss and Kaido as a large upper-body boss silhouette. Their missing motion frames are deterministic holds, offsets, and locally drawn effects; they are not presented as extracted source poses. The P12 contact sheet at `art/qa/p12-pve-contact-sheet.png` was inspected for alpha, pivot, silhouette, and readability. `npm run assets:p12` rebuilds all P12 assets without a GUI, external service, or runtime network request. Identical source inputs produced identical atlas and contact-sheet hashes on a second build.

## Roster-expansion placeholder

- Runtime asset: `public/assets/characters/placeholder.svg`
- Source: repository-authored clean-room SVG; external source artwork: none
- Purpose: generic future/custom-content fallback; no production unit or PvE definition references it after P7
- Added: `2026-08-28`

## P9 four-character expansion

P9 adds four SHA-pinned Sprite Database source sheets and deterministic project-owned derivatives. The two compact support sheets (Killer and Capone Bege) use their real detected character poses plus deterministic holds, integer offsets, and local hard-pixel effects; they do not borrow poses from another character. The retained licensed-reference PNG is the editable source for these four entries, so their runtime-only rebuild does not depend on LibreSprite. Static character, portrait, and token images are deterministically derived from each v2 idle presentation. The owner-attested permission record in `art/animation-v2/source-matrix.json` applies to this private/local project and grants no downstream asset license.

| Runtime asset | Exact source / contributor | Source SHA-256 | Atlas SHA-256 | Editable source |
|---|---|---|---|---|
| `killer-v2` | GPC [file 21141](https://spritedatabase.net/file/21141), Killer / Grim | `5c7d3ee4a50ca23638920408374a2715fecaa21dd19e09ec7c061d657f439b7e` | `8f07ce8c0a51a1517a233c9a4659f59852e2fbac6cbb4ccb3faec12cb63a1a6b` | `art/licensed-reference/great-pirate-colosseum/Killer.png` |
| `buggy-v2` | GB1 [file 12665](https://spritedatabase.net/file/12665), Buggy / Megadoomer | `87868d7d59052ce7acb5918700fbee965a64733a21e77d9a115769e55f019488` | `b66d8758c494c81532f34820c89a3a3de2b8b3c817e91470eacdfe2b71a350b8` | `art/licensed-reference/gigant-battle/Buggy.png` |
| `capone-bege-v2` | GB2 [file 14848](https://spritedatabase.net/file/14848), Capone Bege / Maverick PK | `47c3814a78435b17d46e7ef6707922e394af49ffb86d8434792b3baa44f03064` | `27a1def15b74907c3df9e8e952ad4dae84a57928e36ffe3ed73a61a8a203915d` | `art/licensed-reference/gigant-battle-2/CaponeBege.png` |
| `whitebeard-v2` | GB1 [file 12234](https://spritedatabase.net/file/12234), Whitebeard / Bonzai | `ddd0a667e316a59af02078c274bfaa7484157c5b2e8cbfc08c7d0a3a04f19dce` | `9df37f2ff2fc0e5dd0361b45ed6a3a390e4ba4d066f0530c4cd73dffdd276dc3` | `art/licensed-reference/gigant-battle/Whitebeard.png` |

The authoritative source matrix is `art/animation-v2/source-matrix.json`; the deterministic importers are `scripts/assets/build_v2_animation.mjs` and `scripts/build_v2_assets.mjs`. Exact runtime JSON hashes are `4ecb69f4dd0f28a9e91e538418e92789a0dd579924621071d13778478e0bee07` (Killer), `4cb952fbe90f7aee6904dc6d9dd47249bfc683cb0a9a8d6a9c6cf1af57027bd3` (Buggy), `ba0efc9badcb2adc16434da5f1b5832970c7563c5969fe8f826f759bf28b7d6b` (Capone Bege), and `1489e8d92c44e069863aae88059dc4f994f82481810e2064493102890311e9f0` (Whitebeard).

- Final asset: `public/assets/characters/killer.png`
- Final asset: `public/assets/characters/buggy.png`
- Final asset: `public/assets/characters/capone-bege.png`
- Final asset: `public/assets/characters/whitebeard.png`

## P7 major asset production

P7 completed the current runtime presentation inventory on `2026-09-10`. The exact import authority is `art/animation-v2/source-matrix.json`; it records local source paths, dimensions, source character names, file pages, contributors, SHA-256 values, permission basis, processing operations, recipes, and derived frame-map pointers. The project owner confirmed that written authorization exists for the applicable imported One Piece material for this private/local project. This record does not infer ownership, commercial rights, sublicensing rights, or a downstream license. Runtime and build operation are offline; source acquisition was a repository-development step only.

The 12 imported crew sheets are stored under `art/licensed-reference/`. Each 46-frame atlas is generated by `scripts/assets/build_v2_animation.mjs`, wrapped by `scripts/build_v2_assets.mjs`, with transparent output, nearest-neighbor resizing, integer placement, deterministic holds/offsets, and local hard-pixel effects. Koala uses the three actual support-sheet poses and deterministic supplementation; no source pose or substitute character was fabricated. Static character, portrait, and token images are derived from the declared v2 idle presentation by `scripts/assets/build_ui_icons.mjs`.

| Runtime asset | Exact source / contributor | Source SHA-256 | Atlas SHA-256 | Editable source |
|---|---|---|---|---|
| `koby-v2` | GB2 [file 14568](https://spritedatabase.net/file/14568), Coby / Maverick PK | `cfca587be1ade5c90bd6ab9716d4972b4ee056bfecd5ee8860efec4a1d133686` | `9a1a8bb503e4f026b785d62b40d865a17599106321bacb4051f5fb2f8161f063` | `art/libresprite/koby-v2.aseprite` |
| `koala-v2` | GPC [file 21048](https://spritedatabase.net/file/21048), Koala / Megadoomer | `7c94c32f406bd137a4cf403beaf3007f540b1e1092dde07817510a967702da6d` | `2a75d912aa04871c0172ef965d5d3a8a129e6bfd775e525a8ae2d4c1d32c282c` | `art/libresprite/koala-v2.aseprite` |
| `franky-v2` | GB2 [file 14569](https://spritedatabase.net/file/14569), Franky / Grim | `0e998a39a7a6ab2f187aac43c34aa45b62322ba636e2aa08af622023674c5d5e` | `32e109f8a9207cdfbbcf3371ecf62ff6221f25fbd5aac5a62715f2e437b91ffc` | `art/libresprite/franky-v2.aseprite` |
| `brook-v2` | GB2 [file 14899](https://spritedatabase.net/file/14899), Brook / Grim | `22990b7c8b9bd489f8893b97b4ed819dcdedd5698e40e429639e593dc3d98b2d` | `0e4100adc980b42c6c475a980c7c968819901a5df4e939ef610d6e4d2fe17f8c` | `art/libresprite/brook-v2.aseprite` |
| `ivankov-v2` | GB1 [file 12141](https://spritedatabase.net/file/12141), Emporio Ivankov / Bear+Shark4Ever | `4174b9d65297177304ff2b76c065d2c3aa7e7d2db2d3f48e6ed9cedeb296ec79` | `2e84626bca700066409a7d916d5ea443c3c43de75a1e65755327613b1ab3e551` | `art/libresprite/ivankov-v2.aseprite` |
| `jinbe-v2` | GB1 [file 12117](https://spritedatabase.net/file/12117), Jinbei / Grim | `6cc707315be5a9a08ecd9e94752abbce11dbf42987f67c11b226202c71958709` | `7af24b1d49a5cdb4ba5412616cf8c1e7d689447dcfb895120059fdaf575fc74c` | `art/libresprite/jinbe-v2.aseprite` |
| `kuma-v2` | GB1 [file 12379](https://spritedatabase.net/file/12379), Bartholomew Kuma / Grim | `81cf61b81ae38d3f7669aecb7e099ee241cd1a82a72c29be94b70cc9a0f96a02` | `681253290828697af7661ee2a6bedd7cd140aee880c21a2b12e54985be04c0c7` | `art/libresprite/kuma-v2.aseprite` |
| `kizaru-v2` | GB1 [file 9445](https://spritedatabase.net/file/9445), Kizaru / Bear+Shark4Ever | `6b565e6c46c0c5e5c1341e96e9b2c265e18c8f18b4aa1bdc6d7cfacf69000d3b` | `e5aa3e7e4a4d483be4a9a4bd95e64a1696e0a853e147d1083411b355f9558ac6` | `art/libresprite/kizaru-v2.aseprite` |
| `kuzan-v2` | GB1 [file 12457](https://spritedatabase.net/file/12457), Aokiji / Grim | `d23730565bc07f66630512fdc610258fbba61be1cc32ed0139ff4aff4b531550` | `ec0af44f9f917b4c590c48a68f360b9fc1c37441e1011a6853b901e16d16bc34` | `art/libresprite/kuzan-v2.aseprite` |
| `akainu-v2` | GB1 [file 12761](https://spritedatabase.net/file/12761), Akainu / garp | `cdba41806c41f0e5755fd83415b6217d01e67824fef6df2f6b285ce60838df5d` | `35dccbbdad4bb6b79b518d9900d2593568f33048977c0ed3a7c6f976896b8f7c` | `art/libresprite/akainu-v2.aseprite` |
| `shanks-v2` | GB2 [file 14509](https://spritedatabase.net/file/14509), Shanks / Grim | `b4e81c2233148720622130b957d6070a3789d0f7fe6c95af4052c0b6cc4e34c5` | `48d7ac4e255b723330662b5af15a5991ac544fa410950c8b3d0407a2b7b46b60` | `art/libresprite/shanks-v2.aseprite` |
| `blackbeard-v2` | GPC [file 21100](https://spritedatabase.net/file/21100), Blackbeard / Megadoomer | `fe10cc08d6c957516b747de3217185265f9c57619212683dc4521673bc4962a6` | `bf5987dcdeaaa1273e660d4c6a45fe9e1449f7c3dbf1e91bb26ff2617bbf24c5` | `art/libresprite/blackbeard-v2.aseprite` |

Final static crew assets:

- Final asset: `public/assets/characters/koby.png`
- Final asset: `public/assets/characters/koala.png`
- Final asset: `public/assets/characters/franky.png`
- Final asset: `public/assets/characters/brook.png`
- Final asset: `public/assets/characters/ivankov.png`
- Final asset: `public/assets/characters/jinbe.png`
- Final asset: `public/assets/characters/kuma.png`
- Final asset: `public/assets/characters/kizaru.png`
- Final asset: `public/assets/characters/kuzan.png`
- Final asset: `public/assets/characters/akainu.png`
- Final asset: `public/assets/characters/shanks.png`
- Final asset: `public/assets/characters/blackbeard.png`

The three new PvE identities are generic, repository-authored vector/pixel compositions produced deterministically by `scripts/assets/build_ui_icons.mjs`; no named playable character or external source pixels are used. Their v2 motion uses the same local procedural-cutout pipeline.

| Runtime asset | Source asset | Source SHA-256 | Atlas SHA-256 | Editable source |
|---|---|---|---|---|
| `vice-admiral-v2` | `public/assets/enemies/vice-admiral.png` | `9826cd26e02aa3fb8bd24c7b1a321b8657bcf1b05467b62a861f6138a2cde905` | `1d7ae63ea73b26258390104da6d330ebe643e0ee71586e9caac3811547c7a871` | `art/libresprite/vice-admiral-v2.aseprite` |
| `cipher-pol-agent-v2` | `public/assets/enemies/cipher-pol-agent.png` | `d8190e49e90340cef6b0ba6325f34e8bbf53ea861fa5c7a925a867c5a7804541` | `a2b8f60f1127c5f36310cf4e9071f6f0c9b4de3d065277ebd14e196b8a28ab72` | `art/libresprite/cipher-pol-agent-v2.aseprite` |
| `seraphim-v2` | `public/assets/enemies/seraphim.png` | `18f426b4962f3fb47a4d279a184620f831a9e38ea4d3d7de863c5ce38d9207f7` | `9370c5f1d045390746e6e99902e4513f3c9a81dd77c42a18b872f6f33cd0e2f4` | `art/libresprite/seraphim-v2.aseprite` |

- Final asset: `public/assets/enemies/vice-admiral.png`
- Final asset: `public/assets/enemies/cipher-pol-agent.png`
- Final asset: `public/assets/enemies/seraphim.png`

P7-authored UI art is generated from the explicit source specifications `art/ui-icons/item-icons.json`, `art/ui-icons/trait-icons.json`, and `art/ui-icons/status-icons.json`. `scripts/assets/build_ui_icons.mjs` emits 65 item SVGs, 13 trait SVGs, eight status SVGs, and portrait/token/overlay SVGs for all four existing forms. The generator also derives the 15 new static identity sets and four QA sheets under `art/qa/`. It uses stable spec order, fixed integer geometry, nearest-neighbor raster operations, no timestamps, no random source, no embedded images, and no network access.

B08 (2026-11-06) extends that project-authored status specification/generator with
four distinct original vector motifs: Poison, Freeze, Sleep and Locked. Current
output is twelve status SVGs; the four new files are `public/assets/status/poison.svg`,
`freeze.svg`, `sleep.svg` and `locked.svg`. The updated trait/status contact sheet is
`art/qa/p7-trait-status-contact-sheet.png`. No imported sheet pixels, crew assets or
external source are added. Source authority is the checked-in JSON specification
and integer SVG paths in the generator, under the existing project-authored basis.
Generation completed; visual inspection and asset validation are NOT RUN because
the owner declined B08 verification.

Abbreviations in this section: GB2 = *One Piece: Gigant Battle! 2 - New World*; GB1 = *One Piece: Gigant Battle!*; GPC = *One Piece: Great Pirate Colosseum*.

## Animation v2 source gate and PvE batch

- Source matrix: `art/animation-v2/source-matrix.json`
- Deterministic importer: `scripts/assets/build_v2_animation.mjs`
- Cross-platform headless batch wrapper: `scripts/build_v2_assets.mjs`
- Rebuild commands: `npm run assets:v2` for runtime PNG/JSON output or `npm run assets:v2:editable` when LibreSprite is available
- Runtime contract: 46 transparent `128×128` frames in an eight-column `1024×768` atlas; idle `0–5`, move `6–13`, attack `14–21`, cast `22–33`, hit `34–37`, defeat `38–45`; stable pivot `(64, 116)`
- Processing contract: exact solid-corner background removal, nearest-neighbor resizing only, integer placement, deterministic holds and offsets, code-drawn hard pixel effects, no runtime network request, and no external service

All 17 non-Luffy crew imports are built from the local, SHA-pinned sheets listed below. Contributor names were transcribed from each exact Sprite Database file page on `2026-08-14`. The matrix records the game/page, contributor and verification basis, local path, source SHA-256, owner attestation, pivot, processing recipe, and a stable `derivedFrameMap` pointer. Each generated runtime JSON contains all 46 selected source rectangles, source pivots, destinations, durations, and local supplements, so the reproducible frame map is reviewable without duplicating 782 rectangles in the matrix.

The importer uses deterministic connected-component selection. An auto-selected source rectangle may not exceed a `2.5:1` width-to-height ratio, which prevents text bars and detached effect strips from entering runtime atlases. The short Tashigi and Garp sheets expose 29 and 34 character-like candidates respectively after QA filtering; their missing poses are completed with deterministic holds, integer offsets, nearest-neighbor defeat compression, and locally drawn pixel effects. Existing 64×64 v1 assets remain checked in as fallbacks and in the Animation Lab. If a source is absent, its SHA changes, its permission is not buildable, or its frame-map strategy is missing, the importer reports `source missing -> v1 fallback` and emits no replacement. Luffy-v2 remains governed by its existing dedicated provenance and importer below.

Abbreviations: GB2 = *One Piece: Gigant Battle! 2 - New World*; GB1 = *One Piece: Gigant Battle!*; GPC = *One Piece: Great Pirate Colosseum*.

| Runtime asset | Source page / contributor | Source SHA-256 | Atlas SHA-256 | Editable source |
|---|---|---|---|---|
| `nami-v2` | [GB2 file 14763](https://spritedatabase.net/file/14763) / Grim | `a872516365fe5ef5ed358aeb2e15af073072170d768ce743d814df6caab1ebad` | `23c48476a9a4f28916c07837ae2f140435f81b13481e10e2db6589642046ab9c` | `art/libresprite/nami-v2.aseprite` |
| `usopp-v2` | [GB2 file 15108](https://spritedatabase.net/file/15108) / Maverick PK; Roger-Kun | `b44ebf20cc27c53478c0662441bbb54324f60438fcd9f7e701d1bc13cc006f95` | `434fcf58fb668f80460a3170e932263e0481905e9097cc38239cc67afd372259` | `art/libresprite/usopp-v2.aseprite` |
| `chopper-v2` | [GB2 file 14952](https://spritedatabase.net/file/14952) / Maverick PK | `a7ee521e96ca87767f83b102a0edaa13f934f533635507335141c0911267b1d6` | `b1219b4020567b725615efc49a8cd3634288008f8703baeb7b86211610f03cde` | `art/libresprite/chopper-v2.aseprite` |
| `sanji-v2` | [GB2 file 14802](https://spritedatabase.net/file/14802) / Grim | `241a47a601691a0d1ae43d55c9dc57b60021165dce9e18badc1e63f806273a30` | `0779f13402d7cac30a2442a1b3c1646b83aa2ba7fbdb8ecf9e147ea910ccd31f` | `art/libresprite/sanji-v2.aseprite` |
| `robin-v2` | [GB2 file 14846](https://spritedatabase.net/file/14846) / Maverick PK | `7d133c5d9d9e5e83e30179b527d2cb6110b95f5e6834ea9742a907b12c23f8a6` | `aab4df26b8fbdfbd7ffaee28118fa3dfc2d73ea8c675d7fa8d88223c0595a501` | `art/libresprite/robin-v2.aseprite` |
| `smoker-v2` | [GB2 file 14681](https://spritedatabase.net/file/14681) / Grim | `79eca65cb07d4b144561e6353bd8dcd75dd9fea86170d711fe243449e5d9020b` | `e1368ca22a017a82cd220fdd76698f56b7681a561dbd59996cec4485c6c60410` | `art/libresprite/smoker-v2.aseprite` |
| `kid-v2` | [GB2 file 15084](https://spritedatabase.net/file/15084) / rayleigh92 | `054d42e9c149ec6ab662a1f1a98add20851261a5a9ca32abbd24ced19436326a` | `16218fcaa10ceafecddfd2a1223dcb18eca205b60b2995f1a3ade55bc5ac55b8` | `art/libresprite/kid-v2.aseprite` |
| `zoro-v2` | [GB2 file 14764](https://spritedatabase.net/file/14764) / Heatpark; Maverick PK | `9c657fa9eaafd0b84d87185b30981723c22d58b5db4bfe263032b3ec772d3e76` | `6f5030dcc083cc0260b7e161ac9164cfa4118ce30eb603d79dafc6f5c39a99a2` | `art/libresprite/zoro-v2.aseprite` |
| `law-v2` | [GB2 file 14898](https://spritedatabase.net/file/14898) / Maverick PK | `74c54260ce78933c72460a909515224da249ea1f3f6504d68e51ff7ad3031164` | `2803a8cf60b710cab7ed8faa30b90b49fcbf1149c6714a5ee2a3af66eb2bebfd` | `art/libresprite/law-v2.aseprite` |
| `doflamingo-v2` | [GB2 file 14628](https://spritedatabase.net/file/14628) / Maverick PK | `9e96520fcd6db0020d5e6803467ee1e2d7b2fda3c30e65015c8794538f0069e9` | `393b164ea7ef689a36220741337f7ae9e0523e93c455d6ea5480ff3bd6f512d3` | `art/libresprite/doflamingo-v2.aseprite` |
| `tashigi-v2` | [GB1 file 12109](https://spritedatabase.net/file/12109) / Grim | `0e75f55363b5e15cfb5485fe911d8731d7c012c5d031339ecf52e62d6df30490` | `4cbbd573401b65893caf2a4aa924659bcdba731c59861e84160b4f9578e68152` | `art/libresprite/tashigi-v2.aseprite` |
| `crocodile-v2` | [GB1 file 12235](https://spritedatabase.net/file/12235) / Grim | `d6bad2cd20c653e2b73c75e07ade26010e79ab802848483cf758d5a29f4e359c` | `98ef4d4492401afc94add4f77f54b7b993b6f39422b62797c80c156721b6197b` | `art/libresprite/crocodile-v2.aseprite` |
| `ace-v2` | [GB1 file 12602](https://spritedatabase.net/file/12602) / Grim | `bae710da3f36816d5468d472f583afc1391340e43a2bde17a0e91e94a27edb2a` | `fc3ace66909715beec9a93930b246efcbe90205b77416017f5954fdd6fc71624` | `art/libresprite/ace-v2.aseprite` |
| `hancock-v2` | [GB1 file 12152](https://spritedatabase.net/file/12152) / Megadoomer | `dc20883d508bc1fc329ba3c7b0ee110786bf6c36b37f47019a15bc58a2ca2361` | `4ce428072da07a8ecf6a10b7da1b5c21aacc3adcf634bfe5c9978eb41ddc6e9e` | `art/libresprite/hancock-v2.aseprite` |
| `garp-v2` | [GB1 file 12056](https://spritedatabase.net/file/12056) / Grim | `ef044a99225cc4a784ae03824c0421665736317bc565d7d973386f80f54de980` | `b4ab4a887b4fd0f318b776458fa7c7691e5782cb4e6710883a8be807d109337e` | `art/libresprite/garp-v2.aseprite` |
| `mihawk-v2` | [GB1 file 12780](https://spritedatabase.net/file/12780) / Heatpark; Maverick PK | `204e5507fc8eb712b922a1a808bb418efe451eaba7f9f74358dba21aa9907a2b` | `7323b88e3211bc3abb360507e8d7d659d68710f822e956474f74683626103e37` | `art/libresprite/mihawk-v2.aseprite` |
| `sabo-v2` | [GPC file 21103](https://spritedatabase.net/file/21103) / Omega | `4b94607b55371e078add120c002c6a37f6d6d9b10f2cdd7b4b36850198b33417` | `a72dd13e26655f70a9defa7a7695a2990c00902c32dd7d07840fdb0d9d9069da` | `art/libresprite/sabo-v2.aseprite` |

The five PvE v2 atlases use only the already-provenanced original generated cutouts in `public/assets/enemies`. External PvE links in the matrix are catalog references with `usedInRuntime: false`; no pixels were downloaded or copied from them. Their additional motion is deliberately modest: integer bob/lunge/shake offsets, nearest-neighbor defeat compression, and local pixel-only attack/cast effects.

| Runtime asset | Source SHA-256 | Atlas SHA-256 | Editable source |
|---|---|---|---|
| `marine-recruit-v2` | `98e34d4774dfb2b97a43fb550430a3c254e60a071c8e62493cb0055f14406f45` | `a76a88c4e6d844fe5437220d27b7680f39aa9b83fd07595fe7c58f62129554c4` | `art/libresprite/marine-recruit-v2.aseprite` |
| `rifle-marine-v2` | `4d928c8a57d58c422756ef1f1d2346638fc14a527304a38749103442b9108d61` | `51f08916ad8e2771bc2cb889e611ac8a4ab06aef4e45986d8c41c6a27e8367f6` | `art/libresprite/rifle-marine-v2.aseprite` |
| `pirate-raider-v2` | `a9c6b4819d6df63a03c6fd07539fe642ce45662511b8c27b1d9cab405ae4f4c9` | `d0dc3f6b3549700c1000799aa111e88b098971b55207354d717b1de5182de370` | `art/libresprite/pirate-raider-v2.aseprite` |
| `pacifista-v2` | `25ae3cf6a9228f92d3acd6aa1e3de103392fb18c031c95164f57284eae450bd7` | `386d4fcde8fca0a8073716a96cc0bf9f224c2d62d11ddf020996e7f8e050d631` | `art/libresprite/pacifista-v2.aseprite` |
| `sea-king-v2` | `786f303d0b1b8b7be1c90e518ce1af5a5d066ad87f95726e8462cb51b3b19804` | `77164492d65ab24e660c1cd56ed44794d86c13af50dd39b75310542b409fafd8` | `art/libresprite/sea-king-v2.aseprite` |

## Generation and processing

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Generation model: `gpt-image-2` (embedded C2PA software-agent metadata reports `gpt-image`, version `2.0`)
- Source format: one independently generated PNG per character on a flat green chroma background
- Transparency tool: OpenAI image-generation chroma-key cleanup script
- Python runtime: local Python environment
- Cleanup options: `--auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force`
- Validation: each final PNG was visually inspected as an RGBA cutout; representative foreground and background pixels were also checked where dark artwork was difficult to distinguish on the previewer's black transparency matte.

## Nami

- Raw generation: `<local-generation-workspace>\019fac9b-f74e-7400-86e8-2b89fd61743b\call_DCSGrcNNe6192nBQCaPLaWkj.png`
- Final asset: `public/assets/characters/nami.png`
- Prompt:

```text
Use case: stylized-concept
Asset type: single playable board-unit sprite for a private local fan-game prototype
Primary request: Create one original fan-illustration sprite of Nami from One Piece, recognizable by her long orange hair, confident navigator stance, practical nautical adventurer outfit in navy, cream, and crimson accents, and a compact weather baton held clearly at her side.
Subject: exactly one character, full body from head to boots, three-quarter view, dynamic but compact ready-for-battle pose, strong silhouette readable when reduced to 80 pixels tall.
Style/medium: cohesive high-detail 32-bit-era pixel art; crisp deliberate pixel clusters; limited bold navy, antique-gold, cream, and crimson palette; subtle selective highlights; nautical fantasy; game-ready sprite, not painterly, not 3D, not traced, and do not emulate any named artist or studio.
Composition/framing: one centered upright character occupying about 80% of a square canvas, complete limbs and weapon visible, generous clean padding, no cropping, no sprite sheet, no duplicate views.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Constraints: keep the subject fully separated from the background with crisp hard pixel edges; do not use #00FF66 anywhere in the character; no cast shadow, contact shadow, reflection, scenery, particles, frame, interface, text, letters, logos, insignia, signature, or watermark; exactly one full-body character only.
```

## Usopp

- Raw generation: `<local-generation-workspace>\019fac9b-f74e-7400-86e8-2b89fd61743b\exec-465597da-7c59-440c-bcc2-bf4b60f2ce64.png`
- Final asset: `public/assets/characters/usopp.png`
- Prompt:

```text
Use case: stylized-concept
Asset type: single playable board-unit sprite for a private local fan-game prototype
Primary request: Create one original fan-illustration sprite of Usopp from One Piece, recognizable by his long nose, curly black hair under a pale bandana and goggles, wiry marksman build, patched nautical adventurer gear in navy, cream, antique-gold, and crimson accents, and a compact slingshot held clearly ready.
Subject: exactly one character, full body from head to boots, three-quarter view, dynamic but compact ready-for-battle pose, strong silhouette readable when reduced to 80 pixels tall.
Style/medium: cohesive high-detail 32-bit-era pixel art; crisp deliberate pixel clusters; limited bold navy, antique-gold, cream, and crimson palette; subtle selective highlights; nautical fantasy; game-ready sprite, not painterly, not 3D, not traced, and do not emulate any named artist or studio.
Composition/framing: one centered upright character occupying about 80% of a square canvas, complete limbs and weapon visible, generous clean padding, no cropping, no sprite sheet, no duplicate views.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Constraints: keep the subject fully separated from the background with crisp hard pixel edges; do not use #00FF66 anywhere in the character; no cast shadow, contact shadow, reflection, scenery, particles, frame, interface, text, letters, logos, insignia, signature, or watermark; exactly one full-body character only.
```

## Chopper

- Raw generation: `<local-generation-workspace>\019fac9b-f74e-7400-86e8-2b89fd61743b\call_QFb3EYXwHUJy1FkywYIzoKLk.png`
- Final asset: `public/assets/characters/chopper.png`
- Prompt:

```text
Use case: stylized-concept
Asset type: single playable board-unit sprite for a private local fan-game prototype
Primary request: Create one original fan-illustration sprite of Chopper from One Piece, recognizable as a small upright reindeer doctor with rounded antlers, expressive dark eyes, a rose-red oversized medical cap with a pale cross-shaped patch, a tiny satchel, and compact nautical adventurer clothing in navy, cream, antique-gold, and crimson accents.
Subject: exactly one character, full body from antlers to hooves, three-quarter view, lively but compact ready-to-help pose, strong silhouette readable when reduced to 80 pixels tall.
Style/medium: cohesive high-detail 32-bit-era pixel art; crisp deliberate pixel clusters; limited bold navy, antique-gold, cream, and crimson palette; subtle selective highlights; nautical fantasy; game-ready sprite, not painterly, not 3D, not traced, and do not emulate any named artist or studio.
Composition/framing: one centered upright character occupying about 76% of a square canvas, complete antlers, limbs, clothing, and satchel visible, generous clean padding, no cropping, no sprite sheet, no duplicate views.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Constraints: keep the subject fully separated from the background with crisp hard pixel edges; do not use #00FF66 anywhere in the character; no cast shadow, contact shadow, reflection, scenery, particles, frame, interface, text, letters, logos, signature, or watermark; exactly one full-body character only.
```

## Tashigi

- Raw generation: `<local-generation-workspace>\019fac9b-f74e-7400-86e8-2b89fd61743b\call_XBl9gA2DfI4Hg3mp45H03Hc4.png`
- Final asset: `public/assets/characters/tashigi.png`
- Prompt:

```text
Use case: stylized-concept
Asset type: single playable board-unit sprite for a private local fan-game prototype
Primary request: Create one original fan-illustration sprite of Tashigi from One Piece, recognizable by her short dark-blue bob haircut, rectangular glasses, focused expression, fitted white naval-officer jacket over dark trousers, crimson neck scarf, and a sheathed katana drawn into a disciplined guard stance. Use navy, cream, antique-gold, and crimson accents without any official emblems.
Subject: exactly one character, full body from head to boots, three-quarter view, compact precise swordswoman pose, strong silhouette readable when reduced to 80 pixels tall.
Style/medium: cohesive high-detail 32-bit-era pixel art; crisp deliberate pixel clusters; limited bold navy, antique-gold, cream, and crimson palette; subtle selective highlights; nautical fantasy; game-ready sprite, not painterly, not 3D, not traced, and do not emulate any named artist or studio.
Composition/framing: one centered upright character occupying about 80% of a square canvas, complete limbs, glasses, sword, scabbard, and boots visible, generous clean padding, no cropping, no sprite sheet, no duplicate views.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Constraints: keep the subject fully separated from the background with crisp hard pixel edges; do not use #00FF66 anywhere in the character; no cast shadow, contact shadow, reflection, scenery, particles, frame, interface, text, letters, logos, official insignia, signature, or watermark; exactly one full-body character only.
```

## Zoro

- Raw generation: `<local-generation-workspace>\019fac9b-f74e-7400-86e8-2b89fd61743b\call_zR24R2fAnAEhYHPbUjTilDAW.png`
- Final asset: `public/assets/characters/zoro.png`
- Prompt:

```text
Use case: stylized-concept
Asset type: single playable board-unit sprite for a private local fan-game prototype
Primary request: Create one original fan-illustration sprite of Zoro from One Piece, recognizable by his short dark moss-green hair, stern one-eyed swordsman expression with a small diagonal eye scar, athletic build, dark navy waist sash and open nautical fighter coat, and his signature three-sword fighting kit: one katana held low in each hand and a third sheathed at his hip. Use deep moss green only, never bright chroma green, with navy, cream, antique-gold, and crimson accents.
Subject: exactly one character, full body from head to boots, three-quarter view, compact grounded dual-sword guard pose, strong silhouette readable when reduced to 80 pixels tall.
Style/medium: cohesive high-detail 32-bit-era pixel art; crisp deliberate pixel clusters; limited bold navy, antique-gold, cream, deep moss-green, and crimson palette; subtle selective highlights; nautical fantasy; game-ready sprite, not painterly, not 3D, not traced, and do not emulate any named artist or studio.
Composition/framing: one centered upright character occupying about 78% of a square canvas, complete limbs and exactly three swords visible, generous clean padding, no cropping, no sprite sheet, no duplicate views.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Constraints: keep the subject fully separated from the background with crisp hard pixel edges; do not use #00FF66 or any neon green anywhere in the character; no cast shadow, contact shadow, reflection, scenery, particles, frame, interface, text, letters, logos, official insignia, signature, or watermark; exactly one full-body character only.
```

## Kid

- Raw generation: `<local-generation-workspace>\019fac9b-f74e-7400-86e8-2b89fd61743b\call_XDi5MgwruYvWtLYLZjASqdyg.png`
- Final asset: `public/assets/characters/kid.png`
- Prompt:

```text
Use case: stylized-concept
Asset type: single playable board-unit sprite for a private local fan-game prototype
Primary request: Create one original fan-illustration sprite of Kid from One Piece, recognizable by his wild spiked crimson hair, bronze goggles pushed above his brow, broad muscular pirate build, long dark open coat with fur-trimmed collar, heavy belts and boots, and one oversized improvised mechanical forearm assembled from dark iron plates and antique-brass fittings. Use navy, cream, antique-gold, iron, and crimson accents without any official emblems.
Subject: exactly one character, full body from head to boots, three-quarter view, compact aggressive brawler stance with the mechanical arm raised beside the torso rather than sprawling, strong silhouette readable when reduced to 80 pixels tall.
Style/medium: cohesive high-detail 32-bit-era pixel art; crisp deliberate pixel clusters; limited bold navy, antique-gold, cream, iron-gray, and crimson palette; subtle selective highlights; nautical fantasy; game-ready sprite, not painterly, not 3D, not traced, and do not emulate any named artist or studio.
Composition/framing: one centered upright character occupying about 78% of a square canvas, complete limbs, coat, boots, and mechanical arm visible, generous clean padding, no cropping, no sprite sheet, no duplicate views.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Constraints: keep the subject fully separated from the background with crisp hard pixel edges; do not use #00FF66 anywhere in the character; no detached metal debris, cast shadow, contact shadow, reflection, scenery, particles, frame, interface, text, letters, logos, official insignia, signature, or watermark; exactly one full-body character only.
```

## Crocodile

- Raw generation: `<local-generation-workspace>\019fac9b-f74e-7400-86e8-2b89fd61743b\call_wOgYcyPk7JDPTIIstyfLVy46.png`
- Final asset: `public/assets/characters/crocodile.png`
- Prompt:

```text
Use case: stylized-concept
Asset type: single playable board-unit sprite for a private local fan-game prototype
Primary request: Create one original fan-illustration sprite of Crocodile from One Piece, recognizable by slicked-back black hair, a stern weathered face with a long horizontal facial scar, a dark high-collared long coat with pale fur trim, tailored nautical crime-lord attire, and one large polished antique-gold hook replacing his left hand. A short unlit cigar may rest at one corner of his mouth with no smoke. Use navy, cream, antique-gold, and deep crimson accents without any official emblems.
Subject: exactly one character, full body from head to dress shoes, three-quarter view, compact imposing tactician stance with the gold hook held clearly beside the torso, strong silhouette readable when reduced to 80 pixels tall.
Style/medium: cohesive high-detail 32-bit-era pixel art; crisp deliberate pixel clusters; limited bold navy, antique-gold, cream, and crimson palette; subtle selective highlights; nautical fantasy; game-ready sprite, not painterly, not 3D, not traced, and do not emulate any named artist or studio.
Composition/framing: one centered upright character occupying about 80% of a square canvas, complete limbs, long coat, shoes, and hook visible, generous clean padding, no cropping, no sprite sheet, no duplicate views.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Constraints: keep the subject fully separated from the background with crisp hard pixel edges; do not use #00FF66 anywhere in the character; no sand effects, smoke, cast shadow, contact shadow, reflection, scenery, particles, frame, interface, text, letters, logos, official insignia, signature, or watermark; exactly one full-body character only.
```

## Sanji

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facdc-a97b-7e11-89cb-8327edb17466\call_2RYWJk6nSsBeBhBbYrDvEprD.png`
- Final asset: `public/assets/characters/sanji.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facdc-a97b-7e11-89cb-8327edb17466\call_2RYWJk6nSsBeBhBbYrDvEprD.png' --out 'public\assets\characters\sanji.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `864×1821`; all four corner alpha values are `0`; foreground alpha bounding box is `(87, 86, 748, 1697)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: local auto-battler full-body character sprite source
Primary request: Create an original fan-game interpretation of Sanji as one full-body 32-bit pixel-art character cutout.
Scene/backdrop: perfectly flat, uniform pure #00FF66 chroma-key background for local removal; no floor plane.
Subject: a lean blond pirate cook and kick-fighter, side-swept golden hair covering one eye, distinctive curled eyebrow, sharp confident expression, fitted dark navy double-breasted suit with subtle brass-gold buttons, cobalt shirt and narrow tie, polished black shoes; poised in a readable three-quarter combat stance with one leg slightly lifted for a kick and a tiny contained crimson-orange ember accent around that shoe only.
Style/medium: crisp handcrafted 32-bit arcade-RPG pixel art, enlarged deliberate pixel clusters, limited shading, clean readable silhouette, original nautical-fantasy fan illustration; do not imitate any named artist or animation studio.
Composition/framing: exactly one centered character, full body from hair to both shoes visible, generous padding on every side, upright portrait composition, strong silhouette and facial read when reduced to 80 px tall, no cropped limbs.
Color palette: deep navy, brass gold, crimson accents, warm skin, golden blond; do not use #00FF66 anywhere in the subject.
Constraints: background must remain a single exact flat color with no gradients, texture, lighting variation, reflections, haze, cast shadow, contact shadow, or glow spilling onto it; crisp separated edges; no text, letters, logos, symbols, watermark, border, UI, scenery, extra characters, detached objects, or duplicated body parts.
```

## Robin

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facdc-a97b-7e11-89cb-8327edb17466\call_70tsKo8bWtfViGpCFEpBej94.png`
- Final asset: `public/assets/characters/robin.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facdc-a97b-7e11-89cb-8327edb17466\call_70tsKo8bWtfViGpCFEpBej94.png' --out 'public\assets\characters\robin.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `941×1672`; all four corner alpha values are `0`; foreground alpha bounding box is `(115, 61, 819, 1611)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: local auto-battler full-body character sprite source
Primary request: Create an original fan-game interpretation of Robin as one full-body 32-bit pixel-art character cutout, matching a nautical fantasy roster.
Scene/backdrop: perfectly flat, uniform pure #00FF66 chroma-key background for local removal; no floor plane.
Subject: a tall poised archaeologist and tactical pirate woman with long straight jet-black hair, cool blue eyes, calm knowing expression, fitted midnight-navy long coat over a deep-violet top and elegant knee-length skirt, crimson sash, brass-gold belt details, dark high boots; hands naturally crossed near her waist in a composed three-quarter combat-ready stance. Keep exactly two arms and two hands.
Style/medium: crisp handcrafted 32-bit arcade-RPG pixel art, enlarged deliberate pixel clusters, limited shading, clean readable silhouette, original nautical-fantasy fan illustration; do not imitate any named artist or animation studio.
Composition/framing: exactly one centered character, full body from hair to both boots visible, generous padding on every side, upright portrait composition, strong silhouette and face/outfit read when reduced to 80 px tall, no cropped limbs.
Color palette: deep navy, rich violet, brass gold, restrained crimson accents, warm skin, black hair; do not use #00FF66 anywhere in the subject.
Constraints: background must remain a single exact flat color with no gradients, texture, lighting variation, reflections, haze, cast shadow, contact shadow, or glow; crisp separated edges; no text, letters, logos, emblems, watermark, border, UI, scenery, flowers, extra arms, extra hands, extra characters, detached objects, or duplicated body parts.
```

## Smoker

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facdc-a97b-7e11-89cb-8327edb17466\call_ZMyP4q52euE61OHz3nh2AVJG.png`
- Final asset: `public/assets/characters/smoker.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facdc-a97b-7e11-89cb-8327edb17466\call_ZMyP4q52euE61OHz3nh2AVJG.png' --out 'public\assets\characters\smoker.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1024×1536`; all four corner alpha values are `0`; foreground alpha bounding box is `(50, 54, 972, 1466)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: local auto-battler full-body character sprite source
Primary request: Create an original fan-game interpretation of Smoker as one full-body 32-bit pixel-art character cutout, matching a nautical fantasy roster.
Scene/backdrop: perfectly flat, uniform pure #00FF66 chroma-key background for local removal; no floor plane.
Subject: a broad-shouldered stern naval enforcer with cropped spiky white hair, rugged face and square jaw, an open white officer coat with deep-navy lining and brass-gold epaulets worn cape-like over a scarred bare chest, navy trousers tucked into heavy black boots, crimson sash; one unlit twin cigar at the corner of his mouth with absolutely no smoke; gripping one long dark sea-prism baton diagonally close to his body in a grounded three-quarter battle stance.
Style/medium: crisp handcrafted 32-bit arcade-RPG pixel art, enlarged deliberate pixel clusters, limited shading, clean readable silhouette, original nautical-fantasy fan illustration; do not imitate any named artist or animation studio.
Composition/framing: exactly one centered character and one held baton, full body from hair to both boots visible, baton fully inside canvas, generous padding on every side, upright portrait composition, strong silhouette and face/outfit read when reduced to 80 px tall, no cropped limbs.
Color palette: deep navy, bone white, brass gold, restrained crimson accents, warm skin, white hair; do not use #00FF66 anywhere in the subject.
Constraints: background must remain a single exact flat color with no gradients, texture, lighting variation, reflections, haze, smoke, cast shadow, contact shadow, or glow; crisp separated edges; no text, letters, logos, naval emblems, watermark, border, UI, scenery, extra weapons, extra characters, detached objects, or duplicated body parts.
```

## Sabo

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facdc-a97b-7e11-89cb-8327edb17466\call_Ifa3lF9NdK7zrDV1nqRqSxu8.png`
- Final asset: `public/assets/characters/sabo.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facdc-a97b-7e11-89cb-8327edb17466\call_Ifa3lF9NdK7zrDV1nqRqSxu8.png' --out 'public\assets\characters\sabo.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1024×1536`; all four corner alpha values are `0`; foreground alpha bounding box is `(116, 51, 933, 1471)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: local auto-battler full-body character sprite source
Primary request: Create an original fan-game interpretation of Sabo as one full-body 32-bit pixel-art character cutout, matching a nautical fantasy roster.
Scene/backdrop: perfectly flat, uniform pure #00FF66 chroma-key background for local removal; no floor plane.
Subject: a lean athletic blond revolutionary fighter with wavy golden hair, a tall dark-navy top hat fitted with brass goggles, determined friendly face, long navy tailcoat with brass trim over a crimson waistcoat and pale cravat, dark trousers, gloves and high boots; holding one simple dark metal pipe staff close and diagonally across his body in a confident three-quarter battle stance, with one tiny contained crimson-orange spark at his free gloved fist and no smoke.
Style/medium: crisp handcrafted 32-bit arcade-RPG pixel art, enlarged deliberate pixel clusters, limited shading, clean readable silhouette, original nautical-fantasy fan illustration; do not imitate any named artist or animation studio.
Composition/framing: exactly one centered character and one held pipe staff, full body from top hat to both boots visible, staff fully inside canvas, generous padding on every side, upright portrait composition, strong silhouette and face/outfit read when reduced to 80 px tall, no cropped limbs.
Color palette: deep navy, brass gold, crimson accents, pale cream, warm skin, golden blond; do not use #00FF66 anywhere in the subject.
Constraints: background must remain a single exact flat color with no gradients, texture, lighting variation, reflections, haze, smoke, cast shadow, contact shadow, or glow spilling onto it; crisp separated edges; no text, letters, logos, revolutionary emblems, watermark, border, UI, scenery, extra weapons, extra characters, detached objects, or duplicated body parts.
```

## Luffy

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facdc-a97b-7e11-89cb-8327edb17466\call_CRdLy6HCoxZvyRs53Mc8B8Qi.png`
- Final asset: `public/assets/characters/luffy.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facdc-a97b-7e11-89cb-8327edb17466\call_CRdLy6HCoxZvyRs53Mc8B8Qi.png' --out 'public\assets\characters\luffy.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1024×1536`; all four corner alpha values are `0`; foreground alpha bounding box is `(141, 107, 821, 1373)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: local auto-battler full-body character sprite source
Primary request: Create an original fan-game interpretation of Luffy as one full-body 32-bit pixel-art character cutout, matching a nautical fantasy roster.
Scene/backdrop: perfectly flat, uniform pure #00FF66 chroma-key background for local removal; no floor plane.
Subject: a wiry athletic young pirate captain with messy black hair under a round straw hat with a crimson band, bright fearless grin, small cheek scar, open sleeveless crimson vest, yellow sash, cuffed deep-blue knee shorts, simple brown sandals; compact grounded three-quarter brawler stance with both normal-size fists raised, one slightly forward, no stretched limbs.
Style/medium: crisp handcrafted 32-bit arcade-RPG pixel art, enlarged deliberate pixel clusters, limited shading, clean readable silhouette, original nautical-fantasy fan illustration; do not imitate any named artist or animation studio.
Composition/framing: exactly one centered character, full body from straw hat to both sandals visible, generous padding on every side, upright portrait composition, strong iconic silhouette and face/outfit read when reduced to 80 px tall, no cropped limbs.
Color palette: deep navy, straw gold, saturated crimson, warm skin, black hair, small brass-gold accents; do not use #00FF66 anywhere in the subject.
Constraints: background must remain a single exact flat color with no gradients, texture, lighting variation, reflections, haze, cast shadow, contact shadow, or glow; crisp separated edges; no text, letters, logos, skull symbols, emblems, watermark, border, UI, scenery, aura, extra characters, detached objects, elongated arms, extra limbs, or duplicated body parts.
```

## Marine Recruit

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facf3-bb57-7d33-9c3f-26be485d3f6e\call_jVQy7muanYfyUTKl4FnBgwTL.png`
- Final asset: `public/assets/enemies/marine-recruit.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facf3-bb57-7d33-9c3f-26be485d3f6e\call_jVQy7muanYfyUTKl4FnBgwTL.png' --out 'public\assets\enemies\marine-recruit.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1024×1536`; all four corner alpha values are `0`; foreground alpha bounding box is `(142, 68, 841, 1477)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: single PvE board-enemy sprite for a private local nautical auto-battler prototype
Primary request: Create one original generic Marine Recruit enemy as a full-body 32-bit-era pixel-art game cutout. This is an original fan-game archetype, not a specific named character.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for local removal. The background must be exactly one uniform color with no shadows, gradients, texture, reflections, floor plane, haze, or lighting variation.
Subject: exactly one young adult naval deck recruit with a sturdy compact build, alert determined expression, short dark hair, simple cream sailor cap with no lettering, cream-and-navy double-breasted deck uniform with rolled sleeves, brass-gold buttons, deep-navy trousers, crimson neckerchief, and dark boots. He holds one short wooden training cutlass close to his body in a grounded three-quarter ready stance. No official emblem or text.
Style/medium: cohesive high-detail 32-bit arcade-RPG pixel art; enlarged crisp deliberate pixel clusters, limited shading, bold deep-navy, cream, antique-brass, brown, and restrained crimson palette; readable nautical-fantasy silhouette; game-ready sprite; original illustration, not painterly, not 3D, not traced, and do not imitate any named artist or studio.
Composition/framing: one centered upright character occupying about 78% of a portrait-oriented canvas; full body from cap to both boots visible; cutlass fully inside frame; generous clean padding on all sides; no cropping, no sprite sheet, no duplicate views.
Constraints: keep subject fully separated from background with crisp hard pixel edges; do not use #00FF66 or neon green anywhere in the subject; no cast shadow, contact shadow, reflection, scenery, particles, glow, frame, interface, letters, logos, symbols, insignia, signature, watermark, extra characters, detached objects, or duplicated body parts; exactly one full-body enemy only.
```

## Rifle Marine

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facf3-bb57-7d33-9c3f-26be485d3f6e\call_S9B2FK2YTxmIzSkdlxZSAitM.png`
- Final asset: `public/assets/enemies/rifle-marine.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facf3-bb57-7d33-9c3f-26be485d3f6e\call_S9B2FK2YTxmIzSkdlxZSAitM.png' --out 'public\assets\enemies\rifle-marine.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1024×1536`; all four corner alpha values are `0`; foreground alpha bounding box is `(156, 76, 963, 1473)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: single PvE board-enemy sprite for a private local nautical auto-battler prototype
Primary request: Create one original generic Rifle Marine enemy as a full-body 32-bit-era pixel-art game cutout. This is an original fan-game archetype, not a specific named character.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for local removal. The background must be exactly one uniform color with no shadows, gradients, texture, reflections, floor plane, haze, or lighting variation.
Subject: exactly one adult naval sharpshooter with a lean disciplined build, focused expression, short dark hair beneath a simple cream sailor cap with no lettering, a cream long naval coat with deep-navy lapels and cuffs, brass-gold fasteners, navy trousers, restrained crimson neckerchief, and dark boots. He holds exactly one long antique wood-and-brass flintlock rifle diagonally and close across his torso, barrel pointed safely upward, in a stable three-quarter marksman stance. No official emblem or text.
Style/medium: cohesive high-detail 32-bit arcade-RPG pixel art; enlarged crisp deliberate pixel clusters, limited shading, bold deep-navy, cream, antique-brass, warm brown, and restrained crimson palette; readable nautical-fantasy silhouette; game-ready sprite; original illustration, not painterly, not 3D, not traced, and do not imitate any named artist or studio.
Composition/framing: one centered upright character occupying about 76% of a portrait-oriented canvas; full body from cap to both boots visible; entire rifle fully inside frame; generous clean padding on all sides; no cropping, no sprite sheet, no duplicate views.
Constraints: keep subject fully separated from background with crisp hard pixel edges; do not use #00FF66 or neon green anywhere in subject; no muzzle flash, smoke, cast shadow, contact shadow, reflection, scenery, particles, glow, frame, interface, letters, logos, symbols, insignia, signature, watermark, extra weapons, extra characters, detached objects, or duplicated body parts; exactly one full-body enemy only.
```

## Pirate Raider

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facf3-bb57-7d33-9c3f-26be485d3f6e\call_YrvWwoatkj2K8DLT5FJx1gFR.png`
- Final asset: `public/assets/enemies/pirate-raider.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facf3-bb57-7d33-9c3f-26be485d3f6e\call_YrvWwoatkj2K8DLT5FJx1gFR.png' --out 'public\assets\enemies\pirate-raider.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1024×1536`; all four corner alpha values are `0`; foreground alpha bounding box is `(111, 81, 916, 1458)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: single PvE board-enemy sprite for a private local nautical auto-battler prototype
Primary request: Create one original generic Pirate Raider enemy as a full-body 32-bit-era pixel-art game cutout. This is an original fan-game archetype, not a specific named character.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for local removal. The background must be exactly one uniform color with no shadows, gradients, texture, reflections, floor plane, haze, or lighting variation.
Subject: exactly one rugged adult pirate deck raider with a stocky muscular build, weathered face, short dark beard, dark hair under a crimson bandana with no symbol, patched sleeveless deep-navy coat over a cream shirt, wide antique-brass belt buckle, dark cropped trousers, worn leather boots, and rope wrist wraps. He grips exactly one compact boarding axe with a dark iron head and wood handle held close beside his torso in a low three-quarter charging stance. No official emblem, skull, or text.
Style/medium: cohesive high-detail 32-bit arcade-RPG pixel art; enlarged crisp deliberate pixel clusters, limited shading, bold deep-navy, cream, antique-brass, iron-gray, warm brown, and crimson palette; readable nautical-fantasy silhouette; game-ready sprite; original illustration, not painterly, not 3D, not traced, and do not imitate any named artist or studio.
Composition/framing: one centered upright character occupying about 78% of a portrait-oriented canvas; full body from bandana to both boots visible; entire axe fully inside frame; generous clean padding on all sides; no cropping, no sprite sheet, no duplicate views.
Constraints: keep subject fully separated from background with crisp hard pixel edges; do not use #00FF66 or neon green anywhere in subject; no cast shadow, contact shadow, reflection, scenery, particles, glow, frame, interface, letters, logos, skulls, symbols, insignia, signature, watermark, extra weapons, extra characters, detached objects, or duplicated body parts; exactly one full-body enemy only.
```

## Sea King

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facf3-bb57-7d33-9c3f-26be485d3f6e\call_GFcPjj9BqtPXK5cY4eBCoOG7.png`
- Final asset: `public/assets/enemies/sea-king.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facf3-bb57-7d33-9c3f-26be485d3f6e\call_GFcPjj9BqtPXK5cY4eBCoOG7.png' --out 'public\assets\enemies\sea-king.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1024×1536`; all four corner alpha values are `0`; foreground alpha bounding box is `(113, 26, 952, 1488)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: single PvE boss board-enemy sprite for a private local nautical auto-battler prototype
Primary request: Create one original Sea King enemy as a complete full-body 32-bit-era pixel-art game cutout: a compact mythical ocean predator suitable for a midgame PvE wave, not a specific existing named creature.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for local removal. The background must be exactly one uniform color with no shadows, gradients, texture, reflections, water, floor plane, haze, or lighting variation.
Subject: exactly one large serpentine sea beast with a broad dragon-like head, short ivory swept horns, deep indigo and midnight-navy plated scales, a warm cream belly, crimson-red fin crest and tail fins, antique-gold eyes, thick jaws with a few ivory teeth, two compact clawed forelimbs, and a powerful curled tail. Pose the entire creature upright in a tight readable S-curve with head facing three-quarter toward the viewer, mouth slightly open in a threatening battle-ready expression. Keep all fins, horns, claws, and tail attached and visible.
Style/medium: cohesive high-detail 32-bit arcade-RPG pixel art; enlarged crisp deliberate pixel clusters, limited shading, bold deep-navy, indigo, cream, antique-gold, ivory, and crimson palette; readable nautical-fantasy boss silhouette; game-ready sprite; original illustration, not painterly, not 3D, not traced, and do not imitate any named artist or studio.
Composition/framing: one centered complete creature occupying about 78% of a portrait-oriented canvas; full silhouette from horns to tail tip visible; compact vertical S-curve; generous clean padding on every side; no cropping, no sprite sheet, no duplicate views.
Constraints: keep subject fully separated from background with crisp hard pixel edges; do not use #00FF66, bright green, or neon green anywhere in subject; no water, splash, foam, bubbles, smoke, cast shadow, contact shadow, reflection, scenery, particles, aura, frame, interface, letters, logos, symbols, signature, watermark, rider, extra creatures, detached pieces, or duplicated limbs; exactly one complete sea monster only.
```

## Pacifista

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facf3-bb57-7d33-9c3f-26be485d3f6e\call_z18JqMxXUstHgLE1cUihC8S6.png`
- Final asset: `public/assets/enemies/pacifista.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facf3-bb57-7d33-9c3f-26be485d3f6e\call_z18JqMxXUstHgLE1cUihC8S6.png' --out 'public\assets\enemies\pacifista.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1024×1536`; all four corner alpha values are `0`; foreground alpha bounding box is `(44, 65, 975, 1452)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: single late-wave PvE boss board-enemy sprite for a private local nautical auto-battler fan prototype
Primary request: Create one original fan-game interpretation of a Pacifista as a complete full-body 32-bit-era pixel-art game cutout: an enormous government-built human-shaped cyborg enforcer, visually distinct and readable as a late-wave boss.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for local removal. The background must be exactly one uniform color with no shadows, gradients, texture, reflections, floor plane, haze, or lighting variation.
Subject: exactly one towering broad-shouldered humanoid cyborg with a stern square face, small round dark spectacles, short black hair beneath a compact dark cap with two subtle rounded bear-ear shapes, and a heavy long deep-navy-and-cream armored coat with antique-brass rivets and crimson lining over reinforced dark trousers and massive boots. Both oversized hands are visible; one palm faces slightly forward and contains a simple circular brass energy-port detail, while the other hangs clenched beside the torso. Add restrained segmented mechanical seams at neck and wrists, no official emblem or lettering.
Style/medium: cohesive high-detail 32-bit arcade-RPG pixel art; enlarged crisp deliberate pixel clusters, limited shading, bold deep-navy, cream, antique-brass, iron-gray, black, and restrained crimson palette; imposing nautical-tech boss silhouette; game-ready sprite; original fan illustration, not painterly, not 3D, not traced, and do not imitate any named artist or studio.
Composition/framing: one centered upright figure occupying about 82% of a portrait-oriented canvas; full body from cap to both boots visible; both hands entirely in frame; wide but compact grounded three-quarter stance; generous clean padding on every side; no cropping, no sprite sheet, no duplicate views.
Constraints: keep subject fully separated from background with crisp hard pixel edges; do not use #00FF66 or neon green anywhere in subject; no beam, laser, muzzle flash, smoke, cast shadow, contact shadow, reflection, scenery, particles, glow, aura, frame, interface, letters, logos, symbols, official insignia, signature, watermark, weapons, extra characters, detached objects, or duplicated body parts; exactly one complete full-body cyborg only.
```

## Law

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facd5-0bea-7822-bb64-91b3732a0737\call_u6IULOcDBe8gODlELfn1VAhs.png`
- Workspace source: `tmp/imagegen/law-source.png`
- Final asset: `public/assets/characters/law.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input 'tmp\imagegen\law-source.png' --out 'public\assets\characters\law.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected final output; final is RGBA `1024×1536`; all four corner alpha values are `0`; foreground alpha bounding box is `(109, 58, 857, 1466)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: full-body game character cutout for a desktop auto-battler
Primary request: Create one original fan-illustration sprite of Trafalgar Law, the adult pirate surgeon from One Piece, recognizable through his lean confident stance, white rounded fur cap with dark spots, short dark beard, dark open long coat, tattooed hands, and one long sheathed nodachi held vertically at his side.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for local background removal; the background must be one single uniform color with no shadows, gradients, texture, floor plane, reflections, lighting variation, scenery, frame, or border.
Style/medium: polished 32-bit-era pixel art, crisp deliberate pixel clusters, limited nautical-fantasy palette, original game-ready fan illustration; not a copy of any existing game sprite and no named artist or studio imitation.
Composition/framing: exactly one character, centered, upright three-quarter front hero pose, complete full body from hat to both feet fully visible, generous 12% padding on every side, strong readable silhouette when downscaled to 80 pixels tall, no cropped weapon.
Lighting/mood: simple directional pixel shading contained entirely inside the character silhouette; adventurous and tactical.
Color palette: deep navy, charcoal, off-white, muted mustard accents, brass-gold details; do not use #00FF66 or near chroma green anywhere in the subject.
Constraints: one character only; opaque hard-edged sprite silhouette; no cast shadow, contact shadow, reflection, glow, smoke, semi-transparent effects, extra props, text, letters, numbers, logos, watermark, UI, card frame, scenery, or background objects. Keep fingers and sword readable without thin detached pixels.
```

## Ace

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facd5-0bea-7822-bb64-91b3732a0737\call_AhX3OG4DSAJgh0LspXptbaOi.png`
- Final asset: `public/assets/characters/ace.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facd5-0bea-7822-bb64-91b3732a0737\call_AhX3OG4DSAJgh0LspXptbaOi.png' --out 'public\assets\characters\ace.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1254×1254`; all four corner alpha values are `0`; foreground alpha bounding box is `(262, 59, 968, 1209)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: single playable board-unit sprite for a private local auto-battler fan prototype
Primary request: Create one original fan-illustration sprite of Portgas D. Ace from One Piece, recognizable as an athletic freckled young adult pirate with tousled black hair, an orange wide-brim hat with two small theatrical face medallions and a blue-bead hat cord, a red bead necklace, bare tattoo-free torso, dark knee-length shorts with a brass-buckled belt, a small utility pouch, and sturdy black boots. One clenched fist may carry a tiny contained cluster of solid crimson-orange pixel flames kept close to the hand.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for local background removal; the background must be exactly one uniform color with no shadows, gradients, texture, floor plane, reflections, haze, lighting variation, scenery, frame, or border.
Style/medium: cohesive high-detail 32-bit arcade-RPG pixel art, enlarged crisp deliberate pixel clusters, limited shading, clean readable silhouette, original nautical-fantasy fan illustration; not painterly, not 3D, not traced, and do not imitate any named artist or animation studio.
Composition/framing: exactly one centered upright character in a compact three-quarter fighting stance, complete full body from hat to both boots visible, both arms and flame cluster inside frame, generous 12% padding on every side, strong face/outfit silhouette readable when reduced to 80 pixels tall, no cropped limbs.
Color palette: deep navy, burnt orange, saturated crimson, warm skin, black, antique brass, restrained cobalt accents; do not use #00FF66 or neon green anywhere in the subject.
Constraints: one character only; opaque hard-edged sprite silhouette; flame must be a small solid pixel cluster fully attached to the fist with no glow, smoke, transparency, sparks, or spill; no cast shadow, contact shadow, reflection, aura, extra props, extra weapons, text, letters, numbers, logos, official emblems, skull marks, tattoos, signature, watermark, UI, card frame, scenery, detached objects, duplicated limbs, or background objects.
```

## Hancock

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facd5-0bea-7822-bb64-91b3732a0737\call_4p8XDTP54Ck14UMWBlL1vQYG.png`
- Final asset: `public/assets/characters/hancock.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facd5-0bea-7822-bb64-91b3732a0737\call_4p8XDTP54Ck14UMWBlL1vQYG.png' --out 'public\assets\characters\hancock.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1254×1254`; all four corner alpha values are `0`; foreground alpha bounding box is `(323, 43, 862, 1201)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: single playable board-unit sprite for a private local auto-battler fan prototype
Primary request: Create one original fan-illustration sprite of Boa Hancock from One Piece, recognizable as a tall regal adult pirate empress with very long straight jet-black hair, pale blue eyes, refined confident expression, long gold serpent-shaped earrings, and a fitted deep-crimson high-collared dress with a dramatic side slit, cream-and-gold decorative panels, dark low heels, and a short pale cape resting behind her shoulders. Pose one hand elegantly forward in a compact commanding gesture and the other at her hip.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for local background removal; the background must be exactly one uniform color with no shadows, gradients, texture, floor plane, reflections, haze, lighting variation, scenery, frame, or border.
Style/medium: cohesive high-detail 32-bit arcade-RPG pixel art, enlarged crisp deliberate pixel clusters, limited shading, clean readable silhouette, original nautical-fantasy fan illustration; not painterly, not 3D, not traced, and do not imitate any named artist or animation studio.
Composition/framing: exactly one centered upright character in a compact three-quarter regal battle stance, complete full body from crown of hair to both shoes visible, hair and cape contained close to the body, generous 12% padding on every side, strong face/outfit silhouette readable when reduced to 80 pixels tall, no cropped hair or limbs.
Color palette: deep navy-black, saturated crimson, pale cream, antique brass-gold, warm skin, restrained violet accents; do not use #00FF66 or neon green anywhere in the subject.
Constraints: one character only; opaque hard-edged sprite silhouette; no serpent companion, hearts, magic effects, glow, smoke, particles, transparency, cast shadow, contact shadow, reflection, aura, extra props, weapons, text, letters, numbers, logos, official emblems, skull marks, signature, watermark, UI, card frame, scenery, detached hair strands, duplicated limbs, or background objects.
```

## Garp

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Style-reference input: `public/assets/characters/law.png` (style and framing only; not an edit target)
- Raw generation: `<local-generation-workspace>\019facfd-93da-7490-8444-6e1ca63263c2\call_IZO6LK6CTznLBDj0az206EZv.png`
- Final asset: `public/assets/characters/garp.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facfd-93da-7490-8444-6e1ca63263c2\call_IZO6LK6CTznLBDj0az206EZv.png' --out 'public\assets\characters\garp.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1024×1536`; all four corner alpha values are `0`; foreground alpha bounding box is `(66, 37, 963, 1480)`; automated scan found `0` green-fringe candidate pixels; SHA-256 is `b02a0c2973f42696c9027c72d788ccc09b94e69b12c789cfa7ffef2159a5bc59`.
- Prompt:

```text
Use case: stylized-concept
Asset type: full-body playable game character cutout for a private local desktop auto-battler fan prototype
Input images: Image 1 is a style reference only for the existing roster's crisp 32-bit pixel density, limited shading, nautical palette, and centered full-body framing; do not copy its character design, pose, outfit, markings, or props.
Primary request: Create one original fan-game interpretation of Garp from One Piece as a complete full-body 32-bit-era pixel-art character sprite, recognizable as a legendary elderly naval brawler.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for local removal. The background must be exactly one uniform color with no shadows, gradients, texture, reflections, floor plane, haze, or lighting variation.
Subject: exactly one towering broad-shouldered older man with cropped spiky silver-gray hair, heavy gray eyebrows, a square weathered face, a short boxed gray beard, and one small diagonal scar beside his left eye. He wears a deep-navy long naval coat draped over his shoulders like a cape, cream double-breasted officer suit with antique-brass buttons, crimson open-collar shirt, dark gloves, and heavy black boots; no official emblem or lettering. Pose him in a compact grounded three-quarter brawler stance, one gloved fist held clearly near his chest and the other relaxed at his side, with a fierce confident grin.
Style/medium: cohesive polished high-detail 32-bit arcade-RPG pixel art; enlarged crisp deliberate pixel clusters, limited shading, clean readable silhouette, bold deep-navy, cream, antique-brass, silver-gray, black, and restrained crimson palette; original nautical-fantasy fan illustration; game-ready; not painterly, not 3D, not traced, and do not imitate any named artist or studio.
Composition/framing: one centered upright character occupying about 80% of a portrait-oriented canvas; complete full body from hair to both boots visible; coat, both hands, and all limbs entirely inside frame; generous clean padding on every side; no cropping, no sprite sheet, no duplicate view; strong silhouette readable when reduced to 80 pixels tall.
Constraints: keep the subject fully separated from the background with crisp hard pixel edges; do not use #00FF66, neon green, or bright green anywhere in the subject; no energy effects, aura, lightning, debris, smoke, cast shadow, contact shadow, reflection, scenery, particles, glow, frame, interface, text, letters, numbers, logos, official insignia, signature, watermark, weapon, extra characters, detached objects, extra limbs, or duplicated body parts; exactly one complete full-body character only.
```

## Mihawk

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Style-reference input: `public/assets/characters/law.png` (style and framing only; not an edit target)
- Raw generation: `<local-generation-workspace>\019facfd-93da-7490-8444-6e1ca63263c2\call_39a0WJi3eidDlE6JUZ7OaSEt.png`
- Final asset: `public/assets/characters/mihawk.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facfd-93da-7490-8444-6e1ca63263c2\call_39a0WJi3eidDlE6JUZ7OaSEt.png' --out 'public\assets\characters\mihawk.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1024×1536`; all four corner alpha values are `0`; foreground alpha bounding box is `(97, 60, 915, 1473)`; automated scan found `0` green-fringe candidate pixels; SHA-256 is `cc061fe1e5ce249689bd7fdc678e45c9dd3fd128139ff028b0eba6e98b5dbf33`.
- Prompt:

```text
Use case: stylized-concept
Asset type: full-body playable game character cutout for a private local desktop auto-battler fan prototype
Input images: Image 1 is a style reference only for the existing roster's crisp 32-bit pixel density, limited shading, nautical palette, and centered full-body framing; do not copy its character design, pose, outfit, markings, or props.
Primary request: Create one original fan-game interpretation of Mihawk from One Piece as a complete full-body 32-bit-era pixel-art character sprite, recognizable as the world's most composed master swordsman.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for local removal. The background must be exactly one uniform color with no shadows, gradients, texture, reflections, floor plane, haze, or lighting variation.
Subject: exactly one tall lean adult swordsman with swept black hair, sharp amber-gold eyes, thin arched brows, a precise short black mustache and pointed goatee, and a calm severe expression. He wears a broad black cavalier hat with a restrained burgundy underside and one pale feather, a long sleeveless black coat with high collar and crimson patterned shirt beneath, fitted dark trousers, tall black boots, antique-brass trim, and a small plain pendant with no lettering or logo. He holds exactly one enormous black greatsword with a broad rectangular blade and ornate antique-brass cruciform guard upright and close beside his body, its tip resting near one boot; both hands and the entire weapon remain visible. Pose him in a compact elegant three-quarter duelist stance.
Style/medium: cohesive polished high-detail 32-bit arcade-RPG pixel art; enlarged crisp deliberate pixel clusters, limited shading, clean readable silhouette, bold black, deep navy, antique-brass, cream, burgundy, and restrained crimson palette; original nautical-gothic fan illustration; game-ready; not painterly, not 3D, not traced, and do not imitate any named artist or studio.
Composition/framing: one centered upright character occupying about 78% of a portrait-oriented canvas; complete full body from hat and feather to both boots visible; entire sword from hilt to tip fully inside frame; generous clean padding on every side; no cropping, no sprite sheet, no duplicate view; strong silhouette readable when reduced to 80 pixels tall.
Constraints: keep the subject fully separated from the background with crisp hard pixel edges; do not use #00FF66, neon green, or bright green anywhere in the subject; no sword wave, energy effects, aura, lightning, debris, smoke, cast shadow, contact shadow, reflection, scenery, particles, glow, frame, interface, text, letters, numbers, logos, official insignia, signature, watermark, extra weapons, extra characters, detached objects, extra limbs, or duplicated body parts; exactly one complete full-body character and exactly one complete greatsword only.
```

## Original nautical social preview

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Style-reference input: `public/assets/characters/law.png` (pixel treatment and palette only; no character reuse)
- Raw generation: `<local-generation-workspace>\019facfd-93da-7490-8444-6e1ca63263c2\call_h0bpKr5N15M4L8i9EM5YBpg3.png`
- Final asset: `public/og.png`
- Integration: copied the built-in output unchanged to the final workspace path; no chroma removal, cropping, resizing, or generative editing was applied.
- Validation: visually inspected raw and final output; final is RGB `1732×908` (`1.9075:1`); the artwork is a cohesive original nautical board-at-sea composition with no visible text, logo, watermark, recognizable copyrighted character, or copied interface; SHA-256 is `a548238b29fb379ff9c8edc02007544f6abf93fe5ee61565b2b40055575c0d95`.
- Prompt:

```text
Use case: stylized-concept
Asset type: landscape social-preview and local game-menu illustration for a private desktop nautical auto-battler prototype
Primary request: Create one original cinematic 32-bit pixel-art illustration that communicates a grand ocean voyage and tactical auto-battler match without showing any recognizable copyrighted character, franchise logo, or existing game interface.
Scene/backdrop: a vast deep-navy ocean at twilight, viewed from a slightly elevated dramatic angle across the weathered deck of an original wooden sailing ship; distant storm clouds part around a warm cream-and-crimson horizon, with subtle pixelated sea spray and islands far away.
Subject: the foreground ship deck contains a clearly readable brass-inlaid 8-by-6 tactical board made from alternating dark and warm wood planks. Two opposing groups of small original abstract nautical chess tokens face each other across the board: one side shaped like tiny brass-and-crimson adventurer pawns, the other like iron-and-navy naval pawns. Add coiled rope, one brass compass, parchment corner fragments, and warm deck lanterns as restrained framing details only. No human or humanoid character portraits.
Style/medium: polished high-detail 32-bit-era pixel art with enlarged deliberate pixel clusters, crisp silhouettes, selective dithering, limited shading, and a premium nautical-fantasy game-menu finish; original illustration, not painterly, not 3D, not photorealistic, and do not imitate any named artist, studio, franchise, or existing game's artwork.
Composition/framing: extra-wide 1.91:1 social-preview composition; the tactical board is the strong central focal point in the lower middle, the ship rail and ocean create sweeping perspective lines, and the upper-left sky includes clean dark negative space suitable for separately overlaid menu title text. Keep important details inside a safe central 85% area for a later 1200×630 crop.
Lighting/mood: warm antique-gold lantern light against cool deep-navy moonlit ocean, adventurous, dramatic, inviting, legible at thumbnail size.
Color palette: deep navy and indigo ocean, near-black storm clouds, weathered warm brown wood, parchment cream, antique brass-gold trim, restrained crimson accents, tiny cool sea-foam highlights.
Constraints: no words, letters, numbers, typography, title, logo, watermark, signature, skull-and-crossbones, recognizable flag, official insignia, brand mark, copyrighted character, recognizable costume, human portrait, card frame, UI panel, health bar, button, or modern object; exactly one cohesive landscape illustration; keep all board squares and tokens in plausible perspective; no duplicated ship parts or floating disconnected objects.
```

## OpenGraph 1200×630 framing refinement

- Integration date: `2026-08-14`
- Edit tool: OpenAI built-in `image_gen.imagegen`, precise object-preserving edit
- Edit input: the previously generated original nautical social preview described above
- Generated edit source: `art/generated/og-v2-source.png`
- Generated source validation: RGB `1731×909`; SHA-256 `cff8ede88821a5860be88097705f91a3fe3814c4c2dafa3ce76de527917775a5`
- Final asset: `public/og.png`
- Deterministic processing: bundled `sharp` cover-resize/crop with nearest-neighbor sampling to the metadata-declared `1200×630`
- Final validation: RGB `1200×630`; SHA-256 `c9283812301f6a006a7f8bf261d76d7b15ff3bea26204274d7d0e726ec1d3a93`
- Scope: framing and safe-edge extension only; no title, logo, character, interface, or additional copyrighted element was requested or introduced.
- Prompt:

```text
Use case: precise-object-edit
Asset type: exact 1200:630 social-preview reframing of the supplied original nautical pixel-art image
Primary request: Preserve the supplied illustration's board, abstract tokens, ship deck, ocean, palette, lighting, pixel-art treatment, and object designs. Change only the outer framing so the complete scene fills a 1200:630 landscape composition with important content inside a safe central area. Extend existing ocean, sky, rail, and deck pixels naturally at the edges where needed; do not repaint or redesign the focal content.
Composition: 1.90476:1 landscape ratio, central tactical board fully visible, balanced negative space, no cropped focal objects.
Constraints: no words, letters, numbers, typography, title, logo, watermark, signature, character, portrait, new prop, new token, UI, health bar, button, emblem, flag, or modern object; preserve crisp deliberate pixel clusters and the original color palette.
```

## Luffy headless animation pilot

- Creation date: `2026-08-04`
- Creation tools: local Python shape generator, bundled `sharp`, and LibreSprite `1.1-dev` CLI batch export
- External services: none
- Original source: `scripts/libresprite/create_luffy_pilot.py`
- Editable animation source: `art/libresprite/luffy-pilot.aseprite`
- Runtime sheet: `public/assets/animations/luffy/luffy.png`
- Runtime metadata: `public/assets/animations/luffy/luffy.json`
- Canvas: `64×64` per frame, 17 frames on a `1088×64` horizontal sheet
- Frame ranges: idle `0–3`, attack `4–7`, ability cast `8–11`, hit reaction `12–13`, defeat `14–16`
- Rebuild command: `npm run assets:luffy`
- Design note: original clean-room pixel construction using a straw hat, red vest, blue shorts, and exaggerated rubber-punch motion as broad fan-character identifiers. No reference code or animation frames were copied.

## Luffy licensed animation v2 pilot

- Integration date: `2026-08-04`
- Source game: `One Piece: Gigant Battle!` (Nintendo DS)
- Source page: `https://spritedatabase.net/file/12099`
- Source asset URL: `https://spritedatabase.net/files/ds/2000/Sprite/MonkeyDLuffy.png`
- Rights basis: the project owner confirmed rights to use, adapt, and include the source and derived assets in the public repository in the Codex project conversation on `2026-08-04`
- Distribution boundary: public source collaboration is permitted by the project owner; no public playable deployment is performed by this pipeline and no downstream asset license is granted
- Archived source: `art/licensed-reference/gigant-battle/MonkeyDLuffy.png`
- Source provenance record: `art/licensed-reference/gigant-battle/provenance.json`
- Source dimensions: RGB `772×5728`, no alpha channel
- Source SHA-256: `d77e40b80168e4533a27d22e2da55208435034267c9210597ecc5193d272113d`
- Frame map: `scripts/licensed/luffy-v2-map.json`
- Deterministic importer: `scripts/licensed/build_luffy_v2.mjs`
- Editable animation source: `art/libresprite/luffy-v2.aseprite`
- Runtime atlas: `public/assets/animations/luffy-v2/luffy-v2.png`
- Runtime metadata: `public/assets/animations/luffy-v2/luffy-v2.json`
- Runtime layout: 46 frames of `128×128`, packed row-major into an eight-column `1024×768` atlas
- Frame ranges: idle `0–5`, move `6–13`, attack `14–21`, Gum-Gum Gatling cast `22–33`, hit reaction `34–37`, defeat `38–45`
- Stable destination pivot: `(40, 116)` within every frame; Phaser origin is derived from this pivot
- Processing: exact `#49557D` background removal only, curated source rectangles, explicit per-frame source pivots, unchanged source colors, no interpolation, no resampling, and no soft alpha
- Rebuild command: `npm run assets:luffy:v2`
- Fallback: the original clean-room `64×64` Luffy v1 sheet remains bundled and selectable in the Animation Lab.

## Zoro headless animation pilot

- Creation date: `2026-08-04`
- Creation tools: local dependency-free SVG pixel generator, bundled `sharp`, and LibreSprite `1.1-dev` CLI batch export
- External services: none
- Original source: `scripts/libresprite/create_zoro_pilot.py`
- Shared pixel primitives: `scripts/libresprite/pixel_svg.py`
- Editable animation source: `art/libresprite/zoro-pilot.aseprite`
- Runtime sheet: `public/assets/animations/zoro/zoro.png`
- Runtime metadata: `public/assets/animations/zoro/zoro.json`
- Canvas: `64×64` per frame, 17 frames on a `1088×64` horizontal sheet
- Frame ranges: idle `0–3`, sword attack `4–7`, crossed-blade cast `8–11`, hit reaction `12–13`, defeat `14–16`
- Rebuild command: `npm run assets:zoro`
- Design note: original clean-room pixel construction focused on a green-haired three-sword fighter silhouette, readable blade arcs, and crossed energy slashes. No external animation frames or game assets were copied.

## Nami headless animation pilot

- Creation date: `2026-08-04`
- Creation tools: local dependency-free SVG pixel generator, bundled `sharp`, and LibreSprite `1.1-dev` CLI batch export
- External services: none
- Original source: `scripts/libresprite/create_nami_pilot.py`
- Shared pixel primitives: `scripts/libresprite/pixel_svg.py`
- Editable animation source: `art/libresprite/nami-pilot.aseprite`
- Runtime sheet: `public/assets/animations/nami/nami.png`
- Runtime metadata: `public/assets/animations/nami/nami.json`
- Canvas: `64×64` per frame, 17 frames on a `1088×64` horizontal sheet
- Frame ranges: idle `0–3`, ranged attack `4–7`, Thunderbolt cast `8–11`, hit reaction `12–13`, defeat `14–16`
- Rebuild command: `npm run assets:nami`
- Design note: original clean-room pixel construction focused on an orange-haired weather tactician silhouette, a segmented staff, a traveling weather orb, and a cloud-to-lightning cast. No external animation frames or game assets were copied.

## Chopper headless animation pilot

- Creation date: `2026-08-04`
- Creation tools: local dependency-free SVG pixel generator, bundled `sharp`, and LibreSprite `1.1-dev` CLI batch export
- External services: none
- Original source: `scripts/libresprite/create_chopper_pilot.py`
- Shared pixel primitives: `scripts/libresprite/pixel_svg.py`
- Editable animation source: `art/libresprite/chopper-pilot.aseprite`
- Runtime sheet: `public/assets/animations/chopper/chopper.png`
- Runtime metadata: `public/assets/animations/chopper/chopper.json`
- Canvas: `64×64` per frame, 17 frames on a `1088×64` horizontal sheet
- Frame ranges: idle `0–3`, hoof attack `4–7`, Emergency Cure cast `8–11`, hit reaction `12–13`, defeat `14–16`
- Rebuild command: `npm run assets:chopper`
- Design note: original clean-room pixel construction focused on a compact antlered medic silhouette, a large field hat, a forward hoof strike, and layered green healing effects. No external animation frames or game assets were copied.

## Original battlefield map skins

- Generation date: `2026-08-04`
- Generation tool: OpenAI built-in image generation
- Use: private local fan-prototype battlefield backgrounds
- Original sources: `art/generated/maps/pirate-ship-source.png` and `art/generated/maps/marine-harbor-source.png`
- Final assets: `public/assets/maps/pirate-ship.png` and `public/assets/maps/marine-harbor.png`
- Processing script: `scripts/build_board_maps.mjs`
- Runtime size: `1520×840`, displayed at `760×420` with nearest-neighbor scaling
- Rebuild command: `npm run assets:maps`
- Detailed machine-readable notes: `art/generated/maps/provenance.json`

The pirate deck prompt requested an original orthographic top-down pixel-art ship battlefield with a clear central 8×6-safe arena, deep navy ocean, and perimeter-only ropes, barrels, mast bases, and brass fittings. The marine harbor prompt requested an original orthographic top-down fortified harbor battlefield with a clear central 8×6-safe arena, stone and timber construction, and perimeter-only naval props. Both prompts explicitly excluded characters, grids, UI, text, logos, franchise insignia, and emblems.

Both generated sources and final derived assets were visually inspected. No reference game code, screenshots, map art, or logos were used.

## Remaining roster headless animation batch

- Creation date: `2026-08-04`
- Creation tools: local dependency-free SVG pixel generator, bundled `sharp`, and LibreSprite `1.1-dev` CLI batch export
- External services: none
- Shared original source: `scripts/libresprite/create_roster_pilot.py`
- Shared pixel primitives: `scripts/libresprite/pixel_svg.py`
- Batch build source: `scripts/build_character_animation.mjs --roster`
- Editable sources: `art/libresprite/<character>-pilot.aseprite`
- Runtime sheets: `public/assets/animations/<character>/<character>.png`
- Runtime metadata: `public/assets/animations/<character>/<character>.json`
- Canvas: `64×64` per frame, 17 frames on a `1088×64` horizontal sheet for every character
- Standard frame ranges: idle `0–3`, attack `4–7`, ability cast `8–11`, hit reaction `12–13`, defeat `14–16`
- Rebuild command: `npm run assets:roster`

| Character | Ability animation and signature treatment |
|---|---|
| Usopp | Exploding Star projectile, slingshot, impact burst |
| Tashigi | Flash Cut, sword lunge, cyan blade arc |
| Sanji | Diable Jambe, forward kick, layered flame |
| Robin | Clutch, multiplying arms, petal-colored sparks |
| Smoker | White Blow, jitte, expanding smoke clouds |
| Sabo | Dragon Claw, metal pipe, claw-shaped fire trails |
| Kid | Magnetic Crush, mechanical arm, orbiting metal blocks |
| Crocodile | Desert Spada, gold hook, rising sand blades |
| Law | ROOM/Shambles, sword, expanding cyan field |
| Ace | Fire Fist, flame buildup, extended fire punch |
| Hancock | Mero Mero, heart projectiles, magenta cast pattern |
| Doflamingo | String Bind, feather silhouette, converging strings |
| Garp | Galaxy Impact, oversized fist, expanding shockwave |
| Mihawk | Black Blade Wave, greatsword, dark teal blade wave |

- Design note: all frames are original clean-room pixel constructions assembled from local geometric primitives. Character identity is conveyed through broad color, silhouette, prop, and ability motifs; no external animation frames, reference code, or game assets were copied.

## Doflamingo

- Generation date: `2026-07-29`
- Generation tool: OpenAI built-in `image_gen.imagegen`
- Raw generation: `<local-generation-workspace>\019facd5-0bea-7822-bb64-91b3732a0737\call_NCSIT6OGBuozgomOvw47rI2B.png`
- Final asset: `public/assets/characters/doflamingo.png`
- Cleanup command:

```powershell
& 'python' '<imagegen-skill>\scripts\remove_chroma_key.py' --input '<local-generation-workspace>\019facd5-0bea-7822-bb64-91b3732a0737\call_NCSIT6OGBuozgomOvw47rI2B.png' --out 'public\assets\characters\doflamingo.png' --auto-key corners --soft-matte --spill-cleanup --edge-feather 1 --edge-contract 1 --force
```

- Validation: visually inspected raw and final output; final is RGBA `1254×1254`; all four corner alpha values are `0`; foreground alpha bounding box is `(230, 32, 1040, 1224)`; automated scan found `0` green-fringe candidate pixels.
- Prompt:

```text
Use case: stylized-concept
Asset type: single playable board-unit sprite for a private local auto-battler fan prototype
Primary request: Create one original fan-illustration sprite of Donquixote Doflamingo from One Piece, recognizable as a very tall lean-muscular adult pirate with short spiky blond hair, narrow angular crimson sunglasses, a sharp arrogant grin, open white shirt showing a strong torso, an enormous hot-pink feather mantle simplified into chunky attached pixel clusters, patterned deep-magenta trousers with abstract pale curving shapes, a brass belt, and pointed black shoes. Pose one hand raised in a compact hooked-finger string-master gesture and the other relaxed near his hip.
Scene/backdrop: perfectly flat solid pure #00FF66 chroma-key background for local background removal; the background must be exactly one uniform color with no shadows, gradients, texture, floor plane, reflections, haze, lighting variation, scenery, frame, or border.
Style/medium: cohesive high-detail 32-bit arcade-RPG pixel art, enlarged crisp deliberate pixel clusters, limited shading, clean readable silhouette, original nautical-fantasy fan illustration; not painterly, not 3D, not traced, and do not imitate any named artist or animation studio.
Composition/framing: exactly one centered upright character in a compact wide-legged three-quarter villain stance, complete full body from hair to both shoes visible, feather mantle contained close to shoulders and torso, generous 10% padding on every side, strong face/outfit silhouette readable when reduced to 80 pixels tall, no cropped coat or limbs.
Color palette: hot pink, deep magenta, pale cream, black, warm skin, blond gold, antique brass, restrained crimson; do not use #00FF66 or neon green anywhere in the subject.
Constraints: one character only; opaque hard-edged sprite silhouette; all feathers must form solid attached clusters with no soft wisps; no visible strings, magic effects, glow, smoke, particles, transparency, cast shadow, contact shadow, reflection, aura, extra props, weapons, text, letters, numbers, logos, official emblems, skull marks, signature, watermark, UI, card frame, scenery, detached feathers, duplicated limbs, or background objects.
```

## Original Bounty Regatta pixel-art set

- Creation date: `2026-08-24`
- Creation tools: local deterministic JavaScript pixel primitives and bundled `sharp 0.34.5`
- External services, source images, and network requests: none
- Original source and importer: `scripts/build_carousel_assets.mjs`
- Rebuild command: `npm run assets:carousel`
- Runtime manifest: `public/assets/carousel/carousel-manifest.json`
- Integrity manifest: `public/assets/carousel/checksums.sha256.json`
- Visual QA sheet: `public/assets/carousel/contact-sheet.png`
- Processing contract: integer-coordinate clean-room geometry at half resolution, hard alpha edges, nearest-neighbor 2× enlargement, fixed palettes and fixed PRNG seed; no interpolation, GUI step, runtime generation, copied sprite, or external art input

The set contains an original deep-navy ocean regatta arena with a central current and buoy course, an original top-down sailing boat animated in eight directions and four wake phases across eight sail palettes, and original animated bounty tokens for the eight finished items. Item symbols are locally drawn, simplified gameplay motifs rather than imported icons. The boat atlas is palette-major, direction-major, then animation-frame-minor; the bounty atlas is animation-frame-major then item-column-minor. Exact rectangles, pivots, frame formulas, palette colors, item IDs, dimensions, and timings are stored in the runtime manifest.

| Asset | Runtime dimensions | SHA-256 |
|---|---:|---|
| `public/assets/carousel/ocean-arena.png` | `1520×840` | `41097c8919c5dd308bcef01dbf4981ff46eb2973c0c5fbf34a0109b6638fe381` |
| `public/assets/carousel/boats.png` | `1536×1536` (256 frames at `96×96`) | `1c60ff65240917cca043d85eee7f2b857b481e3868f6b1eb4793199cfa32a9de` |
| `public/assets/carousel/bounties.png` | `512×256` (32 frames at `64×64`) | `82618d906775375b810cab9b4234cefb65eff98d590de4d078dd3599dff7741d` |
| `public/assets/carousel/carousel-manifest.json` | schema v1 | `a70007a69d809b7c7f57bcebf3a3f254b78f7f648dc28f294237938f09c3c511` |
| `public/assets/carousel/contact-sheet.png` | `1400×800` | `5632adc7c3d26831bb3025d592fff5fbd00cabf8771b2b7d05504be931e2e4d3` |

Visual QA on `2026-08-24` confirmed that all eight palette/direction combinations remain distinguishable on the arena, all 32 item frames stay inside their cells, all sprite edges are hard pixels, all atlas backgrounds are transparent, and the generated contact sheet contains no text, logo, watermark, recognizable external character, or copied interface.

<!-- B10 authored pilots -->
## B10 frozen authored pilots — 2026-11-11

Existing licensed-reference PNGs and prior runtime atlases remain unchanged. Koala / Kaido support sheets and Robin / Zoro full-sheet sprites are identity/style references; the new bodies are AI-assisted derivatives, not original rips. Kaido uses the owner-requested https://spritedatabase.net/file/21137, contributor Megadoomer; exact original/reference hashes, permission attestations, prompts, unexposed model/seed and pending owner review are recorded in `art/production/b10/provenance.json`. No PixelLab/provider runtime dependency. Pinned local export, not identical AI regeneration, is reproducible.

| Pilot | Frozen source | Source SHA-256 | Runtime atlas SHA-256 | Editable working copy |
| --- | --- | --- | --- | --- |
| `koala-b10-v2` | `art/production/b10/koala/body-poses.png` | `7e7f30f38433c0abb276fe27b38a549d5bb939c89081084a67da8ee630a2b3f1` | `d0d2f3d83f66a686b2a42b483727b7de6e3f9d4dab2ecb6cc08752d2b3953034` | `art/libresprite/koala-b10-v2.aseprite` |
| `kaido-b10-v2` | `art/production/b10/kaido/body-poses.png` | `076e242838efe393457d1369c393a3f73e199199d80a615b3fd13740429edd6a` | `d9318e21d95325f59d47e2694b4fb0d86935f60b4937bfebe344b3c0cba2dc32` | `art/libresprite/kaido-b10-v2.aseprite` |
| `robin-demonio-fleur-b10-v2` | `art/production/b10/robin-demonio-fleur/body-poses.png` | `908f2f868b265c1921bbf31b3abcf3f1ec62983afd7404f33ec116476e881d01` | `06348ef2087862066999afa6d959bd1099b7543b774812b54ccc32e664dbd950` | `art/libresprite/robin-demonio-fleur-b10-v2.aseprite` |

Three project-authored 48px icon masters (Sea-Prism Shard, Black Blade, Emperor's Jolly Roger) preserve item IDs, runtime SVG paths and glyph fallback. Demonio's static SVG identity derives from the same master; old badges and icons remain under `art/production/b10/*/legacy`. Full export hashes, maps and GIFs: `art/production/b10/outputs.json`. Contract/style/inventory: `docs/B10_ASSET_PRODUKTION.md`. No gameplay or new asset licence claim.

<!-- B11 authored character completion -->
## B11 character, form and PvE completion — 2026-11-11

58 preferred local packages supplement the 4 retained B10/Luffy masters (62 visual identities, 67 content bindings). The earlier source sheets, v1/v2 atlases and historic evidence remain unchanged. Thirty-three complete original sheets are explicitly curated; Garp/Capone Bege/Arlong keep their good original clips and supplement only missing clips. Killer/Caesar/Pica, three forms and all sixteen project-owned PvE cutouts use frozen AI-assisted drawings with articulated head/torso/arm/leg/weapon poses. The eleven vector-origin designs retain their original palette, faction marks and equipment; flat vector motion drafts were discarded at source curation. Original contributors/pages/permission records and reference/draft/map/output hashes: `art/production/b11/provenance.json`, `selection.json`, `outputs.json` and the source matrix. New poses are derivatives, not original game rips. PixelLab was unavailable; provider model/seed were not exposed. Build/CI/runtime use no provider or scanner; pinned local export is reproducible. Body and FX remain separate. No downstream asset licence is granted.

| Runtime package | Frozen source | Source SHA-256 | Atlas SHA-256 | Editable body |
| --- | --- | --- | --- | --- |
| `ace-b11-v2` | `art/production/b11/ace/body-poses.png` | `60fcbc99cdd3851fc041bed996da3b8a0200a1b48d8d1891dbad1bf0b099ccea` | `457569e05845130e2728812c9ba483559ae25b9afa8ff8d376030757207be085` | `art/production/b11/ace/body.aseprite` |
| `akainu-b11-v2` | `art/production/b11/akainu/body-poses.png` | `4eb2301ecf24274e5a7f60c3fa775a1b7a789c436a98153ec60902b413ff0d08` | `414a6361f04a16e2d625472bc95d6ae8d2ee026d8addde672e1171ba20fd9c96` | `art/production/b11/akainu/body.aseprite` |
| `arlong-b11-v2` | `art/production/b11/arlong/body-poses.png` | `e135ba5e0bef7c26de02586981620b5818f906d4120c900c151fa4a76cf3ef1e` | `b64020cc81572406d5be8049356ee83ee6d1ee521bf5a82a8711884ff6cbf673` | `art/production/b11/arlong/body.aseprite` |
| `beast-pirate-b11-v2` | `art/production/b11/beast-pirate/body-poses.png` | `38fc700ff4109aff0e4b3fc9cea8ead8d8125b5b8c4850a7f4d1db83012e0553` | `1340a54d795ecfaffc605a588df4db6614b886cf2e2bba31ede8285dc589705a` | `art/production/b11/beast-pirate/body.aseprite` |
| `blackbeard-b11-v2` | `art/production/b11/blackbeard/body-poses.png` | `440715ae2239a51e25116e4c7b7a726fdb91f5cc6e43d625b2e95f1f0538bc22` | `41f30d7f9e5a14ece5b837d4ed293c229715791c1a9b2195031654571dd200b3` | `art/production/b11/blackbeard/body.aseprite` |
| `brook-b11-v2` | `art/production/b11/brook/body-poses.png` | `47eb4dc33e6fdc51df35402d4205af63011808b307918842eade8364dce0649f` | `718c23fdb0bea68389762df2dfec0b6575d64b00671d271c5291733e72746466` | `art/production/b11/brook/body.aseprite` |
| `buggy-b11-v2` | `art/production/b11/buggy/body-poses.png` | `f01ba4773278cc4ef5f65ba94d85ec48c3007f76fff9a98f5e61e6cfaba3b664` | `bccca2521de028866c1ad4436ebdb9e38139bf93c82071e6347a83df602d5912` | `art/production/b11/buggy/body.aseprite` |
| `caesar-clown-b11-v2` | `art/production/b11/caesar-clown/body-poses.png` | `93b600840a85663d2eaad35b4c8e8440769eb7f235047f0176a8f662e05883da` | `be259e4b85f22ce7f3befb3930fa4a6f8ba26f9376ee6b9404f63d8dc4ac458e` | `art/production/b11/caesar-clown/body.aseprite` |
| `capone-bege-b11-v2` | `art/production/b11/capone-bege/body-poses.png` | `34b3e4429e963991d6287fe1aa3b8c3d48173dcb61811432503abb8ce41bf461` | `23ed2f20d07247ff2aa234e6421d7c1b66237305811eae2112a20197da645c4a` | `art/production/b11/capone-bege/body.aseprite` |
| `chopper-b11-v2` | `art/production/b11/chopper/body-poses.png` | `026714093d7990572340edba7f8c6e0ce42bfe491b272255ed0840d9d6ce97a8` | `9be29d2b9593c7792bdcfbbc0d2e4e0224f7165419a649165f47aa84603c8b0f` | `art/production/b11/chopper/body.aseprite` |
| `chopper-monster-point-b11-v2` | `art/production/b11/chopper-monster-point/body-poses.png` | `f362fc0de54a3531bd6b0921a6a750a0f9cc52996434b5cbaf23317442c02986` | `15c5654e169153b06fc7c7ca6c49496e7d015462dfcbbd4c22fce2fef76e77e0` | `art/production/b11/chopper-monster-point/body.aseprite` |
| `cipher-pol-agent-b11-v2` | `art/production/b11/cipher-pol-agent/body-poses.png` | `737c621f41642822446b91ed2f4d3b6963068fd292669380962b44087753ecb4` | `190d5f53082e48adedf0ceec5c4d7f0eb2aa4e29d29a0905c3999dc92ca5fa34` | `art/production/b11/cipher-pol-agent/body.aseprite` |
| `cp9-elite-b11-v2` | `art/production/b11/cp9-elite/body-poses.png` | `b8eb278b63fc32adeddf38c3900de553dcae0b8a67fe6b27268a67f3b1025c21` | `e6f8b125be675d5bf4bcde609686c33eb63696ceb2901205554346ca0bfb9932` | `art/production/b11/cp9-elite/body.aseprite` |
| `crocodile-b11-v2` | `art/production/b11/crocodile/body-poses.png` | `81ac3ab1a2e0500dd0b1b6b5d4e84d58787de42a97579ee18d3a4d89faec083d` | `6afddedd61a3b1c6d3212bbbf30840ae593acd96b0238568c1d72b57a230ff4b` | `art/production/b11/crocodile/body.aseprite` |
| `doflamingo-b11-v2` | `art/production/b11/doflamingo/body-poses.png` | `18e7f04d9db7a6e5a88f3e702a8097018378662ba05bed9ebd363582ce2b1e9e` | `380877df62eaa08337fd3728ee5a44691b327cd1372d25aa450732abeee2c001` | `art/production/b11/doflamingo/body.aseprite` |
| `donquixote-officer-b11-v2` | `art/production/b11/donquixote-officer/body-poses.png` | `684eb4af231396f8d300f89d168b2149c968be8b7895e591211bd5bc168518af` | `258c1d59254f344abd8dedca5948e2e4655d1a7e67b77d6e0f4b785a0cffe2e9` | `art/production/b11/donquixote-officer/body.aseprite` |
| `enel-b11-v2` | `art/production/b11/enel/body-poses.png` | `3f9b157920554ebffeefbaf98e93a219557cfdfbe3b1530bc2bb308be6cbd1dd` | `e049c38e5eb501f79c52451c599196e61eb15bb65f9481162b2cd0c51a450610` | `art/production/b11/enel/body.aseprite` |
| `fish-man-raider-b11-v2` | `art/production/b11/fish-man-raider/body-poses.png` | `285f00d78b06babd7a70600edfa372bf42e7cacec6245c1eb2d776cb5fcbbbe1` | `162fab194a34018beecd5d07b670774a407bd8c8c4a153a0981d65a12bb68750` | `art/production/b11/fish-man-raider/body.aseprite` |
| `franky-b11-v2` | `art/production/b11/franky/body-poses.png` | `6256edca5c735cd38c23108f54641b855d1eb7576535eeeb12a9db4b144bb75d` | `9af3e5e912bc15e1d16ef37a66d4054a3d6412766e37cf7d682171884df073ea` | `art/production/b11/franky/body.aseprite` |
| `garp-b11-v2` | `art/production/b11/garp/body-poses.png` | `6d58c480aac7e4feeec72c1644714c47e823f9f613d34361a29ef88f27686b8a` | `2fd720adffce0c1f82a8db8821ead9bd7f0e3d02b64fe77412c73e0611166869` | `art/production/b11/garp/body.aseprite` |
| `hancock-b11-v2` | `art/production/b11/hancock/body-poses.png` | `3d12f1e79a74a9f599068eaa69419ba15704421a291d5a5255e4cfcd27f9973b` | `2723cf859a2174190b829fde609d992f16d1c1ced3f1843190b96f66d8568055` | `art/production/b11/hancock/body.aseprite` |
| `hody-jones-b11-v2` | `art/production/b11/hody-jones/body-poses.png` | `2f6ec3654e4d4493592bdadceab9b9c3cb3747a5f63087126d408f19ccd05017` | `e85dd863b6c976012452f22728ce9ca51ab5a09cd9192d01a469a210b0506b81` | `art/production/b11/hody-jones/body.aseprite` |
| `impel-down-guard-b11-v2` | `art/production/b11/impel-down-guard/body-poses.png` | `df64e093a34b4c9828e9e02a81a32991c93b36c5739fc492d7de47ddeedbb3dd` | `8ccb2fbb4aa479f88ab50cb1392515cb7aac842966dc537b19414b7635827453` | `art/production/b11/impel-down-guard/body.aseprite` |
| `ivankov-b11-v2` | `art/production/b11/ivankov/body-poses.png` | `dba5817f630e72a6aecd1a99e3502978ab3fecb835d428d2c156405dd9135e5f` | `b649aeccca27f9c2d1bea4d740c81157e98b407b92fa339e4a4440273914c01b` | `art/production/b11/ivankov/body.aseprite` |
| `jinbe-b11-v2` | `art/production/b11/jinbe/body-poses.png` | `8248c13c076ffb8493bf5b5cab637af975b9308cf09500a204c0abc603746a39` | `645df5ea24d37f27e608d7b85c2bdb72f7606f65cab371984e4eddd59f50244f` | `art/production/b11/jinbe/body.aseprite` |
| `kid-b11-v2` | `art/production/b11/kid/body-poses.png` | `a7a234f93741f985504b958bc40843b6bf13539247980bdbf15b57fb20d9e3b3` | `419c665baab5bf3b6358627d700b911a7f5268848708e459a3ce0856231c23e2` | `art/production/b11/kid/body.aseprite` |
| `killer-b11-v2` | `art/production/b11/killer/body-poses.png` | `73adc7e9d6c398c61ff72b7a5ed6a9537f23aff1abf027b0d8b55f28f4e0bc20` | `65b542972bdde7630fa8ef99e4028a56a549313aa5635ca635ab219a527e9ae2` | `art/production/b11/killer/body.aseprite` |
| `kizaru-b11-v2` | `art/production/b11/kizaru/body-poses.png` | `15e4e4c26ab8b08a1c443ac86ef087763704499e353de400ac511439f45d3c47` | `cb546385c0ad9d3c8de279f0ad81a620155ecad9522f4df8eb076b4cee96b507` | `art/production/b11/kizaru/body.aseprite` |
| `koby-b11-v2` | `art/production/b11/koby/body-poses.png` | `e1261c03bc9f8004de4e69f61a97c01d802189a35d7874502b647d488e94b93d` | `6347402b9557b09c3b8bd0ff7ce2e8fbc1506bbc74d1aa2c255457ff2dcaeba4` | `art/production/b11/koby/body.aseprite` |
| `kuma-b11-v2` | `art/production/b11/kuma/body-poses.png` | `1f66097c8cb0a01eaf53d7632915dcc42f3f27feefbbe19c40cb42424b0fd06a` | `522a10803920753dd604877e51f816efd31a735c680440995fa91fbe5cc988b0` | `art/production/b11/kuma/body.aseprite` |
| `kuzan-b11-v2` | `art/production/b11/kuzan/body-poses.png` | `16917fb7bbe41ab4a2b7019f80ef12f0b742f3533a9d5f249c58b5e449db84fd` | `75446eebcd62cb5befb76b71ed558e521c6c0d921ec04daad097a431e05c4f06` | `art/production/b11/kuzan/body.aseprite` |
| `law-b11-v2` | `art/production/b11/law/body-poses.png` | `56659ac8699f48eb83ebad2ddf0b901eb38718dc8091e3968d636fcfdc9984a7` | `5242131983fd7e79537909bb9188697fecf786ab35e740c8609626f6c3f7432c` | `art/production/b11/law/body.aseprite` |
| `luffy-gear-4-boundman-b11-v2` | `art/production/b11/luffy-gear-4-boundman/body-poses.png` | `56dd3f69d3b99abb4fd6101fa0c4867da76f27e5969fee319e27d687f14a2366` | `f59841f24a68b749f40122593ee1973bfc759a00ddc24274ccf610d4ef31cf60` | `art/production/b11/luffy-gear-4-boundman/body.aseprite` |
| `luffy-gear-4-snakeman-b11-v2` | `art/production/b11/luffy-gear-4-snakeman/body-poses.png` | `42d0d16ac949dfbe47e3d65997a06174e333b9da004feec6c645a1ee2a743e1b` | `35126255d5e93cdbf82f6d485805bcd31caad6970361d7925a7b8a5bb3ea7d78` | `art/production/b11/luffy-gear-4-snakeman/body.aseprite` |
| `magellan-b11-v2` | `art/production/b11/magellan/body-poses.png` | `23f15d4187c5051e60f87a0d6280c66cfa21d522bf0a3897f56e1e363c9e9db3` | `35fe40a77aabf3a81acb5bf93e6eec7088793b1007f7c9014c3e1819b42dd161` | `art/production/b11/magellan/body.aseprite` |
| `marine-recruit-b11-v2` | `art/production/b11/marine-recruit/body-poses.png` | `8c5b79273307a68f8ddcdd601efe9b597f87b840c56a5009efe074ade1d1f354` | `b0188a0bbeef1eacdd0d20f4cc1291b831d49cf151e8cf634f3601b4b3160db8` | `art/production/b11/marine-recruit/body.aseprite` |
| `mihawk-b11-v2` | `art/production/b11/mihawk/body-poses.png` | `2a2e4778d0ab1c99856bcfd5f5f801241e1f818e8d970781caa5c23e314e3732` | `5917ded397460ba6c447697ffb21cc0ddc1db4f0342d517521df4b0d34042ecf` | `art/production/b11/mihawk/body.aseprite` |
| `nami-b11-v2` | `art/production/b11/nami/body-poses.png` | `65e5740f27f50d04f6f0923021d5002f24a81c6d3fd7d4102d36f0e53b661654` | `72fbec53533dba9ca62d6aa907698941e98b92b2b6fc7be112acdb32ff559e87` | `art/production/b11/nami/body.aseprite` |
| `new-fish-man-officer-b11-v2` | `art/production/b11/new-fish-man-officer/body-poses.png` | `2b353a165fc5ecbdbaa6c02de20d890fae464aaea31aaa8ed083503e3c04c863` | `6f3da71a8c40a7af0f8c0c57dbf11e32968776c716c6b04e15dcdcd2d7237075` | `art/production/b11/new-fish-man-officer/body.aseprite` |
| `pacifista-b11-v2` | `art/production/b11/pacifista/body-poses.png` | `57b7707ec4c611060bbac9ad9a1f79e584948a0c65d6523281f3fbc5de1f33e6` | `cb8e4016ff6d25db1661a9c910f799586b3d26c297617285c66772fd069dbf27` | `art/production/b11/pacifista/body.aseprite` |
| `pica-b11-v2` | `art/production/b11/pica/body-poses.png` | `fe82fdb566a9cd229773ca39553671077b5ef350800e50246ff73fe3cdb230d2` | `3f0ae41b22e56fae0fde83f29c2ef819d4e7a804b0b5c20b1c1fe442746dd5a8` | `art/production/b11/pica/body.aseprite` |
| `pirate-raider-b11-v2` | `art/production/b11/pirate-raider/body-poses.png` | `c0c7da9bc1de450e0856d3e693a05688cace226ab6cf16015a03cd9306d70df2` | `8ce625576ebf0464900cc9f750fbf08959486341f3aa33eab222636839633e00` | `art/production/b11/pirate-raider/body.aseprite` |
| `punk-hazard-guard-b11-v2` | `art/production/b11/punk-hazard-guard/body-poses.png` | `b5a53855fc18ec2a78bf6a3a5c08110776e1b2899daab2da06d1e5c8bf1d17df` | `2e4368aefa03f4da57181994b7258ef25139fc6b0a5377574d9c3375573ec5ca` | `art/production/b11/punk-hazard-guard/body.aseprite` |
| `rifle-marine-b11-v2` | `art/production/b11/rifle-marine/body-poses.png` | `c2859a897463429b1ab5f23a288c89c5d051f42fa94aa8f1573341825b0a4a61` | `626e36cfabf742fc624e19b7eb23608a70d373b378c2f51ff2d58b1e60f14251` | `art/production/b11/rifle-marine/body.aseprite` |
| `rob-lucci-b11-v2` | `art/production/b11/rob-lucci/body-poses.png` | `39656ac5cb101df684b731917f2f6a0a92d9fd005fa50d168c2284e9a7d071b9` | `0bbd3568722ac331ff9af629388b829de14a066d585b5c6b12741bbc36dee531` | `art/production/b11/rob-lucci/body.aseprite` |
| `robin-b11-v2` | `art/production/b11/robin/body-poses.png` | `c93d1e0fce3f4ebe4716a2fb9abcff348a3c85b655fb601165d1865d4c03c7a1` | `148d2ecf61e6862f7f87121aaf987611bb610bc6f1e1532938168ca2eb3d44c6` | `art/production/b11/robin/body.aseprite` |
| `sabo-b11-v2` | `art/production/b11/sabo/body-poses.png` | `7b7554c5da1886ce5444aa367927e8d5300eec6a152e21400b6289cc8f2b6c85` | `a860de38035bfce596a8f359314b522e3e76303134dde207e09b217a47ad502d` | `art/production/b11/sabo/body.aseprite` |
| `sanji-b11-v2` | `art/production/b11/sanji/body-poses.png` | `ffb4d8da762438e8456b904b05906353c6eab2f6b0dc4403f6e0fc7097234e3c` | `06b7e52158320e657122a813e4e30130ad7e3131e42318bdbf9ea4ff2733dc56` | `art/production/b11/sanji/body.aseprite` |
| `sea-king-b11-v2` | `art/production/b11/sea-king/body-poses.png` | `4ff814f3a89a9efc96d0baf0ece002f9ffb70601a2bd66a01d4c7bdba937ad88` | `942360c168409caedf2d2eb129e9e0aeb2fe40f5aecec75880753368a0070761` | `art/production/b11/sea-king/body.aseprite` |
| `seraphim-b11-v2` | `art/production/b11/seraphim/body-poses.png` | `9d3a83dedd867abe3652ad4637704cd6c81fbccc5ee6be35b7871317d3cf9ea9` | `f1a02d9d700e0c61084e1042875ef9707c363cb2b401bb53b5e14929745083d9` | `art/production/b11/seraphim/body.aseprite` |
| `shanks-b11-v2` | `art/production/b11/shanks/body-poses.png` | `aeea99e8a1e68a3a4b91599094588ca33b079e0c18332cc36049713bc10cc716` | `db5a61853f58299f25a83490775ba2d6ea23d1c84f40e5b55e9c1da93b6fdd0b` | `art/production/b11/shanks/body.aseprite` |
| `skypiea-priest-b11-v2` | `art/production/b11/skypiea-priest/body-poses.png` | `295642aae67597d7690e91a390a5203980c0bed15a12cb96c7cac39efe9c3893` | `531f41efd98c204c1e3a69498b328e3af7089f0f8a625b586a3f2d108c47b94b` | `art/production/b11/skypiea-priest/body.aseprite` |
| `smoker-b11-v2` | `art/production/b11/smoker/body-poses.png` | `b599c7bb4c63039accc596c4d72967504cc564af5a3aa5f2f9372051541a5fd9` | `3d4fd4c1f55dad2b126b9d35d62316facaba86041116047389183ff43a1833b0` | `art/production/b11/smoker/body.aseprite` |
| `tashigi-b11-v2` | `art/production/b11/tashigi/body-poses.png` | `68591bda66e36aeea4b02eb2a07ce4b39dcb0584053e01757c9fe4a30263ba4f` | `925243ee641f2e689ccd1a27aed93e54840778bd05d5e33c93623c47e0dcce6e` | `art/production/b11/tashigi/body.aseprite` |
| `usopp-b11-v2` | `art/production/b11/usopp/body-poses.png` | `0c66944fab178b6c162d931ebe8cae6a188851710f69a8c24cf2592b69fa0a33` | `07c2cfd01227e2a011c858e68440ea614924e49a64ee82bb1960417dc18b499d` | `art/production/b11/usopp/body.aseprite` |
| `vice-admiral-b11-v2` | `art/production/b11/vice-admiral/body-poses.png` | `dcae112af90c5329a6f3c19e55fdf1a947e2fa8075ce7a735fe6cf0ede3be12f` | `83e5074da6c5097ee42826c29136d0fee93d15a087f507bda30ecf0b8511dbb8` | `art/production/b11/vice-admiral/body.aseprite` |
| `whitebeard-b11-v2` | `art/production/b11/whitebeard/body-poses.png` | `38b8c40bf70e1e0f117b9820cd78ac153e93bf32c8fd26eed36d3324a6c89e7b` | `a3131c0873e6a7a1d3dccf690868f4de942642a04a727f77f6edf1f174e48a00` | `art/production/b11/whitebeard/body.aseprite` |
| `zoro-b11-v2` | `art/production/b11/zoro/body-poses.png` | `802610e9686f56852e1a458bfb3a50c5c9f007e1e4e59b3cec3281a4c4c4ab1e` | `5f3b7525de500860bc60f7a24fa8987b960dee9c23b32f45ea819c2795e1ff7f` | `art/production/b11/zoro/body.aseprite` |

Source limitations, retained good drawings and verification status: `docs/B11_CHARACTER_ANIMATION_COMPLETION.md`. Existing Luffy pivot 40/116, other bodies 64/116; all six clip timings and gameplay remain unchanged.

## B12 fixed icon family — 2026-11-12

93 project-authored local pixel identities: 65 equipment items (10 components,
55 completed; 55 recipes unchanged), 3 separate Foods, 13 traits and 12 statuses.
Sea-Prism Shard, Black Blade and Emperor's Jolly Roger reuse their accepted B10
master/runtime bytes. The other 90 icons extend that style using explicit local
48px drawings; no external sheet, tracing, AI provider or new licence dependency.
The existing `art/ui-icons/*-icons.json` remain the sole catalogues.

Editable palette/rows, PNG and SVG masters live at
`art/production/b12/<family>/<id>.{json,png,svg}`. Exact catalogue, authoring,
exporter, source, master and runtime SHA-256 records are in
`art/production/b12/provenance.json`; Food retains
`art/ui-icons/food-provenance.json`. Runtime paths are unchanged; rectangle
subpaths export the 48px grid exactly 2x without embedded raster or remote calls.
Normal export reads frozen sources, not the authoring program. Contact sheets
at 24/32/48px on dark/light backgrounds, real browser captures and limitations:
`art/qa/b12/`, `docs/B12_ICON_COMPLETION.md`.
