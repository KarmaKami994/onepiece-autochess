import { describe, expect, it } from "vitest";
import {
  CAROUSEL_ARENA_HEIGHT,
  CAROUSEL_ARENA_WIDTH,
  CAROUSEL_BOAT_RADIUS,
  CAROUSEL_TICK_MS,
  advanceCarousel,
  advanceMatchPhase,
  applyCommand,
  createMatch,
  getCarouselChoicePosition,
  type MatchState,
  deserializeMatch,
  hashMatchState,
  serializeMatch,
} from "../../game";

const PLAYER_CONTEXT = { actorPlayerId: "player-1" };

function enterCarousel(round = 4, seed = "carousel-simulation"): MatchState {
  const state = createMatch(seed);
  state.round = round - 1;
  state.phase = "item-choice";
  state.pendingItemChoices = {};
  const carousel = advanceMatchPhase(state);
  expect(carousel.round).toBe(round);
  expect(carousel.phase).toBe("carousel");
  expect(carousel.carouselSession).not.toBeNull();
  return carousel;
}

describe("deterministic bounty regatta", () => {
  it("uses structural sharing for movement-only ticks", () => {
    const state = enterCarousel(4, "carousel-sharing");
    const next = advanceCarousel(state, 1);

    expect(next).not.toBe(state);
    expect(next.players).toBe(state.players);
    expect(next.pool).toBe(state.pool);
    expect(next.pairings).toBe(state.pairings);
    expect(next.lastResults).toBe(state.lastResults);
    expect(state.carouselSession?.tick).toBe(0);
    expect(next.carouselSession?.tick).toBe(1);
  });

  it("replays steering and fixed ticks across a carousel checkpoint", () => {
    const runToCheckpoint = () => {
      let state = enterCarousel(4, "carousel-replay");
      const releaseTick = state.carouselSession!.participants.find(
        (participant) => participant.playerId === "player-1",
      )!.releaseTick;
      state = advanceCarousel(state, releaseTick);
      const target = applyCommand(
        state,
        { type: "CAROUSEL_SET_TARGET", x: 760, y: 420 },
        PLAYER_CONTEXT,
      );
      if (!target.ok) throw new Error(target.error.message);
      return advanceCarousel(target.state, 13);
    };

    const first = advanceCarousel(runToCheckpoint(), 21);
    const second = advanceCarousel(runToCheckpoint(), 21);
    expect(hashMatchState(second)).toBe(hashMatchState(first));

    const restored = deserializeMatch(serializeMatch(runToCheckpoint()));
    expect(hashMatchState(advanceCarousel(restored, 21))).toBe(
      hashMatchState(first),
    );
  });

  it("creates five to nine seeded offers with no more than two duplicates", () => {
    const full = enterCarousel(4, "full-regatta");
    expect(full.carouselChoices).toHaveLength(9);
    expect(full.carouselChoices.map((choice) => choice.orbitIndex)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    const counts = Object.values(
      full.carouselChoices.reduce<Record<string, number>>((totals, choice) => {
        totals[choice.itemId] = (totals[choice.itemId] ?? 0) + 1;
        return totals;
      }, {}),
    );
    expect(Math.max(...counts)).toBeLessThanOrEqual(2);

    const reduced = createMatch("reduced-regatta");
    for (const player of reduced.players.slice(4)) {
      player.alive = false;
    }
    reduced.round = 3;
    reduced.phase = "item-choice";
    reduced.pendingItemChoices = {};
    const fourPlayerCarousel = advanceMatchPhase(reduced);
    expect(fourPlayerCarousel.carouselChoices).toHaveLength(7);
    expect(fourPlayerCarousel.carouselSession?.participants).toHaveLength(4);

    expect(enterCarousel(4, "full-regatta")).toEqual(full);
  });

  it("uses round and health rank release rules with deterministic bot delays", () => {
    const state = createMatch("ranked-release");
    state.players.forEach((player, index) => {
      player.hp = 10 + index * 10;
      player.level = 2 + (index % 3);
    });
    state.round = 11;
    state.phase = "item-choice";
    state.pendingItemChoices = {};

    const carousel = advanceMatchPhase(state);
    const session = carousel.carouselSession!;
    const human = session.participants.find(
      (participant) => participant.playerId === "player-1",
    )!;
    expect(human.rank).toBe(8);
    expect(human.releaseTick).toBe(5_000 / CAROUSEL_TICK_MS);

    for (const participant of session.participants) {
      const expectedBase =
        5_000 / CAROUSEL_TICK_MS +
        (session.participants.length - participant.rank) *
          (2_000 / CAROUSEL_TICK_MS);
      expect(participant.releaseTick).toBe(
        expectedBase + participant.reactionDelayTicks,
      );
      if (participant.playerId !== "player-1") {
        expect(participant.reactionDelayTicks).toBeGreaterThanOrEqual(
          1_000 / CAROUSEL_TICK_MS,
        );
        expect(participant.reactionDelayTicks).toBeLessThanOrEqual(
          6_000 / CAROUSEL_TICK_MS,
        );
      }
    }
    const repeat = advanceMatchPhase(structuredClone(state));
    expect(repeat).toEqual(carousel);
  });

  it("rejects steering while locked, clamps targets, and moves at constant speed", () => {
    let state = enterCarousel(4, "human-steering");
    const locked = applyCommand(state, {
      type: "CAROUSEL_SET_TARGET",
      x: 0,
      y: 0,
    }, PLAYER_CONTEXT);
    expect(locked).toMatchObject({
      ok: false,
      error: { code: "CAROUSEL_LOCKED" },
    });

    const releaseTick = state.carouselSession!.participants.find(
      (participant) => participant.playerId === "player-1",
    )!.releaseTick;
    state = advanceCarousel(state, releaseTick);
    const before = state.carouselSession!.participants.find(
      (participant) => participant.playerId === "player-1",
    )!;
    const command = applyCommand(state, {
      type: "CAROUSEL_SET_TARGET",
      x: CAROUSEL_ARENA_WIDTH * 2,
      y: -CAROUSEL_ARENA_HEIGHT,
    }, PLAYER_CONTEXT);
    if (!command.ok) throw new Error(command.error.message);
    const targeted = command.state.carouselSession!.participants.find(
      (participant) => participant.playerId === "player-1",
    )!;
    expect(targeted.targetPosition).toEqual({
      x: CAROUSEL_ARENA_WIDTH - CAROUSEL_BOAT_RADIUS,
      y: CAROUSEL_BOAT_RADIUS,
    });

    const moved = advanceCarousel(command.state);
    const after = moved.carouselSession!.participants.find(
      (participant) => participant.playerId === "player-1",
    )!;
    expect(
      Math.hypot(
        after.position.x - before.position.x,
        after.position.y - before.position.y,
      ),
    ).toBeCloseTo(8, 3);
    expect(moved.carouselSession!.events).toContainEqual(
      expect.objectContaining({ type: "move", playerId: "player-1" }),
    );
  });

  it("rotates bounties and resolves boat overlaps in stable player order", () => {
    const state = enterCarousel(4, "collision-order");
    const choice = state.carouselChoices[0];
    expect(getCarouselChoicePosition(state, choice, 0)).not.toEqual(
      getCarouselChoicePosition(state, choice, 1),
    );
    const session = state.carouselSession!;
    const [left, right] = session.participants;
    left.releaseTick = 0;
    right.releaseTick = 0;
    left.position = { x: 100, y: 100 };
    right.position = { x: 100, y: 100 };
    left.targetPosition = { x: 100, y: 100 };
    right.targetPosition = { x: 100, y: 100 };

    const first = advanceCarousel(state);
    const second = advanceCarousel(structuredClone(state));
    expect(second).toEqual(first);
    const resolved = first.carouselSession!.participants
      .filter((participant) =>
        [left.playerId, right.playerId].includes(participant.playerId),
      )
      .sort((a, b) => a.playerId.localeCompare(b.playerId));
    expect(
      Math.hypot(
        resolved[0].position.x - resolved[1].position.x,
        resolved[0].position.y - resolved[1].position.y,
      ),
    ).toBeGreaterThanOrEqual(CAROUSEL_BOAT_RADIUS * 2 - 0.01);
    expect(first.carouselSession!.events).toContainEqual(
      expect.objectContaining({ type: "collision" }),
    );
  });

  it("converges dense boat piles without changing deterministic order", () => {
    const state = enterCarousel(4, "dense-collision-pile");
    for (const participant of state.carouselSession!.participants) {
      participant.releaseTick = 0;
      participant.position = { x: 180, y: 180 };
      participant.targetPosition = { x: 180, y: 180 };
    }
    const resolved = advanceCarousel(state);
    const positions = resolved.carouselSession!.participants.map(
      (participant) => participant.position,
    );
    for (let left = 0; left < positions.length; left += 1) {
      for (let right = left + 1; right < positions.length; right += 1) {
        expect(
          Math.hypot(
            positions[left].x - positions[right].x,
            positions[left].y - positions[right].y,
          ),
        ).toBeGreaterThanOrEqual(CAROUSEL_BOAT_RADIUS * 2 - 0.01);
      }
    }
    expect(advanceCarousel(structuredClone(state))).toEqual(resolved);
  });

  it("produces the same canonical state regardless of tick batching", () => {
    const state = enterCarousel(4, "tick-batching");
    const batched = advanceCarousel(state, 180);
    let stepped = state;
    for (let tick = 0; tick < 180; tick += 1) {
      stepped = advanceCarousel(stepped);
    }
    expect(stepped).toEqual(batched);
    expect(
      new Set(batched.carouselSession!.events.map((event) => event.id)).size,
    ).toBe(batched.carouselSession!.events.length);
  });

  it("awards a bounty only through collision and records the claim", () => {
    const state = enterCarousel(4, "collision-claim");
    const session = state.carouselSession!;
    const human = session.participants.find(
      (participant) => participant.playerId === "player-1",
    )!;
    const choice = state.carouselChoices[0];
    human.releaseTick = 0;
    human.position = getCarouselChoicePosition(state, choice, 1);
    human.targetPosition = { ...human.position };
    const inventoryBefore = state.players[0].inventory.length;

    const claimed = advanceCarousel(state);
    const claimedHuman = claimed.carouselSession!.participants.find(
      (participant) => participant.playerId === "player-1",
    )!;
    expect(claimedHuman.claimedChoiceId).toBe(choice.id);
    expect(claimed.carouselChoices[0]).toMatchObject({
      takenByPlayerId: "player-1",
      claimedAtTick: 1,
    });
    expect(claimed.players[0].inventory).toHaveLength(inventoryBefore + 1);
    expect(claimed.carouselSession!.events).toContainEqual(
      expect.objectContaining({
        type: "claim",
        tick: 1,
        playerId: "player-1",
        choiceId: choice.id,
        itemId: choice.itemId,
      }),
    );
  });

  it("uses best-fit timeout rewards and completes after the pickup hold", () => {
    const state = enterCarousel(4, "timeout-best-fit");
    const originalInventories = state.players.map((player) => player.inventory);
    const headless = advanceMatchPhase(state);
    const expectedHumanItem = headless.players[0].inventory.at(-1);

    expect(headless.players).not.toBe(state.players);
    expect(headless.pool).toBe(state.pool);
    expect(state.players.map((player) => player.inventory)).toEqual(
      originalInventories,
    );

    state.carouselSession!.tick = state.carouselSession!.durationTicks - 1;
    const timedOut = advanceCarousel(state);
    expect(timedOut.phase).toBe("carousel");
    expect(timedOut.players[0].inventory.at(-1)).toBe(expectedHumanItem);
    expect(
      timedOut.carouselSession!.participants.every(
        (participant) => participant.claimedChoiceId !== null,
      ),
    ).toBe(true);
    expect(timedOut.carouselSession!.events).toContainEqual(
      expect.objectContaining({ type: "timeout" }),
    );
    const completed = advanceCarousel(timedOut, 800 / CAROUSEL_TICK_MS);
    expect(completed.phase).toBe("preparation");
    expect(completed.carouselSession).toBeNull();
    expect(completed.carouselChoices).toEqual([]);
  });
});
