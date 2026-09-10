# P6 Trait Identity & Depth

## Outcome

P6 turns the existing thirteen One Piece traits from globally applied flat bundles into explicit strategic identities. Thresholds, trait assignments and pre-P6 static numbers remain unchanged except for the approved Swordsman Critical Power and Supernova Ability Power growth additions. GameContent is `1.25.0`; save schema remains `6` because all new runtime state is battle-local.

## PAC-first classification

The design was checked against `keldaanCommunity/pokemonAutoChess@a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`.

- **DIRECT — principles only:** one active tier selects one deterministic identity; holder membership matters; effects can react at simulation start, cast, attack, dodge, damage, kill and death authorities; trait-grant items create real holders; runtime counters remain combat-local.
- **ADAPTED:** PAC behavior families are expressed through the local One Piece traits and existing Shield, Energy, damage-type, Crit, Dodge, Rune Protect and forced-movement rules.
- **REFERENCE ONLY:** ground holes, bench training, weather, flowers, fishing, batteries, wands, Pokémon passives, terrain, spawned Pokémon, titles and resource-meta systems.
- **REJECT:** Pokémon names/assets, backend/database/network code, Colyseus, a generic event bus, callback effects, ECS and a generalized effect framework.

## Scoped trait architecture

`TraitTier.effectScope` is either `team` or `holders`; omission still means `team` for old/custom content. Every production tier declares its scope explicitly. `getActiveTraitEffects(...)` remains the compatible flattened API, while `getActiveTraitEffectGrants(...)` returns serializable `{ traitId, scope, effect }` records for combat. Dynamic `TraitBehavior` values are plain tier content and resolve through narrow switches at existing combat authority points.

Effective holder membership uses `getEffectiveUnitTraits(...)`, including resolved persistent forms and equipped `grantedTraitId` items. Deployed distinct-definition tier counting and bench exclusion are unchanged. An item grant therefore contributes exactly as before and also makes its holder eligible for holder-scoped stats and runtime behavior without double application.

Crew-wide traits are Straw Hat, Emperor and Captain. Navy, Warlord, Supernova, Brotherhood, Revolutionary, Brawler, Swordsman, Marksman, Specialist and Guardian affect holders only.

## Final identities

- **Straw Hat — Crew Rally:** existing 2/4/6 crew-wide health and speed; the first resolved Straw Hat cast grants living Straw Hat holders 8/12/16 Energy once per team.
- **Navy — Formation Discipline:** existing 2/3 holder Defense and Shield; each holder gains 40/70 Shield per other adjacent starting Navy holder, capped at two.
- **Warlord — Predatory Sustain:** existing 2/4 holder Omnivamp and starting Energy; attributed kills heal 6%/10% Max HP and grant 10/20 Energy.
- **Supernova — Escalating Ambition:** existing holder Attack and 3%/7% stacking Attack; attributed takedowns now also add matching Ability Power.
- **Brotherhood — Fallen Brother Rally:** existing 22%/38% holder emergency Shield; a true holder death heals other living holders for 6%/10% Max HP and grants stacking 8%/12% Attack Speed.
- **Revolutionary — Guerrilla Momentum:** existing 10%/20% holder Dodge; a successful final basic-attack dodge grants 5/8 Energy without another roll.
- **Emperor — Conqueror Star Aura:** existing 1/2 crew-wide health and Attack; all allies gain 20/35 Shield per deployed effective Emperor star at battle start.
- **Captain — Commanding Order:** existing 2/3 crew-wide 100/225 Shield; the first resolved Captain cast grants all living allies 5/10 Energy once per team.
- **Brawler — Counterstrike:** existing holder health and speed; every tenth positive direct enemy basic/ability hit retaliates for 50%/75% current Attack as Physical damage and uses existing one-cell Knockback.
- **Swordsman — Critical Mastery:** holders retain 18%/38% Critical Chance and gain 25%/50% Critical Power above the unchanged 200% baseline.
- **Marksman — Precision Volley:** existing holder Range and Crit; every fourth/third successful primary basic attack fires up to two same-target 50% Attack Physical bonus shots.
- **Specialist — Technique Cycling:** existing holder Ability Power and tier-four starting Energy; every resolved cast refunds 5/10 Energy.
- **Guardian — Guard Point:** existing holder Defense and Shield; the first surviving positive direct hit grants 60/120 Shield and Rune Protect for 2/3 seconds.

## Deterministic ordering

Existing P4 setup and start-support behavior remains first. P6 then resolves Navy formation Shield followed by Emperor star Shield in ascending unit-ID order. Revolutionary Energy follows the existing final dodge decision. Direct damage resolves Guardian before Brawler. Authoritative kills resolve Warlord before Supernova. Brotherhood runs only after actual death finalization. A resolved cast runs existing item post-cast effects, Specialist, Straw Hat and Captain in that order. P6 adds no RNG draws; Revolutionary consumes only the pre-existing dodge decision.

## Item, Phoenix, form and battle-mode compatibility

Brawler Counterstrike uses the central Physical damage and Knockback paths. Sea-Prism Boots still prevent forced movement and Impact-Proof Gauntlets still suppress retaliation. Marksman bonus shots cannot Crit, Dodge, generate Energy, retarget or run primary/on-basic item behaviors. Observation Goggles, Blind and Paralysis retain one dodge-roll authority. Guardian uses the existing Rune Protect status authority.

Phoenix entering resurrection is not a Brotherhood death and remains untargetable while reserving its board cell. Resurrection restores the captured static baseline and resets Brawler/Marksman counters, Guard Point availability, Supernova growth and received Brotherhood speed. Navy and Emperor start Shields do not replay; consumed Straw Hat and Captain team triggers stay consumed. Existing item consumption and two-second resurrection timing are unchanged.

Persistent forms use their resolved traits. Monster Point retains its existing temporary trait contract. Ghost and PvE battles use normal `BattleTeam` setup, so player traits behave normally without mutating ghost-owner state or granting enemy synergies.

## Presentation and bot boundary

Trait rows remain keyboard focusable and now expose category, count, current/next tier, explicit `Crew-wide` or `Trait holders only` text, static effects and typed dynamic behavior descriptions. Scope is not conveyed by color alone, and high-contrast/reduced-motion behavior is unchanged.

Bots retain all current scoring weights, lineup, reserve, economy and formation logic. New trait metadata is structural only; no arbitrary dynamic-behavior score or P1B tuning was added.

## Scope exclusions

P6 adds no traits, thresholds, unit assignments, playable units, stages, economy changes, captain damage, item/unit balance, bot tuning, baseline, backend, networking or art. P7/P8 are not started, and no 1,000-seed soak is part of this change.
