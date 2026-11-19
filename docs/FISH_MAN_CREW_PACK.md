# Fish-Man crew pack

Status on 2026-11-18: implemented on `codex/fish-man-crew-pack`, based on `e149d3b6c07f26967b0c270507bbd2e5cfef4729`. Sprite generation completed from the owner-supplied source sheets. See `PROJECT_STATE.md` for verification and publication status.

| Recruit | Cost | Bonds | Ability |
| --- | --- | --- | --- |
| Hatchan | 1 | Fish-Man, Swordsman | Six-Arm Sweep hits the nearest enemy and adjacent enemies for 155 base Physical power. |
| Kuroobi | 2 | Fish-Man, Brawler | Tidal Palm hits the nearest enemy for 210 base Physical power and attempts Knockback if they survive. |
| Fisher Tiger | 3 | Fish-Man, Captain | Sun Pirates' Vow grants 210 base Shield power to the lowest-health ally in reach and allies adjacent to them. |

Jinbe gains Fish-Man and keeps his existing bonds, values and ability. The shared shop pool grows from 34 to 37 definitions (7/9/8/8/5 by cost). Existing costs, odds, pool copies per definition, reward tables and PvE profiles are unchanged. Adding definitions to the first three bands changes the relative availability of individual recruits in those bands.

Tidal Guard counts distinct deployed Fish-Man definitions. At two, a holder gains 55 Shield on their first successful ability Knockback of an enemy. At four, that holder and their living adjacent allies each gain 80 Shield. The trigger is once per combat per holder, including casts that displace several targets. An immune, blocked or defeated target does not trigger it. Brawler counterattacks, pulls and item movement do not trigger it. Navy opens with a formation shield and Guardian reacts to a surviving hit. Tidal Guard instead rewards placing allies beside the unit that is breaking the enemy formation.

## PAC comparison and architecture

At the [pinned PAC source](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/colyseus-models/synergies.ts#L97), only deployed Pokémon contribute and membership is deduplicated within an evolution family. Thresholds select the active tier. The existing local distinct-definition counter is the adaptation for deployed crew; PAC's evolution, bonus and dynamic-type rules are reference only. No source is copied and no server schema is brought over. Tidal Guard is local and reads the existing deterministic displacement result, uses battle-local state and emits ordinary shield events. Match state and commands remain portable.

GameContent advances to `1.35.0`. Save schema remains `6`; the existing load path adds missing pool keys to earlier saves. The existing Chronicle identifies incompatible historical recordings by content version and hash; older exports retain their original metadata.

## Sprite production

| Character | Source used | Presentation limits |
| --- | --- | --- |
| Hatchan | Paddy's [Hachi](https://www.spriters-resource.com/game_boy_advance/onepiece/asset/15775/) sheet from One Piece (GBA), 319×594. | The GBA sheet shows Hatchan's six-arm attack and guard poses. Movement reuses available original action poses. |
| Kuroobi | Paddy's [Kuroobi](https://www.spriters-resource.com/game_boy_advance/onepiece/asset/15777/) sheet from One Piece (GBA), 327×410. | Mirrored to face right at rest. Uses the original palm attack and defeat frames. |
| Fisher Tiger | [Treasure Cruise #4203](https://www.spriters-resource.com/mobile/onepiecetreasurecruise/asset/275333/), 1017×729. The owner-supplied sheet matches the [OPTC Team Builder mirror](https://optcteambuilder.com/characters/4203/). | The open-hand pose represents the shield cast. The last kneeling pose is held for defeat. |

Hatchan's DS and 3DS Support sheets were considered. The owner supplied GBA sheets for both Hatchan and Kuroobi so their figure art comes from the same game. The generated drafts were discarded on likeness. The final export uses three 46-frame v2 atlases with the existing pivot, clip boundaries and lazy loading. Static sprites, portraits and tokens come from the same idle frames. The Fish-Man HUD and codex icon is original SVG work.

Source details, owner attestation, frame maps and output hashes are recorded in [ASSET_PROVENANCE.md](../ASSET_PROVENANCE.md#fish-man-crew-pack--2026-11-18). Rebuild the three packages offline with `npm run assets:fish-man-crew`.
