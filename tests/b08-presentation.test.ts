import { describe, expect, it } from "vitest";
import { createMatch, DEFAULT_CONTENT, simulateBattle, type BattleEnvironment, type MatchState } from "../game";
import { selectBattlePresentation, selectMatchView } from "../app/selectors";
import { preservesActiveBattleTimeline } from "../components/PhaserBoard";
import { createCombatReport, recordCombatEvent } from "../components/combatReport";
import { newVoyageReplay, observeVoyage, replayFrameState } from "../app/chronicle";
import { validateReplay } from "../app/replayValidation";

function battleState(): MatchState {
  const state = createMatch("b08-presentation"); state.phase = "battle";
  state.battleEnvironment = { weather: "snow", fields: [] };
  const environment: BattleEnvironment = { weather: "rain", fields: [{ kind: "charged-deck", cells: [{ x: 0, y: 1 }, { x: 2, y: 1 }] }] };
  const result = simulateBattle({ id: "player-1", units: [{ id: "player-1:one", definitionId: "luffy", star: 1, items: [], position: { x: 3, y: 4 } }] },
    { id: "bot-1", units: [{ id: "bot-1:two", definitionId: "zoro", star: 1, items: [], position: { x: 3, y: 1 } }] }, { seed: state.seed, maxTicks: 12, environment });
  state.lastResults = [{ ...result, playerAId: "player-1", playerBId: "bot-1", ghostOfPlayerId: null, playerADamage: 0, playerBDamage: 0 }];
  return state;
}

describe("B08 frozen environment presentation", () => {
  it("uses the actual frozen result, mirrors its cells and never retrofits missing legacy metadata", () => {
    const state = battleState();
    expect(selectBattlePresentation(state, "player-1")?.environment.weather).toBe("rain");
    expect(selectBattlePresentation(state, "bot-1")?.environment.fields[0].cells).toEqual([{ x: 7, y: 4 }, { x: 5, y: 4 }]);
    expect(selectMatchView(state).environment.weather).toBe("rain");
    delete state.lastResults[0].environment;
    expect(selectBattlePresentation(state, "player-1")?.environment).toEqual({ weather: "neutral", fields: [] });
  });

  it("keeps the deployed timeline for reordered equivalent fields while detecting real weather/fighter changes", () => {
    const state = battleState(), view = selectBattlePresentation(state, "player-1")!;
    const payload = { units: view.boardUnits, selectedId: null, interactionMode: "none" as const, phase: "battle", capacity: 2, boardSkin: "pirate-ship" as const, environment: view.environment };
    const reordered = structuredClone(payload); reordered.environment.fields[0].cells.reverse(); reordered.units.reverse();
    expect(preservesActiveBattleTimeline(payload, reordered)).toBe(true);
    reordered.environment.weather = "snow";
    expect(preservesActiveBattleTimeline(payload, reordered)).toBe(false);
    const changed = structuredClone(payload); changed.units[0].hp -= 1;
    expect(preservesActiveBattleTimeline(payload, changed)).toBe(false);
  });

  it("dispatches early status end facts to the shared observer without revealing them before playback", () => {
    const state = battleState();
    state.lastResults[0].events.push({ type: "status", tick: 1, sourceId: "player-1:one", targetId: "bot-1:two", status: "sleep", durationTicks: 15 },
      { type: "status-end", tick: 3, targetId: "bot-1:two", status: "sleep" });
    state.lastResults[0].events.sort((a, b) => a.tick - b.tick);
    const view = selectBattlePresentation(state, "player-1")!;
    const ended = view.events.find(event => event.kind === "status-end")!;
    const initial = createCombatReport(view.boardUnits);
    expect(initial.cue).toBe("Waiting for playback.");
    expect(recordCombatEvent(initial, ended).cue).toContain("sleep ended");
    expect(initial.cue).toBe("Waiting for playback.");
  });

  it("archives/imports the exact battle configuration and validates status/field extensions", () => {
    const state = battleState();
    state.lastResults[0].events.push({ type: "status", tick: 1, sourceId: "player-1:one", targetId: "bot-1:two", status: "poison", durationTicks: 30, stacks: 1 },
      { type: "status-end", tick: 2, targetId: "bot-1:two", status: "poison" });
    state.lastResults[0].events.sort((a, b) => a.tick - b.tick);
    const replay = observeVoyage(newVoyageReplay(state, DEFAULT_CONTENT, "b08-archive", 1), state, 1);
    const restored = validateReplay(JSON.parse(JSON.stringify(replay)), DEFAULT_CONTENT);
    expect(restored.frames[0].battles[0].environment).toEqual(state.lastResults[0].environment);
    const frame = replayFrameState(restored, restored.frames[0], DEFAULT_CONTENT);
    expect(selectBattlePresentation(frame, "player-1")?.environment).toEqual(state.lastResults[0].environment);
    const invalid = structuredClone(replay); invalid.frames[0].battles[0].environment!.fields[0].cells[0].x = 9;
    expect(() => validateReplay(invalid, DEFAULT_CONTENT)).toThrow();
    const unknownSource = structuredClone(replay);
    const energy = unknownSource.frames[0].battles[0].events.find(event => event.type === "energy" && event.reason === "environment");
    expect(energy).toBeDefined();
    if (energy?.type === "energy") energy.sourceId = "environment:unknown";
    expect(() => validateReplay(unknownSource, DEFAULT_CONTENT)).toThrow();
  });
});
