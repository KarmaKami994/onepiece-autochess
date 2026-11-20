import { DEFAULT_CONTENT, type GameContent } from "../../game";

/** B07 control for proving unchanged-content behavior under the B08/B09 engine.
 * The caller pins its complete content hash before using it; no report is rewritten. */
export function b07ReferenceContent(): GameContent {
  const content = structuredClone(DEFAULT_CONTENT);
  content.version = "1.32.0";
  const laterCrew = new Set(["hatchan", "kuroobi", "fisher-tiger", "bepo", "carrot", "pedro", "pekoms"]);
  const laterForms = new Set([
    "sabo-flame-emperor", "kid-punk-rotten", "kuzan-ice-form",
    "blackbeard-darkness", "blackbeard-quake", "koby-honesty-impact",
  ]);
  content.units = content.units.filter(unit => !laterCrew.has(unit.id));
  const jinbe = content.units.find(unit => unit.id === "jinbe");
  if (!jinbe) throw new Error("Missing Jinbe reference.");
  jinbe.traits = jinbe.traits.filter(trait => trait !== "fish-man");
  content.forms = content.forms?.filter(form => !laterForms.has(form.id));
  content.traits = content.traits.filter(trait => trait.id !== "fish-man" && trait.id !== "minks");
  for (const trait of content.traits) {
    if (trait.id === "straw-hat") trait.tiers = trait.tiers.filter(tier => tier.required <= 6);
    if (trait.id === "brawler") trait.tiers = trait.tiers.filter(tier => tier.required <= 4);
    if (trait.id === "swordsman") trait.tiers = trait.tiers.filter(tier => tier.required <= 3);
  }
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
