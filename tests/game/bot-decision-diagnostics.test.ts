import { describe, expect, it } from "vitest";
import { createMatch, DEFAULT_CONTENT, runBotTurn, serializeMatch, scoreBotUnit, scoreBotInstance, scoreItemEffect, type BotTurnDiagnostic, type GameContent, type MatchState, type UnitInstance } from "../../game";
import { summarizeBotDecisionDiagnostics } from "../../scripts/bot_decision_report";
import { summarizeBotProgressionDiagnostics } from "../../scripts/run_production_soak";

function fixture(gold = 20) {
  const content = structuredClone(DEFAULT_CONTENT);
  content.botPersonalities.push({ ...content.botPersonalities[0], id: "b05-fixture", economyReserve: 10, levelAggression: 0, rerollAggression: 0, preferredTraits: [] });
  const state = createMatch("b05-focused", content); state.round = 6; state.stageId = "pvp-6";
  const player = state.players[1]; player.personalityId = "b05-fixture"; player.gold = gold; player.units = {}; player.board = {}; player.bench.fill(null); player.shop.fill(null); player.inventory = [];
  return { state, content, player };
}
function put(test: ReturnType<typeof fixture>, definitionId: string, star: 1 | 2 | 3 = 1, items: string[] = [], board = false) {
  const serial = test.state.nextUnitSerial++;
  const unit: UnitInstance = { id: `held-${serial}`, definitionId, star, items, acquiredOrder: serial };
  test.player.units[unit.id] = unit;
  if (board) test.player.board[`${Object.keys(test.player.board).length},5`] = unit.id;
  else test.player.bench[test.player.bench.indexOf(null)] = unit.id;
  return unit;
}
function observe(state: MatchState, content: GameContent) {
  const before = serializeMatch(state); const without = runBotTurn(state, "bot-1", content);
  const diagnostics: BotTurnDiagnostic[] = [];
  const withObserver = runBotTurn(state, "bot-1", content, (event) => diagnostics.push(event));
  expect(serializeMatch(state)).toBe(before);
  expect(serializeMatch(withObserver)).toBe(serializeMatch(without));
  expect(withObserver.rngState).toBe(without.rngState);
  expect(diagnostics).toHaveLength(1);
  expect(JSON.parse(JSON.stringify(diagnostics))).toEqual(diagnostics);
  expect(diagnostics[0].offerDecisions.filter((decision) => decision.outcome === "purchased").map((decision) => ({ source: decision.source, definitionId: decision.definitionId, cost: decision.cost, level: decision.level }))).toEqual(diagnostics[0].purchases);
  return { event: diagnostics[0], after: withObserver };
}

