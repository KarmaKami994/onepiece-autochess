import {
  crewSheetKey,
  getCrewAnimationDefinitions,
  type CrewAnimationDefinition,
} from "./crewAnimationManifest";
import { getBoardMapDefinition, type BoardSkin } from "./boardMapManifest";

export type VisibleUnitAsset = Readonly<{ contentId: string; formId?: string }>;

export function animationCandidates(contentId: string, formId?: string): CrewAnimationDefinition[] {
  return [...getCrewAnimationDefinitions(contentId, formId)].reverse();
}

export function preferredAnimation(
  contentId: string,
  formId?: string,
): CrewAnimationDefinition | null {
  return animationCandidates(contentId, formId)[0] ?? null;
}

export function uniqueVisibleContentIds(units: readonly VisibleUnitAsset[]) {
  return [...new Set(units.map((unit) => unit.contentId))].sort();
}

function visibleIdentities(units: readonly VisibleUnitAsset[]) {
  return [...new Map(units.map((unit) => [
    JSON.stringify([unit.contentId, unit.formId ?? null]), unit,
  ])).entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, unit]) => unit);
}

function uniqueSheets(definitions: CrewAnimationDefinition[]) {
  return [...new Map(definitions.map((definition) => [definition.assetKey, definition])).values()];
}

export function resolveInitialBoardAssets(
  units: readonly VisibleUnitAsset[],
  boardSkin: BoardSkin,
) {
  return {
    map: getBoardMapDefinition(boardSkin),
    animations: uniqueSheets(visibleIdentities(units).flatMap(({ contentId, formId }) => {
      const definition = preferredAnimation(contentId, formId);
      return definition ? [definition] : [];
    })),
  };
}

export function resolveMissingAnimationDefinitions(
  units: readonly VisibleUnitAsset[],
  status: {
    textureExists: (key: string) => boolean;
    requestedKeys: ReadonlySet<string>;
    failedKeys: ReadonlySet<string>;
  },
): CrewAnimationDefinition[] {
  return uniqueSheets(visibleIdentities(units).flatMap(({ contentId, formId }) => {
    const candidates = animationCandidates(contentId, formId);
    const cached = candidates.findIndex((definition) => status.textureExists(crewSheetKey(definition.assetKey)));
    const missing = cached < 0 ? candidates : candidates.slice(0, cached);
    const next = missing.find((definition) => {
      const key = crewSheetKey(definition.assetKey);
      return !status.requestedKeys.has(key) && !status.failedKeys.has(key);
    });
    return next ? [next] : [];
  }));
}
