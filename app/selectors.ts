import {
  DEFAULT_CONTENT,
  getActiveTraits,
  getStageDefinition,
} from "@/game";
import type {
  BattleUnitSnapshot,
  GameContent,
  ItemEffect,
  MatchBattleResult,
  MatchState,
  PlayerState,
  PvEEnemyDefinition,
  RecentBattleRecord,
  UnitDefinition,
  UnitInstance,
} from "@/game";
import type {
  BoardUnit,
  CombatFxEvent,
} from "@/components/PhaserBoard";
import type { CarouselParticipantView } from "@/components/PhaserCarousel";
import {
  buildBattleOutcome,
  type BattleOutcomeRecap,
} from "@/components/battleOutcome";
import {
  buildShopDecisionPreview,
  rankItemDecisionPreviews,
  type AvailableItemDecisionPreview,
} from "@/components/decisionSupport";

export const CAROUSEL_COLORS = [
  "#f4cf67",
  "#df6259",
  "#62b9d1",
  "#73c68b",
  "#b986d7",
  "#e58e52",
  "#d7e1e0",
  "#4f78bb",
] as const;

const TRAIT_META: Record<string, { icon: string; color: string }> = {
  "straw-hat": { icon: "☀", color: "#e7b447" },
  navy: { icon: "⚓", color: "#5f9fc7" },
  warlord: { icon: "◈", color: "#8d75bb" },
  supernova: { icon: "✦", color: "#75a6d8" },
  brotherhood: { icon: "◆", color: "#d35645" },
  revolutionary: { icon: "✹", color: "#b94b40" },
  captain: { icon: "★", color: "#d9ad45" },
  brawler: { icon: "✊", color: "#c6664a" },
  swordsman: { icon: "⚔", color: "#9faab4" },
  marksman: { icon: "◎", color: "#bb7d42" },
  specialist: { icon: "⌁", color: "#43a6a1" },
  guardian: { icon: "✚", color: "#cb6d86" },
};

export type TraitView = {
  id: string;
  name: string;
  icon: string;
  count: number;
  next: number | null;
  tier: number;
  description: string;
  color: string;
};

export type RecentBattleView = RecentBattleRecord & {
  opponentName: string;
};

export type CrewPreviewView = {
  id: string;
  name: string;
  star: number;
  portrait: string;
};

export type StandingView = {
  id: string;
  name: string;
  hp: number;
  gold: number;
  level: number;
  streak: number;
  alive: boolean;
  isHuman: boolean;
  traits: TraitView[];
  inventory: ChoiceView[];
  boardUnits: BoardUnit[];
  crewPreview: CrewPreviewView[];
  recentBattles: RecentBattleView[];
  selectedDefinitionByUnit: Map<string, ShopUnitView>;
};

