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
  ItemBehavior,
  Position,
  SequentialStrikeDefinition,
  SignatureMechanic,
  TraitEffect,
  UnitStats,
} from "./types";

type PeriodicItemBehavior = Extract<
  ItemBehavior,
  {
    kind:
      | "periodic-ability-power-energy"
      | "periodic-attack-speed"
      | "periodic-adjacent-heal-overheal-energy";
  }
>;

interface PeriodicItemBehaviorRuntime {
  behavior: PeriodicItemBehavior;
  nextTick: number;
  intervalTicks: number;
}

interface CombatDefinition {
  id: string;
  formId?: string;
  stats: UnitStats;
  ability: AbilityDefinition | null;
}

interface BasicAttackDamage {
  physical: number;
  special: number;
  true: number;
}

interface ItemRuntimeCounters {
  basicAttackAttempts: number;
  damageReceivedEvents: number;
}

interface ResurrectionBaseline {
  formId?: string;
  ability: AbilityDefinition | null;
  maxHp: number;
  attack: number;
  defense: number;
  specialDefense: number;
  range: number;
  attackIntervalTicks: number;
  dynamicAttackSpeedBaseTicks: number;
  abilityPowerPercent: number;
  criticalChancePercent: number;
  criticalPowerPercent: number;
  luck: number;
  dodgePercent: number;
  omnivampPercent: number;
  maxEnergy: number;
}

interface HealResult {
  healed: number;
  overheal: number;
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
  maxEnergy: number;
  attack: number;
  starScaledBaseAttack: number;
  defense: number;
  specialDefense: number;
  range: number;
  attackIntervalTicks: number;
  dynamicAttackSpeedBaseTicks: number;
  dynamicAttackSpeedPercent: number;
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
  runeProtectUntilTick: number;
  protectUntilTick: number;
  blindedUntilTick: number;
  paralyzedUntilTick: number;
  resistanceReductionUntilTick: number;
  woundUntilTick: number;
  burnUntilTick: number;
  burnNextTick: number;
  burnPower: number;
  burnSourceId: string | null;
  lastDamagerId: string | null;
  state: BattleUnitState;
  ability: AbilityDefinition | null;
  itemBehaviors: ItemBehavior[];
  abilityCastCount: number;
  itemRuntimeCounters: ItemRuntimeCounters;
  periodicItemBehaviors: PeriodicItemBehaviorRuntime[];
  consumedItemBehaviorKinds: ItemBehavior["kind"][];
  totalShieldGained: number;
  resurrectionAvailable: boolean;
  resurrectAtTick: number;
  resurrectionBaseline: ResurrectionBaseline | null;
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
type CombatStat =
  | "attack"
  | "defense"
  | "special-defense"
  | "ability-power"
  | "dynamic-attack-speed";
type StatDeltaRelationship = "self" | "friendly" | "enemy" | "environment";

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
      unit.energy = Math.min(unit.maxEnergy, unit.energy + effect.value);
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
      applyCombatStatDelta(
        unit,
        "ability-power",
        effect.value,
        "friendly",
        false,
      );
      break;
    case "range-flat":
      unit.range += effect.value;
      break;
    case "shield-flat":
      unit.shield += effect.value;
      break;
  }
}

function resolveBattleItemIds(
  persistentItemIds: readonly string[],
  content: GameContent,
  drawIndex: (length: number) => number,
): string[] {
  if (!persistentItemIds.includes("mystery-treasure-chest")) {
    return [...persistentItemIds];
  }
  const resolved = persistentItemIds.filter(
    (itemId) => itemId !== "mystery-treasure-chest",
  );
  const craftableIds = [...new Set(Object.values(content.itemRecipes))]
    .filter((itemId) => {
      const item = getItemDefinition(itemId, content);
      return Boolean(
        item?.kind === "completed" &&
        itemId !== "mystery-treasure-chest" &&
        !item?.grantedTraitId &&
        !persistentItemIds.includes(itemId),
      );
    })
    .sort((left, right) => left.localeCompare(right));
  const rolledIds: string[] = [];
  for (let rollIndex = 0; rollIndex < 2; rollIndex += 1) {
    const candidates = craftableIds.filter(
      (itemId) => !rolledIds.includes(itemId),
    );
    if (candidates.length === 0) {
      break;
    }
    const itemId = candidates[drawIndex(candidates.length)];
    rolledIds.push(itemId);
    if (resolved.length < 3) {
      resolved.push(itemId);
    }
  }
  return resolved;
}

function createMutableUnits(
  team: BattleTeam,
  content: GameContent,
  drawIndex: (length: number) => number,
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
    const starScaledBaseAttack = Math.max(
      1,
      Math.floor((definition.stats.attack * statMultiplier) / 10_000),
    );
    const resolvedItemIds = resolveBattleItemIds(
      setup.items,
      content,
      drawIndex,
    );
    const unit: MutableBattleUnit = {
      id: setup.id,
      definitionId: setup.definitionId,
      ...(definition.formId ? { formId: definition.formId } : {}),
      teamId: team.id,
      star: setup.star,
      items: resolvedItemIds,
      x: setup.position.x,
      y: setup.position.y,
      hp: maxHp,
      maxHp,
      shield: 0,
      energy: 0,
      maxEnergy: 100,
      attack: starScaledBaseAttack,
      starScaledBaseAttack,
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
      dynamicAttackSpeedBaseTicks: 1,
      dynamicAttackSpeedPercent: 0,
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
      runeProtectUntilTick: 0,
      protectUntilTick: 0,
      blindedUntilTick: 0,
      paralyzedUntilTick: 0,
      resistanceReductionUntilTick: 0,
      woundUntilTick: 0,
      burnUntilTick: 0,
      burnNextTick: 0,
      burnPower: 0,
      burnSourceId: null,
      lastDamagerId: null,
      state: "seek",
      ability: definition.ability,
      itemBehaviors: [],
      abilityCastCount: 0,
      itemRuntimeCounters: {
        basicAttackAttempts: 0,
        damageReceivedEvents: 0,
      },
      periodicItemBehaviors: [],
      consumedItemBehaviorKinds: [],
      totalShieldGained: 0,
      resurrectionAvailable: false,
      resurrectAtTick: 0,
      resurrectionBaseline: null,
    };
    let startingShieldMaxHealthPercent = 0;
    const itemDefinitions = resolvedItemIds.flatMap((itemId) => {
      const item = getItemDefinition(itemId, content);
      return item ? [item] : [];
    });
    for (const item of itemDefinitions) {
      for (const behavior of item.behaviors ?? []) {
        unit.itemBehaviors.push({ ...behavior });
      }
    }
    unit.resurrectionAvailable = hasItemBehavior(unit, "resurrect-once");

    for (const item of itemDefinitions) {
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
          case "dodge-percent":
            unit.dodgePercent += effect.value;
            break;
          case "ability-crit":
            unit.abilityCrit = true;
            break;
          case "ability-power-percent":
            applyCombatStatDelta(
              unit,
              "ability-power",
              effect.value,
              "self",
              false,
            );
            break;
          case "starting-energy":
            unit.energy = Math.min(unit.maxEnergy, unit.energy + effect.value);
            break;
          case "starting-shield-max-health-percent":
            startingShieldMaxHealthPercent += effect.value;
            break;
          case "range-flat":
            unit.range += effect.value;
            break;
          case "omnivamp-percent":
            unit.omnivampPercent += effect.value;
            break;
        }
      }
      for (const behavior of item.behaviors ?? []) {
        if (
          behavior.kind === "native-ability-crit-power" &&
          unit.ability?.canCritByDefault === true
        ) {
          unit.criticalPowerPercent += behavior.criticalPowerPercent;
        }
      }
    }
    for (const effect of traitEffects) {
      applyTraitEffect(unit, effect);
    }
    unit.periodicItemBehaviors = unit.itemBehaviors.flatMap((behavior) => {
      if (
        behavior.kind !== "periodic-ability-power-energy" &&
        behavior.kind !== "periodic-attack-speed" &&
        behavior.kind !== "periodic-adjacent-heal-overheal-energy"
      ) {
        return [];
      }
      const intervalTicks = Math.max(1, Math.ceil(behavior.intervalMs / tickMs));
      return [{ behavior, nextTick: intervalTicks, intervalTicks }];
    });
    const startingShield = Math.floor(
      (unit.maxHp * startingShieldMaxHealthPercent) / 100,
    );
    if (startingShield > 0) {
      unit.shield += startingShield;
    }
    unit.dynamicAttackSpeedBaseTicks = unit.attackIntervalTicks;
    result.push(unit);
  }
  return result;
}

