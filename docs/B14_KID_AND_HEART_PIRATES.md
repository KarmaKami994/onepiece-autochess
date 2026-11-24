# B14 Kid Pirates and Heart Pirates

B14 expands the roster to 46 playable recruits and the trait catalogue to 17. It is based on B13 commit `0db153dc1fbabafe10bce402260884623a19f968`. GameContent is `1.40.0` and save schema is `6`.

| Recruit | Gold | Traits | Ability |
| --- | ---: | --- | --- |
| Heat | 2 | Kid Pirates, Marksman | Flame Breath deals 175 base Special damage in a line and applies 18 base Burn for 2 seconds. |
| Wire | 1 | Kid Pirates, Brawler | Trident Hook deals 150 base Physical damage and attempts a one-cell pull. |
| Shachi | 2 | Heart Pirates, Specialist | Emergency Rescue restores 200 base Health to the lowest-health ally in reach. |
| Penguin | 1 | Heart Pirates, Guardian | Covering Guard gives 145 base Shield to the lowest-health ally in reach. |
| Jean Bart | 3 | Heart Pirates, Guardian | Iron Bodyguard gives 210 base Shield to the lowest-health ally in reach and adjacent allies. |

Kid and Killer gain Kid Pirates. Law and Bepo gain Heart Pirates. Kid, Killer and Law keep Supernova. Bepo keeps Minks and Brawler, and Punk Rotten inherits Kid's crew bond. The roster counts by gold band are 10 / 13 / 10 / 8 / 5. Schema-6 save loading adds missing recruit pool keys using the established per-cost copy counts.

| Synergy | Stages | New effect on the holders | Minimum natural recruit cost |
| --- | --- | --- | ---: |
| Kid Pirates | 2 / 4 | Two gives +6% Attack. Four gives +12% Attack and +8% Attack Speed. | 3 / 8 gold |
| Heart Pirates | 2 / 4 | Two gives 55 starting Shield. Four gives 115 starting Shield and +12 Defense and Special Defense. | 3 / 8 gold |
| Supernova | 2 / 4 / 5 | Five gives +24% Attack and a stacking 9% Attack and Ability Power bonus per takedown. | 15 gold at five |
| Marksman | 2 / 3 / 5 | Five gives +2 Range and +25 percentage points of Critical Chance. Every third successful basic attack fires up to two bonus shots for 70% Attack each. | 14 gold at five |
| Guardian | 2 / 3 / 5 | Five gives +42 Defense and Special Defense and 340 starting Shield. The first surviving direct hit grants 165 Shield and 3 seconds of Rune Protect. | 7 gold at five |

Five Heart Pirates give one spare choice for the last tier. A naturally reachable full crew is Penguin, Bepo, Shachi and Jean Bart. Heat makes Marksman 5 reachable with a choice of six native holders. Supernova 5 has six native holders. Early tiers keep their previous values. All counting and effects use the existing holder-scoped trait and combat paths.

## PAC comparison

- **DIRECT** retains the established placement and distinct-recruit threshold model. The new effects reuse local mechanics and authored values. [Pinned PAC thresholds](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/config/game/synergies.ts#L179)
- **ADAPTED** extends the local Marksman attack cadence reflected in PAC Electric, the local Supernova takedown growth reflected in Monster, and the starting Shield reflected in PAC Normal. B14 strengthens the existing high-tier mechanics using native trait definitions. [Electric](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/effects/synergies.ts#L153) · [Monster](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/effects/synergies.ts#L77) · [Normal](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/effects/synergies.ts#L462)
- **REFERENCE ONLY** covers PAC's additional PP burn, growth in maximum Health, and adjacency-based Shield distribution.
- **REJECT** covers external runtime assets, a new crew status system and PAC-specific shop/item progression.

## Sprites

All five recruits use their individual combat poses from the three Treasure Cruise downloads. Heat and Wire share one archived sheet and Shachi and Penguin share another. Each has a separate atlas, portrait, token and static sprite. When a duo sheet lacks an individual defeat pose, the clip holds a solo recoil or braced frame. The generated files and their source hashes are documented in [Asset provenance](../ASSET_PROVENANCE.md#b14-kid-pirates-and-heart-pirates--2026-11-23). Rebuild offline with `npm run assets:b14`.
