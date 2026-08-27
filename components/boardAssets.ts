import {
  crewSheetKey,
  getCrewAnimationDefinitions,
  type CrewAnimationDefinition,
} from "./crewAnimationManifest";
import { getBoardMapDefinition, type BoardSkin } from "./boardMapManifest";

export type VisibleUnitAsset = Readonly<{ contentId: string }>;

export function animationCandidates(contentId: string): CrewAnimationDefinition[] {
  return [...getCrewAnimationDefinitions(contentId)].reverse();
}

export function preferredAnimation(
  contentId: string,
): CrewAnimationDefinition | null {
  return animationCandidates(contentId)[0] ?? null;
}

export function uniqueVisibleContentIds(units: readonly VisibleUnitAsset[]) {
  return [...new Set(units.map((unit) => unit.contentId))].sort();
}

export function resolveInitialBoardAssets(
  units: readonly VisibleUnitAsset[],
  boardSkin: BoardSkin,
) {
  return {
    map: getBoardMapDefinition(boardSkin),
    animations: uniqueVisibleContentIds(units).flatMap((contentId) => {
      const definition = preferredAnimation(contentId);
      return definition ? [definition] : [];
    }),
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
  return uniqueVisibleContentIds(units).flatMap((contentId) => {
    const candidates = animationCandidates(contentId);
    if (candidates.some((definition) =>
      status.textureExists(crewSheetKey(definition.assetKey)))) {
      return [];
    }
    const next = candidates.find((definition) => {
      const key = crewSheetKey(definition.assetKey);
      return !status.requestedKeys.has(key) && !status.failedKeys.has(key);
    });
    return next ? [next] : [];
  });
}
