import { describe, expect, it } from "vitest";
import { buildBattleOutcome } from "../components/battleOutcome";
import {
  createMatch,
  type BattleUnitSnapshot,
  type MatchBattleResult,
  type MatchState,
} from "../game";

function snapshot(
  id: string,
  definitionId: string,
  teamId: string,
  hp: number,
  maxHp: number,
  star: 1 | 2 | 3 = 1,
): BattleUnitSnapshot {
  return {
    id,
    definitionId,
    teamId,
    star,
    x: 0,
    y: 0,
    hp,
    maxHp,
    shield: 0,
    energy: 0,
    attack: 50,
    defense: 10,
    range: 1,
    state: hp > 0 ? "attack-recovery" : "dead",
  };
}

function installHumanCrew(state: MatchState): void {
  const human = state.players.find((player) => player.id === "player-1")!;
  human.units = {
    nami: {
      id: "nami",
      definitionId: "nami",
      star: 2,
      items: ["clima-tact", "unknown-keepsake"],
      acquiredOrder: 1,
    },
    chopper: {
      id: "chopper",
      definitionId: "chopper",
      star: 1,
      items: ["meat-platter"],
      acquiredOrder: 2,
    },
  };
  human.board = {
    "0,5": "nami",
    "1,5": "chopper",
  };
  human.bench = human.bench.map(() => null);
}

function result(
  overrides: Partial<MatchBattleResult> = {},
): MatchBattleResult {
  const initialUnits = [
    snapshot("player-1:nami", "nami", "player-1", 1_000, 1_000, 2),
    snapshot("player-1:chopper", "chopper", "player-1", 500, 500),
    snapshot("bot-1:rival", "tashigi", "bot-1", 800, 800),
  ];
  return {
    playerAId: "player-1",
    playerBId: "bot-1",
    ghostOfPlayerId: null,
    winnerId: "player-1",
    timedOut: false,
    playerADamage: 0,
    playerBDamage: 5,
    durationTicks: 20,
    events: [],
    initialUnits,
    finalUnits: [
      snapshot("player-1:nami", "nami", "player-1", 900, 1_000, 2),
      snapshot("player-1:chopper", "chopper", "player-1", 0, 500),
      snapshot("bot-1:rival", "tashigi", "bot-1", 0, 800),
    ],
    ...overrides,
  };
}

describe("battle outcome recap", () => {
  it("builds deterministic human-readable victory crew and trait rows", () => {
    const state = createMatch("outcome-victory");
    state.round = 5;
    state.stageId = "pvp-5";
    installHumanCrew(state);
    state.lastResults = [result()];

    const first = buildBattleOutcome({ state, playerId: "player-1" });
    const second = buildBattleOutcome({ state, playerId: "player-1" });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      outcome: "win",
      outcomeLabel: "VICTORY",
      opponentId: "bot-1",
      opponentName: "Rival 1",
      opponentKind: "player",
      captainDamage: 0,
      humanTeamHpPercent: 60,
      opponentTeamHpPercent: 0,
      survivorHpPercent: 60,
    });
    expect(first?.finalCrew).toMatchObject([
      {
        name: "Nami",
        star: 2,
        starsLabel: "★★",
        survived: true,
        hpPercent: 90,
        items: [
          { id: "clima-tact", name: "Clima-Tact" },
          { id: "unknown-keepsake", name: "unknown-keepsake" },
        ],
      },
      {
        name: "Chopper",
        star: 1,
        survived: false,
        hpPercent: 0,
        items: [{ id: "meat-platter", name: "Meat Platter" }],
      },
    ]);
    expect(first?.activeTraits).toContainEqual(
      expect.objectContaining({
        traitId: "straw-hat",
        name: "Straw Hat",
        count: 2,
        tierIndex: 0,
      }),
    );
  });

  it("reads loss damage and opponent from the player-B perspective", () => {
    const state = createMatch("outcome-player-b");
    installHumanCrew(state);
    const battle = result({
      playerAId: "bot-1",
      playerBId: "player-1",
      winnerId: "bot-1",
      playerADamage: 0,
      playerBDamage: 12,
      initialUnits: [
        snapshot("bot-1:rival", "tashigi", "bot-1", 800, 800),
        snapshot("player-1:nami", "nami", "player-1", 1_000, 1_000, 2),
      ],
      finalUnits: [
        snapshot("bot-1:rival", "tashigi", "bot-1", 400, 800),
        snapshot("player-1:nami", "nami", "player-1", 0, 1_000, 2),
      ],
    });

    expect(
      buildBattleOutcome({
        state,
        playerId: "player-1",
        result: battle,
      }),
    ).toMatchObject({
      outcome: "loss",
      outcomeLabel: "DEFEAT",
      opponentId: "bot-1",
      opponentName: "Rival 1",
      captainDamage: 12,
      humanTeamHpPercent: 0,
      opponentTeamHpPercent: 50,
      survivorHpPercent: 50,
    });
  });

  it("distinguishes a PvE draw from a zero-winner-id PvE loss", () => {
    const state = createMatch("outcome-pve");
    installHumanCrew(state);
    const pveUnits = [
      snapshot("player-1:nami", "nami", "player-1", 500, 1_000, 2),
      snapshot(
        "pve-1-player-1-0",
        "marine-recruit",
        "pve-1-player-1",
        150,
        300,
      ),
    ];
    const draw = result({
      playerBId: null,
      winnerId: null,
      playerADamage: 0,
      playerBDamage: 0,
      initialUnits: pveUnits,
      finalUnits: pveUnits,
    });
    const loss = { ...draw, playerADamage: 4 };

    expect(
      buildBattleOutcome({ state, playerId: "player-1", result: draw }),
    ).toMatchObject({
      outcome: "draw",
      opponentKind: "pve",
      opponentName: "East Blue Patrol",
      captainDamage: 0,
      survivorHpPercent: null,
    });
    expect(
      buildBattleOutcome({ state, playerId: "player-1", result: loss }),
    ).toMatchObject({
      outcome: "loss",
      opponentKind: "pve",
      captainDamage: 4,
      survivorHpPercent: 50,
    });
  });

  it("labels a ghost opponent without treating the battle as PvE", () => {
    const state = createMatch("outcome-ghost");
    installHumanCrew(state);
    const ghostBattle = result({
      playerBId: null,
      ghostOfPlayerId: "bot-2",
      winnerId: "player-1",
      finalUnits: [
        snapshot("player-1:nami", "nami", "player-1", 750, 1_000, 2),
        snapshot("ghost-bot-2:rival", "sanji", "ghost-bot-2", 0, 900),
      ],
    });

    expect(
      buildBattleOutcome({ state, playerId: "player-1", result: ghostBattle }),
    ).toMatchObject({
      outcome: "win",
      opponentKind: "ghost",
      opponentId: "bot-2",
      opponentName: "Rival 2's Ghost",
      humanTeamHpPercent: 75,
      opponentTeamHpPercent: 0,
    });
  });

  it("returns null when the player has no matching battle", () => {
    const state = createMatch("outcome-missing");
    state.lastResults = [];
    expect(
      buildBattleOutcome({ state, playerId: "player-1" }),
    ).toBeNull();
  });
});
