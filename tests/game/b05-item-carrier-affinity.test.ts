import { describe, expect, it } from "vitest";
import {
  createMatch, DEFAULT_CONTENT, getUnitDefinition, runBotTurn, scoreBotInstance,
  scoreItemEffect, scoreItemForPlayer, scoreItemForUnit, serializeMatch,
  type BotTurnDiagnostic, type UnitInstance,
} from "../../game";

function fixture() {
  const content = structuredClone(DEFAULT_CONTENT);
  content.botPersonalities.push({ ...content.botPersonalities[0], id: "b05-c", levelAggression: 0, rerollAggression: 0, preferredTraits: [] });
  const state = createMatch("b05-c-carrier", content);
  state.round = 6; state.stageId = "pvp-6";
  const player = state.players[1];
  player.personalityId = "b05-c"; player.gold = 0; player.level = 2;
  player.units = {}; player.board = {}; player.bench.fill(null);
  player.shop.fill(null); player.inventory = [];
  function put(definitionId: string, star: 1 | 2 | 3 = 1, items: string[] = []) {
    const serial = state.nextUnitSerial++;
    const unit: UnitInstance = { id: `carrier-${serial}`, definitionId, star, items, acquiredOrder: serial };
    player.units[unit.id] = unit;
    player.bench[player.bench.indexOf(null)] = unit.id;
    return unit;
  }
  return { state, player, content, put };
}

function observe(test: ReturnType<typeof fixture>) {
  const before = serializeMatch(test.state);
  const events: BotTurnDiagnostic[] = [];
  const result = runBotTurn(test.state, test.player.id, test.content, event => events.push(event));
  const repeated: BotTurnDiagnostic[] = [];
  const repeatResult = runBotTurn(test.state, test.player.id, test.content, event => repeated.push(event));
  expect(serializeMatch(test.state)).toBe(before);
  expect(serializeMatch(result)).toBe(serializeMatch(runBotTurn(test.state, test.player.id, test.content)));
  expect(serializeMatch(result)).toBe(serializeMatch(repeatResult));
  expect(events).toEqual(repeated);
  expect(result.rngState).toBe(test.state.rngState);
  expect(events).toHaveLength(1);
  expect(events[0].purchases).toEqual([]);
  expect(events[0].xp.successfulPurchases).toBe(0);
  expect(events[0].rerolls.successfulRerolls).toBe(0);
  return { event: events[0], player: result.players[1] };
}

