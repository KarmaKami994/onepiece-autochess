import {
  DEFAULT_CONTENT,
  getItemDefinition,
} from "./content";
import { getUnitFormDefinition, resolveUnitDefinition } from "./forms";
import { hashSeed, nextRandom } from "./rng";
import { getActiveTraitEffects } from "./traits";
import type {
  AbilityDefinition,
  BattleEvent,
  BattleOptions,
  BattleResult,
  BattleTeam,
  BattleUnitSnapshot,
  BattleUnitState,
  DamageType,
  GameContent,
  Position,
  SequentialStrikeDefinition,
  SignatureMechanic,
  TraitEffect,
  UnitStats,
} from "./types";

interface CombatDefinition {
  id: string;
  formId?: string;
  stats: UnitStats;
  ability: AbilityDefinition | null;
}

interface MutableBattleUnit {
  id: string;
  definitionId: string;
  formId?: string;
  teamId: string;
  star: 1 | 2 | 3;
  items: string[];
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shield: number;
  energy: number;
  attack: number;
  defense: number;
  specialDefense: number;
  range: number;
  attackIntervalTicks: number;
  moveIntervalTicks: number;
  nextActionTick: number;
  abilityPowerPercent: number;
  criticalChancePercent: number;
  criticalPowerPercent: number;
  luck: number;
  abilityCrit: boolean;
  dodgePercent: number;
  omnivampPercent: number;
  emergencyShieldPercent: number;
  stackingAttackPercent: number;
  emergencyShieldUsed: boolean;
  stunUntilTick: number;
  burnUntilTick: number;
  burnNextTick: number;
  burnPower: number;
  burnSourceId: string | null;
  lastDamagerId: string | null;
  state: BattleUnitState;
  ability: AbilityDefinition | null;
}

interface AttackIntent {
  kind: "attack";
  sourceId: string;
  targetId: string;
}

interface CastIntent {
  kind: "cast";
  sourceId: string;
  targetIds: string[];
}

interface MoveIntent {
  kind: "move";
  sourceId: string;
  targetId: string;
  to: Position;
}

type CombatIntent = AttackIntent | CastIntent | MoveIntent;

const MONSTER_POINT_FORM_ID = "chopper-monster-point";
const MONSTER_POINT_DELAY_MS = 8_000;

export function adjustedChancePercent(
  basePercent: number,
  luck: number,
  capPercent = 100,
): number {
  const validBase = Number.isFinite(basePercent)
    ? Math.min(100, Math.max(0, basePercent))
    : 0;
  const validCap = Number.isFinite(capPercent)
    ? Math.min(100, Math.max(0, capPercent))
    : 0;
  const validLuck = Number.isFinite(luck) ? luck : 0;
  if (validBase === 0 || validCap === 0) {
    return 0;
  }
  const adjusted = (validBase / 100) ** (1 - validLuck / 100);
  return 100 * Math.min(validCap / 100, Math.max(0, adjusted));
}

function findDefinition(
  id: string,
  formId: string | undefined,
  content: GameContent,
): CombatDefinition | null {
  const form = getUnitFormDefinition(formId, content);
  const resolvedFormId = form?.baseDefinitionId === id ? form.id : undefined;
  const unit = resolveUnitDefinition(id, resolvedFormId, content);
  if (unit) {
    return {
      id: unit.id,
      ...(resolvedFormId ? { formId: resolvedFormId } : {}),
      stats: unit.stats,
      ability: unit.ability,
    };
  }
  const enemy = content.enemies.find((candidate) => candidate.id === id);
  return enemy
    ? {
        id: enemy.id,
        stats: enemy.stats,
        ability: enemy.ability ?? null,
      }
    : null;
}

function applyTraitEffect(
  unit: MutableBattleUnit,
  effect: TraitEffect,
): void {
  switch (effect.kind) {
    case "max-health-percent": {
      const added = Math.floor((unit.maxHp * effect.value) / 100);
      unit.maxHp += added;
      unit.hp += added;
      break;
    }
    case "attack-speed-percent":
      unit.attackIntervalTicks = Math.max(
        1,
        Math.round(
          (unit.attackIntervalTicks * 100) / (100 + effect.value),
        ),
      );
      break;
    case "defense-flat":
      unit.defense += effect.value;
      unit.specialDefense += effect.value;
      break;
    case "omnivamp-percent":
      unit.omnivampPercent += effect.value;
      break;
    case "starting-energy":
      unit.energy = Math.min(100, unit.energy + effect.value);
      break;
    case "attack-percent":
      unit.attack = Math.floor((unit.attack * (100 + effect.value)) / 100);
      break;
    case "stacking-attack-percent":
      unit.stackingAttackPercent += effect.value;
      break;
    case "emergency-shield-percent":
      unit.emergencyShieldPercent += effect.value;
      break;
    case "dodge-percent":
      unit.dodgePercent += effect.value;
      break;
    case "critical-chance-percent":
      unit.criticalChancePercent += effect.value;
      break;
    case "ability-power-percent":
      unit.abilityPowerPercent += effect.value;
      break;
    case "range-flat":
      unit.range += effect.value;
      break;
    case "shield-flat":
      unit.shield += effect.value;
      break;
  }
}

