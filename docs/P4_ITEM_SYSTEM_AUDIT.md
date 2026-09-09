# P4 Core Item System Architecture Audit

## 1. Executive Decision

Adopt the PAC core craftable-item architecture as the locked P4 direction: **10 components**, every unordered component pair including self-pairs, therefore **55 completed items**, automatic crafting when a second component is equipped to a component-bearing unit, and a maximum of **three completed items per unit**. Preserve PAC's combat-role identities, but express them with One Piece names, presentation and the current deterministic portable domain.

This is an architecture record, not an implementation or balance pass. No gameplay value is changed here. Flat PAC stats do not automatically fit the local health, attack, defense, cadence, shield, Ability Power or Energy scales. The matrix below therefore distinguishes unit-compatible exact-parity candidates from values that require a separately approved scale-adaptation pass. It does not lock non-obvious translated numbers.

The smallest local acquisition change is component-first: keep the current deterministic, win-gated three-choice PvE flow at rounds 1/2/3/9/14/19 and the existing deterministic carousel at rounds 4/12/17, but source both from the ten components instead of the eight current completed treasures. Do not import PAC's post-20 escalation, town encounters or unrelated item families.

## 2. Scope and Source Pin

PAC facts in this report come only from `keldaanCommunity/pokemonAutoChess` commit `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`:

