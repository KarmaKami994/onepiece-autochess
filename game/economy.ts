import { weightedIndex } from "./rng";
import type { GameContent, MatchState, PlayerState } from "./types";

export function returnShopToPool(
  state: MatchState,
  player: PlayerState,
): void {
  for (const definitionId of player.shop) {
    if (definitionId) {
      state.pool[definitionId] = (state.pool[definitionId] ?? 0) + 1;
    }
  }
  player.shop = player.shop.map(() => null);
}

function rollOneShopUnit(
  state: MatchState,
  player: PlayerState,
  content: GameContent,
): string | null {
  const odds =
    content.config.shopOddsByLevel[String(player.level)] ??
    content.config.shopOddsByLevel[String(content.config.maxLevel)];
  const availableByCost = [1, 2, 3, 4, 5].map((cost) =>
    content.units.some(
      (unit) => unit.cost === cost && (state.pool[unit.id] ?? 0) > 0,
    ),
  );
  const costRoll = weightedIndex(
    odds.map((weight, index) => (availableByCost[index] ? weight : 0)),
    state.rngState,
  );
  state.rngState = costRoll.state;
  if (costRoll.index < 0) return null;
  const cost = costRoll.index + 1;
  const candidates = content.units
    .filter((unit) => unit.cost === cost)
    .sort((left, right) => left.id.localeCompare(right.id));
  const unitRoll = weightedIndex(
    candidates.map((unit) => state.pool[unit.id] ?? 0),
    state.rngState,
  );
  state.rngState = unitRoll.state;
  const selected = candidates[unitRoll.index];
  if (!selected || (state.pool[selected.id] ?? 0) <= 0) return null;
  state.pool[selected.id] -= 1;
  return selected.id;
}

export function rollShop(
  state: MatchState,
  player: PlayerState,
  content: GameContent,
): void {
  player.shop = Array.from(
    { length: content.config.shopSize },
    () => rollOneShopUnit(state, player, content),
  );
}

export function refillEmptyShopSlots(
  state: MatchState,
  player: PlayerState,
  content: GameContent,
): void {
  player.shop = player.shop.map((definitionId) =>
    definitionId ?? rollOneShopUnit(state, player, content),
  );
}

export function gainXp(
  player: PlayerState,
  amount: number,
  content: GameContent,
): void {
  if (player.level >= content.config.maxLevel) {
    player.xp = 0;
    return;
  }
  player.xp += amount;
  while (player.level < content.config.maxLevel) {
    const required =
      content.config.xpToNextByLevel[String(player.level)] ??
      Number.POSITIVE_INFINITY;
    if (player.xp < required) break;
    player.xp -= required;
    player.level += 1;
  }
  if (player.level >= content.config.maxLevel) player.xp = 0;
}

export function streakIncome(
  player: PlayerState,
  content: GameContent,
): number {
  const streak = Math.max(player.winStreak, player.lossStreak);
  return Math.min(content.config.maxStreakBonus, Math.max(0, streak - 1));
}
