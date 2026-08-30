import { DEFAULT_CONTENT, getUnitDefinition } from "./content";
import type {
  GameContent,
  UnitDefinition,
  UnitFormDefinition,
  UnitInstance,
} from "./types";

const ROBIN_DEMONIO_FLEUR_FORM_ID = "robin-demonio-fleur";

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

export function reconcileRobinProgressionForm(
  instance: UnitInstance,
  content: Pick<GameContent, "forms"> = DEFAULT_CONTENT,
): void {
  if (instance.definitionId !== "robin") return;
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
}
