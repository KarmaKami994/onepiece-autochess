import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { preservesActiveBattleTimeline } from "../components/PhaserBoard";

const projectRoot = path.resolve(import.meta.dirname, "..");
const source = (file: string) => readFile(path.join(projectRoot, file), "utf8");

describe("Phase 3 combat presentation", () => {
  it("preserves readable engine events instead of flattening them to abilities", async () => {
    const client = await source("app/GameClient.tsx");
    for (const eventKind of [
      "shield",
      "energy",
      "dodge",
      "status",
      "buff",
      "cast",
    ]) {
      expect(client).toContain(`? \"${eventKind}\"`);
    }
    expect(client).toContain("targetIds,");
    expect(client).toContain("healthDamage:");
    expect(client).toContain("shieldDamage:");
    expect(client).not.toContain('? "ability"');
  });

  it("keeps combat feedback renderer-only and exposes all readability cues", async () => {
    const [board, vfx] = await Promise.all([
      source("components/PhaserBoard.tsx"),
      source("components/battleVfx.ts"),
    ]);

    expect(board).not.toMatch(/from ["'](?:@\/)?game/);
    expect(vfx).not.toMatch(/from ["'](?:@\/)?game/);
    for (const cue of [
      "energyBars",
      "shieldBars",
      "statusLabels",
      "DODGE",
      "CRIT ",
      "SHIELD",
      "abilityName",
    ]) {
      expect(board).toContain(cue);
    }
    expect(vfx).toContain("telegraph:");
    expect(vfx).toContain('shape: "target" | "line" | "area"');
  });

  it("offers persistent presentation controls and clear battle actions", async () => {
    const [client, css] = await Promise.all([
      source("app/GameClient.tsx"),
      source("app/game.css"),
    ]);

    expect(client).toContain("combatNumbers: true");
    expect(client).toContain("reducedMotion: false");
    expect(client).toContain("START BATTLE");
    expect(client).toContain("SKIP ANIMATION");
    expect(client).toContain("Battle animation speed");
    expect(client).toContain("tutorial-combat-legend");
    expect(client).toContain(
      "numberValue(engine.CURRENT_SAVE_SCHEMA_VERSION, 4)",
    );
    expect(css).toContain(".game-shell.reduced-motion");
    expect(css).toContain(".combat-hud");
  });

  it("does not rebuild an active battle timeline for selection-only syncs", () => {
    const units: [] = [];
    const current = {
      units,
      selectedId: null,
      interactive: false,
      phase: "battle",
      capacity: 2,
      boardSkin: "pirate-ship" as const,
    };

    expect(
      preservesActiveBattleTimeline(current, {
        ...current,
        selectedId: "player-1:luffy",
      }),
    ).toBe(true);
    expect(
      preservesActiveBattleTimeline(current, {
        ...current,
        units: [...units],
      }),
    ).toBe(false);
    expect(
      preservesActiveBattleTimeline(current, {
        ...current,
        phase: "preparation",
      }),
    ).toBe(false);
  });
});
