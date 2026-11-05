import { createMatch, type GameContent } from "../game";
import type { simulateTeamPlan } from "../game/teamPlanner";
import { buildBattleOutcome } from "../components/battleOutcome";
import { selectBattlePresentation } from "./selectors";

export function plannerPresentation(run: Extract<ReturnType<typeof simulateTeamPlan>, { ok: true }>, content: GameContent) {
  // Disposable adapter for the existing renderer/recap. Never enters the session or persistence.
  const state = createMatch(`planner-view:${run.plan.seed}`, content);
  state.phase = "battle";
  state.round = 6;
  state.stageId = "pvp-6";
  state.players = state.players.slice(0, 2).map((player, index) => {
    const side = index === 0 ? "a" : "b";
    const units = run.plan.teams[side];
    return { ...player, id: `plan-${side}`, name: `Team ${side.toUpperCase()}`, isBot: index === 1,
      level: content.config.maxLevel, bench: [], shop: [],
      units: Object.fromEntries(units.map((unit, acquiredOrder) => [unit.id, { ...unit, items: [...unit.items], acquiredOrder }])),
      board: Object.fromEntries(units.map((unit) => [`${unit.position.x},${unit.position.y}`, unit.id])),
    };
  });
  state.pairings = [{ playerAId: "plan-a", playerBId: "plan-b", ghostOfPlayerId: null }];
  state.lastResults = [{ ...run.result, playerAId: "plan-a", playerBId: "plan-b", ghostOfPlayerId: null, playerADamage: 0, playerBDamage: 0 }];
  return {
    result: run.result,
    presentation: selectBattlePresentation(state, "plan-a", content),
    recapA: buildBattleOutcome({ state, playerId: "plan-a", content }),
    recapB: buildBattleOutcome({ state, playerId: "plan-b", content }),
  };
}
