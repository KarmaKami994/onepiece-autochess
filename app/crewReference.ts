import { describeTraitBehavior, describeTraitEffect, getStageDefinition, resolveUnitDefinition } from "../game";
import type { AbilityDefinition, GameContent, StarLevel, UnitStats } from "../game";
import { STATUS_VISUALS } from "../components/gameVisualManifest";
import { createItemView, createUnitReferenceView, titleCase } from "./selectors";
import { resolvePlannedUnit } from "../game/teamPlanner";
import { FIELD_HELP, WEATHER_HELP } from "./battleEnvironmentPresentation";

export type ReferenceCategory = "crew" | "items" | "food" | "traits" | "forms" | "status" | "pve" | "rounds" | "voyage" | "environment";
export type ReferenceEntry = {
  id: string; category: ReferenceCategory; name: string; description: string;
  imagePath?: string; details: string[]; traits: string[]; cost?: number; kind?: string;
};

// Help text for the four production pilots; unlock legality is resolved by game/forms.ts.
export function formRequirementText(id: string): string {
  switch (id) {
    case "robin-demonio-fleur": return "Automatic on 3-star Robin. The normal nine-copy merge unlocks Demonio Fleur.";
    case "luffy-gear-4-boundman": return "3-star Luffy with retained Armament Wraps. The first retained catalyst selects the branch; an unlocked branch then stays locked.";
    case "luffy-gear-4-snakeman": return "3-star Luffy with retained Sniper Goggles. The first retained catalyst selects the branch; an unlocked branch then stays locked.";
    case "chopper-monster-point": return "Battle-temporary: base Chopper transforms after 8 seconds when the frozen starting team has an active Straw Hat tier. It resets after combat; it cannot be selected as a starting form.";
    default: return "Uses the production form's lifecycle and progression rules.";
  }
}

function statsText(stats: UnitStats, star: StarLevel, content: GameContent): string {
  const scale = content.config.starStatBasisPoints[star - 1] / 10_000;
  return `${star}★ base: HP ${Math.floor(stats.health * scale)}, Attack ${Math.floor(stats.attack * scale)}, Defense ${Math.floor(stats.defense * scale)}, Special Defense ${Math.floor((stats.specialDefense ?? stats.defense) * scale)}, Range ${stats.range}; attack ${stats.attackIntervalMs} ms, move ${stats.moveIntervalMs} ms. Equipment and active bonds apply in combat.`;
}

export function abilityReference(ability: AbilityDefinition | undefined, star: StarLevel, content: GameContent): string[] {
  if (!ability) return ["Basic attacks only; no active ability."];
  return [
    `${ability.name}: ${ability.description}`,
    `${titleCase(ability.effect)} · ${ability.effect === "damage" ? ability.damageType ?? "special" : "support"} · ${titleCase(ability.targeting)} · ${titleCase(ability.pattern)} · power ${Math.floor(ability.power * content.config.starAbilityBasisPoints[star - 1] / 10_000)} at ${star}★; cast animation ${ability.castAnimationMs} ms.`,
    ...["energyDrain", "defensePiercePercent", "stunMs", "burnPower", "burnDurationMs", "poisonDurationMs", "freezeMs", "sleepMs", "lockMs", "hits"].flatMap((key) => {
      const value = ability[key as keyof AbilityDefinition];
      return typeof value === "number" ? [`${titleCase(key.replace(/[A-Z]/g, (letter) => ` ${letter}`))}: ${value}`] : [];
    }),
    ...(ability.signatureMechanics?.map((mechanic) => `Movement: ${mechanic.kind}`) ?? []),
    ...(ability.sequentialStrike ? [`${ability.sequentialStrike.hitWeightsBasisPoints.length} sequential hits: ${ability.sequentialStrike.hitWeightsBasisPoints.map((weight) => `${weight / 100}%`).join(" / ")} of total power.${ability.sequentialStrike.retargetOnKill ? " Retargets to the nearest enemy in range after a kill." : ""}${ability.sequentialStrike.finalHitBonus ? ` Final hit deals ${ability.sequentialStrike.finalHitBonus.damageBonusPercent}% bonus damage below ${ability.sequentialStrike.finalHitBonus.healthThresholdPercent}% target HP.` : ""}`] : []),
    ...(ability.conditionalShield ? [`Emergency Shield power ${ability.conditionalShield.power} when below ${ability.conditionalShield.healthThresholdPercent}% HP.`] : []),
  ];
}

