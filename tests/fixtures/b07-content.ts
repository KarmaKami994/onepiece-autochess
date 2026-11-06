import { DEFAULT_CONTENT, type GameContent } from "../../game";

/** B07 control for proving unchanged-content behavior under the B08/B09 engine.
 * The caller pins its complete content hash before using it; no report is rewritten. */
export function b07ReferenceContent(): GameContent {
  const content = structuredClone(DEFAULT_CONTENT);
  content.version = "1.32.0";
  // Explicit undefined also clears the field when the control is assigned to DEFAULT_CONTENT.
  content.foods = undefined;
  for (const encounter of content.harborEncounters) delete encounter.foodOffer;
  for (const stage of content.stages) delete stage.battleEnvironment;
  const kuzan = content.units.find(unit => unit.id === "kuzan");
  if (!kuzan) throw new Error("Missing Kuzan reference.");
  delete kuzan.ability.freezeMs;
  kuzan.ability.stunMs = 700;
  kuzan.ability.description = "Freezes the battlefield, damaging every enemy and briefly stunning survivors.";
  for (const enemy of content.enemies) {
    if (enemy.id === "magellan" && enemy.ability) {
      delete enemy.ability.poisonDurationMs;
      enemy.ability.description = "Hits the nearest crew member and adjacent allies, briefly stunning them.";
    }
    if (enemy.id === "caesar-clown" && enemy.ability) {
      delete enemy.ability.sleepMs;
      enemy.ability.description = "Burns through the farthest crew member's line with a gas blast.";
    }
    if (enemy.id === "pica" && enemy.ability) {
      delete enemy.ability.lockMs;
      enemy.ability.description = "Hits the nearest crew member and adjacent allies, briefly stunning them.";
    }
  }
  return content;
}
