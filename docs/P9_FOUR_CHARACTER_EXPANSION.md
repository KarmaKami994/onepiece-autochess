# P9 four-character expansion

P9 expands the production shop roster from 30 to 34 definitions without adding a combat primitive, trait, economy rule, or bot policy. GameContent is `1.28.0`; save schema remains `6`.

## Locked roster content

| Unit | Cost | Traits | Stats (HP / ATK / DEF / SP.DEF / Range / Attack ms / Start Energy) | Ability |
|---|---:|---|---|---|
| Killer | 2 | Supernova, Swordsman | 720 / 72 / 20 / 18 / 1 / 900 / 400 | Punisher Blades: 205 Physical, nearest adjacent area, 15% Defense Pierce |
| Buggy | 3 | Emperor, Warlord, Captain | 780 / 70 / 20 / 22 / 3 / 1100 / 500 | Muggy Ball: 260 Physical, farthest adjacent area, knockback |
| Capone Bege | 4 | Supernova, Captain, Marksman | 950 / 84 / 34 / 32 / 4 / 1200 / 500 | Castle Cannonade: 190 Physical to all enemies, 15% Defense Pierce |
| Whitebeard | 5 | Emperor, Captain, Guardian | 1300 / 116 / 44 / 40 / 2 / 1100 / 450 | Seaquake: 320 Special to all enemies, knockback |

All four abilities use existing declarative target, area, damage-type, pierce, and knockback fields. Existing definitions, trait tiers/effects, pool constants, shop odds, merge/sell/item/form behavior, combat RNG, and bot policy remain unchanged. The resulting cost distribution is `6/8/7/8/5`.

## Save compatibility

Schema-6 restoration now backfills only a production definition whose pool key is absent as an own property. A present count of `0`, any other present numeric count, and unknown/future keys are preserved. The backfill uses the existing full pool count for the definition's cost and does not rewrite RNG, shop, round, phase, gold, units, forms, items, or saved battle state. New saves already contain all 34 keys and round-trip unchanged.

## Assets and reproducibility

The exact Sprite Database file pages are Buggy `12665`, Whitebeard `12234`, Capone Bege `14848`, and Killer `21141`. Their complete SHA-pinned source sheets are retained under `art/licensed-reference/`; the source matrix contains dimensions, contributor attribution, permission basis, processing recipes, and derived frame-map pointers. Killer and Capone Bege use only their real support-sheet character poses with deterministic holds and local hard-pixel supplements. Each unit has a project-owned static character image, portrait, token, and complete 46-frame v2 runtime atlas. `ASSET_PROVENANCE.md` records exact source and generated hashes.

The generation path is offline and deterministic:

```text
node scripts/build_v2_assets.mjs --asset <unit-id> --skip-editable
node scripts/assets/build_ui_icons.mjs
```

Repeated source-pipeline runs must produce byte-identical runtime PNG/JSON outputs. The retained source PNG is the editable source for the four P9 entries; no substituted character or fabricated source pose is used.

## Verification scope

The focused P9 suite locks exact data, topology, legacy-definition stability, generic trait behavior, all four combat identities, determinism, pool/shop/merge/sell/item/form/bot compatibility, schema-6 missing-key restoration, asset integrity, and deterministic generation. Existing roster, combat, persistence, animation, production-audit, and browser coverage remains authoritative. No 1,000-seed production soak is part of P9.
