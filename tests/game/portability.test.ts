import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  applyCommand,
  canonicalStringify,
  createMatch,
  deserializeMatch,
  hashCanonicalValue,
  hashMatchState,
  scoreItemEffect,
  scoreItemForPlayer,
  serializeMatch,
  type GameCommand,
  type MatchState,
} from "../../game";

const PLAYER_CONTEXT = { actorPlayerId: "player-1" };

function runCommands(
  initial: MatchState,
  commands: GameCommand[],
): MatchState {
  return commands.reduce((state, command) => {
    const result = applyCommand(state, command, PLAYER_CONTEXT);
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
    return result.state;
  }, initial);
}

describe("portable deterministic domain contracts", () => {
  it("keeps every public command JSON-serializable and actor-free", () => {
    const commands: GameCommand[] = [
      { type: "BUY_UNIT", shopIndex: 0 },
      { type: "REROLL_SHOP" },
      { type: "TOGGLE_SHOP_LOCK" },
      { type: "BUY_XP" },
      { type: "MOVE_UNIT", unitId: "unit-1", to: { zone: "bench", slot: 0 } },
      { type: "SELL_UNIT", unitId: "unit-1" },
      { type: "EQUIP_ITEM", unitId: "unit-1", itemId: "black-blade" },
      { type: "END_PREPARATION" },
      { type: "CHOOSE_ITEM", choiceId: "black-blade" },
      { type: "CAROUSEL_SET_TARGET", x: 760, y: 420 },
      { type: "TIMER_EXPIRED" },
    ];

    expect(JSON.parse(JSON.stringify(commands))).toEqual(commands);
    expect(commands.every((command) => !("playerId" in command))).toBe(true);
    expect(() => canonicalStringify(commands)).not.toThrow();
  });

  it("derives authorization only from CommandContext", () => {
    const state = createMatch("trusted-actor");
    const human = state.players.find((player) => player.id === "player-1")!;
    const bot = state.players.find((player) => player.id === "bot-1")!;
    human.gold = 99;
    bot.gold = 99;
    const humanCount = Object.keys(human.units).length;
    const botCount = Object.keys(bot.units).length;

    const result = applyCommand(
      state,
      { type: "BUY_UNIT", shopIndex: 0 },
      { actorPlayerId: bot.id },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.state.players.find((player) => player.id === human.id)!.units))
      .toHaveLength(humanCount);
    expect(Object.keys(result.state.players.find((player) => player.id === bot.id)!.units))
      .toHaveLength(botCount + 1);
  });

  it("returns stable machine-readable rejection codes", () => {
    const state = createMatch("command-errors");
    state.phase = "battle";
    const result = applyCommand(state, { type: "END_PREPARATION" }, PLAYER_CONTEXT);
    expect(result).toMatchObject({ ok: false, error: { code: "WRONG_PHASE" } });
  });

  it("hashes canonical object order identically", () => {
    expect(hashCanonicalValue({ b: 2, a: { d: 4, c: 3 } })).toBe(
      hashCanonicalValue({ a: { c: 3, d: 4 }, b: 2 }),
    );
  });

  it("replays commands identically across a save boundary", () => {
    const commands: GameCommand[] = [
      { type: "TOGGLE_SHOP_LOCK" },
      { type: "BUY_XP" },
      { type: "END_PREPARATION" },
      { type: "TIMER_EXPIRED" },
    ];
    const first = runCommands(createMatch("command-replay"), commands);
    const second = runCommands(createMatch("command-replay"), commands);
    expect(hashMatchState(second)).toBe(hashMatchState(first));

    const halfway = runCommands(createMatch("command-replay"), commands.slice(0, 2));
    const restored = deserializeMatch(serializeMatch(halfway));
    const resumed = runCommands(restored, commands.slice(2));
    expect(hashMatchState(resumed)).toBe(hashMatchState(first));
  });

  it("uses one deterministic scoring source for effects and players", () => {
    const state = createMatch("shared-scoring");
    const player = state.players[0];
    expect(
      scoreItemEffect(
        { kind: "attack-flat", value: 12 },
        { hasTrait: () => false, hasRanged: false },
      ).score,
    ).toBe(12);
    expect(scoreItemForPlayer("black-blade", player, DEFAULT_CONTENT)).toBe(
      scoreItemForPlayer("black-blade", structuredClone(player), DEFAULT_CONTENT),
    );
  });
});
