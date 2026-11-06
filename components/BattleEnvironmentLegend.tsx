import type { BattleEnvironment } from "../game/types";
import { FIELD_HELP, WEATHER_HELP } from "../app/battleEnvironmentPresentation";

export function BattleEnvironmentLegend({ environment }: { environment?: BattleEnvironment }) {
  if (!environment || (environment.weather === "neutral" && !environment.fields.length)) return null;
  return <details className="battle-environment" aria-label="Battle environment" data-weather={environment.weather}>
    <summary>WEATHER: {environment.weather.toUpperCase()}{environment.fields.map(field => ` · ${field.kind === "charged-deck" ? "ϟ CHARGED DECK" : "❄ FROST PATCH"}`)}</summary>
    <p>{WEATHER_HELP[environment.weather]}</p>
    {environment.fields.map(field => <p key={field.kind}>{FIELD_HELP[field.kind]} Cells: {field.cells.map(cell => `${cell.x + 1}/${cell.y + 1}`).join(", ")} (column/row).</p>)}
  </details>;
}
