import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT, createMatch, lateBotXpOpportunity, runBotTurn, serializeMatch, type BotTurnDiagnostic } from "../../game";

function fixture(level = 7, gold = 22, aggression = 0.5, units = level) {
  const content = structuredClone(DEFAULT_CONTENT);
  content.botPersonalities.push({ ...content.botPersonalities[0], id: "late-xp-fixture", economyReserve: 10, levelAggression: aggression, rerollAggression: 0, preferredTraits: [] });
  const state = createMatch("b05-late-xp", content); state.round = 26; state.stageId = "pvp-26";
  const player = state.players[1]; player.personalityId = "late-xp-fixture"; player.level = level; player.xp = 0; player.gold = gold; player.units = {}; player.board = {}; player.bench.fill(null); player.shop.fill(null); player.inventory = [];
  for (let index = 0; index < units; index += 1) {
    const id = `held-${index}`;
    player.units[id] = { id, definitionId: content.units[index].id, star: 1, items: [], acquiredOrder: index };
    player.board[`${index % 8},${5 - Math.floor(index / 8)}`] = id;
  }
  const personality = content.botPersonalities.at(-1)!;
  return { content, state, player, personality };
}
function observe(test: ReturnType<typeof fixture>) {
  const events: BotTurnDiagnostic[] = [];
  const baseline = serializeMatch(test.state);
  const after = runBotTurn(test.state, "bot-1", test.content, (event) => events.push(event));
  expect(serializeMatch(test.state)).toBe(baseline);
  expect(serializeMatch(after)).toBe(serializeMatch(runBotTurn(test.state, "bot-1", test.content)));
  expect(events).toHaveLength(1);
  return { after, event: events[0], player: after.players[1] };
}

describe("approved B05 late spare-gold candidate", () => {
  it("issues exactly one extra legal XP action and preserves reserve/RNG", () => {
    const test = fixture(); const result = observe(test);
    expect(result.event.xp).toMatchObject({ attemptBudget: 2, successfulPurchases: 2, goldSpent: 8, stopReason: "budget-exhausted" });
    expect(result.event.lateXp).toEqual({ attempts: 1, successfulPurchases: 1, goldSpent: 4, outcome: "purchased" });
    expect(result.player.gold).toBe(10); expect(result.player.xp).toBe(12);
    expect(result.after.rngState).toBe(test.state.rngState);
    expect(observe(test).event).toEqual(result.event);
    expect(Object.isFrozen(result.event.lateXp)).toBe(true);
  });
  it.each([6, 9])("does not add XP outside levels 7–8 (L%s)", (level) => {
    expect(observe(fixture(level, 100)).event.lateXp).toMatchObject({ attempts: 0, outcome: "not-applicable" });
  });
  it("keeps the exact personality threshold and respects a lower max level", () => {
    const low = fixture(7, 100, 0.49); expect(observe(low).event.lateXp.attempts).toBe(0);
    const edge = fixture(7, 100, 0.5); expect(observe(edge).event.lateXp.successfulPurchases).toBe(1);
    const capped = fixture(8, 100); capped.content.config.maxLevel = 8;
    expect(observe(capped).event.lateXp.attempts).toBe(0);
  });
  it("does not retry an original XP loop stopped by reserve or roster", () => {
    const reserve = observe(fixture(7, 14));
    expect(reserve.event.xp.stopReason).toBe("reserve"); expect(reserve.event.lateXp.outcome).toBe("not-applicable"); expect(reserve.player.gold).toBe(10);
    const roster = observe(fixture(7, 100, 0.5, 6));
    expect(roster.event.xp.stopReason).toBe("roster-guard"); expect(roster.event.lateXp.attempts).toBe(0);
  });
  it("rechecks current reserve after the original budget has finished", () => {
    const result = observe(fixture(7, 20));
    expect(result.event.xp.stopReason).toBe("budget-exhausted"); expect(result.event.lateXp).toMatchObject({ attempts: 0, outcome: "reserve" });
    expect(result.player.gold).toBe(12); expect(result.player.xp).toBe(8);
  });
  it("rechecks roster after a level-up on the last original XP purchase", () => {
    const test = fixture(7, 100); test.player.xp = 44;
    const result = observe(test);
    expect(result.event.xp.successfulPurchases).toBe(2); expect(result.player.level).toBe(8);
    expect(result.event.lateXp).toMatchObject({ attempts: 0, outcome: "roster-guard" });
  });
  it("runs only after existing rerolls/buys, so this turn's shop odds stay at the earlier level", () => {
    const test = fixture(7, 1000); test.player.xp = 40; test.personality.rerollAggression = 0.5;
    const result = observe(test);
    expect(result.event.rerolls.successfulRerolls).toBe(2);
    expect(result.event.shopSnapshots).toHaveLength(3);
    expect(result.event.shopSnapshots.every((snapshot) => snapshot.level === 7)).toBe(true);
    expect(result.event.purchases.length).toBeGreaterThan(0);
    expect(result.event.purchases.every((purchase) => purchase.level === 7)).toBe(true);
    expect(result.event.lateXp.successfulPurchases).toBe(1); expect(result.player.level).toBe(8);
  });
  it("can apply after original XP reaches L7, but never exceeds max after reaching L9", () => {
    const entering = fixture(6, 100, 0.5, 7); entering.player.xp = 30;
    expect(observe(entering).event.lateXp.successfulPurchases).toBe(1);
    const max = fixture(8, 100); max.player.xp = 64;
    const result = observe(max); expect(result.player.level).toBe(9); expect(result.event.lateXp.attempts).toBe(0);
  });
  it("does nothing outside the normal live bot preparation authority", () => {
    const test = fixture(); test.state.phase = "battle";
    expect(runBotTurn(test.state, "bot-1", test.content)).toBe(test.state);
    test.state.phase = "preparation"; test.player.isBot = false;
    expect(runBotTurn(test.state, "bot-1", test.content)).toBe(test.state);
    expect(lateBotXpOpportunity(test.player, test.personality, test.content.config, false)).toBe("not-applicable");
  });
});
