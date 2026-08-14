import { describe, expect, it } from "vitest";
import { runProductionSoak } from "../scripts/run_production_soak";

describe("production configuration audit", () => {
  it("completes unmodified production matches and returns bounded metrics", () => {
    const report = runProductionSoak(3);

    expect(report.completeMatches).toBe(3);
    expect(report.crashes).toBe(0);
    expect(report.minRounds).toBeGreaterThanOrEqual(1);
    expect(report.maxRounds).toBeLessThan(200);
    expect(report.battleCount).toBeGreaterThan(0);
    expect(report.timeoutRate).toBeGreaterThanOrEqual(0);
    expect(report.timeoutRate).toBeLessThanOrEqual(1);
    expect(report.drawRate).toBeGreaterThanOrEqual(0);
    expect(report.drawRate).toBeLessThanOrEqual(1);
    expect(Object.keys(report.characterPresence)).toHaveLength(18);
    expect(
      Object.values(report.characterPresence).reduce(
        (total, character) => total + character.winningBoards,
        0,
      ),
    ).toBeLessThanOrEqual(report.seeds * 9);
    expect(
      Math.max(
        ...Object.values(report.characterPresence).map(
          (character) => character.winningBoards,
        ),
      ),
    ).toBeLessThanOrEqual(report.seeds);
    expect(
      Object.values(report.characterPresence).reduce(
        (total, character) => total + character.finalBoards,
        0,
      ),
    ).toBeLessThanOrEqual(report.seeds * 8 * 9);
    expect(Object.keys(report.traitReachability)).toHaveLength(12);
    expect(Object.keys(report.itemUsage)).toHaveLength(8);

    const repeated = runProductionSoak(3);
    expect({ ...repeated, generatedAt: "deterministic" }).toEqual({
      ...report,
      generatedAt: "deterministic",
    });
  }, 30_000);
});
