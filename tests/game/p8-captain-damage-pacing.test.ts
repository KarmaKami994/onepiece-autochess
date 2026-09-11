import { describe, expect, it } from "vitest";
import {
  classifyCaptainDamageKind,
  nearestRank,
  summarizeCaptainDamagePacing,
  type CaptainDamagePacingMatchInput,
} from "../../scripts/run_production_soak";

describe("P8 production pacing diagnostics", () => {
  it("classifies PvP, ghost, and PvE damage without inspecting gameplay state", () => {
    expect(classifyCaptainDamageKind("pvp", null)).toBe("pvp");
    expect(classifyCaptainDamageKind("pvp", "player-2")).toBe("ghost");
    expect(classifyCaptainDamageKind("pve", null)).toBe("pve");
  });

  it("uses deterministic nearest-rank percentiles", () => {
    const values = [7, 3, 5, 4];
    expect(nearestRank(values, 0.5)).toBe(4);
    expect(nearestRank(values, 0.9)).toBe(7);
    expect(nearestRank(values, 0.95)).toBe(7);
    expect(nearestRank([], 0.5)).toBe(0);
    expect(values).toEqual([7, 3, 5, 4]);
  });

  it("aggregates damage, eliminations, and stage reach deterministically without mutation", () => {
    const matches: CaptainDamagePacingMatchInput[] = [
      {
        damageEvents: [
          { round: 5, kind: "pvp", damage: 3 },
          { round: 5, kind: "ghost", damage: 4 },
          { round: 6, kind: "pve", damage: 5 },
        ],
        eliminationsByRound: { "5": 2, "6": 1 },
        stageReachRounds: [22, 24],
      },
      {
        damageEvents: [{ round: 8, kind: "pvp", damage: 7 }],
        eliminationsByRound: { "8": 1 },
        stageReachRounds: [22],
      },
    ];
    const before = structuredClone(matches);

    const first = summarizeCaptainDamagePacing(matches);
    const second = summarizeCaptainDamagePacing(matches);

    expect(first).toEqual(second);
    expect(matches).toEqual(before);
    expect(first).toMatchObject({
      damageEvents: 4,
      totalDamage: 19,
      averageDamage: 4.75,
      maxSingleLossDamage: 7,
      damageP50: 4,
      damageP90: 7,
      damageP95: 7,
      firstEliminationRound: {
        min: 5,
        max: 8,
        average: 6.5,
        median: 5,
      },
      eliminationsByRound: { "5": 2, "6": 1, "8": 1 },
    });
    expect(first.byKind).toEqual({
      pvp: {
        damageEvents: 2,
        totalDamage: 10,
        averageDamage: 5,
        maxSingleLossDamage: 7,
      },
      ghost: {
        damageEvents: 1,
        totalDamage: 4,
        averageDamage: 4,
        maxSingleLossDamage: 4,
      },
      pve: {
        damageEvents: 1,
        totalDamage: 5,
        averageDamage: 5,
        maxSingleLossDamage: 5,
      },
    });
    expect(first.byRound).toEqual({
      "5": {
        damageEvents: 2,
        totalDamage: 7,
        averageDamage: 3.5,
        eliminations: 2,
      },
      "6": {
        damageEvents: 1,
        totalDamage: 5,
        averageDamage: 5,
        eliminations: 1,
      },
      "8": {
        damageEvents: 1,
        totalDamage: 7,
        averageDamage: 7,
        eliminations: 1,
      },
    });
    expect(first.stageReach).toMatchObject({
      "22": { matchesReached: 2, rate: 1 },
      "24": { matchesReached: 1, rate: 0.5 },
      "27": { matchesReached: 0, rate: 0 },
      "36": { matchesReached: 0, rate: 0 },
    });
  });
});
