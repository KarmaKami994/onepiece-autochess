import { describe, expect, it } from "vitest";
import {
  advanceMatchPhase,
  applyCommand,
  createMatch,
  deserializeMatch,
  serializeMatch,
  type BattleUnitSnapshot,
  type MatchState,
} from "../game";
import { selectMatchView } from "../app/selectors";

function finalBattle(humanWins: boolean, humanIsB = false): MatchState {
  const state = createMatch("results-lineup");
  state.round = 6;
  state.stageId = "pvp-6";
  state.phase = "battle";
  for (const player of state.players) {
    player.alive = player.id === "player-1" || player.id === "bot-1";
    player.units = {};
    player.board = {};
    player.bench.fill(null);
  }
  const human = state.players[0];
  human.level = 9;
  const ids = ["luffy", "zoro", "nami", "usopp", "sanji", "chopper", "robin", "franky", "brook"];
  const fighters: BattleUnitSnapshot[] = ids.map((definitionId, index) => {
    const formId = definitionId === "luffy" ? "luffy-gear-4-boundman"
      : definitionId === "robin" ? "robin-demonio-fleur" : undefined;
    const instance = {
      id: `crew-${index}`,
      definitionId,
      ...(formId ? { formId } : {}),
      star: formId ? 3 as const : 1 as const,
      items: index === 0 ? ["armament-wraps"] : [],
      acquiredOrder: index,
    };
    human.units[instance.id] = instance;
    const x = index % 8;
    const y = 4 + Math.floor(index / 8);
    human.board[`${x},${y}`] = instance.id;
    return {
      ...instance,
      id: `${human.id}:${instance.id}`,
      items: [...instance.items],
      teamId: human.id,
      x, y, hp: 100, maxHp: 100, shield: 0, energy: 0, maxEnergy: 100,
      attack: 10, defense: 5, range: 1, state: "seek",
    };
  });
  human.units.reserve = {
    id: "reserve", definitionId: "shanks", star: 2,
    items: ["sniper-goggles"], acquiredOrder: 10,
  };
  human.bench[0] = "reserve";
  const damageA = humanWins !== humanIsB ? 0 : 999;
  state.lastResults = [{
    playerAId: humanIsB ? "bot-1" : human.id,
    playerBId: humanIsB ? human.id : "bot-1",
    ghostOfPlayerId: null,
    winnerId: humanWins ? human.id : "bot-1",
    playerADamage: damageA,
    playerBDamage: damageA === 0 ? 999 : 0,
    timedOut: false, durationTicks: 1, events: [],
    initialUnits: fighters, finalUnits: structuredClone(fighters),
  }];
  return state;
}

