import { getUnitDefinition } from "./content";
import { scoreBotInstance } from "./scoring";
import type {
  BotPersonality,
  GameConfig,
  GameContent,
  PlayerState,
  UnitInstance,
} from "./types";

export type BotFormationBand = "backline" | "frontline" | "flex" | "middle";

export function getBotTargetLevel(
  round: number,
  personality: BotPersonality,
  config: GameConfig,
): number {
  const base = Math.max(
    config.startLevel,
    Math.min(config.maxLevel, 2 + Math.floor(round / 5)),
  );
  return Math.min(
    config.maxLevel,
    base + (personality.levelAggression >= 0.75 ? 1 : 0),
  );
}

export function getBotXpActionBudget(personality: BotPersonality): number {
  return Math.min(5, Math.max(1, Math.ceil(personality.levelAggression * 5)));
}

export function getBotPersonality(
  player: PlayerState,
  content: GameContent,
): BotPersonality {
  return content.botPersonalities.find(
    (personality) => personality.id === player.personalityId,
  ) ?? content.botPersonalities[0] ?? {
    id: "fallback",
    name: "Fallback",
    economyReserve: 10,
    levelAggression: 0.5,
    rerollAggression: 0.5,
    preferredTraits: [],
    formation: "spread",
  };
}

export function selectDesiredBotUnits(
  player: PlayerState,
  personality: BotPersonality,
  content: GameContent,
): UnitInstance[] {
  return Object.values(player.units)
    .filter((unit) => Boolean(getUnitDefinition(unit.definitionId, content)))
    .sort(
      (left, right) =>
        scoreBotInstance(right, player, personality, content) -
          scoreBotInstance(left, player, personality, content) ||
        left.id.localeCompare(right.id) ||
        left.acquiredOrder - right.acquiredOrder,
    )
    .slice(0, Math.max(0, player.level));
}

export function getBotFormationBand(
  unit: UnitInstance,
  content: GameContent,
): BotFormationBand {
  const definition = getUnitDefinition(unit.definitionId, content);
  if (!definition) return "middle";
  const traits = new Set(definition.traits);
  const isFrontliner = traits.has("guardian") || traits.has("brawler");
  const isBackliner =
    traits.has("marksman") ||
    traits.has("specialist") ||
    definition.stats.range >= 4;
  if (isBackliner && !isFrontliner) return "backline";
  if (isFrontliner) return "frontline";
  if (traits.has("captain") || traits.has("swordsman")) return "flex";
  return "middle";
}
