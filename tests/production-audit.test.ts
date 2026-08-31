import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  type BattleEvent,
  type BattleUnitSnapshot,
  type MatchBattleResult,
  type UnitInstance,
} from "../game";
import {
  auditFormBattleResult,
  auditPilotFinalCrew,
  runProductionSoak,
} from "../scripts/run_production_soak";

function snapshot(
  id: string,
  definitionId: string,
  teamId: string,
  formId?: string,
): BattleUnitSnapshot {
  return {
    id,
    definitionId,
    formId,
    teamId,
    star: 1,
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    shield: 0,
    energy: 0,
    attack: 10,
    defense: 10,
    range: 1,
    state: "seek",
  };
}

function battleResult(
  initialUnits: BattleUnitSnapshot[],
  events: BattleEvent[],
): MatchBattleResult {
  return {
    playerAId: "player-1",
    playerBId: null,
    ghostOfPlayerId: "player-2",
    winnerId: "player-1",
    timedOut: false,
    playerADamage: 1,
    playerBDamage: 0,
    durationTicks: 100,
    events,
    initialUnits,
    finalUnits: initialUnits,
  };
}

function crewUnit(
  id: string,
  definitionId: string,
  star: 1 | 2 | 3,
  formId?: string,
): UnitInstance {
  return {
    id,
    definitionId,
    formId,
    star,
    items: [],
    acquiredOrder: 1,
  };
}

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
    expect(report.characterPresence["robin-demonio-fleur"]).toBeUndefined();
    expect(
      report.characterCombatExpression["chopper-monster-point"],
    ).toBeUndefined();
    expect(Object.keys(report.formReachability)).toEqual([
      "robin-demonio-fleur",
      "luffy-gear-4-boundman",
      "luffy-gear-4-snakeman",
      "chopper-monster-point",
    ]);
    expect(Object.keys(report.pilotCombatExpression)).toEqual([
      "chopper:base",
      "chopper-monster-point",
      "robin:base",
      "robin-demonio-fleur",
      "luffy:base",
      "luffy-gear-4-boundman",
      "luffy-gear-4-snakeman",
    ]);
    expect(
      report.formReachability["chopper-monster-point"].finalBoards,
    ).toBe(0);
    expect(report.pilotFormReachability.robin.threeStarInvariantHolds).toBe(
      true,
    );
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
    for (const expression of Object.values(report.pilotCombatExpression)) {
      expectFiniteNonNegativeCounters(expression);
    }
    expectFiniteNonNegativeCounters(report.formReachability);
    expectFiniteNonNegativeCounters(report.pilotFormReachability);
    expectFiniteNonNegativeCounters(report.formEventVolume);
    expectFiniteNonNegativeCounters(report.combatReadability);

    expect(JSON.parse(JSON.stringify(report))).toEqual(report);

    const repeated = runProductionSoak(3);
    expect({ ...repeated, generatedAt: "deterministic" }).toEqual({
      ...report,
      generatedAt: "deterministic",
    });
  }, 30_000);
});

