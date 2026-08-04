import { DEFAULT_CONTENT, getTraitDefinition, getUnitDefinition } from "./content";
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
  const deployedDefinitions = new Set<string>();
  for (const unitId of Object.values(player.board)) {
    const instance = player.units[unitId];
    if (instance) {
      deployedDefinitions.add(instance.definitionId);
    }
  }

  const counts: Record<string, number> = {};
  for (const definitionId of [...deployedDefinitions].sort()) {
    const definition = getUnitDefinition(definitionId, content);
    if (!definition) {
      continue;
    }
    for (const traitId of definition.traits) {
      counts[traitId] = (counts[traitId] ?? 0) + 1;
    }
  }

  return content.traits.map((trait) => {
    const count = counts[trait.id] ?? 0;
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