const STATUS_HELP: Record<keyof typeof STATUS_VISUALS, string> = {
  poison: "Poison: 1% Max HP per stack each second, up to 3 stacks; duration from source. True damage respects Shields/Protect, gives no damaged-Energy; Rain reduces damage 30%. Rune Protect blocks application.",
  freeze: "Freeze prevents actions without making the target immune or immovable. No refresh while active; Burn accelerates thaw ×2, Snow extends new Freeze ×1.3. Rune Protect blocks application.",
  sleep: "Sleep prevents actions; each effective damage hit reduces remaining Sleep by 300 ms. No refresh while active. Rune Protect blocks application.",
  locked: "Locked prevents moving, Lunge, Escape and forced displacement; range is 1. Attacks and other casts remain legal in range. No refresh while active; original range returns on expiry. Rune Protect blocks application.",
  stun: "Stun prevents the affected unit from acting until its duration expires.",
  burn: "Burn applies periodic damage for the duration specified by its source.",
  wound: "Wound blocks incoming healing. Its duration and source remain battle-local.",
  protect: "Protect temporarily prevents damage. Rune Protect blocks relevant control effects; emergency Shields absorb damage separately.",
  blind: "Blind affects basic attack accuracy; cannot-miss rules still apply.",
  paralysis: "Paralysis prevents the affected unit from dodging basic attacks for its duration.",
  "resistance-reduction": "Temporarily reduces defenses without rewriting the unit's permanent stats.",
  resurrecting: "Phoenix resurrection reserves its cell for two seconds. The unit is untargetable and cannot act during this delay.",
};

