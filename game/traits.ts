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
  TraitEffect,
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
