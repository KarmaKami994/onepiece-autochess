import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT, CURRENT_SAVE_SCHEMA_VERSION, ACQUIRABLE_ITEM_IDS,
  simulateBattle, createMatch, serializeMatch, deserializeMatch,
  type AbilityDefinition, type BattleEvent, type ItemDefinition,
  type UnitStats, type BattleTeam,
} from "../../game";

const ids = ["cola-reservoir", "star-shield-dial", "observation-haki-mantle", "healing-dial"];
const item = (id: string): ItemDefinition => {
  const found = DEFAULT_CONTENT.items.find((entry) => entry.id === id);
  if (!found) throw new Error(id);
  return structuredClone(found);
};
type Options = {
  items?: string[];
  overrides?: ItemDefinition[];
  energy?: number;
  targetEnergy?: number;
  targetShield?: number;
  sourceStats?: Partial<UnitStats>;
  targetStats?: Partial<UnitStats>;
  ability?: Partial<AbilityDefinition>;
  targetAbility?: Partial<AbilityDefinition>;
  ticks?: number;
  crit?: number;
  vamp?: number;
  extraTarget?: boolean;
};
function run(options: Options = {}) {
  const content = structuredClone(DEFAULT_CONTENT);
  const baseStats: UnitStats = {
    health: 10000, attack: 30, defense: 0, specialDefense: 0,
    range: 10, attackIntervalMs: 100, moveIntervalMs: 100,
  };
  const baseAbility: AbilityDefinition = {
    id: "fixture", name: "Fixture", description: "", targeting: "nearest-enemy",
    pattern: "single", effect: "damage", power: 100, castAnimationMs: 0,
  };
  content.units = [
    { id: "source-def", name: "Source", cost: 1, traits: [],
      stats: { ...baseStats, ...options.sourceStats },
      ability: { ...baseAbility, ...options.ability }, assetPath: "" },
    { id: "target-def", name: "Target", cost: 1, traits: [],
      stats: { ...baseStats, attackIntervalMs: 60000, ...options.targetStats },
      ability: { ...baseAbility, ...options.targetAbility }, assetPath: "" },
  ];
  content.forms = [];
  for (const override of options.overrides ?? []) {
    content.items = content.items.filter((entry) => entry.id !== override.id);
    content.items.push(override);
  }
  const team = (source: boolean): BattleTeam => ({
    id: source ? "a" : "b",
    units: [{ id: source ? "z-source" : "a-target",
      definitionId: source ? "source-def" : "target-def", star: 1,
      items: source ? options.items ?? [] : [], position: { x: 0, y: source ? 1 : 0 } }],
    activeTraits: [{ traitId: "fixture", count: 1, tierIndex: 0,
      tier: { required: 1, label: "", effects: [
        { kind: "starting-energy", value: source ? options.energy ?? 0 : options.targetEnergy ?? 0 },
        { kind: "critical-chance-percent", value: source ? options.crit ?? -100 : -100 },
        { kind: "shield-flat", value: source ? 0 : options.targetShield ?? 0 },
        { kind: "omnivamp-percent", value: source ? options.vamp ?? 0 : 0 },
      ] } }],
  });
  const targetTeam = team(false);
  if (options.extraTarget) {
    targetTeam.units.push({ id: "b-target", definitionId: "target-def",
      star: 1, items: [], position: { x: 1, y: 0 } });
  }
  return simulateBattle(team(true), targetTeam, { seed: "p4b4", maxTicks: options.ticks ?? 1 }, content);
}
function events<T extends BattleEvent["type"]>(result: ReturnType<typeof run>, type: T) {
  return result.events.filter((event): event is Extract<BattleEvent, { type: T }> => event.type === type);
}
const itemEnergy = (result: ReturnType<typeof run>) =>
  events(result, "energy").filter((event) => event.unitId === "z-source" && event.reason === "item");
const sourceHeals = (result: ReturnType<typeof run>) =>
  events(result, "heal").filter((event) => event.sourceId === "z-source" && event.targetId === "z-source");

