import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createMatch,
  getStageDefinition,
  type BattleUnitSnapshot,
  type MatchBattleResult,
  type MatchState,
  type PlayerState,
} from "../game";
import {
  selectBattlePresentation,
  selectCarouselView,
  selectMatchView,
} from "../app/selectors";
import { preservesActiveBattleTimeline } from "../components/PhaserBoard";

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

function battleResult(
  playerAId: string,
  playerBId: string | null,
  initialUnits: BattleUnitSnapshot[],
  events: MatchBattleResult["events"] = [],
  ghostOfPlayerId: string | null = null,
): MatchBattleResult {
  return {
    playerAId,
    playerBId,
    ghostOfPlayerId,
    winnerId: null,
    timedOut: false,
    playerADamage: 0,
    playerBDamage: 0,
    durationTicks: 12,
    events,
    initialUnits,
    finalUnits: structuredClone(initialUnits),
  };
}

function spectatorBattleState(): MatchState {
  const state = createMatch("selector-spectating");
  state.phase = "battle";
  state.lastResults = [
    battleResult(
      "player-1",
      "bot-3",
      [
        { ...snapshot("player-1:human", "luffy", "player-1"), x: 0, y: 5 },
        { ...snapshot("bot-3:enemy", "nami", "bot-3"), x: 7, y: 0 },
      ],
      [{
        type: "attack",
        tick: 1,
        sourceId: "player-1:human",
        targetId: "bot-3:enemy",
        critical: false,
      }],
    ),
    battleResult(
      "bot-4",
      null,
      [
        { ...snapshot("bot-4:ghost-fighter", "zoro", "bot-4"), x: 0, y: 5 },
        { ...snapshot("ghost-bot-1:copy", "usopp", "ghost-bot-1"), x: 7, y: 0 },
      ],
      [],
      "bot-1",
    ),
    battleResult(
      "bot-1",
      "bot-2",
      [
        { ...snapshot("bot-1:fighter", "sanji", "bot-1"), x: 1, y: 4 },
        { ...snapshot("bot-2:fighter", "robin", "bot-2"), x: 6, y: 1 },
      ],
      [{
        type: "unit-move",
        tick: 1,
        unitId: "bot-2:fighter",
        from: { x: 6, y: 1 },
        to: { x: 5, y: 2 },
      }],
    ),
  ];
  return state;
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

  it("preserves both deployed fighter snapshots when a battle purchase merges them", () => {
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
    state = command(state, {
      type: "MOVE_UNIT",
      unitId: benchLuffyId,
      to: { zone: "board", x: 1, y: 5 },
    });
    forceOffer(state, "luffy", 0);
    forceOffer(state, "nami", 1);
    state = command(state, { type: "END_PREPARATION" });
    const combatStartView = selectMatchView(state);
    state = command(state, { type: "BUY_UNIT", shopIndex: 0 });
    state = command(state, { type: "BUY_UNIT", shopIndex: 1 });

    expect(human(state).units[boardId]).toMatchObject({
      star: 2,
      items: ["meat-platter", "black-blade"],
    });
    expect(human(state).units[benchLuffyId]).toBeUndefined();
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
    expect(view.boardUnits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `player-1:${benchLuffyId}`,
          contentId: "luffy",
          star: 1,
          items: ["black-blade"],
          zone: "board",
        }),
      ]),
    );
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

    const currentTimeline = {
      units: combatStartView.boardUnits,
      selectedId: null,
      interactionMode: "bench-only" as const,
      phase: "battle",
      capacity: combatStartView.capacity,
      boardSkin: "pirate-ship" as const,
    };
    const reconstructedTimeline = {
      ...currentTimeline,
      units: [...view.boardUnits].reverse(),
      capacity: view.capacity,
    };
    expect(
      currentTimeline.units
        .filter((unit) => unit.zone === "board")
        .map((unit) => unit.id),
    ).not.toEqual(
      reconstructedTimeline.units
        .filter((unit) => unit.zone === "board")
        .map((unit) => unit.id),
    );
    expect(
      preservesActiveBattleTimeline(currentTimeline, reconstructedTimeline),
    ).toBe(true);
  });
});

