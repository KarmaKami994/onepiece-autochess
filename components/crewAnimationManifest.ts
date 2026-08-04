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
  version: "v1" | "v2";
  sheetPath: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  displaySize: number;
  yOffset: number;
  sheetColumns?: number;
  originX?: number;
  originY?: number;
  clips: Record<CrewAnimationState, CrewAnimationClip>;
};

function standardDefinition(
  contentId: string,
  displaySize = 50,
  yOffset = -8,
): CrewAnimationDefinition {
  return {
    contentId,
    assetKey: contentId,
    version: "v1",
    sheetPath: `/assets/animations/${contentId}/${contentId}.png`,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 17,
    displaySize,
    yOffset,
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
  version: "v2",
  sheetPath: "/assets/animations/luffy-v2/luffy-v2.png",
  frameWidth: 128,
  frameHeight: 128,
  frameCount: 46,
  sheetColumns: 8,
  displaySize: 88,
  yOffset: 12,
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

const CREW_VARIANT_OVERRIDES: Partial<
  Record<keyof typeof CREW_ANIMATION_MANIFEST, CrewAnimationDefinition[]>
> = {
  luffy: [LUFFY_V2_ANIMATION],
};

export function getCrewAnimationDefinitions(contentId: string) {
  const base = CREW_ANIMATION_MANIFEST[
    contentId as keyof typeof CREW_ANIMATION_MANIFEST
  ] as CrewAnimationDefinition | undefined;
  if (!base) return [];
  const variants = CREW_VARIANT_OVERRIDES[
    contentId as keyof typeof CREW_ANIMATION_MANIFEST
  ];
  return [base, ...(variants ?? [])];
}

export const ALL_CREW_ANIMATION_DEFINITIONS = Object.values(
  CREW_ANIMATION_MANIFEST,
).flatMap((definition) =>
  getCrewAnimationDefinitions(definition.contentId),
);

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
