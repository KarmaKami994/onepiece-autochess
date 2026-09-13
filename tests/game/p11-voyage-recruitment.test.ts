import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  advanceMatchPhase,
  applyCommand,
  cloneMatch,
  createMatch,
  deserializeMatch,
  getBotPersonality,
  getStageDefinition,
  prepareVoyageRecruitOffers,
  scoreBotUnit,
  resolveVoyageRecruit,
  serializeMatch,
  type MatchState,
} from "../../game";

function enterChoice(round: 10 | 20, seed = `p11-${round}`): MatchState {
  const state = createMatch(seed);
  state.round = round - 1;
  state.phase = "item-choice";
  return advanceMatchPhase(state);
}

function choose(state: MatchState, definitionId: string) {
  return applyCommand(state, { type: "CHOOSE_VOYAGE_RECRUIT", definitionId }, { actorPlayerId: "player-1" });
}

describe("P11 voyage recruitment", () => {
  it.each([10, 20] as const)("creates three distinct, deterministic cost-band offers at round %i", (round) => {
    const first = enterChoice(round);
    const second = enterChoice(round);
    const offers = first.pendingVoyageRecruitOffers["player-1"];
    expect(first.phase).toBe("voyage-choice");
    expect(first.stageId).toBe(getStageDefinition(round).id);
    expect(first.lastResults).toEqual([]);
    expect(first.pairings).toEqual([]);
    expect(first.pendingItemChoices).toEqual({});
    expect(offers).toHaveLength(3);
    expect(new Set(offers).size).toBe(3);
    expect(offers.every((id) => DEFAULT_CONTENT.units.find((unit) => unit.id === id)?.cost === (round === 10 ? 4 : 5))).toBe(true);
    expect(first.pendingVoyageRecruitOffers).toEqual(second.pendingVoyageRecruitOffers);
    expect(first.rngState).toBe(second.rngState);
    expect(first.players.every((player) => player.winStreak === 0 && player.lossStreak === 0 && player.recentBattles.length === 0)).toBe(true);
  });

  it("never starts combat if a voyage stage is loaded in preparation", () => {
    const state = createMatch("p11-preparation-guard");
    state.round = 10;
    state.stageId = getStageDefinition(10).id;
    const next = advanceMatchPhase(state);
    expect(next.phase).toBe("voyage-choice");
    expect(next.lastResults).toEqual([]);
    expect(next.pairings).toEqual([]);
  });

  it("prioritizes owned-crew traits and falls back only when the primary band is short", () => {
    const state = createMatch("p11-traits");
    state.round = 9;
    state.phase = "item-choice";
    const preferred = DEFAULT_CONTENT.units.find((unit) => unit.cost === 4);
    if (!preferred) throw new Error("Missing cost-4 unit");
    state.players[0].units["owned"] = {
      id: "owned", definitionId: preferred.id, star: 1, items: [], acquiredOrder: 0,
    };
    const choice = advanceMatchPhase(state);
    const first = DEFAULT_CONTENT.units.find((unit) => unit.id === choice.pendingVoyageRecruitOffers["player-1"][0]);
    expect(first?.traits.some((trait) => preferred.traits.includes(trait))).toBe(true);

    const scarce = createMatch("p11-fallback");
    scarce.round = 9;
    scarce.phase = "item-choice";
    const primary = DEFAULT_CONTENT.units.filter((unit) => unit.cost === 4);
    for (const unit of primary.slice(1)) scarce.pool[unit.id] = 0;
    const fallback = advanceMatchPhase(scarce);
    const costs = fallback.pendingVoyageRecruitOffers["player-1"].map((id) =>
      DEFAULT_CONTENT.units.find((unit) => unit.id === id)?.cost
    );
    expect(costs).toHaveLength(3);
    expect(costs).toContain(3);
    expect(costs.every((cost) => cost === 3 || cost === 4)).toBe(true);
    const scarceFive = createMatch("p11-fallback-five");
    scarceFive.round = 20;
    scarceFive.phase = "voyage-choice";
    for (const unit of DEFAULT_CONTENT.units.filter((unit) => unit.cost === 5).slice(1)) {
      scarceFive.pool[unit.id] = 0;
    }
    prepareVoyageRecruitOffers(scarceFive, DEFAULT_CONTENT);
    expect(scarceFive.pendingVoyageRecruitOffers["player-1"].map((id) =>
      DEFAULT_CONTENT.units.find((unit) => unit.id === id)?.cost
    )).toEqual(expect.arrayContaining([4, 4]));
  });

  it("reserves exactly one shared-pool copy per distinct offer for every living player", () => {
    const state = createMatch("p11-reservations");
    state.round = 10;
    state.phase = "voyage-choice";
    const original = { ...state.pool };
    prepareVoyageRecruitOffers(state, DEFAULT_CONTENT);
    const offered = Object.values(state.pendingVoyageRecruitOffers).flat();
    expect(Object.values(state.pendingVoyageRecruitOffers).every((offers) =>
      offers.length === 3 && new Set(offers).size === 3
    )).toBe(true);
    for (const id of new Set(offered)) {
      expect(state.pool[id]).toBe(original[id] - offered.filter((offer) => offer === id).length);
    }
    const snapshot = cloneMatch(state);
    prepareVoyageRecruitOffers(state, DEFAULT_CONTENT);
    expect(state).toEqual(snapshot);
  });

  it("reserves offered copies, returns unselected copies, and never decrements the selected copy again", () => {
    const choice = enterChoice(10, "p11-pool");
    const offers = choice.pendingVoyageRecruitOffers["player-1"];
    const beforePool = { ...choice.pool };
    const beforeGold = choice.players[0].gold;
    const invalid = choose(choice, "not-offered");
    expect(invalid).toMatchObject({ ok: false, error: { code: "INVALID_VOYAGE_RECRUIT" } });
    expect(invalid.state).toBe(choice);
    const resolved = cloneMatch(choice);
    expect(resolveVoyageRecruit(resolved, resolved.players[0], offers[0], DEFAULT_CONTENT)).toBe(true);
    expect(resolved.pool[offers[0]]).toBe(beforePool[offers[0]]);
    for (const id of offers.slice(1)) expect(resolved.pool[id]).toBe(beforePool[id] + 1);
    const result = choose(choice, offers[0]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.round).toBe(11);
    expect(result.state.phase).toBe("preparation");
    expect(result.state.pendingVoyageRecruitOffers).toEqual({});
    expect(result.state.players[0].gold).toBeGreaterThanOrEqual(beforeGold);
    expect(Object.values(result.state.players[0].units).some((unit) => unit.definitionId === offers[0])).toBe(true);
    // Round-11 shop rolls can reserve further copies; the recruited unit itself is not sold twice.
    expect(result.state.pool[offers[0]]).toBeLessThanOrEqual(beforePool[offers[0]]);
  });

  it("bots choose the highest existing score with stable ID tie-break", () => {
    const preview = createMatch("p11-bot");
    preview.round = 19;
    preview.phase = "item-choice";
    preview.players[1].isBot = false;
    const offers = advanceMatchPhase(preview);
    const bot = offers.players[1];
    const expected = [...offers.pendingVoyageRecruitOffers[bot.id]].sort((left, right) =>
      scoreBotUnit(right, bot, getBotPersonality(bot, DEFAULT_CONTENT), DEFAULT_CONTENT) -
        scoreBotUnit(left, bot, getBotPersonality(bot, DEFAULT_CONTENT), DEFAULT_CONTENT) ||
      left.localeCompare(right)
    )[0];
    const state = enterChoice(20, "p11-bot");
    expect(state.pendingVoyageRecruitOffers[bot.id]).toBeUndefined();
    expect(Object.values(state.players[1].units).map((unit) => unit.definitionId)).toContain(expected);
  });

  it("converts a full-bench recruit to its cost and returns the reserved copy", () => {
    const state = enterChoice(20, "p11-full-bench");
    const human = state.players[0];
    const offer = state.pendingVoyageRecruitOffers[human.id][0];
    human.bench = human.bench.map((_, index) => `occupied-${index}`);
    const gold = human.gold;
    const pool = state.pool[offer];
    const result = choose(state, offer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0].gold).toBeGreaterThanOrEqual(gold + 5);
    expect(Object.values(result.state.players[0].units).some((unit) => unit.definitionId === offer)).toBe(false);
    expect(result.state.pool[offer]).toBeGreaterThanOrEqual(pool);
  });

  it("allows a full-bench recruit when the new copy immediately combines", () => {
    const state = enterChoice(10, "p11-full-bench-combine");
    const human = state.players[0];
    const offer = state.pendingVoyageRecruitOffers[human.id][0];
    human.units["copy-a"] = { id: "copy-a", definitionId: offer, star: 1, items: [], acquiredOrder: 1 };
    human.units["copy-b"] = { id: "copy-b", definitionId: offer, star: 1, items: [], acquiredOrder: 2 };
    human.bench = human.bench.map((_, index) => index === 0 ? "copy-a" : index === 1 ? "copy-b" : `occupied-${index}`);
    const gold = human.gold;
    expect(resolveVoyageRecruit(state, human, offer, DEFAULT_CONTENT)).toBe(true);
    expect(Object.values(human.units).some((unit) => unit.definitionId === offer && unit.star === 2)).toBe(true);
    expect(human.gold).toBe(gold);
  });

  it("round-trips offers, reservations, and RNG; reconciles old schema-6 preparation and battle once", () => {
    const current = enterChoice(10, "p11-save");
    const restored = deserializeMatch(serializeMatch(current));
    expect(restored).toEqual(current);
    expect(restored.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    for (const round of [10, 20] as const) {
      for (const phase of ["preparation", "battle"] as const) {
        const old = createMatch(`p11-old-${round}-${phase}`);
        old.round = round;
        old.stageId = `pvp-${round}`;
        old.phase = phase;
        const gold = old.players.map((player) => player.gold);
        const raw = JSON.parse(serializeMatch(old)) as { match: Record<string, unknown> };
        delete raw.match.pendingVoyageRecruitOffers;
        const migrated = deserializeMatch(JSON.stringify(raw));
        expect(migrated.phase).toBe("voyage-choice");
        expect(migrated.stageId).toBe(getStageDefinition(round).id);
        expect(migrated.players.map((player) => player.gold)).toEqual(gold);
        expect(migrated.pendingVoyageRecruitOffers["player-1"]).toHaveLength(3);
        expect(deserializeMatch(serializeMatch(migrated))).toEqual(migrated);
      }
    }
  });
});