describe("battle presentation selection", () => {
  it("selects the local player's own immutable fight", () => {
    const state = spectatorBattleState();
    const presentation = selectBattlePresentation(state, "player-1");

    expect(presentation).toMatchObject({
      perspectivePlayerId: "player-1",
      perspectiveName: "You",
      opponentName: "Rival 3",
      isGhost: false,
    });
    expect(presentation?.boardUnits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "player-1:human", team: "player" }),
        expect.objectContaining({ id: "bot-3:enemy", team: "enemy" }),
      ]),
    );
    expect(presentation?.events).toEqual([
      expect.objectContaining({
        kind: "attack",
        sourceId: "player-1:human",
        targetId: "bot-3:enemy",
      }),
    ]);
  });

  it("selects another captain's own result instead of a separate ghost copy", () => {
    const presentation = selectBattlePresentation(
      spectatorBattleState(),
      "bot-1",
    );

    expect(presentation).toMatchObject({
      perspectivePlayerId: "bot-1",
      perspectiveName: "Rival 1",
      opponentName: "Rival 2",
      isGhost: false,
    });
    expect(presentation?.boardUnits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "bot-1:fighter", team: "player" }),
        expect.objectContaining({ id: "bot-2:fighter", team: "enemy" }),
      ]),
    );
    expect(
      presentation?.boardUnits.some((unit) => unit.id === "player-1:human"),
    ).toBe(false);
  });

  it("mirrors player-B board coordinates and combat events", () => {
    const presentation = selectBattlePresentation(
      spectatorBattleState(),
      "bot-2",
    );

    expect(presentation).toMatchObject({
      perspectivePlayerId: "bot-2",
      opponentName: "Rival 1",
    });
    expect(
      presentation?.boardUnits.find((unit) => unit.id === "bot-2:fighter"),
    ).toMatchObject({ team: "player", x: 1, y: 4 });
    expect(presentation?.events).toEqual([
      expect.objectContaining({
        kind: "move",
        sourceId: "bot-2:fighter",
        toX: 2,
        toY: 3,
      }),
    ]);
  });

  it("uses stable unique sequences and preserves only the same observed fight", () => {
    let state = spectatorBattleState();
    human(state).gold = 99;
    const own = selectBattlePresentation(state, "player-1");
    const botA = selectBattlePresentation(state, "bot-1");
    const botAAgain = selectBattlePresentation(state, "bot-1");
    const botB = selectBattlePresentation(state, "bot-2");
    const ghostFight = selectBattlePresentation(state, "bot-4");

    expect(botAAgain?.eventSequence).toBe(botA?.eventSequence);
    expect(ghostFight?.eventSequence).not.toBe(botA?.eventSequence);
    expect(botB?.eventSequence).not.toBe(botA?.eventSequence);
    expect(own?.eventSequence).not.toBe(botA?.eventSequence);

    state = command(state, { type: "REROLL_SHOP" });
    const afterLocalReroll = selectBattlePresentation(state, "bot-1");
    const currentTimeline = {
      units: botA?.boardUnits ?? [],
      selectedId: null,
      interactionMode: "none" as const,
      phase: "battle",
      capacity: 2,
      boardSkin: "pirate-ship" as const,
    };
    expect(afterLocalReroll?.eventSequence).toBe(botA?.eventSequence);
    expect(
      preservesActiveBattleTimeline(currentTimeline, {
        ...currentTimeline,
        units: afterLocalReroll?.boardUnits ?? [],
      }),
    ).toBe(true);
    expect(
      preservesActiveBattleTimeline(currentTimeline, {
        ...currentTimeline,
        units: ghostFight?.boardUnits ?? [],
      }),
    ).toBe(false);
  });

  it("selects another captain's PvE result and stage opponent", () => {
    const state = command(createMatch("selector-spectating-pve"), {
      type: "END_PREPARATION",
    });
    const presentation = selectBattlePresentation(state, "bot-1");
    const result = state.lastResults.find(
      (candidate) => candidate.playerAId === "bot-1",
    );
    const enemyIds = result?.initialUnits
      .filter((unit) => unit.teamId !== "bot-1")
      .map((unit) => unit.id) ?? [];

    expect(presentation?.opponentName).toBe(
      getStageDefinition(state.round).name,
    );
    expect(enemyIds.length).toBeGreaterThan(0);
    expect(
      presentation?.boardUnits.filter(
        (unit) => enemyIds.includes(unit.id) && unit.team === "enemy",
      ),
    ).toHaveLength(enemyIds.length);
  });

  it("labels an existing ghost opponent without making it selectable", () => {
    const presentation = selectBattlePresentation(
      spectatorBattleState(),
      "bot-4",
    );

    expect(presentation).toMatchObject({
      perspectivePlayerId: "bot-4",
      opponentName: "Ghost of Rival 1",
      isGhost: true,
    });
    expect(presentation?.boardUnits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "bot-4:ghost-fighter", team: "player" }),
        expect.objectContaining({ id: "ghost-bot-1:copy", team: "enemy" }),
      ]),
    );
  });
});
