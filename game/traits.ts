import { DEFAULT_CONTENT, getTraitDefinition } from "./content";
import { resolvePersistentFormId, resolveUnitDefinition } from "./forms";
import type {
  ActiveTrait,
  GameContent,
  PlayerState,
  TraitEffect,
} from "./types";

export function getActiveTraits(
  player: PlayerState,
  content: GameContent = DEFAULT_CONTENT,
): ActiveTrait[] {
  const contributorsByTrait = new Map<string, Set<string>>();
  for (const unitId of Object.values(player.board).sort()) {
    const instance = player.units[unitId];
    if (!instance) continue;
    const definition = resolveUnitDefinition(
      instance.definitionId,
      resolvePersistentFormId(instance, content),
      content,
    );
    if (!definition) {
      continue;
    }
    for (const traitId of definition.traits) {
      const contributors = contributorsByTrait.get(traitId) ?? new Set<string>();
      contributors.add(instance.definitionId);
      contributorsByTrait.set(traitId, contributors);
    }
  }

  return content.traits.map((trait) => {
    const count = contributorsByTrait.get(trait.id)?.size ?? 0;
    let tierIndex = -1;
    trait.tiers.forEach((tier, index) => {
      if (count >= tier.required) {
        tierIndex = index;
      }
    });
    return {
      traitId: trait.id,
      count,
      tierIndex,
      tier: tierIndex >= 0 ? trait.tiers[tierIndex] : null,
    };
  });
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