describe("B05 visible shop decisions", () => {
  it("does not invent a reserve rejection when an offer is unaffordable", () => {
    const test = fixture(0); test.player.shop[0] = "shanks";
    const { event } = observe(test.state, test.content);
    expect(event.offerDecisions).toMatchObject([{ definitionId: "shanks", outcome: "unaffordable", reservePassed: null, receiving: "not-evaluated", earlierPurchases: [] }]);
  });
  it("records an actual reserve-policy block without claiming a capacity check", () => {
    const test = fixture(5); test.player.shop[0] = "shanks";
    expect(observe(test.state, test.content).event.offerDecisions[0]).toMatchObject({ outcome: "reserve-policy", reservePassed: false, purchaseRule: null, receiving: "not-evaluated" });
  });
  it("shows frozen ranking and affordability after earlier real purchases", () => {
    const test = fixture(5); test.state.round = 1; test.player.shop = ["zoro", "shanks", null, null, null, null];
    const { event } = observe(test.state, test.content);
    expect(event.offerDecisions.map((entry) => entry.definitionId)).toEqual(["shanks", "zoro"]);
    expect(event.offerDecisions[0]).toMatchObject({ rank: 1, shopIndex: 1, outcome: "purchased", purchaseRule: "tutorial-exception", goldAtPassStart: 5, goldAtEvaluation: 5 });
    expect(event.offerDecisions[1]).toMatchObject({ rank: 2, outcome: "unaffordable", goldAtPassStart: 5, goldAtEvaluation: 0, earlierPurchases: ["shanks"], reservePassed: null });
    expect(summarizeBotDecisionDiagnostics([event]).offers.unaffordableAfterEarlierPurchases).toBe(1);
  });
  it("records the existing owned-copy score exception below reserve", () => {
    const test = fixture(1); put(test, "nami"); test.player.shop[0] = "nami";
    expect(observe(test.state, test.content).event.offerDecisions[0]).toMatchObject({ outcome: "purchased", reservePassed: false, purchaseRule: "score-exception" });
  });
  it("distinguishes full-bench merge capacity from protected replacement failure", () => {
    const merge = fixture(); put(merge, "luffy"); put(merge, "luffy"); while (merge.player.bench.includes(null)) put(merge, "nami", 2); merge.player.shop[0] = "luffy";
    const merged = observe(merge.state, merge.content).event.offerDecisions[0];
    expect(merged).toMatchObject({ receiving: "merge-capacity", outcome: "purchased" }); expect(merged.receipt?.after[0].star).toBe(2);
    const blocked = fixture(); while (blocked.player.bench.includes(null)) put(blocked, "nami", 2); blocked.player.shop[0] = "shanks";
    expect(observe(blocked.state, blocked.content).event.offerDecisions[0]).toMatchObject({ receiving: "blocked", outcome: "no-legal-replacement", replacementCandidates: [], replacementProtectedStars: blocked.player.bench.length });
  });
  it("reports the real eligible replacement and subsequent successful purchase", () => {
    const test = fixture(); test.player.bench = [null, null, null]; test.content.config.benchSize = 3;
    put(test, "nami"); put(test, "luffy"); put(test, "koby"); test.player.shop[0] = "shanks";
    const { event } = observe(test.state, test.content); const decision = event.offerDecisions[0];
    expect(decision).toMatchObject({ receiving: "blocked", outcome: "purchased" });
    expect(decision.replacementId).toBeTruthy();
    expect(decision.replacementCandidates?.find((entry) => entry.unitId === decision.replacementId)?.eligible).toBe(true);
    expect(decision.receipt?.after.some((entry) => entry.definitionId === "shanks")).toBe(true);
  });
  it("keeps new evidence deterministic, deeply frozen and observer-failure isolated", () => {
    const test = fixture(); test.player.shop[0] = "nami"; test.player.inventory = ["meat-platter"]; put(test, "luffy");
    const first = observe(test.state, test.content); const second = observe(test.state, test.content);
    expect(first.event).toEqual(second.event);
    expect(Object.isFrozen(first.event.offerDecisions[0].receipt?.after[0].items)).toBe(true);
    expect(Object.isFrozen(first.event.itemDecisions[0].topCandidates)).toBe(true);
    const thrown = runBotTurn(test.state, "bot-1", test.content, () => { throw new Error("consumer failure"); });
    expect(serializeMatch(thrown)).toBe(serializeMatch(first.after));
  });
});

