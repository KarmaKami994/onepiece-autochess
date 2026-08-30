import { DEFAULT_CONTENT, getTraitDefinition } from "./content";
import { resolvePersistentFormId, resolveUnitDefinition } from "./forms";
import type {
  ActiveTrait,
  BattleSetupUnit,
  GameContent,
  PlayerState,
  TraitEffect,
} from "./types";

export function getActiveTraitsForUnits(
  units: readonly Pick<BattleSetupUnit, "definitionId" | "formId">[],
  content: GameContent = DEFAULT_CONTENT,
): ActiveTrait[] {
  const contributorsByTrait = new Map<string, Set<string>>();
  for (const unit of units) {
    const definition = resolveUnitDefinition(
      unit.definitionId,
      unit.formId,
      content,
    );
    if (!definition) continue;
    for (const traitId of definition.traits) {
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
    return [{ definitionId: instance.definitionId, formId }];
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