function createMutableUnits(
  team: BattleTeam,
  content: GameContent,
): MutableBattleUnit[] {
  const tickMs = content.config.combatTickMs;
  const traitEffects = getActiveTraitEffects(
    team.activeTraits ?? [],
    content,
  );
  const result: MutableBattleUnit[] = [];
  for (const setup of [...team.units].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    const definition = findDefinition(
      setup.definitionId,
      setup.formId,
      content,
    );
    if (!definition) {
      continue;
    }
    const statMultiplier =
      content.config.starStatBasisPoints[setup.star - 1] ?? 10_000;
    const maxHp = Math.max(
      1,
      Math.floor((definition.stats.health * statMultiplier) / 10_000),
    );
    const unit: MutableBattleUnit = {
      id: setup.id,
      definitionId: setup.definitionId,
      ...(definition.formId ? { formId: definition.formId } : {}),
      teamId: team.id,
      star: setup.star,
      items: [...setup.items],
      x: setup.position.x,
      y: setup.position.y,
      hp: maxHp,
      maxHp,
      shield: 0,
      energy: 0,
      attack: Math.max(
        1,
        Math.floor((definition.stats.attack * statMultiplier) / 10_000),
      ),
      defense: Math.max(
        0,
        Math.floor((definition.stats.defense * statMultiplier) / 10_000),
      ),
      specialDefense: Math.max(
        0,
        Math.floor(
          ((definition.stats.specialDefense ?? definition.stats.defense) *
            statMultiplier) /
            10_000,
        ),
      ),
      range: definition.stats.range,
      attackIntervalTicks: Math.max(
        1,
        Math.round(definition.stats.attackIntervalMs / tickMs),
      ),
      moveIntervalTicks: Math.max(
        1,
        Math.round(definition.stats.moveIntervalMs / tickMs),
      ),
      nextActionTick: 0,
      abilityPowerPercent: 0,
      criticalChancePercent: 10,
      criticalPowerPercent: 200,
      luck: 0,
      abilityCrit: false,
      dodgePercent: 0,
      omnivampPercent: 0,
      emergencyShieldPercent: 0,
      stackingAttackPercent: 0,
      emergencyShieldUsed: false,
      stunUntilTick: 0,
      burnUntilTick: 0,
      burnNextTick: 0,
      burnPower: 0,
      burnSourceId: null,
      lastDamagerId: null,
      state: "seek",
      ability: definition.ability,
    };

    for (const itemId of setup.items) {
      const item = getItemDefinition(itemId, content);
      if (!item) {
        continue;
      }
      for (const effect of item.effects) {
        switch (effect.kind) {
          case "health-flat":
            unit.maxHp += effect.value;
            unit.hp += effect.value;
            break;
          case "attack-flat":
            unit.attack += effect.value;
            break;
          case "defense-flat":
            unit.defense += effect.value;
            break;
          case "special-defense-flat":
            unit.specialDefense += effect.value;
            break;
          case "shield-flat":
            unit.shield += effect.value;
            break;
          case "attack-speed-percent":
            unit.attackIntervalTicks = Math.max(
              1,
              Math.round(
                (unit.attackIntervalTicks * 100) / (100 + effect.value),
              ),
            );
            break;
          case "critical-chance-percent":
            unit.criticalChancePercent += effect.value;
            break;
          case "critical-power-percent":
            unit.criticalPowerPercent += effect.value;
            break;
          case "luck-flat":
            unit.luck += effect.value;
            break;
          case "ability-crit":
            unit.abilityCrit = true;
            break;
          case "ability-power-percent":
            unit.abilityPowerPercent += effect.value;
            break;
          case "starting-energy":
            unit.energy = Math.min(100, unit.energy + effect.value);
            break;
          case "range-flat":
            unit.range += effect.value;
            break;
          case "omnivamp-percent":
            unit.omnivampPercent += effect.value;
            break;
        }
      }
    }
    for (const effect of traitEffects) {
      applyTraitEffect(unit, effect);
    }
    result.push(unit);
  }
  return result;
}

function transformBattleUnit(
  unit: MutableBattleUnit,
  formId: string,
  content: GameContent,
): boolean {
  const form = getUnitFormDefinition(formId, content);
  const base = resolveUnitDefinition(unit.definitionId, undefined, content);
  const transformed = resolveUnitDefinition(unit.definitionId, formId, content);
  if (
    !form ||
    form.lifecycle !== "battle-temporary" ||
    form.baseDefinitionId !== unit.definitionId ||
    !base ||
    !transformed ||
    unit.formId === formId
  ) {
    return false;
  }

  const statMultiplier =
    content.config.starStatBasisPoints[unit.star - 1] ?? 10_000;
  const scaled = (value: number): number =>
    Math.floor((value * statMultiplier) / 10_000);
  const healthDelta = scaled(transformed.stats.health) - scaled(base.stats.health);
  const attackDelta = scaled(transformed.stats.attack) - scaled(base.stats.attack);
  const defenseDelta = scaled(transformed.stats.defense) - scaled(base.stats.defense);
  const specialDefenseDelta =
    scaled(transformed.stats.specialDefense ?? transformed.stats.defense) -
    scaled(base.stats.specialDefense ?? base.stats.defense);
  const missingHp = Math.max(0, unit.maxHp - unit.hp);

  unit.maxHp = Math.max(1, unit.maxHp + healthDelta);
  unit.hp = Math.max(0, Math.min(unit.maxHp, unit.maxHp - missingHp));
  unit.attack = Math.max(1, unit.attack + attackDelta);
  unit.defense = Math.max(0, unit.defense + defenseDelta);
  unit.specialDefense = Math.max(
    0,
    unit.specialDefense + specialDefenseDelta,
  );
  unit.range = Math.max(
    0,
    unit.range + transformed.stats.range - base.stats.range,
  );
  unit.formId = form.id;
  unit.ability = transformed.ability;
  return true;
}

function distance(left: MutableBattleUnit, right: MutableBattleUnit): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function alive(unit: MutableBattleUnit): boolean {
  return unit.state !== "dead" && unit.hp > 0;
}

