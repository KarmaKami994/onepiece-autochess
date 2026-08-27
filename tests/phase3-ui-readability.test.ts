import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { preservesActiveBattleTimeline } from "../components/PhaserBoard";

const projectRoot = path.resolve(import.meta.dirname, "..");
const source = (file: string) => readFile(path.join(projectRoot, file), "utf8");

describe("Phase 3 combat presentation", () => {
  it("preserves readable engine events instead of flattening them to abilities", async () => {
    const selector = await source("app/selectors.ts");
    for (const eventKind of [
      "shield",
      "energy",
      "dodge",
      "status",
      "buff",
      "cast",
      "displace",
    ]) {
      const domainKind = eventKind === "displace" ? "unit-displace" : eventKind;
      expect(selector).toContain(`event.type === "${domainKind}"`);
    }
    expect(selector).toContain("targetIds: [...event.targetIds]");
    expect(selector).toContain("healthDamage: event.healthDamage");
    expect(selector).toContain("shieldDamage: event.shieldDamage");
    expect(selector).toContain("movementKind: event.movementKind");
    expect(selector).toContain("from: point(event.from)");
    expect(selector).toContain("to: point(event.to)");
    expect(selector).not.toContain('? "ability"');
  });

  it("keeps combat feedback renderer-only and exposes all readability cues", async () => {
    const [board, vfx] = await Promise.all([
      source("components/PhaserBoard.tsx"),
      source("components/battleVfx.ts"),
    ]);

    expect(board).not.toMatch(/from ["'](?:@\/)?game/);
    expect(vfx).not.toMatch(/from ["'](?:@\/)?game/);
    for (const cue of [
      "resourceBars",
      "transitionResourceBar",
      "statusLabels",
      "DODGE",
      "CRIT ",
      "SHIELD",
      "abilityName",
      "playLungeTrail",
      'event.kind === "displace"',
      'event.movementKind === "lunge"',
    ]) {
      expect(board).toContain(cue);
    }
    expect(vfx).toContain("telegraph:");
    expect(vfx).toContain('shape: "target" | "line" | "area"');
  });

  it("offers persistent presentation controls and clear battle actions", async () => {
    const [client, screens, css] = await Promise.all([
      source("app/GameClient.tsx"),
      source("app/screens/GameScreens.tsx"),
      source("app/game.css"),
    ]);

    expect(client).toContain("combatNumbers: true");
    expect(client).toContain("reducedMotion: false");
    expect(screens).toContain("START BATTLE");
    expect(screens).toContain("SKIP ANIMATION");
    expect(screens).toContain("Battle animation speed");
    for (const speed of ["0.5×", "1×", "2×", "4×"]) {
      expect(screens).toContain(speed);
    }
    expect(screens).toContain("tutorial-combat-legend");
    expect(client).toContain("schemaVersion: engine.CURRENT_SAVE_SCHEMA_VERSION");
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

  it("refits the tactical camera when returning from a differently sized scene", async () => {
    const board = await source("components/PhaserBoard.tsx");

    expect(board).toContain("new ResizeObserver(refreshLayout)");
    expect(board).toContain("resizeObserver.observe(stageElement)");
    expect(board).toContain("resizeObserver.observe(boardColumn)");
    expect(board).toContain(
      "bridgeRef.current?.refreshLayout(bounds.width, bounds.height)",
    );
    expect(board).toContain('canvasStyle.width = "100%"');
    expect(board).toContain('canvasStyle.height = "100%"');
  });
});
