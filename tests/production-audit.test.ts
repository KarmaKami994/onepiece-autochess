import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT } from "../game";
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
    expect(Object.keys(report.shopPoolAvailability.byCost)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(Object.keys(report.characterCombatExpression)).toHaveLength(30);
    expect(report.combatReadability.pvpBattleCount).toBeGreaterThan(0);
    expect(report.combatReadability.castsPerPvpBattle).toBeGreaterThanOrEqual(0);
    expect(report.traitPlayerBattleBoards).toBeGreaterThan(0);
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
    expect(Object.keys(report.traitTierReachability)).toHaveLength(13);
    expect(report.traitTierReachability.emperor).toMatchObject([
      { tier: 1, required: 1 },
      { tier: 2, required: 2 },
    ]);
    expect(Object.keys(report.traitCombinations)).toEqual([
      "emperor+captain",
    ]);
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
      expect(band.finalBoardRepresentationRate).toBeGreaterThanOrEqual(0);
      expect(band.finalBoardRepresentationRate).toBeLessThanOrEqual(1);
      expect(band.finalBoardPlayerPresence).toBeLessThanOrEqual(
        report.completeMatches * 8,
      );
      expect(band.finalBoardPlayerPresenceRate).toBeGreaterThanOrEqual(0);
      expect(band.finalBoardPlayerPresenceRate).toBeLessThanOrEqual(1);
    }

    expect(
      Object.values(report.costBands).reduce(
        (total, band) => total + band.finalBoardRepresentationRate,
        0,
      ),
    ).toBeCloseTo(1);

    expect(report.shopPoolAvailability.preparationSnapshots).toBeGreaterThan(0);
    expect(report.shopPoolAvailability.shopSlots).toBeGreaterThan(0);
    expect(report.shopPoolAvailability.emptyShopSlotRate).toBeGreaterThanOrEqual(0);
    expect(report.shopPoolAvailability.emptyShopSlotRate).toBeLessThanOrEqual(1);
    for (const availability of Object.values(
      report.shopPoolAvailability.byCost,
    )) {
      expectFiniteNonNegativeCounters(availability);
      expect(availability.offerRatePerEligibleSlot).toBeLessThanOrEqual(1);
      expect(availability.playerPreparationOfferRate).toBeLessThanOrEqual(1);
      expect(availability.zeroAvailabilityRate).toBeLessThanOrEqual(1);
    }

    for (const trait of Object.values(report.traitReachability)) {
      expect(trait.activations).toBeLessThanOrEqual(
        report.traitPlayerBattleBoards,
      );
      expect(trait.activationRate).toBeGreaterThanOrEqual(0);
      expect(trait.activationRate).toBeLessThanOrEqual(1);
      expect(trait.matchesReached).toBeLessThanOrEqual(report.completeMatches);
      expect(trait.matchReachRate).toBeGreaterThanOrEqual(0);
      expect(trait.matchReachRate).toBeLessThanOrEqual(1);
    }
    for (const definition of DEFAULT_CONTENT.traits) {
      const tiers = report.traitTierReachability[definition.id];
      expect(tiers).toHaveLength(definition.tiers.length);
      expect(tiers.reduce((total, tier) => total + tier.activations, 0)).toBe(
        report.traitReachability[definition.id].activations,
      );
      for (const [tierIndex, tier] of tiers.entries()) {
        expect(tier).toMatchObject({
          tier: tierIndex + 1,
          required: definition.tiers[tierIndex].required,
        });
        expect(tier.activations).toBeLessThanOrEqual(
          report.traitPlayerBattleBoards,
        );
        expect(tier.activationRate).toBeGreaterThanOrEqual(0);
        expect(tier.activationRate).toBeLessThanOrEqual(1);
        expect(tier.matchesReached).toBeLessThanOrEqual(report.completeMatches);
        expect(tier.matchReachRate).toBeGreaterThanOrEqual(0);
        expect(tier.matchReachRate).toBeLessThanOrEqual(1);
      }
    }
    for (const combination of Object.values(report.traitCombinations)) {
      expect(combination.activations).toBeLessThanOrEqual(
        report.traitPlayerBattleBoards,
      );
      expect(combination.activationRate).toBeGreaterThanOrEqual(0);
      expect(combination.activationRate).toBeLessThanOrEqual(1);
      expect(combination.matchesReached).toBeLessThanOrEqual(
        report.completeMatches,
      );
      expect(combination.matchReachRate).toBeGreaterThanOrEqual(0);
      expect(combination.matchReachRate).toBeLessThanOrEqual(1);
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
