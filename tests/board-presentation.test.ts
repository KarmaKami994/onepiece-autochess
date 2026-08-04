import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  facingFromHorizontalDelta,
  initialBoardFacing,
  mirroredOriginX,
} from "../components/boardFacing";
import {
  BOARD_MAP_LIST,
  DEFAULT_BOARD_SKIN,
  getBoardMapDefinition,
  isBoardSkin,
} from "../components/boardMapManifest";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("board presentation", () => {
  it("keeps direction changes stable across vertical movement", () => {
    expect(initialBoardFacing("player")).toBe("right");
    expect(initialBoardFacing("enemy")).toBe("left");
    expect(facingFromHorizontalDelta(20, "left")).toBe("right");
    expect(facingFromHorizontalDelta(-20, "right")).toBe("left");
    expect(facingFromHorizontalDelta(1, "left")).toBe("left");
    expect(mirroredOriginX(0.42, "right")).toBeCloseTo(0.42);
    expect(mirroredOriginX(0.42, "left")).toBeCloseTo(0.58);
  });

  it("exposes two validated local map skins with a safe fallback", () => {
    expect(BOARD_MAP_LIST.map((map) => map.id)).toEqual([
      "pirate-ship",
      "marine-harbor",
    ]);
    expect(isBoardSkin("pirate-ship")).toBe(true);
    expect(isBoardSkin("marine-harbor")).toBe(true);
    expect(isBoardSkin("unknown-map")).toBe(false);
    expect(getBoardMapDefinition("unknown-map").id).toBe(DEFAULT_BOARD_SKIN);
  });

  it("bundles both 1520 by 840 PNG battlefields", async () => {
    for (const map of BOARD_MAP_LIST) {
      const bytes = await readFile(
        path.join(projectRoot, "public", map.assetPath.replace(/^\//, "")),
      );
      expect([...bytes.subarray(0, 8)]).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
      expect(bytes.readUInt32BE(16)).toBe(1520);
      expect(bytes.readUInt32BE(20)).toBe(840);
      expect(bytes.length).toBeGreaterThan(100_000);
    }
  });

  it("keeps visual effects renderer-only and records map provenance", async () => {
    const vfx = await readFile(
      path.join(projectRoot, "components", "battleVfx.ts"),
      "utf8",
    );
    expect(vfx).not.toMatch(/from ["'](?:@\/)?game/);
    for (const effect of [
      "slash",
      "fireProjectile",
      "smokeBurst",
      "lightningStrike",
      "impact",
      "shield",
      "heal",
    ]) {
      expect(vfx).toContain(`${effect}:`);
    }

    const provenance = await readFile(
      path.join(projectRoot, "ASSET_PROVENANCE.md"),
      "utf8",
    );
    expect(provenance).toContain("public/assets/maps/pirate-ship.png");
    expect(provenance).toContain("public/assets/maps/marine-harbor.png");
  });
});
