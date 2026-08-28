import { describe, expect, it } from "vitest";
import {
  advanceMatchPhase,
  applyCommand,
  createMatch,
  type GameCommand,
  type MatchPhase,
  type MatchState,
  type PlayerState,
} from "../../game";

const context = { actorPlayerId: "player-1" } as const;

function player(state: MatchState): PlayerState {
  const found = state.players.find((candidate) => candidate.id === "player-1");
  if (!found) throw new Error("Missing test player");
  return found;
}

function run(state: MatchState, command: GameCommand): MatchState {
  const result = applyCommand(state, command, context);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function forceOffer(
  state: MatchState,
  definitionId: string,
  shopIndex = 0,
): void {
  const current = player(state).shop[shopIndex];
  if (current) state.pool[current] += 1;
  player(state).shop[shopIndex] = definitionId;
  state.pool[definitionId] -= 1;
}

function buy(state: MatchState, definitionId: string): MatchState {
  forceOffer(state, definitionId);
  return run(state, { type: "BUY_UNIT", shopIndex: 0 });
}

function createBattleState(seed = "combat-economy"): MatchState {
  let state = createMatch(seed);
  player(state).gold = 99;
  state = buy(state, "luffy");
  const luffyId = player(state).bench.find(
    (unitId): unitId is string => Boolean(unitId),
  );
  if (!luffyId) throw new Error("Missing deployed test unit");
  state = run(state, {
    type: "MOVE_UNIT",
    unitId: luffyId,
    to: { zone: "board", x: 0, y: 5 },
  });
  state = buy(state, "nami");
  state = buy(state, "usopp");
  state = buy(state, "robin");
  forceOffer(state, "chopper");
  state = run(state, { type: "END_PREPARATION" });
  expect(state.phase).toBe("battle");
  expect(state.lastResults.length).toBeGreaterThan(0);
  return state;
}

function expectFrozenBattle(
  state: MatchState,
  pairings: MatchState["pairings"],
  lastResults: MatchState["lastResults"],
): void {
  expect(state.pairings).toEqual(pairings);
  expect(state.lastResults).toEqual(lastResults);
}

describe("combat economy command policy", () => {
  it("allows economy and bench-only commands without changing the frozen fight", () => {
    let state = createBattleState();
    const pairings = structuredClone(state.pairings);
    const lastResults = structuredClone(state.lastResults);
    const startingGold = player(state).gold;
    const startingRng = state.rngState;

    state = run(state, { type: "BUY_UNIT", shopIndex: 0 });
    expect(player(state).shop[0]).toBeNull();
    expect(player(state).gold).toBe(startingGold - 1);
    expectFrozenBattle(state, pairings, lastResults);

    state = run(state, { type: "REROLL_SHOP" });
    expect(state.rngState).not.toBe(startingRng);
    expectFrozenBattle(state, pairings, lastResults);

    state = run(state, { type: "TOGGLE_SHOP_LOCK" });
    expect(player(state).shopLocked).toBe(true);
    expectFrozenBattle(state, pairings, lastResults);

    const levelBefore = player(state).level;
    state = run(state, { type: "BUY_XP" });
    expect(player(state)).toMatchObject({ level: levelBefore + 1, xp: 2 });
    expectFrozenBattle(state, pairings, lastResults);

    const namiId = Object.values(player(state).units).find(
      (unit) => unit.definitionId === "nami",
    )?.id;
    if (!namiId) throw new Error("Missing sell test unit");
    state = run(state, { type: "SELL_UNIT", unitId: namiId });
    expect(player(state).units[namiId]).toBeUndefined();
    expectFrozenBattle(state, pairings, lastResults);

    const usoppId = Object.values(player(state).units).find(
      (unit) => unit.definitionId === "usopp",
    )?.id;
    if (!usoppId) throw new Error("Missing move test unit");
    state = run(state, {
      type: "MOVE_UNIT",
      unitId: usoppId,
      to: { zone: "bench", slot: 7 },
    });
    expect(player(state).bench[7]).toBe(usoppId);
    expectFrozenBattle(state, pairings, lastResults);
  });

  it("rejects board mutation, item equip, and readiness during battle", () => {
    const state = createBattleState("combat-economy-rejections");
    const boardId = player(state).board["0,5"];
    const benchIds = player(state).bench.filter(
      (unitId): unitId is string => Boolean(unitId),
    );
    const [firstBenchId] = benchIds;
    if (!boardId || !firstBenchId) throw new Error("Missing command fixtures");

    const rejected: GameCommand[] = [
      { type: "SELL_UNIT", unitId: boardId },
      {
        type: "MOVE_UNIT",
        unitId: firstBenchId,
        to: { zone: "board", x: 1, y: 5 },
      },
      {
        type: "MOVE_UNIT",
        unitId: boardId,
        to: { zone: "bench", slot: 7 },
      },
      {
        type: "MOVE_UNIT",
        unitId: boardId,
        to: { zone: "board", x: 1, y: 5 },
      },
      { type: "EQUIP_ITEM", unitId: firstBenchId, itemId: "meat-platter" },
      { type: "END_PREPARATION" },
    ];

    for (const command of rejected) {
      const result = applyCommand(state, command, context);
      expect(result).toMatchObject({ ok: false, error: { code: "WRONG_PHASE" } });
      expect(result.state).toBe(state);
    }
  });

  it("keeps economy commands unavailable in other non-planning phases", () => {
    const commands: GameCommand[] = [
      { type: "BUY_UNIT", shopIndex: 0 },
      { type: "REROLL_SHOP" },
      { type: "TOGGLE_SHOP_LOCK" },
      { type: "BUY_XP" },
      { type: "SELL_UNIT", unitId: "missing" },
      {
        type: "MOVE_UNIT",
        unitId: "missing",
        to: { zone: "bench", slot: 0 },
      },
    ];
    for (const phase of ["item-choice", "carousel", "game-over"] as MatchPhase[]) {
      const state = createMatch(`combat-economy-${phase}`);
      state.phase = phase;
      for (const command of commands) {
        expect(applyCommand(state, command, context)).toMatchObject({
          ok: false,
          error: { code: "WRONG_PHASE" },
        });
      }
    }
  });

  it("keeps a purchase-triggered merge out of the current battle snapshot", () => {
    let state = createMatch("combat-economy-merge");
    player(state).gold = 99;
    state = buy(state, "luffy");
    const boardId = player(state).bench.find(
      (unitId): unitId is string => Boolean(unitId),
    );
    if (!boardId) throw new Error("Missing merge anchor");
    state = run(state, {
      type: "MOVE_UNIT",
      unitId: boardId,
      to: { zone: "board", x: 0, y: 5 },
    });
    state = buy(state, "luffy");
    forceOffer(state, "luffy");
    state = run(state, { type: "END_PREPARATION" });

    const frozenResults = structuredClone(state.lastResults);
    const initial = state.lastResults
      .find((result) => result.playerAId === "player-1")
      ?.initialUnits.find((unit) => unit.id === `player-1:${boardId}`);
    expect(initial?.star).toBe(1);

    state = run(state, { type: "BUY_UNIT", shopIndex: 0 });
    expect(player(state).units[boardId]?.star).toBe(2);
    expect(state.lastResults).toEqual(frozenResults);
    expect(
      state.lastResults
        .find((result) => result.playerAId === "player-1")
        ?.initialUnits.find((unit) => unit.id === `player-1:${boardId}`)?.star,
    ).toBe(1);
  });

  it("resolves the original result while retaining battle economy changes", () => {
    const battleStart = createBattleState("combat-economy-resolution");
    const baselineResolved = advanceMatchPhase(battleStart);
    const baselinePlayer = player(baselineResolved);
    let changed = run(battleStart, { type: "BUY_UNIT", shopIndex: 0 });
    changed = run(changed, { type: "TOGGLE_SHOP_LOCK" });
    changed = run(changed, { type: "BUY_XP" });
    const changedBeforeResolution = player(changed);
    const retainedUnitId = Object.values(changedBeforeResolution.units).find(
      (unit) => unit.definitionId === "chopper",
    )?.id;
    if (!retainedUnitId) throw new Error("Missing retained purchase");

    const resolved = advanceMatchPhase(changed);
    const resolvedPlayer = player(resolved);
    expect(resolvedPlayer.hp).toBe(baselinePlayer.hp);
    expect(resolvedPlayer.winStreak).toBe(baselinePlayer.winStreak);
    expect(resolvedPlayer.lossStreak).toBe(baselinePlayer.lossStreak);
    expect(resolvedPlayer.recentBattles).toEqual(baselinePlayer.recentBattles);
    expect(resolvedPlayer.units[retainedUnitId]).toBeDefined();
    expect(resolvedPlayer.xp).toBe(changedBeforeResolution.xp);
    expect(resolvedPlayer.shopLocked).toBe(true);
  });
});