function hasItemBehavior(
  unit: MutableBattleUnit,
  kind: ItemBehavior["kind"],
): boolean {
  return unit.itemBehaviors.some((behavior) => behavior.kind === kind);
}

function hasAvailableItemBehavior(
  unit: MutableBattleUnit,
  kind: ItemBehavior["kind"],
): boolean {
  return (
    hasItemBehavior(unit, kind) &&
    !unit.consumedItemBehaviorKinds.includes(kind)
  );
}

function consumeItemBehavior(
  unit: MutableBattleUnit,
  kind: ItemBehavior["kind"],
): void {
  if (!unit.consumedItemBehaviorKinds.includes(kind)) {
    unit.consumedItemBehaviorKinds.push(kind);
  }
}

function applyStartOfBattleItemSupport(
  units: MutableBattleUnit[],
  tickMs: number,
): void {
  const shieldByUnitId = new Map<string, number>();
  const runeProtectByUnitId = new Map<string, number>();

  for (const source of units) {
    for (const behavior of source.itemBehaviors) {
      if (behavior.kind === "starting-rune-protect") {
        const durationTicks = Math.max(
          1,
          Math.ceil(behavior.durationMs / tickMs),
        );
        runeProtectByUnitId.set(
          source.id,
          Math.max(runeProtectByUnitId.get(source.id) ?? 0, durationTicks),
        );
        continue;
      }
      if (behavior.kind === "start-base-attack-self-burn") {
        applyCombatStatDelta(
          source,
          "attack",
          source.starScaledBaseAttack,
          "self",
        );
        continue;
      }
      if (
        behavior.kind !== "start-horizontal-shield-rune-protect" &&
        behavior.kind !== "start-horizontal-attack-speed" &&
        behavior.kind !== "start-horizontal-max-energy"
      ) {
        continue;
      }
      const recipients = units.filter(
        (candidate) =>
          candidate.teamId === source.teamId &&
          candidate.y === source.y &&
          Math.abs(candidate.x - source.x) <= 1,
      );
      for (const recipient of recipients) {
        if (behavior.kind === "start-horizontal-shield-rune-protect") {
          const shield = Math.ceil(
            (recipient.maxHp * behavior.shieldMaxHealthPercent) / 100,
          );
          shieldByUnitId.set(
            recipient.id,
            (shieldByUnitId.get(recipient.id) ?? 0) + shield,
          );
          const durationTicks = Math.max(
            1,
            Math.ceil(behavior.runeProtectMs / tickMs),
          );
          runeProtectByUnitId.set(
            recipient.id,
            Math.max(
              runeProtectByUnitId.get(recipient.id) ?? 0,
              durationTicks,
            ),
          );
        } else if (behavior.kind === "start-horizontal-attack-speed") {
          applyCombatStatDelta(
            recipient,
            "dynamic-attack-speed",
            behavior.attackSpeedPercent,
            recipient.id === source.id ? "self" : "friendly",
          );
        } else {
          recipient.maxEnergy = Math.max(
            1,
            Math.round((recipient.maxEnergy * behavior.percent) / 100),
          );
        }
      }
    }
  }

  for (const unit of units) {
    unit.shield += shieldByUnitId.get(unit.id) ?? 0;
    unit.runeProtectUntilTick = Math.max(
      unit.runeProtectUntilTick,
      runeProtectByUnitId.get(unit.id) ?? 0,
    );
    unit.energy = Math.min(unit.energy, unit.maxEnergy);
    unit.dynamicAttackSpeedBaseTicks = unit.attackIntervalTicks;
    unit.dynamicAttackSpeedPercent = 0;
  }
}

function addDynamicAttackSpeed(
  unit: MutableBattleUnit,
  amount: number,
): void {
  unit.dynamicAttackSpeedPercent += amount;
  unit.attackIntervalTicks = Math.max(
    1,
    Math.round(
      (unit.dynamicAttackSpeedBaseTicks * 100) /
        (100 + unit.dynamicAttackSpeedPercent),
    ),
  );
}

