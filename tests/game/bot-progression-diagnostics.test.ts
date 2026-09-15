import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  advanceMatchPhase,
  createMatch,
  runBotTurn,
  serializeMatch,
  type BotTurnDiagnostic,
} from "../../game";
import { runProductionSoak } from "../../scripts/run_production_soak";

describe("bot progression diagnostics", () => {
  it("is observationally identical with the observer disabled or enabled", () => {
    const state = createMatch("diagnostic-equivalence");
    const withoutObserver = runBotTurn(state, "bot-1");
    const events: BotTurnDiagnostic[] = [];
    const withObserver = runBotTurn(
      state,
      "bot-1",
      DEFAULT_CONTENT,
      (event) => events.push(event),
    );

    expect(serializeMatch(withObserver)).toBe(serializeMatch(withoutObserver));
    expect(withObserver.rngState).toBe(withoutObserver.rngState);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      seed: "diagnostic-equivalence",
      round: 1,
      playerId: "bot-1",
    });
  });

  it("emits deterministic player and event ordering", () => {
    const observe = () => {
      const events: BotTurnDiagnostic[] = [];
      const result = advanceMatchPhase(
        createMatch("diagnostic-order"),
        DEFAULT_CONTENT,
        (event) => events.push(event),
      );
      return { result, events };
    };
    const first = observe();
    const second = observe();

    expect(first.events).toEqual(second.events);
    expect(first.events.map((event) => event.playerId)).toEqual([
      "bot-1",
      "bot-2",
      "bot-3",
      "bot-4",
      "bot-5",
      "bot-6",
      "bot-7",
    ]);
    expect(serializeMatch(first.result)).toBe(serializeMatch(second.result));
  });

  it("provides detached deeply immutable diagnostic objects", () => {
    const state = createMatch("diagnostic-immutable");
    const baseline = runBotTurn(state, "bot-1");
    let observed: BotTurnDiagnostic | null = null;
    const result = runBotTurn(
      state,
      "bot-1",
      DEFAULT_CONTENT,
      (event) => {
        observed = event;
        try {
          const mutable = event as unknown as {
            start: { gold: number };
            shopSnapshots: Array<{
              offers: Array<{ definitionId: string }>;
            }>;
          };
          mutable.start.gold = 999_999;
          if (mutable.shopSnapshots[0]?.offers[0]) {
            mutable.shopSnapshots[0].offers[0].definitionId = "mutated";
          }
        } catch {
          // Frozen diagnostics reject mutation in strict mode.
        }
      },
    );

    expect(observed).not.toBeNull();
    expect(Object.isFrozen(observed)).toBe(true);
    expect(Object.isFrozen(observed!.start)).toBe(true);
    expect(Object.isFrozen(observed!.shopSnapshots)).toBe(true);
    expect(Object.isFrozen(observed!.shopSnapshots[0]?.offers ?? [])).toBe(true);
    expect(serializeMatch(result)).toBe(serializeMatch(baseline));
    expect(result.rngState).toBe(baseline.rngState);
    const throwingObserverResult = runBotTurn(
      state,
      "bot-1",
      DEFAULT_CONTENT,
      () => {
        throw new Error("diagnostic consumer failure");
      },
    );
    expect(serializeMatch(throwingObserverResult)).toBe(
      serializeMatch(baseline),
    );
  });

  it("keeps normal soak reports compatible and diagnostics opt-in", () => {
    const normal = runProductionSoak(1);
    const diagnostic = runProductionSoak(1, { botDiagnostics: true });
    const {
      generatedAt: _normalGeneratedAt,
      botProgressionDiagnostics: _normalDiagnostics,
      ...normalGameplay
    } = normal;
    const {
      generatedAt: _diagnosticGeneratedAt,
      botProgressionDiagnostics,
      ...diagnosticGameplay
    } = diagnostic;

    expect(_normalGeneratedAt).toEqual(expect.any(String));
    expect(_diagnosticGeneratedAt).toEqual(expect.any(String));
    expect(_normalDiagnostics).toBeUndefined();
    expect(botProgressionDiagnostics?.preparationCount).toBeGreaterThan(0);
    expect(botProgressionDiagnostics?.rawPreparations).toHaveLength(
      botProgressionDiagnostics?.preparationCount ?? 0,
    );
    expect(botProgressionDiagnostics?.xp.overall.attempts).toBeGreaterThanOrEqual(
      botProgressionDiagnostics?.xp.overall.successfulPurchases ?? 0,
    );
    expect(
      Object.values(
        botProgressionDiagnostics?.xp.overall.stopReasons ?? {},
      ).reduce((total, count) => total + count, 0),
    ).toBe(botProgressionDiagnostics?.preparationCount);
    expect(
      Object.values(
        botProgressionDiagnostics?.highCostFunnel.byRoundBucket ?? {},
      ).reduce((total, bucket) => total + bucket.preparations, 0),
    ).toBe(botProgressionDiagnostics?.preparationCount);
    expect(diagnosticGameplay).toEqual(normalGameplay);
  }, 20_000);
});