describe("post-forms production diagnostics", () => {
  it("attributes persistent forms from real initial snapshots and excludes ghosts", () => {
    const audit = auditFormBattleResult(
      battleResult(
        [
          snapshot(
            "robin",
            "robin",
            "player-1",
            "robin-demonio-fleur",
          ),
          snapshot(
            "luffy",
            "luffy",
            "player-1",
            "luffy-gear-4-boundman",
          ),
          snapshot(
            "ghost-luffy",
            "luffy",
            "ghost-player-2",
            "luffy-gear-4-snakeman",
          ),
        ],
        [
          {
            type: "cast",
            tick: 1,
            sourceId: "robin",
            abilityId: "demonio-fleur",
            targetIds: ["ghost-luffy"],
          },
          {
            type: "cast",
            tick: 2,
            sourceId: "luffy",
            abilityId: "kong-gun",
            targetIds: ["ghost-luffy"],
          },
          {
            type: "cast",
            tick: 3,
            sourceId: "ghost-luffy",
            abilityId: "jet-culverin",
            targetIds: ["robin"],
          },
        ],
      ),
    );

    expect(audit.battleStartUnitAppearances).toMatchObject({
      "robin-demonio-fleur": 1,
      "luffy-gear-4-boundman": 1,
      "luffy-gear-4-snakeman": 0,
    });
    expect(audit.formsReached).toEqual([
      "robin-demonio-fleur",
      "luffy-gear-4-boundman",
    ]);
    expect(audit.pilotCombatExpression["robin-demonio-fleur"]).toMatchObject({
      battleBoardAppearances: 1,
      casts: 1,
    });
    expect(
      audit.pilotCombatExpression["luffy-gear-4-boundman"],
    ).toMatchObject({ battleBoardAppearances: 1, casts: 1 });
    expect(
      audit.pilotCombatExpression["luffy-gear-4-snakeman"],
    ).toMatchObject({ battleBoardAppearances: 0, casts: 0 });
  });

  it("switches Chopper event attribution at one real transform and measures eligibility", () => {
    const audit = auditFormBattleResult(
      battleResult(
        [
          snapshot("chopper", "chopper", "player-1"),
          snapshot("chopper-dead", "chopper", "player-1"),
          snapshot("usopp", "usopp", "player-1"),
          snapshot("ghost-chopper", "chopper", "ghost-player-2"),
          snapshot("ghost-usopp", "usopp", "ghost-player-2"),
        ],
        [
          {
            type: "death",
            tick: 40,
            unitId: "chopper-dead",
            sourceId: null,
          },
          {
            type: "cast",
            tick: 70,
            sourceId: "chopper",
            abilityId: "emergency-cure",
            targetIds: ["chopper"],
          },
          {
            type: "unit-transform",
            tick: 80,
            unitId: "chopper",
            fromFormId: null,
            toFormId: "chopper-monster-point",
            hp: 700,
            maxHp: 800,
          },
          {
            type: "cast",
            tick: 81,
            sourceId: "chopper",
            abilityId: "monster-point-slam",
            targetIds: ["ghost-chopper"],
          },
          {
            type: "damage",
            tick: 82,
            sourceId: "chopper",
            targetId: "ghost-chopper",
            amount: 100,
            healthDamage: 100,
            shieldDamage: 0,
            damageKind: "ability",
          },
          {
            type: "status",
            tick: 83,
            sourceId: "chopper",
            targetId: "ghost-chopper",
            status: "stun",
            durationTicks: 6,
          },
          {
            type: "unit-transform",
            tick: 80,
            unitId: "ghost-chopper",
            fromFormId: null,
            toFormId: "chopper-monster-point",
            hp: 800,
            maxHp: 800,
          },
          {
            type: "cast",
            tick: 81,
            sourceId: "ghost-chopper",
            abilityId: "monster-point-slam",
            targetIds: ["chopper"],
          },
        ],
      ),
    );

    expect(audit.totalTransformEvents).toBe(1);
    expect(audit.transformEvents["chopper-monster-point"]).toBe(1);
    expect(audit.chopper).toEqual({
      deployedBoards: 1,
      eligibleBoards: 1,
      eligibleCombatantAppearances: 2,
      eligibleCombatantsDiedBeforeTransform: 1,
      transformedPlayerBattleBoards: 1,
    });
    expect(audit.pilotCombatExpression["chopper:base"]).toMatchObject({
      battleBoardAppearances: 2,
      casts: 1,
    });
    expect(
      audit.pilotCombatExpression["chopper-monster-point"],
    ).toMatchObject({
      battleBoardAppearances: 1,
      casts: 1,
      abilityDamageEvents: 1,
      totalAbilityDamage: 100,
      stunsApplied: 1,
      stunDurationTicks: 6,
    });
  });

  it("counts Robin final-board form identity once and exposes the 3-star invariant", () => {
    const audit = auditPilotFinalCrew([
      crewUnit("robin-a", "robin", 3, "robin-demonio-fleur"),
      crewUnit("robin-b", "robin", 3, "robin-demonio-fleur"),
    ]);

    expect(audit.formIds).toEqual(["robin-demonio-fleur"]);
    expect(audit.robin).toEqual({
      threeStar: true,
      demonio: true,
      demonioThreeStar: true,
      nonDemonioThreeStar: false,
    });
    expect(
      auditPilotFinalCrew([crewUnit("base-robin", "robin", 3)]).robin
        .nonDemonioThreeStar,
    ).toBe(true);
  });

  it("separates base, Boundman, and Snakeman 3-star Luffy branches", () => {
    const audit = auditPilotFinalCrew([
      crewUnit("luffy-base", "luffy", 3),
      crewUnit("luffy-boundman", "luffy", 3, "luffy-gear-4-boundman"),
      crewUnit("luffy-snakeman", "luffy", 3, "luffy-gear-4-snakeman"),
      crewUnit("luffy-snakeman-copy", "luffy", 3, "luffy-gear-4-snakeman"),
    ]);

    expect(audit.formIds).toEqual([
      "luffy-gear-4-boundman",
      "luffy-gear-4-snakeman",
    ]);
    expect(audit.luffyThreeStarBranches).toEqual([
      "base",
      "boundman",
      "snakeman",
    ]);
  });
});
