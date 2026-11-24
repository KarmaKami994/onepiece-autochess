# B16 Whole Cake Pirates

B16 completes the roster expansion at 55 playable recruits and 18 traits. GameContent is `1.42.0` and save schema is `6`.

| Recruit | Gold | Role | Ability |
| --- | ---: | --- | --- |
| Perospero | 2 | Specialist | Candy Lock deals 165 base Special damage and Locks the nearest enemy for 2 seconds. |
| Smoothie | 4 | Swordsman | Juice Blade deals 350 base Physical damage along a line and bypasses 15% of Defense. |
| Oven | 3 | Brawler | Heat Wave deals 220 base Special damage to a target and adjacent enemies, with 24 base Burn for 2 seconds. |
| Brûlée | 1 | Specialist | Mirror Shelter gives 155 base Shield to the lowest-health ally in reach. |
| Daifuku | 3 | Brawler | Genie Sweep deals 245 base Physical damage to the nearest enemy and adjacent foes. |

All five join Big Mom Pirates. Cost bands now contain 12 / 14 / 13 / 10 / 6 recruits. The schema-6 loader fills missing pool keys with 22 Perospero, 14 Smoothie, 18 Oven, 27 Brûlée and 18 Daifuku copies. The existing shop odds, recruit prices and copies per cost remain the same.

| Synergy | Complete tiers | New bonuses | Minimum gold at highest tier |
| --- | --- | --- | ---: |
| Big Mom Pirates | 2 / 4 / 6 / 9 | Tier 6 gives holders a 33% max-HP emergency Shield and +20 Defense and Special Defense. Tier 9 gives 42%, +28 to both resistances and the Homie attack. | 22 |
| Brawler | 2 / 4 / 6 / 8 | Tier 8 gives holders +36% max HP, +26% Attack Speed and a counter for 105% Attack on every tenth direct hit. | 14 |
| Specialist | 2 / 4 / 6 / 8 | Tier 8 gives holders +65% Ability Power, +25 starting Energy and 15 Energy after each resolved cast. | 13 |
| Swordsman | 2 / 3 / 5 / 7 | Tier 7 gives holders +58 percentage points of Critical Chance and +85% Critical Power. | 16 |

## Homie attack

All nine regular board slots can reach Big Mom Pirates 9 with the nine other members. The tier uses distinct deployed definitions. Four different allied holders must finish an active cast, then Zeus, Prometheus and Napoleon combine for a once-per-team, 220-base Special strike. The nearest living enemy to the fourth caster is the center, with stable fighter ID breaking equal Manhattan distances. The center and its orthogonal enemy neighbors take the hit through normal Special damage rules. The effect uses no additional RNG and the Homies occupy no slots.

Combat emits a timeline event with the source, center and targets. Live playback and Chronicle show the same art and present the center from the current captain's perspective. The combat report names the three Homies and the affected fighters.

## PAC comparison

- **DIRECT** uses PAC Wild's 2 / 4 / 6 / 9 thresholds. [Pinned PAC thresholds](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/config/game/synergies.ts#L208)
- **ADAPTED** counts fielded definitions through the existing local trait resolver, corresponding to PAC's deployed family counter. The Homie trigger is a local once-per-team rule with battle-local state. [Pinned PAC counter](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/colyseus-models/synergies.ts#L97)
- **REFERENCE ONLY** covers Wild's exact effects and family exceptions. **REJECT** covers extra board slots, new shop rules and PAC server infrastructure.

## Visual sources

Perospero, Smoothie, Oven and Brûlée use their original Treasure Cruise combat sheets. Daifuku uses an authored ImageGen pose board based on his striped shoulders, yellow cape, lamp belt and orange gloves. A separate ImageGen texture depicts the three Homies together. The original source PNGs, frame maps, generated masters and export hashes are in [Asset provenance](../ASSET_PROVENANCE.md#b16-whole-cake-pirates--2026-11-23). Rebuild offline with `npm run assets:b16`.