describe("P4B4 cast and sustain items", () => {
  it("assigns exact metadata only to the four approved identities", () => {
    expect(item(ids[0]).effects).toEqual([{ kind: "starting-energy", value: 30 }]);
    expect(item(ids[0]).behaviors).toEqual([{ kind: "on-ability-cast-energy", baseEnergy: 20, perCastEnergy: 2, maxEnergy: 90 }]);
    expect(item(ids[1]).effects).toEqual([{ kind: "special-defense-flat", value: 10 }, { kind: "starting-energy", value: 15 }]);
    expect(item(ids[1]).behaviors).toEqual([{ kind: "on-ability-cast-shield", shield: 50 }]);
    expect(item(ids[2]).effects).toEqual([{ kind: "ability-power-percent", value: 10 }, { kind: "critical-chance-percent", value: 20 }, { kind: "ability-crit" }]);
    expect(item(ids[2]).behaviors).toEqual([{ kind: "native-ability-crit-power", criticalPowerPercent: 50 }]);
    expect(item(ids[3]).effects).toEqual([{ kind: "attack-flat", value: 15 }, { kind: "special-defense-flat", value: 5 }]);
    expect(item(ids[3]).behaviors).toEqual([{ kind: "on-damage-dealt-heal-percent", percent: 33 }]);
    const kinds = ids.flatMap((id) => item(id).behaviors?.map((behavior) => behavior.kind) ?? []);
    expect(DEFAULT_CONTENT.items.filter((entry) => entry.behaviors?.some((behavior) => kinds.includes(behavior.kind))).map((entry) => entry.id).sort()).toEqual([...ids].sort());
  });

  it("restores 22 then 24 Energy after reset and the complete ability", () => {
    const result = run({ items: [ids[0]], energy: 70, ticks: 12 });
    expect(itemEnergy(result).slice(0, 2).map((event) => event.amount)).toEqual([22, 24]);
    const first = itemEnergy(result)[0];
    const reset = result.events.findIndex((event) => event.type === "energy" && event.reason === "cast-reset");
    const damage = result.events.findIndex((event) => event.type === "damage" && event.sourceId === "z-source");
    expect(reset).toBeLessThan(damage);
    expect(damage).toBeLessThan(result.events.indexOf(first));
    expect(first.value).toBe(22);
  });

  it("caps Aqua's formula at 90 and the shared Energy helper at 100", () => {
    const aqua = item(ids[0]);
    aqua.behaviors = [{ kind: "on-ability-cast-energy", baseEnergy: 20, perCastEnergy: 200, maxEnergy: 90 }];
    expect(itemEnergy(run({ items: [aqua.id], overrides: [aqua], energy: 70 }))[0].value).toBe(90);
    aqua.behaviors.push({ kind: "on-ability-cast-energy", baseEnergy: 20, perCastEnergy: 2, maxEnergy: 90 });
    expect(itemEnergy(run({ items: [aqua.id], overrides: [aqua], energy: 70 })).map((event) => event.value)).toEqual([90, 100]);
  });

  it("grants one post-cast shield and Energy proc for a multi-hit ability", () => {
    const result = run({ items: [ids[0], ids[1]], energy: 55, ability: { hits: 3 } });
    const damage = events(result, "damage").filter((event) => event.sourceId === "z-source");
    const shields = events(result, "shield").filter((event) => event.sourceId === "z-source");
    expect(damage).toHaveLength(3);
    expect(shields).toHaveLength(1);
    expect(shields[0].amount).toBe(50);
    expect(itemEnergy(result)).toHaveLength(1);
    expect(result.events.indexOf(shields[0])).toBeGreaterThan(result.events.indexOf(damage[2]));
  });

  it("does not trigger cast items for aborted lunge resolution", () => {
    const result = run({ items: [ids[0], ids[1]], energy: 55,
      ability: { signatureMechanics: [{ kind: "lunge" }] }, targetStats: { health: 1 },
      targetEnergy: 100, targetAbility: { targeting: "self", power: 100 } });
    expect(itemEnergy(result)).toEqual([]);
    expect(events(result, "shield")).toEqual([]);
  });

  it("runs cast effects once across multiple targets and ignores a cast with no living target", () => {
    const area = run({ items: [ids[0], ids[1]], energy: 55,
      ability: { pattern: "all-enemies" }, extraTarget: true });
    expect(events(area, "damage").filter((event) => event.sourceId === "z-source")).toHaveLength(2);
    expect(itemEnergy(area)).toHaveLength(1);
    expect(events(area, "shield")).toHaveLength(1);
    const aborted = run({ items: [ids[0], ids[1]], energy: 55,
      targetStats: { health: 1 }, targetEnergy: 100,
      targetAbility: { targeting: "self", power: 100 } });
    expect(itemEnergy(aborted)).toEqual([]);
    expect(events(aborted, "shield")).toEqual([]);
  });

  it.each([false, true])("uses native crit capability %s for the battle-start bonus", (native) => {
    const result = run({ items: [ids[2]], energy: 100, crit: 100,
      ability: { canCritByDefault: native } });
    expect(events(result, "damage").find((event) => event.sourceId === "z-source")?.amount).toBe(native ? 275 : 220);
  });

  it("reuses the same Ability Crit RNG decision", () => {
    const equivalent = item(ids[2]);
    equivalent.behaviors = [];
    const options: Options = { items: [ids[2]], energy: 100, crit: 15, ticks: 30 };
    expect(run(options)).toEqual(run({ ...options, overrides: [equivalent] }));
  });

  it.each([0, 1000])("heals rounded-up actual health/shield damage (shield=%s)", (shield) => {
    const result = run({ items: [ids[3]], targetShield: shield });
    expect(sourceHeals(result).map((event) => event.amount)).toEqual([15]);
    expect(events(result, "damage").find((event) => event.sourceId === "z-source")).toMatchObject({
      amount: 45, healthDamage: shield ? 0 : 45, shieldDamage: shield ? 45 : 0,
    });
  });

  it("counts damage after mitigation and caps healing at missing HP", () => {
    const mitigated = run({ items: [ids[3]], targetStats: { defense: 100, attack: 100 } });
    expect(sourceHeals(mitigated)[0].amount).toBe(8);
    const capped = run({ items: [ids[3]], targetStats: { attack: 1 } });
    expect(sourceHeals(capped)[0].amount).toBe(1);
  });

  it("heals for each ability hit and attributed burn tick separately", () => {
    const result = run({ items: [ids[3]], energy: 100, targetEnergy: 100,
      targetAbility: { power: 1000 }, ability: { hits: 3, burnPower: 30, burnDurationMs: 3000 },
      sourceStats: { attackIntervalMs: 60000 }, ticks: 11 });
    expect(sourceHeals(result).filter((event) => event.tick === 1).map((event) => event.amount)).toEqual([33, 33, 33]);
    const burn = events(result, "damage").find((event) => event.damageKind === "burn");
    expect(burn).toMatchObject({ sourceId: "z-source", amount: 30 });
    expect(sourceHeals(result).find((event) => event.tick === 11)?.amount).toBe(10);
  });

  it("does not heal self damage or a zero-damage application to a dead target", () => {
    const self = run({ items: [ids[3]], energy: 100, ability: { targeting: "self" } });
    expect(sourceHeals(self)).toEqual([]);
    const overkill = run({ items: [ids[3]], energy: 100, targetEnergy: 100,
      targetAbility: { power: 1000 }, targetStats: { health: 1 }, ability: { hits: 3 } });
    expect(sourceHeals(overkill).map((event) => event.amount)).toEqual([1]);
  });

  it("preserves health-only floor-rounded omnivamp alongside Shell Bell", () => {
    const result = run({ items: [ids[3]], vamp: 10, targetStats: { attack: 100 } });
    expect(sourceHeals(result).map((event) => event.amount)).toEqual([4, 15]);
    const shield = run({ items: [ids[3]], vamp: 10, targetShield: 1000 });
    expect(sourceHeals(shield).map((event) => event.amount)).toEqual([15]);
  });

  it("keeps acquisition, deterministic output and schema-6 item saves", () => {
    expect(ACQUIRABLE_ITEM_IDS).toEqual([
      "jolly-roger-fragment", "devil-fruit-essence", "cola-canister",
      "jet-dial", "sniper-lens", "sea-king-meat", "sea-prism-shard",
      "black-blade-shard", "armament-plate", "captains-sash",
    ]);
    expect(run({ items: ids, ticks: 30 })).toEqual(run({ items: ids, ticks: 30 }));
    const state = createMatch("p4b4-save");
    state.contentVersion = "1.18.0";
    state.players[0].inventory = [...ids, ...ACQUIRABLE_ITEM_IDS];
    const restored = deserializeMatch(serializeMatch(state));
    expect(restored.players[0].inventory).toEqual(state.players[0].inventory);
    expect(DEFAULT_CONTENT.version).toBe("1.30.0");
    expect(restored.contentVersion).toBe("1.30.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(restored.schemaVersion).toBe(6);
  });
});
