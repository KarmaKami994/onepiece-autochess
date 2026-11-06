import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT, addUnitToPlayer, advanceMatchPhase, applyCommand, createMatch, deserializeMatch,
  getBotPersonality, getFoodDefinition, getStageDefinition, migrateMatchState, prepareHarborOffers,
  regenerateBattleResults, runBotTurn, scoreBotInstance, serializeMatch, simulateBattle,
  type BattleTeam, type GameCommand, type GameContent, type MatchState, type UnitInstance,
} from "../../game";
import { createTeamPlan, simulateTeamPlan, validateTeamPlan } from "../../game/teamPlanner";
import { newVoyageReplay, observeVoyage, replayFrameState } from "../../app/chronicle";
import { validateReplay } from "../../app/replayValidation";
import { selectMatchView } from "../../app/selectors";
import { crewReference } from "../../app/crewReference";
import { summarizeFood } from "../../scripts/food_report";

const content: GameContent = { ...DEFAULT_CONTENT, config: { ...DEFAULT_CONTENT.config, playerCount: 2, combatMaxTicks: 1 } };
const actor = { actorPlayerId: "player-1" };
function command(state: MatchState, input: GameCommand, rules = content): MatchState {
  const result = applyCommand(state, input, actor, rules);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}
function put(state: MatchState, playerIndex = 0, definitionId = "zoro") {
  const player = state.players[playerIndex];
  const serial = state.nextUnitSerial++;
  const unit: UnitInstance = { id: `food-crew-${serial}`, definitionId, star: 1, items: [], acquiredOrder: serial };
  player.units[unit.id] = unit; player.board[`${Object.keys(player.board).length + playerIndex + 2},5`] = unit.id;
  state.pool[definitionId] -= 1;
  return unit;
}
function preparation(foodId = "sea-king-bento") {
  const state = createMatch("b09-meal", content); state.round = 6; state.stageId = "pvp-6";
  state.players[0].foodInventory = [foodId]; put(state); put(state, 1);
  return state;
}
function harbor(round = 16) {
  const state = createMatch("b09-harbor", content); state.round = round; state.stageId = getStageDefinition(round, content).id;
  prepareHarborOffers(state, content);
  return state;
}

