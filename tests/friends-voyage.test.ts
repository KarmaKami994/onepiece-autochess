import { describe, expect, it } from "vitest";
import { applyRegattaFrame } from "../app/multiplayer/protocol";
import { advanceMatchPhase, CAROUSEL_TICK_MS, createMatch, getCarouselChoicePosition, type MatchPhase } from "../game";
import { applyFriendsCommand, createFriendsVoyage, friendsRegattaFrame, friendsVoyageSnapshot, readFriendsCommand, tickFriendsVoyage } from "../server/friendsVoyage";

describe("MP3 friends voyage", () => {
  it.each([2, 8])("keeps eight total seats when %i human captains start", (humanCount) => {
    const captains = Array.from({ length: humanCount }, (_, index) => "Captain " + (index + 1));
    const { state } = createFriendsVoyage("friends-seat-count", 0, captains);
    expect(state.players).toHaveLength(8);
    expect(state.players.filter((player) => !player.isBot).map((player) => player.name)).toEqual(captains);
    expect(state.players.filter((player) => player.isBot)).toHaveLength(8 - humanCount);
  });

  it("waits for both starters or the deadline and rejects commands from the previous phase", () => {
    const initial = createFriendsVoyage("mp3-starter", 1_000, ["Mara", "Taro"]);
    expect(initial.state.phase).toBe("starter-choice");
    expect(initial.state.players.filter((player) => !player.isBot).map((player) => player.name)).toEqual(["Mara", "Taro"]);
    const skip = { round: 1, phase: "starter-choice", command: { type: "CHOOSE_STARTER_RECRUIT", definitionId: null } } as const;
    const host = applyFriendsCommand(initial, "player-1", skip, 1_010).voyage;
    expect(host.state.phase).toBe("starter-choice");
    expect(Object.keys(host.state.pendingVoyageRecruitOffers)).toEqual(["player-2"]);
    const timeout = host.startedAt + host.durationMs;
    const late = applyFriendsCommand(host, "player-2", skip, timeout);
    expect(late.error).toBe("That round or phase has ended.");
    expect(late.voyage.state.phase).toBe("preparation");
    expect(late.voyage.state.pendingVoyageRecruitOffers).toEqual({});
    expect(late.voyage.state.voyageChoiceHistory.filter((receipt) => receipt.playerId === "player-2")).toHaveLength(1);
    expect(friendsVoyageSnapshot(late.voyage, 2, timeout)).toMatchObject({ status: "playing", view: { playerId: "player-2" } });
  });

  it("uses the active battle economy without replacing either captain's resolved fight", () => {
    const initial = createFriendsVoyage("mp3-battle", 0, ["Mara", "Taro"]);
    const prep = tickFriendsVoyage(initial, initial.durationMs);
    const battle = tickFriendsVoyage(prep, prep.startedAt + prep.durationMs);
    expect(battle.state.phase).toBe("battle");
    const stale = applyFriendsCommand(battle, "player-2", {
      round: 1, phase: "preparation", command: { type: "BUY_UNIT", shopIndex: 0 },
    }, battle.startedAt + 1);
    expect(stale).toEqual({ voyage: battle, error: "That round or phase has ended." });
    const buy = applyFriendsCommand(battle, "player-2", {
      round: 1, phase: "battle", command: { type: "BUY_UNIT", shopIndex: 0 },
    }, battle.startedAt + 1);
    expect(buy.error).toBeUndefined();
    expect(buy.voyage.state.players[1].shop[0]).toBeNull();
    expect(buy.voyage.state.players[0].shop).toEqual(battle.state.players[0].shop);
    expect(buy.voyage.state.lastResults).toEqual(battle.state.lastResults);
    expect(buy.voyage.startedAt).toBe(battle.startedAt);
    expect(readFriendsCommand({ round: 1, phase: "battle", command: { type: "TIMER_EXPIRED" } })).toBeNull();
  });

  it("awards a contested regatta bounty once and sends a seat-neutral frame", () => {
    const before = createMatch("mp3-regatta", undefined, 2);
    before.round = 3;
    before.phase = "item-choice";
    const state = advanceMatchPhase(before);
    const session = state.carouselSession;
    if (!session) throw new Error("The round-4 fixture did not enter the regatta.");
    const choice = state.carouselChoices[0];
    const target = getCarouselChoicePosition(state, choice, 1);
    for (const boat of session.participants) {
      if (!["player-1", "player-2"].includes(boat.playerId)) continue;
      boat.releaseTick = 0;
      boat.position = { ...target };
      boat.targetPosition = { ...target };
    }
    const start = { state, startedAt: 0, durationMs: 0 };
    const after = tickFriendsVoyage(start, CAROUSEL_TICK_MS);
    const frame = friendsRegattaFrame(start, after);
    if (!frame) throw new Error("Missing incremental regatta frame.");
    expect(frame.events.filter((event) => event.type === "claim" && event.choiceId === choice.id)).toHaveLength(1);
    expect(frame.claims.find((claim) => claim.id === choice.id)?.takenByPlayerId).toMatch(/^player-[12]$/);
    const mate = applyRegattaFrame(friendsVoyageSnapshot(start, 2, 0), frame);
    expect(mate).toMatchObject({ status: "playing", view: { playerId: "player-2", carouselSession: { tick: 1 } } });
    if (mate?.status !== "playing") throw new Error("Missing second captain's regatta view.");
    expect(mate.view.carouselSession?.participants.find((boat) => boat.playerId === "player-2")?.paletteIndex).toBe(0);
    expect(applyRegattaFrame(mate, { ...frame, round: 1 })).toBe(mate);
  });

  it("uses ordinary deadlines to advance an unattended voyage to placements", () => {
    let voyage = createFriendsVoyage("mp3-full-voyage", 0, ["Mara", "Taro"]);
    const phases = new Set<MatchPhase>();
    for (let step = 0; step < 240 && voyage.state.phase !== "game-over"; step += 1) {
      phases.add(voyage.state.phase);
      voyage = tickFriendsVoyage(voyage, voyage.startedAt + Math.max(voyage.durationMs, 90_000));
    }
    expect([...phases]).toEqual(expect.arrayContaining(["starter-choice", "preparation", "battle", "carousel", "item-choice"]));
    expect(voyage.state.phase).toBe("game-over");
    expect(voyage.state.players.slice(0, 2).map((player) => player.isBot)).toEqual([false, false]);
    expect(friendsVoyageSnapshot(voyage, 2, voyage.startedAt)).toMatchObject({
      status: "playing", view: { phase: "game-over", playerId: "player-2", placement: expect.any(Number) },
    });
  }, 15_000);
});
