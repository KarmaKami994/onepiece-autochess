import { DEFAULT_CONTENT } from "./content";
import { reconcileProductionFormProgression, resolveUnitDefinition } from "./forms";
import { getActiveTraitsForUnits } from "./traits";
import { simulateBattle } from "./combat";
import type { BattleEnvironment, BattleSetupUnit, BattleTeam, GameContent, UnitInstance } from "./types";
import { neutralBattleEnvironment, readBattleEnvironment } from "./battleEnvironment";

export type PlannedUnit = BattleSetupUnit;
export type TeamPlan = {
  environment?: BattleEnvironment;
  format: "grand-line-team-plan";
  version: 1;
  contentVersion: string;
  name: string;
  seed: string;
  teams: { a: PlannedUnit[]; b: PlannedUnit[] };
};
export type PlanValidation = { ok: true; plan: TeamPlan } | { ok: false; errors: string[] };

export function createTeamPlan(content: GameContent = DEFAULT_CONTENT): TeamPlan {
  return {
    format: "grand-line-team-plan", version: 1, contentVersion: content.version,
    name: "My crew plan", seed: "crew-practice-1", teams: { a: [], b: [] }, environment: neutralBattleEnvironment(),
  };
}

export function resolvePlannedUnit(unit: PlannedUnit, content: GameContent = DEFAULT_CONTENT): PlannedUnit {
  const instance: UnitInstance = { ...unit, items: [...unit.items], acquiredOrder: 0 };
  reconcileProductionFormProgression(instance, content);
  return { id: unit.id, definitionId: unit.definitionId, star: unit.star, ...(instance.formId ? { formId: instance.formId } : {}), items: [...instance.items], position: { ...unit.position } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Returns a detached, whitelisted document. Never imports a MatchState or trusts file metadata.
export function validateTeamPlan(value: unknown, content: GameContent = DEFAULT_CONTENT): PlanValidation {
  const errors: string[] = [];
  if (!isRecord(value) || value.format !== "grand-line-team-plan" || value.version !== 1) {
    return { ok: false, errors: ["Not a supported Grand Line team plan (format version 1 required)."] };
  }
  if (value.contentVersion !== content.version) errors.push(`This plan requires content ${String(value.contentVersion)}; current content is ${content.version}.`);
  if (typeof value.name !== "string" || !value.name.trim() || value.name.length > 80) errors.push("Plan name must contain 1–80 characters.");
  if (typeof value.seed !== "string" || !value.seed.trim() || value.seed.length > 128) errors.push("Seed must contain 1–128 characters.");
  if (!isRecord(value.teams)) return { ok: false, errors: [...errors, "Two teams (a and b) are required."] };
  const teams: TeamPlan["teams"] = { a: [], b: [] };
  const environment = value.environment === undefined ? undefined : readBattleEnvironment(value.environment, content.config.boardWidth, content.config.boardHeight);
  if (environment === null) errors.push("Invalid battle weather or field cells.");
  for (const side of ["a", "b"] as const) {
    const rawUnits = value.teams[side];
    const label = `Team ${side.toUpperCase()}`;
    if (!Array.isArray(rawUnits) || rawUnits.length > content.config.maxLevel) {
      errors.push(`${label}: use at most ${content.config.maxLevel} crew members.`);
      continue;
    }
    const ids = new Set<string>();
    const cells = new Set<string>();
    for (const [index, raw] of rawUnits.entries()) {
      const at = `${label}, unit ${index + 1}`;
      if (!isRecord(raw)) { errors.push(`${at}: invalid unit.`); continue; }
      const definition = content.units.find((unit) => unit.id === raw.definitionId);
      if (!definition) { errors.push(`${at}: unknown playable crew ID.`); continue; }
      if (typeof raw.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(raw.id) || ids.has(raw.id)) {
        errors.push(`${at}: unit ID must be unique and contain only letters, digits, _ or -.`); continue;
      }
      ids.add(raw.id);
      if (raw.star !== 1 && raw.star !== 2 && raw.star !== 3) { errors.push(`${at}: stars must be 1, 2 or 3.`); continue; }
      if (!isRecord(raw.position) || !Number.isInteger(raw.position.x) || !Number.isInteger(raw.position.y) ||
        typeof raw.position.x !== "number" || typeof raw.position.y !== "number" ||
        raw.position.x < 0 || raw.position.x >= content.config.boardWidth ||
        raw.position.y < content.config.boardHeight - content.config.deployRows || raw.position.y >= content.config.boardHeight) {
        errors.push(`${at}: position must be inside your deployment rows.`); continue;
      }
      const cell = `${raw.position.x},${raw.position.y}`;
      if (cells.has(cell)) errors.push(`${at}: another unit already occupies this cell.`);
      cells.add(cell);
      if (!Array.isArray(raw.items) || raw.items.length > content.config.itemCap || !raw.items.every((id: unknown) => typeof id === "string" && content.items.some((item) => item.id === id))) {
        errors.push(`${at}: choose up to ${content.config.itemCap} valid items.`); continue;
      }
      const items: string[] = raw.items;
      const equipment = items.flatMap((id) => content.items.filter((item) => item.id === id));
      if (equipment.filter((item) => item.kind === "component").length > 1) errors.push(`${at}: two components must be crafted first; select their completed recipe result.`);
      const completed = equipment.filter((item) => item.kind === "completed").map((item) => item.id);
      if (new Set(completed).size !== completed.length) errors.push(`${at}: duplicate completed items are not legal.`);
      if (raw.formId !== undefined && (typeof raw.formId !== "string" || !content.forms.some((form) => form.id === raw.formId && form.baseDefinitionId === definition.id && form.lifecycle === "persistent"))) {
        errors.push(`${at}: choose a persistent form of this crew member; temporary forms trigger during combat.`); continue;
      }
      const unit: PlannedUnit = {
        id: raw.id, definitionId: definition.id, star: raw.star, items: [...items],
        position: { x: raw.position.x, y: raw.position.y },
        ...(typeof raw.formId === "string" ? { formId: raw.formId } : {}),
      };
      if (unit.formId) {
        // Production reconciliation is the unlock authority; try each catalyst first
        // to allow either already-locked Gear 4 branch when both catalysts are held.
        const orders = [items, ...items.map((id, i) => [id, ...items.filter((_, j) => j !== i)])];
        const reachable = orders.some((order) => {
          const candidate = { ...unit, formId: undefined, items: order, acquiredOrder: 0 };
          reconcileProductionFormProgression(candidate, content);
          return candidate.formId === unit.formId;
        });
        if (!reachable) errors.push(`${at}: form requirements (stars/catalyst) are not met.`);
      }
      const resolved = resolvePlannedUnit(unit, content);
      const native = resolveUnitDefinition(resolved.definitionId, resolved.formId, content);
      if (equipment.some((item) => item.grantedTraitId && native?.traits.includes(item.grantedTraitId))) errors.push(`${at}: a held trait grant is redundant with the unit's native/form traits.`);
      teams[side].push(resolved);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, plan: {
    format: "grand-line-team-plan", version: 1, contentVersion: content.version,
    name: String(value.name).trim(), seed: String(value.seed), teams,
    ...(environment ? { environment } : {}),
  } };
}

export function parseTeamPlan(text: string, content: GameContent = DEFAULT_CONTENT): PlanValidation {
  if (text.length > 100_000) return { ok: false, errors: ["Plan file is too large (100 KB maximum)."] };
  try { return validateTeamPlan(JSON.parse(text) as unknown, content); }
  catch { return { ok: false, errors: ["Plan file is not valid JSON."] }; }
}

export function simulateTeamPlan(value: unknown, content: GameContent = DEFAULT_CONTENT) {
  const validated = validateTeamPlan(value, content);
  if (!validated.ok) return validated;
  const { plan } = validated;
  if (!plan.teams.a.length || !plan.teams.b.length) return { ok: false as const, errors: ["Add at least one crew member to each team before running a combat test."] };
  const team = (side: "a" | "b"): BattleTeam => {
    const units = plan.teams[side].map((unit) => ({
      ...unit, id: `plan-${side}:${unit.id}`, items: [...unit.items],
      position: side === "a" ? { ...unit.position } : {
        x: content.config.boardWidth - 1 - unit.position.x,
        y: content.config.boardHeight - 1 - unit.position.y,
      },
    }));
    return { id: `plan-${side}`, units, activeTraits: getActiveTraitsForUnits(units, content) };
  };
  const teamA = team("a");
  const teamB = team("b");
  return { ok: true as const, plan, teamA, teamB, result: simulateBattle(teamA, teamB, { seed: plan.seed, recordEvents: true, environment: plan.environment }, content) };
}