describe("B05-C Special Defense carrier affinity", () => {
  it("reuses the exact Defense/Guardian score without changing shared reward scores", () => {
    const test = fixture();
    const guardian = test.put("jinbe"); const ranged = test.put("kizaru");
    const score = (itemId: string, unit: UnitInstance) => scoreItemForUnit(itemId, unit, getUnitDefinition(unit.definitionId, test.content)!, test.content);
    expect(score("sea-prism-stone", guardian)).toBe(64);
    expect(score("sea-prism-stone", ranged)).toBe(40);
    expect(score("sea-prism-shard", guardian)).toBeCloseTo(4.8);
    expect(score("sea-prism-shard", guardian)).toBe(score("armament-plate", guardian));
    expect(score("sea-prism-shard", ranged)).toBe(score("armament-plate", ranged));
    expect(scoreItemEffect({ kind: "special-defense-flat", value: 40 }, { hasTrait: () => true, hasRanged: true })).toEqual({ score: 0, affinities: [] });
    expect(scoreItemForPlayer("sea-prism-stone", test.player, test.content)).toBe(0);
    test.player.inventory.push("sea-prism-stone");
    expect(scoreItemForPlayer("sea-prism-stone", test.player, test.content)).toBe(-8);
  });

  it("equips the Guardian despite the stronger non-Guardian roster tie breaker", () => {
    const test = fixture();
    const ranged = test.put("kizaru", 3); const guardian = test.put("jinbe");
    const personality = test.content.botPersonalities.at(-1)!;
    expect(scoreBotInstance(ranged, test.player, personality, test.content)).toBeGreaterThan(scoreBotInstance(guardian, test.player, personality, test.content));
    test.player.inventory = ["sea-prism-stone"];
    const { event, player } = observe(test);
    expect(event.itemDecisions[0].selected?.unitId).toBe(guardian.id);
    expect(player.units[guardian.id].items).toEqual(["sea-prism-stone"]);
    expect(player.units[ranged.id].items).toEqual([]);
  });

  it("scores a crafted resistance result after removing its component, even at cap", () => {
    const test = fixture();
    test.put("kizaru", 3, ["sea-prism-shard"]);
    const guardian = test.put("jinbe", 1, ["black-blade", "meat-platter", "sea-prism-shard"]);
    test.player.inventory = ["sea-prism-shard"];
    const { event, player } = observe(test);
    expect(event.itemDecisions[0].selected).toMatchObject({ unitId: guardian.id, recipeResultId: "sea-prism-stone", craftReturnsToInventory: false });
    expect(player.units[guardian.id].items).toEqual(["black-blade", "meat-platter", "sea-prism-stone"]);
    expect(player.inventory).toEqual([]);
  });

  it("keeps duplicate-result crafting legal and returns the duplicate to inventory", () => {
    const test = fixture();
    const guardian = test.put("jinbe", 1, ["sea-prism-stone", "black-blade", "sea-prism-shard"]);
    test.player.inventory = ["sea-prism-shard"];
    const { event, player } = observe(test);
    expect(event.itemDecisions[0].selected).toMatchObject({ unitId: guardian.id, recipeResultId: "sea-prism-stone", craftReturnsToInventory: true });
    expect(player.units[guardian.id].items).toEqual(["sea-prism-stone", "black-blade"]);
    expect(player.inventory).toEqual(["sea-prism-stone"]);
    expect(event.itemDecisions[1]).toMatchObject({ outcome: "no-legal-candidate", blockReasons: { "sea-prism-stone:duplicate-completed": 1 } });
  });

  it.each(["full", "duplicate"] as const)("keeps a %s Guardian ineligible for a direct equip", reason => {
    const test = fixture();
    const guardian = test.put("jinbe", 1, reason === "full" ? ["black-blade", "meat-platter", "clima-tact"] : ["sea-prism-stone"]);
    const ranged = test.put("kizaru"); test.player.inventory = ["sea-prism-stone"];
    const { event, player } = observe(test);
    expect(event.itemDecisions[0].blockReasons[`sea-prism-stone:${reason === "full" ? "slot-cap" : "duplicate-completed"}`]).toBe(1);
    expect(event.itemDecisions[0].selected?.unitId).toBe(ranged.id);
    expect(player.units[guardian.id].items).toEqual(guardian.items);
    expect(player.units[ranged.id].items).toEqual(["sea-prism-stone"]);
  });

  it("does not override a native-trait grant rejection for a Guardian", () => {
    const test = fixture(); const guardian = test.put("jinbe"); const ranged = test.put("kizaru");
    test.player.inventory = ["guardians-sea-prism-crest"];
    const { event, player } = observe(test);
    expect(event.itemDecisions[0].blockReasons["guardians-sea-prism-crest:native-trait"]).toBe(1);
    expect(event.itemDecisions[0].selected?.unitId).toBe(ranged.id);
    expect(player.units[guardian.id].items).toEqual([]);
  });

  it("preserves unknown-item and full-carrier scoring guards", () => {
    const test = fixture(); const guardian = test.put("jinbe"); const definition = getUnitDefinition("jinbe", test.content)!;
    expect(scoreItemForUnit("unknown", guardian, definition, test.content)).toBe(Number.NEGATIVE_INFINITY);
    expect(scoreItemForUnit("sea-prism-stone", { ...guardian, items: ["black-blade", "meat-platter", "clima-tact"] }, definition, test.content)).toBe(Number.NEGATIVE_INFINITY);
  });
});
