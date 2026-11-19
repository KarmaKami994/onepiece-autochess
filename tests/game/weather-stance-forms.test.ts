import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT, resolvePersistentFormId, simulateBattle, type BattleSetupUnit, type WeatherKind } from "../../game";

function fighter(id: string, definitionId: string, x: number, y: number, items: string[] = []): BattleSetupUnit {
  return { id, definitionId, position: { x, y }, star: 1, items };
}

function fight(definitionId: "blackbeard" | "kuzan", weather: WeatherKind, maxTicks = 1) {
  const content = structuredClone(DEFAULT_CONTENT);
  const nami = content.units.find((unit) => unit.id === "nami");
  if (!nami) throw new Error("Missing practice target.");
  nami.stats = { ...nami.stats, health: 10_000, attack: 1, range: 20, attackIntervalMs: 100_000 };
  content.items.push({
    id: "repeat-cast-fixture", name: "Repeat Cast", icon: "", kind: "completed", description: "Deterministic cast fixture.",
    effects: [{ kind: "starting-energy", value: 100 }],
    behaviors: [{ kind: "on-ability-cast-energy", baseEnergy: 100, perCastEnergy: 0, maxEnergy: 100 }],
  });
  return simulateBattle(
    { id: "crew", units: [fighter("caster", definitionId, 2, 4, ["repeat-cast-fixture"])] },
    { id: "rivals", units: [fighter("near", "nami", 2, 2), fighter("flank", "nami", 3, 2), fighter("far", "nami", 6, 0)] },
    { seed: "weather-stance-forms", environment: { weather, fields: [] }, maxTicks },
    content,
  );
}

describe("Kuzan's Ice Form", () => {
  it.each(["neutral", "rain"] as const)("keeps normal Ice Age in %s weather", (weather) => {
    const result = fight("kuzan", weather);
    expect(result.initialUnits.find((unit) => unit.id === "caster")?.formId).toBeUndefined();
    expect(result.events.find((event) => event.type === "cast" && event.sourceId === "caster"))
      .toMatchObject({ abilityId: "ice-age", targetIds: ["far", "flank", "near"] });
  });

  it("starts in Ice Form during Snow and Freezes only the nearest cluster for 13 ticks", () => {
    const result = fight("kuzan", "snow");
    expect(result.initialUnits.find((unit) => unit.id === "caster"))
      .toMatchObject({ definitionId: "kuzan", formId: "kuzan-ice-form", range: 4, maxHp: 900 });
    expect(result.events.find((event) => event.type === "cast" && event.sourceId === "caster"))
      .toMatchObject({ abilityId: "ice-age-snow", targetIds: ["flank", "near"] });
    expect(result.events.filter((event) => event.type === "status" && event.status === "freeze"))
      .toMatchObject([{ targetId: "flank", durationTicks: 13 }, { targetId: "near", durationTicks: 13 }]);
  });
});

describe("Blackbeard's Darkness and Quake forms", () => {
  it("alternates after resolved casts, using the cluster that Black Hole pulls together", () => {
    const result = fight("blackbeard", "neutral", 23);
    expect(result.initialUnits.find((unit) => unit.id === "caster"))
      .toMatchObject({ definitionId: "blackbeard", formId: "blackbeard-darkness", maxHp: 1_220, energy: 100 });
    expect(result.events.filter((event) => event.type === "cast" && event.sourceId === "caster"))
      .toMatchObject([
        { tick: 1, abilityId: "black-hole", targetIds: ["far", "flank", "near"] },
        { tick: 12, abilityId: "tremor-crush", targetIds: ["flank", "near"] },
        { tick: 23, abilityId: "black-hole", targetIds: ["far", "flank", "near"] },
      ]);
    const changes = result.events.filter((event) => event.type === "unit-transform");
    expect(changes).toMatchObject([
      { tick: 1, fromFormId: "blackbeard-darkness", toFormId: "blackbeard-quake" },
      { tick: 12, fromFormId: "blackbeard-quake", toFormId: "blackbeard-darkness" },
      { tick: 23, fromFormId: "blackbeard-darkness", toFormId: "blackbeard-quake" },
    ]);
    const pull = result.events.findIndex((event) => event.type === "unit-displace" && event.tick === 1 && event.movementKind === "pull");
    expect(pull).toBeGreaterThanOrEqual(0);
    expect(result.events.indexOf(changes[0])).toBeGreaterThan(pull);
    expect(fight("blackbeard", "neutral", 23)).toEqual(result);
  });

  it.each([
    ["kuzan", "kuzan-ice-form"],
    ["blackbeard", "blackbeard-darkness"],
    ["blackbeard", "blackbeard-quake"],
  ])("keeps %s's %s out of persistent roster form state", (definitionId, formId) => {
    expect(resolvePersistentFormId({ definitionId, formId })).toBeNull();
  });
});
