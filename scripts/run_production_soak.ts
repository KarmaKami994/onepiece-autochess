import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_CONTENT,
  advanceMatchPhase,
  createMatch,
  getActiveTraits,
  getStageDefinition,
  type MatchState,
  type PlayerState,
  type UnitInstance,
} from "../game/index";

export type ProductionSoakReport = {
  generatedAt: string;
  seeds: number;
  completeMatches: number;
  crashes: number;
  minRounds: number;
  maxRounds: number;
  averageRounds: number;
  averageFullClockMinutes: number;
  averagePacedMinutes: number;
  battleCount: number;
  timeoutRate: number;
  drawRate: number;
  characterPresence: Record<
    string,
    { finalBoards: number; winningBoards: number; winRate: number }
  >;
  traitReachability: Record<string, { activations: number; maxTier: number }>;
  itemUsage: Record<string, number>;
  targets: {
    matchLength20To30Minutes: boolean;
    noCharacterAbove65PercentOfWinningBoards: boolean;
    everyTraitReached: boolean;
  };
};

type MutableCounter = Record<string, number>;

function increment(counter: MutableCounter, key: string, amount = 1): void {
  counter[key] = (counter[key] ?? 0) + amount;
}

function finalCrew(player: PlayerState): UnitInstance[] {
  const current = Object.values(player.units);
  return current.length > 0 ? current : player.finalCrew;
}

function deployedDefinitions(player: PlayerState): Set<string> {
  return new Set(
    Object.values(player.board)
      .map((unitId) => player.units[unitId]?.definitionId)
      .filter((definitionId): definitionId is string => Boolean(definitionId)),
  );
}

function recordCharacterBoard(
  definitionIds: Iterable<string>,
  characterBoards: MutableCounter,
): void {
  for (const definitionId of new Set(definitionIds)) {
    increment(characterBoards, definitionId);
  }
}

function recordFinalItems(
  player: PlayerState,
  itemUsage: MutableCounter,
): void {
  const crew = finalCrew(player);
  for (const unit of crew) {
    for (const itemId of unit.items) increment(itemUsage, itemId);
  }
  for (const itemId of player.inventory) increment(itemUsage, itemId);
}

function recordTraits(
  state: MatchState,
  traitActivations: MutableCounter,
  traitMaxTier: MutableCounter,
): void {
  for (const player of state.players.filter((candidate) => candidate.alive)) {
    for (const active of getActiveTraits(player)) {
      if (active.tierIndex < 0) continue;
      increment(traitActivations, active.traitId);
      traitMaxTier[active.traitId] = Math.max(
        traitMaxTier[active.traitId] ?? 0,
        active.tierIndex + 1,
      );
    }
  }
}

