"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import * as GameEngine from "@/game";
import PhaserBoard, {
  type BoardMove,
  type BoardUnit,
  type CombatFxEvent,
} from "@/components/PhaserBoard";
import AnimationLab from "@/components/AnimationLab";
import {
  BOARD_MAP_LIST,
  DEFAULT_BOARD_SKIN,
  isBoardSkin,
  type BoardSkin,
} from "@/components/boardMapManifest";
import "./game.css";

type UnknownRecord = Record<string, unknown>;
type Screen =
  | "menu"
  | "animation-lab"
  | "settings"
  | "match"
  | "carousel"
  | "reward"
  | "results"
  | "confirm-new";
type SoundName = "click" | "coin" | "error" | "battle" | "reward";
type TutorialStep =
  | "welcome"
  | "recruit"
  | "deploy"
  | "second"
  | "sail"
  | "await-reward"
  | "treasure"
  | "equip";

type Settings = {
  muted: boolean;
  volume: number;
  animationSpeed: number;
  particles: boolean;
  highContrast: boolean;
  boardSkin: BoardSkin;
};

type EngineContract = {
  CONTENT?: unknown;
  DEFAULT_CONTENT?: unknown;
  createMatch?: (seed: string | number, content?: unknown) => unknown;
  applyCommand?: (
    state: unknown,
    command: UnknownRecord,
    content?: unknown,
  ) => unknown;
  simulateBattle?: (...args: unknown[]) => unknown;
  getActiveTraits?: (player: unknown, content?: unknown) => unknown;
  runBotTurn?: (
    state: unknown,
    playerId: string,
    content?: unknown,
  ) => unknown;
  advanceMatchPhase?: (state: unknown, content?: unknown) => unknown;
  getStageDefinition?: (round: number, content?: unknown) => unknown;
  migrateMatchState?: (state: unknown, content?: unknown) => unknown;
  CURRENT_SAVE_SCHEMA_VERSION?: number;
};

type TraitView = {
  id: string;
  name: string;
  icon: string;
  count: number;
  next: number | null;
  tier: number;
  description: string;
  color: string;
};

type StandingView = {
  id: string;
  name: string;
  hp: number;
  level: number;
  streak: number;
  alive: boolean;
  isHuman: boolean;
};

type ShopUnitView = {
  id: string;
  name: string;
  shortName: string;
  cost: number;
  rarity: string;
  traits: string[];
  portrait: string;
  token: string;
  color: string;
  description: string;
  stats: {
    health: number;
    attack: number;
    defense: number;
    range: number;
    attackIntervalMs: number;
  };
  ability: {
    name: string;
    description: string;
    power: number;
    effect: string;
  };
  traitDetails: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  ownedCopies: number;
  mergeProgress: string;
  purchaseUpgrade: 2 | 3 | null;
  affordable: boolean;
  canReceive: boolean;
  disabledReason: string | null;
  traitPreview: Array<{
    id: string;
    name: string;
    current: number;
    next: number | null;
    activatesIfFielded: boolean;
    deltaIfFielded: 0 | 1;
  }>;
};

type ItemEffectView = {
  kind: string;
  value: number;
  label: string;
};

type ChoiceView = {
  id: string;
  name: string;
  description: string;
  icon: string;
  portrait?: string;
  color: string;
  effects: ItemEffectView[];
};

type ToastView = {
  id: number;
  kind: "success" | "error" | "info";
  title: string;
  message: string;
};

type MatchView = {
  playerId: string;
  phase: string;
  phaseLabel: string;
  alive: boolean;
  round: number;
  stageLabel: string;
  gold: number;
  hp: number;
  level: number;
  xp: number;
  xpToNext: number;
  deployed: number;
  capacity: number;
  shopLocked: boolean;
  shop: Array<ShopUnitView | null>;
  inventory: ChoiceView[];
  boardUnits: BoardUnit[];
  resultCrew: BoardUnit[];
  traits: TraitView[];
  standings: StandingView[];
  opponent: StandingView | null;
  choices: ChoiceView[];
  selectedDefinitionByUnit: Map<string, ShopUnitView>;
  itemsById: Map<string, ChoiceView>;
  economy: {
    base: number;
    interest: number;
    streak: number;
    total: number;
  };
  events: CombatFxEvent[];
  eventSequence: number;
  battleDurationSeconds: number;
  placement: number;
  winnerName: string;
};

type SaveEnvelope = {
  state: unknown;
  seed: string;
  updatedAt: number;
  schemaVersion?: number;
  contentVersion?: string;
  replayBattle?: boolean;
};

const engine = GameEngine as unknown as EngineContract;
const content = engine.CONTENT ?? engine.DEFAULT_CONTENT;
const SETTINGS_KEY = "grand-line-auto-chess.settings.v1";
const TUTORIAL_KEY = "grand-line-auto-chess.first-voyage.v1";
const DB_NAME = "grand-line-auto-chess";
const DB_VERSION = 1;
const STORE_NAME = "voyages";
const ACTIVE_SAVE = "active-voyage";

const DEFAULT_SETTINGS: Settings = {
  muted: false,
  volume: 0.5,
  animationSpeed: 1,
  particles: true,
  highContrast: false,
  boardSkin: DEFAULT_BOARD_SKIN,
};

function loadStoredSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(stored) as Partial<Settings> | null;
    if (!parsed || typeof parsed !== "object") return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      boardSkin: isBoardSkin(parsed.boardSkin)
        ? parsed.boardSkin
        : DEFAULT_BOARD_SKIN,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function hasCompletedFirstVoyage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TUTORIAL_KEY) === "complete";
  } catch {
    return false;
  }
}

function saveFirstVoyageCompletion(): void {
  try {
    window.localStorage.setItem(TUTORIAL_KEY, "complete");
  } catch {
    // The guide can still be completed when local preference storage is blocked.
  }
}

const DEFAULT_TRAIT_META: Record<string, { icon: string; color: string }> = {
  pirate: { icon: "☠", color: "#d35645" },
  marine: { icon: "⚓", color: "#5f9fc7" },
  strawhat: { icon: "☀", color: "#e7b447" },
  grandline: { icon: "⌁", color: "#43a6a1" },
  swordsman: { icon: "⚔", color: "#9faab4" },
  sniper: { icon: "◎", color: "#bb7d42" },
  brawler: { icon: "✊", color: "#c6664a" },
  navigator: { icon: "✦", color: "#75a6d8" },
  doctor: { icon: "✚", color: "#cb6d86" },
  captain: { icon: "★", color: "#d9ad45" },
  logia: { icon: "◈", color: "#8d75bb" },
  revolutionary: { icon: "✹", color: "#b94b40" },
};

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object"
    ? (value as UnknownRecord)
    : {};
}

function recordValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value instanceof Map) return [...value.values()];
  return Object.values(asRecord(value));
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hashColor(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  const palette = [
    0xc74f3d, 0x3f8ea6, 0xd19a3a, 0x667fbe, 0x55966d, 0xa25e92, 0xc47b41,
    0x548d88,
  ];
  return palette[hash % palette.length];
}

function cssColor(value: string): string {
  return `#${hashColor(value).toString(16).padStart(6, "0")}`;
}

function getDefinitionMap(
  kind: "units" | "traits" | "items" | "enemies",
): Map<string, UnknownRecord> {
  const root = asRecord(content);
  const alternatives =
    kind === "units"
      ? [root.units, root.unitDefinitions, root.characters]
      : kind === "traits"
        ? [root.traits, root.synergies]
        : kind === "items"
          ? [root.items, root.itemDefinitions]
          : [root.enemies, root.enemyDefinitions];
  const source = alternatives.find(
    (candidate) =>
      Array.isArray(candidate) ||
      candidate instanceof Map ||
      Object.keys(asRecord(candidate)).length > 0,
  );
  const map = new Map<string, UnknownRecord>();

  if (source instanceof Map) {
    source.forEach((definition, key) => {
      map.set(String(key), asRecord(definition));
    });
    return map;
  }

  if (Array.isArray(source)) {
    source.forEach((definition, index) => {
      const record = asRecord(definition);
      const id = stringValue(
        record.id ?? record.definitionId ?? record.key,
        `definition-${index}`,
      );
      map.set(id, record);
    });
    return map;
  }

  Object.entries(asRecord(source)).forEach(([key, definition]) => {
    map.set(key, asRecord(definition));
  });
  return map;
}

function formatItemEffect(rawEffect: unknown): ItemEffectView {
  const effect = asRecord(rawEffect);
  const kind = stringValue(effect.kind, "bonus");
  const value = numberValue(effect.value);
  const labels: Record<string, string> = {
    "health-flat": "Health",
    "attack-flat": "Attack",
    "defense-flat": "Defense",
    "attack-speed-percent": "Attack Speed",
    "critical-chance-percent": "Critical Chance",
    "ability-power-percent": "Ability Power",
    "starting-energy": "Starting Energy",
    "range-flat": "Range",
    "omnivamp-percent": "Omnivamp",
  };
  const percent = kind.endsWith("-percent");
  return {
    kind,
    value,
    label: `+${value}${percent ? "%" : ""} ${labels[kind] ?? titleCase(kind)}`,
  };
}

function itemView(
  definitionId: string,
  definition: UnknownRecord,
): ChoiceView {
  const effects = recordValues(definition.effects).map(formatItemEffect);
  return {
    id: definitionId,
    name: stringValue(definition.name, titleCase(definitionId)),
    description: stringValue(
      definition.description,
      "Equip this treasure to a selected crew member.",
    ),
    icon: stringValue(definition.icon, "✦"),
    color: stringValue(definition.color, cssColor(definitionId)),
    effects,
  };
}

function unitView(
  definitionId: string,
  definition: UnknownRecord,
  traitDefinitions: Map<string, UnknownRecord> = new Map(),
): ShopUnitView {
  const name = stringValue(
    definition.name ?? definition.displayName,
    titleCase(definitionId),
  );
  const traits = (
    Array.isArray(definition.traits)
      ? definition.traits
      : Array.isArray(definition.tags)
        ? definition.tags
        : []
  ).map((trait) => String(trait));
  const cost = numberValue(
    definition.cost,
    typeof definition.tier === "number" ? Number(definition.tier) : 1,
  );
  const rarityRaw = stringValue(
    definition.rarity,
    ["common", "common", "rare", "epic", "legendary", "mythic"][
      Math.max(1, Math.min(5, cost))
    ] ?? "common",
  );
  const stats = asRecord(definition.stats);
  const ability = asRecord(definition.ability);
  const assetSlug = slugify(definitionId);
  return {
    id: definitionId,
    name,
    shortName: stringValue(definition.shortName, name.split(" ")[0]),
    cost: Math.max(1, cost),
    rarity: titleCase(rarityRaw),
    traits,
    portrait: stringValue(
      definition.portraitPath ?? definition.portrait,
      `/assets/portraits/${assetSlug}.png`,
    ),
    token: stringValue(
      definition.tokenPath ?? definition.token,
      `/assets/tokens/${assetSlug}.png`,
    ),
    color: stringValue(definition.color, cssColor(definitionId)),
    description: stringValue(
      definition.description ?? ability.description,
      traits.length ? traits.map(titleCase).join(" · ") : "Grand Line fighter",
    ),
    stats: {
      health: numberValue(stats.health ?? stats.hp, 100),
      attack: numberValue(stats.attack, 10),
      defense: numberValue(stats.defense, 0),
      range: numberValue(stats.range, 1),
      attackIntervalMs: numberValue(stats.attackIntervalMs, 1_000),
    },
    ability: {
      name: stringValue(ability.name, "Crew Technique"),
      description: stringValue(
        ability.description,
        "Unleashes a signature technique at full energy.",
      ),
      power: numberValue(ability.power),
      effect: stringValue(ability.effect, "damage"),
    },
    traitDetails: traits.map((id) => {
      const trait = traitDefinitions.get(id) ?? {};
      return {
        id,
        name: stringValue(trait.name, titleCase(id)),
        description: stringValue(
          trait.description,
          "Deploy distinct crew members to strengthen this bond.",
        ),
      };
    }),
    ownedCopies: 0,
    mergeProgress: "0 / 3 → ★★",
    purchaseUpgrade: null,
    affordable: true,
    canReceive: true,
    disabledReason: null,
    traitPreview: [],
  };
}

function getPlayerId(state: UnknownRecord): string {
  const players = recordValues(state.players).map(asRecord);
  const human =
    players.find((player) => player.isBot === false) ??
    players.find((player) => booleanValue(player.isHuman)) ??
    players[0];
  return stringValue(human?.id, "player");
}

function getPlayer(state: UnknownRecord, playerId: string): UnknownRecord {
  const playersRecord = asRecord(state.players);
  if (playersRecord[playerId]) return asRecord(playersRecord[playerId]);
  return (
    recordValues(state.players)
      .map(asRecord)
      .find((player) => stringValue(player.id) === playerId) ?? {}
  );
}

function deriveTutorialStep(stateValue: unknown): TutorialStep | null {
  const state = asRecord(stateValue);
  const player = getPlayer(state, getPlayerId(state));
  const units = recordValues(player.units).map(asRecord);
  const hasEquippedItem = units.some(
    (unit) => Array.isArray(unit.items) && unit.items.length > 0,
  );
  if (hasEquippedItem) return null;

  const phase = phaseName(state.phase);
  if (phase === "game-over") return null;
  if (phase === "item-choice" || phase === "carousel") return "treasure";
  if (phase === "battle") return "await-reward";
  if (
    Array.isArray(player.inventory) &&
    player.inventory.length > 0
  ) {
    return "equip";
  }

  const deployed = Object.keys(asRecord(player.board)).length;
  if (deployed >= 2) return "sail";
  if (units.length >= 2 || deployed >= 1) return "second";
  if (units.length >= 1) return "deploy";
  return "recruit";
}

