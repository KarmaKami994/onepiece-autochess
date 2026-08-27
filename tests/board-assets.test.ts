import { describe, expect, it } from "vitest";
import {
  animationCandidates,
  resolveInitialBoardAssets,
  resolveMissingAnimationDefinitions,
} from "../components/boardAssets";
import { crewSheetKey } from "../components/crewAnimationManifest";

describe("lazy board asset resolution", () => {
  it("loads only the current map and one preferred sheet per visible unit", () => {
    const plan = resolveInitialBoardAssets(
      [{ contentId: "luffy" }, { contentId: "luffy" }, { contentId: "nami" }],
      "marine-harbor",
    );
    expect(plan.map.id).toBe("marine-harbor");
    expect(plan.animations.map((definition) => definition.contentId)).toEqual([
      "luffy",
      "nami",
    ]);
    expect(plan.animations.every((definition) => definition.version === "v2"))
      .toBe(true);
  });

  it("requests legacy fallback only after the preferred sheet fails", () => {
    const candidates = animationCandidates("luffy");
    const preferredKey = crewSheetKey(candidates[0].assetKey);
    const next = resolveMissingAnimationDefinitions(
      [{ contentId: "luffy" }],
      {
        textureExists: () => false,
        requestedKeys: new Set([preferredKey]),
        failedKeys: new Set([preferredKey]),
      },
    );
    expect(next).toHaveLength(1);
    expect(next[0].version).toBe("v1");
  });

  it("does not request any variant when a candidate texture is cached", () => {
    const key = crewSheetKey(animationCandidates("nami")[0].assetKey);
    expect(resolveMissingAnimationDefinitions(
      [{ contentId: "nami" }],
      {
        textureExists: (candidate) => candidate === key,
        requestedKeys: new Set(),
        failedKeys: new Set(),
      },
    )).toEqual([]);
  });
});
