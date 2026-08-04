import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CONTENT,
  simulateBattle,
  type BattleTeam,
  type GameContent,
} from "../../game";

function clonedContent(): GameContent {
  return JSON.parse(JSON.stringify(DEFAULT_CONTENT)) as GameContent;
}

function team(
  id: string,
  definitionId: string,
  x: number,
  y: number,
): BattleTeam {
  return {
    id,
    units: [
      {
        id: `${id}-unit`,
        definitionId,
        star: 1,
        items: [],
        position: { x, y },
      },
    ],
    activeTraits: [],
  };
}

describe("deterministic fixed-step combat", () => {
  it("produces an identical event log for the same seed", () => {
    const left = team("a", "luffy", 3, 5);
    const right = team("b", "zoro", 3, 0);
    const first = simulateBattle(left, right, { seed: "duel" });
    const second = simulateBattle(left, right, { seed: "duel" });
    expect(first).toEqual(second);
    expect(first.durationTicks).toBeLessThanOrEqual(450);
  });

  it("does not call Math.random", () => {
    const randomSpy = vi
      .spyOn(Math, "random")
      .mockImplementation(() => {
        throw new Error("global RNG used");
      });
    expect(() =>
      simulateBattle(
        team("a", "nami", 0, 5),
        team("b", "usopp", 0, 0),
        { seed: "engine-rng", maxTicks: 10 },
      ),
    ).not.toThrow();
    randomSpy.mockRestore();
  });

  it("resolves same-tick lethal attacks simultaneously", () => {
    const content = clonedContent();
    const tashigi = content.units.find((unit) => unit.id === "tashigi")!;
    tashigi.stats = {
      health: 100,
      attack: 10_000,
      defense: 0,
      range: 10,
      attackIntervalMs: 100,
      moveIntervalMs: 100,
    };
    const result = simulateBattle(
      team("a", "tashigi", 0, 5),
      team("b", "tashigi", 0, 0),
      { seed: "simultaneous", maxTicks: 2 },
      content,
    );
    expect(result.winner).toBe("draw");
    expect(
      result.events.filter((event) => event.type === "death"),
    ).toHaveLength(2);
  });

  it("terminates deterministically on the configured timeout", () => {
    const content = clonedContent();
    const chopper = content.units.find((unit) => unit.id === "chopper")!;
    chopper.stats.health = 100_000;
    chopper.stats.attack = 1;
    chopper.stats.range = 10;
    const result = simulateBattle(
      team("a", "chopper", 0, 5),
      team("b", "chopper", 0, 0),
      { seed: "timeout", maxTicks: 3 },
      content,
    );
    expect(result.timedOut).toBe(true);
    expect(result.durationTicks).toBe(3);
    expect(result.events.at(-1)).toMatchObject({
      type: "battle-end",
      timedOut: true,
    });
  });

  it("supports event-free headless simulations", () => {
    const result = simulateBattle(
      team("a", "garp", 0, 5),
      team("b", "mihawk", 0, 0),
      { seed: 42, recordEvents: false },
    );
    expect(result.events).toEqual([]);
    expect(result.finalUnits).toHaveLength(2);
  });
});
