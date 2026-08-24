export type CrewAnimationState =
  | "idle"
  | "move"
  | "attack"
  | "cast"
  | "hit"
  | "defeat";

export type CrewAnimationClip = {
  start: number;
  end: number;
  frameRate: number;
  repeat: number;
};

export type CrewAnimationDefinition = {
  contentId: string;
  assetKey: string;
  kind: "crew" | "pve";
  version: "v1" | "v2";
  sheetPath: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  displaySize: number;
  yOffset: number;
  /** Top-most non-transparent idle pixel in source-frame coordinates. */
  idleVisualTopPx: number;
  sheetColumns?: number;
  originX?: number;
  originY?: number;
  clips: Record<CrewAnimationState, CrewAnimationClip>;
};

const V1_IDLE_VISUAL_TOP_PX: Record<string, number> = {
  luffy: 4,
  zoro: 5,
  nami: 5,
  usopp: 9,
  chopper: 0,
  tashigi: 10,
  sanji: 10,
  robin: 8,
  smoker: 6,
  sabo: 0,
  kid: 6,
  crocodile: 8,
  law: 6,
  ace: 6,
  hancock: 8,
  doflamingo: 6,
  garp: 8,
  mihawk: 0,
};

const V2_IDLE_VISUAL_TOP_PX: Record<string, number> = {
  luffy: 56,
  nami: 42,
  usopp: 49,
  chopper: 74,
  tashigi: 52,
  sanji: 46,
  robin: 45,
  smoker: 39,
  sabo: 6,
  kid: 41,
  crocodile: 41,
  zoro: 47,
  law: 41,
  ace: 46,
  hancock: 43,
  doflamingo: 34,
  garp: 36,
  mihawk: 41,
  "marine-recruit": 8,
  "rifle-marine": 9,
  "pirate-raider": 8,
  pacifista: 4,
  "sea-king": 15,
};

function standardDefinition(
  contentId: string,
  displaySize = 50,
  yOffset = -8,
): CrewAnimationDefinition {
  return {
    contentId,
    assetKey: contentId,
    kind: "crew",
    version: "v1",
    sheetPath: `/assets/animations/${contentId}/${contentId}.png`,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 17,
    displaySize,
    yOffset,
    idleVisualTopPx: V1_IDLE_VISUAL_TOP_PX[contentId] ?? 8,
    clips: {
      idle: { start: 0, end: 3, frameRate: 6, repeat: -1 },
      move: { start: 0, end: 3, frameRate: 10, repeat: 0 },
      attack: { start: 4, end: 7, frameRate: 13, repeat: 0 },
      cast: { start: 8, end: 11, frameRate: 10, repeat: 0 },
      hit: { start: 12, end: 13, frameRate: 10, repeat: 0 },
      defeat: { start: 14, end: 16, frameRate: 9, repeat: 0 },
    },
  };
}

export const CREW_ANIMATION_MANIFEST = {
  luffy: standardDefinition("luffy", 50, -8),
  zoro: standardDefinition("zoro", 52, -9),
  nami: standardDefinition("nami", 51, -8),
  usopp: standardDefinition("usopp", 50, -8),
  chopper: standardDefinition("chopper", 49, -7),
  tashigi: standardDefinition("tashigi", 50, -8),
  sanji: standardDefinition("sanji", 51, -8),
  robin: standardDefinition("robin", 51, -8),
  smoker: standardDefinition("smoker", 52, -9),
  sabo: standardDefinition("sabo", 51, -9),
  kid: standardDefinition("kid", 52, -9),
  crocodile: standardDefinition("crocodile", 52, -9),
  law: standardDefinition("law", 51, -8),
  ace: standardDefinition("ace", 51, -8),
  hancock: standardDefinition("hancock", 51, -8),
  doflamingo: standardDefinition("doflamingo", 52, -9),
  garp: standardDefinition("garp", 53, -9),
  mihawk: standardDefinition("mihawk", 53, -9),
} as const satisfies Record<string, CrewAnimationDefinition>;

export const LUFFY_V2_ANIMATION: CrewAnimationDefinition = {
  contentId: "luffy",
  assetKey: "luffy-v2",
  kind: "crew",
  version: "v2",
  sheetPath: "/assets/animations/luffy-v2/luffy-v2.png",
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 46,
  sheetColumns: 8,
  displaySize: 88,
  yOffset: 12,
  idleVisualTopPx: V2_IDLE_VISUAL_TOP_PX.luffy,
  originX: 40 / 128,
  originY: 116 / 128,
  clips: {
    idle: { start: 0, end: 5, frameRate: 8, repeat: -1 },
    move: { start: 6, end: 13, frameRate: 16, repeat: 0 },
    attack: { start: 14, end: 21, frameRate: 14, repeat: 0 },
    cast: { start: 22, end: 33, frameRate: 12, repeat: 0 },
    hit: { start: 34, end: 37, frameRate: 12, repeat: 0 },
    defeat: { start: 38, end: 45, frameRate: 10, repeat: 0 },
  },
};

const V2_CLIPS: Record<CrewAnimationState, CrewAnimationClip> = {
  idle: { start: 0, end: 5, frameRate: 8, repeat: -1 },
  move: { start: 6, end: 13, frameRate: 16, repeat: 0 },
  attack: { start: 14, end: 21, frameRate: 14, repeat: 0 },
  cast: { start: 22, end: 33, frameRate: 12, repeat: 0 },
  hit: { start: 34, end: 37, frameRate: 12, repeat: 0 },
  defeat: { start: 38, end: 45, frameRate: 10, repeat: 0 },
};

