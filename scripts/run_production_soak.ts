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
  getActiveTraitsForUnits,
  getStageDefinition,
  hashCanonicalValue,
  hashGameContent,
  type BattleEvent,
  type MatchBattleResult,
  type MatchState,
  type PlayerState,
  type UnitFormLifecycle,
  type UnitInstance,
} from "../game/index";

type ConfidenceInterval = { low: number; high: number };

const PRODUCTION_FORM_IDS = [
  "robin-demonio-fleur",
  "luffy-gear-4-boundman",
  "luffy-gear-4-snakeman",
  "chopper-monster-point",
] as const;

type ProductionFormId = (typeof PRODUCTION_FORM_IDS)[number];

const PILOT_IDENTITY_KEYS = [
  "chopper:base",
  "chopper-monster-point",
  "robin:base",
  "robin-demonio-fleur",
  "luffy:base",
  "luffy-gear-4-boundman",
  "luffy-gear-4-snakeman",
] as const;

type PilotIdentityKey = (typeof PILOT_IDENTITY_KEYS)[number];

type FinalBoardOutcomeReport = {
  finalBoards: number;
  top4Boards: number;
  winningBoards: number;
  top4Rate: number | null;
  winRate: number | null;
  averagePlacement: number | null;
  top4RateConfidence95: ConfidenceInterval | null;
  winRateConfidence95: ConfidenceInterval | null;
};

export type FormReachabilityReport = FinalBoardOutcomeReport & {
  baseDefinitionId: string;
  lifecycle: UnitFormLifecycle;
  battleStartUnitAppearances: number;
  transformEvents: number;
  matchesReached: number;
  finalBoardShareOfBaseCharacter: number;
  winnerPresenceRate: number;
};

export type PilotCombatExpressionReport = Omit<
  CharacterCombatExpressionReport,
  "battleBoardAppearances" | "castsPerBattleBoardAppearance"
> & {
  sourceAppearances: number;
  castsPerSourceAppearance: number;
};

export type PilotFormReachabilityReport = {
  robin: {
    allFinalBoards: number;
    threeStarFinalBoards: number;
    demonioFinalBoards: number;
    demonioThreeStarFinalBoards: number;
    nonDemonioThreeStarFinalBoards: number;
    demonioShareOfAllFinalBoards: number;
    demonioShareOfThreeStarFinalBoards: number;
    threeStarInvariantHolds: boolean;
  };
  luffy: {
    threeStarFinalBoards: number;
    branches: Record<
      "base" | "boundman" | "snakeman",
      FinalBoardOutcomeReport & { shareOfThreeStarFinalBoards: number }
    >;
  };
  chopper: {
    deployedBoards: number;
    eligibleBoards: number;
    eligibleBoardRate: number;
    eligibleCombatantAppearances: number;
    eligibleCombatantsDiedBeforeTransform: number;
    transformEvents: number;
    transformRateAmongEligibleCombatants: number;
    survivalToTriggerRate: number;
    transformedPlayerBattleBoards: number;
    matchesReached: number;
    transformsPerPvpBattle: number;
  };
};

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
  finalBoardRepresentationRate: number;
  finalBoardPlayerPresence: number;
  finalBoardPlayerPresenceRate: number;
  top4Boards: number;
  winningBoards: number;
  top4Rate: number;
  winRate: number;
  averagePlacement: number;
};

export type ShopPoolCostReport = {
  cost: number;
  unitIds: string[];
  initialCopiesPerUnit: number;
  eligiblePlayerPreparations: number;
  eligibleShopSlots: number;
  shopOffers: number;
  playerPreparationsWithOffer: number;
  offerRatePerEligibleSlot: number;
  playerPreparationOfferRate: number;
  poolDefinitionObservations: number;
  totalAvailablePoolCopies: number;
  averageAvailablePoolCopiesPerDefinition: number;
  zeroAvailablePoolDefinitions: number;
  zeroAvailabilityRate: number;
  finalCrewUnitInstances: number;
  finalCrewTwoStarOrHigherInstances: number;
};

export type TraitReachabilityReport = {
  activations: number;
  activationRate: number;
  matchesReached: number;
  matchReachRate: number;
  maxTier: number;
};

