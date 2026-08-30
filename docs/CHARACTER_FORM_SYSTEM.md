# Character Form System

## Identity

`definitionId` remains a unit's base character and economic identity for the
shop, shared pool, purchases, sales, merges and analytics. `formId` is an
optional overlay and is separate from star progression.

## Content

Forms live in `GameContent.forms`, separately from `content.units`. A form may
replace its display name, selected stats, complete ability, traits and optional
portrait/token presentation. It cannot replace cost, base definition identity,
shop/pool identity, star or items. Production content currently defines only
Robin's first pilot form.

## Persistent vs Battle

`UnitInstance.formId` represents persistent form identity only. It resolves
only when the referenced form exists, matches the base definition and has the
`persistent` lifecycle.

`BattleSetupUnit.formId` and `BattleUnitSnapshot.formId` carry effective battle
identity and may represent either a persistent or a `battle-temporary` form.
The snapshot freezes that identity for combat presentation, save/resume and
spectating without mutating the persistent instance.

## Resolution

Form resolution is pure and falls back to the base definition for missing,
unknown or mismatched forms. Stats are shallow overlays; ability and traits are
complete replacements when supplied. The resolved definition retains the base
ID and cost.

## Traits

Trait replacement is form-aware, while uniqueness remains based on distinct
base definition IDs per trait. Duplicate copies or different forms of the same
base definition cannot multiply one trait contribution.

## Persistence

Optional form IDs round-trip in existing schema-6 match state and battle
snapshots. Current persistent 3-star Robin instances reconcile to Demonio
Fleur, while already-frozen battle snapshots remain unchanged. Unknown
unrelated IDs are preserved but resolve safely to base behavior.

## Production Pilot: Robin

Robin's progression remains the normal one-star to two-star merge followed by
the normal nine-copy three-star merge. The surviving three-star instance keeps
`definitionId: "robin"` and receives `formId: "robin-demonio-fleur"`.

Demonio Fleur replaces only Clutch. Robin's base stats, Straw Hat /
Revolutionary / Specialist traits and portrait/token assets are inherited.
There is no form command or generic trigger engine.

## Explicitly Not Built Yet

This pilot adds no choice UI, battle-time transformation, form VFX, form assets
or generic transformation framework. Luffy and Chopper remain future pilots:

- Luffy can later select a persistent branch through deterministic star/item
  requirements.
- Chopper can later carry a battle-temporary form without mutating his
  persistent instance.

Luffy branch selection, Chopper combat timing/synergy rules, transform events
and form-specific presentation remain separate future work.
