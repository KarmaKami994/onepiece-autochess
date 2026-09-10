import {
  DEFAULT_CONTENT,
  getItemDefinition,
  getTraitDefinition,
} from "./content";
import { resolvePersistentFormId, resolveUnitDefinition } from "./forms";
import type {
  ActiveTrait,
  BattleSetupUnit,
  GameContent,
  PlayerState,
  TraitBehavior,
  TraitEffect,
  TraitEffectScope,
  TraitTier,
} from "./types";

type TraitBearingUnit = {
  definitionId: string;
  formId?: string;
  items?: readonly string[];
};

export function getEffectiveUnitTraits(
  unit: TraitBearingUnit,
  content: GameContent = DEFAULT_CONTENT,
): string[] {
  const definition = resolveUnitDefinition(
    unit.definitionId,
    unit.formId,
    content,
  );
  if (!definition) return [];
  const traitIds = new Set(definition.traits);
  for (const itemId of unit.items ?? []) {
    const grantedTraitId = getItemDefinition(itemId, content)?.grantedTraitId;
    if (grantedTraitId) traitIds.add(grantedTraitId);
  }
  return [...traitIds];
}

export function getActiveTraitsForUnits(
  units: readonly (
    Pick<BattleSetupUnit, "definitionId" | "formId"> & {
      items?: readonly string[];
    }
  )[],
  content: GameContent = DEFAULT_CONTENT,
): ActiveTrait[] {
  const contributorsByTrait = new Map<string, Set<string>>();
  for (const unit of units) {
    for (const traitId of getEffectiveUnitTraits(unit, content)) {
      const contributors = contributorsByTrait.get(traitId) ?? new Set<string>();
      contributors.add(unit.definitionId);
      contributorsByTrait.set(traitId, contributors);
    }
  }

  return content.traits.map((trait) => {
    const count = contributorsByTrait.get(trait.id)?.size ?? 0;
    let tierIndex = -1;
    trait.tiers.forEach((tier, index) => {
      if (count >= tier.required) tierIndex = index;
    });
    return {
      traitId: trait.id,
      count,
      tierIndex,
      tier: tierIndex >= 0 ? trait.tiers[tierIndex] : null,
    };
  });
}

export function getActiveTraits(
  player: PlayerState,
  content: GameContent = DEFAULT_CONTENT,
): ActiveTrait[] {
  const units = Object.values(player.board).sort().flatMap((unitId) => {
    const instance = player.units[unitId];
    if (!instance) return [];
    const formId = resolvePersistentFormId(instance, content) ?? undefined;
    return [{ definitionId: instance.definitionId, formId, items: instance.items }];
  });
  return getActiveTraitsForUnits(units, content);
}

export function getActiveTraitEffects(
  activeTraits: readonly ActiveTrait[],
  content: GameContent = DEFAULT_CONTENT,
): TraitEffect[] {
  const effects: TraitEffect[] = [];
  for (const active of activeTraits) {
    if (active.tier) {
      effects.push(...active.tier.effects);
      continue;
    }
    const definition = getTraitDefinition(active.traitId, content);
    if (definition && active.tierIndex >= 0) {
      effects.push(...definition.tiers[active.tierIndex].effects);
    }
  }
  return effects;
}

export type ActiveTraitEffectGrant = Readonly<{
  traitId: string;
  scope: TraitEffectScope;
  effect: TraitEffect;
}>;

export type ActiveTraitBehaviorGrant = Readonly<{
  traitId: string;
  behavior: TraitBehavior;
}>;

function resolveActiveTier(
  active: ActiveTrait,
  content: GameContent,
): TraitTier | null {
  if (active.tier) return active.tier;
  const definition = getTraitDefinition(active.traitId, content);
  return definition && active.tierIndex >= 0
    ? definition.tiers[active.tierIndex] ?? null
    : null;
}

