import type {
  BattleUnitSnapshot,
  PlayerState,
  RecentBattleOutcome,
  RecentBattleRecord,
} from "./types";

export function compareSimultaneousEliminations(
  left: Pick<PlayerState, "hp" | "level" | "id">,
  right: Pick<PlayerState, "hp" | "level" | "id">,
): number {
  if (left.hp !== right.hp) {
    return right.hp - left.hp;
  }
  if (left.level !== right.level) {
    return right.level - left.level;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function calculateLossDamage(
  winnerTeamId: string | null,
  finalUnits: BattleUnitSnapshot[],
): number {
  if (!winnerTeamId) return 0;
  const survivors = finalUnits.filter(
    (unit) =>
      unit.teamId === winnerTeamId && unit.state !== "dead" && unit.hp > 0,
  );
  return Math.max(1, 1 + survivors.reduce((sum, unit) => sum + unit.star, 0));
}

export function updateStreak(
  player: PlayerState,
  result: RecentBattleOutcome,
): void {
  if (result === "win") {
    player.winStreak += 1;
    player.lossStreak = 0;
  } else if (result === "loss") {
    player.lossStreak += 1;
    player.winStreak = 0;
  } else {
    player.winStreak = 0;
    player.lossStreak = 0;
  }
}

export function battleOutcomeFor(
  playerId: string,
  winnerId: string | null,
): RecentBattleOutcome {
  return winnerId === null ? "draw" : winnerId === playerId ? "win" : "loss";
}

export function appendRecentBattle(
  player: PlayerState,
  record: RecentBattleRecord,
): void {
  player.recentBattles = [...player.recentBattles, record].slice(-5);
}