export type TraitTierReachabilityReport = {
  tier: number;
  required: number;
  activations: number;
  activationRate: number;
  matchesReached: number;
  matchReachRate: number;
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
  allEnemyAbilityCasts: number;
  defensePierceCasts: number;
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
  allEnemyAbilityCastsPerPvpBattle: number;
  defensePierceCastsPerPvpBattle: number;
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
  shopPoolAvailability: {
    preparationSnapshots: number;
    shopSlots: number;
    emptyShopSlots: number;
    emptyShopSlotRate: number;
    byCost: Record<string, ShopPoolCostReport>;
  };
  characterCombatExpression: Record<
    string,
    CharacterCombatExpressionReport
  >;
  formReachability: Record<ProductionFormId, FormReachabilityReport>;
  pilotFormReachability: PilotFormReachabilityReport;
  pilotCombatExpression: Record<
    PilotIdentityKey,
    PilotCombatExpressionReport
  >;
  formEventVolume: {
    unitTransformEvents: number;
    monsterPointTransformsPerPvpBattle: number;
  };
  combatReadability: CombatReadabilityReport;
  traitPlayerBattleBoards: number;
  traitReachability: Record<string, TraitReachabilityReport>;
  traitTierReachability: Record<string, TraitTierReachabilityReport[]>;
  traitCombinations: Record<
    string,
    {
      activations: number;
      activationRate: number;
      matchesReached: number;
      matchReachRate: number;
    }
  >;
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
  | "allEnemyAbilityCastsPerPvpBattle"
  | "defensePierceCastsPerPvpBattle"
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
    allEnemyAbilityCasts: 0,
    defensePierceCasts: 0,
  };
}

function productionFormCounter(): Record<ProductionFormId, number> {
  return Object.fromEntries(
    PRODUCTION_FORM_IDS.map((formId) => [formId, 0]),
  ) as Record<ProductionFormId, number>;
}

function emptyPilotCombatExpressions(): Record<
  PilotIdentityKey,
  MutableCharacterCombatExpression
> {
  return Object.fromEntries(
    PILOT_IDENTITY_KEYS.map((identity) => [
      identity,
      emptyCharacterCombatExpression(),
    ]),
  ) as Record<PilotIdentityKey, MutableCharacterCombatExpression>;
}

function isProductionFormId(formId: string | undefined): formId is ProductionFormId {
  return PRODUCTION_FORM_IDS.some((candidate) => candidate === formId);
}

function pilotIdentity(
  definitionId: string,
  formId: string | undefined,
): PilotIdentityKey | null {
  if (definitionId === "chopper") {
    return formId === "chopper-monster-point"
      ? "chopper-monster-point"
      : "chopper:base";
  }
  if (definitionId === "robin") {
    return formId === "robin-demonio-fleur"
      ? "robin-demonio-fleur"
      : "robin:base";
  }
  if (definitionId === "luffy") {
    if (formId === "luffy-gear-4-boundman") {
      return "luffy-gear-4-boundman";
    }
    if (formId === "luffy-gear-4-snakeman") {
      return "luffy-gear-4-snakeman";
    }
    return "luffy:base";
  }
  return null;
}

export function auditPilotFinalCrew(units: readonly UnitInstance[]) {
  const formIds = new Set<ProductionFormId>();
  const luffyThreeStarBranches = new Set<"base" | "boundman" | "snakeman">();
  let robinThreeStar = false;
  let demonio = false;
  let demonioThreeStar = false;
  let nonDemonioThreeStar = false;

  for (const unit of units) {
    if (isProductionFormId(unit.formId)) formIds.add(unit.formId);
    if (unit.definitionId === "robin") {
      if (unit.star === 3) {
        robinThreeStar = true;
        if (unit.formId !== "robin-demonio-fleur") {
          nonDemonioThreeStar = true;
        }
      }
      if (unit.formId === "robin-demonio-fleur") {
        demonio = true;
        if (unit.star === 3) demonioThreeStar = true;
      }
    }
    if (unit.definitionId === "luffy" && unit.star === 3) {
      if (unit.formId === "luffy-gear-4-boundman") {
        luffyThreeStarBranches.add("boundman");
      } else if (unit.formId === "luffy-gear-4-snakeman") {
        luffyThreeStarBranches.add("snakeman");
      } else {
        luffyThreeStarBranches.add("base");
      }
    }
  }

  return {
    formIds: [...formIds],
    robin: {
      threeStar: robinThreeStar,
      demonio,
      demonioThreeStar,
      nonDemonioThreeStar,
    },
    luffyThreeStarBranches: [...luffyThreeStarBranches],
  };
}

