import { getItemDefinition, getUnitDefinition } from "./content";
import { getActiveTraits } from "./traits";
import type {
  BotPersonality,
  GameContent,
  ItemEffect,
  PlayerState,
  UnitDefinition,
  UnitInstance,
} from "./types";

export type ItemEffectScoreContext = Readonly<{
  hasTrait: (traitId: string) => boolean;
  hasRanged: boolean;
}>;

export type ItemEffectScore = Readonly<{
  score: number;
  affinities: string[];
}>;

export function scoreItemEffect(
  effect: ItemEffect,
  context: ItemEffectScoreContext,
): ItemEffectScore {
  switch (effect.kind) {
    case "health-flat": {
      const affinities = ["guardian", "brawler"].filter(context.hasTrait);
      return {
        score: (effect.value / 20) * (affinities.length ? 1.5 : 1),
        affinities,
      };
    }
    case "defense-flat": {
      const affinities = ["guardian"].filter(context.hasTrait);
      return { score: effect.value * (affinities.length ? 1.6 : 1), affinities };
    }
    case "attack-flat": {
      const affinities = ["swordsman", "brawler"].filter(context.hasTrait);
      return {
        score: effect.value * (affinities.length ? 1.45 : 1),
        affinities,
      };
    }
    case "attack-speed-percent": {
      const affinities = ["marksman"].filter(context.hasTrait);
      return {
        score: effect.value * (affinities.length ? 1.55 : 1),
        affinities,
      };
    }
    case "critical-chance-percent": {
      const affinities = ["marksman", "swordsman"].filter(context.hasTrait);
      return {
        score: effect.value * (affinities.length ? 1.6 : 1),
        affinities,
      };
    }
    case "ability-power-percent": {
      const affinities = ["specialist"].filter(context.hasTrait);
      return {
        score: effect.value * (affinities.length ? 1.65 : 1),
        affinities,
      };
    }
    case "starting-energy": {
      const affinities = ["specialist"].filter(context.hasTrait);
      return {
        score: effect.value * (affinities.length ? 1.45 : 1),
        affinities,
      };
    }
    case "range-flat":
      return {
        score: effect.value * (context.hasRanged ? 28 : 4),
        affinities: context.hasRanged ? ["long-range"] : [],
      };
    case "omnivamp-percent": {
      const affinities = ["brawler"].filter(context.hasTrait);
      return {
        score: effect.value * (affinities.length ? 1.6 : 1),
        affinities,
      };
    }
    case "special-defense-flat":
    case "shield-flat":
    case "critical-power-percent":
    case "luck-flat":
    case "ability-crit":
      return { score: 0, affinities: [] };
  }
}

export function playerOwnsItem(player: PlayerState, itemId: string): boolean {
  return (
    player.inventory.includes(itemId) ||
    Object.values(player.units).some((unit) => unit.items.includes(itemId))
  );
}

export function scoreItemForPlayer(
  itemId: string,
  player: PlayerState,
  content: Pick<GameContent, "units" | "items">,
): number {
  const item = getItemDefinition(itemId, content);
  if (!item) return -1;
  const definitions = Object.values(player.units)
    .map((instance) => getUnitDefinition(instance.definitionId, content))
    .filter((definition): definition is UnitDefinition => Boolean(definition));
  const hasTrait = (traitId: string) =>
    definitions.some((definition) => definition.traits.includes(traitId));
  const hasRanged = definitions.some(
    (definition) => definition.stats.range >= 4,
  );
  return item.effects.reduce(
    (score, effect) =>
      score + scoreItemEffect(effect, { hasTrait, hasRanged }).score,
    playerOwnsItem(player, itemId) ? -8 : 0,
  );
}

export function scoreBotUnit(
  definitionId: string,
  player: PlayerState,
  personality: BotPersonality,
  content: GameContent,
): number {
  const definition = getUnitDefinition(definitionId, content);
  if (!definition) return -1_000;
  const copies = Object.values(player.units).filter(
    (unit) => unit.definitionId === definitionId,
  );
  const preferred = definition.traits.some((traitId) =>
    personality.preferredTraits.includes(traitId),
  )
    ? 1
    : 0;
  const activeCounts = getActiveTraits(player, content);
  const synergy = definition.traits
    .map(
      (traitId) =>
        (activeCounts.find((active) => active.traitId === traitId)?.count ?? 0) *
        4,
    )
    .sort((left, right) => right - left)
    .slice(0, 2)
    .reduce((score, value) => score + value, 0);
  const connectorPenalty = Math.max(0, definition.traits.length - 3) * 12;
  return (
    definition.cost * 25 +
    copies.length * 24 +
    preferred * 20 +
    synergy -
    connectorPenalty
  );
}

export function scoreBotInstance(
  unit: UnitInstance,
  player: PlayerState,
  personality: BotPersonality,
  content: GameContent,
): number {
  return (
    scoreBotUnit(unit.definitionId, player, personality, content) +
    (unit.star === 3 ? 260 : unit.star === 2 ? 100 : 0) +
    unit.items.length * 18
  );
}

export function scoreItemForUnit(
  itemId: string,
  unit: UnitInstance,
  definition: UnitDefinition,
  content: Pick<GameContent, "items" | "config">,
): number {
  const item = getItemDefinition(itemId, content);
  if (!item || unit.items.length >= content.config.itemCap) {
    return Number.NEGATIVE_INFINITY;
  }
  return item.effects.reduce(
    (score, effect) =>
      score +
      scoreItemEffect(effect, {
        hasTrait: (traitId) => definition.traits.includes(traitId),
        hasRanged: definition.stats.range >= 4,
      }).score,
    0,
  );
}