describe("B09 food acquisition and authority", () => {
  it.each([16, 18, 21, 23])("replaces exactly one R%s harbor option with deterministic food, leaving rewards and pool alone", round => {
    const state = harbor(round); expect(harbor(round)).toEqual(state);
    for (const offers of Object.values(state.pendingHarborOffers)) {
      expect(offers).toHaveLength(round === 16 || round === 21 ? 3 : 2);
      expect(offers.filter(offer => offer.kind === "food")).toHaveLength(1);
      expect(new Set(offers.map(offer => offer.kind === "food" ? offer.foodId : offer.itemId)).size).toBe(offers.length);
    }
    const offer = state.pendingHarborOffers["player-1"].find(offer => offer.kind === "food")!;
    const before = structuredClone(state); const next = command(state, { type: "CHOOSE_HARBOR_OFFER", choiceId: offer.id });
    expect(offer.kind).toBe("food"); if (offer.kind !== "food") throw new Error("Missing food offer");
    expect(next.players[0].foodInventory).toEqual([offer.foodId]); expect(next.players[0].inventory).toEqual(before.players[0].inventory);
    expect(next.players[0].gold).toBe(before.players[0].gold - offer.goldCost);
    expect(next.players[0].xp).toBe(before.players[0].xp); expect(next.pool).toEqual(before.pool);
    expect(next.foodHistory).toMatchObject([{ foodId: offer.foodId, kind: "received", goldPaid: offer.goldCost }]);
    expect(next.voyageChoiceHistory[0]).toMatchObject({ foodId: offer.foodId, paidGold: offer.goldCost });
    expect(next.voyageChoiceHistory[0].itemId).toBeUndefined(); expect(next.phase).toBe("preparation");
    expect(state).toEqual(before);
  });

  it("rejects full stock and unaffordable food with no payment, serial, RNG or receipt mutation; skip always works", () => {
    for (const full of [true, false]) {
      const state = harbor(18); const player = state.players[0];
      player.foodInventory = full ? ["cola-tonic", "cola-tonic", "pirate-curry"] : [];
      player.gold = full ? 20 : 0;
      const offer = state.pendingHarborOffers[player.id].find(offer => offer.kind === "food")!;
      const before = serializeMatch(state); const result = applyCommand(state, { type: "CHOOSE_HARBOR_OFFER", choiceId: offer.id }, actor, content);
      expect(result.ok).toBe(false); expect(result.state).toBe(state); expect(serializeMatch(state)).toBe(before);
      expect(command(state, { type: "CHOOSE_HARBOR_OFFER", choiceId: "skip" }).phase).toBe("preparation");
    }
  });

  it("serves only owned stock to an owned deployed instance during preparation, once", () => {
    const state = preparation(); const id = Object.values(state.players[0].board)[0]; const before = serializeMatch(state);
    for (const input of [
      { type: "USE_FOOD", foodId: "not-food", unitId: id },
      { type: "USE_FOOD", foodId: "sea-king-bento", unitId: Object.values(state.players[1].board)[0] },
    ] satisfies GameCommand[]) {
      const result = applyCommand(state, input, actor, content); expect(result.ok).toBe(false); expect(result.state).toBe(state);
    }
    expect(serializeMatch(state)).toBe(before);
    const served = command(state, { type: "USE_FOOD", foodId: "sea-king-bento", unitId: id });
    expect(served.players[0].foodInventory).toEqual([]); expect(served.players[0].units).toEqual(state.players[0].units);
    expect(served.players[0].pendingMeal).toMatchObject({ foodId: "sea-king-bento", unitId: id, round: 6 });
    expect(served.rngState).toBe(state.rngState);
    served.players[0].foodInventory = ["pirate-curry"];
    const repeated = applyCommand(served, { type: "USE_FOOD", foodId: "pirate-curry", unitId: id }, actor, content);
    expect(repeated.ok).toBe(false); expect(repeated.state).toBe(served); expect(served.players[0].foodInventory).toEqual(["pirate-curry"]);
    const benched = command(state, { type: "MOVE_UNIT", unitId: id, to: { zone: "bench", slot: 0 } });
    expect(applyCommand(benched, { type: "USE_FOOD", foodId: "sea-king-bento", unitId: id }, actor, content).ok).toBe(false);
    const battle = command(served, { type: "END_PREPARATION" });
    expect(applyCommand(battle, { type: "USE_FOOD", foodId: "pirate-curry", unitId: id }, actor, content).ok).toBe(false);
  });
});

