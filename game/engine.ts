import {
  DEFAULT_CONTENT,
  getItemDefinition,
  getStageDefinition,
  getUnitDefinition,
} from "./content";
import { simulateBattle } from "./combat";
import { hashSeed, shuffleDeterministic, weightedIndex } from "./rng";
import { getActiveTraits } from "./traits";
import type {
  BattleSetupUnit,
  BattleTeam,
  BotPersonality,
  CarouselChoice,
  CommandError,
  CommandResult,
  GameCommand,
  GameContent,
  MatchPairing,
  MatchState,
  PlayerState,
  Position,
  StarLevel,
  UnitDefinition,
  UnitDestination,
  UnitInstance,
} from "./types";

export const CURRENT_SAVE_SCHEMA_VERSION = 4;

function cloneMatch(state: MatchState): MatchState {
  return JSON.parse(JSON.stringify(state)) as MatchState;
}

function commandFailure(
  state: MatchState,
  code: string,
  message: string,
): CommandResult {
  const error: CommandError = { code, message };
  return { ok: false, state, error };
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function parseCell(key: string): Position {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

function findPlayer(
  state: MatchState,
  playerId: string,
): PlayerState | null {
  return state.players.find((player) => player.id === playerId) ?? null;
}

function copiesForStar(star: StarLevel): number {
  return star === 1 ? 1 : star === 2 ? 3 : 9;
}

function firstEmptyBench(player: PlayerState): number {
  return player.bench.findIndex((unitId) => unitId === null);
}

function boardUnitCount(player: PlayerState): number {
  return Object.keys(player.board).length;
}

type UnitLocation =
  | { zone: "board"; key: string; x: number; y: number }
  | { zone: "bench"; slot: number }
  | null;

function locateUnit(player: PlayerState, unitId: string): UnitLocation {
  const boardEntry = Object.entries(player.board).find(
    ([, candidateId]) => candidateId === unitId,
  );
  if (boardEntry) {
    const position = parseCell(boardEntry[0]);
    return {
      zone: "board",
      key: boardEntry[0],
      x: position.x,
      y: position.y,
    };
  }
  const slot = player.bench.indexOf(unitId);
  return slot >= 0 ? { zone: "bench", slot } : null;
}

function removeFromLocation(player: PlayerState, unitId: string): void {
  const location = locateUnit(player, unitId);
  if (!location) {
    return;
  }
  if (location.zone === "board") {
    delete player.board[location.key];
  } else {
    player.bench[location.slot] = null;
  }
}

function unitMergePriority(
  player: PlayerState,
  unit: UnitInstance,
): [number, number, number] {
  const location = locateUnit(player, unit.id);
  if (location?.zone === "board") {
    return [0, location.y * 100 + location.x, unit.acquiredOrder];
  }
  if (location?.zone === "bench") {
    return [1, location.slot, unit.acquiredOrder];
  }
  return [2, 0, unit.acquiredOrder];
}

function mergeUnits(
  player: PlayerState,
  definitionId: string,
  content: GameContent,
): void {
  for (const star of [1, 2] as const) {
    while (true) {
      const candidates = Object.values(player.units)
        .filter(
          (unit) =>
            unit.definitionId === definitionId && unit.star === star,
        )
        .sort((left, right) => {
          const leftPriority = unitMergePriority(player, left);
          const rightPriority = unitMergePriority(player, right);
          return (
            leftPriority[0] - rightPriority[0] ||
            leftPriority[1] - rightPriority[1] ||
            leftPriority[2] - rightPriority[2]
          );
        });
      if (candidates.length < 3) {
        break;
      }
      const consumed = candidates.slice(0, 3);
      const anchor = consumed[0];
      const anchorLocation =
        locateUnit(player, anchor.id) ??
        ({
          zone: "bench",
          slot: firstEmptyBench(player),
        } as const);
      const combinedItems = consumed.flatMap((unit) => unit.items);
      for (const unit of consumed) {
        removeFromLocation(player, unit.id);
        if (unit.id !== anchor.id) {
          delete player.units[unit.id];
        }
      }
      anchor.star = (star + 1) as StarLevel;
      anchor.items = combinedItems.slice(0, content.config.itemCap);
      player.inventory.push(...combinedItems.slice(content.config.itemCap));
      const safeLocation =
        anchorLocation.zone === "bench" && anchorLocation.slot < 0
          ? ({
              zone: "bench",
              slot: firstEmptyBench(player),
            } as const)
          : anchorLocation;
      if (safeLocation.zone === "bench" && safeLocation.slot >= 0) {
        player.bench[safeLocation.slot] = anchor.id;
      } else if (safeLocation.zone === "board") {
        player.board[safeLocation.key] = anchor.id;
      }
    }
  }
}

function canReceiveUnit(
  player: PlayerState,
  definitionId: string,
): boolean {
  return (
    firstEmptyBench(player) >= 0 ||
    Object.values(player.units).filter(
      (unit) => unit.definitionId === definitionId && unit.star === 1,
    ).length >= 2
  );
}

function addUnitToPlayer(
  state: MatchState,
  player: PlayerState,
  definitionId: string,
  content: GameContent,
  itemId: string | null = null,
): UnitInstance | null {
  if (!canReceiveUnit(player, definitionId)) {
    return null;
  }
  const unit: UnitInstance = {
    id: `unit-${state.nextUnitSerial}`,
    definitionId,
    star: 1,
    items: itemId ? [itemId] : [],
    acquiredOrder: state.nextUnitSerial,
  };
  state.nextUnitSerial += 1;
  player.units[unit.id] = unit;
  const slot = firstEmptyBench(player);
  if (slot >= 0) {
    player.bench[slot] = unit.id;
  }
  mergeUnits(player, definitionId, content);
  return unit;
}

function returnShopToPool(state: MatchState, player: PlayerState): void {
  for (const definitionId of player.shop) {
    if (definitionId) {
      state.pool[definitionId] = (state.pool[definitionId] ?? 0) + 1;
    }
  }
  player.shop = player.shop.map(() => null);
}

function rollOneShopUnit(
  state: MatchState,
  player: PlayerState,
  content: GameContent,
): string | null {
  const odds =
    content.config.shopOddsByLevel[String(player.level)] ??
    content.config.shopOddsByLevel[String(content.config.maxLevel)];
  const availableByCost = [1, 2, 3, 4, 5].map((cost) =>
    content.units.some(
      (unit) => unit.cost === cost && (state.pool[unit.id] ?? 0) > 0,
    ),
  );
  const costRoll = weightedIndex(
    odds.map((weight, index) =>
      availableByCost[index] ? weight : 0,
    ),
    state.rngState,
  );
  state.rngState = costRoll.state;
  if (costRoll.index < 0) {
    return null;
  }
  const cost = costRoll.index + 1;
  const candidates = content.units
    .filter((unit) => unit.cost === cost)
    .sort((left, right) => left.id.localeCompare(right.id));
  const unitRoll = weightedIndex(
    candidates.map((unit) => state.pool[unit.id] ?? 0),
    state.rngState,
  );
  state.rngState = unitRoll.state;
  const selected = candidates[unitRoll.index];
  if (!selected || (state.pool[selected.id] ?? 0) <= 0) {
    return null;
  }
  state.pool[selected.id] -= 1;
  return selected.id;
}

function rollShop(
  state: MatchState,
  player: PlayerState,
  content: GameContent,
): void {
  player.shop = Array.from(
    { length: content.config.shopSize },
    () => rollOneShopUnit(state, player, content),
  );
}

function gainXp(
  player: PlayerState,
  amount: number,
  content: GameContent,
): void {
  if (player.level >= content.config.maxLevel) {
    player.xp = 0;
    return;
  }
  player.xp += amount;
  while (player.level < content.config.maxLevel) {
    const required =
      content.config.xpToNextByLevel[String(player.level)] ??
      Number.POSITIVE_INFINITY;
    if (player.xp < required) {
      break;
    }
    player.xp -= required;
    player.level += 1;
  }
  if (player.level >= content.config.maxLevel) {
    player.xp = 0;
  }
}

function createPlayer(
  index: number,
  content: GameContent,
): PlayerState {
  const isBot = index > 0;
  const personality =
    content.botPersonalities[(index - 1) % content.botPersonalities.length];
  return {
    id: isBot ? `bot-${index}` : "player-1",
    name: isBot ? `Rival ${index}` : "You",
    isBot,
    personalityId: isBot ? personality?.id ?? "balanced" : null,
    alive: true,
    hp: content.config.startHealth,
    gold: content.config.startGold,
    level: content.config.startLevel,
    xp: 0,
    board: {},
    bench: Array.from({ length: content.config.benchSize }, () => null),
    units: {},
    shop: Array.from({ length: content.config.shopSize }, () => null),
    shopLocked: false,
    inventory: [],
    finalCrew: [],
    ready: false,
    winStreak: 0,
    lossStreak: 0,
    lastOpponents: [],
    placement: null,
  };
}

export function createMatch(
  seed: string | number,
  content: GameContent = DEFAULT_CONTENT,
): MatchState {
  const firstStage = getStageDefinition(1, content);
  const state: MatchState = {
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    contentVersion: content.version,
    seed: String(seed),
    rngState: hashSeed(seed),
    round: 1,
    phase: "preparation",
    stageId: firstStage.id,
    players: Array.from(
      { length: content.config.playerCount },
      (_, index) => createPlayer(index, content),
    ),
    pool: Object.fromEntries(
      content.units.map((unit) => [
        unit.id,
        content.config.poolCopiesByCost[unit.cost - 1],
      ]),
    ),
    pairings: [],
    lastResults: [],
    pendingItemChoices: {},
    carouselChoices: [],
    winnerId: null,
    nextUnitSerial: 1,
    nextChoiceSerial: 1,
  };
  for (const player of state.players) {
    rollShop(state, player, content);
  }
  return state;
}

function normalizeDestination(
  destination: UnitDestination,
): { zone: "board"; x: number; y: number } | {
  zone: "bench";
  slot: number;
} {
  if ("kind" in destination) {
    return destination.kind === "board"
      ? { zone: "board", x: destination.x, y: destination.y }
      : { zone: "bench", slot: destination.index };
  }
  return destination;
}

function moveUnit(
  player: PlayerState,
  unitId: string,
  destination: UnitDestination,
  content: GameContent,
): CommandError | null {
  if (!player.units[unitId]) {
    return { code: "UNIT_NOT_FOUND", message: "That unit does not exist." };
  }
  const source = locateUnit(player, unitId);
  if (!source) {
    return {
      code: "UNIT_NOT_PLACED",
      message: "That unit is not on the board or bench.",
    };
  }
  const normalized = normalizeDestination(destination);
  if (normalized.zone === "board") {
    const minimumDeployRow =
      content.config.boardHeight - content.config.deployRows;
    if (
      normalized.x < 0 ||
      normalized.x >= content.config.boardWidth ||
      normalized.y < minimumDeployRow ||
      normalized.y >= content.config.boardHeight
    ) {
      return {
        code: "INVALID_BOARD_CELL",
        message: "Units can only be deployed on your three rows.",
      };
    }
    const key = cellKey(normalized.x, normalized.y);
    const occupantId = player.board[key] ?? null;
    if (
      source.zone === "bench" &&
      !occupantId &&
      boardUnitCount(player) >= player.level
    ) {
      return {
        code: "BOARD_FULL",
        message: "Your level determines the maximum deployed crew.",
      };
    }
    if (source.zone === "board" && source.key === key) {
      return null;
    }
    if (occupantId) {
      if (source.zone === "board") {
        player.board[source.key] = occupantId;
      } else {
        player.bench[source.slot] = occupantId;
      }
    } else if (source.zone === "board") {
      delete player.board[source.key];
    } else {
      player.bench[source.slot] = null;
    }
    player.board[key] = unitId;
    return null;
  }

  if (
    normalized.slot < 0 ||
    normalized.slot >= content.config.benchSize
  ) {
    return {
      code: "INVALID_BENCH_SLOT",
      message: "That bench slot does not exist.",
    };
  }
  if (source.zone === "bench" && source.slot === normalized.slot) {
    return null;
  }
  const occupantId = player.bench[normalized.slot];
  if (occupantId) {
    if (source.zone === "bench") {
      player.bench[source.slot] = occupantId;
    } else {
      player.board[source.key] = occupantId;
    }
  } else if (source.zone === "bench") {
    player.bench[source.slot] = null;
  } else {
    delete player.board[source.key];
  }
  player.bench[normalized.slot] = unitId;
  return null;
}

function buyFromShop(
  state: MatchState,
  player: PlayerState,
  shopIndex: number,
  content: GameContent,
): CommandError | null {
  if (shopIndex < 0 || shopIndex >= player.shop.length) {
    return {
      code: "INVALID_SHOP_SLOT",
      message: "That shop slot does not exist.",
    };
  }
  const definitionId = player.shop[shopIndex];
  const definition = definitionId
    ? getUnitDefinition(definitionId, content)
    : null;
  if (!definition) {
    return { code: "EMPTY_SHOP_SLOT", message: "That offer is empty." };
  }
  if (player.gold < definition.cost) {
    return { code: "NOT_ENOUGH_GOLD", message: "Not enough gold." };
  }
  if (!canReceiveUnit(player, definition.id)) {
    return {
      code: "BENCH_FULL",
      message: "The bench is full and this purchase would not combine.",
    };
  }
  player.gold -= definition.cost;
  player.shop[shopIndex] = null;
  addUnitToPlayer(state, player, definition.id, content);
  return null;
}

function sellUnit(
  state: MatchState,
  player: PlayerState,
  unitId: string,
  content: GameContent,
): CommandError | null {
  const unit = player.units[unitId];
  const definition = unit
    ? getUnitDefinition(unit.definitionId, content)
    : null;
  if (!unit || !definition) {
    return { code: "UNIT_NOT_FOUND", message: "That unit does not exist." };
  }
  const copies = copiesForStar(unit.star);
  player.gold += definition.cost * copies;
  state.pool[definition.id] = (state.pool[definition.id] ?? 0) + copies;
  player.inventory.push(...unit.items);
  removeFromLocation(player, unitId);
  delete player.units[unitId];
  return null;
}

function recentOpponentPenalty(
  player: PlayerState,
  candidateId: string,
): number {
  const reversed = [...player.lastOpponents].reverse();
  const index = reversed.indexOf(candidateId);
  return index < 0 ? -1 : reversed.length - index;
}

export function createPairings(
  state: MatchState,
): { pairings: MatchPairing[]; rngState: number } {
  const alivePlayers = state.players
    .filter((player) => player.alive)
    .sort((left, right) => left.id.localeCompare(right.id));
  const shuffled = shuffleDeterministic(alivePlayers, state.rngState);
  const remaining = [...shuffled.values];
  const pairings: MatchPairing[] = [];
  while (remaining.length >= 2) {
    const playerA = remaining.shift();
    if (!playerA) {
      break;
    }
    const candidates = remaining
      .map((player, index) => ({
        player,
        index,
        penalty: recentOpponentPenalty(playerA, player.id),
      }))
      .sort(
        (left, right) =>
          left.penalty - right.penalty ||
          left.index - right.index ||
          left.player.id.localeCompare(right.player.id),
      );
    const selected = candidates[0];
    if (!selected) {
      break;
    }
    remaining.splice(selected.index, 1);
    pairings.push({
      playerAId: playerA.id,
      playerBId: selected.player.id,
      ghostOfPlayerId: null,
    });
  }
  if (remaining.length === 1) {
    const playerA = remaining[0];
    const ghostCandidates = alivePlayers
      .filter((player) => player.id !== playerA.id)
      .sort(
        (left, right) =>
          recentOpponentPenalty(playerA, left.id) -
            recentOpponentPenalty(playerA, right.id) ||
          left.id.localeCompare(right.id),
      );
    const ghost = ghostCandidates[0] ?? null;
    pairings.push({
      playerAId: playerA.id,
      playerBId: null,
      ghostOfPlayerId: ghost?.id ?? null,
    });
  }
  return { pairings, rngState: shuffled.state };
}

function playerBattleTeam(
  player: PlayerState,
  side: "a" | "b",
  content: GameContent,
  overrideId: string | null = null,
): BattleTeam {
  const units: BattleSetupUnit[] = Object.entries(player.board)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([key, unitId]) => {
      const instance = player.units[unitId];
      if (!instance) {
        return [];
      }
      const position = parseCell(key);
      return [
        {
          id: `${overrideId ?? player.id}:${instance.id}`,
          definitionId: instance.definitionId,
          star: instance.star,
          items: [...instance.items],
          position:
            side === "a"
              ? position
              : {
                  x: content.config.boardWidth - 1 - position.x,
                  y: content.config.boardHeight - 1 - position.y,
                },
        },
      ];
    });
  return {
    id: overrideId ?? player.id,
    units,
    activeTraits: getActiveTraits(player, content),
  };
}

function pveBattleTeam(
  state: MatchState,
  playerId: string,
  content: GameContent,
): BattleTeam {
  const stage = getStageDefinition(state.round, content);
  const units: BattleSetupUnit[] = [];
  let index = 0;
  for (const entry of stage.enemyWave ?? []) {
    for (let copy = 0; copy < entry.count; copy += 1) {
      const x = index % content.config.boardWidth;
      const y = Math.floor(index / content.config.boardWidth);
      units.push({
        id: `pve-${state.round}-${playerId}-${index}`,
        definitionId: entry.enemyId,
        star: 1,
        items: [],
        position: { x, y },
      });
      index += 1;
    }
  }
  return {
    id: `pve-${state.round}-${playerId}`,
    units,
    activeTraits: [],
  };
}

function calculateLossDamage(
  winnerTeamId: string | null,
  finalUnits: ReturnType<typeof simulateBattle>["finalUnits"],
): number {
  if (!winnerTeamId) {
    return 0;
  }
  const survivors = finalUnits.filter(
    (unit) =>
      unit.teamId === winnerTeamId &&
      unit.state !== "dead" &&
      unit.hp > 0,
  );
  return Math.max(
    1,
    1 + survivors.reduce((sum, unit) => sum + unit.star, 0),
  );
}

function simulatePvpRound(
  state: MatchState,
  content: GameContent,
): void {
  const pairingResult = createPairings(state);
  state.rngState = pairingResult.rngState;
  state.pairings = pairingResult.pairings;
  simulateExistingPvpPairings(state, content);
}

function simulateExistingPvpPairings(
  state: MatchState,
  content: GameContent,
): void {
  state.lastResults = [];
  state.pairings.forEach((pairing, pairingIndex) => {
    const playerA = findPlayer(state, pairing.playerAId);
    const opponentId = pairing.playerBId ?? pairing.ghostOfPlayerId;
    const opponent = opponentId ? findPlayer(state, opponentId) : null;
    if (!playerA || !opponent) {
      return;
    }
    const ghostTeamId = pairing.playerBId
      ? opponent.id
      : `ghost-${opponent.id}`;
    const teamA = playerBattleTeam(playerA, "a", content);
    const teamB = playerBattleTeam(
      opponent,
      "b",
      content,
      pairing.playerBId ? null : ghostTeamId,
    );
    const result = simulateBattle(
      teamA,
      teamB,
      {
        seed: `${state.seed}:r${state.round}:p${pairingIndex}`,
        recordEvents: content.config.recordBattleEvents ?? true,
      },
      content,
    );
    let winnerId: string | null = null;
    if (result.winner === "a") {
      winnerId = playerA.id;
    } else if (result.winner === "b") {
      winnerId = opponent.id;
    }
    const damage = calculateLossDamage(result.winnerId, result.finalUnits);
    state.lastResults.push({
      playerAId: playerA.id,
      playerBId: pairing.playerBId,
      ghostOfPlayerId: pairing.ghostOfPlayerId,
      winnerId,
      timedOut: result.timedOut,
      playerADamage: result.winner === "b" ? damage : 0,
      playerBDamage:
        result.winner === "a" && pairing.playerBId ? damage : 0,
      durationTicks: result.durationTicks,
      events: result.events,
      initialUnits: result.initialUnits,
      finalUnits: result.finalUnits,
    });
  });
}

function simulatePveRound(
  state: MatchState,
  content: GameContent,
): void {
  state.pairings = [];
  state.lastResults = [];
  for (const player of state.players.filter((candidate) => candidate.alive)) {
    const enemyTeam = pveBattleTeam(state, player.id, content);
    const result = simulateBattle(
      playerBattleTeam(player, "a", content),
      enemyTeam,
      {
        seed: `${state.seed}:pve:${state.round}:${player.id}`,
        recordEvents: content.config.recordBattleEvents ?? true,
      },
      content,
    );
    const won = result.winner === "a";
    const lossDamage = won
      ? 0
      : calculateLossDamage(result.winnerId, result.finalUnits);
    state.lastResults.push({
      playerAId: player.id,
      playerBId: null,
      ghostOfPlayerId: null,
      winnerId: won ? player.id : null,
      timedOut: result.timedOut,
      playerADamage: lossDamage,
      playerBDamage: 0,
      durationTicks: result.durationTicks,
      events: result.events,
      initialUnits: result.initialUnits,
      finalUnits: result.finalUnits,
    });
  }
}

/**
 * Replays an already-paired battle without re-running planning or consuming
 * pairing RNG. This is used when a v3 save contains combat results whose event
 * schema predates the readable-combat contract.
 */
export function regenerateBattleResults(
  state: MatchState,
  content: GameContent = DEFAULT_CONTENT,
): MatchState {
  const next = cloneMatch(state);
  if (next.phase !== "battle") {
    return next;
  }
  const stage = getStageDefinition(next.round, content);
  if (stage.kind === "pve") {
    simulatePveRound(next, content);
  } else {
    simulateExistingPvpPairings(next, content);
  }
  return next;
}

function beginBattle(
  state: MatchState,
  content: GameContent,
): MatchState {
  const next = cloneMatch(state);
  const stage = getStageDefinition(next.round, content);
  if (stage.kind === "pve") {
    simulatePveRound(next, content);
  } else {
    simulatePvpRound(next, content);
  }
  next.phase = "battle";
  return next;
}

function returnEliminatedPlayerPieces(
  state: MatchState,
  player: PlayerState,
): void {
  player.finalCrew = Object.values(player.units)
    .sort(
      (left, right) =>
        left.acquiredOrder - right.acquiredOrder ||
        left.id.localeCompare(right.id),
    )
    .map((unit) => ({ ...unit, items: [...unit.items] }));
  for (const unit of Object.values(player.units)) {
    state.pool[unit.definitionId] =
      (state.pool[unit.definitionId] ?? 0) + copiesForStar(unit.star);
  }
  returnShopToPool(state, player);
  player.board = {};
  player.bench = player.bench.map(() => null);
  player.units = {};
}

function updateStreak(
  player: PlayerState,
  result: "win" | "loss" | "draw",
): void {
  if (result === "win") {
    player.winStreak += 1;
    player.lossStreak = 0;
  } else if (result === "loss") {
    player.lossStreak += 1;
    player.winStreak = 0;
  } else {
    player.winStreak = 0;
    player.lossStreak = 0;
  }
}

function resolveBattleResults(
  state: MatchState,
  content: GameContent,
): MatchState {
  const next = cloneMatch(state);
  const stage = getStageDefinition(next.round, content);
  for (const result of next.lastResults) {
    const playerA = findPlayer(next, result.playerAId);
    if (!playerA?.alive) {
      continue;
    }
    playerA.hp -= result.playerADamage;
    if (stage.kind !== "pve") {
      if (result.winnerId === playerA.id) {
        playerA.gold += content.config.pvpWinGold;
        updateStreak(playerA, "win");
      } else if (result.winnerId === null) {
        updateStreak(playerA, "draw");
      } else {
        updateStreak(playerA, "loss");
      }
    }
    if (result.playerBId) {
      const playerB = findPlayer(next, result.playerBId);
      if (!playerB?.alive) {
        continue;
      }
      playerB.hp -= result.playerBDamage;
      if (result.winnerId === playerB.id) {
        playerB.gold += content.config.pvpWinGold;
        updateStreak(playerB, "win");
      } else if (result.winnerId === null) {
        updateStreak(playerB, "draw");
      } else {
        updateStreak(playerB, "loss");
      }
      playerA.lastOpponents = [
        ...playerA.lastOpponents.slice(-2),
        playerB.id,
      ];
      playerB.lastOpponents = [
        ...playerB.lastOpponents.slice(-2),
        playerA.id,
      ];
    } else if (result.ghostOfPlayerId) {
      playerA.lastOpponents = [
        ...playerA.lastOpponents.slice(-2),
        result.ghostOfPlayerId,
      ];
    }
  }

  const eliminated = next.players
    .filter((player) => player.alive && player.hp <= 0)
    .sort((left, right) => left.id.localeCompare(right.id));
  for (const player of eliminated) {
    const placement = next.players.filter(
      (candidate) => candidate.alive,
    ).length;
    player.hp = 0;
    player.alive = false;
    player.placement = placement;
    returnEliminatedPlayerPieces(next, player);
  }
  const survivors = next.players.filter((player) => player.alive);
  if (survivors.length <= 1) {
    const winner = survivors[0] ?? null;
    if (winner) {
      winner.placement = 1;
    }
    next.winnerId = winner?.id ?? null;
    next.phase = "game-over";
    return next;
  }

  if (stage.kind === "pve") {
    prepareItemChoices(next, content);
    if (Object.keys(next.pendingItemChoices).length > 0) {
      next.phase = "item-choice";
      autoChooseBotItems(next, content);
      if (Object.keys(next.pendingItemChoices).length > 0) {
        return next;
      }
    }
  }
  return beginNextRound(next, content);
}

function itemScore(
  itemId: string,
  player: PlayerState,
  content: GameContent,
): number {
  const item = getItemDefinition(itemId, content);
  if (!item) {
    return -1;
  }
  const definitions = Object.values(player.units)
    .map((instance) => getUnitDefinition(instance.definitionId, content))
    .filter((definition): definition is UnitDefinition => Boolean(definition));
  const hasTrait = (traitId: string) =>
    definitions.some((definition) => definition.traits.includes(traitId));
  const hasRanged = definitions.some(
    (definition) => definition.stats.range >= 4,
  );
  const duplicatePenalty =
    player.inventory.includes(itemId) ||
    Object.values(player.units).some((unit) => unit.items.includes(itemId))
      ? 8
      : 0;

  return item.effects.reduce((score, effect) => {
    switch (effect.kind) {
      case "health-flat":
        return (
          score +
          (effect.value / 20) *
            (hasTrait("guardian") || hasTrait("brawler") ? 1.5 : 1)
        );
      case "defense-flat":
        return score + effect.value * (hasTrait("guardian") ? 1.6 : 1);
      case "attack-flat":
        return (
          score +
          effect.value *
            (hasTrait("swordsman") || hasTrait("brawler") ? 1.45 : 1)
        );
      case "attack-speed-percent":
        return score + effect.value * (hasTrait("marksman") ? 1.55 : 1);
      case "critical-chance-percent":
        return (
          score +
          effect.value *
            (hasTrait("marksman") || hasTrait("swordsman") ? 1.6 : 1)
        );
      case "ability-power-percent":
        return score + effect.value * (hasTrait("specialist") ? 1.65 : 1);
      case "starting-energy":
        return score + effect.value * (hasTrait("specialist") ? 1.45 : 1);
      case "range-flat":
        return score + effect.value * (hasRanged ? 28 : 4);
      case "omnivamp-percent":
        return score + effect.value * (hasTrait("brawler") ? 1.6 : 1);
    }
  }, -duplicatePenalty);
}

function prepareItemChoices(
  state: MatchState,
  content: GameContent,
): void {
  state.pendingItemChoices = {};
  const stage = getStageDefinition(state.round, content);
  const choiceCount = stage.itemChoices ?? 3;
  for (const player of state.players.filter((candidate) => {
    if (!candidate.alive) {
      return false;
    }
    return state.lastResults.some(
      (result) =>
        result.playerAId === candidate.id &&
        result.winnerId === candidate.id,
    );
  })) {
    const shuffled = shuffleDeterministic(content.items, state.rngState);
    state.rngState = shuffled.state;
    state.pendingItemChoices[player.id] = shuffled.values
      .slice(0, choiceCount)
      .map((item) => item.id);
  }
}

function autoChooseBotItems(
  state: MatchState,
  content: GameContent,
): void {
  for (const player of state.players.filter(
    (candidate) => candidate.alive && candidate.isBot,
  )) {
    const choices = state.pendingItemChoices[player.id];
    if (!choices) {
      continue;
    }
    const selected = [...choices].sort(
      (left, right) =>
        itemScore(right, player, content) -
          itemScore(left, player, content) ||
        left.localeCompare(right),
    )[0];
    if (selected) {
      player.inventory.push(selected);
    }
    delete state.pendingItemChoices[player.id];
  }
}

function createCarouselChoices(
  state: MatchState,
  content: GameContent,
): CarouselChoice[] {
  const itemShuffle = shuffleDeterministic(content.items, state.rngState);
  state.rngState = itemShuffle.state;
  return itemShuffle.values
    .slice(0, content.config.playerCount)
    .map((item) => {
      const choice = {
        id: `choice-${state.nextChoiceSerial}`,
        itemId: item.id,
        takenByPlayerId: null,
      };
      state.nextChoiceSerial += 1;
      return choice;
    });
}

function carouselDraftOrder(state: MatchState): PlayerState[] {
  return state.players
    .filter((player) => player.alive)
    .sort((left, right) => left.hp - right.hp || left.id.localeCompare(right.id));
}

function alreadyDrafted(state: MatchState, playerId: string): boolean {
  return state.carouselChoices.some(
    (choice) => choice.takenByPlayerId === playerId,
  );
}

function scoreCarouselChoice(
  choice: CarouselChoice,
  player: PlayerState,
  content: GameContent,
): number {
  return itemScore(choice.itemId, player, content);
}

function grantCarouselChoice(
  player: PlayerState,
  choice: CarouselChoice,
): void {
  choice.takenByPlayerId = player.id;
  player.inventory.push(choice.itemId);
}

function bestCarouselChoice(
  state: MatchState,
  player: PlayerState,
  content: GameContent,
): CarouselChoice | null {
  const remaining = state.carouselChoices.filter(
    (choice) => choice.takenByPlayerId === null,
  );
  return [...remaining].sort(
    (left, right) =>
      scoreCarouselChoice(right, player, content) -
        scoreCarouselChoice(left, player, content) ||
      left.id.localeCompare(right.id),
  )[0] ?? null;
}

function draftBotsUntilHuman(
  state: MatchState,
  content: GameContent,
): void {
  for (const player of carouselDraftOrder(state)) {
    if (alreadyDrafted(state, player.id)) {
      continue;
    }
    if (!player.isBot) {
      return;
    }
    const choice = bestCarouselChoice(state, player, content);
    if (choice) {
      grantCarouselChoice(player, choice);
    }
  }
}

function returnUnusedCarouselChoices(
  state: MatchState,
): void {
  state.carouselChoices = [];
}

function enterPreparationAfterCarousel(state: MatchState): MatchState {
  returnUnusedCarouselChoices(state);
  state.phase = "preparation";
  return state;
}

function prepareCarousel(
  state: MatchState,
  content: GameContent,
): MatchState {
  state.phase = "carousel";
  state.stageId = getStageDefinition(state.round, content).id;
  state.carouselChoices = createCarouselChoices(state, content);
  draftBotsUntilHuman(state, content);
  if (
    carouselDraftOrder(state).every((player) =>
      alreadyDrafted(state, player.id),
    )
  ) {
    return enterPreparationAfterCarousel(state);
  }
  return state;
}

function finishCarouselIfComplete(
  state: MatchState,
  content: GameContent,
): MatchState {
  draftBotsUntilHuman(state, content);
  const complete = carouselDraftOrder(state).every((player) =>
    alreadyDrafted(state, player.id),
  );
  if (!complete) {
    return state;
  }
  return enterPreparationAfterCarousel(state);
}

function streakIncome(
  player: PlayerState,
  content: GameContent,
): number {
  const streak = Math.max(player.winStreak, player.lossStreak);
  return Math.min(
    content.config.maxStreakBonus,
    Math.max(0, streak - 1),
  );
}

function beginNextRound(
  state: MatchState,
  content: GameContent,
): MatchState {
  state.round += 1;
  state.pairings = [];
  state.lastResults = [];
  state.pendingItemChoices = {};
  state.carouselChoices = [];
  const stage = getStageDefinition(state.round, content);
  state.stageId = stage.id;
  for (const player of state.players.filter((candidate) => candidate.alive)) {
    const interest = Math.min(
      content.config.maxInterest,
      Math.floor(player.gold / 10),
    );
    player.gold +=
      content.config.baseIncome + interest + streakIncome(player, content);
    gainXp(player, content.config.autoXpPerRound, content);
    player.ready = false;
    if (player.shopLocked) {
      player.shopLocked = false;
    } else {
      returnShopToPool(state, player);
      rollShop(state, player, content);
    }
  }
  if (stage.kind === "carousel") {
    return prepareCarousel(state, content);
  }
  state.phase = "preparation";
  return state;
}

function botPersonality(
  player: PlayerState,
  content: GameContent,
): BotPersonality {
  return (
    content.botPersonalities.find(
      (personality) => personality.id === player.personalityId,
    ) ??
    content.botPersonalities[0] ?? {
      id: "fallback",
      name: "Fallback",
      economyReserve: 10,
      levelAggression: 0.5,
      rerollAggression: 0.5,
      preferredTraits: [],
      formation: "spread",
    }
  );
}

function botUnitScore(
  definitionId: string,
  player: PlayerState,
  personality: BotPersonality,
  content: GameContent,
): number {
  const definition = getUnitDefinition(definitionId, content);
  if (!definition) {
    return -1_000;
  }
  const copies = Object.values(player.units).filter(
    (unit) => unit.definitionId === definitionId,
  );
  const preferred = definition.traits.some((traitId) =>
    personality.preferredTraits.includes(traitId),
  )
    ? 1
    : 0;
  const activeCounts = getActiveTraits(player, content);
  const synergy = definition.traits
    .map((traitId) => {
      const active = activeCounts.find(
        (candidate) => candidate.traitId === traitId,
      );
      return (active?.count ?? 0) * 4;
    })
    .sort((left, right) => right - left)
    .slice(0, 2)
    .reduce((score, value) => score + value, 0);
  // Base cost, copies, preference, and the two strongest live connections
  // already reward flexible units. Normalize only exceptional tag breadth so
  // a five-trait connector cannot dominate every otherwise distinct bot plan.
  const connectorPenalty = Math.max(0, definition.traits.length - 3) * 12;
  return (
    definition.cost * 25 +
    copies.length * 24 +
    preferred * 20 +
    synergy -
    connectorPenalty
  );
}

function botInstanceScore(
  unit: UnitInstance,
  player: PlayerState,
  personality: BotPersonality,
  content: GameContent,
): number {
  return (
    botUnitScore(unit.definitionId, player, personality, content) +
    (unit.star === 3 ? 260 : unit.star === 2 ? 100 : 0) +
    unit.items.length * 18
  );
}

function botFormationCells(
  personality: BotPersonality,
  content: GameContent,
): Position[] {
  const firstDeployRow =
    content.config.boardHeight - content.config.deployRows;
  const rows =
    personality.formation === "frontline"
      ? [firstDeployRow, firstDeployRow + 1, firstDeployRow + 2]
      : personality.formation === "corner"
        ? [firstDeployRow + 2, firstDeployRow + 1, firstDeployRow]
        : [firstDeployRow + 1, firstDeployRow, firstDeployRow + 2];
  const columns =
    personality.formation === "corner"
      ? Array.from({ length: content.config.boardWidth }, (_, index) => index)
      : Array.from(
          { length: content.config.boardWidth },
          (_, index) =>
            (Math.floor(content.config.boardWidth / 2) +
              (index % 2 === 0 ? index / 2 : -(index + 1) / 2) +
              content.config.boardWidth) %
            content.config.boardWidth,
        );
  return rows.flatMap((y) => columns.map((x) => ({ x, y })));
}

function botBuyPass(
  state: MatchState,
  playerId: string,
  content: GameContent,
): MatchState {
  let next = state;
  const player = findPlayer(next, playerId);
  if (!player) {
    return next;
  }
  const personality = botPersonality(player, content);
  const offers = player.shop
    .map((definitionId, shopIndex) => ({
      definitionId,
      shopIndex,
      score: definitionId
        ? botUnitScore(definitionId, player, personality, content)
        : -1_000,
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.shopIndex - right.shopIndex,
    );
  for (const offer of offers) {
    let currentPlayer = findPlayer(next, playerId);
    let stateBeforeReplacement: MatchState | null = null;
    const definition = offer.definitionId
      ? getUnitDefinition(offer.definitionId, content)
      : null;
    if (
      !currentPlayer ||
      !definition ||
      currentPlayer.gold < definition.cost
    ) {
      continue;
    }
    const shouldBuy =
      currentPlayer.gold - definition.cost >= personality.economyReserve ||
      offer.score >= definition.cost * 25 + 24 ||
      state.round <= 3;
    if (!shouldBuy) {
      continue;
    }
    if (!canReceiveUnit(currentPlayer, definition.id)) {
      // A full bench may turn over one stale one-star unit, but only for a
      // clearly stronger, higher-cost offer. The later purchase is rolled back
      // with this snapshot if command legality changes unexpectedly.
      const replacement = currentPlayer.bench
        .filter((unitId): unitId is string => Boolean(unitId))
        .map((unitId) => currentPlayer!.units[unitId])
        .filter((unit): unit is UnitInstance => Boolean(unit) && unit.star === 1)
        .map((unit) => ({
          unit,
          definition: getUnitDefinition(unit.definitionId, content),
          score: botInstanceScore(
            unit,
            currentPlayer!,
            personality,
            content,
          ),
        }))
        .filter(
          (candidate) =>
            candidate.definition &&
            candidate.definition.cost < definition.cost &&
            offer.score >= candidate.score + 20,
        )
        .sort(
          (left, right) =>
            left.score - right.score ||
            left.unit.acquiredOrder - right.unit.acquiredOrder ||
            left.unit.id.localeCompare(right.unit.id),
        )[0];
      if (!replacement) {
        continue;
      }
      stateBeforeReplacement = next;
      const sale = applyCommand(
        next,
        { type: "SELL_UNIT", playerId, unitId: replacement.unit.id },
        content,
      );
      if (!sale.ok) {
        continue;
      }
      next = sale.state;
      currentPlayer = findPlayer(next, playerId);
      if (!currentPlayer || !canReceiveUnit(currentPlayer, definition.id)) {
        next = stateBeforeReplacement;
        continue;
      }
    }
    const result = applyCommand(
      next,
      {
        type: "BUY_UNIT",
        playerId,
        shopIndex: offer.shopIndex,
      },
      content,
    );
    if (result.ok) {
      next = result.state;
    } else if (stateBeforeReplacement) {
      next = stateBeforeReplacement;
    }
  }
  return next;
}

function arrangeBotBoard(
  state: MatchState,
  playerId: string,
  content: GameContent,
): MatchState {
  let next = state;
  let player = findPlayer(next, playerId);
  if (!player) {
    return next;
  }
  const personality = botPersonality(player, content);
  const desired = Object.values(player.units)
    .sort(
      (left, right) =>
        botInstanceScore(right, player!, personality, content) -
          botInstanceScore(left, player!, personality, content) ||
        left.acquiredOrder - right.acquiredOrder,
    )
    .slice(0, player.level);
  const desiredIds = new Set(desired.map((unit) => unit.id));
  const formation = botFormationCells(personality, content);

  for (const unit of desired) {
    player = findPlayer(next, playerId);
    if (!player || locateUnit(player, unit.id)?.zone === "board") {
      continue;
    }
    const emptyCell = formation.find(
      (position) => !player!.board[cellKey(position.x, position.y)],
    );
    let destination = emptyCell;
    if (!destination && boardUnitCount(player) >= player.level) {
      const replaceable = Object.entries(player.board)
        .map(([key, deployedId]) => ({
          key,
          deployedId,
          instance: player!.units[deployedId],
        }))
        .filter(
          (entry) => entry.instance && !desiredIds.has(entry.deployedId),
        )
        .sort(
          (left, right) =>
            botInstanceScore(
              left.instance!,
              player!,
              personality,
              content,
            ) -
              botInstanceScore(
                right.instance!,
                player!,
                personality,
                content,
              ) ||
            left.key.localeCompare(right.key),
        )[0];
      destination = replaceable ? parseCell(replaceable.key) : undefined;
    }
    if (!destination) {
      continue;
    }
    const result = applyCommand(
      next,
      {
        type: "MOVE_UNIT",
        playerId,
        unitId: unit.id,
        to: { zone: "board", x: destination.x, y: destination.y },
      },
      content,
    );
    if (result.ok) {
      next = result.state;
    }
  }
  return next;
}

function botItemCompatibilityScore(
  itemId: string,
  unit: UnitInstance,
  player: PlayerState,
  personality: BotPersonality,
  content: GameContent,
): number {
  const item = getItemDefinition(itemId, content);
  const definition = getUnitDefinition(unit.definitionId, content);
  if (!item || !definition || unit.items.length >= content.config.itemCap) {
    return Number.NEGATIVE_INFINITY;
  }
  const hasTrait = (traitId: string) => definition.traits.includes(traitId);
  const compatibility = item.effects.reduce((score, effect) => {
    switch (effect.kind) {
      case "health-flat":
        return (
          score +
          (effect.value / 20) *
            (hasTrait("guardian") || hasTrait("brawler") ? 1.5 : 1)
        );
      case "defense-flat":
        return score + effect.value * (hasTrait("guardian") ? 1.6 : 1);
      case "attack-flat":
        return (
          score +
          effect.value *
            (hasTrait("swordsman") || hasTrait("brawler") ? 1.45 : 1)
        );
      case "attack-speed-percent":
        return score + effect.value * (hasTrait("marksman") ? 1.55 : 1);
      case "critical-chance-percent":
        return (
          score +
          effect.value *
            (hasTrait("marksman") || hasTrait("swordsman") ? 1.6 : 1)
        );
      case "ability-power-percent":
        return score + effect.value * (hasTrait("specialist") ? 1.65 : 1);
      case "starting-energy":
        return score + effect.value * (hasTrait("specialist") ? 1.45 : 1);
      case "range-flat":
        return score + effect.value * (definition.stats.range >= 4 ? 28 : 4);
      case "omnivamp-percent":
        return score + effect.value * (hasTrait("brawler") ? 1.6 : 1);
    }
  }, 0);
  const deployedBonus = locateUnit(player, unit.id)?.zone === "board" ? 40 : 0;
  const duplicatePenalty = unit.items.includes(itemId) ? 20 : 0;
  return (
    compatibility * 1_000 +
    itemScore(itemId, player, content) * 10 +
    botInstanceScore(unit, player, personality, content) +
    deployedBonus -
    duplicatePenalty
  );
}

function equipBotInventory(
  state: MatchState,
  playerId: string,
  content: GameContent,
): MatchState {
  let next = state;
  while (true) {
    const player = findPlayer(next, playerId);
    if (!player || player.inventory.length === 0) {
      return next;
    }
    const personality = botPersonality(player, content);
    const candidates = player.inventory
      .flatMap((itemId, inventoryIndex) =>
        Object.values(player.units).map((unit) => ({
          itemId,
          inventoryIndex,
          unitId: unit.id,
          acquiredOrder: unit.acquiredOrder,
          score: botItemCompatibilityScore(
            itemId,
            unit,
            player,
            personality,
            content,
          ),
        })),
      )
      .filter((candidate) => Number.isFinite(candidate.score))
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.itemId.localeCompare(right.itemId) ||
          left.acquiredOrder - right.acquiredOrder ||
          left.unitId.localeCompare(right.unitId) ||
          left.inventoryIndex - right.inventoryIndex,
      );
    const selected = candidates[0];
    if (!selected) {
      return next;
    }
    const result = applyCommand(
      next,
      {
        type: "EQUIP_ITEM",
        playerId,
        unitId: selected.unitId,
        itemId: selected.itemId,
      },
      content,
    );
    if (!result.ok) {
      return next;
    }
    next = result.state;
  }
}

export function runBotTurn(
  state: MatchState,
  playerId: string,
  content: GameContent = DEFAULT_CONTENT,
): MatchState {
  const initialPlayer = findPlayer(state, playerId);
  if (
    state.phase !== "preparation" ||
    !initialPlayer?.alive ||
    !initialPlayer.isBot
  ) {
    return state;
  }
  let next = cloneMatch(state);
  next = botBuyPass(next, playerId, content);
  let player = findPlayer(next, playerId);
  if (!player) {
    return next;
  }
  const personality = botPersonality(player, content);

  const xpPurchases = Math.min(
    3,
    Math.floor(personality.levelAggression * 4),
  );
  for (let purchase = 0; purchase < xpPurchases; purchase += 1) {
    player = findPlayer(next, playerId);
    if (
      !player ||
      player.level >= content.config.maxLevel ||
      player.gold - content.config.buyXpCost < personality.economyReserve ||
      Object.keys(player.units).length < player.level
    ) {
      break;
    }
    const result = applyCommand(
      next,
      { type: "BUY_XP", playerId },
      content,
    );
    if (result.ok) {
      next = result.state;
    }
  }

  const rerolls = Math.min(
    3,
    Math.floor(personality.rerollAggression * 4),
  );
  for (let reroll = 0; reroll < rerolls; reroll += 1) {
    player = findPlayer(next, playerId);
    if (
      !player ||
      player.gold - content.config.rerollCost < personality.economyReserve
    ) {
      break;
    }
    const rerollResult = applyCommand(
      next,
      { type: "REROLL_SHOP", playerId },
      content,
    );
    if (!rerollResult.ok) {
      break;
    }
    next = botBuyPass(rerollResult.state, playerId, content);
  }

  next = arrangeBotBoard(next, playerId, content);
  next = equipBotInventory(next, playerId, content);
  const readyResult = applyCommand(
    next,
    { type: "END_PREPARATION", playerId },
    content,
  );
  return readyResult.ok ? readyResult.state : next;
}

function runAllBotTurns(
  state: MatchState,
  content: GameContent,
): MatchState {
  let next = state;
  for (const bot of next.players.filter(
    (player) => player.alive && player.isBot,
  )) {
    next = runBotTurn(next, bot.id, content);
  }
  return next;
}

function autoResolveItemChoices(
  state: MatchState,
  content: GameContent,
): MatchState {
  const next = cloneMatch(state);
  for (const [playerId, choices] of Object.entries(
    next.pendingItemChoices,
  )) {
    const player = findPlayer(next, playerId);
    if (!player || choices.length === 0) {
      delete next.pendingItemChoices[playerId];
      continue;
    }
    const selected = [...choices].sort(
      (left, right) =>
        itemScore(right, player, content) -
          itemScore(left, player, content) ||
        left.localeCompare(right),
    )[0];
    player.inventory.push(selected);
    delete next.pendingItemChoices[playerId];
  }
  return beginNextRound(next, content);
}

function autoResolveCarousel(
  state: MatchState,
  content: GameContent,
): MatchState {
  const next = cloneMatch(state);
  for (const player of carouselDraftOrder(next)) {
    if (alreadyDrafted(next, player.id)) {
      continue;
    }
    const choice = bestCarouselChoice(next, player, content);
    if (choice) {
      grantCarouselChoice(player, choice);
    }
  }
  return finishCarouselIfComplete(next, content);
}

export function advanceMatchPhase(
  state: MatchState,
  content: GameContent = DEFAULT_CONTENT,
): MatchState {
  switch (state.phase) {
    case "preparation":
      return beginBattle(runAllBotTurns(cloneMatch(state), content), content);
    case "battle":
      return resolveBattleResults(state, content);
    case "item-choice":
      return autoResolveItemChoices(state, content);
    case "carousel":
      return autoResolveCarousel(state, content);
    case "game-over":
      return state;
  }
}

function validatePlanningPlayer(
  state: MatchState,
  command: Exclude<GameCommand, { type: "TIMER_EXPIRED" }>,
): PlayerState | null {
  return findPlayer(state, command.playerId);
}

export function applyCommand(
  state: MatchState,
  command: GameCommand,
  content: GameContent = DEFAULT_CONTENT,
): CommandResult {
  if (command.type === "TIMER_EXPIRED") {
    return { ok: true, state: advanceMatchPhase(state, content) };
  }

  const planningCommands = new Set<GameCommand["type"]>([
    "BUY_UNIT",
    "REROLL_SHOP",
    "TOGGLE_SHOP_LOCK",
    "BUY_XP",
    "MOVE_UNIT",
    "SELL_UNIT",
    "EQUIP_ITEM",
    "END_PREPARATION",
  ]);
  if (
    planningCommands.has(command.type) &&
    state.phase !== "preparation"
  ) {
    return commandFailure(
      state,
      "WRONG_PHASE",
      "That action is only available during preparation.",
    );
  }
  if (command.type === "CHOOSE_ITEM" && state.phase !== "item-choice") {
    return commandFailure(
      state,
      "WRONG_PHASE",
      "There is no item choice right now.",
    );
  }
  if (command.type === "CAROUSEL_PICK" && state.phase !== "carousel") {
    return commandFailure(
      state,
      "WRONG_PHASE",
      "There is no carousel right now.",
    );
  }

  const currentPlayer = validatePlanningPlayer(state, command);
  if (!currentPlayer) {
    return commandFailure(
      state,
      "PLAYER_NOT_FOUND",
      "That player does not exist.",
    );
  }
  if (!currentPlayer.alive) {
    return commandFailure(
      state,
      "PLAYER_ELIMINATED",
      "Eliminated players cannot act.",
    );
  }

  let next = cloneMatch(state);
  const player = findPlayer(next, command.playerId);
  if (!player) {
    return commandFailure(state, "PLAYER_NOT_FOUND", "Player disappeared.");
  }

  switch (command.type) {
    case "BUY_UNIT": {
      const error = buyFromShop(
        next,
        player,
        command.shopIndex,
        content,
      );
      return error
        ? { ok: false, state, error }
        : { ok: true, state: next };
    }
    case "REROLL_SHOP":
      if (player.gold < content.config.rerollCost) {
        return commandFailure(state, "NOT_ENOUGH_GOLD", "Not enough gold.");
      }
      player.gold -= content.config.rerollCost;
      returnShopToPool(next, player);
      rollShop(next, player, content);
      return { ok: true, state: next };
    case "TOGGLE_SHOP_LOCK":
      player.shopLocked = !player.shopLocked;
      return { ok: true, state: next };
    case "BUY_XP":
      if (player.level >= content.config.maxLevel) {
        return commandFailure(state, "MAX_LEVEL", "Already at max level.");
      }
      if (player.gold < content.config.buyXpCost) {
        return commandFailure(state, "NOT_ENOUGH_GOLD", "Not enough gold.");
      }
      player.gold -= content.config.buyXpCost;
      gainXp(player, content.config.buyXpAmount, content);
      return { ok: true, state: next };
    case "MOVE_UNIT": {
      const error = moveUnit(player, command.unitId, command.to, content);
      return error
        ? { ok: false, state, error }
        : { ok: true, state: next };
    }
    case "SELL_UNIT": {
      const error = sellUnit(
        next,
        player,
        command.unitId,
        content,
      );
      return error
        ? { ok: false, state, error }
        : { ok: true, state: next };
    }
    case "EQUIP_ITEM": {
      const unit = player.units[command.unitId];
      const inventoryIndex = player.inventory.indexOf(command.itemId);
      if (!unit) {
        return commandFailure(
          state,
          "UNIT_NOT_FOUND",
          "That unit does not exist.",
        );
      }
      if (!getItemDefinition(command.itemId, content) || inventoryIndex < 0) {
        return commandFailure(
          state,
          "ITEM_NOT_FOUND",
          "That item is not in the inventory.",
        );
      }
      if (unit.items.length >= content.config.itemCap) {
        return commandFailure(
          state,
          "ITEM_CAP",
          "That unit already holds the maximum number of items.",
        );
      }
      player.inventory.splice(inventoryIndex, 1);
      unit.items.push(command.itemId);
      return { ok: true, state: next };
    }
    case "END_PREPARATION": {
      player.ready = true;
      if (player.isBot) {
        return { ok: true, state: next };
      }
      next = runAllBotTurns(next, content);
      return { ok: true, state: beginBattle(next, content) };
    }
    case "CHOOSE_ITEM": {
      const choices = next.pendingItemChoices[player.id] ?? [];
      const selected =
        choices.find((itemId) => itemId === command.choiceId) ?? null;
      if (!selected) {
        return commandFailure(
          state,
          "INVALID_ITEM_CHOICE",
          "That item is not one of the offered choices.",
        );
      }
      player.inventory.push(selected);
      delete next.pendingItemChoices[player.id];
      if (Object.keys(next.pendingItemChoices).length === 0) {
        next = beginNextRound(next, content);
      }
      return { ok: true, state: next };
    }
    case "CAROUSEL_PICK": {
      const nextDrafter = carouselDraftOrder(next).find(
        (candidate) => !alreadyDrafted(next, candidate.id),
      );
      if (nextDrafter?.id !== player.id) {
        return commandFailure(
          state,
          "NOT_DRAFT_TURN",
          "Another player drafts before you.",
        );
      }
      const choice = next.carouselChoices.find(
        (candidate) =>
          candidate.id === command.choiceId &&
          candidate.takenByPlayerId === null,
      );
      if (!choice) {
        return commandFailure(
          state,
          "INVALID_CAROUSEL_CHOICE",
          "That carousel choice is unavailable.",
        );
      }
      grantCarouselChoice(player, choice);
      next = finishCarouselIfComplete(next, content);
      return { ok: true, state: next };
    }
  }
}
