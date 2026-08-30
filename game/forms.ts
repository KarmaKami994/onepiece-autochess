import { DEFAULT_CONTENT, getUnitDefinition } from "./content";
import type {
  GameContent,
  UnitDefinition,
  UnitFormDefinition,
  UnitInstance,
} from "./types";

const ROBIN_DEMONIO_FLEUR_FORM_ID = "robin-demonio-fleur";
const LUFFY_GEAR_4_BOUNDMAN_FORM_ID = "luffy-gear-4-boundman";
const LUFFY_GEAR_4_SNAKEMAN_FORM_ID = "luffy-gear-4-snakeman";

export function getUnitFormDefinition(
  formId: string | null | undefined,
  content: Pick<GameContent, "forms"> = DEFAULT_CONTENT,
): UnitFormDefinition | null {
  if (!formId) return null;
  return content.forms.find((form) => form.id === formId) ?? null;
}

export function resolveUnitDefinition(
  baseDefinitionId: string,
  formId: string | null | undefined,
  content: Pick<GameContent, "units" | "forms"> = DEFAULT_CONTENT,
): UnitDefinition | null {
  const base = getUnitDefinition(baseDefinitionId, content);
  const form = getUnitFormDefinition(formId, content);
  if (!base || !form || form.baseDefinitionId !== base.id) {
    return base;
  }
  return {
    ...base,
    name: form.name,
    stats: { ...base.stats, ...form.stats },
    ability: form.ability ?? base.ability,
    traits: form.traits ? [...form.traits] : base.traits,
  };
}

export function resolvePersistentFormId(
  instance: Pick<UnitInstance, "definitionId" | "formId">,
  content: Pick<GameContent, "forms"> = DEFAULT_CONTENT,
): string | null {
  const form = getUnitFormDefinition(instance.formId, content);
  return form?.baseDefinitionId === instance.definitionId &&
    form.lifecycle === "persistent"
    ? form.id
    : null;
}

export function reconcileProductionFormProgression(
  instance: UnitInstance,
  content: Pick<GameContent, "forms"> = DEFAULT_CONTENT,
): void {
  if (instance.definitionId === "robin") {
    if (instance.star === 3) {
      const form = getUnitFormDefinition(ROBIN_DEMONIO_FLEUR_FORM_ID, content);
      if (
        form?.baseDefinitionId === "robin" &&
        form.lifecycle === "persistent"
      ) {
        instance.formId = form.id;
      }
      return;
    }
    if (instance.formId === ROBIN_DEMONIO_FLEUR_FORM_ID) {
      delete instance.formId;
    }
    return;
  }

  if (instance.definitionId !== "luffy") return;
  const hasGearFourForm =
    instance.formId === LUFFY_GEAR_4_BOUNDMAN_FORM_ID ||
    instance.formId === LUFFY_GEAR_4_SNAKEMAN_FORM_ID;
  if (instance.star !== 3) {
    if (hasGearFourForm) delete instance.formId;
    return;
  }
  if (instance.formId) return;

  for (const itemId of instance.items) {
    const formId = itemId === "armament-wraps"
      ? LUFFY_GEAR_4_BOUNDMAN_FORM_ID
      : itemId === "sniper-goggles"
        ? LUFFY_GEAR_4_SNAKEMAN_FORM_ID
        : null;
    if (!formId) continue;
    const form = getUnitFormDefinition(formId, content);
    if (form?.baseDefinitionId === "luffy" && form.lifecycle === "persistent") {
      instance.formId = form.id;
    }
    return;
  }
}