function chooseTarget(
  source: MutableBattleUnit,
  candidates: MutableBattleUnit[],
  targeting: AbilityDefinition["targeting"] = "nearest-enemy",
): MutableBattleUnit | null {
  if (candidates.length === 0) {
    return null;
  }
  const ordered = [...candidates].sort((left, right) => {
    if (targeting === "farthest-enemy") {
      return (
        distance(source, right) - distance(source, left) ||
        left.id.localeCompare(right.id)
      );
    }
    if (
      targeting === "lowest-health-enemy" ||
      targeting === "lowest-health-ally"
    ) {
      const leftRatio = left.hp / Math.max(1, left.maxHp);
      const rightRatio = right.hp / Math.max(1, right.maxHp);
      return (
        leftRatio - rightRatio ||
        distance(source, left) - distance(source, right) ||
        left.id.localeCompare(right.id)
      );
    }
    return (
      distance(source, left) - distance(source, right) ||
      left.id.localeCompare(right.id)
    );
  });
  return ordered[0] ?? null;
}

const BASIS_POINTS = 10_000;

function sequentialStrikePowers(
  scaledPower: number,
  definition: SequentialStrikeDefinition | undefined,
): number[] | null {
  const weights = definition?.hitWeightsBasisPoints;
  if (
    !weights ||
    weights.length === 0 ||
    weights.some((weight) => !Number.isSafeInteger(weight) || weight <= 0) ||
    weights.reduce((sum, weight) => sum + weight, 0) !== BASIS_POINTS
  ) {
    return null;
  }
  let allocated = 0;
  const strikePowers = weights.map((weight, index) => {
    const damage =
      index === weights.length - 1
        ? scaledPower - allocated
        : Math.floor((scaledPower * weight) / BASIS_POINTS);
    allocated += damage;
    return damage;
  });
  return strikePowers.some((power) => power <= 0) ? null : strikePowers;
}

function validFinalHitBonus(
  definition: SequentialStrikeDefinition,
): SequentialStrikeDefinition["finalHitBonus"] | null {
  const bonus = definition.finalHitBonus;
  return bonus &&
    Number.isSafeInteger(bonus.healthThresholdPercent) &&
    bonus.healthThresholdPercent >= 0 &&
    bonus.healthThresholdPercent <= 100 &&
    Number.isSafeInteger(bonus.damageBonusPercent) &&
    bonus.damageBonusPercent >= 0
    ? bonus
    : null;
}

function validConditionalShield(
  definition: AbilityDefinition["conditionalShield"],
): NonNullable<AbilityDefinition["conditionalShield"]> | null {
  return definition &&
    Number.isSafeInteger(definition.healthThresholdPercent) &&
    definition.healthThresholdPercent >= 0 &&
    definition.healthThresholdPercent <= 100 &&
    Number.isSafeInteger(definition.power) &&
    definition.power > 0
    ? definition
    : null;
}

function abilityTargets(
  source: MutableBattleUnit,
  units: MutableBattleUnit[],
  content: GameContent,
): MutableBattleUnit[] {
  const ability = source.ability;
  if (!ability) {
    return [];
  }
  const enemies = units.filter(
    (unit) => alive(unit) && unit.teamId !== source.teamId,
  );
  const allies = units.filter(
    (unit) => alive(unit) && unit.teamId === source.teamId,
  );
  if (ability.targeting === "self") {
    return [source];
  }
  const candidateGroup =
    ability.targeting === "lowest-health-ally" ? allies : enemies;
  const primaryCandidates =
    ability.requiresTarget === false
      ? candidateGroup
      : candidateGroup.filter(
          (candidate) => distance(source, candidate) <= source.range,
        );
  const primary = chooseTarget(source, primaryCandidates, ability.targeting);
  if (!primary) {
    return [];
  }
  if (ability.pattern === "single" || ability.pattern === "single-ally") {
    return [primary];
  }
  if (ability.pattern === "all-enemies") {
    return [...candidateGroup].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }
  if (ability.pattern === "adjacent") {
    return candidateGroup
      .filter(
        (unit) =>
          Math.max(Math.abs(unit.x - primary.x), Math.abs(unit.y - primary.y)) <=
          1,
      )
      .sort((left, right) => left.id.localeCompare(right.id));
  }
  if (ability.pattern === "line") {
    const ray = lineRayCells(
      source,
      primary,
      content.config.boardWidth,
      content.config.boardHeight,
    );
    const targets = candidateGroup.filter((unit) =>
      ray.has(positionKey(unit.x, unit.y)),
    );
    return (targets.length > 0 ? targets : [primary]).sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }
  return [primary];
}

function positionKey(x: number, y: number): string {
  return `${x},${y}`;
}

function lineRayCells(
  source: Pick<MutableBattleUnit, "x" | "y">,
  target: Pick<MutableBattleUnit, "x" | "y">,
  boardWidth: number,
  boardHeight: number,
): Set<string> {
  const vectorX = target.x - source.x;
  const vectorY = target.y - source.y;
  if (vectorX === 0 && vectorY === 0) {
    return new Set([positionKey(target.x, target.y)]);
  }
  const cells = new Set<string>();
  let x = source.x;
  let y = source.y;
  const stepX = Math.sign(vectorX);
  const stepY = Math.sign(vectorY);
  const absoluteX = Math.abs(vectorX);
  const absoluteY = Math.abs(vectorY);
  let crossedX = 0;
  let crossedY = 0;

  while (true) {
    if (absoluteX === 0) {
      y += stepY;
      crossedY += 1;
    } else if (absoluteY === 0) {
      x += stepX;
      crossedX += 1;
    } else {
      const nextX = (2 * crossedX + 1) * absoluteY;
      const nextY = (2 * crossedY + 1) * absoluteX;
      if (nextX <= nextY) {
        x += stepX;
        crossedX += 1;
      }
      if (nextY <= nextX) {
        y += stepY;
        crossedY += 1;
      }
    }
    if (x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) {
      break;
    }
    cells.add(positionKey(x, y));
  }
  cells.add(positionKey(target.x, target.y));
  return cells;
}

