export type ResourceBarTeam = "player" | "enemy";

export const RESOURCE_BAR_COLORS = {
  frame: 0x05090c,
  empty: 0x20171b,
  playerHealth: 0x58d77b,
  enemyHealth: 0xf06f68,
  shield: 0x78d7ff,
  energy: 0xb991ff,
  energyReady: 0xffd45a,
} as const;

export const RESOURCE_BAR_GEOMETRY = {
  width: 44,
  healthOuterHeight: 7,
  healthInnerHeight: 5,
  energyOuterHeight: 4,
  energyInnerHeight: 2,
  spriteGap: 4,
  barGap: 1,
  statusGap: 8,
  segmentCount: 5,
} as const;

export type ResourceBarLayoutInput = {
  phase: string;
  zone: "board" | "bench";
  spriteY: number;
  frameHeight: number;
  displaySize: number;
  originY?: number;
  idleVisualTopPx?: number;
};

export type ResourceBarFillInput = {
  hp: number;
  maxHp: number;
  shield: number;
  energy: number;
  team: ResourceBarTeam;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Returns renderer-only coordinates for a resource bar. Asset metadata is
 * defensive here because some legacy and procedural atlases do not expose a
 * trustworthy visible destination rectangle.
 */
export function resourceBarLayout(input: ResourceBarLayoutInput) {
  const frameHeight = Math.max(1, input.frameHeight);
  const displaySize = Math.max(1, input.displaySize);
  const originY = clamp(input.originY ?? 0.5, 0, 1);
  const originPx = originY * frameHeight;
  const fallbackTopPx = Math.round(frameHeight * 0.25);
  const configuredTop = input.idleVisualTopPx;
  const idleVisualTopPx =
    Number.isFinite(configuredTop) &&
    configuredTop !== undefined &&
    configuredTop >= 0 &&
    configuredTop < originPx
      ? configuredTop
      : fallbackTopPx;
  const visualTopY =
    input.spriteY +
    (idleVisualTopPx - originPx) * (displaySize / frameHeight);
  const stackBottomY = visualTopY - RESOURCE_BAR_GEOMETRY.spriteGap;
  const energyY =
    stackBottomY - RESOURCE_BAR_GEOMETRY.energyOuterHeight / 2;
  const healthY =
    energyY -
    RESOURCE_BAR_GEOMETRY.energyOuterHeight / 2 -
    RESOURCE_BAR_GEOMETRY.barGap -
    RESOURCE_BAR_GEOMETRY.healthOuterHeight / 2;

  return {
    visible: input.phase === "battle" && input.zone === "board",
    visualTopY,
    healthY,
    energyY,
    statusY:
      healthY -
      RESOURCE_BAR_GEOMETRY.healthOuterHeight / 2 -
      RESOURCE_BAR_GEOMETRY.statusGap,
    selectionY:
      healthY -
      RESOURCE_BAR_GEOMETRY.healthOuterHeight / 2 -
      RESOURCE_BAR_GEOMETRY.statusGap -
      11,
    idleVisualTopPx,
  };
}

/**
 * Health and shield share one bounded strip. If their combined value exceeds
 * max HP they are scaled together, so even a shield on a full-health unit is
 * visible and very large shields cannot overflow the frame.
 */
export function resourceBarFill(input: ResourceBarFillInput) {
  const maxHp = Math.max(1, input.maxHp);
  const hp = clamp(input.hp, 0, maxHp);
  const shield = Math.max(0, input.shield);
  const energy = clamp(input.energy, 0, 100);
  const combinedScale = Math.max(maxHp, hp + shield);
  const width = RESOURCE_BAR_GEOMETRY.width;

  return {
    hp,
    shield,
    energy,
    healthWidth: width * (hp / combinedScale),
    shieldWidth: width * (shield / combinedScale),
    energyWidth: width * (energy / 100),
    healthColor:
      input.team === "player"
        ? RESOURCE_BAR_COLORS.playerHealth
        : RESOURCE_BAR_COLORS.enemyHealth,
    energyColor:
      energy >= 100
        ? RESOURCE_BAR_COLORS.energyReady
        : RESOURCE_BAR_COLORS.energy,
    segmentXs: Array.from(
      { length: RESOURCE_BAR_GEOMETRY.segmentCount - 1 },
      (_, index) =>
        -width / 2 +
        (width / RESOURCE_BAR_GEOMETRY.segmentCount) * (index + 1),
    ),
  };
}
