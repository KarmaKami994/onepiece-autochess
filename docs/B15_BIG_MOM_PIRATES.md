# B15 Big Mom Pirates

B15 brings the roster to 50 playable recruits and 18 traits on local B14 commit `8fe7e86`. GameContent is `1.41.0` and save schema is `6`.

| Recruit | Gold | Traits | Ability |
| --- | ---: | --- | --- |
| Pudding | 1 | Big Mom Pirates, Specialist | Memory Edit deals 105 base Special damage and applies Sleep for 1.2 seconds. |
| Cracker | 3 | Big Mom Pirates, Guardian | Biscuit Guard gives himself 290 base Shield. |
| Katakuri | 4 | Big Mom Pirates, Brawler | Mochi Barrage deals 305 base Physical damage in a line and Locks survivors for 1.25 seconds. |
| Big Mom | 5 | Big Mom Pirates, Emperor, Captain | Ikoku Sovereignty deals 375 base Special damage in a line and knocks surviving targets back. |

Pekoms gains Big Mom Pirates and retains Minks and Guardian. Pudding, Pekoms, Cracker and Katakuri reach the four-member tier for 9 gold. Captain 5 and 7 also have natural lineups without Big Mom. Distinct deployed definitions count towards each tier.

| Synergy | Tiers | New bonuses |
| --- | --- | --- |
| Big Mom Pirates | 2 / 4 | After surviving damage at 30% HP or below, each holder can gain an emergency Shield equal to 14% / 25% of their max HP. Tier 4 also grants holders +12 Defense and Special Defense. |
| Captain | 2 / 3 / 5 / 7 | Tiers 5 and 7 give the team 300 / 390 starting Shield. The first allied Captain cast grants living allies 13 / 16 Energy. |
| Navy | 2 / 3 / 5 | Tier 5 gives holders +38 Defense and Special Defense, 145 starting Shield and +90 Shield per adjacent Navy holder, capped at two neighbors. |
| Specialist | 2 / 4 / 6 | Tier 6 gives holders +55% Ability Power, +20 starting Energy and 12 Energy after each resolved cast. |

The five gold bands now contain 11 / 13 / 11 / 9 / 6 recruits. The four new entries join the existing shared pool and use normal shop and recruitment rules. The schema-6 loader fills missing pool keys with 27 Pudding, 18 Cracker, 14 Katakuri and 10 Big Mom copies.

## PAC comparison

- **DIRECT** uses the planned Wild-derived 2 / 4 opening thresholds and the existing distinct-recruit tier counter. [Pinned PAC thresholds](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/config/game/synergies.ts#L179)
- **ADAPTED** extends the existing Captain command, Navy formation Shield and Specialist cast cadence. PAC Sound ties team support to casting, while the local Captain trigger fires once. PAC Normal gives Shields at battle start. Big Mom Pirates uses the local emergency Shield. [PAC Sound](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/effects/synergies.ts#L190) · [PAC Normal](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/effects/synergies.ts#L462)
- **REFERENCE ONLY** covers PAC's exact buff values, recurring Sound casts and Wild-specific combat and shop rules. **REJECT** covers separate shops and new combat infrastructure.

## Sprites

The four recruits use the supplied original Treasure Cruise sprite sheets. The offline exporter creates an atlas, static sprite, portrait and token for each recruit. Frame maps use original poses with holds for unavailable transitions. Source and output hashes are recorded in [Asset provenance](../ASSET_PROVENANCE.md#b15-big-mom-pirates--2026-11-23). Rebuild with `npm run assets:b15`.