export function crewReference(content: GameContent, star: StarLevel = 1): ReferenceEntry[] {
  const entries: ReferenceEntry[] = content.units.map((base) => {
    const progressed = resolvePlannedUnit({ id: base.id, definitionId: base.id, star, items: [], position: { x: 0, y: 3 } }, content);
    const unit = resolveUnitDefinition(base.id, progressed.formId, content) ?? base;
    return {
      id: unit.id, category: "crew", name: unit.name, description: unit.ability.description,
      imagePath: content.forms.find((form) => form.id === progressed.formId)?.presentation?.portrait
        ?? createUnitReferenceView(unit, content).portrait,
      cost: unit.cost, traits: unit.traits,
      details: [statsText(unit.stats, star, content), ...abilityReference(unit.ability, star, content),
        `Bonds: ${unit.traits.map((id) => content.traits.find((trait) => trait.id === id)?.name ?? id).join(", ")}`,
        ...content.forms.filter((form) => form.baseDefinitionId === unit.id).map((form) => `${form.name}: ${formRequirementText(form.id)}`)],
    };
  });
  for (const weather of ["neutral", "rain", "snow"] as const) entries.push({
    id: `weather-${weather}`, category: "environment", name: `${titleCase(weather)} weather`, description: WEATHER_HELP[weather], traits: [],
    details: [`Sources: ${content.stages.filter(stage => stage.battleEnvironment?.weather === weather).map(stage => `R${stage.round} ${stage.name}`).join(", ") || "Default without an authored environment"}.`, "Explicit saved battle data; no random weather draw. Available in the isolated team planner."],
  });
  for (const kind of ["charged-deck", "frost-patch"] as const) entries.push({
    id: kind, category: "environment", name: titleCase(kind), description: FIELD_HELP[kind], traits: [],
    details: content.stages.flatMap(stage => (stage.battleEnvironment?.fields ?? []).filter(field => field.kind === kind).map(field => `R${stage.round} ${stage.name}: ${field.cells.map(cell => `${cell.x + 1}/${cell.y + 1}`).join(", ")} (column/row).`)),
  });
  for (const item of content.items) {
    const view = createItemView(item.id, content);
    entries.push({
      id: item.id, category: "items", name: item.name, description: item.description,
      imagePath: view.imagePath, traits: item.grantedTraitId ? [item.grantedTraitId] : [], kind: item.kind,
      details: [item.kind === "component" ? "Component: equipping a second component crafts their completed result." : "Completed treasure; duplicates on one holder are not legal.",
        ...view.effects.map((effect) => effect.label),
        ...(view.grantedTrait ? [`Grants ${view.grantedTrait.name}. Redundant native/form grants cannot be directly equipped.`] : []),
        ...(view.recipeComponents?.length ? [`Recipe: ${view.recipeComponents.map((part) => part.name).join(" + ")}`] : []),
        ...(view.recipeResults?.map((recipe) => `${item.name} + ${recipe.componentName} → ${recipe.resultName}`) ?? [])],
    });
  }
  for (const food of content.foods ?? []) entries.push({ id: food.id, category: "food", name: food.name, description: food.description,
    imagePath: food.assetPath, traits: [], kind: "consumable", details: [
      "Harbor supplies: Usopp R16/21 free; Franky R18/23 costs 2 gold. Food replaces one component option, not an extra reward.",
      "Galley capacity: 3 portions. During preparation, serve one meal to a deployed crew member. Consumes the portion immediately; no equipment slot or crafting recipe.",
      "One meal per preparation, next battle only. Selling, benching or merging away the recipient before battle forfeits it. Replays do not consume another portion.",
    ] });
  for (const trait of content.traits) entries.push({
    id: trait.id, category: "traits", name: trait.name, description: trait.description, traits: [trait.id],
    details: trait.tiers.map((tier) => `${tier.required} distinct crew · ${tier.effectScope ?? "team"}: ${tier.label}. ${tier.effects.map(describeTraitEffect).join("; ")}${tier.behaviors?.length ? `; ${tier.behaviors.map(describeTraitBehavior).join("; ")}` : ""}`),
  });
  for (const form of content.forms) {
    const unit = resolveUnitDefinition(form.baseDefinitionId, form.id, content);
    if (!unit) continue;
    entries.push({
      id: form.id, category: "forms", name: form.name, description: formRequirementText(form.id),
      imagePath: form.presentation?.portrait ?? createUnitReferenceView(unit, content).portrait,
      cost: unit.cost, traits: unit.traits, kind: form.lifecycle,
      details: [`Base crew: ${content.units.find((candidate) => candidate.id === form.baseDefinitionId)?.name ?? form.baseDefinitionId}. ${form.lifecycle}. Base economic identity/cost stays unchanged.`, statsText(unit.stats, star, content), ...abilityReference(unit.ability, star, content)],
    });
  }
  for (const [id, visual] of Object.entries(STATUS_VISUALS)) entries.push({
    id, category: "status", name: titleCase(id), description: STATUS_HELP[id as keyof typeof STATUS_VISUALS], imagePath: visual.imagePath, details: [], traits: [],
  });
  for (const enemy of content.enemies) entries.push({
    id: enemy.id, category: "pve", name: enemy.name, description: "PvE only — never sold in the shop or reserved from the shared crew pool.",
    imagePath: createUnitReferenceView(enemy, content).portrait, traits: [],
    details: [statsText(enemy.stats, star, content), ...abilityReference(enemy.ability, star, content),
      `Waves: ${content.stages.filter((stage) => stage.enemyWave?.some((entry) => entry.enemyId === enemy.id)).map((stage) => `R${stage.round} ${stage.name}`).join(", ") || "Legacy combat/save archetype"}`],
  });
  for (let round = 1; round <= 40; round += 1) {
    const stage = getStageDefinition(round, content);
    const reward = stage.itemReward;
    entries.push({
      id: `round-${round}`, category: "rounds", name: `R${round} · ${stage.name}`, description: titleCase(stage.kind), traits: [], kind: stage.kind,
      details: [`Preparation ${stage.preparationSeconds}s · combat cap ${stage.battleSeconds}s (combat stages only).`,
        ...(stage.enemyWave?.map((entry) => `${entry.count} × ${content.enemies.find((enemy) => enemy.id === entry.enemyId)?.name ?? entry.enemyId}`) ?? []),
        ...(reward ? [`${reward.trigger}: ${reward.mode === "choice" ? `choose ${reward.amount} of ${reward.offerCount ?? reward.amount}` : `grant ${reward.amount}`} ${reward.itemKind} item(s)${reward.excludeTraitGrantItems ? "; trait grants excluded" : ""}.`] : []),
        ...(stage.kind === "carousel" ? [`Bounty Regatta: ${stage.carouselItemKind ?? "component"} treasure.`] : []),
        ...(stage.kind === "voyage-choice" ? [`Choose one of three cost-${stage.voyageRecruitCost} recruits, lower-band fallback only if needed; full bench converts to gold. No combat or item reward.`] : []),
        ...(round === 40 ? ["After round 40, unlisted rounds use the normal PvP fallback."] : [])],
    });
  }
  entries.push({ id: "first-crew", category: "voyage", name: "First Crew", description: "Choose an existing cost-1 starter before Round 1; normal 1-gold price, not extra starting resources.", traits: [], kind: "starter",
    details: ["Three distinct reserved offers; skip is free. Full bench converts the reserved copy to normal gold value.", "23 seconds; tutorial lessons pause the clock. Legacy preparations never receive another starter."] });
  for (const route of content.recruitmentRoutes) entries.push({ id: route.id, category: "voyage", name: route.name, description: "R10/R20 origin-focused recruitment with an open-sea wildcard.", traits: route.traits, kind: "recruitment",
    details: ["Distinct owned definitions choose the route; up to two focused seeds, then an unrestricted primary-band fill.", ...route.unitIds.map(id => content.units.find(unit => unit.id === id)?.name ?? id), "Primary cost band is exhausted before lower-band fallback; all offered copies are reserved."] });
  for (const encounter of content.harborEncounters) entries.push({ id: encounter.id, category: "voyage", name: encounter.name, description: encounter.goldCost ? "Optional component or food supplies; sail on free." : "Choose one component or food gift, or sail on.", traits: [], kind: encounter.goldCost ? "trade" : "gift",
    imagePath: content.units.find(unit => unit.id === encounter.portraitUnitId)?.assetPath,
    details: [`Rounds ${encounter.rounds.join(" / ")}; ${encounter.goldCost} gold per chosen supply.`, `${encounter.offerCount} options total; ${encounter.foodOffer ? "one food option, remaining components" : "components"}. Full galley disables food without charging gold.`, "Normal round preparation and combat still follow; no extra income or PvE replacement.", `Harbor budget: ${content.voyageTiming.harborBaseSeconds}s + ${content.voyageTiming.harborPerPlayerSeconds}s per living captain; settings/background pause.`] });
  return entries;
}

export function filterReference(entries: ReferenceEntry[], filter: { category: ReferenceCategory; query: string; cost?: number; trait?: string; kind?: string }): ReferenceEntry[] {
  const words = filter.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter((entry) => entry.category === filter.category &&
    (!filter.cost || entry.cost === filter.cost) && (!filter.trait || entry.traits.includes(filter.trait)) &&
    (!filter.kind || entry.kind === filter.kind) && words.every((word) =>
      [entry.name, entry.id, entry.description, ...entry.details, ...entry.traits].join(" ").toLowerCase().includes(word)));
}