function sourceDefinitionIds(
  result: MatchBattleResult,
  rosterIds: ReadonlySet<string>,
  includeGhosts = false,
): Map<string, string> {
  return new Map(
    result.initialUnits
      .filter(
        (unit) =>
          rosterIds.has(unit.definitionId) &&
          (includeGhosts || !unit.teamId.startsWith("ghost-")),
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

export function auditFormBattleResult(result: MatchBattleResult) {
  const battleStartUnitAppearances = productionFormCounter();
  const transformEvents = productionFormCounter();
  const formsReached = new Set<ProductionFormId>();
  const pilotCombatExpression = emptyPilotCombatExpressions();
  const realUnits = result.initialUnits.filter(
    (unit) => !unit.teamId.startsWith("ghost-"),
  );
  const realUnitIds = new Set(realUnits.map((unit) => unit.id));
  const definitions = new Map(
    realUnits.map((unit) => [unit.id, unit.definitionId]),
  );
  const teamByUnit = new Map(realUnits.map((unit) => [unit.id, unit.teamId]));
  const currentIdentities = new Map<string, string>();
  const unitsByTeam = new Map<string, typeof realUnits>();

  for (const unit of realUnits) {
    const teamUnits = unitsByTeam.get(unit.teamId) ?? [];
    teamUnits.push(unit);
    unitsByTeam.set(unit.teamId, teamUnits);
    if (isProductionFormId(unit.formId)) {
      battleStartUnitAppearances[unit.formId] += 1;
      formsReached.add(unit.formId);
    }
    const identity = pilotIdentity(unit.definitionId, unit.formId);
    if (identity) {
      currentIdentities.set(unit.id, identity);
      pilotCombatExpression[identity].battleBoardAppearances += 1;
    }
  }

  let deployedChopperBoards = 0;
  let eligibleChopperBoards = 0;
  let eligibleChopperCombatantAppearances = 0;
  const eligibleChopperIds = new Set<string>();
  for (const units of unitsByTeam.values()) {
    const choppers = units.filter((unit) => unit.definitionId === "chopper");
    if (choppers.length === 0) continue;
    deployedChopperBoards += 1;
    const hasActiveStrawHat = getActiveTraitsForUnits(units).some(
      (trait) => trait.traitId === "straw-hat" && trait.tierIndex >= 0,
    );
    if (!hasActiveStrawHat) continue;
    eligibleChopperBoards += 1;
    eligibleChopperCombatantAppearances += choppers.length;
    for (const chopper of choppers) eligibleChopperIds.add(chopper.id);
  }

  let totalTransformEvents = 0;
  const transformedEligibleChoppers = new Set<string>();
  const eligibleDeathsBeforeTransform = new Set<string>();
  const transformedTeams = new Set<string>();
  for (const event of result.events) {
    if (event.type === "unit-transform") {
      if (!realUnitIds.has(event.unitId)) continue;
      totalTransformEvents += 1;
      if (isProductionFormId(event.toFormId)) {
        transformEvents[event.toFormId] += 1;
        formsReached.add(event.toFormId);
      }
      if (
        event.toFormId === "chopper-monster-point" &&
        eligibleChopperIds.has(event.unitId)
      ) {
        transformedEligibleChoppers.add(event.unitId);
        const teamId = teamByUnit.get(event.unitId);
        if (teamId) transformedTeams.add(teamId);
      }
      const definitionId = definitions.get(event.unitId);
      if (definitionId) {
        const nextIdentity = pilotIdentity(definitionId, event.toFormId);
        const previousIdentity = currentIdentities.get(event.unitId);
        if (nextIdentity && nextIdentity !== previousIdentity) {
          currentIdentities.set(event.unitId, nextIdentity);
          pilotCombatExpression[nextIdentity].battleBoardAppearances += 1;
        }
      }
      continue;
    }

    recordCharacterEvent(
      event,
      currentIdentities,
      pilotCombatExpression,
    );
    if (
      event.type === "death" &&
      eligibleChopperIds.has(event.unitId) &&
      !transformedEligibleChoppers.has(event.unitId)
    ) {
      eligibleDeathsBeforeTransform.add(event.unitId);
    }
  }

  return {
    battleStartUnitAppearances,
    transformEvents,
    formsReached: [...formsReached],
    pilotCombatExpression,
    totalTransformEvents,
    chopper: {
      deployedBoards: deployedChopperBoards,
      eligibleBoards: eligibleChopperBoards,
      eligibleCombatantAppearances: eligibleChopperCombatantAppearances,
      eligibleCombatantsDiedBeforeTransform:
        eligibleDeathsBeforeTransform.size,
      transformedPlayerBattleBoards: transformedTeams.size,
    },
  };
}

function mergeCombatExpression(
  target: MutableCharacterCombatExpression,
  source: MutableCharacterCombatExpression,
): void {
  target.battleBoardAppearances += source.battleBoardAppearances;
  target.casts += source.casts;
  target.castTargets += source.castTargets;
  target.abilityDamageEvents += source.abilityDamageEvents;
  target.totalAbilityDamage += source.totalAbilityDamage;
  target.kills += source.kills;
  target.stunsApplied += source.stunsApplied;
  target.stunDurationTicks += source.stunDurationTicks;
  target.burnsApplied += source.burnsApplied;
  target.displacements.lunge += source.displacements.lunge;
  target.displacements.knockback += source.displacements.knockback;
  target.displacements.pull += source.displacements.pull;
  target.heals.events += source.heals.events;
  target.heals.amount += source.heals.amount;
  target.shields.events += source.shields.events;
  target.shields.amount += source.shields.amount;
}

function finalBoardOutcome(
  finalBoards: number,
  top4Boards: number,
  winningBoards: number,
  placementTotal: number,
): FinalBoardOutcomeReport {
  return {
    finalBoards,
    top4Boards,
    winningBoards,
    top4Rate: finalBoards > 0 ? top4Boards / finalBoards : null,
    winRate: finalBoards > 0 ? winningBoards / finalBoards : null,
    averagePlacement: finalBoards > 0 ? placementTotal / finalBoards : null,
    top4RateConfidence95: wilson95(top4Boards, finalBoards),
    winRateConfidence95: wilson95(winningBoards, finalBoards),
  };
}

function recordPvpResult(
  result: MatchBattleResult,
  rosterIds: ReadonlySet<string>,
  allEnemyAbilityIds: ReadonlySet<string>,
  defensePierceAbilityIds: ReadonlySet<string>,
  expressions: Record<string, MutableCharacterCombatExpression>,
  readability: MutableCombatReadability,
): void {
  readability.pvpBattleCount += 1;
  const sourceDefinitions = sourceDefinitionIds(result, rosterIds);
  const readabilitySourceDefinitions = sourceDefinitionIds(
    result,
    rosterIds,
    true,
  );
  for (const event of result.events) {
    recordCharacterEvent(event, sourceDefinitions, expressions);
    switch (event.type) {
      case "cast":
        readability.casts += 1;
        readability.castTargets += event.targetIds.length;
        if (event.targetIds.length > 1) readability.multiTargetCasts += 1;
        {
          const definitionId = readabilitySourceDefinitions.get(event.sourceId);
          if (definitionId && allEnemyAbilityIds.has(definitionId)) {
            readability.allEnemyAbilityCasts += 1;
          }
          if (definitionId && defensePierceAbilityIds.has(definitionId)) {
            readability.defensePierceCasts += 1;
          }
        }
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
  traitTierActivations: MutableCounter,
  traitMaxTier: MutableCounter,
  traitsReachedInMatch: Set<string>,
  traitTiersReachedInMatch: Set<string>,
  traitObservations: { playerBattleBoards: number; emperorCaptain: number },
): void {
  for (const player of state.players.filter((candidate) => candidate.alive)) {
    traitObservations.playerBattleBoards += 1;
    const activeTraits = getActiveTraits(player).filter(
      (active) => active.tierIndex >= 0,
    );
    const activeTraitIds = new Set(activeTraits.map((active) => active.traitId));
    if (activeTraitIds.has("emperor") && activeTraitIds.has("captain")) {
      traitObservations.emperorCaptain += 1;
      traitsReachedInMatch.add("emperor+captain");
    }
    for (const active of activeTraits) {
      if (active.tierIndex < 0) continue;
      increment(traitActivations, active.traitId);
      traitsReachedInMatch.add(active.traitId);
      const tierKey = `${active.traitId}:${active.tierIndex + 1}`;
      increment(traitTierActivations, tierKey);
      traitTiersReachedInMatch.add(tierKey);
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
  const costFinalBoardPlayerPresence: MutableCounter = {};
  const rosterIds = new Set(DEFAULT_CONTENT.units.map((unit) => unit.id));
  const unitCostById = new Map(
    DEFAULT_CONTENT.units.map((unit) => [unit.id, unit.cost]),
  );
  const allEnemyAbilityIds = new Set(
    DEFAULT_CONTENT.units
      .filter((unit) => unit.ability.pattern === "all-enemies")
      .map((unit) => unit.id),
  );
  const defensePierceAbilityIds = new Set(
    DEFAULT_CONTENT.units
      .filter((unit) => (unit.ability.defensePiercePercent ?? 0) > 0)
      .map((unit) => unit.id),
  );
  const characterCombatExpressions = Object.fromEntries(
    DEFAULT_CONTENT.units.map((unit) => [
      unit.id,
      emptyCharacterCombatExpression(),
    ]),
  );
  const formBattleStartUnitAppearances = productionFormCounter();
  const formTransformEvents = productionFormCounter();
  const formMatchReach: MutableCounter = {};
  const formFinalBoards: MutableCounter = {};
  const formTop4Boards: MutableCounter = {};
  const formWinningBoards: MutableCounter = {};
  const formPlacementTotals: MutableCounter = {};
  const pilotCombatExpressions = emptyPilotCombatExpressions();
  const luffyBranchFinalBoards: MutableCounter = {};
  const luffyBranchTop4Boards: MutableCounter = {};
  const luffyBranchWinningBoards: MutableCounter = {};
  const luffyBranchPlacementTotals: MutableCounter = {};
  const chopperObservations = {
    deployedBoards: 0,
    eligibleBoards: 0,
    eligibleCombatantAppearances: 0,
    eligibleCombatantsDiedBeforeTransform: 0,
    transformedPlayerBattleBoards: 0,
  };
  const combatReadability = emptyCombatReadability();
  const traitActivations: MutableCounter = {};
  const traitTierActivations: MutableCounter = {};
  const traitMaxTier: MutableCounter = {};
  const traitMatchReach: MutableCounter = {};
  const traitTierMatchReach: MutableCounter = {};
  const traitObservations = { playerBattleBoards: 0, emperorCaptain: 0 };
  const shopPoolCounters = Object.fromEntries(
    [1, 2, 3, 4, 5].map((cost) => [
      String(cost),
      {
        eligiblePlayerPreparations: 0,
        eligibleShopSlots: 0,
        shopOffers: 0,
        playerPreparationsWithOffer: 0,
        poolDefinitionObservations: 0,
        totalAvailablePoolCopies: 0,
        zeroAvailablePoolDefinitions: 0,
        finalCrewUnitInstances: 0,
        finalCrewTwoStarOrHigherInstances: 0,
      },
    ]),
  );
  const itemUsage: MutableCounter = {};
  let completeMatches = 0;
  let crashes = 0;
  let battleCount = 0;
  let timeouts = 0;
  let draws = 0;
  let preparationSnapshots = 0;
  let shopSlots = 0;
  let emptyShopSlots = 0;
  let robinThreeStarFinalBoards = 0;
  let demonioThreeStarFinalBoards = 0;
  let nonDemonioThreeStarFinalBoards = 0;
  let luffyThreeStarFinalBoards = 0;
  let totalTransformEvents = 0;

  for (let seedIndex = 0; seedIndex < seedCount; seedIndex += 1) {
    try {
      let state = createMatch(`production-${seedIndex}`, DEFAULT_CONTENT);
      const human = state.players.find((player) => player.id === "player-1");
      if (!human) throw new Error("Human player missing");
      human.isBot = true;
      human.personalityId = "balanced";
      const lastDeployedBoards = new Map<string, Set<string>>();
      const traitsReachedInMatch = new Set<string>();
      const traitTiersReachedInMatch = new Set<string>();
      const formsReachedInMatch = new Set<ProductionFormId>();

      let transitions = 0;
      let fullSeconds = 0;
      let paced = 0;
      while (state.phase !== "game-over" && transitions < 400) {
        if (state.phase === "preparation") {
          preparationSnapshots += 1;
          const stage = getStageDefinition(state.round, DEFAULT_CONTENT);
          fullSeconds += stage.preparationSeconds;
          paced += Math.min(stage.preparationSeconds, 15);
          const alivePlayers = state.players.filter((player) => player.alive);
          for (const player of alivePlayers) {
            shopSlots += player.shop.length;
            emptyShopSlots += player.shop.filter((offer) => offer === null).length;
            const offersByCost = new Map<number, number>();
            for (const definitionId of player.shop) {
              if (!definitionId) continue;
              const cost = unitCostById.get(definitionId);
              if (cost) offersByCost.set(cost, (offersByCost.get(cost) ?? 0) + 1);
            }
            const odds =
              DEFAULT_CONTENT.config.shopOddsByLevel[String(player.level)] ??
              DEFAULT_CONTENT.config.shopOddsByLevel[
                String(DEFAULT_CONTENT.config.maxLevel)
              ];
            for (const cost of [1, 2, 3, 4, 5]) {
              if ((odds[cost - 1] ?? 0) <= 0) continue;
              const counter = shopPoolCounters[String(cost)];
              const offers = offersByCost.get(cost) ?? 0;
              counter.eligiblePlayerPreparations += 1;
              counter.eligibleShopSlots += player.shop.length;
              counter.shopOffers += offers;
              if (offers > 0) counter.playerPreparationsWithOffer += 1;
            }
          }
          for (const unit of DEFAULT_CONTENT.units) {
            const counter = shopPoolCounters[String(unit.cost)];
            const available = state.pool[unit.id] ?? 0;
            counter.poolDefinitionObservations += 1;
            counter.totalAvailablePoolCopies += available;
            if (available === 0) counter.zeroAvailablePoolDefinitions += 1;
          }
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
          recordTraits(
            state,
            traitActivations,
            traitTierActivations,
            traitMaxTier,
            traitsReachedInMatch,
            traitTiersReachedInMatch,
            traitObservations,
          );
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
              const formAudit = auditFormBattleResult(result);
              for (const formId of PRODUCTION_FORM_IDS) {
                formBattleStartUnitAppearances[formId] +=
                  formAudit.battleStartUnitAppearances[formId];
                formTransformEvents[formId] +=
                  formAudit.transformEvents[formId];
              }
              for (const formId of formAudit.formsReached) {
                formsReachedInMatch.add(formId);
              }
              for (const identity of PILOT_IDENTITY_KEYS) {
                mergeCombatExpression(
                  pilotCombatExpressions[identity],
                  formAudit.pilotCombatExpression[identity],
                );
              }
              totalTransformEvents += formAudit.totalTransformEvents;
              chopperObservations.deployedBoards +=
                formAudit.chopper.deployedBoards;
              chopperObservations.eligibleBoards +=
                formAudit.chopper.eligibleBoards;
              chopperObservations.eligibleCombatantAppearances +=
                formAudit.chopper.eligibleCombatantAppearances;
              chopperObservations.eligibleCombatantsDiedBeforeTransform +=
                formAudit.chopper.eligibleCombatantsDiedBeforeTransform;
              chopperObservations.transformedPlayerBattleBoards +=
                formAudit.chopper.transformedPlayerBattleBoards;
              recordPvpResult(
                result,
                rosterIds,
                allEnemyAbilityIds,
                defensePierceAbilityIds,
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
      for (const traitId of traitsReachedInMatch) {
        increment(traitMatchReach, traitId);
      }
      for (const tierKey of traitTiersReachedInMatch) {
        increment(traitTierMatchReach, tierKey);
      }
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
        for (const cost of new Set(
          [...definitions]
            .map((definitionId) => unitCostById.get(definitionId))
            .filter((cost): cost is NonNullable<typeof cost> => cost !== undefined),
        )) {
          increment(costFinalBoardPlayerPresence, String(cost));
        }
        for (const definitionId of definitions) {
          increment(placementTotals, definitionId, player.placement);
          if (player.placement <= 4) increment(top4Boards, definitionId);
          if (player.placement === 1) increment(winningBoards, definitionId);
        }
        const finalCrewAudit = auditPilotFinalCrew(finalCrew(player));
        for (const formId of finalCrewAudit.formIds) {
          increment(formFinalBoards, formId);
          increment(formPlacementTotals, formId, player.placement);
          if (player.placement <= 4) increment(formTop4Boards, formId);
          if (player.placement === 1) increment(formWinningBoards, formId);
          formsReachedInMatch.add(formId);
        }
        if (finalCrewAudit.robin.threeStar) robinThreeStarFinalBoards += 1;
        if (finalCrewAudit.robin.demonioThreeStar) {
          demonioThreeStarFinalBoards += 1;
        }
        if (finalCrewAudit.robin.nonDemonioThreeStar) {
          nonDemonioThreeStarFinalBoards += 1;
        }
        if (finalCrewAudit.luffyThreeStarBranches.length > 0) {
          luffyThreeStarFinalBoards += 1;
        }
        for (const branch of finalCrewAudit.luffyThreeStarBranches) {
          increment(luffyBranchFinalBoards, branch);
          increment(luffyBranchPlacementTotals, branch, player.placement);
          if (player.placement <= 4) increment(luffyBranchTop4Boards, branch);
          if (player.placement === 1) {
            increment(luffyBranchWinningBoards, branch);
          }
        }
        recordFinalItems(player, itemUsage);
        for (const unit of finalCrew(player)) {
          const cost = unitCostById.get(unit.definitionId);
          if (!cost) continue;
          const counter = shopPoolCounters[String(cost)];
          counter.finalCrewUnitInstances += 1;
          if (unit.star >= 2) counter.finalCrewTwoStarOrHigherInstances += 1;
        }
      }
      for (const formId of formsReachedInMatch) {
        increment(formMatchReach, formId);
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
  const finalBoardSlots = completeMatches * DEFAULT_CONTENT.config.playerCount;
  const totalFinalBoardDefinitions = Object.values(characterBoards).reduce(
    (total, count) => total + count,
    0,
  );
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
          finalBoardRepresentationRate: rate(
            finalBoards,
            totalFinalBoardDefinitions,
          ),
          finalBoardPlayerPresence:
            costFinalBoardPlayerPresence[String(cost)] ?? 0,
          finalBoardPlayerPresenceRate: rate(
            costFinalBoardPlayerPresence[String(cost)] ?? 0,
            finalBoardSlots,
          ),
          top4Boards: bandTop4Boards,
          winningBoards: bandWinningBoards,
          top4Rate: rate(bandTop4Boards, finalBoards),
          winRate: rate(bandWinningBoards, finalBoards),
          averagePlacement: rate(placementTotal, finalBoards),
        } satisfies CostBandReport,
      ];
    }),
  ) as Record<string, CostBandReport>;
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
  const formReachability = Object.fromEntries(
    PRODUCTION_FORM_IDS.map((formId) => {
      const definition = DEFAULT_CONTENT.forms.find((form) => form.id === formId);
      if (!definition) throw new Error(`Production form missing: ${formId}`);
      const outcome = finalBoardOutcome(
        formFinalBoards[formId] ?? 0,
        formTop4Boards[formId] ?? 0,
        formWinningBoards[formId] ?? 0,
        formPlacementTotals[formId] ?? 0,
      );
      return [
        formId,
        {
          baseDefinitionId: definition.baseDefinitionId,
          lifecycle: definition.lifecycle,
          battleStartUnitAppearances:
            formBattleStartUnitAppearances[formId],
          transformEvents: formTransformEvents[formId],
          matchesReached: formMatchReach[formId] ?? 0,
          ...outcome,
          finalBoardShareOfBaseCharacter: rate(
            outcome.finalBoards,
            characterBoards[definition.baseDefinitionId] ?? 0,
          ),
          winnerPresenceRate: rate(outcome.winningBoards, completeMatches),
        } satisfies FormReachabilityReport,
      ];
    }),
  ) as Record<ProductionFormId, FormReachabilityReport>;
  const pilotCombatExpression = Object.fromEntries(
    PILOT_IDENTITY_KEYS.map((identity) => {
      const expression = pilotCombatExpressions[identity];
      const {
        battleBoardAppearances: sourceAppearances,
        ...rawExpression
      } = expression;
      const controlEvents =
        expression.stunsApplied +
        expression.displacements.lunge +
        expression.displacements.knockback +
        expression.displacements.pull;
      return [
        identity,
        {
          sourceAppearances,
          ...rawExpression,
          castsPerSourceAppearance: rate(expression.casts, sourceAppearances),
          averageTargetsPerCast: rate(expression.castTargets, expression.casts),
          abilityDamagePerCast: rate(
            expression.totalAbilityDamage,
            expression.casts,
          ),
          controlEventsPerCast: rate(controlEvents, expression.casts),
        } satisfies PilotCombatExpressionReport,
      ];
    }),
  ) as Record<PilotIdentityKey, PilotCombatExpressionReport>;
  const luffyBranches = Object.fromEntries(
    (["base", "boundman", "snakeman"] as const).map((branch) => {
      const outcome = finalBoardOutcome(
        luffyBranchFinalBoards[branch] ?? 0,
        luffyBranchTop4Boards[branch] ?? 0,
        luffyBranchWinningBoards[branch] ?? 0,
        luffyBranchPlacementTotals[branch] ?? 0,
      );
      return [
        branch,
        {
          ...outcome,
          shareOfThreeStarFinalBoards: rate(
            outcome.finalBoards,
            luffyThreeStarFinalBoards,
          ),
        },
      ];
    }),
  ) as PilotFormReachabilityReport["luffy"]["branches"];
  const monsterPointTransforms =
    formTransformEvents["chopper-monster-point"];
  const pilotFormReachability: PilotFormReachabilityReport = {
    robin: {
      allFinalBoards: characterBoards.robin ?? 0,
      threeStarFinalBoards: robinThreeStarFinalBoards,
      demonioFinalBoards:
        formFinalBoards["robin-demonio-fleur"] ?? 0,
      demonioThreeStarFinalBoards,
      nonDemonioThreeStarFinalBoards,
      demonioShareOfAllFinalBoards: rate(
        formFinalBoards["robin-demonio-fleur"] ?? 0,
        characterBoards.robin ?? 0,
      ),
      demonioShareOfThreeStarFinalBoards: rate(
        demonioThreeStarFinalBoards,
        robinThreeStarFinalBoards,
      ),
      threeStarInvariantHolds:
        nonDemonioThreeStarFinalBoards === 0 &&
        robinThreeStarFinalBoards === demonioThreeStarFinalBoards,
    },
    luffy: {
      threeStarFinalBoards: luffyThreeStarFinalBoards,
      branches: luffyBranches,
    },
    chopper: {
      ...chopperObservations,
      eligibleBoardRate: rate(
        chopperObservations.eligibleBoards,
        chopperObservations.deployedBoards,
      ),
      transformEvents: monsterPointTransforms,
      transformRateAmongEligibleCombatants: rate(
        monsterPointTransforms,
        chopperObservations.eligibleCombatantAppearances,
      ),
      survivalToTriggerRate: rate(
        monsterPointTransforms,
        chopperObservations.eligibleCombatantAppearances,
      ),
      matchesReached: formMatchReach["chopper-monster-point"] ?? 0,
      transformsPerPvpBattle: rate(
        monsterPointTransforms,
        combatReadability.pvpBattleCount,
      ),
    },
  };
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
    allEnemyAbilityCastsPerPvpBattle: rate(
      combatReadability.allEnemyAbilityCasts,
      combatReadability.pvpBattleCount,
    ),
    defensePierceCastsPerPvpBattle: rate(
      combatReadability.defensePierceCasts,
      combatReadability.pvpBattleCount,
    ),
  };
  const traitReachability = Object.fromEntries(
    DEFAULT_CONTENT.traits.map((trait) => [
      trait.id,
      {
        activations: traitActivations[trait.id] ?? 0,
        activationRate: rate(
          traitActivations[trait.id] ?? 0,
          traitObservations.playerBattleBoards,
        ),
        matchesReached: traitMatchReach[trait.id] ?? 0,
        matchReachRate: rate(
          traitMatchReach[trait.id] ?? 0,
          completeMatches,
        ),
        maxTier: traitMaxTier[trait.id] ?? 0,
      } satisfies TraitReachabilityReport,
    ]),
  );
  const traitTierReachability = Object.fromEntries(
    DEFAULT_CONTENT.traits.map((trait) => [
      trait.id,
      trait.tiers.map((tier, tierIndex) => {
        const tierNumber = tierIndex + 1;
        const tierKey = `${trait.id}:${tierNumber}`;
        return {
          tier: tierNumber,
          required: tier.required,
          activations: traitTierActivations[tierKey] ?? 0,
          activationRate: rate(
            traitTierActivations[tierKey] ?? 0,
            traitObservations.playerBattleBoards,
          ),
          matchesReached: traitTierMatchReach[tierKey] ?? 0,
          matchReachRate: rate(
            traitTierMatchReach[tierKey] ?? 0,
            completeMatches,
          ),
        } satisfies TraitTierReachabilityReport;
      }),
    ]),
  );
  const shopPoolAvailability = Object.fromEntries(
    [1, 2, 3, 4, 5].map((cost) => {
      const counter = shopPoolCounters[String(cost)];
      const units = DEFAULT_CONTENT.units.filter((unit) => unit.cost === cost);
      return [
        String(cost),
        {
          cost,
          unitIds: units.map((unit) => unit.id),
          initialCopiesPerUnit:
            DEFAULT_CONTENT.config.poolCopiesByCost[cost - 1],
          ...counter,
          offerRatePerEligibleSlot: rate(
            counter.shopOffers,
            counter.eligibleShopSlots,
          ),
          playerPreparationOfferRate: rate(
            counter.playerPreparationsWithOffer,
            counter.eligiblePlayerPreparations,
          ),
          averageAvailablePoolCopiesPerDefinition: rate(
            counter.totalAvailablePoolCopies,
            counter.poolDefinitionObservations,
          ),
          zeroAvailabilityRate: rate(
            counter.zeroAvailablePoolDefinitions,
            counter.poolDefinitionObservations,
          ),
        } satisfies ShopPoolCostReport,
      ];
    }),
  ) as Record<string, ShopPoolCostReport>;
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
    shopPoolAvailability: {
      preparationSnapshots,
      shopSlots,
      emptyShopSlots,
      emptyShopSlotRate: rate(emptyShopSlots, shopSlots),
      byCost: shopPoolAvailability,
    },
    characterCombatExpression,
    formReachability,
    pilotFormReachability,
    pilotCombatExpression,
    formEventVolume: {
      unitTransformEvents: totalTransformEvents,
      monsterPointTransformsPerPvpBattle: rate(
        monsterPointTransforms,
        combatReadability.pvpBattleCount,
      ),
    },
    combatReadability: finalizedCombatReadability,
    traitPlayerBattleBoards: traitObservations.playerBattleBoards,
    traitReachability,
    traitTierReachability,
    traitCombinations: {
      "emperor+captain": {
        activations: traitObservations.emperorCaptain,
        activationRate: rate(
          traitObservations.emperorCaptain,
          traitObservations.playerBattleBoards,
        ),
        matchesReached: traitMatchReach["emperor+captain"] ?? 0,
        matchReachRate: rate(
          traitMatchReach["emperor+captain"] ?? 0,
          completeMatches,
        ),
      },
    },
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