export function getActiveTraitEffectGrants(
  activeTraits: readonly ActiveTrait[],
  content: GameContent = DEFAULT_CONTENT,
): ActiveTraitEffectGrant[] {
  return activeTraits.flatMap((active) => {
    const tier = resolveActiveTier(active, content);
    return tier
      ? tier.effects.map((effect) => ({
          traitId: active.traitId,
          scope: tier.effectScope ?? "team",
          effect,
        }))
      : [];
  });
}

export function getActiveTraitBehaviorGrants(
  activeTraits: readonly ActiveTrait[],
  content: GameContent = DEFAULT_CONTENT,
): ActiveTraitBehaviorGrant[] {
  return activeTraits.flatMap((active) => {
    const tier = resolveActiveTier(active, content);
    return (tier?.behaviors ?? []).map((behavior) => ({
      traitId: active.traitId,
      behavior,
    }));
  });
}

export function describeTraitEffect(effect: TraitEffect): string {
  switch (effect.kind) {
    case "max-health-percent": return `+${effect.value}% Max HP`;
    case "attack-speed-percent": return `+${effect.value}% Attack Speed`;
    case "defense-flat": return `+${effect.value} Defense and Special Defense`;
    case "omnivamp-percent": return `${effect.value}% Omnivamp`;
    case "starting-energy": return `+${effect.value} starting Energy`;
    case "attack-percent": return `+${effect.value}% Attack`;
    case "stacking-attack-percent": return `+${effect.value}% Attack per takedown`;
    case "stacking-ability-power-percent": return `+${effect.value}% Ability Power per takedown`;
    case "emergency-shield-percent": return `${effect.value}% Max HP emergency Shield`;
    case "dodge-percent": return `+${effect.value}% Dodge`;
    case "critical-chance-percent": return `+${effect.value}% Critical Chance`;
    case "critical-power-percent": return `+${effect.value}% Critical Power`;
    case "ability-power-percent": return `+${effect.value}% Ability Power`;
    case "range-flat": return `+${effect.value} Range`;
    case "shield-flat": return `+${effect.value} starting Shield`;
  }
}

export function describeTraitBehavior(behavior: TraitBehavior): string {
  switch (behavior.kind) {
    case "first-straw-hat-cast-rally":
      return `First Straw Hat cast: living Straw Hat holders gain ${behavior.energy} Energy once per battle.`;
    case "start-navy-formation-shield":
      return `Battle start: each Navy holder gains ${behavior.shieldPerAdjacentHolder} Shield per adjacent Navy holder, up to ${behavior.adjacentHolderCap}.`;
    case "on-warlord-kill-sustain":
      return `On kill: the Warlord heals ${behavior.healMaxHealthPercent}% Max HP and gains ${behavior.energy} Energy.`;
    case "on-brotherhood-holder-death-rally":
      return `On a Brotherhood holder's actual death: other living holders heal ${behavior.healMaxHealthPercent}% Max HP and gain ${behavior.attackSpeedPercent}% Attack Speed.`;
    case "on-revolutionary-basic-dodge-energy":
      return `On a successful basic-attack dodge: the Revolutionary gains ${behavior.energy} Energy.`;
    case "start-emperor-star-shield":
      return `Battle start: the crew gains ${behavior.shieldPerStar} Shield per deployed Emperor star.`;
    case "first-captain-cast-command":
      return `First Captain cast: all living allies gain ${behavior.energy} Energy once per battle.`;
    case "every-n-direct-damage-counter":
      return `Every ${behavior.every}th direct enemy hit: retaliate for ${behavior.attackDamagePercent}% Attack and attempt Knockback.`;
    case "every-n-successful-basic-volley":
      return `Every ${behavior.every}th successful basic attack: fire ${behavior.shots} bonus shots for ${behavior.attackDamagePercent}% Attack each.`;
    case "post-specialist-cast-energy":
      return `After every resolved cast: the Specialist regains ${behavior.energy} Energy.`;
    case "first-direct-hit-guard-point":
      return `After the first surviving direct hit: gain ${behavior.shield} Shield and Rune Protect for ${behavior.runeProtectMs / 1_000}s.`;
  }
}