function phaseName(value: unknown): string {
  const phase = stringValue(value, "preparation").toLowerCase();
  if (phase.includes("battle") || phase.includes("fight")) return "battle";
  if (phase.includes("item") || phase.includes("reward")) return "item-choice";
  if (phase.includes("carousel") || phase.includes("draft")) return "carousel";
  if (phase.includes("over") || phase.includes("result")) return "game-over";
  return "preparation";
}

function normalizeCommandResult(
  result: unknown,
  fallbackState: unknown,
): { ok: boolean; state: unknown; error?: string } {
  const record = asRecord(result);
  if (typeof record.ok === "boolean") {
    return {
      ok: record.ok,
      state: record.state ?? fallbackState,
      error: stringValue(
        asRecord(record.error).message ?? record.error,
        "That order cannot be carried out.",
      ),
    };
  }
  if (result && typeof result === "object") {
    return { ok: true, state: result };
  }
  return {
    ok: false,
    state: fallbackState,
    error: "The game engine did not accept that order.",
  };
}

function buildBoardUnits(
  state: UnknownRecord,
  player: UnknownRecord,
  opponent: UnknownRecord | null,
  definitions: Map<string, UnknownRecord>,
  traitDefinitions: Map<string, UnknownRecord>,
  itemDefinitions: Map<string, UnknownRecord>,
): { units: BoardUnit[]; views: Map<string, ShopUnitView> } {
  const result: BoardUnit[] = [];
  const views = new Map<string, ShopUnitView>();
  const humanId = stringValue(player.id);
  const relevantPairing = recordValues(state.pairings)
    .map(asRecord)
    .find(
      (pairing) =>
        stringValue(pairing.playerAId) === humanId ||
        stringValue(pairing.playerBId) === humanId,
    );
  const ghostOpponentId =
    relevantPairing && relevantPairing.playerBId === null
      ? stringValue(relevantPairing.ghostOfPlayerId)
      : "";

  function addPlayerUnits(
    owner: UnknownRecord,
    team: "player" | "enemy",
  ) {
    const instances = asRecord(owner.units);
    const board = asRecord(owner.board);
    const bench = Array.isArray(owner.bench) ? owner.bench : [];
    const boardLocations = new Map<string, { x: number; y: number }>();

    Object.entries(board).forEach(([coordinate, unitId]) => {
      const [x, y] = coordinate.split(",").map(Number);
      boardLocations.set(String(unitId), {
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0,
      });
    });

    Object.entries(instances).forEach(([mapId, rawInstance]) => {
      const instance = asRecord(rawInstance);
      const id = stringValue(instance.id, mapId);
      const definitionId = stringValue(
        instance.definitionId ?? instance.unitId ?? instance.characterId,
        id,
      );
      const definition = definitions.get(definitionId) ?? {};
      const view = unitView(definitionId, definition, traitDefinitions);
      const ownerId = stringValue(owner.id);
      const displayId =
        phaseName(state.phase) === "battle"
          ? team === "enemy" && ownerId === ghostOpponentId
            ? `ghost-${ownerId}:${id}`
            : `${ownerId}:${id}`
          : id;
      views.set(displayId, view);
      const boardLocation = boardLocations.get(id);
      const benchSlot = bench.findIndex((unitId) => String(unitId) === id);
      if (!boardLocation && benchSlot < 0) return;
      if (team === "enemy" && !boardLocation) return;
      const star = Math.max(
        1,
        numberValue(instance.star ?? instance.stars ?? instance.tier, 1),
      );
      const starScale = star >= 3 ? 3.24 : star === 2 ? 1.8 : 1;
      const itemHealth = (Array.isArray(instance.items) ? instance.items : [])
        .map((itemId) => itemDefinitions.get(String(itemId)) ?? {})
        .flatMap((item) => recordValues(item.effects))
        .map(asRecord)
        .filter((effect) => stringValue(effect.kind) === "health-flat")
        .reduce((total, effect) => total + numberValue(effect.value), 0);
      const derivedMaxHp =
        Math.round(
          numberValue(
            asRecord(definition.stats).health ??
              asRecord(definition.stats).hp ??
              definition.hp,
            100,
          ) * starScale,
        ) + itemHealth;
      const maxHp = numberValue(
        instance.maxHp ??
          derivedMaxHp,
        derivedMaxHp,
      );
      const rawY = boardLocation?.y ?? 0;
      result.push({
        id: displayId,
        contentId: definitionId,
        name: view.name,
        shortName: view.shortName,
        color: hashColor(definitionId),
        team,
        zone: boardLocation ? "board" : "bench",
        x:
          team === "enemy"
            ? 7 - (boardLocation?.x ?? 0)
            : boardLocation?.x ?? 0,
        y:
          team === "enemy"
            ? Math.min(5, Math.max(0, 5 - rawY))
            : Math.min(5, Math.max(0, rawY)),
        slot: Math.max(0, benchSlot),
        star,
        items: Array.isArray(instance.items)
          ? instance.items.map(String).slice(0, 3)
          : [],
        hp: numberValue(instance.currentHp ?? instance.hp, maxHp),
        maxHp,
        portrait: view.token,
      });
    });
  }

  addPlayerUnits(player, "player");
  if (opponent) addPlayerUnits(opponent, "enemy");

  const lastResults = recordValues(state.lastResults).map(asRecord);
  const relevantResult = lastResults.find((resultItem) => {
    const playerId = stringValue(player.id);
    return (
      stringValue(resultItem.playerAId) === playerId ||
      stringValue(resultItem.playerBId) === playerId ||
      stringValue(resultItem.homePlayerId) === playerId ||
      stringValue(resultItem.awayPlayerId) === playerId
    );
  });
  const snapshots = recordValues(
    relevantResult?.finalUnits ?? relevantResult?.units,
  );
  snapshots.forEach((rawUnit) => {
    const unit = asRecord(rawUnit);
    const id = stringValue(unit.id ?? unit.unitId);
    const existing = result.find((item) => item.id === id);
    if (existing) {
      existing.maxHp = Math.max(
        1,
        numberValue(unit.maxHp, existing.maxHp),
      );
      existing.hp = existing.maxHp;
      existing.finalHp = numberValue(
        unit.hp ?? unit.currentHp,
        existing.maxHp,
      );
    }
  });

  return { units: result, views };
}

function normalizeTraits(
  player: UnknownRecord,
  definitions: Map<string, UnknownRecord>,
): TraitView[] {
  let active: unknown = player.activeTraits ?? player.traits;
  if (engine.getActiveTraits) {
    try {
      active = engine.getActiveTraits(player, content);
    } catch {
      // The adapter can still derive an empty trait panel from player data.
    }
  }

  const rows: UnknownRecord[] =
    active instanceof Map
      ? [...active.entries()].map(([id, value]) =>
          asRecord({ id: String(id), ...asRecord(value) }),
        )
      : Array.isArray(active)
        ? active.map((value) => asRecord(value))
        : Object.entries(asRecord(active)).map(([id, value]) =>
            asRecord({ id, ...asRecord(value) }),
          );

  return rows
    .map((row) => {
      const id = stringValue(row.id ?? row.traitId ?? row.key);
      const definition = definitions.get(id) ?? {};
      const meta = DEFAULT_TRAIT_META[slugify(id)] ?? {
        icon: "◆",
        color: cssColor(id),
      };
      const tierDefinitions = Array.isArray(definition.tiers)
        ? definition.tiers.map(asRecord)
        : [];
      const thresholds = (
        Array.isArray(definition.thresholds)
          ? definition.thresholds
          : Array.isArray(row.thresholds)
            ? row.thresholds
            : tierDefinitions.map((tier) => tier.required)
      )
        .map((threshold) => numberValue(threshold))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      const count = numberValue(row.count ?? row.value, 0);
      return {
        id,
        name: stringValue(
          definition.name ?? row.name,
          titleCase(id || "Unknown"),
        ),
        icon: stringValue(definition.icon, meta.icon),
        count,
        next:
          numberValue(row.nextThreshold, 0) ||
          thresholds.find((threshold) => threshold > count) ||
          null,
        tier: Math.max(
          0,
          numberValue(
            row.tierIndex ?? row.tier ?? row.activeTier,
            count > 0 ? 1 : 0,
          ) + (row.tierIndex !== undefined ? 1 : 0),
        ),
        description: stringValue(
          definition.description ?? row.description,
          "Field more crew with this bond to strengthen its effect.",
        ),
        color: stringValue(definition.color, meta.color),
      };
    })
    .filter((trait) => trait.id && trait.count > 0)
    .sort((a, b) => b.tier - a.tier || b.count - a.count);
}

function normalizeEvents(
  state: UnknownRecord,
  viewerId: string,
): {
  events: CombatFxEvent[];
  sequence: number;
  durationSeconds: number;
} {
  const results = recordValues(state.lastResults).map(asRecord);
  const result =
    results.find(
      (candidate) =>
        stringValue(candidate.playerAId) === viewerId ||
        stringValue(candidate.playerBId) === viewerId,
    ) ?? results[0];
  const events = recordValues(
    result?.events ?? asRecord(result?.battle).events,
  ).filter((rawEvent) => {
    const rawKind = stringValue(
      asRecord(rawEvent).kind ?? asRecord(rawEvent).type,
    ).toLowerCase();
    return rawKind !== "battle-start" && rawKind !== "battle-end";
  });
  const mirrorCoordinates = stringValue(result?.playerBId) === viewerId;
  const tickMs = numberValue(
    asRecord(asRecord(content).config).combatTickMs,
    100,
  );
  return {
    events: events.map((rawEvent, index) => {
      const event = asRecord(rawEvent);
      const rawKind = stringValue(event.kind ?? event.type, "attack").toLowerCase();
      const kind: CombatFxEvent["kind"] = rawKind.includes("move")
        ? "move"
        : rawKind.includes("heal")
          ? "heal"
        : rawKind.includes("defeat") || rawKind.includes("death")
          ? "defeat"
           : rawKind.includes("ability") ||
               rawKind.includes("skill") ||
               rawKind.includes("cast") ||
               rawKind.includes("shield") ||
               rawKind.includes("status")
            ? "ability"
            : rawKind.includes("damage")
              ? "damage"
              : "attack";
      return {
        id: stringValue(event.id, `${numberValue(state.round)}-${index}`),
        tick: Math.max(0, numberValue(event.tick, index)),
        kind,
        sourceId: stringValue(
          event.sourceId ?? event.attackerId ?? event.casterId ?? event.unitId,
        ),
        targetId: stringValue(
          event.targetId ??
            event.defenderId ??
            (Array.isArray(event.targetIds) ? event.targetIds[0] : undefined) ??
            (rawKind.includes("death") ? event.unitId : undefined),
        ),
        amount: numberValue(event.amount ?? event.damage ?? event.healing, 0),
        label: stringValue(event.label),
        toX: rawKind.includes("move")
          ? mirrorCoordinates
            ? 7 - numberValue(asRecord(event.to).x, 0)
            : numberValue(asRecord(event.to).x, 0)
          : undefined,
        toY: rawKind.includes("move")
          ? mirrorCoordinates
            ? 5 - numberValue(asRecord(event.to).y, 0)
            : numberValue(asRecord(event.to).y, 0)
          : undefined,
      };
    }),
    sequence:
      numberValue(state.round, 1) * 10 +
      (phaseName(state.phase) === "battle" ? 1 : 0),
    durationSeconds: Math.max(
      1,
      Math.ceil((numberValue(result?.durationTicks, 1) * tickMs) / 1_000),
    ),
  };
}

function normalizeChoices(
  state: UnknownRecord,
  player: UnknownRecord,
  choiceType: "items" | "units" | "carousel",
  unitDefinitions: Map<string, UnknownRecord>,
  itemDefinitions: Map<string, UnknownRecord>,
): ChoiceView[] {
  const stateChoices =
    choiceType === "items"
      ? asRecord(state.pendingItemChoices)[stringValue(player.id)] ??
        state.itemChoices ??
        player.itemChoices ??
        player.choices
      : choiceType === "carousel"
        ? state.carouselChoices ?? state.carousel ?? player.carouselChoices
        : state.carouselChoices ?? state.carousel ?? player.carouselChoices;
  const choices = recordValues(stateChoices).filter((choice) => {
    if (choiceType === "items") return true;
    const takenBy = asRecord(choice).takenByPlayerId;
    return takenBy === null || takenBy === undefined || takenBy === "";
  });
  const definitions =
    choiceType === "units" ? unitDefinitions : itemDefinitions;
  const choiceLimit = choiceType === "items" ? 3 : 8;
  const fallback = [...definitions.entries()]
    .slice(0, choiceLimit)
    .map(([id, definition]) => ({ id, ...definition }));
  const source = choices.length ? choices : fallback;

  return source.slice(0, choiceLimit).map((raw, index) => {
    const rawRecord = asRecord(raw);
    const choiceId =
      typeof raw === "string"
        ? raw
        : stringValue(
            rawRecord.id ??
              rawRecord.itemId ??
              rawRecord.definitionId ??
              rawRecord.unitId,
            `choice-${index}`,
          );
    const definitionId =
      choiceType === "units"
        ? stringValue(
            rawRecord.unitDefinitionId ?? rawRecord.definitionId,
            choiceId,
          )
        : typeof raw === "string"
          ? raw
          : stringValue(rawRecord.itemId ?? rawRecord.definitionId, choiceId);
    const definition = definitions.get(definitionId) ?? rawRecord;
    const name = stringValue(
      definition.name ?? rawRecord.name,
      titleCase(definitionId),
    );
    return {
      id: choiceId,
      name,
      description: stringValue(
        definition.description ?? rawRecord.description,
        choiceType === "items"
          ? "A mysterious treasure recovered from the enemy."
          : "Recruit this fighter to your voyage.",
      ),
      icon: stringValue(
        definition.icon,
        choiceType === "units" ? "☠" : "✦",
      ),
      portrait:
        choiceType === "units"
          ? stringValue(
              definition.portraitPath ?? definition.portrait,
              `/assets/portraits/${slugify(definitionId)}.png`,
            )
          : undefined,
      color: stringValue(definition.color, cssColor(definitionId)),
      effects:
        choiceType === "units"
          ? []
          : recordValues(definition.effects).map(formatItemEffect),
    };
  });
}

