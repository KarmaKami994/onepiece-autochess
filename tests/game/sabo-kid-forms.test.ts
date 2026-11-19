import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  resolvePersistentFormId,
  simulateBattle,
  type BattleSetupUnit,
  type GameContent,
} from "../../game";

function fighter(id: string, definitionId: string, x: number, y: number, items: string[] = []): BattleSetupUnit {
  return { id, definitionId, star: 1, items, position: { x, y } };
}

function battle(allies: BattleSetupUnit[], enemies: BattleSetupUnit[], content: GameContent = DEFAULT_CONTENT) {
  return simulateBattle({ id: "crew", units: allies }, { id: "rivals", units: enemies },
    { seed: "sabo-kid-forms", maxTicks: 1 }, content);
}

function fixedHitContent(power: number): GameContent {
  const content = structuredClone(DEFAULT_CONTENT);
  const nami = content.units.find((unit) => unit.id === "nami");
  if (!nami) throw new Error("Missing the fixed-hit attacker.");
  nami.stats.health = 5_000;
  nami.stats.attack = 1;
  nami.ability = {
    id: "fixed-hit", name: "Fixed Hit", description: "Test hit",
    damageType: "true", effect: "damage", targeting: "nearest-enemy",
    pattern: "single", power, castAnimationMs: 0,
  };
  content.items.push({ id: "full-energy", name: "Full Energy", description: "Test energy", icon: "", kind: "component",
    effects: [{ kind: "starting-energy", value: 100 }] });
  return content;
}

describe("Sabo — Flame Emperor", () => {
  it("switches a queued Dragon Claw to the Fire Fist line and burns only enemies along it", () => {
    const content = fixedHitContent(533);
    const sabo = fighter("sabo", "sabo", 1, 3, ["full-energy"]);
    const enemies = [
      fighter("a-primary", "nami", 1, 2, ["full-energy"]),
      fighter("b-off-line", "nami", 0, 2),
      fighter("c-back", "nami", 1, 0),
    ];
    const result = battle([sabo], enemies, content);
    expect(result.initialUnits.find((unit) => unit.id === sabo.id)?.formId).toBeUndefined();
    const transformation = result.events.filter((event) => event.type === "unit-transform");
    expect(transformation).toEqual([{
      type: "unit-transform", unitId: "sabo", tick: 1, fromFormId: null, toFormId: "sabo-flame-emperor", hp: 227, maxHp: 760,
    }]);
    expect(result.events.filter((event) => event.type === "cast" && event.sourceId === "sabo"))
      .toMatchObject([{ abilityId: "sabo-fire-fist", targetIds: ["a-primary", "c-back"] }]);
    expect(result.events.filter((event) => event.type === "status" && event.sourceId === "sabo" && event.status === "burn"))
      .toMatchObject([{ targetId: "a-primary" }, { targetId: "c-back" }]);
    expect(battle([sabo], enemies, content)).toEqual(result);
  });

  it.each([532, 760])("keeps the base form after a hit of %i at the threshold or on knockout", (power) => {
    const result = battle([fighter("sabo", "sabo", 1, 3)],
      [fighter("a-primary", "nami", 1, 2, ["full-energy"])], fixedHitContent(power));
    expect(result.events.some((event) => event.type === "unit-transform")).toBe(false);
  });
});

describe("Kid — Punk Rotten", () => {
  it("uses the locked opening formation while retaining the deployed unit's identity and gear", () => {
    const kid = fighter("kid", "kid", 1, 3, ["armament-wraps"]);
    const enemy = fighter("rookie", "nami", 3, 2);
    const result = battle([kid, fighter("killer", "killer", 2, 3)], [enemy]);
    expect(result.initialUnits.find((unit) => unit.id === kid.id)).toMatchObject({
      definitionId: "kid", formId: "kid-punk-rotten", maxHp: 920, defense: 47, range: 1, star: 1, items: kid.items,
    });
    expect(kid.formId).toBeUndefined();
    expect(resolvePersistentFormId({ definitionId: "kid", formId: "kid-punk-rotten" })).toBeNull();
  });

  it("ignores a diagonal ally and an orthogonally adjacent enemy Killer", () => {
    const result = battle([fighter("kid", "kid", 1, 3), fighter("ally-killer", "killer", 2, 4)],
      [fighter("enemy-killer", "killer", 1, 2)]);
    expect(result.initialUnits.find((unit) => unit.id === "kid")?.formId).toBeUndefined();
    expect(result.finalUnits.find((unit) => unit.id === "kid")?.formId).toBeUndefined();
  });
});
