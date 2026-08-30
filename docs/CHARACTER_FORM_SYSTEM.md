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
Robin's Demonio Fleur and Luffy's two Gear 4 branches.

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
Fleur. Legacy 3-star Luffy instances select a Gear 4 branch from their retained
catalysts when no form is already locked. Already-frozen battle snapshots
remain unchanged. Unknown unrelated IDs are preserved but resolve safely to
base behavior.

## Production Pilot: Robin

Robin's progression remains the normal one-star to two-star merge followed by
the normal nine-copy three-star merge. The surviving three-star instance keeps
`definitionId: "robin"` and receives `formId: "robin-demonio-fleur"`.

Demonio Fleur replaces only Clutch. Robin's base stats, Straw Hat /
Revolutionary / Specialist traits and portrait/token assets are inherited.
There is no form command or generic trigger engine.

## Production Pilot: Luffy Gear 4

Luffy remains base Luffy at one and two stars. On the normal nine-copy
three-star merge, the first retained `armament-wraps` selects persistent
Boundman and the first retained `sniper-goggles` selects persistent Snakeman.
If both are retained, item-array order decides; a catalyst returned to inventory
as merge overflow does not select a form. Equipping a catalyst onto an unformed
three-star Luffy performs the same selection. The catalyst remains equipped and
the selected branch is then locked.

Both branches keep `definitionId: "luffy"`, base traits, movement timing and
portrait/token assets. Boundman overrides the locked stats and Gum-Gum Gatling
with Kong Gun. Snakeman overrides the locked stats and ability with the
four-strike Jet Culverin sequence. Shop, pool, purchase and sale accounting
remain base Luffy behavior.

## Explicitly Not Built Yet

These pilots add no choice UI, battle-time transformation, form VFX, form
assets or generic transformation framework. Chopper remains a future pilot and
can later carry a battle-temporary form without mutating his persistent
instance. Chopper combat timing/synergy rules, transform events and
form-specific presentation remain separate future work.
