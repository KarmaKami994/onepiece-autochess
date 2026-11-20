# B13 Minks and higher trait tiers

B13 adds four playable recruits, bringing the roster to 41 and the trait catalogue to 15. GameContent is `1.39.0` and save schema is `6`.

| Recruit | Gold | Traits | Ability |
| --- | ---: | --- | --- |
| Pekoms | 1 | Minks, Guardian | Shell Charge deals 150 base Physical damage and attempts Knockback. |
| Bepo | 2 | Minks, Brawler | Polar Roundhouse deals 175 base Physical damage to the target and adjacent enemies. |
| Carrot | 2 | Minks, Specialist | Electro Claw lunges toward the farthest enemy and deals 205 base Special damage. |
| Pedro | 3 | Minks, Swordsman | Jaguar Lightning Blade deals 240 base Physical damage to the target and enemies in line behind it. |

The recruit count by cost is 8 / 11 / 9 / 8 / 5. Existing shop odds and the number of copies per definition are retained. On load, an older schema-6 voyage fills only the missing shared-pool keys for the four recruits while retaining serialized RNG and already-open shops.

| Synergy | Stages | New bonus | Cheapest natural lineup for the new highest tier |
| --- | --- | --- | ---: |
| Minks | 2 / 4 | Electro adds 35 / 70 base Special damage on each holder's first damaging ability hit. | 8 gold |
| Straw Hat | 2 / 4 / 6 / 8 | The crew gains 30% Max HP and 24% Attack Speed. The first Straw Hat cast grants the living holders 20 Energy. | 14 gold |
| Brawler | 2 / 4 / 6 | Holders gain 30% Max HP and 22% Attack Speed. The tenth-hit counter uses 90% Attack and attempts Knockback. | 10 gold |
| Swordsman | 2 / 3 / 5 | Holders gain 48 percentage points of Critical Chance and 65 percentage points of Critical Power. | 9 gold |

The previous tiers retain their bonuses. Formation counting uses distinct deployed definitions. Electro is tracked per fighter for the battle and consumes its charge on the first enemy ability hit dealing positive damage, including shield damage. A surviving target receives the extra hit through the existing Special damage rules. A lethal first hit consumes the charge without retargeting. A multi-hit or area attack can therefore produce at most one pulse per holder. Electro consumes no independent RNG draw, gives no extra Energy for being hit and is recorded as trait damage in the combat timeline and Chronicle.

## PAC comparison

- **DIRECT** uses the pinned PAC four-tier 2 / 4 / 6 / 8 progression for Straw Hat. The original thresholds for Brawler and Swordsman remain as their entry stages. [PAC threshold table](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/config/game/synergies.ts#L179)
- **ADAPTED** uses the local distinct-definition counter and existing direct damage, trait and replay paths. This keeps the state portable and deterministic. [PAC family counting](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/colyseus-models/synergies.ts#L97)
- **REFERENCE ONLY** covers PAC Electric's attack cadence and Morpeko's Paralysis on a triple attack. The B13 design uses a once-per-fighter Special hit for Electro. [PAC Electric effect](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/effects/synergies.ts#L153)
- **REJECT** covers introducing outside services, shop variants, extra slots or a new combat effect framework for these traits.

## Presentation

Each recruit has 46 source-mapped frames across idle, move, attack, cast, hit and defeat, plus a portrait, token and static fallback. Bepo uses Grim's Gigant Battle 2 source. Carrot, Pedro and Pekoms use the owner's downloaded Treasure Cruise combat sheets. Limited source hit/defeat poses are held during those clips. See the source and export records in [Asset provenance](../ASSET_PROVENANCE.md#b13-minks-crew--2026-11-19).
