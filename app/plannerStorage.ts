import { parseTeamPlan, validateTeamPlan, type TeamPlan } from "../game/teamPlanner";
import type { GameContent, StorageAdapter } from "../game/types";

export const TEAM_PLANS_KEY = "grand-line-auto-chess.team-plans.v1";

export function readTeamPlans(storage: StorageAdapter, content: GameContent): TeamPlan[] {
  const text = storage.getItem(TEAM_PLANS_KEY);
  if (text === null) return [];
  const raw: unknown = JSON.parse(text);
  if (!Array.isArray(raw) || raw.length > 20) throw new Error("Saved plan library is invalid. Export your current draft before repairing browser storage.");
  return raw.map((entry: unknown) => {
    const result = validateTeamPlan(entry, content);
    if (!result.ok) throw new Error(`Saved plan cannot be loaded: ${result.errors.join(" ")}`);
    return result.plan;
  });
}

export function storeTeamPlan(storage: StorageAdapter, plan: TeamPlan, content: GameContent): TeamPlan[] {
  const checked = parseTeamPlan(JSON.stringify(plan), content);
  if (!checked.ok) throw new Error(checked.errors.join(" "));
  const previous = readTeamPlans(storage, content);
  const plans = [...previous.filter((entry) => entry.name !== checked.plan.name), checked.plan];
  if (plans.length > 20) throw new Error("The library is full (20 plans). Delete a saved plan first.");
  storage.setItem(TEAM_PLANS_KEY, JSON.stringify(plans));
  return plans;
}

export function deleteTeamPlan(storage: StorageAdapter, name: string, content: GameContent): TeamPlan[] {
  const plans = readTeamPlans(storage, content).filter((plan) => plan.name !== name);
  storage.setItem(TEAM_PLANS_KEY, JSON.stringify(plans));
  return plans;
}

export function downloadTeamPlan(plan: TeamPlan): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "grand-line-team-plan.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
