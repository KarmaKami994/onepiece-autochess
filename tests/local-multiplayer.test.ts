import { describe, expect, it } from "vitest";
import { applyCommand, CONTENT, createMatch } from "../game";
import { selectMatchView } from "../app/selectors";
import { readMatchView, writeMatchView } from "../app/multiplayer/protocol";
import { applyLocalMatchCommand, createLocalMatch, expireLocalMatch, readLocalMatchCommand } from "../server/localMatch";

describe("MP1 local match coordination", () => {
  it("allocates two human seats and reuses the engine's deterministic initial shops", () => {
    const solo = createMatch("mp1");
    const local = createLocalMatch("mp1", 0);
    expect(local.state.players.map((player) => player.id))
      .toEqual(["player-1", "player-2", "bot-2", "bot-3", "bot-4", "bot-5", "bot-6", "bot-7"]);
    expect(local.state.players.filter((player) => !player.isBot).map((player) => player.personalityId))
      .toEqual([null, null]);
    expect(local.state.players.map((player) => player.shop)).toEqual(solo.players.map((player) => player.shop));
    expect(solo.players.filter((player) => !player.isBot).map((player) => player.id)).toEqual(["player-1"]);
    expect(applyCommand(solo, { type: "END_PREPARATION" }, { actorPlayerId: "player-1" }).state.phase).toBe("battle");
  });

  it("starts once on the second readiness or the server deadline", () => {
    const initial = createLocalMatch("mp1", 1_000);
    const first = applyLocalMatchCommand(initial, "player-1", { type: "END_PREPARATION" }, 2_000).match;
    expect(first.state.phase).toBe("preparation");
    expect(first.state.players[0].ready).toBe(true);
    expect(first.endsAt).toBe(initial.endsAt);
    expect(expireLocalMatch(first, first.endsAt - 1)).toBe(first);

    const bothReady = applyLocalMatchCommand(first, "player-2", { type: "END_PREPARATION" }, 3_000).match;
    expect(bothReady.state.phase).toBe("battle");
    expect(bothReady.state.lastResults).toHaveLength(8);
    expect(bothReady.endsAt).toBeGreaterThan(3_000);
    expect(applyLocalMatchCommand(bothReady, "player-2", { type: "END_PREPARATION" }, 3_001).match).toBe(bothReady);

    const atDeadline = applyLocalMatchCommand(first, "player-2", { type: "END_PREPARATION" }, first.endsAt);
    expect(atDeadline.error).toBeDefined();
    expect(atDeadline.match.state).toEqual(expireLocalMatch(first, first.endsAt).state);
    expect(expireLocalMatch(atDeadline.match, first.endsAt)).toBe(atDeadline.match);
    const complete = expireLocalMatch(atDeadline.match, atDeadline.match.endsAt);
    expect(complete.completed).toBe(true);
    expect(complete.state.round).toBe(2);
    expect(expireLocalMatch(complete, complete.endsAt + 100_000)).toBe(complete);
  });

  it("sends each seat its shop and leaves opposing reserves and inventory out of scouting", () => {
    const local = createLocalMatch("mp1", 0);
    const bought = applyLocalMatchCommand(local, "player-1", { type: "BUY_UNIT", shopIndex: 0 }, 1).match;
    const own = bought.state.players[0];
    const rival = bought.state.players[1];
    const unitId = own.bench[0];
    own.inventory.push(CONTENT.items[0].id);

    const clientView = (id: string) => readMatchView(writeMatchView(selectMatchView(bought.state, CONTENT, id)));
    const first = clientView(own.id);
    const second = clientView(rival.id);
    expect(first.shop[0]).toBeNull();
    expect(second.shop.map((unit) => unit?.id ?? null)).toEqual(rival.shop);
    expect(first.inventory.map((item) => item.contentId)).toContain(CONTENT.items[0].id);
    expect(first.boardUnits.some((unit) => unit.id === unitId)).toBe(true);
    const scouted = second.standings.find((standing) => standing.id === own.id);
    expect(scouted?.inventory).toEqual([]);
    expect(scouted?.boardUnits).toEqual([]);
    expect(scouted?.selectedDefinitionByUnit.size).toBe(0);
    const oppositeMove = applyLocalMatchCommand(bought, rival.id, {
      type: "MOVE_UNIT", unitId: unitId!, to: { zone: "board", x: 0, y: 5 },
    }, 2);
    expect(oppositeMove.match).toBe(bought);
    expect(oppositeMove.error).toBeDefined();
  });

  it("reads only allowed typed intents and ignores any client-supplied actor", () => {
    expect(readLocalMatchCommand({ type: "BUY_UNIT", shopIndex: 1, actorPlayerId: "player-2" }))
      .toEqual({ type: "BUY_UNIT", shopIndex: 1 });
    expect(readLocalMatchCommand({ type: "TIMER_EXPIRED" })).toBeNull();
    expect(readLocalMatchCommand({ type: "BUY_UNIT", shopIndex: 0.5 })).toBeNull();
    expect(readLocalMatchCommand({ type: "MOVE_UNIT", unitId: "unit-1", to: { zone: "board", x: 3 } })).toBeNull();
  });
});
