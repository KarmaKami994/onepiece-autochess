export type BoardSkin = "pirate-ship" | "marine-harbor";

export type BoardMapWaveZone = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type BoardMapDefinition = Readonly<{
  id: BoardSkin;
  label: string;
  shortLabel: string;
  description: string;
  ariaLabel: string;
  assetPath: string;
  textureKey: string;
  accentColor: number;
  ambientColor: number;
  playerColor: number;
  enemyColor: number;
  waveZones: readonly BoardMapWaveZone[];
}>;

export const DEFAULT_BOARD_SKIN: BoardSkin = "pirate-ship";

export const BOARD_MAPS: Record<BoardSkin, BoardMapDefinition> = {
  "pirate-ship": {
    id: "pirate-ship",
    label: "Pirate Ship",
    shortLabel: "PIRATE DECK",
    description: "Warm timber, brass fittings, and open Grand Line water.",
    ariaLabel: "Eight by six tactical pirate ship deck",
    assetPath: "/assets/maps/pirate-ship.png",
    textureKey: "board-map-pirate-ship",
    accentColor: 0xe0b45b,
    ambientColor: 0x65c6dc,
    playerColor: 0x4cc5b0,
    enemyColor: 0xe36b72,
    waveZones: [
      { x: 0, y: 0, width: 760, height: 60 },
      { x: 0, y: 55, width: 42, height: 330 },
      { x: 718, y: 55, width: 42, height: 330 },
      { x: 0, y: 385, width: 760, height: 35 },
    ],
  },
  "marine-harbor": {
    id: "marine-harbor",
    label: "Marine Harbor",
    shortLabel: "HARBOR PIER",
    description: "Cool stone, naval lamps, and fortified harbor walls.",
    ariaLabel: "Eight by six tactical fortified marine harbor",
    assetPath: "/assets/maps/marine-harbor.png",
    textureKey: "board-map-marine-harbor",
    accentColor: 0x8bc9e8,
    ambientColor: 0x70d5f2,
    playerColor: 0x4ebed1,
    enemyColor: 0xe36b72,
    waveZones: [
      { x: 0, y: 0, width: 760, height: 45 },
      { x: 0, y: 40, width: 62, height: 345 },
      { x: 698, y: 40, width: 62, height: 345 },
      { x: 0, y: 382, width: 760, height: 38 },
    ],
  },
};

export const BOARD_MAP_LIST = Object.values(BOARD_MAPS);

export function isBoardSkin(value: unknown): value is BoardSkin {
  return typeof value === "string" && value in BOARD_MAPS;
}

export function getBoardMapDefinition(value: unknown): BoardMapDefinition {
  return isBoardSkin(value) ? BOARD_MAPS[value] : BOARD_MAPS[DEFAULT_BOARD_SKIN];
}
