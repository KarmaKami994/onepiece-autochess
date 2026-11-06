import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT, advanceMatchPhase, applyCommand, createMatch, createVoyage,
  getBotPersonality, getHarborEncounter, harborDurationSeconds, migrateMatchState,
  prepareHarborOffers, prepareStarterOffers, prepareVoyageRecruitOffers, scoreBotUnit, serializeMatch,
  type GameCommand, type MatchState, type UnitInstance,
} from "../../game";
import { createVoyageSaveEnvelope, restoreVoyageState } from "../../app/voyagePersistence";
import { newVoyageReplay, observeVoyage, replayFrameState } from "../../app/chronicle";
import { validateReplay } from "../../app/replayValidation";
import { summarizeVoyageChoices } from "../../scripts/run_production_soak";

function choose(state: MatchState, command: GameCommand): MatchState {
  const result = applyCommand(state, command, { actorPlayerId: "player-1" });
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}
function put(state: MatchState, definitionId: string) {
  const player = state.players[0]; const serial = state.nextUnitSerial++;
  const unit: UnitInstance = { id: `fixture-${serial}`, definitionId, star: 1, items: [], acquiredOrder: serial };
  player.units[unit.id] = unit; player.bench[player.bench.indexOf(null)] = unit.id;
  state.pool[definitionId] -= 1;
  return unit;
}
function harbor(round: number) {
  const state = createMatch(`harbor-${round}`); state.round = round - 1; state.phase = "item-choice";
  return advanceMatchPhase(state);
}
const poolTotal = (state: MatchState) => Object.values(state.pool).reduce((sum, copies) => sum + copies, 0);

describe("B07 first crew", () => {
  it("uses a real production entry point while preserving prepared-match compatibility", () => {
    const prepared = createMatch("starter-pool"); const state = createVoyage("starter-pool");
    expect(prepared.phase).toBe("preparation"); expect(Object.keys(prepared.players[0].units)).toHaveLength(0);
    expect(state.phase).toBe("starter-choice"); expect(state.round).toBe(1);
    expect(Object.values(state.pendingVoyageRecruitOffers)).toHaveLength(8);
    for (const offers of Object.values(state.pendingVoyageRecruitOffers)) {
      expect(new Set(offers).size).toBe(3);
      expect(offers.every(id => DEFAULT_CONTENT.units.find(unit => unit.id === id)?.cost === 1)).toBe(true);
    }
    expect(poolTotal(state)).toBe(poolTotal(prepared) - 24);
    expect(serializeMatch(createVoyage("starter-pool"))).toBe(serializeMatch(state));
    const selected = state.pendingVoyageRecruitOffers["player-1"][0];
    const next = choose(state, { type: "CHOOSE_STARTER_RECRUIT", definitionId: selected });
    expect(next.phase).toBe("preparation"); expect(next.round).toBe(1);
    expect(next.players.map(player => player.gold)).toEqual(Array(8).fill(DEFAULT_CONTENT.config.startGold - 1));
    expect(next.players.every(player => Object.keys(player.units).length === 1)).toBe(true);
    expect(poolTotal(next)).toBe(poolTotal(prepared) - 8);
    expect(next.voyageChoiceHistory).toHaveLength(8);
    expect(next.players[0].xp).toBe(prepared.players[0].xp);
  });

  it("does not reserve or charge again when offers or resolved opening state are revisited", () => {
    const state = createVoyage("once"); const initial = serializeMatch(state);
    prepareStarterOffers(state, DEFAULT_CONTENT); expect(serializeMatch(state)).toBe(initial);
    const resolved = advanceMatchPhase(state); const after = serializeMatch(resolved);
    prepareStarterOffers(resolved, DEFAULT_CONTENT); expect(serializeMatch(resolved)).toBe(after);
    const replay = applyCommand(resolved, { type: "CHOOSE_STARTER_RECRUIT", definitionId: null }, { actorPlayerId: "player-1" });
    expect(replay.ok).toBe(false); expect(replay.state).toBe(resolved);
  });

  it("rejects invalid/unaffordable choices without pool, gold or RNG mutation; skip remains legal", () => {
    const state = createVoyage("invalid-starter"); state.players[0].gold = 0; const before = serializeMatch(state);
    for (const definitionId of ["unknown", state.pendingVoyageRecruitOffers["player-1"][0]]) {
      const result = applyCommand(state, { type: "CHOOSE_STARTER_RECRUIT", definitionId }, { actorPlayerId: "player-1" });
      expect(result.ok).toBe(false); expect(result.state).toBe(state); expect(serializeMatch(state)).toBe(before);
    }
    const skipped = choose(state, { type: "CHOOSE_STARTER_RECRUIT", definitionId: null });
    expect(skipped.phase).toBe("preparation"); expect(skipped.players[0].gold).toBe(0);
    expect(skipped.voyageChoiceHistory.find(receipt => receipt.playerId === "player-1")?.skipped).toBe(true);
  });

  it("converts a full-bench starter back to its cost and still permits a legal full-bench merge", () => {
    for (const merge of [false, true]) {
      const state = createVoyage(`capacity-${merge}`); const selected = state.pendingVoyageRecruitOffers["player-1"][0];
      if (merge) { put(state, selected); put(state, selected); }
      const fillers = DEFAULT_CONTENT.units.filter(unit => unit.cost === 2).map(unit => unit.id);
      for (const id of fillers.slice(0, merge ? 6 : 8)) put(state, id);
      const next = choose(state, { type: "CHOOSE_STARTER_RECRUIT", definitionId: selected });
      const receipt = next.voyageChoiceHistory.find(entry => entry.playerId === "player-1")!;
      expect(receipt.convertedGold).toBe(merge ? 0 : 1);
      expect(next.players[0].gold).toBe(DEFAULT_CONTENT.config.startGold - (merge ? 1 : 0));
      if (merge) expect(Object.values(next.players[0].units).find(unit => unit.definitionId === selected)?.star).toBe(2);
      expect(next.phase).toBe("preparation");
    }
  });

  it("handles an exhausted pool and picks bots with unchanged score and stable-ID ties", () => {
    const state = createVoyage("bot-starters"); const expected = state.players.map(player => [...state.pendingVoyageRecruitOffers[player.id]]
      .sort((a, b) => scoreBotUnit(b, player, getBotPersonality(player, DEFAULT_CONTENT), DEFAULT_CONTENT) - scoreBotUnit(a, player, getBotPersonality(player, DEFAULT_CONTENT), DEFAULT_CONTENT) || a.localeCompare(b))[0]);
    const resolved = advanceMatchPhase(state);
    expect(resolved.players.map(player => Object.values(player.units)[0].definitionId)).toEqual(expected);
    const empty = createMatch("empty-start"); for (const id of Object.keys(empty.pool)) empty.pool[id] = 0;
    prepareStarterOffers(empty, DEFAULT_CONTENT);
    const next = advanceMatchPhase(empty);
    expect(next.phase).toBe("preparation"); expect(next.voyageChoiceHistory.every(receipt => receipt.skipped)).toBe(true);
  });
});