export function runProductionSoak(seedCount = 1_000): ProductionSoakReport {
  if (!Number.isInteger(seedCount) || seedCount <= 0) {
    throw new Error("seedCount must be a positive integer");
  }

  const rounds: number[] = [];
  const fullClockSeconds: number[] = [];
  const pacedSeconds: number[] = [];
  const characterBoards: MutableCounter = {};
  const winningBoards: MutableCounter = {};
  const traitActivations: MutableCounter = {};
  const traitMaxTier: MutableCounter = {};
  const itemUsage: MutableCounter = {};
  let completeMatches = 0;
  let crashes = 0;
  let battleCount = 0;
  let timeouts = 0;
  let draws = 0;

  for (let seedIndex = 0; seedIndex < seedCount; seedIndex += 1) {
    try {
      let state = createMatch(`production-${seedIndex}`, DEFAULT_CONTENT);
      const human = state.players.find((player) => player.id === "player-1");
      if (!human) throw new Error("Human player missing");
      human.isBot = true;
      human.personalityId = "balanced";
      const lastDeployedBoards = new Map<string, Set<string>>();

      let transitions = 0;
      let fullSeconds = 0;
      let paced = 0;
      while (state.phase !== "game-over" && transitions < 400) {
        if (state.phase === "preparation") {
          const stage = getStageDefinition(state.round, DEFAULT_CONTENT);
          fullSeconds += stage.preparationSeconds;
          paced += Math.min(stage.preparationSeconds, 15);
        } else if (state.phase === "battle") {
          for (const player of state.players.filter((candidate) => candidate.alive)) {
            lastDeployedBoards.set(player.id, deployedDefinitions(player));
          }
          recordTraits(state, traitActivations, traitMaxTier);
          const longestBattleTicks = state.lastResults.reduce(
            (maximum, result) => Math.max(maximum, result.durationTicks),
            0,
          );
          const battleSeconds =
            (longestBattleTicks * DEFAULT_CONTENT.config.combatTickMs) / 1_000;
          fullSeconds += battleSeconds;
          paced += battleSeconds;
          for (const result of state.lastResults) {
            battleCount += 1;
            if (result.timedOut) timeouts += 1;
            if (result.winnerId === null) draws += 1;
          }
        } else if (state.phase === "carousel") {
          fullSeconds += 10;
          paced += 3;
        }

        state = advanceMatchPhase(state, DEFAULT_CONTENT);
        const activeHuman = state.players.find(
          (player) => player.id === "player-1",
        );
        if (activeHuman) activeHuman.isBot = true;
        transitions += 1;
      }

      if (state.phase !== "game-over" || !state.winnerId) {
        throw new Error(
          `Match exceeded transition guard at round ${state.round}`,
        );
      }
      completeMatches += 1;
      rounds.push(state.round);
      fullClockSeconds.push(fullSeconds);
      pacedSeconds.push(paced);

      for (const player of state.players) {
        recordCharacterBoard(
          lastDeployedBoards.get(player.id) ?? deployedDefinitions(player),
          characterBoards,
        );
        recordFinalItems(player, itemUsage);
      }
      const winner = state.players.find(
        (player) => player.id === state.winnerId,
      );
      if (!winner) throw new Error("Winner missing from player list");
      recordCharacterBoard(
        lastDeployedBoards.get(winner.id) ?? deployedDefinitions(winner),
        winningBoards,
      );
      if (seedCount >= 100 && (seedIndex + 1) % 50 === 0) {
        process.stderr.write(
          `[production-soak] ${seedIndex + 1}/${seedCount} matches complete\n`,
        );
      }
    } catch (error) {
      crashes += 1;
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Production seed ${seedIndex} failed: ${detail}`);
    }
  }

  const average = (values: number[]) =>
    values.reduce((total, value) => total + value, 0) /
    Math.max(1, values.length);
  const characterPresence = Object.fromEntries(
    DEFAULT_CONTENT.units.map((unit) => {
      const finalBoards = characterBoards[unit.id] ?? 0;
      const characterWins = winningBoards[unit.id] ?? 0;
      return [
        unit.id,
        {
          finalBoards,
          winningBoards: characterWins,
          winRate: finalBoards > 0 ? characterWins / finalBoards : 0,
        },
      ];
    }),
  );
  const traitReachability = Object.fromEntries(
    DEFAULT_CONTENT.traits.map((trait) => [
      trait.id,
      {
        activations: traitActivations[trait.id] ?? 0,
        maxTier: traitMaxTier[trait.id] ?? 0,
      },
    ]),
  );
  const averagePacedMinutes = average(pacedSeconds) / 60;
  const averageFullClockMinutes = average(fullClockSeconds) / 60;
  const maximumWinnerPresence = Math.max(
    0,
    ...Object.values(winningBoards).map((wins) => wins / seedCount),
  );

  return {
    generatedAt: new Date().toISOString(),
    seeds: seedCount,
    completeMatches,
    crashes,
    minRounds: Math.min(...rounds),
    maxRounds: Math.max(...rounds),
    averageRounds: average(rounds),
    averageFullClockMinutes,
    averagePacedMinutes,
    battleCount,
    timeoutRate: timeouts / Math.max(1, battleCount),
    drawRate: draws / Math.max(1, battleCount),
    characterPresence,
    traitReachability,
    itemUsage: Object.fromEntries(
      DEFAULT_CONTENT.items.map((item) => [item.id, itemUsage[item.id] ?? 0]),
    ),
    targets: {
      matchLength20To30Minutes:
        averageFullClockMinutes >= 20 && averageFullClockMinutes <= 30,
      noCharacterAbove65PercentOfWinningBoards:
        maximumWinnerPresence <= 0.65,
      everyTraitReached: Object.values(traitReachability).every(
        (trait) => trait.activations > 0,
      ),
    },
  };
}

function argumentValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length,
  );
}

async function main(): Promise<void> {
  const seeds = Number(argumentValue("seeds") ?? 1_000);
  const report = runProductionSoak(seeds);
  const outputPath = argumentValue("out");
  if (outputPath) {
    const absolute = path.resolve(outputPath);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  await main();
}
