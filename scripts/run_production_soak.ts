import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_CONTENT,
  CURRENT_SAVE_SCHEMA_VERSION,
  CAROUSEL_TICK_MS,
  advanceMatchPhase,
  createMatch,
  getActiveTraits,
  getStageDefinition,
  hashCanonicalValue,
  hashGameContent,
  type BattleEvent,
  type MatchBattleResult,
  type MatchState,
  type PlayerState,
  type UnitInstance,
} from "../game/index";

type ConfidenceInterval = { low: number; high: number };

export type CharacterPresenceReport = {
  cost: number;
  finalBoards: number;
  top4Boards: number;
  winningBoards: number;
  top4Rate: number;
  winRate: number;
  averagePlacement: number;
  winnerPresenceRate: number;
  finalBoardPresenceRate: number;
  battleBoardAppearances: number;
  top4RateDeltaVsCostBand: number;
  winRateDeltaVsCostBand: number;
  averagePlacementDeltaVsCostBand: number;
  top4RateConfidence95: ConfidenceInterval | null;
  winRateConfidence95: ConfidenceInterval | null;
};

export type CostBandReport = {
  cost: number;
  unitIds: string[];
  unitCount: number;
  finalBoards: number;
  top4Boards: number;
  winningBoards: number;
  top4Rate: number;
  winRate: number;
  averagePlacement: number;
};

export type CharacterCombatExpressionReport = {
  battleBoardAppearances: number;
  casts: number;
  castTargets: number;
  abilityDamageEvents: number;
  totalAbilityDamage: number;
  kills: number;
  stunsApplied: number;
  stunDurationTicks: number;
  burnsApplied: number;
  displacements: { lunge: number; knockback: number; pull: number };
  heals: { events: number; amount: number };
  shields: { events: number; amount: number };
  castsPerBattleBoardAppearance: number;
  averageTargetsPerCast: number;
  abilityDamagePerCast: number;
  controlEventsPerCast: number;
};

export type CombatReadabilityReport = {
  pvpBattleCount: number;
  casts: number;
  castTargets: number;
  multiTargetCasts: number;
  abilityHitEvents: number;
  statusApplications: { stun: number; burn: number; emergencyShield: number };
  displacements: { lunge: number; knockback: number; pull: number };
  abilityDrainEvents: number;
  totalEnergyDrained: number;
  castsPerPvpBattle: number;
  castTargetsPerPvpBattle: number;
  multiTargetCastsPerPvpBattle: number;
  abilityHitEventsPerPvpBattle: number;
  stunsPerPvpBattle: number;
  statusApplicationsPerPvpBattle: number;
  displacementsPerPvpBattle: number;
  abilityDrainEventsPerPvpBattle: number;
  energyDrainedPerPvpBattle: number;
  controlEventsPerPvpBattle: number;
};

export type ProductionSoakReport = {
  generatedAt: string;
  gitSha: string;
  nodeVersion: string;
  schemaVersion: number;
  contentVersion: string;
  contentHash: string;
  configHash: string;
  seedRange: { first: string; last: string };
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
  characterPresence: Record<string, CharacterPresenceReport>;
  costBands: Record<string, CostBandReport>;
  characterCombatExpression: Record<
    string,
    CharacterCombatExpressionReport
  >;
  combatReadability: CombatReadabilityReport;
  traitReachability: Record<string, { activations: number; maxTier: number }>;
  itemUsage: Record<string, number>;
  targets: {
    matchLength20To30Minutes: boolean;
    noCharacterAbove65PercentOfWinningBoards: boolean;
    everyTraitReached: boolean;
  };
};