describe("B07 recruitment routes and reservations", () => {
  it("votes by distinct owned definitions, seeds the chosen route and fills distinct primary-band choices", () => {
    const state = createMatch("route"); state.round = 10;
    put(state, "koby"); put(state, "nami"); put(state, "nami"); put(state, "nami");
    prepareVoyageRecruitOffers(state, DEFAULT_CONTENT);
    expect(state.pendingRecruitmentRoutes["player-1"]).toBe("navy-headquarters");
    const offers = state.pendingVoyageRecruitOffers["player-1"];
    expect(offers.slice(0, 2).every(id => ["kizaru", "kuzan", "akainu"].includes(id))).toBe(true);
    expect(new Set(offers).size).toBe(3);
    expect(offers.every(id => DEFAULT_CONTENT.units.find(unit => unit.id === id)?.cost === 4)).toBe(true);
  });

  it("uses all scarce primary definitions before the existing lower-band fallback", () => {
    const state = createMatch("route-scarcity"); state.round = 20;
    for (const unit of DEFAULT_CONTENT.units.filter(unit => unit.cost === 5)) state.pool[unit.id] = ["garp", "whitebeard"].includes(unit.id) ? 1 : 0;
    prepareVoyageRecruitOffers(state, DEFAULT_CONTENT);
    const offers = state.pendingVoyageRecruitOffers["player-1"];
    expect(offers).toEqual(expect.arrayContaining(["garp", "whitebeard"]));
    expect(offers.map(id => DEFAULT_CONTENT.units.find(unit => unit.id === id)!.cost).sort()).toEqual([4, 5, 5]);
    expect(Object.values(state.pool).every(copies => copies >= 0)).toBe(true);
  });

  it("preserves exact legacy P11 offers/RNG and never re-reserves during restore", () => {
    const state = createMatch("saved-recruits"); state.round = 10;
    prepareVoyageRecruitOffers(state, DEFAULT_CONTENT);
    const { pendingRecruitmentRoutes: _routes, pendingHarborOffers: _harbor, voyageChoiceHistory: _history, ...legacy } = state;
    expect(_routes).toBeTruthy(); expect(_harbor).toBeTruthy(); expect(_history).toBeTruthy();
    const restored = migrateMatchState(legacy);
    expect(restored.pendingVoyageRecruitOffers).toEqual(state.pendingVoyageRecruitOffers);
    expect(restored.pool).toEqual(state.pool); expect(restored.rngState).toBe(state.rngState);
    expect(restored.pendingRecruitmentRoutes).toEqual({});
    expect(migrateMatchState(restored)).toEqual(restored);
  });
});