describe("B09 one-battle lifecycle", () => {
  it.each(["sea-king-bento", "cola-tonic", "pirate-curry"])("freezes %s once; save/regeneration preserves exact effects and next battle has no meal", foodId => {
    const state = preparation(foodId); const id = Object.values(state.players[0].board)[0];
    const base = command(state, { type: "END_PREPARATION" });
    const served = command(state, { type: "USE_FOOD", foodId, unitId: id });
    expect(deserializeMatch(serializeMatch(served), content)).toEqual(served);
    const battle = command(served, { type: "END_PREPARATION" });
    const initial = battle.lastResults[0].initialUnits.find(unit => unit.id === `player-1:${id}`)!;
    const unbuffed = base.lastResults[0].initialUnits.find(unit => unit.id === initial.id)!;
    expect(initial.foodId).toBe(foodId); expect(initial.items).toEqual(unbuffed.items);
    expect(initial.maxHp).toBe(foodId === "sea-king-bento" ? unbuffed.maxHp + Math.floor(unbuffed.maxHp / 10) : unbuffed.maxHp);
    expect(initial.attack).toBe(foodId === "pirate-curry" ? Math.floor(unbuffed.attack * 1.1) : unbuffed.attack);
    expect(initial.energy).toBe(foodId === "cola-tonic" ? Math.min(unbuffed.maxEnergy, unbuffed.energy + 15) : unbuffed.energy);
    expect(battle.players[0].pendingMeal).toBeUndefined(); expect(battle.players[0].foodInventory).toEqual([]);
    expect(battle.foodHistory?.map(receipt => receipt.kind)).toEqual(["served", "applied"]);
    const restored = deserializeMatch(serializeMatch(battle), content);
    expect(restored).toEqual(battle); expect(regenerateBattleResults(restored, content)).toEqual(battle);
    const next = advanceMatchPhase(battle, content); expect(next.battleMeals).toEqual({});
    expect(command(next, { type: "END_PREPARATION" }).lastResults.flatMap(result => result.initialUnits).every(unit => !unit.foodId)).toBe(true);
  });

  it.each(["bench", "sell", "merge"])("forfeits the portion when the recipient is lost by %s before battle", mode => {
    let state = preparation(); const player = state.players[0]; const id = Object.values(player.board)[0];
    if (mode === "merge") {
      // The earlier board coordinate is the real merge survivor; serving does not alter merge priority.
      player.units[id].acquiredOrder = 50;
      const older: UnitInstance = { id: "older-zoro", definitionId: "zoro", star: 1, items: [], acquiredOrder: 0 };
      player.units[older.id] = older; player.board["1,5"] = older.id; state.pool.zoro -= 1;
    }
    state = command(state, { type: "USE_FOOD", foodId: "sea-king-bento", unitId: id });
    if (mode === "bench") state = command(state, { type: "MOVE_UNIT", unitId: id, to: { zone: "bench", slot: 1 } });
    if (mode === "sell") state = command(state, { type: "SELL_UNIT", unitId: id });
    if (mode === "merge") {
      const next = addUnitToPlayer(state, state.players[0], "zoro", content);
      expect(next).not.toBeNull(); expect(state.players[0].units[id]).toBeUndefined();
    }
    const battle = command(state, { type: "END_PREPARATION" });
    expect(battle.battleMeals?.["player-1"]).toBeUndefined(); expect(battle.players[0].foodInventory).toEqual([]);
    expect(battle.foodHistory?.map(receipt => receipt.kind)).toEqual(["served", "expired"]);
    expect(battle.lastResults.flatMap(result => result.initialUnits).every(unit => !unit.foodId)).toBe(true);
  });

  it("does not stack a meal again on Phoenix resurrection", () => {
    const definition = DEFAULT_CONTENT.units[0];
    const rules: GameContent = { ...content, units: [{ ...definition, traits: [], stats: { ...definition.stats, health: 100, attack: 1_000, defense: 0, specialDefense: 0, range: 8, attackIntervalMs: 100_000 } }],
      config: { ...content.config, combatMaxTicks: 25 } };
    const team = (id: string, food = false): BattleTeam => ({ id, units: [{ id, definitionId: definition.id, star: 1,
      items: food ? ["phoenix-feather"] : [], ...(food ? { foodId: "sea-king-bento" } : {}), position: { x: 0, y: food ? 1 : 0 } }] });
    const result = simulateBattle(team("a"), team("b", true), { seed: "food-phoenix" }, rules);
    const revival = result.events.filter(event => event.type === "unit-resurrect");
    expect(revival).toHaveLength(1); expect(revival[0]).toMatchObject({ tick: 21, maxHp: 110, hp: 110 });
    expect(result.finalUnits.find(unit => unit.id === "b")).toMatchObject({ maxHp: 110, foodId: "sea-king-bento" });
  });
});