function chooseStep(
  source: MutableBattleUnit,
  target: MutableBattleUnit,
  units: MutableBattleUnit[],
  content: GameContent,
): Position | null {
  if (distance(source, target) <= source.range) {
    return null;
  }
  const occupied = new Set(
    units
      .filter((unit) => alive(unit) && unit.id !== source.id)
      .map((unit) => positionKey(unit.x, unit.y)),
  );

  type PathNode = Position & {
    depth: number;
    firstStep: Position | null;
  };
  const queue: PathNode[] = [
    { x: source.x, y: source.y, depth: 0, firstStep: null },
  ];
  const visited = new Set<string>();
  const goals: PathNode[] = [];
  let goalDepth: number | null = null;
  let readIndex = 0;

  while (readIndex < queue.length) {
    const current = queue[readIndex];
    readIndex += 1;
    if (goalDepth !== null && current.depth > goalDepth) {
      break;
    }
    if (
      current.firstStep &&
      Math.abs(current.x - target.x) + Math.abs(current.y - target.y) <=
        source.range
    ) {
      goalDepth = current.depth;
      goals.push(current);
      continue;
    }
    if (goalDepth !== null) {
      continue;
    }

    const neighbors = [
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 },
    ]
      .filter(
        (position) =>
          position.x >= 0 &&
          position.x < content.config.boardWidth &&
          position.y >= 0 &&
          position.y < content.config.boardHeight &&
          !occupied.has(positionKey(position.x, position.y)) &&
          !(
            current.firstStep &&
            position.x === source.x &&
            position.y === source.y
          ),
      )
      .sort(
        (left, right) =>
          Math.abs(left.x - target.x) +
            Math.abs(left.y - target.y) -
            (Math.abs(right.x - target.x) +
              Math.abs(right.y - target.y)) ||
          left.y - right.y ||
          left.x - right.x,
      );

    for (const neighbor of neighbors) {
      const firstStep = current.firstStep ?? neighbor;
      const visitKey = `${positionKey(firstStep.x, firstStep.y)}|${positionKey(neighbor.x, neighbor.y)}`;
      if (visited.has(visitKey)) {
        continue;
      }
      visited.add(visitKey);
      queue.push({
        ...neighbor,
        depth: current.depth + 1,
        firstStep,
      });
    }
  }
  return (
    goals.sort(
      (left, right) =>
        Math.abs(left.x - target.x) +
          Math.abs(left.y - target.y) -
          (Math.abs(right.x - target.x) +
            Math.abs(right.y - target.y)) ||
        left.y - right.y ||
        left.x - right.x ||
        left.firstStep!.y - right.firstStep!.y ||
        left.firstStep!.x - right.firstStep!.x,
    )[0]?.firstStep ?? null
  );
}

function hasSignatureMechanic(
  ability: AbilityDefinition,
  kind: SignatureMechanic["kind"],
): boolean {
  return ability.signatureMechanics?.some((mechanic) => mechanic.kind === kind) ?? false;
}

function chooseKnockbackDestination(
  source: MutableBattleUnit,
  target: MutableBattleUnit,
  units: MutableBattleUnit[],
  content: GameContent,
): Position | null {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const horizontal = dx === 0
    ? null
    : { x: target.x + Math.sign(dx), y: target.y };
  const vertical = dy === 0
    ? null
    : { x: target.x, y: target.y + Math.sign(dy) };
  const candidates = dx === 0
    ? [vertical]
    : dy === 0
      ? [horizontal]
      : Math.abs(dx) >= Math.abs(dy)
        ? [horizontal, vertical]
        : [vertical, horizontal];

  for (const candidate of candidates) {
    if (
      candidate &&
      candidate.x >= 0 &&
      candidate.x < content.config.boardWidth &&
      candidate.y >= 0 &&
      candidate.y < content.config.boardHeight &&
      !units.some(
        (unit) =>
          alive(unit) && unit.x === candidate.x && unit.y === candidate.y,
      )
    ) {
      return candidate;
    }
  }
  return null;
}

// Adapted concept reference: Pokemon Auto Chess Anchor Shot at
// keldaanCommunity/pokemonAutoChess commit a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee.
function choosePullDestination(
  source: MutableBattleUnit,
  target: MutableBattleUnit,
  units: MutableBattleUnit[],
  content: GameContent,
): Position | null {
  const dx = source.x - target.x;
  const dy = source.y - target.y;
  const horizontal = dx === 0
    ? null
    : { x: target.x + Math.sign(dx), y: target.y };
  const vertical = dy === 0
    ? null
    : { x: target.x, y: target.y + Math.sign(dy) };
  const candidates = dx === 0
    ? [vertical]
    : dy === 0
      ? [horizontal]
      : Math.abs(dx) >= Math.abs(dy)
        ? [horizontal, vertical]
        : [vertical, horizontal];

  for (const candidate of candidates) {
    if (
      candidate &&
      candidate.x >= 0 &&
      candidate.x < content.config.boardWidth &&
      candidate.y >= 0 &&
      candidate.y < content.config.boardHeight &&
      !units.some(
        (unit) =>
          alive(unit) && unit.x === candidate.x && unit.y === candidate.y,
      )
    ) {
      return candidate;
    }
  }
  return null;
}

function firstLungeDestination(
  source: MutableBattleUnit,
  target: MutableBattleUnit,
  units: MutableBattleUnit[],
  content: GameContent,
): Position | null {
  const occupied = new Set(
    units
      .filter((unit) => alive(unit))
      .map((unit) => positionKey(unit.x, unit.y)),
  );
  for (let y = target.y - 1; y <= target.y + 1; y += 1) {
    for (let x = target.x - 1; x <= target.x + 1; x += 1) {
      if (x === target.x && y === target.y) {
        continue;
      }
      if (
        x < 0 ||
        x >= content.config.boardWidth ||
        y < 0 ||
        y >= content.config.boardHeight ||
        occupied.has(positionKey(x, y))
      ) {
        continue;
      }
      return { x, y };
    }
  }
  return null;
}

