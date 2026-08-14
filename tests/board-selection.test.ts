import { describe, expect, it } from "vitest";
import {
  resolvePurchaseSelection,
  retainValidBoardSelection,
  type BoardSelectionUnit,
} from "../components/boardSelection";

function unit(
  id: string,
  overrides: Partial<BoardSelectionUnit> = {},
): BoardSelectionUnit {
  return {
    id,
    contentId: "nami",
    team: "player",
    zone: "bench",
    star: 1,
    slot: 0,
    ...overrides,
  };
}

describe("board purchase selection", () => {
  it("selects the newly purchased bench copy", () => {
    const before = [unit("existing", { contentId: "usopp" })];
    const after = [
      ...before,
      unit("purchased", { slot: 3 }),
      unit("enemy-copy", { team: "enemy", zone: "board", x: 0, y: 0 }),
    ];

    expect(resolvePurchaseSelection(before, after, "nami")).toBe(
      "purchased",
    );
  });

  it("selects the deployed anchor retained by a merge", () => {
    const before = [
      unit("deployed-anchor", { zone: "board", x: 2, y: 5 }),
      unit("bench-copy", { slot: 1 }),
    ];
    const after = [
      unit("deployed-anchor", {
        zone: "board",
        x: 2,
        y: 5,
        star: 2,
      }),
    ];

    expect(resolvePurchaseSelection(before, after, "nami")).toBe(
      "deployed-anchor",
    );
  });

  it("clears stale selections while retaining canonical IDs", () => {
    const units = [unit("survivor")];

    expect(retainValidBoardSelection("survivor", units)).toBe("survivor");
    expect(retainValidBoardSelection("consumed-copy", units)).toBeNull();
    expect(retainValidBoardSelection(null, units)).toBeNull();
  });
});
