import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  interactionAllowsDestination,
  interactionAllowsUnit,
  preservesActiveBattleTimeline,
  type BoardUnit,
} from "../components/PhaserBoard";
import {
  standingsInteraction,
  tacticalInteractionMode,
} from "../app/screens/GameScreens";

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
      "ability-hit",
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
    expect(selector).toContain("hitIndex: event.hitIndex");
    expect(selector).toContain("finisher: event.finisher");
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
      "sequentialAbilityHitDelayMs",
      'event.kind === "ability-hit"',
      'event.kind === "displace"',
      'event.movementKind === "lunge"',
    ]) {
      expect(board).toContain(cue);
    }
    expect(vfx).toContain("telegraph:");
    expect(vfx).toContain('shape: "target" | "line" | "area"');
  });

  it("offers persistent presentation controls and clear battle actions", async () => {
    const [client, persistence, screens, css] = await Promise.all([
      source("app/GameClient.tsx"),
      source("app/voyagePersistence.ts"),
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
    expect(client).toContain("createVoyageSaveEnvelope");
    expect(persistence).toContain("schemaVersion: CURRENT_SAVE_SCHEMA_VERSION");
    expect(css).toContain(".game-shell.reduced-motion");
    expect(css).toContain(".combat-hud");
  });

  it("preserves the deployed timeline across live battle-bench updates", () => {
    const fighter: BoardUnit = {
      id: "player-1:luffy",
      contentId: "luffy",
      name: "Luffy",
      shortName: "Luffy",
      color: 0,
      team: "player",
      zone: "board",
      x: 0,
      y: 5,
      slot: 0,
      star: 1,
      items: [],
      hp: 500,
      maxHp: 500,
    };
    const bench: BoardUnit = {
      ...fighter,
      id: "player-1:nami",
      contentId: "nami",
      name: "Nami",
      shortName: "Nami",
      zone: "bench",
      slot: 0,
    };
    const current = {
      units: [fighter, bench],
      selectedId: null,
      interactionMode: "bench-only" as const,
      phase: "battle",
      capacity: 2,
      boardSkin: "pirate-ship" as const,
    };

    expect(
      preservesActiveBattleTimeline(current, {
        ...current,
        selectedId: bench.id,
      }),
    ).toBe(true);
    expect(
      preservesActiveBattleTimeline(current, {
        ...current,
        units: [fighter, { ...bench, slot: 3 }],
      }),
    ).toBe(true);
    expect(
      preservesActiveBattleTimeline(current, {
        ...current,
        units: [fighter],
      }),
    ).toBe(true);
    expect(
      preservesActiveBattleTimeline(current, {
        ...current,
        units: [fighter, bench, { ...bench, id: "player-1:usopp", slot: 1 }],
      }),
    ).toBe(true);
    expect(
      preservesActiveBattleTimeline(current, {
        ...current,
        units: [{ ...fighter, star: 2 }, bench],
      }),
    ).toBe(false);
    expect(
      preservesActiveBattleTimeline(current, {
        ...current,
        phase: "preparation",
      }),
    ).toBe(false);
  });

  it("allows only bench units and bench destinations in combat interaction", () => {
    expect(
      interactionAllowsUnit("bench-only", { team: "player", zone: "bench" }),
    ).toBe(true);
    expect(
      interactionAllowsUnit("bench-only", { team: "player", zone: "board" }),
    ).toBe(false);
    expect(
      interactionAllowsDestination("bench-only", { zone: "bench" }),
    ).toBe(true);
    expect(
      interactionAllowsDestination("bench-only", { zone: "board" }),
    ).toBe(false);
    expect(
      interactionAllowsDestination("formation", { zone: "board" }),
    ).toBe(true);
  });

  it("keeps scouting, own combat, and observed combat interaction distinct", () => {
    expect(tacticalInteractionMode("preparation", false, false)).toBe(
      "formation",
    );
    expect(tacticalInteractionMode("preparation", true, false)).toBe("none");
    expect(tacticalInteractionMode("battle", false, false)).toBe("bench-only");
    expect(tacticalInteractionMode("battle", true, false)).toBe("none");
    expect(standingsInteraction("preparation", false)).toBe("scout");
    expect(standingsInteraction("battle", false)).toBe("watch");
    expect(standingsInteraction("battle", true)).toBeNull();
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
