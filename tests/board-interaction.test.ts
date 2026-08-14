import { describe, expect, it } from "vitest";
import {
  ANIMATED_BENCH_HIT_AREA,
  ANIMATED_BOARD_HIT_AREA,
  BENCH_DESTINATIONS,
  BOARD_GEOMETRY,
  MAP_BACKDROP_ANCHOR,
  PLANNING_DESTINATIONS,
  PLAYER_BOARD_DESTINATIONS,
  TACTICAL_WORLD_BOUNDS,
  benchSlotCenter,
  boardCellCenter,
  boardDestinationAtPoint,
  boardDestinationCenter,
  boardDestinationTarget,
  gameplayCameraFrame,
  gameplayWorldPointToScreen,
  proportionalCoverSize,
  safeScreenBoundsWithinStage,
  symmetricBackdropTarget,
} from "../components/boardGeometry";

describe("board interaction geometry", () => {
  it("centers the unchanged eight-column arena in the 1000x420 world", () => {
    expect(BOARD_GEOMETRY).toMatchObject({
      worldWidth: 1_000,
      worldHeight: 420,
      columns: 8,
      rows: 6,
      cellWidth: 78,
      cellHeight: 48,
      gridX: 188,
      gridY: 34,
      benchCenterY: 370,
    });
    expect(
      BOARD_GEOMETRY.gridX * 2 +
        BOARD_GEOMETRY.columns * BOARD_GEOMETRY.cellWidth,
    ).toBe(BOARD_GEOMETRY.worldWidth);
    expect(boardCellCenter(0, 0)).toEqual({ x: 227, y: 58 });
    expect(boardCellCenter(7, 5)).toEqual({ x: 773, y: 298 });
  });

  it("uses one exact center and target rectangle for clicks, hover, and drops", () => {
    expect(PLAYER_BOARD_DESTINATIONS).toHaveLength(24);
    expect(BENCH_DESTINATIONS).toHaveLength(8);
    expect(PLANNING_DESTINATIONS).toHaveLength(32);

    for (const destination of PLANNING_DESTINATIONS) {
      const center = boardDestinationCenter(destination);
      const target = boardDestinationTarget(destination);
      expect(target.center).toEqual(center);
      expect(boardDestinationAtPoint(center.x, center.y)).toEqual(destination);
    }

    expect(benchSlotCenter(0)).toEqual({ x: 227, y: 370 });
    expect(benchSlotCenter(7)).toEqual({ x: 773, y: 370 });
    expect(boardDestinationCenter({ zone: "board", x: 0, y: 3 })).toEqual({
      x: 227,
      y: 202,
    });
  });

  it("has no dead edge between adjacent targets and excludes enemy rows", () => {
    expect(boardDestinationAtPoint(265.99, 202)).toEqual({
      zone: "board",
      x: 0,
      y: 3,
    });
    expect(boardDestinationAtPoint(266, 202)).toEqual({
      zone: "board",
      x: 1,
      y: 3,
    });
    expect(boardDestinationAtPoint(266, 370)).toEqual({
      zone: "bench",
      slot: 1,
    });
    expect(boardDestinationAtPoint(227, 58)).toBeUndefined();
    expect(boardDestinationAtPoint(500, 330)).toBeUndefined();
  });

  it("classifies a drag from pointer world coordinates instead of its grabbed container offset", () => {
    const pointer = benchSlotCenter(2);
    const offCenterDraggedContainer = {
      x: pointer.x - 45,
      y: pointer.y,
    };

    expect(boardDestinationAtPoint(pointer.x, pointer.y)).toEqual({
      zone: "bench",
      slot: 2,
    });
    expect(
      boardDestinationAtPoint(
        offCenterDraggedContainer.x,
        offCenterDraggedContainer.y,
      ),
    ).toEqual({ zone: "bench", slot: 1 });
  });

  it("keeps a tall hitbox without overlapping adjacent columns", () => {
    const spriteTop = 12 - (116 / 128) * 88;
    const spriteBottom = spriteTop + 88;
    expect(ANIMATED_BOARD_HIT_AREA.width).toBeLessThan(
      BOARD_GEOMETRY.cellWidth,
    );
    expect(
      ANIMATED_BOARD_HIT_AREA.x + ANIMATED_BOARD_HIT_AREA.width / 2,
    ).toBe(0);
    expect(ANIMATED_BOARD_HIT_AREA.y).toBeLessThanOrEqual(spriteTop);
    expect(
      ANIMATED_BOARD_HIT_AREA.y + ANIMATED_BOARD_HIT_AREA.height,
    ).toBeGreaterThanOrEqual(spriteBottom);
    expect(
      ANIMATED_BOARD_HIT_AREA.y + ANIMATED_BOARD_HIT_AREA.height / 2,
    ).toBeLessThan(0);
    expect(ANIMATED_BENCH_HIT_AREA.width).toBeLessThan(
      BOARD_GEOMETRY.cellWidth,
    );
    expect(ANIMATED_BENCH_HIT_AREA.y).toBeLessThan(0);
    expect(
      ANIMATED_BENCH_HIT_AREA.y + ANIMATED_BENCH_HIT_AREA.height,
    ).toBeGreaterThan(0);
  });

  it("fits every tactical corner inside the real board-column safe rect", () => {
    const layouts = [
      {
        name: "1280x720",
        viewport: { width: 1_280, height: 500 },
        stage: { left: 0, top: 56, right: 1_280, bottom: 556 },
        column: { left: 203, top: 62, right: 1_047, bottom: 551 },
      },
      {
        name: "1280x800",
        viewport: { width: 1_280, height: 580 },
        stage: { left: 0, top: 56, right: 1_280, bottom: 636 },
        column: { left: 203, top: 62, right: 1_047, bottom: 631 },
      },
      {
        name: "1920x1080",
        viewport: { width: 1_920, height: 860 },
        stage: { left: 0, top: 56, right: 1_920, bottom: 916 },
        column: { left: 203, top: 62, right: 1_687, bottom: 911 },
      },
    ];
    const tacticalCorners = [
      { x: TACTICAL_WORLD_BOUNDS.left, y: TACTICAL_WORLD_BOUNDS.top },
      { x: TACTICAL_WORLD_BOUNDS.right, y: TACTICAL_WORLD_BOUNDS.top },
      { x: TACTICAL_WORLD_BOUNDS.left, y: TACTICAL_WORLD_BOUNDS.bottom },
      { x: TACTICAL_WORLD_BOUNDS.right, y: TACTICAL_WORLD_BOUNDS.bottom },
    ];

    for (const layout of layouts) {
      const safeBounds = safeScreenBoundsWithinStage(
        layout.stage,
        layout.column,
        layout.viewport.width,
        layout.viewport.height,
      );
      expect(safeBounds, layout.name).toBeDefined();
      const frame = gameplayCameraFrame(
        layout.viewport.width,
        layout.viewport.height,
        safeBounds,
      );
      expect(frame.zoom, layout.name).toBeGreaterThan(1);

      for (const corner of tacticalCorners) {
        const screen = gameplayWorldPointToScreen(
          corner,
          frame,
          layout.viewport.width,
          layout.viewport.height,
        );
        expect(screen.x, `${layout.name} x`).toBeGreaterThanOrEqual(
          safeBounds!.left - 0.001,
        );
        expect(screen.x, `${layout.name} x`).toBeLessThanOrEqual(
          safeBounds!.right + 0.001,
        );
        expect(screen.y, `${layout.name} y`).toBeGreaterThanOrEqual(
          safeBounds!.top - 0.001,
        );
        expect(screen.y, `${layout.name} y`).toBeLessThanOrEqual(
          safeBounds!.bottom + 0.001,
        );
      }

      const seaKingTop = gameplayWorldPointToScreen(
        { x: 500, y: -13.6 },
        frame,
        layout.viewport.width,
        layout.viewport.height,
      );
      expect(seaKingTop.y, layout.name).toBeGreaterThan(safeBounds!.top);
    }
  });

  it("keeps a fixed-anchor proportional backdrop behind an offset camera", () => {
    const safeBounds = safeScreenBoundsWithinStage(
      { left: 0, top: 56, right: 1_280, bottom: 636 },
      { left: 203, top: 62, right: 1_047, bottom: 631 },
      1_280,
      580,
    );
    const frame = gameplayCameraFrame(1_280, 580, safeBounds);
    expect(frame.centerX).not.toBe(MAP_BACKDROP_ANCHOR.x);
    expect(frame.centerY).not.toBe(MAP_BACKDROP_ANCHOR.y);

    const target = symmetricBackdropTarget(frame);
    const map = proportionalCoverSize(1_520, 840, target.width, target.height);
    const mapBounds = {
      left: MAP_BACKDROP_ANCHOR.x - map.width / 2,
      top: MAP_BACKDROP_ANCHOR.y - map.height / 2,
      right: MAP_BACKDROP_ANCHOR.x + map.width / 2,
      bottom: MAP_BACKDROP_ANCHOR.y + map.height / 2,
    };
    expect(map.width / map.height).toBeCloseTo(1_520 / 840);
    expect(mapBounds.left).toBeLessThanOrEqual(frame.worldBounds.left);
    expect(mapBounds.right).toBeGreaterThanOrEqual(frame.worldBounds.right);
    expect(mapBounds.top).toBeLessThanOrEqual(frame.worldBounds.top);
    expect(mapBounds.bottom).toBeGreaterThanOrEqual(frame.worldBounds.bottom);
  });
});
