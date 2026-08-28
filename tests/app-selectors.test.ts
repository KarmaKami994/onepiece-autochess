import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createMatch,
  type BattleUnitSnapshot,
  type MatchState,
  type PlayerState,
} from "../game";
import { selectCarouselView, selectMatchView } from "../app/selectors";

function snapshot(
  id: string,
  definitionId: string,
  teamId: string,
): BattleUnitSnapshot {
  return {
    id,
    definitionId,
    teamId,
    star: 1,
    x: 1,
    y: 1,
    hp: 500,
    maxHp: 500,
    shield: 0,
    energy: 0,
    attack: 50,
    defense: 10,
    range: 1,
    state: "seek",
  };
}

function human(state: MatchState): PlayerState {
  const player = state.players.find((candidate) => candidate.id === "player-1");
  if (!player) throw new Error("Missing selector test player");
  return player;
}

function forceOffer(state: MatchState, definitionId: string, index = 0): void {
  const current = human(state).shop[index];
  if (current) state.pool[current] += 1;
  human(state).shop[index] = definitionId;
  state.pool[definitionId] -= 1;
}

function command(
  state: MatchState,
  value: Parameters<typeof applyCommand>[1],
): MatchState {
  const result = applyCommand(state, value, { actorPlayerId: "player-1" });
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

describe("typed application selectors", () => {
  it("builds the complete local UI view from canonical match state", () => {
    const state = createMatch("selector-initial");
    const view = selectMatchView(state);

    expect(view.playerId).toBe("player-1");
    expect(view.phase).toBe("preparation");
    expect(view.shop).toHaveLength(6);
    expect(view.standings).toHaveLength(8);
    expect(view.standings.filter((standing) => standing.isHuman)).toHaveLength(1);
    expect(view.carouselSession).toBeNull();
  });

  it("uses the shared local placeholder for expansion portraits and tokens", () => {
    const state = createMatch("selector-expansion-placeholder");
    const player = state.players.find((candidate) => candidate.id === "player-1")!;
    player.shop[0] = "koby";

    const view = selectMatchView(state);

    expect(view.shop[0]).toMatchObject({
      portrait: "/assets/characters/placeholder.svg",
      token: "/assets/characters/placeholder.svg",
    });
  });

  it("maps owned board and bench units without compatibility normalization", () => {
    const state = createMatch("selector-roster");
    const player = state.players.find((candidate) => candidate.id === "player-1")!;
    player.units["unit-a"] = {
      id: "unit-a",
      definitionId: "luffy",
      star: 2,
      items: ["meat-platter"],
      acquiredOrder: 1,
    };
    player.units["unit-b"] = {
      id: "unit-b",
      definitionId: "nami",
      star: 1,
      items: [],
      acquiredOrder: 2,
    };
    player.board["0,5"] = "unit-a";
    player.bench[0] = "unit-b";

    const view = selectMatchView(state);
    expect(view.boardUnits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "unit-a", zone: "board", x: 0, y: 5, star: 2 }),
        expect.objectContaining({ id: "unit-b", zone: "bench", slot: 0, star: 1 }),
      ]),
    );
    expect(view.selectedDefinitionByUnit.get("unit-a")?.name).toBe("Luffy");
    expect(view.itemsById.get("meat-platter")?.name).toBe("Meat Platter");
  });

  it("selects only Regatta data for fixed-step carousel refreshes", () => {
    const state = createMatch("selector-carousel");
    state.phase = "carousel";
    state.carouselChoices = [
      {
        id: "choice-1",
        itemId: "meat-platter",
        takenByPlayerId: null,
        orbitIndex: 0,
        claimedAtTick: null,
      },
    ];
    state.carouselSession = {
      tick: 12,
      durationTicks: 320,
      finishAtTick: null,
      arenaSeed: 7,
      participants: state.players.map((player, index) => ({
        playerId: player.id,
        rank: index + 1,
        spawnPosition: { x: index * 10, y: 0 },
        position: { x: index * 10, y: 0 },
        targetPosition: { x: index * 10, y: 0 },
        releaseTick: 0,
        reactionDelayTicks: 0,
        moving: false,
        claimedChoiceId: null,
      })),
      events: [],
    };

    const view = selectCarouselView(state);
    expect(view).toMatchObject({
      playerId: "player-1",
      phase: "carousel",
      round: 1,
      carouselSession: { tick: 12, durationTicks: 320 },
    });
    expect(view.choices[0]).toMatchObject({
      id: "choice-1",
      contentId: "meat-platter",
      orbitIndex: 0,
    });
  });

  it("maps sequential ability hits for presentation without replaying cast impact", () => {
    const state = createMatch("selector-ability-hit");
    state.phase = "battle";
    const initialUnits = [
      snapshot("zoro-source", "zoro", "player-1"),
      snapshot("actual-target", "chopper", "bot-1"),
    ];
    state.lastResults = [{
      playerAId: "player-1",
      playerBId: "bot-1",
      ghostOfPlayerId: null,
      winnerId: null,
      timedOut: false,
      playerADamage: 0,
      playerBDamage: 0,
      durationTicks: 1,
      events: [
        {
          type: "cast",
          tick: 1,
          sourceId: "zoro-source",
          abilityId: "oni-giri",
          targetIds: ["actual-target"],
        },
        {
          type: "ability-hit",
          tick: 1,
          sourceId: "zoro-source",
          targetId: "actual-target",
          abilityId: "oni-giri",
          hitIndex: 2,
          hitCount: 3,
          finisher: false,
        },
        {
          type: "damage",
          tick: 1,
          sourceId: "zoro-source",
          targetId: "actual-target",
          amount: 143,
          healthDamage: 143,
          shieldDamage: 0,
          damageKind: "ability",
        },
        {
          type: "death",
          tick: 1,
          unitId: "actual-target",
          sourceId: "zoro-source",
        },
      ],
      initialUnits,
      finalUnits: initialUnits,
    }];

    const view = selectMatchView(state);

    expect(view.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "cast",
          abilityId: "oni-giri",
          deferImpactToAbilityHits: true,
        }),
        expect.objectContaining({
          kind: "ability-hit",
          sourceId: "zoro-source",
          targetId: "actual-target",
          hitIndex: 2,
          hitCount: 3,
          finisher: false,
          presentationOffsetMs: 120,
        }),
        expect.objectContaining({
          kind: "damage",
          targetId: "actual-target",
          presentationOffsetMs: 120,
        }),
        expect.objectContaining({
          kind: "defeat",
          targetId: "actual-target",
          presentationOffsetMs: 120,
        }),
      ]),
    );
  });

  it("keeps current fighters snapshot-based while showing the live battle bench", () => {
    let state = createMatch("selector-battle-economy");
    human(state).gold = 99;
    forceOffer(state, "luffy");
    state = command(state, { type: "BUY_UNIT", shopIndex: 0 });
    const boardId = human(state).bench.find(
      (unitId): unitId is string => Boolean(unitId),
    );
    if (!boardId) throw new Error("Missing snapshot fighter");
    human(state).units[boardId].items = ["meat-platter"];
    state = command(state, {
      type: "MOVE_UNIT",
      unitId: boardId,
      to: { zone: "board", x: 0, y: 5 },
    });
    forceOffer(state, "luffy");
    state = command(state, { type: "BUY_UNIT", shopIndex: 0 });
    const benchLuffyId = human(state).bench.find(
      (unitId): unitId is string => Boolean(unitId),
    );
    if (!benchLuffyId) throw new Error("Missing merge copy");
    human(state).units[benchLuffyId].items = ["black-blade"];
    forceOffer(state, "luffy", 0);
    forceOffer(state, "nami", 1);
    state = command(state, { type: "END_PREPARATION" });
    state = command(state, { type: "BUY_UNIT", shopIndex: 0 });
    state = command(state, { type: "BUY_UNIT", shopIndex: 1 });

    expect(human(state).units[boardId]).toMatchObject({
      star: 2,
      items: ["meat-platter", "black-blade"],
    });
    const view = selectMatchView(state);
    const fighter = view.boardUnits.find(
      (unit) => unit.id === `player-1:${boardId}`,
    );
    expect(fighter).toMatchObject({
      contentId: "luffy",
      star: 1,
      items: ["meat-platter"],
      zone: "board",
    });
    expect(view.selectedDefinitionByUnit.get(fighter?.id ?? "")?.name).toBe("Luffy");
    expect(view.boardUnits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contentId: "nami",
          team: "player",
          zone: "bench",
        }),
      ]),
    );
  });
});