export function remainingTeamHealthPercentage(
  units: readonly Pick<BattleUnitSnapshot, "teamId" | "hp" | "maxHp">[],
  teamId: string,
): number {
  const teamUnits = units.filter((unit) => unit.teamId === teamId);
  const maximumHealth = teamUnits.reduce(
    (sum, unit) => sum + Math.max(1, unit.maxHp),
    0,
  );
  if (maximumHealth === 0) {
    return 0;
  }
  const remainingHealth = teamUnits.reduce(
    (sum, unit) => sum + Math.max(0, Math.min(unit.hp, unit.maxHp)),
    0,
  );
  return remainingHealth / maximumHealth;
}

function toSnapshot(unit: MutableBattleUnit): BattleUnitSnapshot {
  return {
    id: unit.id,
    definitionId: unit.definitionId,
    ...(unit.formId ? { formId: unit.formId } : {}),
    teamId: unit.teamId,
    star: unit.star,
    items: [...unit.items],
    x: unit.x,
    y: unit.y,
    hp: Math.max(0, unit.hp),
    maxHp: unit.maxHp,
    shield: Math.max(0, unit.shield),
    energy: unit.energy,
    attack: unit.attack,
    defense: unit.defense,
    range: unit.range,
    state: unit.state,
  };
}

export function simulateBattle(
  teamA: BattleTeam,
  teamB: BattleTeam,
  options: BattleOptions,
  content: GameContent = DEFAULT_CONTENT,
): BattleResult {
  let rngState = hashSeed(options.seed);
  const maxTicks = options.maxTicks ?? content.config.combatMaxTicks;
  const recordEvents = options.recordEvents ?? true;
  const events: BattleEvent[] = [];
  const emit = (event: BattleEvent): void => {
    if (recordEvents) {
      events.push(event);
    }
  };
  const units = [
    ...createMutableUnits(teamA, content),
    ...createMutableUnits(teamB, content),
  ].sort((left, right) => left.id.localeCompare(right.id));
  const initialUnits = units.map(toSnapshot);
  const monsterPointTriggerTick = Math.ceil(
    MONSTER_POINT_DELAY_MS / Math.max(1, content.config.combatTickMs),
  );
  const monsterPointTeamIds = new Set(
    [teamA, teamB]
      .filter((team) =>
        (team.activeTraits ?? []).some(
          (trait) => trait.traitId === "straw-hat" && trait.tierIndex >= 0,
        ),
      )
      .map((team) => team.id),
  );

  const changeEnergy = (
    tick: number,
    unit: MutableBattleUnit,
    requestedAmount: number,
    reason: "attack" | "damaged" | "cast-reset" | "ability-drain",
  ): void => {
    const previous = unit.energy;
    unit.energy = Math.max(0, Math.min(100, unit.energy + requestedAmount));
    emit({
      type: "energy",
      tick,
      unitId: unit.id,
      amount: unit.energy - previous,
      value: unit.energy,
      reason,
    });
  };

  const roll = (percent: number): boolean => {
    if (percent <= 0) {
      return false;
    }
    if (percent >= 100) {
      return true;
    }
    const random = nextRandom(rngState);
    rngState = random.state;
    return random.value * 100 < percent;
  };

  const applyHeal = (
    tick: number,
    source: MutableBattleUnit,
    target: MutableBattleUnit,
    rawAmount: number,
  ): void => {
    if (!alive(target)) {
      return;
    }
    const amount = Math.min(rawAmount, target.maxHp - target.hp);
    if (amount <= 0) {
      return;
    }
    target.hp += amount;
    emit({
      type: "heal",
      tick,
      sourceId: source.id,
      targetId: target.id,
      amount,
    });
  };

  const applyShield = (
    tick: number,
    source: MutableBattleUnit,
    target: MutableBattleUnit,
    amount: number,
  ): void => {
    if (!alive(target) || amount <= 0) {
      return;
    }
    target.shield += amount;
    emit({
      type: "shield",
      tick,
      sourceId: source.id,
      targetId: target.id,
      amount,
    });
  };

  const applyDamage = (
    tick: number,
    source: MutableBattleUnit | null,
    target: MutableBattleUnit,
    rawAmount: number,
    damageKind: "attack" | "ability" | "burn",
    damageType: DamageType,
    defensePiercePercent = 0,
  ): number => {
    if (!alive(target)) {
      return 0;
    }
    const resistance = Math.max(
      0,
      damageType === "physical"
        ? target.defense
        : damageType === "special"
          ? target.specialDefense
          : 0,
    );
    const validDefensePiercePercent =
      Number.isSafeInteger(defensePiercePercent) &&
      defensePiercePercent >= 1 &&
      defensePiercePercent <= 100
        ? defensePiercePercent
        : 0;
    // Adapted from Pokemon Auto Chess Screech at pinned commit
    // a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee without mutating resistance.
    const ignoredResistance = Math.floor(
      (resistance * validDefensePiercePercent) / 100,
    );
    const effectiveResistance = Math.max(
      0,
      resistance - ignoredResistance,
    );
    const mitigated = Math.max(
      1,
      Math.floor((rawAmount * 100) / (100 + effectiveResistance)),
    );
    const shieldDamage = Math.min(target.shield, mitigated);
    target.shield -= shieldDamage;
    const healthDamage = Math.min(target.hp, mitigated - shieldDamage);
    target.hp -= healthDamage;
    const dealt = shieldDamage + healthDamage;
    if (source) {
      target.lastDamagerId = source.id;
    }
    if (dealt > 0) {
      emit({
        type: "damage",
        tick,
        sourceId: source?.id ?? target.id,
        targetId: target.id,
        amount: dealt,
        healthDamage,
        shieldDamage,
        damageKind,
      });
      changeEnergy(tick, target, 5, "damaged");
    }
    if (source && source.omnivampPercent > 0 && healthDamage > 0) {
      applyHeal(
        tick,
        source,
        source,
        Math.floor((healthDamage * source.omnivampPercent) / 100),
      );
    }
    if (
      target.hp > 0 &&
      !target.emergencyShieldUsed &&
      target.emergencyShieldPercent > 0 &&
      target.hp * 100 <= target.maxHp * 30
    ) {
      target.emergencyShieldUsed = true;
      const amount = Math.max(
        1,
        Math.floor(
          (target.maxHp * target.emergencyShieldPercent) / 100,
        ),
      );
      applyShield(tick, target, target, amount);
      emit({
        type: "status",
        tick,
        sourceId: target.id,
        targetId: target.id,
        status: "emergency-shield",
        durationTicks: 0,
      });
    }
    return healthDamage;
  };

  // keldaanCommunity/pokemonAutoChess commit
  // a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee informed separating shared cast
  // semantics from specialized multi-hit resolution; this stays plain data.
  const applySequentialStrikes = (
    tick: number,
    source: MutableBattleUnit,
    initialTarget: MutableBattleUnit,
    ability: AbilityDefinition,
    scaledPower: number,
  ): boolean => {
    const definition = ability.sequentialStrike;
    const strikePowers = sequentialStrikePowers(scaledPower, definition);
    if (!definition || !strikePowers) {
      return false;
    }
    let target: MutableBattleUnit | null = alive(initialTarget)
      ? initialTarget
      : null;
    const finalHitBonus = validFinalHitBonus(definition);
    for (let index = 0; index < strikePowers.length && target; index += 1) {
      const isFinalHit = index === strikePowers.length - 1;
      const finisher = Boolean(
        isFinalHit &&
          finalHitBonus &&
          target.hp * 100 <=
            target.maxHp * finalHitBonus.healthThresholdPercent,
      );
      const rawDamage = finisher
        ? Math.floor(
            (strikePowers[index] *
              (100 + (finalHitBonus?.damageBonusPercent ?? 0))) /
              100,
          )
        : strikePowers[index];
      emit({
        type: "ability-hit",
        tick,
        sourceId: source.id,
        targetId: target.id,
        abilityId: ability.id,
        hitIndex: index + 1,
        hitCount: strikePowers.length,
        finisher,
      });
      applyDamage(
        tick,
        source,
        target,
        rawDamage,
        "ability",
        ability.damageType ?? "special",
        ability.defensePiercePercent,
      );
      if (target.hp <= 0 && index < strikePowers.length - 1) {
        target =
          definition.retargetOnKill === "nearest-in-range"
            ? chooseTarget(
                source,
                units.filter(
                  (candidate) =>
                    alive(candidate) &&
                    candidate.teamId !== source.teamId &&
                    distance(source, candidate) <= source.range,
                ),
              )
            : null;
      }
    }
    return true;
  };

  const processDeaths = (tick: number): void => {
    for (const unit of units) {
      if (unit.state === "dead" || unit.hp > 0) {
        continue;
      }
      unit.state = "dead";
      unit.hp = 0;
      emit({
        type: "death",
        tick,
        unitId: unit.id,
        sourceId: unit.lastDamagerId,
      });
      const killer = units.find(
        (candidate) => candidate.id === unit.lastDamagerId,
      );
      if (killer && killer.stackingAttackPercent > 0) {
        const previousAttack = killer.attack;
        killer.attack = Math.max(
          killer.attack + 1,
          Math.floor(
            (killer.attack * (100 + killer.stackingAttackPercent)) / 100,
          ),
        );
        emit({
          type: "buff",
          tick,
          sourceId: killer.id,
          targetId: killer.id,
          stat: "attack",
          amount: killer.attack - previousAttack,
          value: killer.attack,
          reason: "stacking-attack",
        });
      }
    }
  };

  emit({
    type: "battle-start",
    tick: 0,
    teamAId: teamA.id,
    teamBId: teamB.id,
  });

  let endTick = 0;
  let timedOut = false;
  for (let tick = 1; tick <= maxTicks; tick += 1) {
    endTick = tick;
    for (const unit of units) {
      if (
        alive(unit) &&
        unit.burnPower > 0 &&
        tick <= unit.burnUntilTick &&
        tick >= unit.burnNextTick
      ) {
        const source =
          units.find((candidate) => candidate.id === unit.burnSourceId) ??
          null;
        applyDamage(tick, source, unit, unit.burnPower, "burn", "special");
        unit.burnNextTick = tick + Math.round(1_000 / content.config.combatTickMs);
      }
    }
    processDeaths(tick);

    if (tick === monsterPointTriggerTick) {
      for (const unit of units
        .filter(
          (candidate) =>
            alive(candidate) &&
            candidate.definitionId === "chopper" &&
            !candidate.formId &&
            monsterPointTeamIds.has(candidate.teamId),
        )
        .sort((left, right) => left.id.localeCompare(right.id))) {
        if (transformBattleUnit(unit, MONSTER_POINT_FORM_ID, content)) {
          emit({
            type: "unit-transform",
            tick,
            unitId: unit.id,
            fromFormId: null,
            toFormId: MONSTER_POINT_FORM_ID,
            hp: unit.hp,
            maxHp: unit.maxHp,
          });
        }
      }
    }

    const livingA = units.some(
      (unit) => alive(unit) && unit.teamId === teamA.id,
    );
    const livingB = units.some(
      (unit) => alive(unit) && unit.teamId === teamB.id,
    );
    if (!livingA || !livingB) {
      break;
    }

    const intents: CombatIntent[] = [];
    for (const source of units) {
      if (!alive(source)) {
        continue;
      }
      if (tick < source.stunUntilTick) {
        source.state = "stunned";
        continue;
      }
      if (tick < source.nextActionTick) {
        continue;
      }
      source.state = "seek";
      if (source.ability && source.energy >= 100) {
        const targets = abilityTargets(source, units, content);
        if (targets.length > 0) {
          source.state = "cast";
          intents.push({
            kind: "cast",
            sourceId: source.id,
            targetIds: targets.map((target) => target.id),
          });
          continue;
        }
      }
      const target = chooseTarget(
        source,
        units.filter(
          (candidate) =>
            alive(candidate) && candidate.teamId !== source.teamId,
        ),
      );
      if (!target) {
        continue;
      }
      if (distance(source, target) <= source.range) {
        source.state = "attack-windup";
        intents.push({
          kind: "attack",
          sourceId: source.id,
          targetId: target.id,
        });
        continue;
      }
      const step = chooseStep(source, target, units, content);
      if (step) {
        source.state = "move";
        intents.push({
          kind: "move",
          sourceId: source.id,
          targetId: target.id,
          to: step,
        });
      }
    }

    for (const intent of intents.filter(
      (candidate): candidate is CastIntent => candidate.kind === "cast",
    )) {
      const source = units.find((unit) => unit.id === intent.sourceId);
      if (!source || !source.ability) {
        continue;
      }
      const abilityDefinition = source.ability;
      source.nextActionTick =
        tick +
        (abilityDefinition.requiresTarget === false
          ? source.moveIntervalTicks
          : source.attackIntervalTicks);
      emit({
        type: "cast",
        tick,
        sourceId: source.id,
        abilityId: abilityDefinition.id,
        targetIds: intent.targetIds,
      });
      changeEnergy(tick, source, -source.energy, "cast-reset");
      const abilityCritical =
        (abilityDefinition.canCritByDefault === true || source.abilityCrit) &&
        roll(
          adjustedChancePercent(
            source.criticalChancePercent,
            source.luck,
          ),
        );
      let shouldApplyEffect = true;
      if (hasSignatureMechanic(abilityDefinition, "lunge")) {
        const primaryTarget = units.find(
          (unit) => unit.id === intent.targetIds[0] && alive(unit),
        );
        const destination = primaryTarget
          ? firstLungeDestination(source, primaryTarget, units, content)
          : null;
        if (!destination) {
          shouldApplyEffect = false;
        } else {
          const from = { x: source.x, y: source.y };
          source.x = destination.x;
          source.y = destination.y;
          source.nextActionTick = tick + 1;
          emit({
            type: "unit-displace",
            tick,
            sourceId: source.id,
            unitId: source.id,
            abilityId: abilityDefinition.id,
            movementKind: "lunge",
            from,
            to: destination,
          });
        }
      }
      if (!shouldApplyEffect) {
        continue;
      }
      const abilityMultiplier =
        content.config.starAbilityBasisPoints[source.star - 1] ?? 10_000;
      const scaledPower = Math.max(
        1,
        Math.floor(
          (abilityDefinition.power *
            abilityMultiplier *
            (100 + source.abilityPowerPercent)) /
            1_000_000,
        ),
      );
      const directPower = abilityCritical
        ? Math.max(
            1,
            Math.floor(
              (scaledPower * source.criticalPowerPercent) / 100,
            ),
          )
        : scaledPower;
      for (const targetId of intent.targetIds) {
        const target = units.find((unit) => unit.id === targetId);
        if (!target) {
          continue;
        }
        if (abilityDefinition.effect === "heal") {
          const conditionalShield = validConditionalShield(
            abilityDefinition.conditionalShield,
          );
          const shouldApplyConditionalShield =
            conditionalShield !== null &&
            target.hp * 100 <=
              target.maxHp * conditionalShield.healthThresholdPercent;
          applyHeal(tick, source, target, directPower);
          if (shouldApplyConditionalShield && conditionalShield) {
            const shieldPower = Math.max(
              1,
              Math.floor(
                (conditionalShield.power *
                  abilityMultiplier *
                  (100 + source.abilityPowerPercent)) /
                  1_000_000,
              ),
            );
            const directShieldPower = abilityCritical
              ? Math.max(
                  1,
                  Math.floor(
                    (shieldPower * source.criticalPowerPercent) / 100,
                  ),
                )
              : shieldPower;
            applyShield(tick, source, target, directShieldPower);
          }
        } else if (abilityDefinition.effect === "shield") {
          applyShield(tick, source, target, directPower);
        } else {
          const sequentialApplied = applySequentialStrikes(
            tick,
            source,
            target,
            abilityDefinition,
            directPower,
          );
          if (!sequentialApplied) {
            const hits = Math.max(1, abilityDefinition.hits ?? 1);
            for (let hit = 0; hit < hits; hit += 1) {
              applyDamage(
                tick,
                source,
                target,
                directPower,
                "ability",
                abilityDefinition.damageType ?? "special",
                abilityDefinition.defensePiercePercent,
              );
            }
          }
          if (target.hp > 0 && abilityDefinition.stunMs) {
            const durationTicks = Math.max(
              1,
              Math.round(
                abilityDefinition.stunMs / content.config.combatTickMs,
              ),
            );
            target.stunUntilTick = Math.max(
              target.stunUntilTick,
              tick + durationTicks,
            );
            emit({
              type: "status",
              tick,
              sourceId: source.id,
              targetId: target.id,
              status: "stun",
              durationTicks,
            });
          }
          if (
            target.hp > 0 &&
            abilityDefinition.burnPower &&
            abilityDefinition.burnDurationMs
          ) {
            const durationTicks = Math.max(
              1,
              Math.round(
                abilityDefinition.burnDurationMs /
                  content.config.combatTickMs,
              ),
            );
            target.burnPower = Math.max(
              target.burnPower,
              Math.floor(
                (abilityDefinition.burnPower *
                  abilityMultiplier *
                  (100 + source.abilityPowerPercent)) /
                  1_000_000,
              ),
            );
            target.burnUntilTick = Math.max(
              target.burnUntilTick,
              tick + durationTicks,
            );
            target.burnNextTick = tick + Math.round(1_000 / content.config.combatTickMs);
            target.burnSourceId = source.id;
            emit({
              type: "status",
              tick,
              sourceId: source.id,
              targetId: target.id,
              status: "burn",
              durationTicks,
            });
          }
        }
      }
      const energyDrain = abilityDefinition.energyDrain;
      if (
        typeof energyDrain === "number" &&
        Number.isSafeInteger(energyDrain) &&
        energyDrain > 0
      ) {
        for (const targetId of intent.targetIds) {
          const target = units.find(
            (unit) =>
              unit.id === targetId &&
              unit.teamId !== source.teamId &&
              alive(unit),
          );
          if (target && target.energy > 0) {
            changeEnergy(tick, target, -energyDrain, "ability-drain");
          }
        }
      }
      if (hasSignatureMechanic(abilityDefinition, "knockback")) {
        for (const targetId of [...intent.targetIds].sort((left, right) =>
          left.localeCompare(right),
        )) {
          const target = units.find(
            (unit) => unit.id === targetId && alive(unit),
          );
          if (!target) {
            continue;
          }
          const destination = chooseKnockbackDestination(
            source,
            target,
            units,
            content,
          );
          if (!destination) {
            continue;
          }
          const from = { x: target.x, y: target.y };
          target.x = destination.x;
          target.y = destination.y;
          emit({
            type: "unit-displace",
            tick,
            sourceId: source.id,
            unitId: target.id,
            abilityId: abilityDefinition.id,
            movementKind: "knockback",
            from,
            to: destination,
          });
        }
      }
      if (hasSignatureMechanic(abilityDefinition, "pull")) {
        for (const targetId of [...intent.targetIds].sort((left, right) =>
          left.localeCompare(right),
        )) {
          const target = units.find(
            (unit) => unit.id === targetId && alive(unit),
          );
          if (!target) {
            continue;
          }
          const destination = choosePullDestination(
            source,
            target,
            units,
            content,
          );
          if (!destination) {
            continue;
          }
          const from = { x: target.x, y: target.y };
          target.x = destination.x;
          target.y = destination.y;
          emit({
            type: "unit-displace",
            tick,
            sourceId: source.id,
            unitId: target.id,
            abilityId: abilityDefinition.id,
            movementKind: "pull",
            from,
            to: destination,
          });
        }
      }
    }

    for (const intent of intents.filter(
      (candidate): candidate is AttackIntent => candidate.kind === "attack",
    )) {
      const source = units.find((unit) => unit.id === intent.sourceId);
      const target = units.find((unit) => unit.id === intent.targetId);
      if (!source || !target) {
        continue;
      }
      source.nextActionTick = tick + source.attackIntervalTicks;
      source.state = "attack-recovery";
      const dodged = roll(
        adjustedChancePercent(target.dodgePercent, target.luck),
      );
      const critical = dodged
        ? false
        : roll(
            adjustedChancePercent(
              source.criticalChancePercent,
              source.luck,
            ),
          );
      emit({
        type: "attack",
        tick,
        sourceId: source.id,
        targetId: target.id,
        critical,
      });
      changeEnergy(tick, source, 10, "attack");
      if (dodged) {
        emit({
          type: "dodge",
          tick,
          sourceId: source.id,
          targetId: target.id,
        });
        continue;
      }
      applyDamage(
        tick,
        source,
        target,
        critical
          ? Math.max(
              1,
              Math.floor(
                (source.attack * source.criticalPowerPercent) / 100,
              ),
            )
          : source.attack,
        "attack",
        "physical",
      );
    }

    processDeaths(tick);

    const reserved = new Set(
      units.filter(alive).map((unit) => `${unit.x},${unit.y}`),
    );
    for (const intent of intents.filter(
      (candidate): candidate is MoveIntent => candidate.kind === "move",
    )) {
      const source = units.find((unit) => unit.id === intent.sourceId);
      if (!source || !alive(source)) {
        continue;
      }
      const destinationKey = `${intent.to.x},${intent.to.y}`;
      if (reserved.has(destinationKey)) {
        continue;
      }
      const from = { x: source.x, y: source.y };
      reserved.delete(`${source.x},${source.y}`);
      reserved.add(destinationKey);
      source.x = intent.to.x;
      source.y = intent.to.y;
      source.nextActionTick = tick + source.moveIntervalTicks;
      emit({
        type: "unit-move",
        tick,
        unitId: source.id,
        from,
        to: intent.to,
      });
    }
  }

  const survivingA = units.filter(
    (unit) => alive(unit) && unit.teamId === teamA.id,
  );
  const survivingB = units.filter(
    (unit) => alive(unit) && unit.teamId === teamB.id,
  );
  let winner: BattleResult["winner"] = "draw";
  let winnerId: string | null = null;
  if (survivingA.length > 0 && survivingB.length === 0) {
    winner = "a";
    winnerId = teamA.id;
  } else if (survivingB.length > 0 && survivingA.length === 0) {
    winner = "b";
    winnerId = teamB.id;
  } else if (survivingA.length > 0 && survivingB.length > 0) {
    timedOut = true;
    const healthA = remainingTeamHealthPercentage(units, teamA.id);
    const healthB = remainingTeamHealthPercentage(units, teamB.id);
    if (Math.abs(healthA - healthB) > 0.000_001) {
      winner = healthA > healthB ? "a" : "b";
      winnerId = winner === "a" ? teamA.id : teamB.id;
    }
  }
  emit({
    type: "battle-end",
    tick: endTick,
    winnerId,
    timedOut,
  });
  return {
    winner,
    winnerId,
    timedOut,
    durationTicks: endTick,
    events,
    initialUnits,
    finalUnits: units.map(toSnapshot),
  };
}
