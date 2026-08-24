import { describe, expect, it } from "vitest";
import {
  CAROUSEL_ARENA_BOUNDS,
  CAROUSEL_GEOMETRY,
  carouselDirection,
  carouselInterpolationDuration,
  carouselOrbitPoint,
  carouselWorldPointFromClient,
  clampCarouselTarget,
  towedBountyPoint,
} from "../components/carouselGeometry";
import {
  CAROUSEL_ARENA_HEIGHT,
  CAROUSEL_ARENA_WIDTH,
  CAROUSEL_BOAT_RADIUS,
  CAROUSEL_BOUNTY_RADIUS,
  CAROUSEL_ORBIT_RADIANS_PER_TICK,
  CAROUSEL_ORBIT_RADIUS_X,
  CAROUSEL_ORBIT_RADIUS_Y,
} from "../game/engine";
import {
  carouselBoatFrame,
  carouselBountyFrame,
} from "../components/PhaserCarousel";

describe("bounty regatta presentation geometry", () => {
  it("mirrors the authoritative engine geometry without importing it at runtime", () => {
    expect(CAROUSEL_GEOMETRY.worldWidth).toBe(CAROUSEL_ARENA_WIDTH);
    expect(CAROUSEL_GEOMETRY.worldHeight).toBe(CAROUSEL_ARENA_HEIGHT);
    expect(CAROUSEL_GEOMETRY.boatRadius).toBe(CAROUSEL_BOAT_RADIUS);
    expect(CAROUSEL_GEOMETRY.bountyRadius).toBe(CAROUSEL_BOUNTY_RADIUS);
    expect(CAROUSEL_GEOMETRY.orbitRadiusX).toBe(CAROUSEL_ORBIT_RADIUS_X);
    expect(CAROUSEL_GEOMETRY.orbitRadiusY).toBe(CAROUSEL_ORBIT_RADIUS_Y);
    expect(CAROUSEL_GEOMETRY.orbitRadiansPerTick).toBe(
      CAROUSEL_ORBIT_RADIANS_PER_TICK,
    );
  });

  it("keeps click targets inside the navigable arena", () => {
    expect(clampCarouselTarget({ x: -100, y: 2_000 })).toEqual({
      x: CAROUSEL_ARENA_BOUNDS.left + CAROUSEL_GEOMETRY.boatRadius,
      y: CAROUSEL_ARENA_BOUNDS.bottom - CAROUSEL_GEOMETRY.boatRadius,
    });
    expect(clampCarouselTarget({ x: 500, y: 300 })).toEqual({
      x: 500,
      y: 300,
    });
  });

  it("places choices evenly on the canonical rotating ellipse", () => {
    const right = carouselOrbitPoint(0, 8, 0);
    const bottom = carouselOrbitPoint(2, 8, 0);
    expect(right.x).toBeCloseTo(
      CAROUSEL_GEOMETRY.centerX + CAROUSEL_GEOMETRY.orbitRadiusX,
    );
    expect(right.y).toBeCloseTo(CAROUSEL_GEOMETRY.centerY);
    expect(bottom.x).toBeCloseTo(CAROUSEL_GEOMETRY.centerX);
    expect(bottom.y).toBeCloseTo(
      CAROUSEL_GEOMETRY.centerY + CAROUSEL_GEOMETRY.orbitRadiusY,
    );
    expect(carouselOrbitPoint(0, 8, 10)).not.toEqual(right);
  });

  it("maps headings to the eight-frame direction order and tows behind", () => {
    const origin = { x: 200, y: 200 };
    expect(carouselDirection(origin, { x: 200, y: 100 })).toBe("n");
    expect(carouselDirection(origin, { x: 300, y: 100 })).toBe("ne");
    expect(carouselDirection(origin, { x: 300, y: 200 })).toBe("e");
    expect(carouselDirection(origin, { x: 100, y: 300 })).toBe("sw");
    expect(towedBountyPoint(origin, "e", 50)).toEqual({ x: 150, y: 200 });
  });

  it("maps letterboxed client coordinates back into the fixed world", () => {
    const worldCenter = carouselWorldPointFromClient(
      { x: 800, y: 450 },
      { left: 0, top: 0, right: 1_600, bottom: 900 },
    );
    expect(worldCenter?.x).toBeCloseTo(CAROUSEL_GEOMETRY.centerX);
    expect(worldCenter?.y).toBeCloseTo(CAROUSEL_GEOMETRY.centerY);
    expect(
      carouselWorldPointFromClient(
        { x: 5, y: 5 },
        { left: 0, top: 0, right: 1_600, bottom: 900 },
      ),
    ).toBeNull();
  });

  it("disables interpolation under reduced motion", () => {
    expect(carouselInterpolationDuration(50, false)).toBe(45);
    expect(carouselInterpolationDuration(50, true)).toBe(0);
    expect(carouselInterpolationDuration(500, false)).toBe(80);
  });

  it("addresses every palette and item animation frame in the local sheets", () => {
    expect(carouselBoatFrame(0, "n", 0)).toBe(0);
    expect(carouselBoatFrame(0, "ne", 0)).toBe(4);
    expect(carouselBoatFrame(1, "n", 0)).toBe(32);
    expect(carouselBoatFrame(7, "nw", 3)).toBe(255);
    expect(carouselBountyFrame(0, 0)).toBe(0);
    expect(carouselBountyFrame(7, 3)).toBe(31);
  });
});
