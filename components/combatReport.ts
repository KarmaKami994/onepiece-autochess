import type { BoardUnit, CombatFxEvent } from "./PhaserBoard";

export type CombatContribution = Pick<BoardUnit, "id" | "name" | "team" | "portrait" | "star"> & {
  hpDamage: number; shieldDamage: number; healing: number; shields: number;
  hpTaken: number; shieldTaken: number; energyDrained: number; revives: number;
};
export type CombatReport = { units: CombatContribution[]; elapsedMs: number; complete: boolean; cue: string };

export function createCombatReport(units: readonly BoardUnit[]): CombatReport {
  return {
    units: units.filter((unit) => unit.zone === "board").map(({ id, name, team, portrait, star }) => ({
      id, name, team, portrait, star, hpDamage: 0, shieldDamage: 0, healing: 0,
      shields: 0, hpTaken: 0, shieldTaken: 0, energyDrained: 0, revives: 0,
    })),
    elapsedMs: 0, complete: false, cue: "Waiting for playback.",
  };
}

export function combatEventTime(event: CombatFxEvent): number {
  return event.tick * 100 + (event.presentationOffsetMs ?? 0);
}

export function combatEventCue(event: CombatFxEvent, units: readonly CombatContribution[]): string | null {
  const name = (id?: string) => units.find((unit) => unit.id === id)?.name ?? "Unknown fighter";
  if (event.kind === "energy" && (event.energyDelta ?? 0) < 0 && event.reason !== "cast-reset") {
    return `${event.sourceId === event.targetId ? "Unattributed source" : name(event.sourceId)} → ${name(event.targetId)}: ${Math.abs(event.energyDelta ?? 0)} Energy drained`;
  }
  if (event.kind === "displace") {
    const action = { lunge: "Lunge", pull: "Pull", knockback: "Knockback", escape: "Escape" }[event.movementKind ?? ""] ?? "Displacement";
    return `${name(event.sourceId)} → ${name(event.unitId)}: ${action}`;
  }
  if (event.kind === "transform") return `${name(event.unitId)}: ${event.label ?? "Transformation"}`;
  if (event.kind === "resurrect") return `${name(event.unitId)}: Phoenix resurrection`;
  if (event.kind === "status-end") return `${name(event.targetId)}: ${event.status} ended`;
  if (event.kind === "status" && ["poison", "freeze", "sleep", "locked"].includes(event.status ?? "")) return `${event.sourceId?.startsWith("environment:") ? "Board field" : name(event.sourceId)} → ${name(event.targetId)}: ${event.status}`;
  if (event.kind === "energy" && event.reason === "environment" && (event.energyDelta ?? 0) > 0) return `${name(event.targetId)}: +${event.energyDelta} Energy from ${event.sourceId?.split(":")[1] ?? "environment"}`;
  if (event.kind === "cast") return `${name(event.sourceId)}: ${event.abilityName ?? "Ability"} → ${(event.targetIds ?? []).map(name).join(", ") || "self"}`;
  return null;
}

/** Fold one dispatched event, never the precomputed future event list. */
export function recordCombatEvent(report: CombatReport, event: CombatFxEvent): CombatReport {
  const positive = (value?: number) => Math.max(0, value ?? 0);
  const units = report.units.map((unit) => {
    const next = { ...unit };
    if (event.kind === "damage") {
      // Legacy unsplit events can only be labelled HP damage; current logs are split.
      const hp = positive(event.healthDamage ?? event.amount);
      const shield = positive(event.shieldDamage);
      if (unit.id === event.sourceId) { next.hpDamage += hp; next.shieldDamage += shield; }
      if (unit.id === event.targetId) { next.hpTaken += hp; next.shieldTaken += shield; }
    }
    if (unit.id === event.sourceId) {
      if (event.kind === "heal") next.healing += positive(event.amount);
      if (event.kind === "shield") next.shields += positive(event.amount);
      if (event.kind === "energy" && event.sourceId !== event.targetId) next.energyDrained += positive(-(event.energyDelta ?? 0));
    }
    if (event.kind === "resurrect" && unit.id === event.unitId) next.revives += 1;
    return next;
  });
  return { ...report, units, elapsedMs: Math.max(report.elapsedMs, combatEventTime(event)), cue: combatEventCue(event, units) ?? report.cue };
}