describe("B05 item, craft, retention and form receipts", () => {
  it("reports a legal craft at the item cap through the existing equip authority", () => {
    const test = fixture(); put(test, "luffy", 1, ["jet-dial", "black-blade", "meat-platter"]); test.player.inventory = ["armament-plate"];
    const { event } = observe(test.state, test.content); const item = event.itemDecisions[0];
    expect(item).toMatchObject({ outcome: "equipped", selected: { recipeResultId: "armament-wraps", craftReturnsToInventory: false }, inventoryAfter: [] });
    expect(item.before?.items).toContain("jet-dial"); expect(item.after?.items).toContain("armament-wraps"); expect(item.after?.items).toHaveLength(3); expect(item.after?.formId).toBeUndefined();
  });
  it("shows duplicate craft return followed by the direct-duplicate guard", () => {
    const test = fixture(); put(test, "luffy", 1, ["jet-dial", "armament-wraps", "meat-platter"]); test.player.inventory = ["armament-plate"];
    const { event } = observe(test.state, test.content);
    expect(event.itemDecisions[0]).toMatchObject({ outcome: "equipped", selected: { craftReturnsToInventory: true }, inventoryAfter: ["armament-wraps"] });
    expect(event.itemDecisions[1]).toMatchObject({ outcome: "no-legal-candidate", blockReasons: { "armament-wraps:duplicate-completed": 1 } });
    const summary = summarizeBotDecisionDiagnostics([event]); expect(summary.items.crafts).toBe(1); expect(summary.items.craftReturnsToInventory).toBe(1);
  });
  it("explains native-trait, slot-cap and no-carrier stops without changing eligibility", () => {
    const native = fixture(); put(native, "luffy"); native.player.inventory = ["straw-hat-token"];
    expect(observe(native.state, native.content).event.itemDecisions[0].blockReasons).toEqual({ "straw-hat-token:native-trait": 1 });
    const cap = fixture(); put(cap, "luffy", 1, ["black-blade", "meat-platter", "clima-tact"]); cap.player.inventory = ["sniper-goggles"];
    expect(observe(cap.state, cap.content).event.itemDecisions[0].blockReasons).toEqual({ "sniper-goggles:slot-cap": 1 });
    const empty = fixture(); empty.player.inventory = ["meat-platter"];
    expect(observe(empty.state, empty.content).event.itemDecisions[0]).toMatchObject({ outcome: "no-carrier", selected: null });
  });
  it("exposes merge-retained catalysts and overflow, without forcing a form", () => {
    const make = (overflow: boolean) => {
      const test = fixture(); put(test, "luffy", 2, overflow ? ["black-blade", "meat-platter", "clima-tact"] : ["armament-wraps"], true);
      put(test, "luffy", 2, overflow ? ["armament-wraps"] : []); put(test, "luffy"); put(test, "luffy"); test.player.shop[0] = "luffy";
      return observe(test.state, test.content).event;
    };
    const retained = make(false); expect(retained.offerDecisions[0].receipt?.after[0]).toMatchObject({ star: 3, formId: "luffy-gear-4-boundman", items: ["armament-wraps"] });
    const overflow = make(true); const receipt = overflow.offerDecisions[0].receipt;
    expect(receipt?.after[0]).toMatchObject({ star: 3, items: ["black-blade", "meat-platter", "clima-tact"] }); expect(receipt?.after[0].formId).toBeUndefined(); expect(receipt?.inventoryAfter).toContain("armament-wraps");
    expect(overflow.itemDecisions[0].blockReasons).toEqual({ "armament-wraps:slot-cap": 1 });
    expect(summarizeBotDecisionDiagnostics([overflow]).merges.returnedItems).toBe(1);
    expect(summarizeBotDecisionDiagnostics([retained]).merges.formUnlocks).toEqual({ "luffy-gear-4-boundman": 1 });
  });
  it("records catalyst ownership below three stars and keeps an unlocked branch locked", () => {
    const low = fixture(); put(low, "luffy", 2); low.player.inventory = ["armament-wraps"];
    expect(observe(low.state, low.content).event.itemDecisions[0].after?.formId).toBeUndefined();
    const locked = fixture(); const luffy = put(locked, "luffy", 3, ["armament-wraps"]); luffy.formId = "luffy-gear-4-boundman"; locked.player.inventory = ["sniper-goggles"];
    const event = observe(locked.state, locked.content).event;
    expect(event.itemDecisions[0]).toMatchObject({ before: { formId: "luffy-gear-4-boundman" }, after: { formId: "luffy-gear-4-boundman" } });
    expect(summarizeBotDecisionDiagnostics([event]).items.formUnlocks).toEqual({});
  });
  it("leaves scoring constants and existing zero-valued effect affinities unchanged", () => {
    const test = fixture(); const personality = test.content.botPersonalities.at(-1)!;
    expect(scoreBotUnit("nami", test.player, personality, test.content)).toBe(25);
    const nami = put(test, "nami", 2, ["black-blade"]);
    expect(scoreBotUnit("nami", test.player, personality, test.content)).toBe(49);
    expect(scoreBotInstance(nami, test.player, personality, test.content)).toBe(49 + 100 + 18);
    expect(scoreBotInstance({ ...nami, star: 3 }, test.player, personality, test.content)).toBe(49 + 260 + 18);
    expect(scoreBotUnit("nami", test.player, { ...personality, preferredTraits: ["straw-hat"] }, test.content)).toBe(49 + 20);
    expect(scoreItemEffect({ kind: "special-defense-flat", value: 25 }, { hasTrait: () => true, hasRanged: true }).score).toBe(0);
  });
});

it("bounds rich report examples, accounts for every decision and preserves legacy raw shape", () => {
  const test = fixture(); test.player.shop[0] = "nami"; const event = observe(test.state, test.content).event;
  const repeated = Array.from({ length: 20 }, () => event); const report = summarizeBotDecisionDiagnostics(repeated);
  expect(report.offers.offers).toBe(20); expect(report.offers.purchased).toBe(20); expect(report.offerExamples["1:purchased"]).toHaveLength(3);
  expect(Object.values(report.byCost).reduce((sum, row) => sum + row.offers, 0)).toBe(report.offers.offers);
  const legacy = summarizeBotProgressionDiagnostics([event]); expect(legacy.rawPreparations[0]).not.toHaveProperty("offerDecisions"); expect(legacy.rawPreparations[0]).not.toHaveProperty("itemDecisions"); expect(legacy.decisionDiagnostics.offers.offers).toBe(1);
});