function currentGitSha(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

type MutableCounter = Record<string, number>;

function increment(counter: MutableCounter, key: string, amount = 1): void {
  counter[key] = (counter[key] ?? 0) + amount;
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function wilson95(successes: number, observations: number): ConfidenceInterval | null {
  if (observations <= 0) return null;
  const z = 1.96;
  const proportion = successes / observations;
  const zSquared = z * z;
  const denominator = 1 + zSquared / observations;
  const center = (proportion + zSquared / (2 * observations)) / denominator;
  const margin =
    (z /
      denominator) *
    Math.sqrt(
      (proportion * (1 - proportion)) / observations +
        zSquared / (4 * observations * observations),
    );
  return {
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin),
  };
}

type MutableCharacterCombatExpression = Omit<
  CharacterCombatExpressionReport,
  | "castsPerBattleBoardAppearance"
  | "averageTargetsPerCast"
  | "abilityDamagePerCast"
  | "controlEventsPerCast"
>;

type MutableCombatReadability = Omit<
  CombatReadabilityReport,
  | "castsPerPvpBattle"
  | "castTargetsPerPvpBattle"
  | "multiTargetCastsPerPvpBattle"
  | "abilityHitEventsPerPvpBattle"
  | "stunsPerPvpBattle"
  | "statusApplicationsPerPvpBattle"
  | "displacementsPerPvpBattle"
  | "abilityDrainEventsPerPvpBattle"
  | "energyDrainedPerPvpBattle"
  | "controlEventsPerPvpBattle"
>;

function emptyCharacterCombatExpression(): MutableCharacterCombatExpression {
  return {
    battleBoardAppearances: 0,
    casts: 0,
    castTargets: 0,
    abilityDamageEvents: 0,
    totalAbilityDamage: 0,
    kills: 0,
    stunsApplied: 0,
    stunDurationTicks: 0,
    burnsApplied: 0,
    displacements: { lunge: 0, knockback: 0, pull: 0 },
    heals: { events: 0, amount: 0 },
    shields: { events: 0, amount: 0 },
  };
}

function emptyCombatReadability(): MutableCombatReadability {
  return {
    pvpBattleCount: 0,
    casts: 0,
    castTargets: 0,
    multiTargetCasts: 0,
    abilityHitEvents: 0,
    statusApplications: { stun: 0, burn: 0, emergencyShield: 0 },
    displacements: { lunge: 0, knockback: 0, pull: 0 },
    abilityDrainEvents: 0,
    totalEnergyDrained: 0,
  };
}

function sourceDefinitionIds(
  result: MatchBattleResult,
  rosterIds: ReadonlySet<string>,
): Map<string, string> {
  return new Map(
    result.initialUnits
      .filter(
        (unit) =>
          rosterIds.has(unit.definitionId) && !unit.teamId.startsWith("ghost-"),
      )
      .map((unit) => [unit.id, unit.definitionId]),
  );
}

function recordCharacterEvent(
  event: BattleEvent,
  sourceDefinitions: ReadonlyMap<string, string>,
  expressions: Record<string, MutableCharacterCombatExpression>,
): void {
  const sourceId = "sourceId" in event ? event.sourceId : null;
  if (!sourceId) return;
  const definitionId = sourceDefinitions.get(sourceId);
  if (!definitionId) return;
  const expression = expressions[definitionId];
  if (!expression) return;

  switch (event.type) {
    case "cast":
      expression.casts += 1;
      expression.castTargets += event.targetIds.length;
      break;
    case "damage":
      if (event.damageKind === "ability") {
        expression.abilityDamageEvents += 1;
        expression.totalAbilityDamage += event.amount;
      }
      break;
    case "death":
      expression.kills += 1;
      break;
    case "status":
      if (event.status === "stun") {
        expression.stunsApplied += 1;
        expression.stunDurationTicks += event.durationTicks;
      } else if (event.status === "burn") {
        expression.burnsApplied += 1;
      }
      break;
    case "unit-displace":
      expression.displacements[event.movementKind] += 1;
      break;
    case "heal":
      expression.heals.events += 1;
      expression.heals.amount += event.amount;
      break;
    case "shield":
      expression.shields.events += 1;
      expression.shields.amount += event.amount;
      break;
    default:
      break;
  }
}

function recordPvpResult(
  result: MatchBattleResult,
  rosterIds: ReadonlySet<string>,
  expressions: Record<string, MutableCharacterCombatExpression>,
  readability: MutableCombatReadability,
): void {
  readability.pvpBattleCount += 1;
  const sourceDefinitions = sourceDefinitionIds(result, rosterIds);
  for (const event of result.events) {
    recordCharacterEvent(event, sourceDefinitions, expressions);
    switch (event.type) {
      case "cast":
        readability.casts += 1;
        readability.castTargets += event.targetIds.length;
        if (event.targetIds.length > 1) readability.multiTargetCasts += 1;
        break;
      case "ability-hit":
        readability.abilityHitEvents += 1;
        break;
      case "status":
        if (event.status === "stun") readability.statusApplications.stun += 1;
        else if (event.status === "burn") readability.statusApplications.burn += 1;
        else if (event.status === "emergency-shield") {
          readability.statusApplications.emergencyShield += 1;
        }
        break;
      case "unit-displace":
        readability.displacements[event.movementKind] += 1;
        break;
      case "energy":
        if (event.reason === "ability-drain" && event.amount < 0) {
          readability.abilityDrainEvents += 1;
          readability.totalEnergyDrained += -event.amount;
        }
        break;
      default:
        break;
    }
  }
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

export function runProductionSoak(seedCount = 50): ProductionSoakReport {
  if (!Number.isInteger(seedCount) || seedCount <= 0) {
    throw new Error("seedCount must be a positive integer");
  }

  const rounds: number[] = [];
  const fullClockSeconds: number[] = [];
  const pacedSeconds: number[] = [];
  const characterBoards: MutableCounter = {};
  const top4Boards: MutableCounter = {};
  const winningBoards: MutableCounter = {};
  const placementTotals: MutableCounter = {};
  const rosterIds = new Set(DEFAULT_CONTENT.units.map((unit) => unit.id));
  const characterCombatExpressions = Object.fromEntries(
    DEFAULT_CONTENT.units.map((unit) => [
      unit.id,
      emptyCharacterCombatExpression(),
    ]),
  );
  const combatReadability = emptyCombatReadability();
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
          const stage = getStageDefinition(state.round, DEFAULT_CONTENT);
          for (const player of state.players.filter((candidate) => candidate.alive)) {
            const definitions = deployedDefinitions(player);
            lastDeployedBoards.set(player.id, definitions);
            if (stage.kind === "pvp") {
              for (const definitionId of definitions) {
                const expression = characterCombatExpressions[definitionId];
                if (expression) expression.battleBoardAppearances += 1;
              }
            }
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
            if (stage.kind === "pvp") {
              recordPvpResult(
                result,
                rosterIds,
                characterCombatExpressions,
                combatReadability,
              );
            }
          }
        } else if (state.phase === "carousel") {
          const carouselSeconds = state.carouselSession
            ? (state.carouselSession.durationTicks * CAROUSEL_TICK_MS) / 1_000
            : 0;
          fullSeconds += carouselSeconds;
          paced += carouselSeconds;
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
        if (player.placement === null) {
          throw new Error(`Final placement missing for ${player.id}`);
        }
        const definitions =
          lastDeployedBoards.get(player.id) ?? deployedDefinitions(player);
        recordCharacterBoard(definitions, characterBoards);
        for (const definitionId of definitions) {
          increment(placementTotals, definitionId, player.placement);
          if (player.placement <= 4) increment(top4Boards, definitionId);
          if (player.placement === 1) increment(winningBoards, definitionId);
        }
        recordFinalItems(player, itemUsage);
      }
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
  const costBands = Object.fromEntries(
    [1, 2, 3, 4, 5].map((cost) => {
      const units = DEFAULT_CONTENT.units.filter((unit) => unit.cost === cost);
      const finalBoards = units.reduce(
        (total, unit) => total + (characterBoards[unit.id] ?? 0),
        0,
      );
      const bandTop4Boards = units.reduce(
        (total, unit) => total + (top4Boards[unit.id] ?? 0),
        0,
      );
      const bandWinningBoards = units.reduce(
        (total, unit) => total + (winningBoards[unit.id] ?? 0),
        0,
      );
      const placementTotal = units.reduce(
        (total, unit) => total + (placementTotals[unit.id] ?? 0),
        0,
      );
      return [
        String(cost),
        {
          cost,
          unitIds: units.map((unit) => unit.id),
          unitCount: units.length,
          finalBoards,
          top4Boards: bandTop4Boards,
          winningBoards: bandWinningBoards,
          top4Rate: rate(bandTop4Boards, finalBoards),
          winRate: rate(bandWinningBoards, finalBoards),
          averagePlacement: rate(placementTotal, finalBoards),
        } satisfies CostBandReport,
      ];
    }),
  ) as Record<string, CostBandReport>;
  const finalBoardSlots = completeMatches * DEFAULT_CONTENT.config.playerCount;
  const characterPresence = Object.fromEntries(
    DEFAULT_CONTENT.units.map((unit) => {
      const finalBoards = characterBoards[unit.id] ?? 0;
      const characterTop4Boards = top4Boards[unit.id] ?? 0;
      const characterWins = winningBoards[unit.id] ?? 0;
      const top4Rate = rate(characterTop4Boards, finalBoards);
      const winRate = rate(characterWins, finalBoards);
      const averagePlacement = rate(placementTotals[unit.id] ?? 0, finalBoards);
      const costBand = costBands[String(unit.cost)];
      return [
        unit.id,
        {
          cost: unit.cost,
          finalBoards,
          top4Boards: characterTop4Boards,
          winningBoards: characterWins,
          top4Rate,
          winRate,
          averagePlacement,
          winnerPresenceRate: rate(characterWins, completeMatches),
          finalBoardPresenceRate: rate(finalBoards, finalBoardSlots),
          battleBoardAppearances:
            characterCombatExpressions[unit.id].battleBoardAppearances,
          top4RateDeltaVsCostBand: top4Rate - costBand.top4Rate,
          winRateDeltaVsCostBand: winRate - costBand.winRate,
          averagePlacementDeltaVsCostBand:
            averagePlacement - costBand.averagePlacement,
          top4RateConfidence95: wilson95(characterTop4Boards, finalBoards),
          winRateConfidence95: wilson95(characterWins, finalBoards),
        } satisfies CharacterPresenceReport,
      ];
    }),
  );
  const characterCombatExpression = Object.fromEntries(
    DEFAULT_CONTENT.units.map((unit) => {
      const expression = characterCombatExpressions[unit.id];
      const controlEvents =
        expression.stunsApplied +
        expression.displacements.lunge +
        expression.displacements.knockback +
        expression.displacements.pull;
      return [
        unit.id,
        {
          ...expression,
          castsPerBattleBoardAppearance: rate(
            expression.casts,
            expression.battleBoardAppearances,
          ),
          averageTargetsPerCast: rate(expression.castTargets, expression.casts),
          abilityDamagePerCast: rate(
            expression.totalAbilityDamage,
            expression.casts,
          ),
          controlEventsPerCast: rate(controlEvents, expression.casts),
        } satisfies CharacterCombatExpressionReport,
      ];
    }),
  );
  const totalStatusApplications =
    combatReadability.statusApplications.stun +
    combatReadability.statusApplications.burn +
    combatReadability.statusApplications.emergencyShield;
  const totalDisplacements =
    combatReadability.displacements.lunge +
    combatReadability.displacements.knockback +
    combatReadability.displacements.pull;
  const finalizedCombatReadability: CombatReadabilityReport = {
    ...combatReadability,
    castsPerPvpBattle: rate(
      combatReadability.casts,
      combatReadability.pvpBattleCount,
    ),
    castTargetsPerPvpBattle: rate(
      combatReadability.castTargets,
      combatReadability.pvpBattleCount,
    ),
    multiTargetCastsPerPvpBattle: rate(
      combatReadability.multiTargetCasts,
      combatReadability.pvpBattleCount,
    ),
    abilityHitEventsPerPvpBattle: rate(
      combatReadability.abilityHitEvents,
      combatReadability.pvpBattleCount,
    ),
    stunsPerPvpBattle: rate(
      combatReadability.statusApplications.stun,
      combatReadability.pvpBattleCount,
    ),
    statusApplicationsPerPvpBattle: rate(
      totalStatusApplications,
      combatReadability.pvpBattleCount,
    ),
    displacementsPerPvpBattle: rate(
      totalDisplacements,
      combatReadability.pvpBattleCount,
    ),
    abilityDrainEventsPerPvpBattle: rate(
      combatReadability.abilityDrainEvents,
      combatReadability.pvpBattleCount,
    ),
    energyDrainedPerPvpBattle: rate(
      combatReadability.totalEnergyDrained,
      combatReadability.pvpBattleCount,
    ),
    controlEventsPerPvpBattle: rate(
      combatReadability.statusApplications.stun +
        totalDisplacements +
        combatReadability.abilityDrainEvents,
      combatReadability.pvpBattleCount,
    ),
  };
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
    ...Object.values(winningBoards).map((wins) => rate(wins, completeMatches)),
  );

  return {
    generatedAt: new Date().toISOString(),
    gitSha: currentGitSha(),
    nodeVersion: process.version,
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    contentVersion: DEFAULT_CONTENT.version,
    contentHash: hashGameContent(DEFAULT_CONTENT),
    configHash: hashCanonicalValue(DEFAULT_CONTENT.config),
    seedRange: {
      first: "production-0",
      last: `production-${seedCount - 1}`,
    },
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
    costBands,
    characterCombatExpression,
    combatReadability: finalizedCombatReadability,
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
  const seeds = Number(argumentValue("seeds") ?? 50);
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