function crewV2Definition(
  contentId: string,
  displaySize = 88,
  yOffset = 12,
): CrewAnimationDefinition {
  const assetKey = `${contentId}-v2`;
  return {
    contentId,
    assetKey,
    kind: "crew",
    version: "v2",
    sheetPath: `/assets/animations/${assetKey}/${assetKey}.png`,
    frameWidth: 128,
    frameHeight: 128,
    frameCount: 46,
    sheetColumns: 8,
    displaySize,
    yOffset,
    idleVisualTopPx: V2_IDLE_VISUAL_TOP_PX[contentId] ?? 32,
    originX: 64 / 128,
    originY: 116 / 128,
    clips: V2_CLIPS,
  };
}

export const CREW_V2_ANIMATIONS = {
  nami: crewV2Definition("nami"),
  usopp: crewV2Definition("usopp"),
  chopper: crewV2Definition("chopper"),
  tashigi: crewV2Definition("tashigi"),
  sanji: crewV2Definition("sanji"),
  robin: crewV2Definition("robin"),
  smoker: crewV2Definition("smoker"),
  sabo: crewV2Definition("sabo", 60, 8),
  kid: crewV2Definition("kid"),
  crocodile: crewV2Definition("crocodile"),
  zoro: crewV2Definition("zoro"),
  law: crewV2Definition("law"),
  ace: crewV2Definition("ace"),
  hancock: crewV2Definition("hancock"),
  doflamingo: crewV2Definition("doflamingo"),
  garp: crewV2Definition("garp"),
  mihawk: crewV2Definition("mihawk"),
} as const satisfies Record<string, CrewAnimationDefinition>;

function pveV2Definition(
  contentId: string,
  displaySize: number,
  yOffset = 7,
): CrewAnimationDefinition {
  const assetKey = `${contentId}-v2`;
  return {
    contentId,
    assetKey,
    kind: "pve",
    version: "v2",
    sheetPath: `/assets/animations/${assetKey}/${assetKey}.png`,
    frameWidth: 128,
    frameHeight: 128,
    frameCount: 46,
    sheetColumns: 8,
    displaySize,
    yOffset,
    idleVisualTopPx: V2_IDLE_VISUAL_TOP_PX[contentId] ?? 32,
    originX: 64 / 128,
    originY: 116 / 128,
    clips: V2_CLIPS,
  };
}

export const PVE_ANIMATION_MANIFEST = {
  "marine-recruit": pveV2Definition("marine-recruit", 78),
  "rifle-marine": pveV2Definition("rifle-marine", 80),
  "pirate-raider": pveV2Definition("pirate-raider", 82),
  pacifista: pveV2Definition("pacifista", 88, 9),
  "sea-king": pveV2Definition("sea-king", 90, 10),
} as const satisfies Record<string, CrewAnimationDefinition>;

export const ANIMATION_CONTENT_MANIFEST = {
  ...CREW_ANIMATION_MANIFEST,
  ...PVE_ANIMATION_MANIFEST,
} as const satisfies Record<string, CrewAnimationDefinition>;

const CREW_VARIANT_OVERRIDES: Partial<
  Record<keyof typeof CREW_ANIMATION_MANIFEST, CrewAnimationDefinition[]>
> = {
  luffy: [LUFFY_V2_ANIMATION],
  nami: [CREW_V2_ANIMATIONS.nami],
  usopp: [CREW_V2_ANIMATIONS.usopp],
  chopper: [CREW_V2_ANIMATIONS.chopper],
  tashigi: [CREW_V2_ANIMATIONS.tashigi],
  sanji: [CREW_V2_ANIMATIONS.sanji],
  robin: [CREW_V2_ANIMATIONS.robin],
  smoker: [CREW_V2_ANIMATIONS.smoker],
  sabo: [CREW_V2_ANIMATIONS.sabo],
  kid: [CREW_V2_ANIMATIONS.kid],
  crocodile: [CREW_V2_ANIMATIONS.crocodile],
  zoro: [CREW_V2_ANIMATIONS.zoro],
  law: [CREW_V2_ANIMATIONS.law],
  ace: [CREW_V2_ANIMATIONS.ace],
  hancock: [CREW_V2_ANIMATIONS.hancock],
  doflamingo: [CREW_V2_ANIMATIONS.doflamingo],
  garp: [CREW_V2_ANIMATIONS.garp],
  mihawk: [CREW_V2_ANIMATIONS.mihawk],
};

export function getCrewAnimationDefinitions(contentId: string) {
  const base = CREW_ANIMATION_MANIFEST[
    contentId as keyof typeof CREW_ANIMATION_MANIFEST
  ] as CrewAnimationDefinition | undefined;
  const pve = PVE_ANIMATION_MANIFEST[
    contentId as keyof typeof PVE_ANIMATION_MANIFEST
  ] as CrewAnimationDefinition | undefined;
  if (!base) return pve ? [pve] : [];
  const variants = CREW_VARIANT_OVERRIDES[
    contentId as keyof typeof CREW_ANIMATION_MANIFEST
  ];
  return [base, ...(variants ?? [])];
}

export const ALL_CREW_ANIMATION_DEFINITIONS = Object.values(
  ANIMATION_CONTENT_MANIFEST,
).flatMap((definition) =>
  getCrewAnimationDefinitions(definition.contentId),
);

export const ALL_UNIT_ANIMATION_DEFINITIONS =
  ALL_CREW_ANIMATION_DEFINITIONS;

export function getCrewAnimationDefinition(contentId: string) {
  return getCrewAnimationDefinitions(contentId).at(-1);
}

export function crewSheetKey(assetKey: string) {
  return `crew-animation-${assetKey}`;
}

export function crewAnimationKey(
  assetKey: string,
  state: CrewAnimationState,
) {
  return `${assetKey}-${state}`;
}