- [`app/types/enum/Item.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/types/enum/Item.ts) — component set, recipes, craftable set and synergy grants.
- [`app/config/game/items.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/config/game/items.ts) — exact component/completed stat records.
- [`app/core/effects/items.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/effects/items.ts) — triggered item effects.
- [`app/rooms/commands/game-commands.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/rooms/commands/game-commands.ts) — equip, unordered combine, duplicate handling, cap, sell return and PvE award flow.
- [`app/models/pve-stages.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/pve-stages.ts) — early PvE reward pools and propositions.
- [`app/config/game/stages.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/config/game/stages.ts) — carousel cadence.
- [`app/core/mini-game.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/mini-game.ts) — carousel item pools.

Targeted implementation confirmation also used pinned [`app/core/pokemon-entity.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/pokemon-entity.ts), [`app/core/pokemon-state.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/pokemon-state.ts), [`app/core/simulation.ts`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/core/simulation.ts), and the pinned English item descriptions. Current-project facts are from exact base `3259895231fde3b77c01f79a62d4cccc32555ca4`.

Included: only the ten-component/55-recipe core craftable system and the local systems it must touch. Excluded: berries, dishes, fishing, town/tool systems, shiny encounters/items, quests/missions, backend/database/network code, and every item outside the matrix.

## 3. Fact / Inference Boundary

Labels used below:

- **PAC FACT** — directly present at the pinned commit.
- **LOCAL FACT** — directly present at the exact local base.
- **ENGINEERING INFERENCE** — a proposed local consequence or implementation boundary, not a claim about PAC developer intent.
- **E** — numeric exact-parity candidate because the unit is already shared: count, probability, ratio, seconds or board tiles.
- **S** — scale-adapted numeric value required because the local stat/damage/resource unit differs or the primitive is absent. `S` deliberately carries no final translated number.

`E` classifies translation, not automatic balance approval. `S` values must be locked in a later bounded implementation task before code.

## 4. PAC Components

**PAC FACT:** `ItemComponents` contains exactly ten entries. Eight are the regular early component pool; Fossil Stone is special/rarer, and Silk Scarf has separate acquisition and Normal-synergy tracking. A held component occupies an item slot and supplies its listed stat. A second component crafts immediately, so a unit never retains two components.

| PAC component | Exact PAC stat | Proposed One Piece name | Translation |
| --- | --- | --- | --- |
| Fossil Stone | none | Jolly Roger Fragment | Trait-catalyst role direct; no stat |
| Twisted Spoon | AP +10 | Devil Fruit Essence | S — PAC flat AP is not local AP-percent |
| Mystic Water | PP +15 | Cola Canister | S — map PP deliberately to local Energy semantics |
| Magnet | Speed +10 | Jet Dial | S — PAC Speed is not the current item attack-speed percentage |
| Black Glasses | Critical chance +10% | Sniper Lens | E — percentage unit exists |
| Miracle Seed | HP +15 | Sea King Meat | S — local HP scale differs materially |
| Never-Melt Ice | Special Defense +3 | Sea-Prism Shard | S — Special Defense is absent locally |
| Charcoal | Attack +3 | Black Blade Shard | S — local Attack scale differs |
| Heart Scale | Defense +3 | Armament Plate | S — mitigation scale requires validation |
| Silk Scarf | Shield +15 | Captain's Sash | S — item shield stat is absent and local shield scale differs |

## 5. Recipe and Lifecycle Rules

**PAC FACT:** ten components generate `10 × 11 / 2 = 55` unordered self-inclusive recipes. The equip command finds the holder's component, resolves either input order, removes that component, consumes the incoming inventory component, and adds the completed result. Crafting is allowed at three held items because one occupied component slot is replaced. Normal completed-item equip is rejected at cap three.

Completed items are unique per holder in PAC. If crafting would duplicate an item already held, the completed result goes to inventory. A synergy-granting result also goes to inventory when the holder already has that synergy. Selling returns every held item to inventory. Most items occupy one slot for the fight; one-shot items explicitly consume themselves. Wonder Box replaces itself at battle start with up to two distinct temporary craftables while respecting the cap.

**ENGINEERING INFERENCE / LOCKED LOCAL RULE:** use a small sorted-pair recipe key and the stable order already present in `UnitInstance.items`; do not add a crafting service or command bus. Keep cap three authoritative in the domain. Components count against the cap while held, but a valid second-component craft remains legal at cap. Completed duplicates on one holder are rejected or returned exactly as above. Battle snapshots remain immutable after combat starts.

## 6. Complete 55-Recipe Matrix

Unless a row says otherwise, the completed result is unique on one holder, occupies one of three slots, and can exist independently on different units. “Stack” describes only the item's internal combat accumulation, not duplicate equipment.

### Jolly Roger Fragment / Fossil Stone recipes

The nine Fossil Stone outputs and Friend Bow are PAC synergy-granting items. The proposed mappings use only current One Piece traits and are **candidates pending ChatGPT approval**; no new trait is proposed.

| Recipe | PAC result → proposed One Piece result | PAC completed stats | PAC behavior / trigger | Lifecycle / cap | Numeric path |
| --- | --- | --- | --- | --- | --- |
| Fossil + Fossil | Old Amber → Emperor's Jolly Roger | none | Grants Fossil synergy on equip | Rejected/returned if trait already present | Trait candidate: Emperor; no numeric |
| Fossil + Twisted Spoon | Dawn Stone → Specialist's Log Pose | AP +20 | Grants Psychic synergy | Same | Trait candidate: Specialist; S stat |
| Fossil + Mystic Water | Water Stone → Marine Justice Coat | PP +30 | Grants Water synergy | Same | Trait candidate: Navy; S stat |
| Fossil + Magnet | Thunder Stone → Marksman's Thunder Dial | Speed +20 | Grants Electric synergy | Same | Trait candidate: Marksman; S stat |
| Fossil + Charcoal | Fire Stone → Revolutionary Flame | Attack +6 | Grants Fire synergy | Same | Trait candidate: Revolutionary; S stat |
| Fossil + Heart Scale | Moon Stone → Straw Hat Token | Defense +6 | Grants Fairy synergy | Same | Trait candidate: Straw Hat; S stat |
| Fossil + Black Glasses | Dusk Stone → Captain's Logbook | Critical chance +20% | Grants Dark synergy | Same | Trait candidate: Captain; E crit % |
| Fossil + Miracle Seed | Leaf Stone → Brawler's Rumble Emblem | HP +30 | Grants Grass synergy | Same | Trait candidate: Brawler; S stat |
| Fossil + Never-Melt Ice | Ice Stone → Guardian's Sea-Prism Crest | Special Defense +6 | Grants Ice synergy | Same | Trait candidate: Guardian; S stat |

### Devil Fruit Essence / Twisted Spoon recipes

| Recipe | PAC result → proposed One Piece result | PAC completed stats | PAC behavior / trigger | Lifecycle / cap | Numeric path |
| --- | --- | --- | --- | --- | --- |
| Spoon + Spoon | Choice Specs → Devil Fruit Codex | AP +100 | Static caster amplification | Passive | S stat |
| Spoon + Water | Soul Dew → Clima-Tact (`clima-tact`) | none | Every 1s: +5 AP and +5 PP | Periodic, unbounded fight stack | E cadence; S AP/Energy amounts |
| Spoon + Magnet | Upgrade → Cola Engine (`cola-engine`) | AP +10, Speed +10 | +5 Speed on every attack | On-attack, unbounded fight stack | E trigger; S stats/stack amount |
| Spoon + Glasses | Reaper Cloth → Observation Haki Mantle | AP +10, Crit +20% | Ability can crit; if already crit-capable, +50% crit power | Passive/equip | E crit percentages; S AP |
| Spoon + Seed | Ability Shield → Barrier Bubble | AP +10 | Combat start: holder and same-row adjacent allies gain 20% max-HP shield and Safeguard for 5s | Start aura | E ratio/duration/adjacency; S AP |
| Spoon + Ice | Power Lens → Reflect Dial | Special Defense +10, AP +10 | Reflects Special damage prevented by Special Defense | On-damage/mitigation | E reflection identity; S stats/damage integration |
| Spoon + Charcoal | Pokemonomicon → Flame-Flame Grimoire | AP +30, Attack +3 | Special damage burns 3s and reduces Special Defense by 1 | On-special-damage | E duration; S stats/debuff magnitude |
| Spoon + Scale | Heavy-Duty Boots → Sea-Prism Boots | AP +50, Defense +12 | Immune to board effects, forced displacement and Locked | Passive immunity | E immunity set; S stats |

### Cola Canister / Mystic Water recipes

| Recipe | PAC result → proposed One Piece result | PAC completed stats | PAC behavior / trigger | Lifecycle / cap | Numeric path |
| --- | --- | --- | --- | --- | --- |
| Water + Water | Aqua Egg → Cola Reservoir | PP +30 | After cast restore 20% max PP plus 2 PP per prior cast | On-cast, cast-count scaling | E ratio/count; S Energy amounts |
| Water + Magnet | Blue Orb → Den Den Mushi (`den-den-mushi`) | PP +15, Speed +10 | Every third attack chains to two closest enemies for 10 Special and burns 15 PP | Every-third-attack | E count/target count; S damage/Energy/stats |
| Water + Glasses | Scope Lens → Energy-Siphon Scope | PP +15, Crit +25% | Critical attacks steal 10 PP on hit | On-critical-hit | E crit condition; S Energy amount |
| Water + Ice | Star Dust → Star Shield Dial | Special Defense +10, PP +15 | After cast gain 50% max PP as shield | On-cast | E ratio; S resource/shield/stats |
| Water + Seed | Green Orb → Healing Bubble | HP +15 | Every 2s holder and adjacent allies heal 5% max HP; 30% overheal becomes PP | Periodic aura | E cadence/ratios/adjacency; S Energy conversion/stat |
| Water + Charcoal | Deep Sea Tooth → Shark Tooth Charm | Attack +7, PP +15 | +5 PP on attack; +15 more if attack KOs | On-attack/on-kill | E trigger; S Energy/stats |
| Water + Scale | Shiny Charm → Miracle Talisman | Defense +3 | First drop below 30% HP: prevent damage, Protect 1.5s, gain 50 PP | One-shot threshold; consumed | E threshold/duration; S Energy/stat |

### Jet Dial / Magnet recipes

| Recipe | PAC result → proposed One Piece result | PAC completed stats | PAC behavior / trigger | Lifecycle / cap | Numeric path |
| --- | --- | --- | --- | --- | --- |
| Magnet + Magnet | X-Ray Vision → Observation Goggles | Speed +50 | Immune to Sleep; attacks cannot miss | Passive immunity/accuracy | E immunity; S Speed |
| Magnet + Glasses | Razor Fang → Armor-Piercing Scope | Speed +10, Crit +10%, Crit power +50% | Successful attacks apply Armor Break for 2s | On-hit debuff | E duration/crit %; S Speed/debuff integration |
| Magnet + Seed | Gracidea Flower → Rush Flag | none | Combat start: holder and same-row adjacent allies gain +20 Speed | Start aura | E adjacency; S Speed amount |
| Magnet + Ice | Loaded Dice → Ricochet Dial | Speed +10, Special Defense +3, Luck +20 | Attacks have 50%/Luck chance to hit lowest-HP adjacent enemy for 75%, including on-hit effects | On-attack proc | E base chance/ratio/targeting; S Luck/stats |
| Magnet + Charcoal | Punching Glove → Impact Dial | Speed +10, Attack +3 | Attacks add 8% target max-HP Physical damage on hit | On-hit | E ratio; S stats/damage integration |
| Magnet + Scale | Muscle Band → Armament Wraps (`armament-wraps`) | Speed +10, Defense +3 | On damage taken gain a stack; every two stacks +2 Defense, +1 Attack, +5 Speed; max 20 stacks | On-damage, capped stack | E stack cadence/cap; S stats |

### Sniper Lens / Black Glasses recipes

| Recipe | PAC result → proposed One Piece result | PAC completed stats | PAC behavior / trigger | Lifecycle / cap | Numeric path |
| --- | --- | --- | --- | --- | --- |
| Glasses + Glasses | Wonder Box → Mystery Treasure Chest | none | Battle start replaces itself with two distinct random non-trait craftables | Temporary random replacement; total cap 3 | E two items/cap; deterministic local RNG required |
| Glasses + Seed | Smoke Ball → Smoke-Star Escape | Crit +10% | Below 40% HP: adjacent enemies are Paralyzed/Blinded 4s, holder gains code-authoritative 50 shield and jumps away | One-shot; consumed | E threshold/duration; S shield/movement selection |
| Glasses + Ice | Wide Lens → Sniper Goggles (`sniper-goggles`) | Range +2, Crit +15%, Special Defense +3 | Static range extension | Passive | E range/crit %; S Special Defense |
| Glasses + Charcoal | Razor Claw → Black Blade (`black-blade`) | Crit +50%, Attack +3 | Static critical attacker identity | Passive | E crit %; S Attack |
| Glasses + Scale | Safety Goggles → Gas Mask | Crit +10%, Defense +3 | Immune to negative statuses and sandstorm damage | Passive immunity | E immunity/crit %; S Defense |

### Sea King Meat / Miracle Seed recipes

| Recipe | PAC result → proposed One Piece result | PAC completed stats | PAC behavior / trigger | Lifecycle / cap | Numeric path |
| --- | --- | --- | --- | --- | --- |
| Seed + Seed | King's Rock → Meat Platter (`meat-platter`) | HP +100 | Combat start gain 20% max-HP shield | Start/passive | E ratio; S HP |
| Seed + Scale | Sticky Barb → Spiked Armament | Defense +6, HP +15 | Melee attacker takes `3 + 15% Defense` True damage and Wound for 3s | On-attack-received retaliation | E ratio/duration; S flat/stats |
| Seed + Charcoal | Protective Pads → Impact-Proof Gauntlets | Shield +60, Attack +6 | Double damage to shields; immune to recoil and retaliation | Passive damage rule | E multiplier/immunities; S stats |
| Seed + Ice | Max Revive → Phoenix Feather | none | Prevent first KO and resurrect at full HP | One-shot resurrection; consumed | E once/full-HP identity |

### Sea-Prism Shard / Never-Melt Ice recipes

| Recipe | PAC result → proposed One Piece result | PAC completed stats | PAC behavior / trigger | Lifecycle / cap | Numeric path |
| --- | --- | --- | --- | --- | --- |
| Ice + Ice | Assault Vest → Sea Prism Stone (`sea-prism-stone`) | Special Defense +40 | Burn and Poison damage reduced 50% | Passive mitigation | E ratio; S Special Defense |
| Ice + Charcoal | Shell Bell → Healing Dial | Attack +5, Special Defense +5 | Heal for 33% of all damage dealt, excluding self-damage | On-damage-dealt | E ratio/exclusion; S stats |
| Ice + Scale | Poké Doll → Guard Point Dummy | Defense +3, Special Defense +3 | Reduce incoming Physical/Special 30%; increase targeting priority | Passive mitigation/taunt weight | E ratio; S stats/targeting model |

### Black Blade Shard / Charcoal recipes

| Recipe | PAC result → proposed One Piece result | PAC completed stats | PAC behavior / trigger | Lifecycle / cap | Numeric path |
| --- | --- | --- | --- | --- | --- |
| Charcoal + Charcoal | Red Orb → Advanced Armament Orb | Attack +10 | 25% of attack damage becomes True damage | On-attack damage split | E ratio; S Attack/damage integration |
| Charcoal + Scale | Flame Orb → Mera Mera Ember | Attack +5, Defense +3 | +100% base Attack and Freeze immunity; self-Burn for the fight | Equip/start persistent risk | E ratio/immunity; S stats/Burn power |

### Armament Plate / Heart Scale recipe

| Recipe | PAC result → proposed One Piece result | PAC completed stats | PAC behavior / trigger | Lifecycle / cap | Numeric path |
| --- | --- | --- | --- | --- | --- |
| Scale + Scale | Rocky Helmet → Iron Pirate Helm | Defense +25 | Negates incoming critical bonus damage | Passive critical mitigation | E negation; S Defense |

### Captain's Sash / Silk Scarf recipes

| Recipe | PAC result → proposed One Piece result | PAC completed stats | PAC behavior / trigger | Lifecycle / cap | Numeric path |
| --- | --- | --- | --- | --- | --- |
| Sash + Fossil | Friend Bow → Swordsman's Knot | Shield +30 | Grants Normal synergy | Trait result; PAC tracks scarf-family retention against Normal tier | Trait candidate: Swordsman; S shield |
| Sash + Glasses | Black Belt → Armament Sash | Shield +15, Crit +30% | Critical attacks grant shield equal to 33% damage | On-critical-attack | E crit/ratio; S shield |
| Sash + Magnet | Mach Ribbon → Jet Sash | Shield +15, Speed +10 | Every 3s gain +20 Speed | Periodic, unbounded fight stack | E cadence; S stats/stack amount |
| Sash + Charcoal | Explosive Band → Bombardier Band | Shield +50, Attack +3 | First shield depletion explodes for 50% of all shield gained as adjacent Special damage | One-shot; consumed | E ratio/adjacency; S stats/damage |
| Sash + Ice | Twist Band → Reversal Band | Special Defense +20, Shield +50 | Enemy stat debuffs become buffs; holder buffs cannot be stolen | Passive stat-rule inversion | E identity; S stats |
| Sash + Spoon | Lucky Ribbon → Lucky Pirate Ribbon | Shield +15, AP +50, Luck +20 | +15%/Luck dodge chance | Passive dodge | E base probability; S Luck/AP/shield |
| Sash + Seed | Big Eater Belt → Banquet Belt | HP +50, Shield +15 | Stat buffs received are 25% stronger except PP; PAC also allows two dishes/round | Passive buff amplifier | E ratio; S stats; dish clause excluded |
| Sash + Scale | Cover Band → Bodyguard Band | Defense +12, Shield +50 | Intercepts lethal incoming damage for an adjacent ally | Reactive ally protection | E adjacency; S stats/damage routing |
| Sash + Water | Efficient Bandanna → Efficient Bandanna | Shield +15, PP +15 | Holder and same-row adjacent allies have max PP reduced by 15% | Start aura | E ratio/adjacency; S Energy/shield |
| Sash + Sash | Nullify Bandanna → Nullification Bandanna | Shield +30 | Cannot cast; AP converts to Attack at 5:1; PP converts to bonus Special damage on next attack | Passive conversion | E 5:1 identity only if units align; otherwise S |

The proposed names cover all ten components and all 55 completed outputs. Names, icons, VFX and tooltip copy are ADAPTED presentation and remain subject to product review. The eight parenthesized IDs intentionally reuse existing stable content IDs so schema-6 saves continue resolving and the Luffy `armament-wraps` / `sniper-goggles` catalyst contract remains intact. The other current treasure IDs must not survive as extra non-matrix production items; implementation should either assign each to the indicated matrix result or provide a narrowly typed load alias before removal.

## 7. Pinned-Source Discrepancies

Two source inconsistencies are material to faithful implementation:

- Smoke Ball's pinned English description says 70 shield, but executable `smokeBallEffect` adds 50. The matrix treats **50 as the code-authoritative PAC fact**; any local shield number is still S/TBD.
- `mini-game.ts` calls `chance(0.8)` when adding an early-carousel Fossil Stone, while the adjacent comment says 40%. The executable fact is **80%**. The recommended local all-ten component pool does not copy either rarity rule.

These are source facts, not reasons to broaden scope or infer developer intent.

## 8. Current One Piece Support Audit

| Area | LOCAL FACT at `3259895` | P4 consequence |
| --- | --- | --- |
| Inventory | `PlayerState.inventory` is an uncapped serializable `string[]`; UI displays at least eight slots and labels `n/8 STORED`, but eight is not a domain cap | Keep plain IDs; update misleading capacity presentation if inventory can exceed eight |
| Equip / cap | `EQUIP_ITEM` is preparation-only, consumes one matching inventory ID, appends it, and enforces `itemCap: 3` | Preserve command boundary and cap; add component-aware resolution and completed uniqueness locally |
| Recipe model | No item category, component set or recipe table exists | Add typed data and one pure sorted-pair resolver; no framework |
| Duplicate items | Human equip permits duplicate completed IDs; bots only apply a score penalty | PAC uniqueness requires an explicit domain rejection/return rule and matching bot eligibility |
| Sell return | Selling returns all equipped item IDs to inventory before deleting the unit | Already sufficient; retain exactly |
| Merge | Merge concatenates consumed item arrays, retains the first `itemCap` entries and already returns overflow deterministically to inventory | Preserve that overflow behavior while adding completed-item uniqueness and component handling |
| PvE rewards | Winners at rounds 1/2/3/9/14/19 receive three deterministic choices shuffled from all eight current completed items; bots select by item score | Keep timing, victory gate, choice count and explicit RNG; source from components |
| Carousel | Rounds 4/12/17 build 5–9 choices from two copies of each current item; lower-HP/level captains draft first; RNG is explicit | Keep local simulation/order; source from components only |
| RNG | Reward, carousel and Wonder-Box-like future randomness can use `MatchState.rngState` / explicit combat RNG | No `Math.random`; random temporary items must be snapshot/event reproducible |
| Bot choice | Scoring understands the nine current static `ItemEffect` variants; bots score choices and auto-equip legal units | Extend scoring for component recipes, completed effects and hard legality; do not reduce to arbitrary ID weights |
| Combat application | Items are resolved once at battle setup through static stat effects | Adequate for passive stats only; no generic triggered-item lifecycle exists |
| Battle freezing | Setup and snapshots carry item ID arrays; active battle results are immutable | Craft/equip affects future battles only, preserving current battle-economy semantics |
| Save | Schema 6 serializes inventory/equipped IDs; carousel restore validates IDs against current content; no general item migration exists | Reuse the eight IDs identified above or add explicit aliases; no schema bump is required for data-only IDs |
| UI / accessibility | Selector/tooltips render known static effects; carousel art maps a fixed eight-ID order to an eight-column sheet | Add component/completed/recipe semantics, keyboard-readable recipe previews and scalable icon lookup; fixed eight-column assumptions must be removed |
| Forms | Gear 4 catalysts are stable IDs `armament-wraps` and `sniper-goggles`; equip reconciles form progression | Those IDs remain completed matrix items and reconciliation runs on the crafted result, never on consumed components |

P4A preserves the existing deterministic consumed-unit priority and per-unit item order, then considers distinct completed items before components. It retains completed items up to cap three, retains at most one component when a slot remains, and returns duplicate/excess completed items plus excess components to inventory without auto-crafting during a unit merge.

### P4B1 implementation status

P4B1 implements only the reusable combat-stat and damage primitives on GameContent `1.16.0` and save schema 6. Physical/Special/True damage, separate Special Defense with `Defense` fallback, default 10% Crit Chance, default 200% Crit Power, the PAC Luck exponent rule and one Ability-Crit decision per cast are DIRECT PORT concepts. The project keeps its existing deterministic `max(1, floor(raw × 100 / (100 + resistance)))` mitigation curve as an ADAPTED PORT; PAC's `ARMOR_FACTOR = 0.05` is explicitly not ported. Basic attacks are Physical, direct ability damage defaults to Special, burn is Special and True damage still resolves shields before health.

Item Defense and Special Defense are independent: item `defense-flat` affects Physical Defense only, while `special-defense-flat` affects Special Defense only. Existing local trait `defense-flat` remains a temporary dual-resistance compatibility adaptation because the pre-P4B1 single Defense stat protected against both current attack and ability damage. Sea Prism Stone explicitly carries matching +25 Defense / +25 Special Defense and Armament Wraps carries matching +14 / +14 effects so their historical unified-defense combat behavior is preserved. No component receives a stat assignment, and no completed-item behavior from the 55-item matrix is implemented by P4B1; triggered lifecycles and P4C acquisition/UI/bot integration remain separate work.

### P4B2 implementation status

P4B2 activates all ten component identities and five bounded completed items on GameContent `1.17.0`; save schema remains 6. The locked initial local translation is:

| PAC stat | Local effect | Translation |
| --- | --- | --- |
| AP | `ability-power-percent` | direct 1:1 |
| Crit Chance | `critical-chance-percent` | direct 1:1 |
| Luck | `luck-flat` | direct 1:1 |
| Defense | `defense-flat` | direct 1:1 |
| Special Defense | `special-defense-flat` | direct 1:1 |
| Range | `range-flat` | direct 1:1 |
| PP | `starting-energy` | direct 1:1 |
| Speed | `attack-speed-percent` | adapted 1:1; no separate Speed stat |
| HP | `health-flat` | flat value ×3 |
| Attack | `attack-flat` | flat value ×3 |
| Shield | `shield-flat` | flat value ×3 |
| Flat HP-scale item damage | behavior metadata | flat value ×3 |

Accordingly, the components are Jolly Roger Fragment with no stat; Devil Fruit Essence with +10 AP; Cola Canister with +15 starting Energy; Jet Dial with +10% attack speed; Sniper Lens with +10% Crit Chance; Sea King Meat with +45 HP; Sea-Prism Shard with +3 Special Defense; Black Blade Shard with +9 Attack; Armament Plate with +3 Defense; and Captain's Sash with +45 starting Shield. Components remain ordinary held battle items until a second component crafts, and normal PvE/carousel acquisition remains on the unchanged legacy eight-item pool.

At the pinned PAC source, Choice Specs, Razor Claw and Wide Lens are static-only. Their implemented mappings are Devil Fruit Codex (+100 AP), Black Blade (+50% Crit Chance / +9 Attack) and Sniper Goggles (+2 Range / +15% Crit Chance / +3 Special Defense). Meat Platter maps King's Rock as +300 HP plus a battle-start shield equal to 20% of final starting Max HP after static item and trait health effects. Lucky Pirate Ribbon maps Lucky Ribbon as +45 Shield, +50 AP, +20 Luck and an adapted battle-start +15% Dodge applied through the existing seeded Luck-adjusted dodge roll. Percentage starting-shield effects are summed and calculated once from final starting Max HP, independently of item array order.

This slice intentionally changes the production combat interpretation of the stable Black Blade, Meat Platter and Sniper Goggles IDs; it is the approved PAC port, not balance tuning. Sea Prism Stone, Armament Wraps, Clima-Tact, Den Den Mushi and Cola Engine retain their P4B1 behavior at this point in the implementation history, and Sniper Goggles / Armament Wraps remain the Snakeman / Boundman catalysts. P4B2 does not complete the 55-item behavior matrix: periodic, on-attack/on-hit, on-damage, thresholds/consume, status/immunity, resurrection, retaliation, trait-granting, Wonder Box and complex stat-rule effects remain unimplemented. P4C acquisition/UI work has not started.

### P4B3 implementation status

P4B3 adds the first narrow dynamic item-behavior slice on GameContent `1.18.0`; save schema remains 6. Plain serializable `ItemBehavior` metadata covers exactly two periodic and three basic-attack behavior shapes. Private battle runtime derives held behaviors in item-definition order and owns their counters. No generic trigger/event framework, callback-bearing content or persisted timer was introduced.

The five implemented mappings are:

| PAC identity | One Piece item | Static effects | Dynamic behavior |
| --- | --- | --- | --- |
| Soul Dew | Clima-Tact | none | Every 1000ms: +5 AP and +5 Energy |
| Mach Ribbon | Jet Sash | +45 Shield, +10% attack speed | Every 3000ms: +20% dynamic attack speed |
| Upgrade | Cola Engine | +10 AP, +10% attack speed | After every basic-attack attempt: +5% dynamic attack speed |
| Deep Sea Tooth | Shark Tooth Charm | +21 Attack, +15 starting Energy | Every basic-attack attempt: +5 Energy, plus +15 when that attack kills |
| Scope Lens | Energy-Siphon Scope | +15 starting Energy, +25% Crit Chance | Critical basic attacks transfer up to 10 Energy from target to holder |

PAC PeriodicEffect starts only after one complete interval; local intervals therefore use `ceil(intervalMs / combatTickMs)`, first proc at that tick, and deterministic tick increments thereafter. Periodics run for living holders at the start of the tick before intents, so a Clima-Tact proc may enable a same-tick cast. PAC OnAttack applies after every basic-attack attempt, including a dodge; it does not apply to abilities, burn or periodic effects. Deep Sea Tooth kill credit is limited to a target that crosses from alive to dead from that exact attack, and Scope Lens reuses the existing basic-attack critical result without another RNG roll.

Dynamic Speed is an ADAPTED PORT: P4B2 static Speed initialization remains numerically unchanged, then all battle-time Speed gains add as attack-speed percentage against the post-static resolved interval. Periodic Speed does not rewrite an already scheduled action; Upgrade's post-attack gain does determine the cooldown into the next attack. Energy keeps the local fixed 100 cap; Scope Lens still removes the full available transfer from its target when holder gain overcaps. No battle-time item removal or PAC title/achievement bookkeeping is implemented.

### P4B4 implementation status

P4B4 implements exactly Aqua Egg → Cola Reservoir (+30 starting Energy; after each resolved cast restore `min(90, round(20 + 2 × castCount))`), Star Dust → Star Shield Dial (+10 Special Defense/+15 starting Energy; +50 Shield after each resolved cast), Reaper Cloth → Observation Haki Mantle (+10 AP/+20% Crit Chance/Ability Crit; +50 Crit Power only if the resolved battle-start ability natively crits), and Shell Bell → Healing Dial (+15 Attack/+5 Special Defense; heal `ceil(33% × actual damage dealt)`).

The four additional serializable behavior shapes use private cast count and existing Energy/shield/heal paths. Cast count increments once after the ability and before its item bonuses; multi-hit/target loops do not multiply bonuses, and aborted resolution does not trigger them. The native Crit Power bonus is fixed at construction and is not recomputed on temporary transformation. Shell Bell includes mitigated shield plus health damage from attacks, abilities and attributed burn, excludes self/zero damage, and retains existing health-only omnivamp separately. PAC behavior is adapted to fixed local 100 Energy, Attack ×3 and existing seeded Ability Crit; no additional RNG, generic lifecycle or event bus is introduced.

GameContent is `1.19.0`; schema stays 6. P4B1–P4B3 definitions, acquisition order/RNG, Gear 4 catalysts and bot policy are unchanged. P4C and further item families remain deferred.

### P4B5 implementation status

P4B5 implements exactly seven additional PAC identities on GameContent `1.20.0`; save schema remains 6:

| PAC identity | One Piece item | Static effects | Dynamic behavior |
| --- | --- | --- | --- |
| Green Orb | Healing Bubble | +45 HP | Every 2000ms, the living holder and Chebyshev-adjacent allies heal 5% of their own Max HP; 10% of local-scale overheal becomes Energy |
| Black Belt | Armament Sash | +45 Shield, +30% Crit Chance | A critical basic attack grants `ceil(33% × complete raw primary damage)` Shield |
| Punching Glove | Impact Dial | +10% attack speed, +9 Attack | Adds 8% target Max HP Physical damage after the normal attack calculation, including on dodge |
| Blue Orb | Den Den Mushi | +15 starting Energy, +10% attack speed | Every third basic-attack attempt chains 30 Special damage and drains 15 Energy from up to two nearest enemies |
| Loaded Dice | Ricochet Dial | +10% attack speed, +3 Special Defense, +20 Luck | One Luck-adjusted 50% roll may bounce 75% of every raw primary component to one adjacent lowest-HP enemy |
| Muscle Band | Armament Wraps | +10% attack speed, +3 Defense | Every second positive damage application, up to 20 events, grants +3 Attack, +2 Defense and +5% dynamic attack speed |
| Red Orb | Advanced Armament Orb | +30 Attack | Converts 25% of normal basic-attack damage to True damage before Impact Dial adds its Physical bonus |

The new flat item-damage rule applies the established local HP scale, so PAC Blue Orb's flat 10 becomes 30 local Special damage. Green Orb instead converts 10% of local overheal to Energy, which is equivalent to PAC's 30% after the ×3 HP scale. Punching Glove directly preserves the pinned dodge ordering: the normal contribution becomes zero but the 8%-Max-HP component remains. Red Orb splits the already critical-scaled normal attack while preserving its raw total, then Impact Dial adds unconverted, non-critical Physical damage.

Basic attacks use a private three-component Physical/Special/True bundle and a fixed behavior-family order independent of equipped-item array order. Den Den Mushi and Ricochet Dial route non-recursive item damage through `applyDamage`; Armament Wraps observes actual shield plus health damage there. Loaded Dice uses the existing seeded PAC Luck formula and exactly one roll when raw primary damage is positive. Only private battle counters are added, and dynamic Speed does not rewrite an already scheduled cooldown. This remains deterministic, JSON-content-driven, server-portable and free of a generic event/status framework.

Armament Wraps and Den Den Mushi intentionally replace their temporary legacy combat values while retaining stable IDs, exact acquisition positions and the Boundman catalyst contract. The other completed P4B1–P4B4 identities, all 55 recipes, acquisition RNG, crafting, saves, economy and bots are unchanged.

### P4B6 implementation status

P4B6 implements exactly twelve defensive, control and retaliation identities on GameContent `1.21.0`; save schema remains 6:

| PAC identity | One Piece item | Local identity |
| --- | --- | --- |
| Ability Shield | Barrier Bubble | +10 AP; holder and horizontal allies start with 20% of their own final Max HP as Shield and 5 seconds of Rune Protect |
| Gracidea Flower | Rush Flag | Holder and horizontal allies add +20% attack speed to their battle-start dynamic baseline |
| Heavy-Duty Boots | Sea-Prism Boots | +50 AP/+12 Defense; immune to enemy knockback and pull |
| X-Ray Vision | Observation Goggles | +50% attack speed; the existing dodge decision is made, then a rolled dodge is forced to hit |
| Safety Goggles | Gas Mask | +10% Crit/+3 Defense; 60 seconds of Rune Protect |
| Razor Fang | Armor-Piercing Scope | +10% attack speed/+10% Crit/+50% Crit Power; a successful basic attack halves both current resistances for 2 seconds before that hit resolves |
| Protective Pads | Impact-Proof Gauntlets | +180 Shield/+18 Attack; doubles post-reduction damage entering Shield resolution with overflow to HP and suppresses item retaliation |
| Rocky Helmet | Iron Pirate Helm | +25 Defense; preserves incoming Crit identity while removing its bonus multiplier per target, including targets within one shared Ability-Crit cast |
| Assault Vest | Sea Prism Stone | Exactly +40 Special Defense; Burn raw tick damage is halved before Special mitigation |
| Poké Doll | Guard Point Dummy | +3 Defense/+3 Special Defense; 30% post-resistance non-True reduction and priority only among tied nearest basic-attack targets |
| Power Lens | Reflect Dial | +10 Special Defense/+10 AP; reflects the rounded Special damage prevented by current effective Special Defense through the central damage authority |
| Sticky Barb | Spiked Armament | +6 Defense/+45 HP; adjacent attackers receive `round(3 × (3 + 0.15 × holder Defense))` True retaliation and 3 seconds of Wound |

Rune Protect is a private battle-local expiry that blocks only Stun, Burn application, Wound and Razor resistance reduction. Wound makes the existing heal authority return zero heal and zero overheal. Resistance reduction uses `round(resistance / 2)` without mutating persistent stats. All durations use deterministic combat ticks, and the new state is neither serialized nor presented through a new framework.

The central damage order is current effective resistance and local mitigation, Reflect Dial's resistance-blocked calculation, Guard Point Dummy reduction, Impact-Proof Gauntlets' Shield multiplier, Shield, HP, existing damage reactions, then eligible non-recursive reflection. This is an ADAPTED PORT of PAC's mitigation-trigger identities using the established local curve. The same target-specific Iron Pirate Helm rule keeps a single cast Crit roll while allowing normal and Helmet targets in one AoE to receive different raw damage. Spiked Armament scales the complete PAC retaliation result by three to preserve impact under the local HP scale.

PAC clauses without a local host system remain deliberately non-applicable: Observation Goggles does not add Sleep because Sleep does not exist; Sea-Prism Boots does not add Locked or board-effect systems; Sea Prism Stone does not add Poison. The Boots still allow their holder's own Lunge and ordinary movement. No generic status, lifecycle, retaliation or event framework was introduced.

Sea Prism Stone intentionally replaces its temporary +120 HP/+25 Defense/+25 Special Defense identity while preserving its stable ID and acquisition position. All other P4B1–P4B5 identities, the ten components, 55 recipes, Gear 4 catalysts, acquisition order/RNG, saves, economy and bots remain unchanged.

### P4B7 implementation status

P4B7 completes the final twelve approved non-trait identities on GameContent `1.22.0`; save schema remains 6:

| PAC identity | One Piece item | Local identity |
| --- | --- | --- |
| Pokemonomicon | Flame-Flame Grimoire | +30 AP/+9 Attack; positive Special damage applies a 3-second Burn and -1 Special Defense through the existing damage authority |
| Shiny Charm | Miracle Talisman | +3 Defense; once per battle, post-Shield damage projected below 30% HP is cancelled, grants 50 Energy, then 1.5 seconds of Protect |
| Wonder Box | Mystery Treasure Chest | Replaces itself battle-locally with up to two distinct seeded non-trait completed items before normal item setup |
| Smoke Ball | Smoke-Star Escape | +10% Crit; once below 40% HP, applies 4-second Blind and Paralysis to adjacent enemies, gains 150 Shield and deterministically escapes |
| Max Revive | Phoenix Feather | Once per battle, delays defeat for 2 seconds, then restores the frozen battle-start fighter at full HP with consumed one-shot state preserved |
| Big Eater Belt | Banquet Belt | +150 Max HP/+45 Shield; supported positive and friendly-negative combat-stat deltas are 25% stronger |
| Twist Band | Reversal Band | +20 Special Defense/+150 Shield; supported enemy/environment negative combat-stat deltas invert to positive |
| Flame Orb | Mera Mera Ember | +15 Attack/+3 Defense; adds star-scaled base Attack and starts a battle-long self-Burn |
| Explosive Band | Bombardier Band | +150 Shield/+9 Attack; first Shield depletion deals 50% of runtime Shield gained as adjacent Special damage |
| Cover Band | Bodyguard Band | +12 Defense/+150 Shield; deterministically intercepts one adjacent ally's lethal post-Shield damage |
| Nullify Bandanna | Nullification Bandanna | +90 Shield; cannot cast, converts AP deltas to Attack at 60% and spends stored Energy as Special basic-attack damage |
| Efficient Bandanna | Efficient Bandanna | +45 Shield/+15 starting Energy; holder and horizontal allies start with 85% Max Energy |

Protect blocks damage, healing and positive Energy while allowing drain. Blind adds 50 percentage points to the existing seeded dodge decision; Paralysis consumes the same dodge roll but cannot dodge. Resurrection uses a battle event and immutable snapshot fields so deterministic playback restores the correct form, maximum HP and resource cap without rerolling Mystery Treasure Chest. Max Energy is battle-local, defaults to 100 and is used consistently for gain caps and cast readiness.

Mystery Treasure Chest consumes exactly two seeded draws from a stable recipe-output candidate order, excludes trait-granting outputs, itself and already-held/generated items, obeys the three-completed-item cap, and never mutates persistent equipment. Banquet Belt, Reversal Band and Nullification Bandanna share one narrow combat-stat-delta helper with fixed ordering: enemy/environment inversion, supported delta amplification, then AP-to-Attack conversion. Static item and trait values are not amplified, while existing runtime Muscle Band, Rush Flag, Mera Mera Ember and form/stat transitions use the same deterministic path where applicable.

All 45 non-trait completed items now have active effects or behavior. The ten trait-granting recipe outputs remain intentionally behaviorless pending their separately approved trait mappings and P4C acquisition/UI/bot work. PAC dish, stolen-buff protection and Freeze clauses have no local host system and remain non-applicable. No generic lifecycle, status, trigger or persistence framework was added.

### P4C implementation status

P4C completes the production item loop on GameContent `1.23.0`; save schema remains 6. The ten approved completed outputs now grant Emperor, Specialist, Navy, Marksman, Revolutionary, Straw Hat, Captain, Brawler, Guardian or Swordsman through one typed `grantedTraitId`. Effective traits resolve the persistent form plus equipped grants, dedupe per unit and retain the existing distinct-base-definition contributor rule. Only deployed holders contribute.

Normal PvE victories at rounds 1/2/3/9/14/19 and carousels at 4/12/17 now draw from all ten components in stable order. PvE still offers three distinct choices; carousel construction still caps each component at two copies. The eight legacy completed IDs remain valid for saves, recipes and Gear 4, but are no longer normal rewards.

Directly equipping a redundant trait grant fails without inventory mutation. Crafting the same result remains successful: both components are consumed and the completed result moves to inventory. Star merges likewise return grants made redundant by the merged unit's resolved native/form traits without crafting or deletion. Bots use the same recipe and redundancy rules, including crafting at the three-slot cap.

Selectors expose component/completed kind, granted trait, completed recipe components and all ten canonical pair outcomes for a component. Keyboard focus and hover reveal semantic recipe details and a selected-holder craft preview. The legacy eight-column bounty sheet is used only for its known IDs; all other items use the deterministic icon/color fallback without aliasing to column zero. P4 is complete; final authored item art remains deferred until after P6.

## 9. Missing Primitive Audit

### Present and reusable

The local combat has deterministic Physical/Special/True damage, separate Defense and Special Defense, basic and opt-in ability critical hits, mutable Crit Power and Luck, dodge, shields, healing, omnivamp, Energy gain/drain, burn, stun, knockback/pull, defense pierce, line/adjacent/global targeting, sequential strikes, immutable battle events and explicit RNG. Trait effects can add starting Energy, shield, dodge, crit chance, Ability Power and range. P4B3 adds bounded periodic AP/Energy/attack-speed and post-basic-attack Speed/Energy/critical-transfer behavior; P4B5 adds narrow multi-component attacks, adjacent healing, chain/bounce item damage and capped damage-received stacking. P4B6 adds narrow battle-local Rune Protect, Wound and resistance-reduction expiries, cross-unit horizontal start support, forced-movement immunity, cannot-miss adaptation, target-specific Crit-bonus negation, nearest-tie target priority and non-recursive retaliation paths. P4B7 adds Protect, Blind, Paralysis, delayed one-shot resurrection, battle-local Max Energy, deterministic escape, lethal interception, threshold consumption, runtime-shield depletion, battle-local generated items and ordered combat-stat-delta adaptation.

### Remaining missing or insufficient after P4C

- **Unhosted PAC systems:** Sleep, Freeze, Locked, Poison, dishes, stolen-buff protection and board effects remain absent and are not implied by the bounded local identities.

All 55 recipe outputs now have their approved production identity. Conditional-item bot valuation remains intentionally structural rather than balance-tuned.

These are capability gaps, not permission to build a generic status framework. Each later implementation must add only the smallest reusable primitive required by the locked 55 behaviors.

## 10. PAC Early Acquisition vs Local Cadence

### PvE

| Round | PAC pinned behavior after a win | Current local behavior | Locked recommendation |
| ---: | --- | --- | --- |
| 1 | One random regular component; records it | Choose one of three distinct components after victory | Implemented adapted flow |
| 2 | Choose one of three regular components excluding previously random-granted components | Same component-choice flow | Implemented adapted flow |
| 3 | One random regular component excluding prior random grants | Same component-choice flow | Implemented adapted flow |
| 9 | One random regular component | Same component-choice flow | Implemented adapted flow |
| 14 | Three propositions from eight regular components plus Fossil Stone; shiny branch is separate | Same component-choice flow | Implemented; no shiny branch |
| 19 | Two random regular components, each unseen component weighted 2× | Same component-choice flow | Implemented adapted flow |

PAC computes the rewards before combat and awards them only after a PvE win. Local behavior is also win-gated and deterministic, but uses one uniform three-choice flow. Preserve that simpler UI and command architecture. Use all ten components in the local deterministic pool so Jolly Roger Fragment and Captain's Sash remain obtainable without importing excluded PAC town/shiny systems. This is an ADAPTED distribution, not a claim of PAC parity.

### Carousel

PAC carousels occur at 4/12/17/22/27/34. Before stage 20, the default pool is the eight regular components, with up to two copies per item and executable 80% logic for one extra Fossil Stone; Silk Scarf comes through a special encounter. At/after 20, PAC moves to completed items and other encounter overrides.

Local carousels align at rounds 4/12/17, use explicit RNG, offer 5–9 choices, allow two copies per item, grant the selected ID to inventory and now use the ten-component pool. PAC 22/27/34 carousels, post-20 completed-item escalation, town overrides and special item families remain excluded.

## 11. Port Classification

### DIRECT

- Ten components, every unordered self-inclusive pair, 55 results.
- Component-first acquisition and a completed-item cap of three.
- Automatic craft when a second component is equipped; component and result use one slot.
- Completed-item uniqueness per holder and deterministic duplicate-result return.
- General combat-role identities in the matrix.
- Local carousels 4/12/17 become component carousels.

### ADAPTED

- All flat stat/resource/damage units and every primitive absent locally.
- Fossil-Stone synergy items become candidates for existing One Piece traits only; no new trait.
- The Silk-Scarf/Normal-synergy removal lifecycle becomes ordinary persistent completed equipment locally; importing trait-driven deletion would add a Pokémon-specific dependency and threaten saves/forms.
- One Piece names, stable IDs, icons, VFX, tooltips and accessible recipe presentation.
- Existing early PvE choice UI and explicit RNG remain; completed rewards become an all-ten component pool rather than copying PAC's varying direct/proposition rarity schedule.
- Existing IDs remain attached to the eight indicated matrix outputs for save and form-catalyst compatibility.

### REFERENCE ONLY

- PAC carousel escalation after stage 20 and later carousel/PvE cadence.
- Later completed-item PvE propositions.
- Shiny branches/items, tools, berries, dishes, fishing, town encounters and special item acquisition.

### REJECT

- PAC backend/network/room/database infrastructure.
- Pokémon evolution, passive and species-specific item behavior.
- Any new trait created only to reproduce a PAC type.

## 12. Determinism, Portability and Save Contract

- Recipe lookup is pure data keyed by two sorted component IDs.
- All inventory/equip/craft outcomes remain authoritative serializable state mutations under the existing command actor boundary.
- Combat-start and triggered item effects use explicit battle state, ticks and RNG; presentation only consumes events/snapshots.
- Mystery Treasure Chest choices are resolved into the immutable battle snapshot from explicit battle RNG; they never mutate persistent equipment or reroll during presentation, save/resume or spectating.
- Current battle-economy immutability stays intact: purchases/merges/equips cannot rebuild an active deployed combat timeline.
- Schema remains 6. Existing stable IDs resolve through the eight mapped outputs; any additional legacy alias is explicit and bounded, never inferred from display names.
- GameContent is `1.23.0` after P4C; schema remains 6 and all serialized item IDs stay stable.

## 13. Risks and Review Gates

- The matrix is architecture-complete, but 55 items create a large balance surface. Implement behavior first with locked values per bounded task; do not tune from a smoke run.
- Trait-granting equipment can change synergy reachability sharply; the approved mappings are implemented without changing trait tiers or balance values.
- Pre-P4A merge overflow already returned to inventory; P4A must preserve that behavior while enforcing completed-item uniqueness and the one-component merge invariant.
- Trigger ordering must be explicit when death, resurrection, shield depletion, on-damage and on-kill occur in one tick.
- Special Defense adds a second mitigation axis and therefore needs a narrow formula decision, not a copy of PAC's entire damage model.
- Bot item handling is recipe-aware and trait-aware but does not add speculative tuning for delayed or conditional effects.
- Generic procedural bounty presentation covers non-sheet IDs; final authored item art remains deferred until after P6.
- Smoker remains frozen/watch. P4 does not authorize bot, economy, captain-damage or unit balance changes.

## 14. Bounded Implementation Decomposition

All four bounded P4 steps are complete.

1. **Component / recipe / domain foundation:** typed component and completed definitions, all 55 recipe keys, auto-craft/uniqueness/cap rules, merge-overflow preservation, stable legacy IDs, sell/save/form-catalyst regressions.
2. **Missing combat primitives and item effects:** P4B1 supplies the bounded damage/stat foundation only. Trigger seams, statuses and the 55 locked identities remain separately reviewable groups with numeric values explicitly approved before code.
3. **Acquisition / carousel / PvE / UI / bot integration:** complete in P4C with component-only normal sources, canonical recipe metadata and deterministic recipe-aware bot handling.
4. **Accessibility / treasure / form and regression hardening:** complete in P4C with semantic keyboard-focus details, generic non-sheet bounty presentation and schema/form regressions.

P4 is complete. Do not begin a production soak, balance analysis or adjacent roadmap item from this record alone.