describe("B09 bots, compatibility and observation", () => {
  it("keeps legacy component-only offers/RNG and backfills old schema-6 stock without grants", () => {
    const state = harbor(); const legacyOffers = [{ id: "legacy-gift", itemId: "sea-king-meat", goldCost: 0 }];
    state.pendingHarborOffers["player-1"] = legacyOffers;
    const { foodHistory: _history, battleMeals: _meals, ...old } = state;
    for (const player of old.players) delete player.foodInventory;
    expect([_history, _meals]).toBeTruthy(); const restored = migrateMatchState(old, content);
    expect(restored.pendingHarborOffers["player-1"]).toEqual(legacyOffers); expect(restored.rngState).toBe(state.rngState);
    expect(restored.players.every(player => player.foodInventory?.length === 0)).toBe(true);
    expect(migrateMatchState(restored, content)).toEqual(restored);
    expect(command(restored, { type: "CHOOSE_HARBOR_OFFER", choiceId: "legacy-gift" }).players[0].inventory).toContain("sea-king-meat");
    expect(() => migrateMatchState({ ...state, foodHistory: [{ kind: "served" }] }, content)).toThrow();
  });

  it("bots acquire only useful affordable food and serve by existing instance score without changing other policy", () => {
    const state = harbor(18); const bot = state.players[1]; const fighter = put(state, 1);
    fighter.items = ["armament-wraps"]; const reserve = getBotPersonality(bot, content).economyReserve;
    bot.gold = reserve + 2;
    const chosen = advanceMatchPhase(state, content);
    expect(chosen.players[1].foodInventory).toHaveLength(1); expect(chosen.players[1].gold).toBe(reserve);
    const second = put(chosen, 1, "nami"); chosen.players[1].board["4,5"] = second.id;
    chosen.phase = "preparation"; chosen.players[1].gold = 0;
    const turn = runBotTurn(chosen, bot.id, content); expect(runBotTurn(chosen, bot.id, content)).toEqual(turn);
    const prepared = turn.players[1]; const personality = getBotPersonality(prepared, content);
    const ranked = Object.values(prepared.board).map(id => prepared.units[id]).sort((a, b) =>
      scoreBotInstance(b, prepared, personality, content) - scoreBotInstance(a, prepared, personality, content) || a.id.localeCompare(b.id));
    expect(prepared.pendingMeal?.unitId).toBe(ranked[0].id); expect(prepared.foodInventory).toEqual([]);
    const poor = harbor(18); put(poor, 1).items = ["armament-wraps"]; poor.players[1].gold = reserve + 1;
    expect(advanceMatchPhase(poor, content).players[1].foodInventory).toEqual([]);
  });

  it("archives frozen meals and counts food separately, rejecting forged stock/content", () => {
    const state = preparation(); const id = Object.values(state.players[0].board)[0];
    const served = command(state, { type: "USE_FOOD", unitId: id, foodId: "sea-king-bento" });
    const battle = command(served, { type: "END_PREPARATION" });
    let replay = observeVoyage(newVoyageReplay(served, content, "food-replay", 1), served, 1);
    replay = observeVoyage(replay, battle, 2);
    const restored = validateReplay(JSON.parse(JSON.stringify(replay)), content);
    const frame = replayFrameState(restored, restored.frames[1], content);
    expect(frame.battleMeals).toEqual(battle.battleMeals); expect(frame.foodHistory).toEqual(battle.foodHistory);
    expect(frame.lastResults).toEqual(battle.lastResults); expect(replay.collection.itemsOwned).toEqual([]);
    expect(summarizeFood(battle.foodHistory ?? [])).toMatchObject({ received: 0, served: 1, applied: 1, expired: 0, goldSpent: 0 });
    const forged = structuredClone(restored); forged.frames[0].players[0].foodInventory = ["not-a-food"];
    expect(() => validateReplay(forged, content)).toThrow();
    const view = selectMatchView(battle, content); expect(view?.galley.meal?.name).toBe("Sea-King Bento");
    expect(view?.boardUnits.find(unit => unit.id === `player-1:${id}`)?.foodId).toBe("sea-king-bento");
    expect(crewReference(content).filter(entry => entry.category === "food")).toHaveLength(3);
    expect(Object.keys(content.itemRecipes)).toHaveLength(55); expect(content.items).toHaveLength(65);
    expect(getFoodDefinition("sea-king-meat", content)).toBeNull();
  });

  it("planner validates one meal per side and runs the same production effects without consuming a voyage", () => {
    const plan = createTeamPlan(content); plan.teams.a = [{ id: "a", definitionId: "zoro", star: 1, items: [], foodId: "cola-tonic", position: { x: 0, y: 5 } }];
    plan.teams.b = [{ id: "b", definitionId: "zoro", star: 1, items: [], position: { x: 0, y: 5 } }];
    const result = simulateTeamPlan(plan, content); expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errors.join(" "));
    expect(result.result.initialUnits.find(unit => unit.teamId === "plan-a")?.energy).toBe(15);
    plan.teams.a.push({ ...plan.teams.a[0], id: "a2", position: { x: 1, y: 5 } });
    expect(validateTeamPlan(plan, content).ok).toBe(false);
    plan.teams.a.pop(); plan.teams.a[0].foodId = "cola-canister"; expect(validateTeamPlan(plan, content).ok).toBe(false);
  });
});
