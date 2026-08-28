import { describe, expect, it } from "vitest";
import { runProductionSoak } from "../scripts/run_production_soak";

function expectFiniteNonNegativeCounters(value: unknown): void {
  if (typeof value === "number") {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    return;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      expectFiniteNonNegativeCounters(nested);
    }
  }
}

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
    expect(Object.keys(report.characterPresence)).toHaveLength(30);
    expect(Object.keys(report.costBands)).toEqual(["1", "2", "3", "4", "5"]);
    expect(Object.keys(report.characterCombatExpression)).toHaveLength(30);
    expect(report.combatReadability.pvpBattleCount).toBeGreaterThan(0);
    expect(report.combatReadability.castsPerPvpBattle).toBeGreaterThanOrEqual(0);
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
    expect(Object.keys(report.traitReachability)).toHaveLength(13);
    expect(Object.keys(report.itemUsage)).toHaveLength(8);

    for (const character of Object.values(report.characterPresence)) {
      expect(character.winningBoards).toBeLessThanOrEqual(character.top4Boards);
      expect(character.top4Boards).toBeLessThanOrEqual(character.finalBoards);
      expect(character.top4Rate).toBeGreaterThanOrEqual(0);
      expect(character.top4Rate).toBeLessThanOrEqual(1);
      expect(character.winRate).toBeGreaterThanOrEqual(0);
      expect(character.winRate).toBeLessThanOrEqual(1);
      expect(character.winnerPresenceRate).toBeGreaterThanOrEqual(0);
      expect(character.winnerPresenceRate).toBeLessThanOrEqual(1);
      expect(character.finalBoardPresenceRate).toBeGreaterThanOrEqual(0);
      expect(character.finalBoardPresenceRate).toBeLessThanOrEqual(1);
      if (character.finalBoards > 0) {
        expect(Number.isFinite(character.averagePlacement)).toBe(true);
        expect(character.top4RateConfidence95).not.toBeNull();
        expect(character.winRateConfidence95).not.toBeNull();
      }
      for (const interval of [
        character.top4RateConfidence95,
        character.winRateConfidence95,
      ]) {
        if (!interval) continue;
        expect(interval.low).toBeGreaterThanOrEqual(0);
        expect(interval.high).toBeLessThanOrEqual(1);
        expect(interval.low).toBeLessThanOrEqual(interval.high);
      }
    }

    for (const band of Object.values(report.costBands)) {
      const members = band.unitIds.map((unitId) => report.characterPresence[unitId]);
      expect(band.unitCount).toBe(members.length);
      expect(band.finalBoards).toBe(
        members.reduce((total, character) => total + character.finalBoards, 0),
      );
      expect(band.top4Boards).toBe(
        members.reduce((total, character) => total + character.top4Boards, 0),
      );
      expect(band.winningBoards).toBe(
        members.reduce((total, character) => total + character.winningBoards, 0),
      );
    }

    for (const expression of Object.values(report.characterCombatExpression)) {
      expectFiniteNonNegativeCounters(expression);
    }
    expectFiniteNonNegativeCounters(report.combatReadability);

    expect(JSON.parse(JSON.stringify(report))).toEqual(report);

    const repeated = runProductionSoak(3);
    expect({ ...repeated, generatedAt: "deterministic" }).toEqual({
      ...report,
      generatedAt: "deterministic",
    });
  }, 30_000);
});