function applyCombatStatDelta(
  unit: MutableBattleUnit,
  stat: CombatStat,
  value: number,
  sourceRelationship: StatDeltaRelationship,
  amplify = true,
): number {
  let effectiveValue = value;
  if (
    effectiveValue < 0 &&
    (sourceRelationship === "enemy" || sourceRelationship === "environment") &&
    hasItemBehavior(unit, "enemy-debuff-inversion")
  ) {
    effectiveValue = -effectiveValue;
  }
  const amplifier = unit.itemBehaviors.find(
    (behavior) => behavior.kind === "combat-stat-delta-amplifier",
  );
  if (
    amplify &&
    amplifier?.kind === "combat-stat-delta-amplifier" &&
    (effectiveValue > 0 ||
      (effectiveValue < 0 &&
        (sourceRelationship === "self" || sourceRelationship === "friendly")))
  ) {
    effectiveValue =
      Math.sign(effectiveValue) *
      Math.floor(
        (Math.abs(effectiveValue) * (100 + amplifier.percent)) / 100,
      );
  }
  if (
    stat === "ability-power" &&
    hasItemBehavior(unit, "cannot-cast-energy-attacks")
  ) {
    const conversion = unit.itemBehaviors.find(
      (behavior) => behavior.kind === "cannot-cast-energy-attacks",
    );
    if (conversion?.kind === "cannot-cast-energy-attacks") {
      const attackDelta = Math.round(
        (effectiveValue * conversion.attackConversionPercent) / 100,
      );
      unit.attack = Math.max(1, unit.attack + attackDelta);
      return attackDelta;
    }
  }
  switch (stat) {
    case "attack":
      unit.attack = Math.max(1, unit.attack + effectiveValue);
      break;
    case "defense":
      unit.defense = Math.max(0, unit.defense + effectiveValue);
      break;
    case "special-defense":
      unit.specialDefense = Math.max(0, unit.specialDefense + effectiveValue);
      break;
    case "ability-power":
      unit.abilityPowerPercent += effectiveValue;
      break;
    case "dynamic-attack-speed":
      addDynamicAttackSpeed(unit, effectiveValue);
      break;
  }
  return effectiveValue;
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

function occupiesBoardCell(unit: MutableBattleUnit): boolean {
  return alive(unit) || unit.state === "resurrecting";
}

function battleActive(unit: MutableBattleUnit): boolean {
  return alive(unit) || unit.resurrectAtTick > 0;
}

function chooseTarget(
  source: MutableBattleUnit,
  candidates: MutableBattleUnit[],
  targeting: AbilityDefinition["targeting"] = "nearest-enemy",
  basicAttack = false,
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
    const leftPriority = left.itemBehaviors.some(
      (behavior) =>
        behavior.kind === "incoming-nontrue-damage-reduction-percent" &&
        behavior.basicAttackTargetPriority,
    )
      ? 0
      : 1;
    const rightPriority = right.itemBehaviors.some(
      (behavior) =>
        behavior.kind === "incoming-nontrue-damage-reduction-percent" &&
        behavior.basicAttackTargetPriority,
    )
      ? 0
      : 1;
    return (
      distance(source, left) - distance(source, right) ||
      (basicAttack ? leftPriority - rightPriority : 0) ||
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
      .filter((unit) => occupiesBoardCell(unit) && unit.id !== source.id)
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
          occupiesBoardCell(unit) &&
          unit.x === candidate.x &&
          unit.y === candidate.y,
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
          occupiesBoardCell(unit) &&
          unit.x === candidate.x &&
          unit.y === candidate.y,
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
      .filter(occupiesBoardCell)
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
    maxEnergy: unit.maxEnergy,
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
  const nextBattleRandom = (): number => {
    const random = nextRandom(rngState);
    rngState = random.state;
    return random.value;
  };
  const drawIndex = (length: number): number =>
    Math.min(length - 1, Math.floor(nextBattleRandom() * length));
  const maxTicks = options.maxTicks ?? content.config.combatMaxTicks;
  const recordEvents = options.recordEvents ?? true;
  const events: BattleEvent[] = [];
  const emit = (event: BattleEvent): void => {
    if (recordEvents) {
      events.push(event);
    }
  };
  const units = [
    ...createMutableUnits(teamA, content, drawIndex),
    ...createMutableUnits(teamB, content, drawIndex),
  ].sort((left, right) => left.id.localeCompare(right.id));
  applyStartOfBattleItemSupport(units, content.config.combatTickMs);
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
    reason: "attack" | "damaged" | "cast-reset" | "ability-drain" | "item",
  ): void => {
    const previous = unit.energy;
    const effectiveAmount =
      requestedAmount > 0 && tick < unit.protectUntilTick
        ? 0
        : requestedAmount;
    unit.energy = Math.max(
      0,
      Math.min(unit.maxEnergy, unit.energy + effectiveAmount),
    );
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
    return nextBattleRandom() * 100 < percent;
  };

  const hasRuneProtect = (
    unit: MutableBattleUnit,
    tick: number,
  ): boolean => tick < unit.runeProtectUntilTick;

  const applyStun = (
    tick: number,
    source: MutableBattleUnit,
    target: MutableBattleUnit,
    durationMs: number,
  ): void => {
    if (!alive(target) || hasRuneProtect(target, tick)) {
      return;
    }
    const durationTicks = Math.max(
      1,
      Math.round(durationMs / content.config.combatTickMs),
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
  };

  const applyBurn = (
    tick: number,
    source: MutableBattleUnit,
    target: MutableBattleUnit,
    power: number,
    durationMs: number,
    options: { bypassRuneProtect?: boolean } = {},
  ): void => {
    if (
      !alive(target) ||
      (!options.bypassRuneProtect && hasRuneProtect(target, tick))
    ) {
      return;
    }
    const durationTicks = Math.max(
      1,
      Math.round(durationMs / content.config.combatTickMs),
    );
    target.burnPower = Math.max(target.burnPower, power);
    target.burnUntilTick = Math.max(
      target.burnUntilTick,
      tick + durationTicks,
    );
    target.burnNextTick =
      tick + Math.round(1_000 / content.config.combatTickMs);
    target.burnSourceId = source.id;
    emit({
      type: "status",
      tick,
      sourceId: source.id,
      targetId: target.id,
      status: "burn",
      durationTicks,
    });
  };

  const applyResistanceReduction = (
    tick: number,
    source: MutableBattleUnit,
    target: MutableBattleUnit,
    durationMs: number,
  ): void => {
    if (!alive(target) || hasRuneProtect(target, tick)) {
      return;
    }
    const durationTicks = Math.max(
      1,
      Math.ceil(durationMs / content.config.combatTickMs),
    );
    target.resistanceReductionUntilTick = Math.max(
      target.resistanceReductionUntilTick,
      tick + durationTicks,
    );
    emit({
      type: "status",
      tick,
      sourceId: source.id,
      targetId: target.id,
      status: "resistance-reduction",
      durationTicks,
    });
  };

  const applyWound = (
    tick: number,
    source: MutableBattleUnit,
    target: MutableBattleUnit,
    durationMs: number,
  ): void => {
    if (!alive(target) || hasRuneProtect(target, tick)) {
      return;
    }
    const durationTicks = Math.max(
      1,
      Math.ceil(durationMs / content.config.combatTickMs),
    );
    target.woundUntilTick = Math.max(
      target.woundUntilTick,
      tick + durationTicks,
    );
    emit({
      type: "status",
      tick,
      sourceId: source.id,
      targetId: target.id,
      status: "wound",
      durationTicks,
    });
  };

  const applyBlind = (
    tick: number,
    source: MutableBattleUnit,
    target: MutableBattleUnit,
    durationMs: number,
  ): void => {
    if (!alive(target) || hasRuneProtect(target, tick)) {
      return;
    }
    const durationTicks = Math.max(
      1,
      Math.ceil(durationMs / content.config.combatTickMs),
    );
    target.blindedUntilTick = Math.max(
      target.blindedUntilTick,
      tick + durationTicks,
    );
    emit({
      type: "status",
      tick,
      sourceId: source.id,
      targetId: target.id,
      status: "blind",
      durationTicks,
    });
  };

  const applyParalysis = (
    tick: number,
    source: MutableBattleUnit,
    target: MutableBattleUnit,
    durationMs: number,
  ): void => {
    if (!alive(target) || hasRuneProtect(target, tick)) {
      return;
    }
    const durationTicks = Math.max(
      1,
      Math.ceil(durationMs / content.config.combatTickMs),
    );
    target.paralyzedUntilTick = Math.max(
      target.paralyzedUntilTick,
      tick + durationTicks,
    );
    emit({
      type: "status",
      tick,
      sourceId: source.id,
      targetId: target.id,
      status: "paralysis",
      durationTicks,
    });
  };

  const applyHeal = (
    tick: number,
    source: MutableBattleUnit,
    target: MutableBattleUnit,
    rawAmount: number,
  ): HealResult => {
    if (
      !alive(target) ||
      tick < target.woundUntilTick ||
      tick < target.protectUntilTick
    ) {
      return { healed: 0, overheal: 0 };
    }
    const requested = Math.max(0, rawAmount);
    const amount = Math.min(requested, target.maxHp - target.hp);
    const overheal = requested - amount;
    if (amount <= 0) {
      return { healed: 0, overheal };
    }
    target.hp += amount;
    emit({
      type: "heal",
      tick,
      sourceId: source.id,
      targetId: target.id,
      amount,
    });
    return { healed: amount, overheal };
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
    if (hasItemBehavior(target, "shield-depletion-explosion")) {
      target.totalShieldGained += amount;
    }
    emit({
      type: "shield",
      tick,
      sourceId: source.id,
      targetId: target.id,
      amount,
    });
  };

  const chooseEscapeDestination = (
    holder: MutableBattleUnit,
  ): Position | null => {
    const enemies = units.filter(
      (candidate) => alive(candidate) && candidate.teamId !== holder.teamId,
    );
    const occupied = new Set(
      units
        .filter(occupiesBoardCell)
        .map((candidate) => positionKey(candidate.x, candidate.y)),
    );
    const emptyCells: Position[] = [];
    for (let y = 0; y < content.config.boardHeight; y += 1) {
      for (let x = 0; x < content.config.boardWidth; x += 1) {
        if (!occupied.has(positionKey(x, y))) {
          emptyCells.push({ x, y });
        }
      }
    }
    if (emptyCells.length === 0) {
      return null;
    }
    const from = { x: holder.x, y: holder.y };
    const fromDistance = (cell: Position): number =>
      Math.abs(cell.x - from.x) + Math.abs(cell.y - from.y);
    const attackersAt = (cell: Position): number =>
      enemies.filter(
        (enemy) =>
          Math.abs(enemy.x - cell.x) + Math.abs(enemy.y - cell.y) <= enemy.range,
      ).length;
    const preferred = emptyCells.filter(
      (cell) =>
        fromDistance(cell) > holder.range &&
        enemies.some(
          (enemy) =>
            Math.abs(enemy.x - cell.x) + Math.abs(enemy.y - cell.y) <=
            holder.range,
        ),
    );
    if (preferred.length > 0) {
      const safestCount = Math.min(...preferred.map(attackersAt));
      const safest = preferred.filter((cell) => attackersAt(cell) === safestCount);
      const farthestDistance = Math.max(...safest.map(fromDistance));
      const finalists = safest
        .filter((cell) => fromDistance(cell) === farthestDistance)
        .sort((left, right) => left.y - right.y || left.x - right.x);
      return finalists[drawIndex(finalists.length)] ?? null;
    }
    const minimumEnemyDistance = (cell: Position): number =>
      enemies.length === 0
        ? 0
        : Math.min(
            ...enemies.map(
              (enemy) => Math.abs(enemy.x - cell.x) + Math.abs(enemy.y - cell.y),
            ),
          );
    const safestDistance = Math.max(...emptyCells.map(minimumEnemyDistance));
    return (
      emptyCells
        .filter((cell) => minimumEnemyDistance(cell) === safestDistance)
        .sort((left, right) => left.y - right.y || left.x - right.x)[0] ?? null
    );
  };

  const triggerSmokeEscape = (
    tick: number,
    holder: MutableBattleUnit,
  ): void => {
    const behavior = holder.itemBehaviors.find(
      (candidate) => candidate.kind === "low-health-smoke-escape",
    );
    if (
      behavior?.kind !== "low-health-smoke-escape" ||
      !hasAvailableItemBehavior(holder, behavior.kind) ||
      holder.hp <= 0 ||
      holder.hp * 100 >= holder.maxHp * behavior.healthThresholdPercent
    ) {
      return;
    }
    consumeItemBehavior(holder, behavior.kind);
    const adjacentEnemies = units
      .filter(
        (candidate) =>
          alive(candidate) &&
          candidate.teamId !== holder.teamId &&
          Math.max(
            Math.abs(candidate.x - holder.x),
            Math.abs(candidate.y - holder.y),
          ) <= 1,
      )
      .sort((left, right) => left.id.localeCompare(right.id));
    for (const enemy of adjacentEnemies) {
      applyParalysis(tick, holder, enemy, behavior.statusMs);
      applyBlind(tick, holder, enemy, behavior.statusMs);
    }
    applyShield(tick, holder, holder, behavior.shield);
    const destination = chooseEscapeDestination(holder);
    if (!destination) {
      return;
    }
    const from = { x: holder.x, y: holder.y };
    holder.x = destination.x;
    holder.y = destination.y;
    holder.nextActionTick = tick + 1;
    emit({
      type: "unit-displace",
      tick,
      sourceId: holder.id,
      unitId: holder.id,
      abilityId: "smoke-star-escape",
      movementKind: "escape",
      from,
      to: destination,
    });
  };

  const applyDamage = (
    tick: number,
    source: MutableBattleUnit | null,
    target: MutableBattleUnit,
    rawAmount: number,
    damageKind: "attack" | "ability" | "burn" | "item",
    damageType: DamageType,
    defensePiercePercent = 0,
    options: {
      isRetaliation?: boolean;
      preventCover?: boolean;
      suppressBombardier?: boolean;
    } = {},
  ): number => {
    if (!alive(target) || tick < target.protectUntilTick) {
      return 0;
    }
    const burnReductionPercent =
      damageKind === "burn"
        ? target.itemBehaviors.reduce(
            (total, behavior) =>
              behavior.kind === "burn-damage-reduction-percent"
                ? total + behavior.percent
                : total,
            0,
          )
        : 0;
    const adjustedRawAmount =
      rawAmount *
      (100 - Math.min(100, Math.max(0, burnReductionPercent))) /
      100;
    const baseResistance = Math.max(
      0,
      damageType === "physical"
        ? target.defense
        : damageType === "special"
          ? target.specialDefense
          : 0,
    );
    const resistance =
      damageType !== "true" && tick < target.resistanceReductionUntilTick
        ? Math.round(baseResistance / 2)
        : baseResistance;
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
      Math.floor((adjustedRawAmount * 100) / (100 + effectiveResistance)),
    );
    const resistanceBlocked = Math.max(0, adjustedRawAmount - mitigated);
    const nonTrueReductionPercent =
      damageType === "true"
        ? 0
        : target.itemBehaviors.reduce(
            (total, behavior) =>
              behavior.kind ===
              "incoming-nontrue-damage-reduction-percent"
                ? total + behavior.percent
                : total,
            0,
          );
    let damageBeforeShield = Math.max(
      1,
      Math.floor(
        mitigated *
          (100 - Math.min(100, Math.max(0, nonTrueReductionPercent))) /
          100,
      ),
    );
    if (source && source.id !== target.id && target.shield > 0) {
      for (const behavior of source.itemBehaviors) {
        if (behavior.kind === "shield-damage-multiplier") {
          damageBeforeShield = Math.max(
            1,
            Math.floor(
              (damageBeforeShield * behavior.multiplierPercent) / 100,
            ),
          );
        }
      }
    }
    const shieldBefore = target.shield;
    const shieldDamage = Math.min(shieldBefore, damageBeforeShield);
    target.shield -= shieldDamage;
    if (
      !options.suppressBombardier &&
      shieldBefore > 0 &&
      target.shield === 0 &&
      hasAvailableItemBehavior(target, "shield-depletion-explosion")
    ) {
      const explosionBehavior = target.itemBehaviors.find(
        (behavior) => behavior.kind === "shield-depletion-explosion",
      );
      consumeItemBehavior(target, "shield-depletion-explosion");
      if (explosionBehavior?.kind === "shield-depletion-explosion") {
        const explosion = Math.round(
          (target.totalShieldGained * explosionBehavior.percent) / 100,
        );
        if (explosion > 0) {
          const adjacentEnemies = units
            .filter(
              (candidate) =>
                alive(candidate) &&
                candidate.teamId !== target.teamId &&
                Math.max(
                  Math.abs(candidate.x - target.x),
                  Math.abs(candidate.y - target.y),
                ) <= 1,
            )
            .sort((left, right) => left.id.localeCompare(right.id));
          for (const enemy of adjacentEnemies) {
            applyDamage(
              tick,
              target,
              enemy,
              explosion,
              "item",
              "special",
              0,
              { suppressBombardier: true },
            );
          }
        }
      }
    }
    const prospectiveHealthDamage = damageBeforeShield - shieldDamage;
    let healthDamageCancelled = false;
    const miracleBehavior = target.itemBehaviors.find(
      (behavior) => behavior.kind === "low-health-protect-energy",
    );
    if (
      prospectiveHealthDamage > 0 &&
      miracleBehavior?.kind === "low-health-protect-energy" &&
      hasAvailableItemBehavior(target, miracleBehavior.kind) &&
      (target.hp - prospectiveHealthDamage) * 100 <
        target.maxHp * miracleBehavior.healthThresholdPercent
    ) {
      consumeItemBehavior(target, miracleBehavior.kind);
      healthDamageCancelled = true;
      changeEnergy(tick, target, miracleBehavior.energy, "item");
      const durationTicks = Math.max(
        1,
        Math.ceil(miracleBehavior.protectMs / content.config.combatTickMs),
      );
      target.protectUntilTick = Math.max(
        target.protectUntilTick,
        tick + durationTicks,
      );
      emit({
        type: "status",
        tick,
        sourceId: target.id,
        targetId: target.id,
        status: "protect",
        durationTicks,
      });
    }
    if (
      !healthDamageCancelled &&
      !options.preventCover &&
      prospectiveHealthDamage >= target.hp &&
      !hasItemBehavior(target, "lethal-cover")
    ) {
      const cover = units
        .filter(
          (candidate) =>
            alive(candidate) &&
            candidate.teamId === target.teamId &&
            candidate.id !== target.id &&
            hasItemBehavior(candidate, "lethal-cover") &&
            Math.max(
              Math.abs(candidate.x - target.x),
              Math.abs(candidate.y - target.y),
            ) <= 1,
        )
        .sort(
          (left, right) =>
            left.y - right.y ||
            left.x - right.x ||
            left.id.localeCompare(right.id),
        )[0];
      if (cover) {
        healthDamageCancelled = true;
        applyDamage(
          tick,
          source,
          cover,
          rawAmount,
          damageKind,
          damageType,
          defensePiercePercent,
          { ...options, preventCover: true },
        );
      }
    }
    const healthDamage = healthDamageCancelled
      ? 0
      : Math.min(target.hp, prospectiveHealthDamage);
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
      for (const behavior of target.itemBehaviors) {
        if (
          behavior.kind !== "on-damage-received-stack" ||
          target.itemRuntimeCounters.damageReceivedEvents >= behavior.maxEvents
        ) {
          continue;
        }
        target.itemRuntimeCounters.damageReceivedEvents += 1;
        if (
          behavior.eventsPerProc > 0 &&
          target.itemRuntimeCounters.damageReceivedEvents %
            behavior.eventsPerProc ===
            0
        ) {
          applyCombatStatDelta(
            target,
            "attack",
            behavior.attack,
            "self",
          );
          applyCombatStatDelta(
            target,
            "defense",
            behavior.defense,
            "self",
          );
          applyCombatStatDelta(
            target,
            "dynamic-attack-speed",
            behavior.attackSpeedPercent,
            "self",
          );
        }
      }
      if (
        source &&
        damageType === "special" &&
        damageKind !== "burn" &&
        !options.isRetaliation
      ) {
        for (const behavior of source.itemBehaviors) {
          if (behavior.kind !== "on-special-damage-burn-resistance") {
            continue;
          }
          applyCombatStatDelta(
            target,
            "special-defense",
            behavior.specialDefenseDelta,
            source.teamId === target.teamId ? "friendly" : "enemy",
          );
          applyBurn(
            tick,
            source,
            target,
            Math.round(target.maxHp * 0.05),
            behavior.burnDurationMs,
          );
        }
      }
    }
    if (source && source.omnivampPercent > 0 && healthDamage > 0) {
      applyHeal(
        tick,
        source,
        source,
        Math.floor((healthDamage * source.omnivampPercent) / 100),
      );
    }
    if (source && source.id !== target.id && dealt > 0) {
      for (const behavior of source.itemBehaviors) {
        if (behavior.kind === "on-damage-dealt-heal-percent") {
          applyHeal(
            tick,
            source,
            source,
            Math.ceil((dealt * behavior.percent) / 100),
          );
        }
      }
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
    if (dealt > 0) {
      triggerSmokeEscape(tick, target);
    }
    const reflectionEligible =
      damageType === "special" &&
      damageKind !== "burn" &&
      !options.isRetaliation &&
      source !== null &&
      source.id !== target.id &&
      resistanceBlocked > 0 &&
      hasItemBehavior(target, "reflect-special-resistance-blocked") &&
      !source.itemBehaviors.some(
        (behavior) =>
          behavior.kind === "shield-damage-multiplier" &&
          behavior.suppressRetaliation,
      );
    if (reflectionEligible && source) {
      applyDamage(
        tick,
        target,
        source,
        Math.round(resistanceBlocked),
        "item",
        "special",
        0,
        { isRetaliation: true },
      );
    }
    return healthDamage;
  };

  const resolveDamageBundle = (
    tick: number,
    source: MutableBattleUnit,
    target: MutableBattleUnit,
    damage: BasicAttackDamage,
    damageKind: "attack" | "item",
  ): void => {
    if (damage.physical > 0) {
      applyDamage(tick, source, target, damage.physical, damageKind, "physical");
    }
    if (damage.special > 0) {
      applyDamage(tick, source, target, damage.special, damageKind, "special");
    }
    if (damage.true > 0) {
      applyDamage(tick, source, target, damage.true, damageKind, "true");
    }
  };

  const applyBasicAttackItemBehaviors = (
    tick: number,
    source: MutableBattleUnit,
    target: MutableBattleUnit,
    primaryDamage: BasicAttackDamage,
    critical: boolean,
    killed: boolean,
  ): void => {
    let attackSpeedChanged = false;
    for (const behavior of source.itemBehaviors) {
      if (behavior.kind === "on-basic-attack-attack-speed") {
        applyCombatStatDelta(
          source,
          "dynamic-attack-speed",
          behavior.attackSpeedPercent,
          "self",
        );
        attackSpeedChanged = true;
      }
    }
    if (attackSpeedChanged) {
      source.nextActionTick = tick + source.attackIntervalTicks;
    }

    for (const behavior of source.itemBehaviors) {
      if (behavior.kind === "on-basic-attack-energy") {
        changeEnergy(tick, source, behavior.energy, "item");
        if (killed) {
          changeEnergy(tick, source, behavior.killBonusEnergy, "item");
        }
      }
    }

    for (const behavior of source.itemBehaviors) {
      if (
        behavior.kind !== "on-critical-basic-attack-energy-steal" ||
        !critical
      ) {
        continue;
      }
      const stolen = Math.min(
        Math.max(0, behavior.amount),
        Math.max(0, target.energy),
      );
      if (stolen > 0) {
        changeEnergy(tick, target, -stolen, "item");
        changeEnergy(tick, source, stolen, "item");
      }
    }

    const primaryRawTotal =
      primaryDamage.physical + primaryDamage.special + primaryDamage.true;
    for (const behavior of source.itemBehaviors) {
      if (
        behavior.kind === "on-critical-basic-attack-shield-damage-percent" &&
        critical
      ) {
        applyShield(
          tick,
          source,
          source,
          Math.ceil((primaryRawTotal * behavior.percent) / 100),
        );
      }
    }

    for (const behavior of source.itemBehaviors) {
      if (behavior.kind !== "every-n-basic-attacks-chain") {
        continue;
      }
      source.itemRuntimeCounters.basicAttackAttempts += 1;
      if (
        source.itemRuntimeCounters.basicAttackAttempts <
        Math.max(1, behavior.every)
      ) {
        continue;
      }
      source.itemRuntimeCounters.basicAttackAttempts = 0;
      const chainTargets = units
        .filter(
          (candidate) =>
            alive(candidate) && candidate.teamId !== source.teamId,
        )
        .sort(
          (left, right) =>
            distance(source, left) - distance(source, right) ||
            left.id.localeCompare(right.id),
        )
        .slice(0, Math.max(0, behavior.targets));
      for (const chainTarget of chainTargets) {
        applyDamage(
          tick,
          source,
          chainTarget,
          behavior.specialDamage,
          "item",
          "special",
        );
        changeEnergy(tick, chainTarget, -behavior.energyDrain, "item");
      }
    }

    for (const behavior of source.itemBehaviors) {
      if (
        behavior.kind !== "on-basic-attack-bounce" ||
        primaryRawTotal <= 0
      ) {
        continue;
      }
      if (!roll(adjustedChancePercent(behavior.chancePercent, source.luck))) {
        continue;
      }
      const bounceTarget = units
        .filter(
          (candidate) =>
            alive(candidate) &&
            candidate.teamId !== source.teamId &&
            candidate.id !== target.id &&
            Math.max(
              Math.abs(candidate.x - target.x),
              Math.abs(candidate.y - target.y),
            ) === 1,
        )
        .sort(
          (left, right) =>
            left.hp - right.hp || left.id.localeCompare(right.id),
        )[0];
      if (bounceTarget) {
        resolveDamageBundle(
          tick,
          source,
          bounceTarget,
          {
            physical: Math.round(
              (primaryDamage.physical * behavior.damagePercent) / 100,
            ),
            special: Math.round(
              (primaryDamage.special * behavior.damagePercent) / 100,
            ),
            true: Math.round(
              (primaryDamage.true * behavior.damagePercent) / 100,
            ),
          },
          "item",
        );
      }
    }
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
    criticalPower: number,
    abilityCritical: boolean,
  ): boolean => {
    const definition = ability.sequentialStrike;
    const normalStrikePowers = sequentialStrikePowers(scaledPower, definition);
    const criticalStrikePowers = abilityCritical
      ? sequentialStrikePowers(criticalPower, definition)
      : normalStrikePowers;
    if (!definition || !normalStrikePowers || !criticalStrikePowers) {
      return false;
    }
    let target: MutableBattleUnit | null = alive(initialTarget)
      ? initialTarget
      : null;
    const finalHitBonus = validFinalHitBonus(definition);
    for (
      let index = 0;
      index < normalStrikePowers.length && target;
      index += 1
    ) {
      const strikePowers =
        abilityCritical &&
        !hasItemBehavior(target, "incoming-critical-bonus-negation")
          ? criticalStrikePowers
          : normalStrikePowers;
      const isFinalHit = index === normalStrikePowers.length - 1;
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
        hitCount: normalStrikePowers.length,
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
      if (target.hp <= 0 && index < normalStrikePowers.length - 1) {
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

  const captureResurrectionBaseline = (unit: MutableBattleUnit): void => {
    if (!unit.resurrectionAvailable) {
      return;
    }
    unit.resurrectionBaseline = {
      ...(unit.formId ? { formId: unit.formId } : {}),
      ability: unit.ability ? structuredClone(unit.ability) : null,
      maxHp: unit.maxHp,
      attack: unit.attack,
      defense: unit.defense,
      specialDefense: unit.specialDefense,
      range: unit.range,
      attackIntervalTicks: unit.attackIntervalTicks,
      dynamicAttackSpeedBaseTicks: unit.dynamicAttackSpeedBaseTicks,
      abilityPowerPercent: unit.abilityPowerPercent,
      criticalChancePercent: unit.criticalChancePercent,
      criticalPowerPercent: unit.criticalPowerPercent,
      luck: unit.luck,
      dodgePercent: unit.dodgePercent,
      omnivampPercent: unit.omnivampPercent,
      maxEnergy: unit.maxEnergy,
    };
  };

  const applyResurrectionStartIdentities = (
    tick: number,
    unit: MutableBattleUnit,
    includeRuneProtect: boolean,
  ): void => {
    for (const behavior of unit.itemBehaviors) {
      if (behavior.kind === "start-base-attack-self-burn") {
        applyBurn(
          tick,
          unit,
          unit,
          Math.round(unit.maxHp * 0.05),
          behavior.burnDurationMs,
          { bypassRuneProtect: true },
        );
      } else if (includeRuneProtect && behavior.kind === "starting-rune-protect") {
        unit.runeProtectUntilTick = Math.max(
          unit.runeProtectUntilTick,
          tick +
            Math.max(
              1,
              Math.ceil(behavior.durationMs / content.config.combatTickMs),
            ),
        );
      }
    }
  };

  const processResurrections = (tick: number): void => {
    for (const unit of units) {
      if (
        unit.state !== "resurrecting" ||
        unit.resurrectAtTick <= 0 ||
        tick < unit.resurrectAtTick ||
        !unit.resurrectionBaseline
      ) {
        continue;
      }
      const baseline = unit.resurrectionBaseline;
      if (baseline.formId) {
        unit.formId = baseline.formId;
      } else {
        delete unit.formId;
      }
      unit.ability = baseline.ability ? structuredClone(baseline.ability) : null;
      unit.maxHp = baseline.maxHp;
      unit.hp = baseline.maxHp;
      unit.shield = 0;
      unit.energy = 0;
      unit.maxEnergy = baseline.maxEnergy;
      unit.attack = baseline.attack;
      unit.defense = baseline.defense;
      unit.specialDefense = baseline.specialDefense;
      unit.range = baseline.range;
      unit.attackIntervalTicks = baseline.attackIntervalTicks;
      unit.dynamicAttackSpeedBaseTicks = baseline.dynamicAttackSpeedBaseTicks;
      unit.dynamicAttackSpeedPercent = 0;
      unit.abilityPowerPercent = baseline.abilityPowerPercent;
      unit.criticalChancePercent = baseline.criticalChancePercent;
      unit.criticalPowerPercent = baseline.criticalPowerPercent;
      unit.luck = baseline.luck;
      unit.dodgePercent = baseline.dodgePercent;
      unit.omnivampPercent = baseline.omnivampPercent;
      unit.abilityCastCount = 0;
      unit.itemRuntimeCounters = {
        basicAttackAttempts: 0,
        damageReceivedEvents: 0,
      };
      unit.totalShieldGained = 0;
      unit.emergencyShieldUsed = false;
      unit.stunUntilTick = 0;
      unit.runeProtectUntilTick = 0;
      unit.protectUntilTick = 0;
      unit.blindedUntilTick = 0;
      unit.paralyzedUntilTick = 0;
      unit.resistanceReductionUntilTick = 0;
      unit.woundUntilTick = 0;
      unit.burnUntilTick = 0;
      unit.burnNextTick = 0;
      unit.burnPower = 0;
      unit.burnSourceId = null;
      unit.lastDamagerId = null;
      unit.resurrectAtTick = 0;
      unit.state = "seek";
      unit.nextActionTick = tick + 1;
      unit.periodicItemBehaviors = unit.periodicItemBehaviors.map((runtime) => ({
        ...runtime,
        nextTick: tick + runtime.intervalTicks,
      }));
      applyResurrectionStartIdentities(tick, unit, true);
      emit({
        type: "unit-resurrect",
        tick,
        unitId: unit.id,
        hp: unit.hp,
        maxHp: unit.maxHp,
        ...(unit.formId ? { formId: unit.formId } : {}),
      });
    }
  };

  const processDeaths = (tick: number): void => {
    for (const unit of units) {
      if (
        unit.state === "dead" ||
        unit.state === "resurrecting" ||
        unit.hp > 0
      ) {
        continue;
      }
      if (
        unit.resurrectionAvailable &&
        unit.resurrectionBaseline
      ) {
        const behavior = unit.itemBehaviors.find(
          (candidate) => candidate.kind === "resurrect-once",
        );
        if (behavior?.kind === "resurrect-once") {
          unit.resurrectionAvailable = false;
          unit.hp = 0;
          unit.state = "resurrecting";
          unit.resurrectAtTick =
            tick +
            Math.max(
              1,
              Math.ceil(behavior.delayMs / content.config.combatTickMs),
            );
          continue;
        }
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
        const requestedAttack = Math.max(
          1,
          Math.floor(
            (killer.attack * killer.stackingAttackPercent) / 100,
          ),
        );
        applyCombatStatDelta(
          killer,
          "attack",
          requestedAttack,
          "self",
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

  for (const unit of units) {
    captureResurrectionBaseline(unit);
    applyResurrectionStartIdentities(0, unit, false);
  }
  const initialUnits = units.map(toSnapshot);

  let endTick = 0;
  let timedOut = false;
  for (let tick = 1; tick <= maxTicks; tick += 1) {
    endTick = tick;
    processResurrections(tick);
    for (const unit of units) {
      if (!alive(unit)) {
        continue;
      }
      for (const runtime of unit.periodicItemBehaviors) {
        if (tick < runtime.nextTick) {
          continue;
        }
        if (runtime.behavior.kind === "periodic-ability-power-energy") {
          applyCombatStatDelta(
            unit,
            "ability-power",
            runtime.behavior.abilityPowerPercent,
            "self",
          );
          changeEnergy(tick, unit, runtime.behavior.energy, "item");
        } else if (runtime.behavior.kind === "periodic-attack-speed") {
          applyCombatStatDelta(
            unit,
            "dynamic-attack-speed",
            runtime.behavior.attackSpeedPercent,
            "self",
          );
        } else {
          const adjacentAllies = units.filter(
            (candidate) =>
              alive(candidate) &&
              candidate.teamId === unit.teamId &&
              Math.abs(candidate.x - unit.x) <= 1 &&
              Math.abs(candidate.y - unit.y) <= 1,
          );
          for (const ally of adjacentAllies) {
            const requestedHeal = Math.round(
              (ally.maxHp * runtime.behavior.healMaxHealthPercent) / 100,
            );
            const { overheal } = applyHeal(tick, unit, ally, requestedHeal);
            const energyGain = Math.round(
              (overheal * runtime.behavior.overhealEnergyPercent) / 100,
            );
            if (energyGain > 0) {
              changeEnergy(tick, ally, energyGain, "item");
            }
          }
        }
        runtime.nextTick += runtime.intervalTicks;
      }
    }
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
      (unit) => battleActive(unit) && unit.teamId === teamA.id,
    );
    const livingB = units.some(
      (unit) => battleActive(unit) && unit.teamId === teamB.id,
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
      if (
        source.ability &&
        source.energy >= source.maxEnergy &&
        !hasItemBehavior(source, "cannot-cast-energy-attacks")
      ) {
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
        "nearest-enemy",
        true,
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
      let resolvedCast = false;
      for (const targetId of intent.targetIds) {
        const target = units.find((unit) => unit.id === targetId);
        if (!target) {
          continue;
        }
        resolvedCast ||= alive(target);
        const targetDirectPower =
          abilityCritical &&
          hasItemBehavior(target, "incoming-critical-bonus-negation")
            ? scaledPower
            : directPower;
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
            scaledPower,
            directPower,
            abilityCritical,
          );
          if (!sequentialApplied) {
            const hits = Math.max(1, abilityDefinition.hits ?? 1);
            for (let hit = 0; hit < hits; hit += 1) {
              applyDamage(
                tick,
                source,
                target,
                targetDirectPower,
                "ability",
                abilityDefinition.damageType ?? "special",
                abilityDefinition.defensePiercePercent,
              );
            }
          }
          if (target.hp > 0 && abilityDefinition.stunMs) {
            applyStun(
              tick,
              source,
              target,
              abilityDefinition.stunMs,
            );
          }
          if (
            target.hp > 0 &&
            abilityDefinition.burnPower &&
            abilityDefinition.burnDurationMs
          ) {
            applyBurn(
              tick,
              source,
              target,
              Math.floor(
                (abilityDefinition.burnPower *
                  abilityMultiplier *
                  (100 + source.abilityPowerPercent)) /
                  1_000_000,
              ),
              abilityDefinition.burnDurationMs,
            );
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
          if (
            source.teamId !== target.teamId &&
            hasItemBehavior(target, "forced-movement-immunity")
          ) {
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
          if (
            source.teamId !== target.teamId &&
            hasItemBehavior(target, "forced-movement-immunity")
          ) {
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
      if (!resolvedCast) {
        continue;
      }
      source.abilityCastCount += 1;
      for (const behavior of source.itemBehaviors) {
        if (behavior.kind === "on-ability-cast-energy") {
          changeEnergy(
            tick,
            source,
            Math.min(
              behavior.maxEnergy,
              Math.round(
                behavior.baseEnergy +
                  behavior.perCastEnergy * source.abilityCastCount,
              ),
            ),
            "item",
          );
        } else if (behavior.kind === "on-ability-cast-shield") {
          applyShield(tick, source, source, behavior.shield);
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
      const rolledDodge = roll(
        adjustedChancePercent(
          target.dodgePercent + (tick < source.blindedUntilTick ? 50 : 0),
          target.luck,
        ),
      );
      const dodged =
        hasItemBehavior(source, "basic-attacks-cannot-miss") ||
        tick < target.paralyzedUntilTick
        ? false
        : rolledDodge;
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
      const energyAttackPower = hasItemBehavior(
        source,
        "cannot-cast-energy-attacks",
      )
        ? source.energy
        : 0;
      if (energyAttackPower > 0) {
        changeEnergy(tick, source, -energyAttackPower, "item");
      }
      changeEnergy(tick, source, 10, "attack");
      if (dodged) {
        emit({
          type: "dodge",
          tick,
          sourceId: source.id,
          targetId: target.id,
        });
      }
      const baseAttackDamage = dodged
        ? 0
        : critical
          ? hasItemBehavior(target, "incoming-critical-bonus-negation")
            ? source.attack
            : Math.max(
              1,
              Math.floor(
                (source.attack * source.criticalPowerPercent) / 100,
              ),
              )
          : source.attack;
      const trueDamageBehavior = source.itemBehaviors.find(
        (behavior) => behavior.kind === "basic-attack-true-damage-percent",
      );
      const trueDamage = trueDamageBehavior
        ? Math.round(
            (baseAttackDamage * trueDamageBehavior.percent) / 100,
          )
        : 0;
      const impactBehavior = source.itemBehaviors.find(
        (behavior) =>
          behavior.kind === "on-basic-attack-target-max-health-physical",
      );
      const primaryDamage: BasicAttackDamage = {
        physical:
          baseAttackDamage - trueDamage +
          (impactBehavior
            ? Math.round((target.maxHp * impactBehavior.percent) / 100)
            : 0),
        special: energyAttackPower,
        true: trueDamage,
      };
      if (!dodged) {
        for (const behavior of source.itemBehaviors) {
          if (behavior.kind === "on-basic-attack-resistance-reduction") {
            applyResistanceReduction(
              tick,
              source,
              target,
              behavior.durationMs,
            );
          }
        }
      }
      const aliveBefore = alive(target);
      resolveDamageBundle(tick, source, target, primaryDamage, "attack");
      applyBasicAttackItemBehaviors(
        tick,
        source,
        target,
        primaryDamage,
        critical,
        aliveBefore && !alive(target) && !target.resurrectionAvailable,
      );
      for (const behavior of target.itemBehaviors) {
        if (
          behavior.kind !== "on-basic-attack-received-retaliate-wound" ||
          Math.max(
            Math.abs(source.x - target.x),
            Math.abs(source.y - target.y),
          ) !== 1 ||
          source.itemBehaviors.some(
            (sourceBehavior) =>
              sourceBehavior.kind === "shield-damage-multiplier" &&
              sourceBehavior.suppressRetaliation,
          )
        ) {
          continue;
        }
        applyDamage(
          tick,
          target,
          source,
          Math.round(3 * (3 + 0.15 * target.defense)),
          "item",
          "true",
          0,
          { isRetaliation: true },
        );
        applyWound(tick, target, source, behavior.woundMs);
      }
    }

    processDeaths(tick);

    const reserved = new Set(
      units
        .filter(occupiesBoardCell)
        .map((unit) => `${unit.x},${unit.y}`),
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
    (unit) => battleActive(unit) && unit.teamId === teamA.id,
  );
  const survivingB = units.filter(
    (unit) => battleActive(unit) && unit.teamId === teamB.id,
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
