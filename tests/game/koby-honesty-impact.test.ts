import { describe, expect, it } from "vitest";
import {
  addUnitToPlayer, advanceMatchPhase, createMatch, DEFAULT_CONTENT, deserializeMatch, getKobyTrainingBattles,
  getStageDefinition, KOBY_HONESTY_IMPACT_FORM_ID, resolveUnitDefinition, serializeMatch, simulateBattle, type MatchState,
} from "../../game";

function fixture() {
  const state = createMatch("koby-training");
  for (const player of state.players) player.isBot = false;
  const player = state.players[0];
  const koby = addUnitToPlayer(state, player, "koby", DEFAULT_CONTENT);
  const reserve = addUnitToPlayer(state, player, "koby", DEFAULT_CONTENT);
  if (!koby || !reserve) throw new Error("Could not place Koby fixtures.");
  player.bench[player.bench.indexOf(koby.id)] = null;
  player.board["1,4"] = koby.id;
  return { state, playerId: player.id, kobyId: koby.id, reserveId: reserve.id };
}

function preparation(state: MatchState, round: number): MatchState {
  return { ...state, phase: "preparation", round, stageId: getStageDefinition(round).id };
}

describe("Koby — Honesty Impact", () => {
  it("counts four deployments, freezes the fourth battle as base Koby and starts the next battle in form", () => {
    const { state, playerId, kobyId, reserveId } = fixture();
    const player = state.players[0];
    const ally = addUnitToPlayer(state, player, "nami", DEFAULT_CONTENT);
    if (!ally) throw new Error("Could not fill the deployed crew.");
    player.bench[player.bench.indexOf(ally.id)] = null;
    player.board["2,4"] = ally.id;
    const opponent = state.players[1];
    const roundFour = { playerAId: playerId, playerBId: opponent.id, ghostOfPlayerId: null };
    let active = state;
    for (const round of [1, 2, 3, 4]) {
      const prior = preparation(active, round);
      if (round === 4) prior.pairings = [roundFour];
      active = advanceMatchPhase(prior);
      expect(active.players[0].units[kobyId].kobyTrainingBattles).toBe(round);
      expect(getKobyTrainingBattles(active.players[0].units[reserveId])).toBe(0);
      expect(active.lastResults.find((battle) => battle.playerAId === playerId)?.initialUnits
        .find((unit) => unit.id === `${playerId}:${kobyId}`)?.formId).toBeUndefined();
    }
    expect(active.players[0].units[kobyId].formId).toBe(KOBY_HONESTY_IMPACT_FORM_ID);
    const restored = deserializeMatch(serializeMatch(active));
    expect(restored.players[0].units[kobyId]).toEqual(active.players[0].units[kobyId]);
    expect(restored.lastResults).toEqual(active.lastResults);
    const next = advanceMatchPhase({ ...preparation(restored, 6), pairings: [roundFour] });
    expect(next.lastResults[0].initialUnits.find((unit) => unit.id === `${playerId}:${kobyId}`)?.formId)
      .toBe(KOBY_HONESTY_IMPACT_FORM_ID);
    expect(next.players[0].units[kobyId].kobyTrainingBattles).toBe(4);
  });

  it("credits the real captain against a ghost and keeps the copied lineup in its starting form", () => {
    const { state, playerId, kobyId } = fixture();
    const [owner, opponent, participant] = state.players;
    owner.units[kobyId].kobyTrainingBattles = 3;
    for (const eliminated of state.players.slice(3)) eliminated.alive = false;
    // Make the owner/opponent real pair and participant/owner ghost pair optimal.
    owner.lastOpponents = [participant.id];
    opponent.lastOpponents = [participant.id];
    participant.lastOpponents = [opponent.id];
    const secondKoby = addUnitToPlayer(state, participant, "koby", DEFAULT_CONTENT);
    if (!secondKoby) throw new Error("Missing the ghost opponent fixture.");
    participant.bench[participant.bench.indexOf(secondKoby.id)] = null;
    participant.board["2,4"] = secondKoby.id;
    const next = advanceMatchPhase(preparation(state, 6));
    const ghostBattle = next.lastResults.find(result => result.playerAId === participant.id);
    expect(ghostBattle).toMatchObject({ playerBId: null, ghostOfPlayerId: playerId });
    const ghost = ghostBattle?.initialUnits.find((unit) => unit.teamId === `ghost-${playerId}` && unit.definitionId === "koby");
    expect(ghost).toBeDefined();
    expect(ghost?.formId).toBeUndefined();
    expect(next.players[2].units[secondKoby.id].kobyTrainingBattles).toBe(1);
    expect(next.players[0].units[kobyId]).toMatchObject({ kobyTrainingBattles: 4, formId: KOBY_HONESTY_IMPACT_FORM_ID });
  });

  it("carries the highest training on a merge and keeps the same shop identity", () => {
    const { state, kobyId, reserveId } = fixture();
    const player = state.players[0];
    player.units[kobyId].kobyTrainingBattles = 2;
    player.units[reserveId].kobyTrainingBattles = 3;
    addUnitToPlayer(state, player, "koby", DEFAULT_CONTENT);
    expect(player.units[kobyId]).toMatchObject({ definitionId: "koby", star: 2, kobyTrainingBattles: 3 });
    expect(player.units[kobyId].formId).toBeUndefined();
    expect(resolveUnitDefinition("koby", KOBY_HONESTY_IMPACT_FORM_ID)).toMatchObject({
      id: "koby", cost: 1, traits: ["navy", "brawler"],
      ability: { id: "honesty-impact", power: 165, damageType: "physical", pattern: "adjacent" },
    });
  });

  it("damages the enemy cluster at close range without a lunge", () => {
    const content = structuredClone(DEFAULT_CONTENT);
    content.items.push({ id: "charged-fixture", name: "Charged", description: "Test energy", icon: "", kind: "component",
      effects: [{ kind: "starting-energy", value: 100 }] });
    const battle = simulateBattle({ id: "crew", units: [{
      id: "koby", definitionId: "koby", formId: KOBY_HONESTY_IMPACT_FORM_ID, position: { x: 1, y: 4 }, star: 1, items: ["charged-fixture"],
    }] }, { id: "rivals", units: [
      { id: "near", definitionId: "luffy", position: { x: 1, y: 3 }, star: 1, items: [] },
      { id: "flank", definitionId: "luffy", position: { x: 2, y: 3 }, star: 1, items: [] },
      { id: "far", definitionId: "luffy", position: { x: 5, y: 0 }, star: 1, items: [] },
    ] }, { seed: "honesty-impact", maxTicks: 1 }, content);
    expect(battle.events.find((event) => event.type === "cast" && event.sourceId === "koby"))
      .toMatchObject({ abilityId: "honesty-impact", targetIds: ["flank", "near"] });
    expect(battle.events.some((event) => event.type === "unit-displace" && event.sourceId === "koby")).toBe(false);
  });

  it("starts legacy save units without training progress at zero", () => {
    const { state, kobyId } = fixture();
    const restored = deserializeMatch(serializeMatch(state));
    expect(getKobyTrainingBattles(restored.players[0].units[kobyId])).toBe(0);
    expect(restored.players[0].units[kobyId].formId).toBeUndefined();
    expect(restored.schemaVersion).toBe(6);
  });
});
