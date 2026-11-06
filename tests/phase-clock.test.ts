import { describe, expect, it } from "vitest";
import { createMatch, DEFAULT_CONTENT, getStageDefinition, hashMatchState, CURRENT_SAVE_SCHEMA_VERSION } from "../game";
import { elapseClock, initialClockRemaining, phaseClockBudget, readPhaseClockCheckpoint, type ClockIdentity } from "../app/phaseClock";
import { createVoyageSaveEnvelope, restoreVoyageState } from "../app/voyagePersistence";

const identity = { seed: "clock-save", round: 1, phase: "preparation" } satisfies ClockIdentity;
const saved = { ...identity, durationMs: 20_000, remainingMs: 12_345, paused: true };

describe("B06 pinned PAC budgets", () => {
  it("locks every preparation round to the pinned StageDuration table", () => {
    const overrides: Record<number, number> = { 1: 20, 2: 20, 3: 20, 5: 40, 8: 40, 9: 40, 10: 50, 11: 40, 15: 40, 19: 40, 20: 50 };
    for (let round = 1; round <= 50; round++) {
      expect(getStageDefinition(round).preparationSeconds).toBe(overrides[round] ?? 30);
      expect(phaseClockBudget("preparation", round, 45, 4, DEFAULT_CONTENT)).toEqual({ durationMs: (overrides[round] ?? 30) * 1_000, victoryMs: 0 });
    }
    expect(DEFAULT_CONTENT.config.combatTickMs * DEFAULT_CONTENT.config.combatMaxTicks).toBe(45_000);
    expect(DEFAULT_CONTENT.version).toBe("1.31.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
  });

  it.each([10, 20])("uses the exact 23-second Portal budget for R%s recruitment", round => {
    expect(phaseClockBudget("voyage-choice", round, 0, 4, DEFAULT_CONTENT)).toEqual({ durationMs: 23_000, victoryMs: 0 });
  });

  it.each([[12, 1, 15_000, 3_000], [12, 4, 6_000, 3_000], [45, 1, 45_000, 0], [45, 0.5, 90_000, 0], [12, 0.5, 27_000, 3_000]])(
    "plays %ss at %sx completely, then applies the PAC result delay", (seconds, speed, durationMs, victoryMs) => {
      expect(phaseClockBudget("battle", 1, seconds, speed, DEFAULT_CONTENT)).toEqual({ durationMs, victoryMs });
    });

  it("bounds malformed durations/speeds and leaves untimed phases untimed", () => {
    expect(phaseClockBudget("battle", 1, Number.NaN, 100, DEFAULT_CONTENT)).toEqual({ durationMs: 45_000, victoryMs: 0 });
    expect(phaseClockBudget("item-choice", 1, 45, 1, DEFAULT_CONTENT).durationMs).toBe(0);
    expect(phaseClockBudget("carousel", 4, 45, 1, DEFAULT_CONTENT).durationMs).toBe(0);
    expect(phaseClockBudget(undefined, undefined, 45, 1, DEFAULT_CONTENT).durationMs).toBe(0);
  });
});

describe("B06 clock persistence and elapsed time", () => {
  it("counts actual delayed-callback elapsed time and never consumes paused or negative time", () => {
    expect(elapseClock(20_000, 8_456, false)).toBe(11_544);
    expect(elapseClock(20_000, 60_000, true)).toBe(20_000);
    expect(elapseClock(20_000, -1_000, false)).toBe(20_000);
    expect(elapseClock(20_000, Number.NaN, false)).toBe(20_000);
    expect(elapseClock(1, 9_000, false)).toBe(0);
    expect(elapseClock(0, 9_000, false)).toBe(0);
  });

  it("resumes matching preparation and recruitment remaining time without an offline deadline", () => {
    expect(initialClockRemaining(20_000, identity, saved)).toBe(12_345);
    const recruit = { seed: identity.seed, round: 10, phase: "voyage-choice" as const };
    expect(initialClockRemaining(23_000, recruit, { ...recruit, durationMs: 23_000, remainingMs: 3_210, paused: false })).toBe(3_210);
    expect(readPhaseClockCheckpoint(saved, identity)?.paused).toBe(true);
    expect(initialClockRemaining(20_000, identity, { ...saved, remainingMs: 0 })).toBe(0);
  });

  it("replays a saved battle from its initial snapshot with a fresh playback budget", () => {
    const battle = { ...identity, phase: "battle" as const };
    expect(initialClockRemaining(15_000, battle, { ...saved, ...battle, durationMs: 15_000, remainingMs: 500 })).toBe(15_000);
  });

  it.each([
    undefined, null, [], {}, { ...saved, seed: "other" }, { ...saved, round: 2 },
    { ...saved, phase: "battle" }, { ...saved, remainingMs: -1 }, { ...saved, remainingMs: 20_001 },
    { ...saved, remainingMs: Number.NaN }, { ...saved, durationMs: Infinity }, { ...saved, paused: "yes" },
  ])("rejects malformed, legacy or different-phase metadata: %j", checkpoint => {
    expect(readPhaseClockCheckpoint(checkpoint, identity)).toBeNull();
    expect(initialClockRemaining(20_000, identity, checkpoint)).toBe(20_000);
  });

  it("uses a fresh budget after a timing change rather than trusting an incompatible duration", () => {
    expect(initialClockRemaining(30_000, identity, saved)).toBe(30_000);
  });

  it("adds envelope metadata without changing domain state, RNG, schema or legacy restore", () => {
    const state = createMatch(identity.seed); const before = hashMatchState(state);
    const envelope = createVoyageSaveEnvelope(state, state.seed, 1, saved);
    expect(envelope.phaseClock).toEqual(saved);
    expect(hashMatchState(state)).toBe(before);
    expect(restoreVoyageState(envelope)).toEqual(restoreVoyageState(createVoyageSaveEnvelope(state, state.seed, 1)));
    expect(envelope.schemaVersion).toBe(6);
    expect(createVoyageSaveEnvelope(state, state.seed, 1, { ...saved, seed: "wrong" }).phaseClock).toBeUndefined();
  });
});