export type ShopUnitView = {
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

export type ItemEffectView = {
  kind: string;
  value: number;
  label: string;
};

export type ChoiceView = {
  id: string;
  contentId: string;
  name: string;
  description: string;
  icon: string;
  portrait?: string;
  color: string;
  effects: ItemEffectView[];
  decision?: AvailableItemDecisionPreview & { recommended: boolean };
  takenByPlayerId?: string | null;
  orbitIndex?: number;
  claimedAtTick?: number | null;
};

export type CarouselEventView = {
  id: string;
  tick: number;
  type: string;
  playerId?: string;
  choiceId?: string;
  itemId?: string;
  playerAId?: string;
  playerBId?: string;
  playerIds?: string[];
  from?: { x: number; y: number };
  to?: { x: number; y: number };
};

export type CarouselSessionView = {
  tick: number;
  durationTicks: number;
  finishAtTick: number | null;
  participants: CarouselParticipantView[];
  events: CarouselEventView[];
};

export type MatchView = {
  playerId: string;
  phase: MatchState["phase"];
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
  carouselSession: CarouselSessionView | null;
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
  battleOutcome: BattleOutcomeRecap | null;
};

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function slugify(value: string): string {
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

export function cssColor(value: string): string {
  return `#${hashColor(value).toString(16).padStart(6, "0")}`;
}

function effectView(effect: ItemEffect): ItemEffectView {
  const labels: Record<ItemEffect["kind"], string> = {
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
  return {
    kind: effect.kind,
    value: effect.value,
    label: `+${effect.value}${effect.kind.endsWith("-percent") ? "%" : ""} ${labels[effect.kind]}`,
  };
}

export function createItemView(
  itemId: string,
  content: GameContent = DEFAULT_CONTENT,
): ChoiceView {
  const item = content.items.find((candidate) => candidate.id === itemId);
  return {
    id: itemId,
    contentId: itemId,
    name: item?.name ?? titleCase(itemId),
    description:
      item?.description ?? "Equip this treasure to a selected crew member.",
    icon: item?.icon ?? "✦",
    color: cssColor(itemId),
    effects: item?.effects.map(effectView) ?? [],
  };
}

function rarityForCost(cost: number): string {
  return ["Common", "Common", "Rare", "Epic", "Legendary", "Mythic"][cost] ?? "Common";
}

function baseUnitView(
  definition: UnitDefinition | PvEEnemyDefinition,
  content: GameContent,
): ShopUnitView {
  const playable = "cost" in definition;
  const ability = definition.ability;
  const traits = playable ? definition.traits : [];
  return {
    id: definition.id,
    name: definition.name,
    shortName: definition.name.split(" ")[0],
    cost: playable ? definition.cost : 1,
    rarity: rarityForCost(playable ? definition.cost : 1),
    traits,
    portrait: `/assets/portraits/${slugify(definition.id)}.png`,
    token: `/assets/tokens/${slugify(definition.id)}.png`,
    color: cssColor(definition.id),
    description:
      ability?.description ??
      (traits.length ? traits.map(titleCase).join(" · ") : "Grand Line fighter"),
    stats: {
      health: definition.stats.health,
      attack: definition.stats.attack,
      defense: definition.stats.defense,
      range: definition.stats.range,
      attackIntervalMs: definition.stats.attackIntervalMs,
    },
    ability: {
      name: ability?.name ?? "Crew Technique",
      description:
        ability?.description ??
        "Unleashes a signature technique at full energy.",
      power: ability?.power ?? 0,
      effect: ability?.effect ?? "damage",
    },
    traitDetails: traits.map((traitId) => {
      const trait = content.traits.find((candidate) => candidate.id === traitId);
      return {
        id: traitId,
        name: trait?.name ?? titleCase(traitId),
        description:
          trait?.description ??
          "Deploy distinct crew members to strengthen this bond.",
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

function definitionView(
  definitionId: string,
  content: GameContent,
): ShopUnitView {
  const definition =
    content.units.find((candidate) => candidate.id === definitionId) ??
    content.enemies.find((candidate) => candidate.id === definitionId);
  if (definition) return baseUnitView(definition, content);
  const fallback: PvEEnemyDefinition = {
    id: definitionId,
    name: titleCase(definitionId),
    stats: {
      health: 100,
      attack: 10,
      defense: 0,
      range: 1,
      attackIntervalMs: 1_000,
      moveIntervalMs: 500,
    },
    assetPath: `/assets/tokens/${slugify(definitionId)}.png`,
  };
  return baseUnitView(fallback, content);
}

function ownedCopies(
  instances: readonly UnitInstance[],
  definitionId: string,
): number {
  return instances.reduce((total, instance) => {
    if (instance.definitionId !== definitionId) return total;
    return total + (instance.star === 3 ? 9 : instance.star === 2 ? 3 : 1);
  }, 0);
}

function enrichUnitView(
  base: ShopUnitView,
  owner: PlayerState,
  content: GameContent,
): ShopUnitView {
  const definition = content.units.find((candidate) => candidate.id === base.id);
  if (!definition) return base;
  const preview = buildShopDecisionPreview(definition.id, owner, content);
  if (!preview.available) return base;
  return {
    ...base,
    ownedCopies: ownedCopies(Object.values(owner.units), definition.id),
    mergeProgress: preview.merge.progress.label,
    purchaseUpgrade: preview.merge.purchaseUpgrade,
    affordable: preview.affordable,
    canReceive: preview.canReceive,
    disabledReason:
      preview.disabledReason?.code.replaceAll("_", " ") ?? null,
    traitPreview: preview.traits.map((trait) => ({
      id: trait.id,
      name: trait.name,
      current: trait.currentCount,
      next: trait.nextThreshold,
      activatesIfFielded: trait.activatesTier,
      deltaIfFielded: trait.deltaIfFielded,
    })),
  };
}

function itemHealth(instance: UnitInstance, content: GameContent): number {
  return instance.items.reduce((sum, itemId) => {
    const item = content.items.find((candidate) => candidate.id === itemId);
    return (
      sum +
      (item?.effects.reduce(
        (itemSum, effect) =>
          itemSum + (effect.kind === "health-flat" ? effect.value : 0),
        0,
      ) ?? 0)
    );
  }, 0);
}

function planningMaxHp(
  instance: UnitInstance,
  content: GameContent,
): number {
  const definition = content.units.find(
    (candidate) => candidate.id === instance.definitionId,
  );
  const scale = instance.star === 3 ? 3.24 : instance.star === 2 ? 1.8 : 1;
  return (
    Math.round((definition?.stats.health ?? 100) * scale) +
    itemHealth(instance, content)
  );
}

function boardLocation(
  player: PlayerState,
): Map<string, { x: number; y: number }> {
  return new Map(
    Object.entries(player.board).map(([key, unitId]) => {
      const [x = 0, y = 0] = key.split(",").map(Number);
      return [unitId, { x, y }];
    }),
  );
}

function resultForPlayer(
  state: MatchState,
  playerId: string,
): MatchBattleResult | null {
  return (
    state.lastResults.find(
      (result) =>
        result.playerAId === playerId || result.playerBId === playerId,
    ) ?? null
  );
}

function unitInstanceForSnapshot(
  snapshot: BattleUnitSnapshot,
  players: readonly PlayerState[],
): UnitInstance | null {
  const instanceId = snapshot.id.split(":").at(-1);
  if (!instanceId) return null;
  for (const player of players) {
    const instance = player.units[instanceId];
    if (instance) return instance;
  }
  return null;
}

function buildBoardUnits(
  state: MatchState,
  player: PlayerState,
  opponent: PlayerState | null,
  content: GameContent,
  includeBattleResult = true,
): { units: BoardUnit[]; views: Map<string, ShopUnitView> } {
  const units: BoardUnit[] = [];
  const views = new Map<string, ShopUnitView>();
  const pairing = state.pairings.find(
    (candidate) =>
      candidate.playerAId === player.id || candidate.playerBId === player.id,
  );
  const ghostOwnerId =
    pairing?.playerBId === null ? pairing?.ghostOfPlayerId : null;

  const addOwner = (owner: PlayerState, team: "player" | "enemy") => {
    const locations = boardLocation(owner);
    for (const instance of Object.values(owner.units)) {
      const location = locations.get(instance.id);
      const benchSlot = owner.bench.indexOf(instance.id);
      if (!location && benchSlot < 0) continue;
      if (team === "enemy" && !location) continue;
      const prefix =
        state.phase === "battle"
          ? team === "enemy" && owner.id === ghostOwnerId
            ? `ghost-${owner.id}`
            : owner.id
          : null;
      const id = prefix ? `${prefix}:${instance.id}` : instance.id;
      const view = enrichUnitView(
        definitionView(instance.definitionId, content),
        owner,
        content,
      );
      const maxHp = planningMaxHp(instance, content);
      views.set(id, view);
      units.push({
        id,
        contentId: instance.definitionId,
        name: view.name,
        shortName: view.shortName,
        color: hashColor(instance.definitionId),
        team,
        zone: location ? "board" : "bench",
        x:
          team === "enemy"
            ? content.config.boardWidth - 1 - (location?.x ?? 0)
            : location?.x ?? 0,
        y:
          team === "enemy"
            ? content.config.boardHeight - 1 - (location?.y ?? 0)
            : location?.y ?? 0,
        slot: Math.max(0, benchSlot),
        star: instance.star,
        items: instance.items.slice(0, 3),
        hp: maxHp,
        maxHp,
        shield: 0,
        energy: 0,
        portrait: view.token,
      });
    }
  };

  addOwner(player, "player");
  if (opponent) addOwner(opponent, "enemy");
  if (!includeBattleResult) return { units, views };

  const result = resultForPlayer(state, player.id);
  if (!result) return { units, views };
  const mirror = result.playerBId === player.id;
  for (const snapshot of result.initialUnits) {
    const view = definitionView(snapshot.definitionId, content);
    const instance = unitInstanceForSnapshot(snapshot, state.players);
    const owner = instance
      ? state.players.find((candidate) => candidate.units[instance.id])
      : null;
    const enriched = instance && owner
      ? enrichUnitView(view, owner, content)
      : view;
    const x = mirror
      ? content.config.boardWidth - 1 - snapshot.x
      : snapshot.x;
    const y = mirror
      ? content.config.boardHeight - 1 - snapshot.y
      : snapshot.y;
    const existing = units.find((candidate) => candidate.id === snapshot.id);
    views.set(snapshot.id, enriched);
    if (existing) {
      Object.assign(existing, {
        x,
        y,
        hp: snapshot.hp,
        maxHp: snapshot.maxHp,
        shield: snapshot.shield,
        energy: snapshot.energy,
      });
      continue;
    }
    units.push({
      id: snapshot.id,
      contentId: snapshot.definitionId,
      name: enriched.name,
      shortName: enriched.shortName,
      color: hashColor(snapshot.definitionId),
      team: snapshot.teamId === player.id ? "player" : "enemy",
      zone: "board",
      x,
      y,
      slot: 0,
      star: snapshot.star,
      items: instance?.items.slice(0, 3) ?? [],
      hp: snapshot.hp,
      maxHp: snapshot.maxHp,
      shield: snapshot.shield,
      energy: snapshot.energy,
      portrait: enriched.token,
    });
  }
  for (const snapshot of result.finalUnits) {
    const existing = units.find((candidate) => candidate.id === snapshot.id);
    if (!existing) continue;
    existing.hp = existing.maxHp;
    existing.finalHp = snapshot.hp;
    existing.finalShield = snapshot.shield;
    existing.finalEnergy = snapshot.energy;
  }
  return { units, views };
}

function traitViews(
  player: PlayerState,
  content: GameContent,
): TraitView[] {
  const definitions = new Map(content.traits.map((trait) => [trait.id, trait]));
  return getActiveTraits(player, content)
    .filter((active) => active.count > 0)
    .map((active) => {
      const definition = definitions.get(active.traitId);
      const meta = TRAIT_META[active.traitId] ?? {
        icon: "◆",
        color: cssColor(active.traitId),
      };
      return {
        id: active.traitId,
        name: definition?.name ?? titleCase(active.traitId),
        icon: meta.icon,
        count: active.count,
        next:
          definition?.tiers.find((tier) => tier.required > active.count)
            ?.required ?? null,
        tier: active.tierIndex + 1,
        description:
          definition?.description ??
          "Field more crew with this bond to strengthen its effect.",
        color: meta.color,
      };
    })
    .sort(
      (left, right) =>
        right.tier - left.tier || right.count - left.count,
    );
}

function recentBattleViews(
  player: PlayerState,
  names: ReadonlyMap<string, string>,
): RecentBattleView[] {
  return player.recentBattles.slice(-5).reverse().map((battle) => ({
    ...battle,
    opponentName:
      names.get(battle.opponentId) ??
      (battle.isGhost ? "Ghost Fleet" : "Unknown Captain"),
  }));
}

function combatEvents(
  state: MatchState,
  playerId: string,
  content: GameContent,
): { events: CombatFxEvent[]; sequence: number; durationSeconds: number } {
  const result = resultForPlayer(state, playerId) ?? state.lastResults[0] ?? null;
  if (!result) {
    return {
      events: [],
      sequence: state.round * 10 + (state.phase === "battle" ? 1 : 0),
      durationSeconds: 1,
    };
  }
  const mirror = result.playerBId === playerId;
  const abilityById = new Map(
    [...content.units, ...content.enemies].flatMap((definition) =>
      definition.ability
        ? [[definition.ability.id, definition.ability] as const]
        : [],
    ),
  );
  const definitionByUnit = new Map(
    result.initialUnits.map((unit) => [unit.id, unit.definitionId]),
  );
  const criticalAttacks = new Set(
    result.events.flatMap((event) =>
      event.type === "attack" && event.critical
        ? [`${event.tick}:${event.sourceId}:${event.targetId}`]
        : [],
    ),
  );
  const point = (value: { x: number; y: number }) =>
    mirror
      ? {
          x: content.config.boardWidth - 1 - value.x,
          y: content.config.boardHeight - 1 - value.y,
        }
      : { ...value };
  const events = result.events.flatMap((event, index): CombatFxEvent[] => {
    if (event.type === "battle-start" || event.type === "battle-end") return [];
    const id = `${state.round}-${index}`;
    if (event.type === "unit-move") {
      const to = point(event.to);
      return [{
        id,
        tick: event.tick,
        kind: "move",
        sourceId: event.unitId,
        toX: to.x,
        toY: to.y,
      }];
    }
    if (event.type === "unit-displace") {
      return [{
        id,
        tick: event.tick,
        kind: "displace",
        sourceId: event.sourceId,
        unitId: event.unitId,
        abilityId: event.abilityId,
        movementKind: event.movementKind,
        from: point(event.from),
        to: point(event.to),
      }];
    }
    if (event.type === "attack") {
      return [{
        id,
        tick: event.tick,
        kind: "attack",
        sourceId: event.sourceId,
        targetId: event.targetId,
        critical: event.critical,
      }];
    }
    if (event.type === "cast") {
      const ability = abilityById.get(event.abilityId);
      const sourceDefinitionId = definitionByUnit.get(event.sourceId);
      const sourceAbility = [...content.units, ...content.enemies].find(
        (definition) => definition.id === sourceDefinitionId,
      )?.ability;
      const pattern = ability?.pattern ?? sourceAbility?.pattern ?? "single";
      const telegraph: CombatFxEvent["telegraph"] =
        pattern === "line"
          ? "line"
          : event.targetIds.length > 1 ||
              pattern === "adjacent" ||
              pattern === "all-enemies"
            ? "area"
            : "target";
      return [{
        id,
        tick: event.tick,
        kind: "cast",
        sourceId: event.sourceId,
        targetId: event.targetIds[0],
        targetIds: [...event.targetIds],
        abilityId: event.abilityId,
        abilityName:
          ability?.name ?? sourceAbility?.name ?? titleCase(event.abilityId),
        telegraph,
      }];
    }
    if (event.type === "damage") {
      return [{
        id,
        tick: event.tick,
        kind: "damage",
        sourceId: event.sourceId,
        targetId: event.targetId,
        amount: event.amount,
        healthDamage: event.healthDamage,
        shieldDamage: event.shieldDamage,
        damageKind: event.damageKind,
        critical: criticalAttacks.has(
          `${event.tick}:${event.sourceId}:${event.targetId}`,
        ),
      }];
    }
    if (event.type === "energy") {
      return [{
        id,
        tick: event.tick,
        kind: "energy",
        sourceId: event.unitId,
        targetId: event.unitId,
        energyDelta: event.amount,
        energyValue: event.value,
        reason: event.reason,
      }];
    }
    if (event.type === "dodge") {
      return [{
        id,
        tick: event.tick,
        kind: "dodge",
        sourceId: event.sourceId,
        targetId: event.targetId,
      }];
    }
    if (event.type === "buff") {
      return [{
        id,
        tick: event.tick,
        kind: "buff",
        sourceId: event.sourceId,
        targetId: event.targetId,
        amount: event.amount,
        stat: event.stat,
        reason: event.reason,
      }];
    }
    if (event.type === "heal" || event.type === "shield") {
      return [{
        id,
        tick: event.tick,
        kind: event.type,
        sourceId: event.sourceId,
        targetId: event.targetId,
        amount: event.amount,
      }];
    }
    if (event.type === "status") {
      return [{
        id,
        tick: event.tick,
        kind: "status",
        sourceId: event.sourceId,
        targetId: event.targetId,
        status: event.status,
        durationTicks: event.durationTicks,
      }];
    }
    if (event.type === "death") {
      return [{
        id,
        tick: event.tick,
        kind: "defeat",
        sourceId: event.sourceId ?? undefined,
        targetId: event.unitId,
      }];
    }
    return [];
  });
  return {
    events,
    sequence: state.round * 10 + (state.phase === "battle" ? 1 : 0),
    durationSeconds: Math.max(
      1,
      Math.ceil(
        (result.durationTicks * content.config.combatTickMs) / 1_000,
      ),
    ),
  };
}

function itemChoices(
  state: MatchState,
  player: PlayerState,
  content: GameContent,
): ChoiceView[] {
  if (state.phase === "carousel") {
    return selectCarouselView(state, content).choices;
  }
  return (state.pendingItemChoices[player.id] ?? []).map((itemId) =>
    createItemView(itemId, content),
  );
}

function enrichChoiceDecisions(
  choices: ChoiceView[],
  player: PlayerState,
  content: GameContent,
): ChoiceView[] {
  const ranked = rankItemDecisionPreviews(
    choices
      .filter((choice) => !choice.takenByPlayerId)
      .map((choice) => choice.contentId),
    player,
    content,
  );
  const decisionById = new Map(
    ranked.flatMap((decision) =>
      decision.available ? [[decision.itemId, decision] as const] : [],
    ),
  );
  const recommendedItemId = ranked.find(
    (decision) => decision.available,
  )?.itemId;
  const recommendedChoiceId = choices
    .filter(
      (choice) =>
        !choice.takenByPlayerId && choice.contentId === recommendedItemId,
    )
    .sort((left, right) => left.id.localeCompare(right.id))[0]?.id;
  return choices.map((choice) => {
    const decision = decisionById.get(choice.contentId);
    return decision
      ? {
          ...choice,
          decision: {
            ...decision,
            recommended: choice.id === recommendedChoiceId,
          },
        }
      : choice;
  });
}

function finalCrewUnits(
  player: PlayerState,
  board: { units: BoardUnit[]; views: Map<string, ShopUnitView> },
  content: GameContent,
): BoardUnit[] {
  if (player.finalCrew.length === 0) {
    return board.units.filter((unit) => unit.team === "player");
  }
  return player.finalCrew.map((instance, index) => {
    const view = enrichUnitView(
      definitionView(instance.definitionId, content),
      player,
      content,
    );
    const id = `final:${instance.id}`;
    const maxHp = planningMaxHp(instance, content);
    board.views.set(id, view);
    return {
      id,
      contentId: instance.definitionId,
      name: view.name,
      shortName: view.shortName,
      color: hashColor(instance.definitionId),
      team: "player",
      zone: "bench",
      x: index % content.config.boardWidth,
      y: content.config.boardHeight - 1,
      slot: index,
      star: instance.star,
      items: instance.items.slice(0, 3),
      hp: maxHp,
      maxHp,
      portrait: view.token,
    };
  });
}

export function selectCarouselView(
  state: MatchState,
  content: GameContent = DEFAULT_CONTENT,
) {
  const player =
    state.players.find((candidate) => !candidate.isBot) ?? state.players[0];
  if (!player) throw new Error("Carousel view requires a living captain.");
  const choices = state.carouselChoices.map((choice) => ({
    ...createItemView(choice.itemId, content),
    id: choice.id,
    takenByPlayerId: choice.takenByPlayerId,
    orbitIndex: choice.orbitIndex,
    claimedAtTick: choice.claimedAtTick,
  }));
  const enrichedChoices = enrichChoiceDecisions(choices, player, content);
  const names = new Map(
    state.players.map((candidate) => [candidate.id, candidate.name]),
  );
  const session = state.carouselSession;
  return {
    playerId: player.id,
    phase: state.phase,
    round: state.round,
    choices: enrichedChoices,
    carouselSession: session
      ? {
          tick: session.tick,
          durationTicks: session.durationTicks,
          finishAtTick: session.finishAtTick,
          participants: session.participants.map((participant, index) => ({
            playerId: participant.playerId,
            name: names.get(participant.playerId) ?? "Rival",
            rank: participant.rank,
            paletteIndex:
              participant.playerId === player.id ? 0 : (index % 7) + 1,
            color:
              CAROUSEL_COLORS[
                participant.playerId === player.id ? 0 : (index % 7) + 1
              ],
            spawnPosition: { ...participant.spawnPosition },
            position: { ...participant.position },
            targetPosition: { ...participant.targetPosition },
            releaseTick: participant.releaseTick,
            reactionDelayTicks: participant.reactionDelayTicks,
            moving: participant.moving,
            claimedChoiceId: participant.claimedChoiceId,
          })),
          events: session.events.map((event) => ({ ...event })),
        }
      : null,
  };
}

export function selectMatchView(
  state: MatchState,
  content: GameContent = DEFAULT_CONTENT,
): MatchView {
  const player =
    state.players.find((candidate) => !candidate.isBot) ?? state.players[0];
  if (!player) throw new Error("Cannot build a match view without players.");
  const stage = getStageDefinition(state.round, content);
  const pairing = state.pairings.find(
    (candidate) =>
      candidate.playerAId === player.id || candidate.playerBId === player.id,
  );
  const opponentId = pairing
    ? pairing.playerAId === player.id
      ? pairing.playerBId ?? pairing.ghostOfPlayerId
      : pairing.playerAId
    : null;
  const opponentPlayer = opponentId
    ? state.players.find((candidate) => candidate.id === opponentId) ?? null
    : null;
  const board = buildBoardUnits(state, player, opponentPlayer, content);
  const names = new Map(
    state.players.map((candidate) => [candidate.id, candidate.name]),
  );
  const standings = state.players
    .map((candidate): StandingView => {
      const scoutingBoard = buildBoardUnits(
        state,
        candidate,
        null,
        content,
        false,
      );
      const crewPreview = scoutingBoard.units
        .filter((unit) => unit.zone === "board")
        .sort(
          (left, right) =>
            right.star - left.star || left.id.localeCompare(right.id),
        )
        .slice(0, 5)
        .map((unit) => ({
          id: unit.id,
          name: unit.name,
          star: unit.star,
          portrait:
            scoutingBoard.views.get(unit.id)?.portrait ?? unit.portrait ?? "",
        }));
      return {
        id: candidate.id,
        name: candidate.name,
        hp: Math.max(0, candidate.hp),
        gold: Math.max(0, candidate.gold),
        level: Math.max(1, candidate.level),
        streak: candidate.winStreak || -candidate.lossStreak,
        alive: candidate.alive,
        isHuman: candidate.id === player.id,
        traits: traitViews(candidate, content),
        inventory: candidate.inventory.map((itemId) =>
          createItemView(itemId, content),
        ),
        boardUnits: scoutingBoard.units,
        crewPreview,
        recentBattles: recentBattleViews(candidate, names),
        selectedDefinitionByUnit: scoutingBoard.views,
      };
    })
    .sort(
      (left, right) =>
        Number(right.alive) - Number(left.alive) ||
        right.hp - left.hp ||
        right.level - left.level,
    );
  const opponent: StandingView | null =
    stage.kind === "pve"
      ? {
          id: stage.id,
          name: stage.name,
          hp: 100,
          gold: 0,
          level: state.round,
          streak: 0,
          alive: true,
          isHuman: false,
          traits: [],
          inventory: [],
          boardUnits: [],
          crewPreview: [],
          recentBattles: [],
          selectedDefinitionByUnit: new Map(),
        }
      : standings.find((standing) => standing.id === opponentId) ?? null;
  const shop = Array.from({ length: content.config.shopSize }, (_, index) => {
    const definitionId = player.shop[index];
    return definitionId
      ? enrichUnitView(definitionView(definitionId, content), player, content)
      : null;
  });
  for (const [unitId, view] of board.views) {
    board.views.set(unitId, enrichUnitView(view, player, content));
  }
  const itemsById = new Map(
    content.items.map((item) => [
      item.id,
      createItemView(item.id, content),
    ]),
  );
  const choices = enrichChoiceDecisions(
    itemChoices(state, player, content),
    player,
    content,
  );
  const carouselSlice =
    state.phase === "carousel" ? selectCarouselView(state, content) : null;
  const events = combatEvents(state, player.id, content);
  const interest = Math.min(
    content.config.maxInterest,
    Math.floor(player.gold / 10),
  );
  const streakLength = Math.max(player.winStreak, player.lossStreak);
  const streak = Math.min(
    content.config.maxStreakBonus,
    Math.max(0, streakLength - 1),
  );
  const humanStandingIndex = standings.findIndex(
    (standing) => standing.isHuman,
  );
  const winner = standings.find((standing) => standing.id === state.winnerId);
  const phaseLabel =
    state.phase === "preparation"
      ? "PREPARE"
      : state.phase === "battle"
        ? "BATTLE"
        : state.phase === "item-choice"
          ? "TREASURE"
          : state.phase === "carousel"
            ? "CAROUSEL"
            : "VOYAGE ENDED";
  return {
    playerId: player.id,
    phase: state.phase,
    phaseLabel,
    alive: player.alive,
    round: state.round,
    stageLabel: `${Math.floor((state.round - 1) / 5) + 1}-${((state.round - 1) % 5) + 1}`,
    gold: player.gold,
    hp: Math.max(0, player.hp),
    level: player.level,
    xp: Math.max(0, player.xp),
    xpToNext: Math.max(
      1,
      content.config.xpToNextByLevel[String(player.level)] ?? 1,
    ),
    deployed: Object.keys(player.board).length,
    capacity: player.level,
    shopLocked: player.shopLocked,
    shop,
    inventory: player.inventory.map(
      (itemId) => itemsById.get(itemId) ?? createItemView(itemId, content),
    ),
    boardUnits: board.units,
    resultCrew: finalCrewUnits(player, board, content),
    traits: traitViews(player, content),
    standings,
    opponent,
    choices,
    carouselSession: carouselSlice?.carouselSession ?? null,
    selectedDefinitionByUnit: board.views,
    itemsById,
    economy: {
      base: content.config.baseIncome,
      interest,
      streak,
      total: content.config.baseIncome + interest + streak,
    },
    events: events.events,
    eventSequence: events.sequence,
    battleDurationSeconds: events.durationSeconds,
    placement: Math.max(
      1,
      player.placement ?? humanStandingIndex + 1,
    ),
    winnerName:
      winner?.name ??
      (state.winnerId === player.id ? "Your Crew" : "A rival captain"),
    battleOutcome: buildBattleOutcome({
      state,
      playerId: player.id,
      content,
    }),
  };
}
