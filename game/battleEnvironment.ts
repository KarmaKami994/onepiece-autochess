import type { BattleEnvironment, GameContent } from "./types";

export const neutralBattleEnvironment = (): BattleEnvironment => ({ weather: "neutral", fields: [] });

/** Detached, canonical battle data; also used at file/save import boundaries. */
export function readBattleEnvironment(value: unknown, width: number, height: number): BattleEnvironment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.weather !== "neutral" && raw.weather !== "rain" && raw.weather !== "snow") return null;
  if (!Array.isArray(raw.fields) || raw.fields.length > 2) return null;
  const fields: BattleEnvironment["fields"] = [];
  for (const field of raw.fields) {
    if (!field || typeof field !== "object" || Array.isArray(field)) return null;
    const entry = field as Record<string, unknown>;
    if ((entry.kind !== "charged-deck" && entry.kind !== "frost-patch") ||
      fields.some(existing => existing.kind === entry.kind) || !Array.isArray(entry.cells) || entry.cells.length < 1 || entry.cells.length > width * height) return null;
    const cells: { x: number; y: number }[] = [];
    for (const cell of entry.cells) {
      if (!cell || typeof cell !== "object" || Array.isArray(cell)) return null;
      const point = cell as Record<string, unknown>;
      if (typeof point.x !== "number" || typeof point.y !== "number" || !Number.isInteger(point.x) || !Number.isInteger(point.y) ||
        point.x < 0 || point.y < 0 || point.x >= width || point.y >= height) return null;
      if (!cells.some(existing => existing.x === point.x && existing.y === point.y)) cells.push({ x: point.x, y: point.y });
    }
    fields.push({ kind: entry.kind, cells: cells.sort((a, b) => a.y - b.y || a.x - b.x) });
  }
  return { weather: raw.weather, fields: fields.sort((a, b) => a.kind.localeCompare(b.kind)) };
}

export function stageBattleEnvironment(round: number, content: GameContent): BattleEnvironment {
  return structuredClone(content.stages.find(stage => stage.round === round)?.battleEnvironment ?? neutralBattleEnvironment());
}

export function hasBattleEnvironment(environment: BattleEnvironment): boolean {
  return environment.weather !== "neutral" || environment.fields.length > 0;
}