function normalizeMatch(stateValue: unknown): MatchView {
  const state = asRecord(stateValue);
  const playerId = getPlayerId(state);
  const player = getPlayer(state, playerId);
  const playerLevel = Math.max(1, numberValue(player.level, 1));
  const configuredXpToNext = asRecord(
    asRecord(asRecord(content).config).xpToNextByLevel,
  )[String(playerLevel)];
  const unitDefinitions = getDefinitionMap("units");
  const traitDefinitions = getDefinitionMap("traits");
  const itemDefinitions = getDefinitionMap("items");
  const enemyDefinitions = getDefinitionMap("enemies");
  const rawPhase = phaseName(state.phase);
  const round = Math.max(1, numberValue(state.round ?? state.stage, 1));
  const stage =
    recordValues(asRecord(content).stages)
      .map(asRecord)
      .find(
        (candidate) =>
          stringValue(candidate.id) === stringValue(state.stageId) ||
          numberValue(candidate.round, -1) === round,
      ) ?? {};
  const pairings = recordValues(state.pairings).map(asRecord);
  const pairing = pairings.find((item) => {
    const ids = [
      item.playerAId,
      item.playerBId,
      item.homePlayerId,
      item.awayPlayerId,
      item.a,
      item.b,
    ].map(String);
    return ids.includes(playerId);
  });
  const opponentId = [
    pairing?.playerAId,
    pairing?.playerBId,
    pairing?.homePlayerId,
    pairing?.awayPlayerId,
    pairing?.ghostOfPlayerId,
    pairing?.a,
    pairing?.b,
  ]
    .map((value) => stringValue(value))
    .find((id) => id && id !== playerId);
  const opponentRecord = opponentId ? getPlayer(state, opponentId) : null;
  const board = buildBoardUnits(
    state,
    player,
    opponentRecord,
    unitDefinitions,
    traitDefinitions,
    itemDefinitions,
  );
  const isPveStage =
    stringValue(stage.kind).toLowerCase() === "pve" &&
    !opponentRecord;
  const isPveBattle = isPveStage && rawPhase === "battle";
  if (isPveBattle) {
    let enemyIndex = 0;
    recordValues(stage.enemyWave).forEach((rawWave) => {
      const wave = asRecord(rawWave);
      const enemyId = stringValue(wave.enemyId ?? wave.id);
      const definition = enemyDefinitions.get(enemyId) ?? wave;
      const definitionView = unitView(
        enemyId,
        definition,
        traitDefinitions,
      );
      const count = Math.max(1, numberValue(wave.count, 1));
      for (let copy = 0; copy < count; copy += 1) {
        const id = `pve-${round}-${playerId}-${enemyIndex}`;
        const maxHp = numberValue(asRecord(definition.stats).health, 500);
        board.views.set(id, definitionView);
        board.units.push({
          id,
          contentId: enemyId,
          name: definitionView.name,
          shortName: definitionView.shortName,
          color: hashColor(enemyId),
          team: "enemy",
          zone: "board",
          x: enemyIndex % 8,
          y: Math.min(2, Math.floor(enemyIndex / 8)),
          slot: 0,
          star: 1,
          items: [],
          hp: maxHp,
          maxHp,
          portrait: definitionView.token,
        });
        enemyIndex += 1;
      }
    });
  }
  const allPlayers = recordValues(state.players).map(asRecord);
  const standings = allPlayers
    .map((rawPlayer) => ({
      id: stringValue(rawPlayer.id),
      name: stringValue(
        rawPlayer.name,
        booleanValue(rawPlayer.isBot) ? "Rival Captain" : "Your Crew",
      ),
      hp: Math.max(0, numberValue(rawPlayer.hp ?? rawPlayer.health, 100)),
      level: Math.max(1, numberValue(rawPlayer.level, 1)),
      streak: numberValue(
        rawPlayer.winStreak,
        -numberValue(rawPlayer.lossStreak, 0),
      ),
      alive: booleanValue(
        rawPlayer.alive,
        numberValue(rawPlayer.hp ?? rawPlayer.health, 100) > 0,
      ),
      isHuman: stringValue(rawPlayer.id) === playerId,
    }))
    .sort(
      (a, b) =>
        Number(b.alive) - Number(a.alive) ||
        b.hp - a.hp ||
        b.level - a.level,
    );
  const opponent =
    (isPveStage
      ? {
          id: stringValue(stage.id, "pve"),
          name: stringValue(stage.name, "Grand Line Raiders"),
          hp: 100,
          level: round,
          streak: 0,
          alive: true,
          isHuman: false,
        }
      : null) ??
    standings.find((standing) => standing.id === opponentId) ??
    null;
  const normalizedTraits = normalizeTraits(player, traitDefinitions);
  const traitCounts = new Map(
    normalizedTraits.map((trait) => [trait.id, trait.count]),
  );
  const playerInstances = recordValues(player.units).map(asRecord);
  const bench = Array.isArray(player.bench) ? player.bench : [];
  const benchSize = Math.max(
    1,
    numberValue(asRecord(asRecord(content).config).benchSize, 8),
  );
  const hasBenchSpace =
    bench.length < benchSize ||
    bench.some((slot) => slot === null || slot === undefined);
  const deployedDefinitionIds = new Set(
    Object.values(asRecord(player.board))
      .map((unitId) => asRecord(asRecord(player.units)[String(unitId)]))
      .map((instance) => stringValue(instance.definitionId))
      .filter(Boolean),
  );

  const enrichUnit = (base: ShopUnitView): ShopUnitView => {
    const owned = playerInstances.filter(
      (instance) => stringValue(instance.definitionId) === base.id,
    );
    const oneStarCount = owned.filter(
      (instance) => numberValue(instance.star, 1) === 1,
    ).length;
    const twoStarCount = owned.filter(
      (instance) => numberValue(instance.star, 1) === 2,
    ).length;
    const hasThreeStar = owned.some(
      (instance) => numberValue(instance.star, 1) >= 3,
    );
    const ownedCopies = owned.reduce((total, instance) => {
      const star = numberValue(instance.star, 1);
      return total + (star >= 3 ? 9 : star === 2 ? 3 : 1);
    }, 0);
    const purchaseUpgrade: 2 | 3 | null =
      oneStarCount >= 2 ? (twoStarCount >= 2 ? 3 : 2) : null;
    const canReceive = hasBenchSpace || oneStarCount >= 2;
    const affordable = numberValue(player.gold) >= base.cost;
    const traitPreview = base.traits.map((traitId) => {
      const definition = traitDefinitions.get(traitId) ?? {};
      const current = traitCounts.get(traitId) ?? 0;
      const deltaIfFielded: 0 | 1 = deployedDefinitionIds.has(base.id)
        ? 0
        : 1;
      const thresholds = recordValues(definition.tiers)
        .map((tier) => numberValue(asRecord(tier).required))
        .filter((threshold) => threshold > 0)
        .sort((a, b) => a - b);
      const next =
        thresholds.find((threshold) => threshold > current) ?? null;
      return {
        id: traitId,
        name: stringValue(definition.name, titleCase(traitId)),
        current,
        next,
        deltaIfFielded,
        activatesIfFielded:
          next !== null && current + deltaIfFielded >= next,
      };
    });

    return {
      ...base,
      ownedCopies,
      mergeProgress: hasThreeStar
        ? "MAX"
        : ownedCopies < 3
          ? `${ownedCopies} / 3 → ★★`
          : `${ownedCopies} / 9 → ★★★`,
      purchaseUpgrade,
      affordable,
      canReceive,
      disabledReason: !affordable
        ? "NOT ENOUGH GOLD"
        : !canReceive
          ? "BENCH FULL"
          : null,
      traitPreview,
    };
  };

  for (const [unitId, definitionView] of board.views) {
    board.views.set(unitId, enrichUnit(definitionView));
  }
  const shop = Array.isArray(player.shop) ? player.shop : [];
  const normalizedShop = Array.from({ length: 6 }, (_, index) => {
    const rawSlot = shop[index];
    if (rawSlot === null || rawSlot === undefined) return null;
    const slotRecord = asRecord(rawSlot);
    const id =
      typeof rawSlot === "string"
        ? rawSlot
        : stringValue(slotRecord.definitionId ?? slotRecord.id);
    if (!id) return null;
    return enrichUnit(
      unitView(
        id,
        unitDefinitions.get(id) ?? slotRecord,
        traitDefinitions,
      ),
    );
  });
  const deployed = Object.keys(asRecord(player.board)).length;
  const events = normalizeEvents(state, playerId);
  const humanStandingIndex = standings.findIndex(
    (standing) => standing.isHuman,
  );
  const winnerId = stringValue(state.winnerId);
  const winner = standings.find((standing) => standing.id === winnerId);
  const choices = normalizeChoices(
    state,
    player,
    rawPhase === "carousel" ? "carousel" : "items",
    unitDefinitions,
    itemDefinitions,
  );
  const itemsById = new Map(
    [...itemDefinitions.entries()].map(([id, definition]) => [
      id,
      itemView(id, definition),
    ]),
  );
  const inventory = (Array.isArray(player.inventory) ? player.inventory : [])
    .map((rawItemId) => {
      const id = String(rawItemId);
      return itemsById.get(id) ?? itemView(id, {});
    });
  const finalCrewRecords = recordValues(player.finalCrew).map(asRecord);
  const resultCrew =
    finalCrewRecords.length > 0
      ? finalCrewRecords.map((instance, index) => {
          const definitionId = stringValue(instance.definitionId);
          const definition = unitDefinitions.get(definitionId) ?? {};
          const definitionView = enrichUnit(
            unitView(definitionId, definition, traitDefinitions),
          );
          const id = `final:${stringValue(instance.id, `${definitionId}-${index}`)}`;
          const star = Math.max(1, numberValue(instance.star, 1));
          const baseHp = numberValue(asRecord(definition.stats).health, 100);
          const maxHp = Math.round(
            baseHp * (star >= 3 ? 3.24 : star === 2 ? 1.8 : 1),
          );
          board.views.set(id, definitionView);
          return {
            id,
            contentId: definitionId,
            name: definitionView.name,
            shortName: definitionView.shortName,
            color: hashColor(definitionId),
            team: "player" as const,
            zone: "bench" as const,
            x: index % 8,
            y: 5,
            slot: index,
            star,
            items: Array.isArray(instance.items)
              ? instance.items.map(String).slice(0, 3)
              : [],
            hp: maxHp,
            maxHp,
            portrait: definitionView.token,
          };
        })
      : board.units.filter((unit) => unit.team === "player");
  const config = asRecord(asRecord(content).config);
  const interest = Math.min(
    numberValue(config.maxInterest, 5),
    Math.floor(numberValue(player.gold) / 10),
  );
  const streakLength = Math.max(
    numberValue(player.winStreak),
    numberValue(player.lossStreak),
  );
  const streakIncome = Math.min(
    numberValue(config.maxStreakBonus, 5),
    Math.max(0, streakLength - 1),
  );
  const baseIncome = numberValue(config.baseIncome, 5);

  return {
    playerId,
    phase: rawPhase,
    alive: booleanValue(
      player.alive,
      numberValue(player.hp ?? player.health, 100) > 0,
    ),
    phaseLabel:
      rawPhase === "preparation"
        ? "PREPARE"
        : rawPhase === "battle"
          ? "BATTLE"
          : rawPhase === "item-choice"
            ? "TREASURE"
            : rawPhase === "carousel"
              ? "CAROUSEL"
              : "VOYAGE ENDED",
    round,
    stageLabel: `${Math.floor((round - 1) / 5) + 1}-${((round - 1) % 5) + 1}`,
    gold: numberValue(player.gold, 0),
    hp: Math.max(0, numberValue(player.hp ?? player.health, 100)),
    level: playerLevel,
    xp: Math.max(0, numberValue(player.xp, 0)),
    xpToNext: Math.max(
      1,
      numberValue(
        player.xpToNext ?? player.nextLevelXp ?? configuredXpToNext,
        8,
      ),
    ),
    deployed,
    capacity: Math.max(1, numberValue(player.level, 1)),
    shopLocked: booleanValue(player.shopLocked),
    shop: normalizedShop,
    inventory,
    boardUnits: board.units,
    resultCrew,
    traits: normalizedTraits,
    standings,
    opponent,
    choices,
    selectedDefinitionByUnit: board.views,
    itemsById,
    economy: {
      base: baseIncome,
      interest,
      streak: streakIncome,
      total: baseIncome + interest + streakIncome,
    },
    events: events.events,
    eventSequence: events.sequence,
    battleDurationSeconds: events.durationSeconds,
    placement: Math.max(
      1,
      numberValue(
        player.placement,
        humanStandingIndex >= 0 ? humanStandingIndex + 1 : 1,
      ),
    ),
    winnerName:
      winner?.name ??
      (winnerId === playerId ? "Your Crew" : "A rival captain"),
  };
}

function openVoyageDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readVoyage(): Promise<SaveEnvelope | null> {
  const database = await openVoyageDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(ACTIVE_SAVE);
    request.onsuccess = () => resolve((request.result as SaveEnvelope) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function writeVoyage(envelope: SaveEnvelope): Promise<void> {
  const database = await openVoyageDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(envelope, ACTIVE_SAVE);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

async function deleteVoyage(): Promise<void> {
  const database = await openVoyageDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(ACTIVE_SAVE);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

function useSynth(settings: Settings) {
  const contextRef = useRef<AudioContext | null>(null);

  const play = useCallback(
    (sound: SoundName) => {
      if (settings.muted || settings.volume <= 0 || typeof window === "undefined") {
        return;
      }
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = contextRef.current ?? new AudioContextClass();
      contextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const config: Record<SoundName, [number, number, OscillatorType]> = {
        click: [280, 0.055, "square"],
        coin: [620, 0.11, "triangle"],
        error: [130, 0.16, "sawtooth"],
        battle: [190, 0.2, "square"],
        reward: [760, 0.25, "triangle"],
      };
      const [frequency, duration, type] = config[sound];
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (sound === "reward") {
        oscillator.frequency.exponentialRampToValueAtTime(1120, now + duration);
      } else if (sound === "battle") {
        oscillator.frequency.exponentialRampToValueAtTime(90, now + duration);
      }
      gain.gain.setValueAtTime(settings.volume * 0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    },
    [settings.muted, settings.volume],
  );

  return play;
}

export default function GameClient() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [returnScreen, setReturnScreen] = useState<Screen>("menu");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const settingsReadyRef = useRef(false);
  const [engineState, setEngineStateReact] = useState<unknown | null>(null);
  const engineStateRef = useRef<unknown | null>(null);
  const preBattleStateRef = useRef<unknown | null>(null);
  const [seed, setSeed] = useState("");
  const [hasSave, setHasSave] = useState(false);
  const [saveReady, setSaveReady] = useState(false);
  const [saveDate, setSaveDate] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [timer, setTimer] = useState(30);
  const [phaseDuration, setPhaseDuration] = useState(30);
  const [choiceTimer, setChoiceTimer] = useState(10);
  const [toast, setToast] = useState<ToastView | null>(null);
  const toastIdRef = useRef(0);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep | null>(
    null,
  );
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const playSound = useSynth(settings);
  const view = useMemo(
    () => (engineState ? normalizeMatch(engineState) : null),
    [engineState],
  );
  const activePhase = view?.phase;
  const activeRound = view?.round;
  const activeBattleDuration = view?.battleDurationSeconds ?? 45;

  const showToast = useCallback(
    (
      kind: ToastView["kind"],
      title: string,
      message: string,
    ) => {
      toastIdRef.current += 1;
      setToast({ id: toastIdRef.current, kind, title, message });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const toastTimer = window.setTimeout(() => setToast(null), 3_600);
    return () => window.clearTimeout(toastTimer);
  }, [toast]);

  const setEngineState = useCallback((next: unknown) => {
    engineStateRef.current = next;
    const nextPhase = phaseName(asRecord(next).phase);
    if (nextPhase === "preparation") {
      preBattleStateRef.current = next;
    } else if (nextPhase !== "battle") {
      preBattleStateRef.current = null;
    }
    setEngineStateReact(next);
  }, []);

  useEffect(() => {
    const settingsTimer = window.setTimeout(() => {
      settingsReadyRef.current = true;
      setSettings(loadStoredSettings());
    }, 0);
    void readVoyage()
      .then((saved) => {
        setHasSave(Boolean(saved?.state));
        setSaveDate(saved?.updatedAt ?? null);
      })
      .catch(() => {
        setHasSave(false);
      })
      .finally(() => setSaveReady(true));
    return () => window.clearTimeout(settingsTimer);
  }, []);

  useEffect(() => {
    if (!settingsReadyRef.current) return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // The game remains playable if preference storage is blocked.
    }
  }, [settings]);

  useEffect(() => {
    if (!engineState || !seed) return;
    const saveTimer = window.setTimeout(() => {
      setSaveStatus("saving");
      const updatedAt = Date.now();
      const replayBattle =
        phaseName(asRecord(engineState).phase) === "battle" &&
        Boolean(preBattleStateRef.current);
      const stableState = replayBattle
        ? preBattleStateRef.current
        : engineState;
      void writeVoyage({
        state: stableState,
        seed,
        updatedAt,
        schemaVersion: numberValue(engine.CURRENT_SAVE_SCHEMA_VERSION, 3),
        contentVersion: stringValue(
          asRecord(stableState).contentVersion,
          "1.0.0",
        ),
        replayBattle,
      })
        .then(() => {
          setHasSave(true);
          setSaveDate(updatedAt);
          setSaveStatus("saved");
          window.setTimeout(() => setSaveStatus("idle"), 1200);
        })
        .catch(() => {
          setSaveStatus("idle");
        });
    }, 250);
    return () => window.clearTimeout(saveTimer);
  }, [engineState, seed]);

  useEffect(() => {
    if (!view || screen === "settings" || screen === "animation-lab") return;
    const syncScreen = window.setTimeout(() => {
      if (view.phase === "game-over" || !view.alive) {
        setScreen("results");
        return;
      }
      if (view.phase === "item-choice") {
        if (screen !== "reward") {
          setScreen("reward");
          playSound("reward");
        }
        return;
      }
      if (view.phase === "carousel") {
        if (screen !== "carousel") {
          setScreen("carousel");
        }
        return;
      }
      if (screen === "reward" || screen === "carousel" || screen === "results") {
        setScreen("match");
      }
    }, 0);
    return () => window.clearTimeout(syncScreen);
  }, [view?.phase, screen, view, playSound]);

  useEffect(() => {
    if (!activePhase || !activeRound) return;
    const stage = asRecord(
      engine.getStageDefinition?.(activeRound, content),
    );
    const duration =
      activePhase === "battle"
        ? Math.min(
            numberValue(stage.battleSeconds, 45),
            Math.max(
              1,
              Math.ceil(
                activeBattleDuration /
                  Math.max(0.5, settings.animationSpeed),
              ),
            ),
          )
        : numberValue(stage.preparationSeconds, 30);
    const resetTimer = window.setTimeout(() => {
      setTimer(duration);
      setPhaseDuration(duration);
      if (activePhase === "carousel") setChoiceTimer(10);
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [
    activeBattleDuration,
    activePhase,
    activeRound,
    settings.animationSpeed,
  ]);

  const issueCommand = useCallback(
    (
      command: UnknownRecord,
      successSound: SoundName = "click",
      successMessage = "The crew carried out your order.",
    ) => {
      const current = engineStateRef.current;
      if (!current || !engine.applyCommand) {
        showToast(
          "error",
          "ORDER NOT READY",
          "The rules engine is still preparing this order.",
        );
        playSound("error");
        return false;
      }
      try {
        const outcome = normalizeCommandResult(
          engine.applyCommand(current, command, content),
          current,
        );
        if (!outcome.ok) {
          showToast(
            "error",
            "ORDER REJECTED",
            outcome.error ?? "That order cannot be carried out.",
          );
          playSound("error");
          return false;
        }
        setEngineState(outcome.state);
        showToast("success", "ORDER COMPLETE", successMessage);
        playSound(successSound);
        return true;
      } catch {
        showToast(
          "error",
          "ORDER REJECTED",
          "That order was rejected by the crew.",
        );
        playSound("error");
        return false;
      }
    },
    [playSound, setEngineState, showToast],
  );

  const advancePhase = useCallback(() => {
    if (isAdvancing || !engineStateRef.current || !engine.advanceMatchPhase) {
      return;
    }
    setIsAdvancing(true);
    let next: unknown = engineStateRef.current;
    const stateRecord = asRecord(next);
    const currentPhase = phaseName(stateRecord.phase);
    const humanId = getPlayerId(stateRecord);

    try {
      if (currentPhase === "preparation" && engine.applyCommand) {
        const ready = normalizeCommandResult(
          engine.applyCommand(
            next,
            { type: "END_PREPARATION", playerId: humanId },
            content,
          ),
          next,
        );
        if (ready.ok) next = ready.state;
      }

      if (
        phaseName(asRecord(next).phase) === currentPhase ||
        currentPhase === "battle"
      ) {
        if (currentPhase === "preparation") {
          preBattleStateRef.current = next;
        }
        next = engine.advanceMatchPhase(next, content);
      }

      setEngineState(next);
      showToast(
        "info",
        currentPhase === "preparation" ? "SET SAIL" : "ROUND RESOLVED",
        currentPhase === "preparation"
          ? "Cannons ready — battle begins!"
          : "The tide turns. Prepare for the next encounter.",
      );
      playSound(currentPhase === "preparation" ? "battle" : "click");
    } catch {
      showToast(
        "error",
        "ROUGH SEAS",
        "Try ending the phase again.",
      );
      playSound("error");
    } finally {
      setIsAdvancing(false);
    }
  }, [isAdvancing, playSound, setEngineState, showToast]);

  const advanceRef = useRef(advancePhase);
  useEffect(() => {
    advanceRef.current = advancePhase;
  }, [advancePhase]);

  useEffect(() => {
    if (
      screen !== "match" ||
      !activePhase ||
      (activePhase === "preparation" && tutorialStep !== null) ||
      (activePhase !== "preparation" && activePhase !== "battle")
    ) {
      return;
    }
    const interval = window.setInterval(() => {
      setTimer((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(interval);
          const expectedPhase = activePhase;
          const expectedRound = activeRound;
          window.setTimeout(() => {
            const current = asRecord(engineStateRef.current);
            if (
              phaseName(current.phase) === expectedPhase &&
              numberValue(current.round ?? current.stage, 0) === expectedRound
            ) {
              advanceRef.current();
            }
          }, 0);
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [screen, activePhase, activeRound, tutorialStep]);

  const startVoyage = useCallback(() => {
    if (!engine.createMatch) {
      showToast(
        "error",
        "ENGINE UNAVAILABLE",
        "The rules engine did not load.",
      );
      playSound("error");
      return;
    }
    const freshSeed = `grand-line-${Date.now().toString(36)}`;
    try {
      const next = engine.createMatch(freshSeed, content);
      setSeed(freshSeed);
      setEngineState(next);
      setSelectedUnitId(null);
      setScreen("match");
      setTutorialStep(
        hasCompletedFirstVoyage() ? null : "welcome",
      );
      showToast(
        "info",
        "NEW VOYAGE",
        "Build your crew and prepare to cross the Grand Line.",
      );
      playSound("reward");
    } catch {
      showToast(
        "error",
        "LOG POSE FAILED",
        "A new voyage could not be charted.",
      );
      playSound("error");
    }
  }, [playSound, setEngineState, showToast]);

  const requestNewVoyage = useCallback(() => {
    if (hasSave) {
      setScreen("confirm-new");
      playSound("click");
      return;
    }
    startVoyage();
  }, [hasSave, playSound, startVoyage]);

  const replaceVoyage = useCallback(() => {
    // Keep the old log recoverable until the new state has been created and
    // the normal autosave successfully overwrites the active voyage.
    startVoyage();
  }, [startVoyage]);

  const continueVoyage = useCallback(() => {
    void readVoyage()
      .then((saved) => {
        if (!saved?.state) {
          setHasSave(false);
          showToast(
            "error",
            "NO SHIP'S LOG",
            "No saved voyage was found.",
          );
          playSound("error");
          return;
        }
        let restored: unknown = saved.state;
        if (engine.migrateMatchState) {
          restored = engine.migrateMatchState(restored, content);
        }
        if (saved.replayBattle && engine.advanceMatchPhase) {
          preBattleStateRef.current = restored;
          restored = engine.advanceMatchPhase(restored, content);
        }
        setSeed(saved.seed);
        setEngineState(restored);
        if (hasCompletedFirstVoyage()) {
          setTutorialStep(null);
        } else {
          const restoredStep = deriveTutorialStep(restored);
          if (restoredStep === null) {
            saveFirstVoyageCompletion();
          }
          setTutorialStep(restoredStep);
        }
        setScreen("match");
        showToast(
          "info",
          "SHIP'S LOG RESTORED",
          "Welcome back, Captain.",
        );
        playSound("click");
      })
      .catch(() => {
        showToast(
          "error",
          "LOG UNAVAILABLE",
          "The ship's log could not be opened.",
        );
        playSound("error");
      });
  }, [playSound, setEngineState, showToast]);

  const leaveVoyage = useCallback(() => {
    engineStateRef.current = null;
    preBattleStateRef.current = null;
    setEngineStateReact(null);
    setSeed("");
    setScreen("menu");
    setSelectedUnitId(null);
    setTutorialStep(null);
  }, []);

  const buyUnit = useCallback(
    (shopIndex: number) => {
      if (!view || view.phase !== "preparation") return;
      if (
        tutorialStep &&
        tutorialStep !== "recruit" &&
        tutorialStep !== "second"
      ) {
        showToast(
          "info",
          "FOLLOW THE GUIDE",
          "Complete the highlighted lesson before recruiting again.",
        );
        return;
      }
      if (
        tutorialStep === "second" &&
        view.boardUnits.filter((unit) => unit.team === "player").length >= 2
      ) {
        showToast(
          "info",
          "DEPLOY YOUR RECRUIT",
          "Move the new crew member from the bench onto the deck.",
        );
        return;
      }
      const recruit = view.shop[shopIndex];
      if (!recruit) return;
      issueCommand(
        { type: "BUY_UNIT", playerId: view.playerId, shopIndex },
        "coin",
        recruit.purchaseUpgrade
          ? `Recruited ${recruit.name} and merged to ${"★".repeat(recruit.purchaseUpgrade)}.`
          : `Recruited ${recruit.name} to the bench.`,
      );
    },
    [issueCommand, showToast, tutorialStep, view],
  );

  const moveUnit = useCallback(
    (move: BoardMove) => {
      if (!view || view.phase !== "preparation") return false;
      const unit = view.boardUnits.find(
        (candidate) => candidate.id === move.unitId,
      );
      return issueCommand(
        {
          type: "MOVE_UNIT",
          playerId: view.playerId,
          unitId: move.unitId,
          to:
            move.zone === "bench"
              ? { kind: "bench", index: move.slot ?? 0 }
              : {
                  kind: "board",
                  x: move.x ?? 0,
                  y: move.y ?? 3,
                },
        },
        "click",
        `${unit?.name ?? "Crew member"} moved ${
          move.zone === "bench" ? "to the bench" : "onto the deck"
        }.`,
      );
    },
    [issueCommand, view],
  );

  const sellSelected = useCallback(() => {
    if (!view || !selectedUnitId || view.phase !== "preparation") return;
    const selectedName =
      view.boardUnits.find((unit) => unit.id === selectedUnitId)?.name ??
      "the selected crew member";
    if (
      issueCommand(
        {
          type: "SELL_UNIT",
          playerId: view.playerId,
          unitId: selectedUnitId,
        },
        "coin",
        `Sold ${selectedName}; equipped treasure was returned.`,
      )
    ) {
      setSelectedUnitId(null);
    }
  }, [issueCommand, selectedUnitId, view]);

  const chooseReward = useCallback(
    (choiceId: string) => {
      if (!view) return;
      const type =
        view.phase === "carousel" ? "CAROUSEL_PICK" : "CHOOSE_ITEM";
      const command =
        type === "CAROUSEL_PICK"
          ? {
              type,
              playerId: view.playerId,
              choiceId,
            }
          : { type, playerId: view.playerId, choiceId };
      const choice = view.choices.find((candidate) => candidate.id === choiceId);
      if (
        issueCommand(
          command,
          "reward",
          `Claimed ${choice?.name ?? "a Grand Line treasure"}.`,
        )
      ) {
        const current = engineStateRef.current;
        if (
          current &&
          phaseName(asRecord(current).phase) === view.phase &&
          engine.advanceMatchPhase
        ) {
          try {
            setEngineState(engine.advanceMatchPhase(current, content));
          } catch {
            // Some engines advance as part of the choice command.
          }
        }
      }
    },
    [issueCommand, setEngineState, view],
  );

  const chooseRewardRef = useRef(chooseReward);
  useEffect(() => {
    chooseRewardRef.current = chooseReward;
  }, [chooseReward]);

  useEffect(() => {
    if (screen !== "carousel" || !view?.choices.length) return;
    const interval = window.setInterval(() => {
      setChoiceTimer((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(interval);
          const fallbackChoice = view.choices[0];
          window.setTimeout(() => {
            const accepted = issueCommand({
              type: "TIMER_EXPIRED",
              playerId: view.playerId,
            });
            if (!accepted) chooseRewardRef.current(fallbackChoice.id);
          }, 0);
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [issueCommand, screen, view?.round, view?.choices, view?.playerId]);

  const openSettings = useCallback(
    (from: Screen) => {
      setReturnScreen(from);
      setScreen("settings");
      playSound("click");
    },
    [playSound],
  );

  const closeSettings = useCallback(() => {
    if (
      returnScreen === "match" &&
      activePhase === "battle" &&
      activeRound
    ) {
      const stage = asRecord(
        engine.getStageDefinition?.(activeRound, content),
      );
      const duration = Math.min(
        numberValue(stage.battleSeconds, 45),
        Math.max(
          1,
          Math.ceil(
            activeBattleDuration /
              Math.max(0.5, settings.animationSpeed),
          ),
        ),
      );
      setTimer(duration);
      setPhaseDuration(duration);
    }
    setScreen(returnScreen);
  }, [
    activeBattleDuration,
    activePhase,
    activeRound,
    returnScreen,
    settings.animationSpeed,
  ]);

  const restartTutorial = useCallback(() => {
    setTutorialStep("welcome");
    showToast(
      "info",
      "FIRST VOYAGE GUIDE",
      "The preparation clock pauses while each lesson is open.",
    );
    closeSettings();
  }, [closeSettings, showToast]);

  const skipTutorial = useCallback(() => {
    saveFirstVoyageCompletion();
    setTutorialStep(null);
    showToast(
      "info",
      "GUIDE SKIPPED",
      "You can reopen it from Settings at any time.",
    );
  }, [showToast]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "SELECT" ||
        target?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (tutorialStep === "welcome") return;
        if (screen === "settings") closeSettings();
        else if (screen === "confirm-new") setScreen("menu");
        else if (screen === "animation-lab") setScreen("menu");
        else if (screen === "match") openSettings("match");
        return;
      }
      if (screen !== "match" || !view || view.phase !== "preparation") return;
      const key = event.key.toLowerCase();
      if (tutorialStep && ["r", "l", "x"].includes(key)) {
        event.preventDefault();
        showToast(
          "info",
          "FOLLOW THE GUIDE",
          "Economy controls unlock after the first-voyage lesson.",
        );
        return;
      }
      if (/^[1-6]$/.test(key)) {
        event.preventDefault();
        buyUnit(Number(key) - 1);
      } else if (key === "r") {
        event.preventDefault();
        issueCommand(
          {
            type: "REROLL_SHOP",
            playerId: view.playerId,
          },
          "coin",
          "The Recruitment Dock has six fresh offers.",
        );
      } else if (key === "l") {
        event.preventDefault();
        issueCommand(
          {
            type: "TOGGLE_SHOP_LOCK",
            playerId: view.playerId,
          },
          "click",
          view.shopLocked
            ? "The shop will refresh next round."
            : "These recruits will be held for the next round.",
        );
      } else if (key === "x") {
        event.preventDefault();
        issueCommand(
          { type: "BUY_XP", playerId: view.playerId },
          "coin",
          "Bought 4 XP.",
        );
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    buyUnit,
    closeSettings,
    issueCommand,
    openSettings,
    screen,
    showToast,
    tutorialStep,
    view,
  ]);

  const selectedUnit = view?.boardUnits.find(
    (unit) => unit.id === selectedUnitId,
  );
  const selectedDefinition =
    selectedUnitId && view
      ? view.selectedDefinitionByUnit.get(selectedUnitId)
      : undefined;
  const tutorialCrewCount =
    view?.boardUnits.filter((unit) => unit.team === "player").length ?? 0;
  const tutorialEquippedCount =
    view?.boardUnits
      .filter((unit) => unit.team === "player")
      .reduce((total, unit) => total + unit.items.length, 0) ?? 0;

  useEffect(() => {
    if (!tutorialStep || !view) return;
    let nextStep: TutorialStep | "complete" | null = null;
    if (tutorialStep === "recruit" && tutorialCrewCount >= 1) {
      nextStep = "deploy";
    } else if (tutorialStep === "deploy" && view.deployed >= 1) {
      nextStep = "second";
    } else if (
      tutorialStep === "second" &&
      tutorialCrewCount >= 2 &&
      view.deployed >= 2
    ) {
      nextStep = "sail";
    } else if (
      tutorialStep === "sail" &&
      view.phase === "preparation" &&
      view.deployed < 2
    ) {
      nextStep = "second";
    } else if (tutorialStep === "sail" && view.phase === "battle") {
      nextStep = "await-reward";
    } else if (
      tutorialStep === "await-reward" &&
      view.phase === "item-choice"
    ) {
      nextStep = "treasure";
    } else if (
      tutorialStep === "await-reward" &&
      view.phase === "carousel"
    ) {
      nextStep = "treasure";
    } else if (
      tutorialStep === "await-reward" &&
      view.phase === "preparation"
    ) {
      nextStep = "sail";
    } else if (
      tutorialStep === "treasure" &&
      view.phase === "preparation" &&
      view.inventory.length > 0
    ) {
      nextStep = "equip";
    } else if (tutorialStep === "equip" && tutorialEquippedCount > 0) {
      nextStep = "complete";
    }

    if (!nextStep) return;
    const transitionTimer = window.setTimeout(() => {
      if (nextStep === "complete") {
        saveFirstVoyageCompletion();
        setTutorialStep(null);
        showToast(
          "success",
          "GUIDE COMPLETE",
          "Your crew is ready to chart its own course.",
        );
        return;
      }
      if (nextStep === "second") {
        setSelectedUnitId(null);
      }
      setTutorialStep(nextStep);
    }, 0);
    return () => window.clearTimeout(transitionTimer);
  }, [
    showToast,
    tutorialCrewCount,
    tutorialEquippedCount,
    tutorialStep,
    view,
  ]);

  return (
    <main
      className={`game-shell ${settings.highContrast ? "high-contrast" : ""}`}
      aria-label="Grand Line Auto Chess"
    >
      <div className="ambient-sea" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {screen === "menu" && (
        <MainMenu
          hasSave={hasSave}
          saveReady={saveReady}
          saveDate={saveDate}
          onNew={requestNewVoyage}
          onContinue={continueVoyage}
          onSettings={() => openSettings("menu")}
          onAnimationLab={() => {
            setScreen("animation-lab");
            playSound("click");
          }}
        />
      )}
      {screen === "animation-lab" && (
        <AnimationLab
          onBack={() => {
            setScreen("menu");
            playSound("click");
          }}
        />
      )}
      {screen === "confirm-new" && (
        <ConfirmNewVoyageScreen
          onCancel={() => setScreen("menu")}
          onReplace={replaceVoyage}
        />
      )}
      {screen === "settings" && (
        <SettingsScreen
          settings={settings}
          onChange={setSettings}
          onBack={closeSettings}
          hasActiveVoyage={Boolean(engineState)}
          onLeaveVoyage={leaveVoyage}
          onRestartTutorial={restartTutorial}
        />
      )}
      {screen === "match" && view && (
        <MatchScreen
          view={view}
          timer={timer}
          phaseDuration={phaseDuration}
          settings={settings}
          selectedUnit={selectedUnit}
          selectedDefinition={selectedDefinition}
          tutorialStep={tutorialStep}
          saveStatus={saveStatus}
          isAdvancing={isAdvancing}
          onSelectUnit={setSelectedUnitId}
          onMoveUnit={moveUnit}
          onBuyUnit={buyUnit}
          onReroll={() =>
            issueCommand(
              {
                type: "REROLL_SHOP",
                playerId: view.playerId,
              },
              "coin",
              "The Recruitment Dock has six fresh offers.",
            )
          }
          onToggleLock={() =>
            issueCommand(
              {
                type: "TOGGLE_SHOP_LOCK",
                playerId: view.playerId,
              },
              "click",
              view.shopLocked
                ? "The shop will refresh next round."
                : "These recruits will be held for the next round.",
            )
          }
          onBuyXp={() =>
            issueCommand(
              { type: "BUY_XP", playerId: view.playerId },
              "coin",
              "Bought 4 XP.",
            )
          }
          onSellSelected={sellSelected}
          onEquipItem={(itemId) => {
            if (!selectedUnitId) return;
            const item = view.itemsById.get(itemId);
            issueCommand(
              {
                type: "EQUIP_ITEM",
                playerId: view.playerId,
                unitId: selectedUnitId,
                itemId,
              },
              "reward",
              `Equipped ${item?.name ?? "treasure"} to ${
                selectedDefinition?.name ?? "the selected crew member"
              }.`,
            );
          }}
          onAdvance={advancePhase}
          onSettings={() => openSettings("match")}
        />
      )}
      {screen === "carousel" && view && (
        <CarouselScreen
          choices={view.choices}
          round={view.round}
          timer={choiceTimer}
          onChoose={chooseReward}
        />
      )}
      {screen === "reward" && view && (
        <RewardScreen choices={view.choices} onChoose={chooseReward} />
      )}
      {screen === "results" && view && (
        <ResultsScreen
          view={view}
          onNew={startVoyage}
          onMenu={() => {
            void deleteVoyage().catch(() => undefined);
            setHasSave(false);
            leaveVoyage();
          }}
        />
      )}
      {toast && <ActionToast toast={toast} onClose={() => setToast(null)} />}
      {tutorialStep && view && screen !== "settings" && (
        <TutorialCoach
          step={tutorialStep}
          onBegin={() => setTutorialStep("recruit")}
          onSkip={skipTutorial}
        />
      )}
    </main>
  );
}

function MainMenu({
  hasSave,
  saveReady,
  saveDate,
  onNew,
  onContinue,
  onSettings,
  onAnimationLab,
}: {
  hasSave: boolean;
  saveReady: boolean;
  saveDate: number | null;
  onNew: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onAnimationLab: () => void;
}) {
  return (
    <section className="menu-screen">
      <div className="menu-cloud cloud-one" aria-hidden="true" />
      <div className="menu-cloud cloud-two" aria-hidden="true" />
      <div className="menu-island" aria-hidden="true">
        <span className="island-palm" />
      </div>
      <header className="title-lockup">
        <span className="title-kicker">A LOCAL AUTO-BATTLER</span>
        <div className="title-emblem" aria-hidden="true">
          <span className="emblem-wheel">✦</span>
        </div>
        <h1>
          <span>GRAND LINE</span>
          <strong>AUTO CHESS</strong>
        </h1>
        <p>Build a crew. Read the tides. Become King of the Pirates.</p>
      </header>
      <nav className="menu-actions" aria-label="Main menu">
        <button
          type="button"
          className="pixel-button primary"
          disabled={!saveReady}
          onClick={onNew}
        >
          <span className="button-icon">☠</span>
          NEW VOYAGE
          <small>
            {saveReady ? "Start with a fresh Log Pose" : "Reading ship's log…"}
          </small>
        </button>
        <button
          type="button"
          className="pixel-button"
          disabled={!hasSave}
          onClick={onContinue}
        >
          <span className="button-icon">➜</span>
          CONTINUE
          <small>
            {hasSave && saveDate
              ? `Ship's log · ${new Date(saveDate).toLocaleDateString()}`
              : "No voyage in the ship's log"}
          </small>
        </button>
        <button type="button" className="pixel-button compact" onClick={onSettings}>
          <span className="button-icon">⚙</span>
          SETTINGS
        </button>
        <button type="button" className="pixel-button compact" onClick={onAnimationLab}>
          <span className="button-icon">▦</span>
          ANIMATION LAB
        </button>
      </nav>
      <footer className="menu-footer">
        <span>OFFLINE</span>
        <i aria-hidden="true" />
        <span>LOCAL SAVE</span>
        <i aria-hidden="true" />
        <span>v0.1 PROTOTYPE</span>
      </footer>
      <p className="fan-disclaimer">
        Unofficial private local fan prototype. Franchise rights remain with
        their respective owners. Not endorsed or affiliated.
      </p>
    </section>
  );
}

function ConfirmNewVoyageScreen({
  onCancel,
  onReplace,
}: {
  onCancel: () => void;
  onReplace: () => void;
}) {
  return (
    <section className="overlay-screen">
      <div
        className="modal-panel confirm-new-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-new-title"
      >
        <div className="rope-heading">
          <span aria-hidden="true">⚠</span>
          <div>
            <p>SHIP&apos;S LOG</p>
            <h2 id="confirm-new-title">REPLACE SAVED VOYAGE?</h2>
          </div>
        </div>
        <p className="warning-copy">
          Starting over will replace the current local voyage as soon as the
          new crew is created. Settings and guide progress stay intact.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="pixel-button compact"
            onClick={onCancel}
            autoFocus
          >
            KEEP CURRENT LOG
          </button>
          <button
            type="button"
            className="pixel-button compact primary"
            onClick={onReplace}
          >
            START NEW VOYAGE
          </button>
        </div>
      </div>
    </section>
  );
}

function ActionToast({
  toast,
  onClose,
}: {
  toast: ToastView;
  onClose: () => void;
}) {
  return (
    <aside
      className={`action-toast ${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live={toast.kind === "error" ? "assertive" : "polite"}
    >
      <span aria-hidden="true">
        {toast.kind === "error" ? "!" : toast.kind === "success" ? "✓" : "◆"}
      </span>
      <div>
        <strong>{toast.title}</strong>
        <p>{toast.message}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss message">
        ×
      </button>
    </aside>
  );
}

function TutorialCoach({
  step,
  onBegin,
  onSkip,
}: {
  step: TutorialStep;
  onBegin: () => void;
  onSkip: () => void;
}) {
  const lessons: Record<
    TutorialStep,
    { eyebrow: string; title: string; copy: string; hint: string }
  > = {
    welcome: {
      eyebrow: "FIRST VOYAGE · 1 MINUTE",
      title: "WELCOME ABOARD, CAPTAIN",
      copy: "Learn the dock, deck, and treasure flow before the clock begins.",
      hint: "Preparation pauses while a guide card is open.",
    },
    recruit: {
      eyebrow: "STEP 1 OF 6 · RECRUIT",
      title: "CHOOSE YOUR FIRST CREWMATE",
      copy: "Click any affordable wanted poster in the Recruitment Dock.",
      hint: "Gold costs are shown in the lower-right of each card.",
    },
    deploy: {
      eyebrow: "STEP 2 OF 6 · FORMATION",
      title: "MOVE THEM ONTO YOUR DECK",
      copy: "Select the bench unit, then click a highlighted green deck tile—or drag it there.",
      hint: "Only the lower three rows belong to your crew.",
    },
    second: {
      eyebrow: "STEP 3 OF 6 · BUILD",
      title: "FIELD A SECOND CREWMATE",
      copy: "Recruit and deploy one more fighter. Your level determines your crew capacity.",
      hint: "Matching bonds grow stronger when distinct characters are deployed.",
    },
    sail: {
      eyebrow: "STEP 4 OF 6 · READY",
      title: "SET SAIL",
      copy: "Your formation is ready. Use the crimson Set Sail button to begin combat.",
      hint: "Combat is automatic; your preparation decisions determine the outcome.",
    },
    "await-reward": {
      eyebrow: "STEP 5 OF 6 · COMBAT",
      title: "WATCH THE PLAN UNFOLD",
      copy: "Your crew now moves, attacks, and casts abilities automatically.",
      hint: "The first Marine wave rewards a treasure when defeated.",
    },
    treasure: {
      eyebrow: "STEP 5 OF 6 · TREASURE",
      title: "CLAIM ONE REWARD",
      copy: "Choose the treasure that best supports the crew you are building.",
      hint: "Every item has a complete effect description.",
    },
    equip: {
      eyebrow: "STEP 6 OF 6 · EQUIP",
      title: "ARM YOUR CREW",
      copy: "Select a crew member, then click the new treasure in the left rail.",
      hint: "Each unit can carry up to three items. Selling returns all equipped items.",
    },
  };
  const lesson = lessons[step];
  const target =
    step === "recruit" || step === "second" || step === "sail"
      ? "shop"
      : step === "deploy"
        ? "board"
        : step === "equip"
          ? "inventory"
          : step === "await-reward" || step === "treasure"
            ? "reward"
            : "modal";
  const trapWelcomeFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (step !== "welcome" || event.key !== "Tab") return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      ),
    );
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className={`tutorial-coach tutorial-${step} ${
        step === "welcome" ? "is-modal" : ""
      }`}
      data-target={target}
    >
      <div className="tutorial-scrim" aria-hidden="true" />
      <aside
        className="tutorial-card"
        role={step === "welcome" ? "dialog" : "status"}
        aria-modal={step === "welcome" ? true : undefined}
        aria-labelledby="tutorial-title"
        aria-live={step === "welcome" ? undefined : "polite"}
        onKeyDown={trapWelcomeFocus}
      >
        <span className="tutorial-progress">{lesson.eyebrow}</span>
        <h2 id="tutorial-title">{lesson.title}</h2>
        <p>{lesson.copy}</p>
        <small>{lesson.hint}</small>
        <div className="tutorial-actions">
          <button type="button" className="text-button" onClick={onSkip}>
            Skip guide
          </button>
          {step === "welcome" && (
            <button
              type="button"
              className="pixel-button compact primary"
              onClick={onBegin}
              autoFocus
            >
              SHOW ME THE ROPES
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function SettingsScreen({
  settings,
  onChange,
  onBack,
  hasActiveVoyage,
  onLeaveVoyage,
  onRestartTutorial,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onBack: () => void;
  hasActiveVoyage: boolean;
  onLeaveVoyage: () => void;
  onRestartTutorial: () => void;
}) {
  return (
    <section className="overlay-screen settings-screen">
      <div className="modal-panel settings-panel">
        <div className="rope-heading">
          <span aria-hidden="true">⚙</span>
          <div>
            <p>CAPTAIN&apos;S QUARTERS</p>
            <h2>SETTINGS</h2>
          </div>
        </div>
        <div className="settings-grid">
          <label className="setting-row">
            <span>
              <strong>Master volume</strong>
              <small>Synthesized local sound effects</small>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              disabled={settings.muted}
              onChange={(event) =>
                onChange({ ...settings, volume: Number(event.target.value) })
              }
            />
            <output>{Math.round(settings.volume * 100)}%</output>
          </label>
          <SettingToggle
            label="Mute all sound"
            note="Useful when plotting in secret"
            checked={settings.muted}
            onChange={(muted) => onChange({ ...settings, muted })}
          />
          <label className="setting-row">
            <span>
              <strong>Battle speed</strong>
              <small>Controls board event animations</small>
            </span>
            <select
              value={settings.animationSpeed}
              onChange={(event) =>
                onChange({
                  ...settings,
                  animationSpeed: Number(event.target.value),
                })
              }
            >
              <option value={0.75}>Leisurely · 0.75×</option>
              <option value={1}>Normal · 1×</option>
              <option value={1.5}>Swift · 1.5×</option>
              <option value={2}>Storm speed · 2×</option>
            </select>
          </label>
          <fieldset className="map-skin-setting">
            <legend>
              <strong>Battlefield</strong>
              <small>Changes presentation only — combat rules stay identical</small>
            </legend>
            <div className="map-skin-picker">
              {BOARD_MAP_LIST.map((map) => (
                <button
                  type="button"
                  key={map.id}
                  className={settings.boardSkin === map.id ? "is-selected" : ""}
                  aria-pressed={settings.boardSkin === map.id}
                  onClick={() => onChange({ ...settings, boardSkin: map.id })}
                >
                  <span
                    className="map-skin-preview"
                    style={{ backgroundImage: `url(${map.assetPath})` }}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{map.label}</strong>
                    <small>{map.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <SettingToggle
            label="Combat particles"
            note="Sparks, splashes, and impact bursts"
            checked={settings.particles}
            onChange={(particles) => onChange({ ...settings, particles })}
          />
          <SettingToggle
            label="High contrast"
            note="Brighter borders and stronger labels"
            checked={settings.highContrast}
            onChange={(highContrast) =>
              onChange({ ...settings, highContrast })
            }
          />
        </div>
        <div className="key-map" aria-label="Keyboard shortcuts">
          <h3>QUICK ORDERS</h3>
          <span><kbd>1–6</kbd> Recruit</span>
          <span><kbd>R</kbd> Reroll</span>
          <span><kbd>L</kbd> Lock</span>
          <span><kbd>X</kbd> Buy XP</span>
          <span><kbd>Esc</kbd> Menu</span>
        </div>
        <div className="modal-actions">
          {hasActiveVoyage && (
            <>
              <button
                type="button"
                className="text-button"
                onClick={onRestartTutorial}
              >
                Restart first-voyage guide
              </button>
              <button type="button" className="text-button danger" onClick={onLeaveVoyage}>
                Return to title
              </button>
            </>
          )}
          <button type="button" className="pixel-button compact primary" onClick={onBack}>
            BACK TO DECK
          </button>
        </div>
      </div>
    </section>
  );
}

function SettingToggle({
  label,
  note,
  checked,
  onChange,
}: {
  label: string;
  note: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="setting-row toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{note}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true"><b /></i>
    </label>
  );
}

function MatchScreen({
  view,
  timer,
  phaseDuration,
  settings,
  selectedUnit,
  selectedDefinition,
  tutorialStep,
  saveStatus,
  isAdvancing,
  onSelectUnit,
  onMoveUnit,
  onBuyUnit,
  onReroll,
  onToggleLock,
  onBuyXp,
  onSellSelected,
  onEquipItem,
  onAdvance,
  onSettings,
}: {
  view: MatchView;
  timer: number;
  phaseDuration: number;
  settings: Settings;
  selectedUnit?: BoardUnit;
  selectedDefinition?: ShopUnitView;
  tutorialStep: TutorialStep | null;
  saveStatus: "idle" | "saving" | "saved";
  isAdvancing: boolean;
  onSelectUnit: (unitId: string | null) => void;
  onMoveUnit: (move: BoardMove) => boolean;
  onBuyUnit: (index: number) => void;
  onReroll: () => void;
  onToggleLock: () => void;
  onBuyXp: () => void;
  onSellSelected: () => void;
  onEquipItem: (itemId: string) => void;
  onAdvance: () => void;
  onSettings: () => void;
}) {
  const planning = view.phase === "preparation";
  const warning = timer <= 8;
  const playerCrewCount = view.boardUnits.filter(
    (unit) => unit.team === "player",
  ).length;
  const tutorialAllowsShop =
    tutorialStep === null ||
    tutorialStep === "recruit" ||
    (tutorialStep === "second" && playerCrewCount < 2);
  const tutorialAllowsSailing =
    tutorialStep === null || tutorialStep === "sail";
  let quickMove: BoardMove | null = null;
  if (selectedUnit?.team === "player") {
    if (selectedUnit.zone === "bench") {
      if (view.deployed < view.capacity) {
        const occupied = new Set(
          view.boardUnits
            .filter((unit) => unit.team === "player" && unit.zone === "board")
            .map((unit) => `${unit.x},${unit.y}`),
        );
        outer: for (let y = 5; y >= 3; y -= 1) {
          for (let x = 0; x < 8; x += 1) {
            if (!occupied.has(`${x},${y}`)) {
              quickMove = { unitId: selectedUnit.id, zone: "board", x, y };
              break outer;
            }
          }
        }
      }
    } else {
      const occupiedSlots = new Set(
        view.boardUnits
          .filter((unit) => unit.team === "player" && unit.zone === "bench")
          .map((unit) => unit.slot),
      );
      const slot = Array.from({ length: 8 }, (_, index) => index).find(
        (index) => !occupiedSlots.has(index),
      );
      if (slot !== undefined) {
        quickMove = { unitId: selectedUnit.id, zone: "bench", slot };
      }
    }
  }

  return (
    <section className="match-screen">
      <header className="match-topbar">
        <div className="round-medallion">
          <span>STAGE</span>
          <strong>{view.stageLabel}</strong>
        </div>
        <div className="opponent-banner">
          <span className="tiny-label">
            {view.opponent
              ? view.phase === "battle"
                ? "ENGAGED WITH"
                : "NEXT ENCOUNTER"
              : "PAIRING"}
          </span>
          <strong>
            {view.opponent?.name ?? "Pairing after preparation"}
          </strong>
          {view.opponent && <span>Lv. {view.opponent.level}</span>}
        </div>
        <div
          className={`phase-clock ${warning ? "is-warning" : ""}`}
          aria-label={`${view.phaseLabel}, ${timer} seconds remaining`}
        >
          <span>
            {planning && tutorialStep ? "PAUSED" : view.phaseLabel}
          </span>
          <strong>{timer.toString().padStart(2, "0")}</strong>
          <i style={{ "--timer": `${Math.max(0, timer) / Math.max(1, phaseDuration)}` } as CSSProperties} />
        </div>
        <div className="topbar-tools">
          <span className={`save-indicator ${saveStatus}`}>
            {saveStatus === "saving" ? "WRITING LOG…" : saveStatus === "saved" ? "LOG SAVED" : "LOCAL"}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={onSettings}
            aria-label="Open settings"
            data-tooltip="Settings · Esc"
          >
            ⚙
          </button>
        </div>
      </header>

      <div className="match-body">
        <div className="left-rail">
          <TraitsPanel traits={view.traits} />
          <InventoryTray
            items={view.inventory}
            units={view.boardUnits.filter((unit) => unit.team === "player")}
            selectedId={selectedUnit?.id ?? null}
            selectedName={selectedDefinition?.name}
            disabled={
              !planning ||
              !selectedUnit ||
              selectedUnit.items.length >= 3
            }
            help={
              !planning
                ? "Treasure can be equipped during preparation."
                : !selectedUnit
                  ? "Select a crew member, then click an item."
                  : selectedUnit.items.length >= 3
                    ? `${selectedDefinition?.name ?? "This unit"} already carries 3 items.`
                    : "Click an item to equip it. Max 3 per unit."
            }
            highlighted={tutorialStep === "equip"}
            onSelect={onSelectUnit}
            onEquip={onEquipItem}
          />
        </div>
        <div
          className={`board-column ${
            tutorialStep === "deploy" || tutorialStep === "second"
              ? "tutorial-focus"
              : ""
          }`}
        >
          <div className="board-ribbon">
            <span className={planning ? "active" : ""}>FORMATION</span>
            <i />
            <strong>
              {planning
                ? "Select or drag crew onto highlighted deck tiles"
                : "The crew fights on its own"}
            </strong>
            <i />
            <span className={!planning ? "active" : ""}>COMBAT</span>
          </div>
          <PhaserBoard
            units={view.boardUnits}
            selectedId={selectedUnit?.id ?? null}
            interactive={planning}
            phase={view.phase}
            capacity={view.capacity}
            boardSkin={settings.boardSkin}
            combatEvents={view.events}
            eventSequence={view.eventSequence}
            speed={settings.animationSpeed}
            particles={settings.particles}
            onMoveUnit={onMoveUnit}
            onSelectUnit={onSelectUnit}
          />
        </div>
        <div className="right-rail">
          {selectedUnit && selectedDefinition && (
            <UnitInspector
              unit={selectedUnit}
              definition={selectedDefinition}
              itemsById={view.itemsById}
              canSell={planning}
              allowSell={tutorialStep === null}
              quickMove={planning ? quickMove : null}
              onClose={() => onSelectUnit(null)}
              onSell={onSellSelected}
              onMove={() => quickMove && onMoveUnit(quickMove)}
            />
          )}
          {!selectedUnit && <StandingsPanel standings={view.standings} />}
        </div>
      </div>

      <footer className="match-footer">
        <div className="captain-stats">
          <div className="health-orb" data-tooltip="Captain health">
            <span>♥</span>
            <strong>{view.hp}</strong>
          </div>
          <div className="level-block">
            <span>LEVEL {view.level}</span>
            <div className="xp-track">
              <i
                style={{
                  width:
                    view.level >= 9
                      ? "100%"
                      : `${Math.min(100, (view.xp / view.xpToNext) * 100)}%`,
                }}
              />
            </div>
            <small>
              {view.level >= 9 ? "MAX LEVEL" : `${view.xp} / ${view.xpToNext} XP`}
            </small>
          </div>
          <button
            type="button"
            className="economy-button"
            disabled={!planning || view.level >= 9 || tutorialStep !== null}
            onClick={onBuyXp}
            data-tooltip="Buy 4 XP for 4 gold · X"
          >
            <kbd>X</kbd>
            BUY XP
            <small>4 <span className="coin-dot" /></small>
          </button>
          <div className="crew-capacity" data-tooltip="Crew deployed / maximum">
            <span>CREW</span>
            <strong className={view.deployed > view.capacity ? "over-cap" : ""}>
              {view.deployed}/{view.capacity}
            </strong>
          </div>
        </div>

        <div
          className={`shop-wrap ${
            tutorialStep === "recruit" || tutorialStep === "second"
              ? "tutorial-focus"
              : ""
          }`}
        >
          <div className="shop-heading">
            <span>RECRUITMENT DOCK</span>
            <small className="shop-help">
              Click a poster or press 1–6 · Hover for ability details
            </small>
          </div>
          <div className="shop-row">
            {view.shop.map((unit, index) => (
              <ShopCard
                key={`${unit?.id ?? "empty"}-${index}`}
                unit={unit}
                index={index}
                disabled={!planning || !unit || !tutorialAllowsShop}
                onBuy={() => onBuyUnit(index)}
              />
            ))}
          </div>
        </div>

        <div className="shop-controls">
          <div
            className="gold-pouch"
            data-tooltip={`Next income: ${view.economy.base} base + ${view.economy.interest} interest + ${view.economy.streak} streak`}
          >
            <span className="coin-large">●</span>
            <strong>{view.gold}</strong>
            <small>GOLD</small>
            <span className="economy-breakdown">
              +{view.economy.total} NEXT
            </span>
          </div>
          <button
            type="button"
            className="control-button"
            disabled={!planning || tutorialStep !== null}
            onClick={onReroll}
            data-tooltip="Refresh all recruits for 1 gold · R"
          >
            <kbd>R</kbd>
            <span>REROLL</span>
            <small>1 ●</small>
          </button>
          <button
            type="button"
            className={`control-button ${view.shopLocked ? "is-active" : ""}`}
            disabled={!planning || tutorialStep !== null}
            onClick={onToggleLock}
            data-tooltip="Keep this shop next round · L"
          >
            <kbd>L</kbd>
            <span>{view.shopLocked ? "LOCKED" : "LOCK"}</span>
            <small>{view.shopLocked ? "HELD" : "FREE"}</small>
          </button>
          <button
            type="button"
            className={`control-button sail-button ${
              tutorialStep === "sail" ? "tutorial-focus" : ""
            }`}
            disabled={
              isAdvancing ||
              (planning &&
                (!tutorialAllowsSailing ||
                  (tutorialStep === "sail" && view.deployed < 2)))
            }
            onClick={onAdvance}
            data-tooltip={planning ? "End preparation early" : "Resolve battle"}
          >
            <span>{planning ? "SET SAIL" : "CONTINUE"}</span>
            <small>{planning ? "READY!" : "NEXT TIDE"}</small>
          </button>
        </div>
      </footer>
    </section>
  );
}

function TraitsPanel({ traits }: { traits: TraitView[] }) {
  const active = traits.filter((trait) => trait.tier > 0);
  const building = traits.filter((trait) => trait.tier === 0);
  const renderTrait = (trait: TraitView) => (
    <div
      key={trait.id}
      className={`trait-row ${trait.tier > 0 ? "active" : ""}`}
      style={{ "--trait-color": trait.color } as CSSProperties}
      tabIndex={0}
      title={trait.description}
    >
      <span className="trait-icon">{trait.icon}</span>
      <span className="trait-copy">
        <strong>{trait.name}</strong>
        <small>
          {trait.next ? `${trait.count} / ${trait.next}` : `${trait.count} · MAX`}
        </small>
      </span>
      <span className="trait-pips">
        {Array.from(
          { length: Math.max(1, Math.min(3, trait.tier + 1)) },
          (_, index) => (
            <i key={index} className={index < trait.tier ? "filled" : ""} />
          ),
        )}
      </span>
    </div>
  );

  return (
    <aside className="side-panel traits-panel" aria-label="Active crew traits">
      <div className="side-heading">
        <span>CREW BONDS</span>
        <small>{active.length} ACTIVE</small>
      </div>
      <div className="trait-list">
        {active.length === 0 && (
          <div className="empty-panel">
            <span>◇</span>
            <p>Field matching crew to activate a bond.</p>
          </div>
        )}
        {active.length > 0 && (
          <span className="trait-section-label">ACTIVE BONUSES</span>
        )}
        {active.map(renderTrait)}
        {building.length > 0 && (
          <details className="trait-building" open={active.length === 0}>
            <summary>
              BUILDING TOWARD
              <span>{building.length}</span>
            </summary>
            <div>{building.map(renderTrait)}</div>
          </details>
        )}
      </div>
      <p className="panel-tip">Duplicates count once per evolution line.</p>
    </aside>
  );
}

function StandingsPanel({ standings }: { standings: StandingView[] }) {
  return (
    <aside className="side-panel standings-panel" aria-label="Captain standings">
      <div className="side-heading">
        <span>CAPTAINS</span>
        <small>{standings.filter((standing) => standing.alive).length} AFLOAT</small>
      </div>
      <ol className="standings-list">
        {standings.map((standing, index) => (
          <li
            key={standing.id}
            className={`${standing.isHuman ? "is-player" : ""} ${!standing.alive ? "eliminated" : ""}`}
          >
            <span className="rank">{index + 1}</span>
            <span className="captain-avatar" aria-hidden="true">
              {standing.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="captain-copy">
              <strong>{standing.isHuman ? "YOU" : standing.name}</strong>
              <small>LV. {standing.level} {standing.streak > 1 ? `· 🔥${standing.streak}` : ""}</small>
            </span>
            <span className="captain-health">
              <i style={{ width: `${standing.hp}%` }} />
              <b>{standing.hp}</b>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function CrewPortrait({
  src,
  name,
  color,
  className = "",
}: {
  src?: string;
  name: string;
  color: string;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = Boolean(src && failedSource === src);
  return (
    <span
      className={`crew-portrait ${className} ${failed || !src ? "fallback" : ""}`}
      style={{ "--portrait-color": color } as CSSProperties}
      aria-hidden="true"
    >
      {!failed && src ? (
        // These are local, pixel-art game sprites and should not be resized by
        // Next's photographic image pipeline.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setFailedSource(src)}
          draggable={false}
        />
      ) : (
        <b>{name.slice(0, 2).toUpperCase()}</b>
      )}
    </span>
  );
}

function ShopCard({
  unit,
  index,
  disabled,
  onBuy,
}: {
  unit: ShopUnitView | null;
  index: number;
  disabled: boolean;
  onBuy: () => void;
}) {
  if (!unit) {
    return (
      <div className="shop-card is-empty" aria-label={`Shop slot ${index + 1}, empty`}>
        <span>SAILED</span>
      </div>
    );
  }
  const activatingBond = unit.traitPreview.find(
    (trait) => trait.activatesIfFielded,
  );
  const tooltip = [
    `${unit.ability.name}: ${unit.ability.description}`,
    `Power ${unit.ability.power} · ${titleCase(unit.ability.effect)}`,
    `Owned ${unit.mergeProgress}`,
    activatingBond
      ? `Would activate ${activatingBond.name} when deployed`
      : unit.traitPreview[0]?.deltaIfFielded === 0
        ? "Duplicate — no additional bond count"
        : unit.traitPreview[0]?.next
        ? `+1 toward ${unit.traitPreview[0].name} (${unit.traitPreview[0].next}) if fielded`
        : "",
    unit.disabledReason ?? "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      type="button"
      className={`shop-card rarity-${slugify(unit.rarity)} ${
        unit.disabledReason ? "is-unaffordable" : ""
      } ${activatingBond ? "activates-bond" : ""}`}
      disabled={disabled}
      onClick={onBuy}
      aria-label={`Recruit ${unit.name} for ${unit.cost} gold. ${
        unit.disabledReason ? `${titleCase(unit.disabledReason)}. ` : ""
      }Shortcut ${index + 1}`}
      title={tooltip}
    >
      <kbd>{index + 1}</kbd>
      <CrewPortrait src={unit.portrait} name={unit.name} color={unit.color} />
      <span className="shop-unit-copy">
        <strong>{unit.name}</strong>
        <small>
          {unit.traitDetails
            .map((trait) => trait.name)
            .slice(0, 2)
            .join(" · ") || unit.rarity}
        </small>
      </span>
      <span className="shop-badge-row">
        {unit.purchaseUpgrade && (
          <b className="merge-badge">
            BUY → {"★".repeat(unit.purchaseUpgrade)}
          </b>
        )}
        {!unit.purchaseUpgrade && unit.ownedCopies > 0 && (
          <b className="merge-badge">{unit.mergeProgress}</b>
        )}
        {activatingBond && (
          <b className="bond-badge">FIELD → {activatingBond.name}</b>
        )}
      </span>
      {unit.disabledReason && (
        <b className="cost-warning">{unit.disabledReason}</b>
      )}
      <span className="shop-cost">{unit.cost}<i>●</i></span>
    </button>
  );
}

function InventoryTray({
  items,
  units,
  selectedId,
  selectedName,
  disabled,
  help,
  highlighted,
  onSelect,
  onEquip,
}: {
  items: ChoiceView[];
  units: BoardUnit[];
  selectedId: string | null;
  selectedName?: string;
  disabled: boolean;
  help: string;
  highlighted: boolean;
  onSelect: (unitId: string | null) => void;
  onEquip: (itemId: string) => void;
}) {
  return (
    <aside
      className={`inventory-tray panel-inventory ${
        highlighted ? "tutorial-focus" : ""
      }`}
      aria-label="Treasure inventory"
    >
      <div className="inventory-heading">
        <span>TREASURE</span>
        <small>{items.length}/8 STORED</small>
      </div>
      <label className="inventory-label">
        EQUIP TO
        <small>
          {selectedName ? selectedName : "SELECT CREW"}
        </small>
        <select
          className="crew-order-select"
          aria-label="Select crew for orders"
          value={selectedId ?? ""}
          onChange={(event) => onSelect(event.target.value || null)}
        >
          <option value="">—</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.shortName} · {unit.zone === "bench" ? "B" : "D"}
            </option>
          ))}
        </select>
      </label>
      <div
        className="inventory-slots"
        style={
          {
            "--inventory-count": Math.max(8, items.length),
          } as CSSProperties
        }
      >
        {Array.from({ length: Math.max(8, items.length) }, (_, index) => {
          const item = items[index];
          return (
            <button
              type="button"
              key={item ? `${item.id}-${index}` : `empty-${index}`}
              className={item ? "has-item" : ""}
              style={
                item
                  ? ({ "--item-color": item.color } as CSSProperties)
                  : undefined
              }
              disabled={!item || disabled}
              onClick={() => item && onEquip(item.id)}
              aria-label={
                item
                  ? `Equip ${item.name}${selectedName ? ` to ${selectedName}` : ""}`
                  : `Empty inventory slot ${index + 1}`
              }
              data-tooltip={
                item
                  ? `${item.name}: ${item.description}${
                      item.effects.length
                        ? ` · ${item.effects.map((effect) => effect.label).join(" · ")}`
                        : ""
                    }${disabled ? " · Select an eligible unit" : ""}`
                  : "Empty treasure slot"
              }
              title={
                item
                  ? `${item.name}: ${item.description}`
                  : "Empty treasure slot"
              }
            >
              {item?.icon ?? ""}
            </button>
          );
        })}
      </div>
      <p className="inventory-help">
        {help}
      </p>
    </aside>
  );
}

function UnitInspector({
  unit,
  definition,
  itemsById,
  canSell,
  allowSell,
  quickMove,
  onClose,
  onSell,
  onMove,
}: {
  unit: BoardUnit;
  definition: ShopUnitView;
  itemsById: Map<string, ChoiceView>;
  canSell: boolean;
  allowSell: boolean;
  quickMove: BoardMove | null;
  onClose: () => void;
  onSell: () => void;
  onMove: () => void;
}) {
  const starScale = unit.star >= 3 ? 3.24 : unit.star === 2 ? 1.8 : 1;
  const abilityScale = unit.star >= 3 ? 2.25 : unit.star === 2 ? 1.5 : 1;
  const equippedItems = unit.items
    .map((itemId) => itemsById.get(itemId))
    .filter((item): item is ChoiceView => Boolean(item));
  const itemEffects = equippedItems.flatMap((item) => item.effects);
  const effectTotal = (kind: string) =>
    itemEffects
      .filter((effect) => effect.kind === kind)
      .reduce((total, effect) => total + effect.value, 0);
  const health = Math.max(
    Math.round(definition.stats.health * starScale) +
      effectTotal("health-flat"),
    Math.round(unit.maxHp),
  );
  const attack =
    Math.round(definition.stats.attack * starScale) +
    effectTotal("attack-flat");
  const defense =
    Math.round(definition.stats.defense * starScale) +
    effectTotal("defense-flat");
  const range = definition.stats.range + effectTotal("range-flat");
  const attacksPerSecond =
    (1_000 / definition.stats.attackIntervalMs) *
    (1 + effectTotal("attack-speed-percent") / 100);
  const abilityPower = Math.round(
    definition.ability.power *
      abilityScale *
      (1 + effectTotal("ability-power-percent") / 100),
  );

  return (
    <aside
      className="unit-inspector inspector-panel side-panel"
      aria-label={`${definition.name} details`}
    >
      <div className="inspector-heading">
        <span>CREW DETAILS</span>
        <button
          type="button"
          className="close-inspector"
          onClick={onClose}
          aria-label="Return to captain standings"
        >
          ×
        </button>
      </div>
      <div className="inspector-scroll">
        <div className="inspector-header">
          <CrewPortrait
            src={definition.portrait}
            name={definition.name}
            color={definition.color}
            className="inspector-portrait"
          />
          <div>
            <span className="unit-stars">{"★".repeat(unit.star)}</span>
            <strong>{definition.name}</strong>
            <small>
              {definition.traitDetails
                .map((trait) => trait.name)
                .join(" · ")}
            </small>
          </div>
        </div>

        <div className="inspector-stat-grid" aria-label="Combat stats">
          {[
            ["HP", `${Math.max(0, Math.round(unit.hp))}/${health}`],
            ["ATK", attack],
            ["DEF", defense],
            ["RANGE", range],
            ["SPEED", `${attacksPerSecond.toFixed(2)}/s`],
            ["POWER", abilityPower],
          ].map(([label, value]) => (
            <span className="inspector-stat" key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </span>
          ))}
        </div>
        <small className="stat-note">
          Star and item values shown; active bond modifiers apply in combat.
        </small>

        <div className="ability-card">
          <span>{titleCase(definition.ability.effect)} technique</span>
          <strong>{definition.ability.name}</strong>
          <p>{definition.ability.description}</p>
          <small>CAST POWER · {abilityPower}</small>
        </div>

        {unit.team === "player" && (
          <div className="merge-progress">
            <span>EVOLUTION LINE</span>
            <strong>{definition.mergeProgress}</strong>
            <small>{definition.ownedCopies} equivalent copies owned</small>
          </div>
        )}

        <div className="equipped-items">
          <span>EQUIPPED TREASURE · {equippedItems.length}/3</span>
          {Array.from({ length: 3 }, (_, index) => {
            const item = equippedItems[index];
            return item ? (
              <div className="equipped-item" key={`${item.id}-${index}`}>
                <b aria-hidden="true">{item.icon}</b>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.effects.map((effect) => effect.label).join(" · ") ||
                      item.description}
                  </small>
                </span>
              </div>
            ) : (
              <div className="equipped-item empty-item" key={`empty-${index}`}>
                <b aria-hidden="true">◇</b>
                <span>Empty item slot</span>
              </div>
            );
          })}
        </div>
      </div>
      {canSell && (
        <div className="inspector-actions">
          <button
            type="button"
            className="move-unit-button"
            disabled={!quickMove}
            onClick={onMove}
          >
            {unit.zone === "bench" ? "DEPLOY" : "TO BENCH"}
          </button>
          <button
            type="button"
            className="sell-button"
            onClick={onSell}
            disabled={!allowSell}
            title={
              allowSell
                ? "Sell this unit and return its equipped treasure"
                : "Selling unlocks after the first-voyage guide"
            }
          >
            SELL ·{" "}
            {Math.max(
              1,
              definition.cost *
                (unit.star >= 3 ? 9 : unit.star === 2 ? 3 : 1),
            )}{" "}
            ●
          </button>
          <small>Selling returns all equipped treasure.</small>
        </div>
      )}
    </aside>
  );
}

function CarouselScreen({
  choices,
  round,
  timer,
  onChoose,
}: {
  choices: ChoiceView[];
  round: number;
  timer: number;
  onChoose: (id: string) => void;
}) {
  return (
    <section className="choice-screen carousel-screen">
      <header className="choice-heading">
        <span className="eyebrow">ROUND {round} · LOWEST HEALTH DRAFTS FIRST</span>
        <h2>GRAND LINE CAROUSEL</h2>
        <p>Choose one rotating treasure before the rival captains take it.</p>
        <div className={`carousel-timer ${timer <= 3 ? "is-warning" : ""}`}>
          <span>AUTO PICK IN</span>
          <strong>{timer}</strong>
        </div>
      </header>
      <div className="carousel-ring" aria-label="Carousel treasures">
        <div className="carousel-water" aria-hidden="true"><i /><i /><i /></div>
        {choices.map((choice, index) => (
          <button
            type="button"
            key={choice.id}
            className="carousel-choice"
            style={
              {
                "--choice-index": index,
                "--choice-count": Math.max(choices.length, 1),
                "--choice-color": choice.color,
              } as CSSProperties
            }
            onClick={() => onChoose(choice.id)}
            data-tooltip={choice.description}
          >
            <span className="carousel-item-icon">{choice.icon}</span>
            <strong>{choice.name}</strong>
          </button>
        ))}
        <div className="carousel-center">
          <span>☠</span>
          <strong>PICK ONE</strong>
          <small>No going back</small>
        </div>
      </div>
      <p className="choice-hint">Select a treasure token · timeout picks the best fit</p>
    </section>
  );
}

function RewardScreen({
  choices,
  onChoose,
}: {
  choices: ChoiceView[];
  onChoose: (id: string) => void;
}) {
  return (
    <section className="choice-screen reward-screen">
      <div className="reward-rays" aria-hidden="true" />
      <header className="choice-heading">
        <span className="eyebrow">PVE ENCOUNTER CLEARED</span>
        <h2>CLAIM YOUR TREASURE</h2>
        <p>The defeated crew left three prizes behind. Take one for the voyage.</p>
      </header>
      <div className="reward-cards">
        {choices.map((choice, index) => (
          <button
            type="button"
            className="reward-card"
            key={choice.id}
            style={{ "--choice-color": choice.color } as CSSProperties}
            onClick={() => onChoose(choice.id)}
          >
            <span className="reward-number">0{index + 1}</span>
            <span className="treasure-icon">{choice.icon}</span>
            <strong>{choice.name}</strong>
            <p>{choice.description}</p>
            {choice.effects.length > 0 && (
              <small className="reward-effects">
                {choice.effects.map((effect) => effect.label).join(" · ")}
              </small>
            )}
            <span className="choose-label">TAKE TREASURE</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ResultsScreen({
  view,
  onNew,
  onMenu,
}: {
  view: MatchView;
  onNew: () => void;
  onMenu: () => void;
}) {
  const won = view.placement === 1;
  return (
    <section className={`results-screen ${won ? "victory" : ""}`}>
      <div className="results-panel">
        <span className="results-kicker">{won ? "THE GRAND LINE BOWS TO YOU" : "THE VOYAGE ENDS"}</span>
        <div className="placement-medal">
          <span>PLACEMENT</span>
          <strong>#{view.placement}</strong>
        </div>
        <h2>{won ? "PIRATE KING!" : "A LEGEND IN THE MAKING"}</h2>
        <p>
          {won
            ? "Your crew weathered every storm and claimed the final sea."
            : `${view.winnerName} claimed this sea. Rebuild, adapt, and sail again.`}
        </p>
        <div className="result-stats">
          <div><span>ROUNDS</span><strong>{view.round}</strong></div>
          <div><span>FINAL LEVEL</span><strong>{view.level}</strong></div>
          <div><span>CREW SIZE</span><strong>{view.resultCrew.length}</strong></div>
          <div>
            <span>ITEMS HELD</span>
            <strong>
              {view.resultCrew.reduce((count, unit) => count + unit.items.length, 0)}
            </strong>
          </div>
        </div>
        <div className="final-crew" aria-label="Final crew">
          {view.resultCrew
            .slice(0, 8)
            .map((unit) => {
              const definition = view.selectedDefinitionByUnit.get(unit.id);
              return (
                <CrewPortrait
                  key={unit.id}
                  src={definition?.portrait}
                  name={unit.name}
                  color={definition?.color ?? cssColor(unit.contentId)}
                />
              );
            })}
        </div>
        <div className="results-actions">
          <button type="button" className="pixel-button primary compact" onClick={onNew}>
            NEW VOYAGE
          </button>
          <button type="button" className="pixel-button compact" onClick={onMenu}>
            TITLE SCREEN
          </button>
        </div>
      </div>
    </section>
  );
}
