import { hashCanonicalValue, neutralBattleEnvironment, type AdditionalStatusKind, type BattleEnvironment, type MatchBattleResult } from "../game/index";

export function emptyBattleConditions() {
  return {
    byWeather: { neutral: 0, rain: 0, snow: 0 },
    fieldBattles: { "charged-deck": 0, "frost-patch": 0 },
    applications: { poison: 0, freeze: 0, sleep: 0, locked: 0 } satisfies Record<AdditionalStatusKind, number>,
    endings: { poison: 0, freeze: 0, sleep: 0, locked: 0 } satisfies Record<AdditionalStatusKind, number>,
    environmentEnergy: 0, poisonHealthDamage: 0, poisonShieldDamage: 0,
    configurations: {} as Record<string, { environment: BattleEnvironment; battles: number }>,
    legacyReadabilityStatusMetricUnchanged: true,
  };
}

/** Factual counters only; no result or decision is fed back to combat. */
export function observeBattleConditions(report: ReturnType<typeof emptyBattleConditions>, result: MatchBattleResult): void {
  const environment = result.environment ?? neutralBattleEnvironment();
  report.byWeather[environment.weather] += 1;
  for (const field of environment.fields) report.fieldBattles[field.kind] += 1;
  const key = hashCanonicalValue(environment);
  report.configurations[key] ??= { environment: structuredClone(environment), battles: 0 };
  report.configurations[key].battles += 1;
  for (const event of result.events) {
    if (event.type === "status" && (event.status === "poison" || event.status === "freeze" || event.status === "sleep" || event.status === "locked")) report.applications[event.status] += 1;
    if (event.type === "status-end") report.endings[event.status] += 1;
    if (event.type === "energy" && event.reason === "environment") report.environmentEnergy += Math.max(0, event.amount);
    if (event.type === "damage" && event.damageKind === "poison") {
      report.poisonHealthDamage += event.healthDamage; report.poisonShieldDamage += event.shieldDamage;
    }
  }
}