describe("B07 harbor economy and save/replay", () => {
  it.each([16, 18, 21, 23])("enters R%s once, then returns to same-round preparation without duplicate income", round => {
    const state = harbor(round); const player = state.players[0];
    expect(state.phase).toBe("harbor-choice"); expect(state.round).toBe(round);
    expect(getHarborEncounter(round, DEFAULT_CONTENT)).not.toBeNull();
    expect(harborDurationSeconds(8, DEFAULT_CONTENT)).toBe(37);
    const offer = state.pendingHarborOffers[player.id][0]; const gold = player.gold; const xp = player.xp;
    const inventory = [...player.inventory]; const next = choose(state, { type: "CHOOSE_HARBOR_OFFER", choiceId: offer.id });
    expect(next.phase).toBe("preparation"); expect(next.round).toBe(round);
    expect(next.players[0].gold).toBe(gold - offer.goldCost); expect(next.players[0].xp).toBe(xp);
    expect(next.players[0].inventory).toEqual([...inventory, offer.itemId]);
    expect(next.voyageChoiceHistory.filter(receipt => receipt.kind === "harbor")).toHaveLength(8);
    const after = serializeMatch(next); prepareHarborOffers(next, DEFAULT_CONTENT); expect(serializeMatch(next)).toBe(after);
    expect(applyCommand(next, { type: "CHOOSE_HARBOR_OFFER", choiceId: offer.id }, { actorPlayerId: player.id }).ok).toBe(false);
  });

  it("rejects invalid and unaffordable trades without mutation; empty/unaffordable stops always allow skip", () => {
    const state = harbor(18); state.players[0].gold = 0; const before = serializeMatch(state);
    for (const choiceId of ["invalid", state.pendingHarborOffers["player-1"][0].id]) {
      const result = applyCommand(state, { type: "CHOOSE_HARBOR_OFFER", choiceId }, { actorPlayerId: "player-1" });
      expect(result.ok).toBe(false); expect(result.state).toBe(state); expect(serializeMatch(state)).toBe(before);
    }
    expect(choose(state, { type: "CHOOSE_HARBOR_OFFER", choiceId: "skip" }).phase).toBe("preparation");
  });

  it("keeps paid bot choices reserve-safe and uses seeded, distinct free gifts", () => {
    const content = structuredClone(DEFAULT_CONTENT); content.acquirableItemIds = ["black-blade-shard"];
    const state = createMatch("bot-harbor", content); state.round = 18;
    prepareHarborOffers(state, content);
    for (const [index, player] of state.players.entries()) {
      player.isBot = true; player.gold = getBotPersonality(player, content).economyReserve + (index ? 2 : 1);
    }
    const next = advanceMatchPhase(state, content);
    expect(next.players[0].inventory).toEqual([]);
    for (const player of next.players.slice(1)) {
      expect(player.inventory).toEqual(["black-blade-shard"]);
      expect(player.gold).toBe(getBotPersonality(player, content).economyReserve);
    }
    const gift = harbor(16); expect(harbor(16)).toEqual(gift);
    for (const offers of Object.values(gift.pendingHarborOffers)) expect(new Set(offers.map(offer => offer.itemId)).size).toBe(3);
  });

  it("round-trips in-flight choices exactly and does not inject choices into legacy preparation saves", () => {
    for (const state of [createVoyage("resume-start"), harbor(18)]) {
      const saved = createVoyageSaveEnvelope(state, state.seed, 10);
      expect(restoreVoyageState(saved)).toEqual(state);
      expect(restoreVoyageState({ ...saved, replayBattle: true })).toEqual(state);
    }
    const old = createMatch("legacy-prep"); old.round = 16;
    const { pendingHarborOffers: _h, pendingRecruitmentRoutes: _r, voyageChoiceHistory: _c, ...legacy } = old;
    expect([_h, _r, _c]).toBeTruthy();
    const restored = migrateMatchState({ ...legacy, contentVersion: "1.31.0" });
    expect(restored.phase).toBe("preparation"); expect(restored.players).toEqual(old.players);
    expect(restored.pendingHarborOffers).toEqual({}); expect(restored.voyageChoiceHistory).toEqual([]);
  });

  it("archives exact new-phase offers/receipts without changing the active voyage and validates legacy optional fields", () => {
    const start = createVoyage("archive-choices"); const before = serializeMatch(start);
    let replay = observeVoyage(newVoyageReplay(start, DEFAULT_CONTENT, "choice-record", 1), start, 1);
    expect(replay.fromStart).toBe(true); expect(serializeMatch(start)).toBe(before);
    expect(replayFrameState(replay, replay.frames[0], DEFAULT_CONTENT).pendingVoyageRecruitOffers).toEqual(start.pendingVoyageRecruitOffers);
    const next = advanceMatchPhase(start); replay = observeVoyage(replay, next, 2);
    expect(validateReplay(JSON.parse(JSON.stringify(replay)), DEFAULT_CONTENT)).toEqual(replay);
    const summary = summarizeVoyageChoices(replay.choiceHistory ?? [], { starter: 23, harbor: 0 });
    expect(summary.byKind.starter).toBe(8); expect(summary.goldSpent).toBe(8);
    expect(() => validateReplay({ ...replay, choiceHistory: [{ round: 1 }] }, DEFAULT_CONTENT)).toThrow();
  });
});
