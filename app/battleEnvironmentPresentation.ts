import type { BattleEnvironment } from "../game/types";

export const WEATHER_HELP = {
  neutral: "Clear conditions; no weather modifier.",
  rain: "Rain: +3 Energy each second to living fighters; Poison damage is reduced by 30%. Existing Energy caps and Protect apply.",
  snow: "Snow: newly applied Freeze lasts 30% longer. Burn still accelerates thaw.",
};
export const FIELD_HELP = {
  "charged-deck": "Charged Deck: occupants gain 3 Energy each second. Existing Energy caps and Protect apply.",
  "frost-patch": "Frost Patch: entering Freezes for 1 second (1.3 in Snow); staying does not retrigger, re-entry cooldown 2 seconds.",
};
export function presentBattleEnvironment(environment: BattleEnvironment | undefined, mirror: boolean, width: number, height: number): BattleEnvironment {
  return { weather: environment?.weather ?? "neutral", fields: (environment?.fields ?? []).map(field => ({
    kind: field.kind, cells: field.cells.map(cell => mirror ? { x: width - 1 - cell.x, y: height - 1 - cell.y } : { ...cell }),
  })) };
}