describe("final deployed crew and reserve", () => {
  it.each([true, false])("captures a nine-unit lineup for a human winner=%s", (humanWins) => {
    const state = finalBattle(humanWins, !humanWins);
    const before = structuredClone(state);
    const owned = Object.values(state.players[0].units);
    const next = advanceMatchPhase(state);
    const human = next.players[0];
    expect(next.phase).toBe("game-over");
    expect(human.finalLineup?.deployed).toHaveLength(9);
    expect(human.finalLineup?.reserve).toEqual([before.players[0].units.reserve]);
    expect(human.finalCrew).toEqual(humanWins ? [] : owned);
    expect(state).toEqual(before);
    expect(next.rngState).toBe(state.rngState);
    expect(next.lastResults).toEqual(state.lastResults);
    const view = selectMatchView(next);
    expect(view.resultLineup?.deployed).toHaveLength(9);
    expect(view.resultLineup?.reserve).toHaveLength(1);
    expect(view.resultLineup?.deployed[8].name).toBe("Brook");
    expect(view.resultLineup?.deployed[0]).toMatchObject({
      name: "Luffy — Gear 4: Boundman", star: 3, items: ["armament-wraps"],
      portrait: "/assets/forms/luffy-gear-4-boundman/token.svg",
    });
    expect(view.resultLineup?.deployed[6].name).toBe("Robin — Demonio Fleur");
    expect(view.resultTraits.find((trait) => trait.id === "straw-hat")?.count).toBe(9);
    expect(view.resultTraits.some((trait) => trait.id === "emperor")).toBe(false);
  });

  it("preserves both frozen fighters through a battle-time merge and keeps reserve equipment detached", () => {
    const state = finalBattle(false);
    state.players[0].units["crew-3"].definitionId = "nami";
    state.lastResults[0].initialUnits[3].definitionId = "nami";
    state.players[0].gold = 100;
    state.players[0].shop[0] = "nami";
    const bought = applyCommand(state, { type: "BUY_UNIT", shopIndex: 0 }, { actorPlayerId: "player-1" });
    if (!bought.ok) throw new Error(bought.error.message);
    expect(bought.state.players[0].units["crew-3"]).toBeUndefined();
    const next = advanceMatchPhase(bought.state);
    const lineup = next.players[0].finalLineup!;
    expect(lineup.deployed[0]).toMatchObject({
      definitionId: "luffy", star: 3, formId: "luffy-gear-4-boundman", items: ["armament-wraps"],
    });
    expect(lineup.deployed.filter((unit) => unit.definitionId === "nami").map((unit) => unit.star)).toEqual([1, 1]);
    expect(next.players[0].finalCrew.filter((unit) => unit.definitionId === "nami").map((unit) => unit.star)).toEqual([2]);
    expect(lineup.reserve[0].items).toEqual(["sniper-goggles"]);
    lineup.deployed[0].items.push("test-only");
    lineup.reserve[0].items.push("test-only");
    expect(bought.state.players[0].units.reserve.items).toEqual(["sniper-goggles"]);
    expect(next.lastResults[0].initialUnits[0].items).toEqual(["armament-wraps"]);
    expect(next.players[0].finalCrew.find((unit) => unit.id === "reserve")?.items).toEqual(["sniper-goggles"]);
  });

  it("retains an eliminated lineup after later rounds replace the live battle logs", () => {
    const next = advanceMatchPhase(finalBattle(false));
    next.lastResults = [];
    next.round = 40;
    const restored = deserializeMatch(serializeMatch(next));
    expect(restored.schemaVersion).toBe(6);
    expect(restored.contentVersion).toBe("1.34.0");
    expect(restored.players[0].finalLineup).toEqual(next.players[0].finalLineup);
    expect(selectMatchView(restored).resultLineup?.deployed).toHaveLength(9);
  });

  it("does not invent a deployment for an old completed schema-6 save", () => {
    const next = advanceMatchPhase(finalBattle(false));
    delete next.players[0].finalLineup;
    const restored = deserializeMatch(serializeMatch(next));
    const view = selectMatchView(restored);
    expect(restored.players[0].finalLineup).toBeUndefined();
    expect(view.resultLineup).toBeNull();
    expect(view.resultCrew).toHaveLength(10);
    expect(view.resultTraits).toEqual([]);
    expect(restored.players[0].finalCrew).toEqual(next.players[0].finalCrew);
  });

  it("uses the unclassified fallback for legacy battle logs without frozen item arrays", () => {
    const state = finalBattle(false);
    delete state.lastResults[0].initialUnits[0].items;
    const next = advanceMatchPhase(state);
    expect(next.players[0].finalLineup).toBeUndefined();
    expect(selectMatchView(next).resultCrew).toHaveLength(10);
  });

  it("does not infer a deployment from an old winner's current board", () => {
    const next = advanceMatchPhase(finalBattle(true));
    delete next.players[0].finalLineup;
    const view = selectMatchView(deserializeMatch(serializeMatch(next)));
    expect(view.resultLineup).toBeNull();
    expect(view.resultCrew).toHaveLength(10);
  });
});
