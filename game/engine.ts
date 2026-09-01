import {
  DEFAULT_CONTENT,
  getItemDefinition,
  getStageDefinition,
  getUnitDefinition,
} from "./content";
import { simulateBattle } from "./combat";
import {
  reconcileProductionFormProgression,
  resolvePersistentFormId,
} from "./forms";
import { hashSeed, randomInt, shuffleDeterministic } from "./rng";
import { getActiveTraits } from "./traits";
import { CURRENT_SAVE_SCHEMA_VERSION } from "./schema";
import { createPairings } from "./pairing";
import { cellKey, cloneMatch, copiesForStar, findPlayer, parseCell } from "./state";
import {
  gainXp,
  refillEmptyShopSlots,
  returnShopToPool,
  rollShop,
  streakIncome,
} from "./economy";
import {
  addUnitToPlayer,
  boardUnitCount,
  canReceiveUnit,
  locateUnit,
  removeFromLocation,
} from "./roster";
import {
  CAROUSEL_ARENA_HEIGHT,
  CAROUSEL_ARENA_WIDTH,
  CAROUSEL_BOAT_RADIUS,
  CAROUSEL_BOUNTY_RADIUS,
  CAROUSEL_TICK_MS,
  clampCarouselPosition,
  createCarouselSteeringState,
  createCarouselTickState,
  getCarouselChoicePosition,
  mutableCarouselPlayer,
} from "./carousel";
import {
  appendRecentBattle,
  battleOutcomeFor,
  calculateLossDamage,
  compareSimultaneousEliminations,
  updateStreak,
} from "./matchFlow";
import {
  getBotFormationBand as botFormationBand,
  getBotPersonality as botPersonality,
  selectDesiredBotUnits as desiredBotUnits,
  type BotFormationBand,
} from "./bots";

export {
  CAROUSEL_ARENA_HEIGHT,
  CAROUSEL_ARENA_WIDTH,
  CAROUSEL_BOAT_RADIUS,
  CAROUSEL_BOUNTY_RADIUS,
  CAROUSEL_ORBIT_RADIANS_PER_TICK,
  CAROUSEL_ORBIT_RADIUS_X,
  CAROUSEL_ORBIT_RADIUS_Y,
  CAROUSEL_TICK_MS,
} from "./carousel";
import {
  scoreBotInstance as botInstanceScore,
  scoreBotUnit as botUnitScore,
  scoreItemForPlayer as itemScore,
  scoreItemForUnit,
} from "./scoring";
import type {
  BattleSetupUnit,
  BattleTeam,
  BotFormationPlacement,
  BotPersonality,
  CarouselChoice,
  CarouselEvent,
  CarouselParticipantState,
  CarouselSessionState,
  CommandContext,
  CommandError,
  CommandErrorCode,
  CommandResult,
  GameCommand,
  GameContent,
  MatchPhase,
  MatchState,
  PlayerState,
  Position,
  UnitDestination,
  UnitInstance,
} from "./types";

const CAROUSEL_CENTER: Position = {
  x: CAROUSEL_ARENA_WIDTH / 2,
  y: CAROUSEL_ARENA_HEIGHT / 2,
};
const CAROUSEL_SPAWN_RADIUS_X = 650;
const CAROUSEL_SPAWN_RADIUS_Y = 330;
const CAROUSEL_BOAT_SPEED_PER_TICK = 8;
const CAROUSEL_PICKUP_HOLD_TICKS = 800 / CAROUSEL_TICK_MS;
const CAROUSEL_EVENT_LOG_LIMIT = 256;

function commandFailure(
  state: MatchState,
  code: CommandErrorCode,
  message: string,
): CommandResult {
  const error: CommandError = { code, message };
  return { ok: false, state, error };
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
    recentBattles: [],
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
    carouselSession: null,
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
      const formId = resolvePersistentFormId(instance, content);
      return [
        {
          id: `${overrideId ?? player.id}:${instance.id}`,
          definitionId: instance.definitionId,
          ...(formId ? { formId } : {}),
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
        ...playerA.lastOpponents,
        playerB.id,
      ];
      playerB.lastOpponents = [
        ...playerB.lastOpponents,
        playerA.id,
      ];
      appendRecentBattle(playerA, {
        round: next.round,
        opponentId: playerB.id,
        outcome: battleOutcomeFor(playerA.id, result.winnerId),
        isGhost: false,
        captainDamageDealt: result.playerBDamage,
        captainDamageTaken: result.playerADamage,
      });
      appendRecentBattle(playerB, {
        round: next.round,
        opponentId: playerA.id,
        outcome: battleOutcomeFor(playerB.id, result.winnerId),
        isGhost: false,
        captainDamageDealt: result.playerADamage,
        captainDamageTaken: result.playerBDamage,
      });
    } else if (result.ghostOfPlayerId) {
      playerA.lastOpponents = [
        ...playerA.lastOpponents,
        result.ghostOfPlayerId,
      ];
      appendRecentBattle(playerA, {
        round: next.round,
        opponentId: result.ghostOfPlayerId,
        outcome: battleOutcomeFor(playerA.id, result.winnerId),
        isGhost: true,
        captainDamageDealt: 0,
        captainDamageTaken: result.playerADamage,
      });
    }
  }

  const aliveCountBeforeElimination = next.players.filter(
    (player) => player.alive,
  ).length;
  const eliminated = next.players
    .filter((player) => player.alive && player.hp <= 0)
    .sort(compareSimultaneousEliminations);
  const firstEliminatedPlacement =
    aliveCountBeforeElimination - eliminated.length + 1;
  for (const [index, player] of eliminated.entries()) {
    player.hp = 0;
    player.alive = false;
    player.placement = firstEliminatedPlacement + index;
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
  const livingPlayers = state.players.filter((player) => player.alive).length;
  const desiredCount = Math.min(9, Math.max(5, livingPlayers + 3));
  const itemDeck = content.items.flatMap((item) => [item, item]);
  const itemShuffle = shuffleDeterministic(itemDeck, state.rngState);
  state.rngState = itemShuffle.state;
  return itemShuffle.values
    .slice(0, Math.min(desiredCount, itemDeck.length))
    .map((item, orbitIndex) => {
      const choice: CarouselChoice = {
        id: `choice-${state.nextChoiceSerial}`,
        itemId: item.id,
        takenByPlayerId: null,
        orbitIndex,
        claimedAtTick: null,
      };
      state.nextChoiceSerial += 1;
      return choice;
    });
}

function carouselDraftOrder(state: MatchState): PlayerState[] {
  return state.players
    .filter((player) => player.alive)
    .sort(
      (left, right) =>
        left.hp - right.hp ||
        left.level - right.level ||
        left.id.localeCompare(right.id),
    );
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
  tick: number,
  participant?: CarouselParticipantState,
): void {
  if (choice.takenByPlayerId !== null) {
    return;
  }
  choice.takenByPlayerId = player.id;
  choice.claimedAtTick = tick;
  if (participant) {
    participant.claimedChoiceId = choice.id;
  }
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
      left.itemId.localeCompare(right.itemId) ||
      left.id.localeCompare(right.id),
  )[0] ?? null;
}

function returnUnusedCarouselChoices(
  state: MatchState,
): void {
  state.carouselChoices = [];
}

function enterPreparationAfterCarousel(state: MatchState): MatchState {
  returnUnusedCarouselChoices(state);
  state.carouselSession = null;
  state.phase = "preparation";
  return state;
}

function createCarouselSession(state: MatchState): CarouselSessionState {
  const draftOrder = carouselDraftOrder(state);
  const rankByPlayerId = new Map(
    draftOrder.map((player, index) => [
      player.id,
      draftOrder.length - index,
    ]),
  );
  const human = draftOrder.find((player) => !player.isBot) ?? null;
  const orderedPlayers = [
    ...(human ? [human] : []),
    ...draftOrder
      .filter((player) => player.id !== human?.id)
      .sort((left, right) => left.id.localeCompare(right.id)),
  ];
  const arenaSeed = hashSeed(
    `${state.seed}:carousel:${state.round}:${state.rngState}`,
  );
  const participants = orderedPlayers.map((player, index) => {
    const angle =
      index === 0 && !player.isBot
        ? Math.PI / 2
        : Math.PI / 2 + (index * Math.PI * 2) / orderedPlayers.length;
    const spawnPosition = clampCarouselPosition({
      x: CAROUSEL_CENTER.x + Math.cos(angle) * CAROUSEL_SPAWN_RADIUS_X,
      y: CAROUSEL_CENTER.y + Math.sin(angle) * CAROUSEL_SPAWN_RADIUS_Y,
    });
    let reactionDelayTicks = 0;
    if (player.isBot) {
      const delay = randomInt(
        state.rngState,
        1_000 / CAROUSEL_TICK_MS,
        6_000 / CAROUSEL_TICK_MS + 1,
      );
      state.rngState = delay.state;
      reactionDelayTicks = delay.value;
    }
    const rank = rankByPlayerId.get(player.id) ?? 1;
    const baseReleaseTick =
      state.round === 4
        ? 5_000 / CAROUSEL_TICK_MS
        : 5_000 / CAROUSEL_TICK_MS +
          (draftOrder.length - rank) * (2_000 / CAROUSEL_TICK_MS);
    return {
      playerId: player.id,
      rank,
      spawnPosition,
      position: { ...spawnPosition },
      targetPosition: { ...spawnPosition },
      releaseTick: baseReleaseTick + reactionDelayTicks,
      reactionDelayTicks,
      moving: false,
      claimedChoiceId: null,
    } satisfies CarouselParticipantState;
  });
  const durationSeconds =
    state.round === 4 ? 16 : 16 + draftOrder.length * 2;
  return {
    tick: 0,
    durationTicks: durationSeconds * (1_000 / CAROUSEL_TICK_MS),
    finishAtTick: null,
    arenaSeed,
    participants,
    events: [],
  };
}

function prepareCarousel(
  state: MatchState,
  content: GameContent,
): MatchState {
  state.phase = "carousel";
  state.stageId = getStageDefinition(state.round, content).id;
  state.carouselChoices = createCarouselChoices(state, content);
  state.carouselSession = createCarouselSession(state);
  if (state.carouselSession.participants.length === 0) {
    return enterPreparationAfterCarousel(state);
  }
  return state;
}

function allCarouselParticipantsClaimed(state: MatchState): boolean {
  const session = state.carouselSession;
  return Boolean(
    session &&
      session.participants.length > 0 &&
      session.participants.every(
        (participant) => participant.claimedChoiceId !== null,
      ),
  );
}

function moveCarouselParticipant(
  participant: CarouselParticipantState,
): { from: Position; to: Position } | null {
  const from = { ...participant.position };
  const deltaX = participant.targetPosition.x - participant.position.x;
  const deltaY = participant.targetPosition.y - participant.position.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance <= 0.001) {
    participant.position = { ...participant.targetPosition };
    participant.moving = false;
    return null;
  }
  const distanceToTravel = Math.min(CAROUSEL_BOAT_SPEED_PER_TICK, distance);
  participant.position = clampCarouselPosition({
    x: participant.position.x + (deltaX / distance) * distanceToTravel,
    y: participant.position.y + (deltaY / distance) * distanceToTravel,
  });
  participant.moving = distance > CAROUSEL_BOAT_SPEED_PER_TICK;
  return { from, to: { ...participant.position } };
}

function updateCarouselBotTarget(
  state: MatchState,
  content: GameContent,
  participant: CarouselParticipantState,
): void {
  const player = findPlayer(state, participant.playerId);
  if (!player?.isBot) {
    return;
  }
  if (participant.claimedChoiceId !== null) {
    participant.targetPosition = { ...participant.spawnPosition };
    return;
  }
  const choice = bestCarouselChoice(state, player, content);
  if (choice) {
    participant.targetPosition = getCarouselChoicePosition(
      state,
      choice,
      state.carouselSession?.tick,
    );
  }
}

function resolveCarouselBoatCollisions(
  session: CarouselSessionState,
  events: CarouselEvent[],
): void {
  const collidable = [...session.participants]
    .filter(
      (participant) =>
        session.tick >= participant.releaseTick &&
        participant.claimedChoiceId === null,
    )
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
  const minimumDistance = CAROUSEL_BOAT_RADIUS * 2;
  const reportedPairs = new Set<string>();
  const maximumPasses = Math.max(1, collidable.length ** 2 * 2);
  for (let pass = 0; pass < maximumPasses; pass += 1) {
    let correctedOverlap = false;
    for (let leftIndex = 0; leftIndex < collidable.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < collidable.length;
        rightIndex += 1
      ) {
        const left = collidable[leftIndex];
        const right = collidable[rightIndex];
        const deltaX = right.position.x - left.position.x;
        const deltaY = right.position.y - left.position.y;
        const distance = Math.hypot(deltaX, deltaY);
        if (distance >= minimumDistance - 0.001) {
          continue;
        }
        const normalX = distance <= 0.001 ? 1 : deltaX / distance;
        const normalY = distance <= 0.001 ? 0 : deltaY / distance;
        const displacement = (minimumDistance - distance) / 2;
        left.position = clampCarouselPosition({
          x: left.position.x - normalX * displacement,
          y: left.position.y - normalY * displacement,
        });
        right.position = clampCarouselPosition({
          x: right.position.x + normalX * displacement,
          y: right.position.y + normalY * displacement,
        });
        correctedOverlap = true;
        const pairKey = `${left.playerId}|${right.playerId}`;
        if (!reportedPairs.has(pairKey)) {
          reportedPairs.add(pairKey);
          events.push({
            id: `${session.tick}:collision:${left.playerId}:${right.playerId}`,
            type: "collision",
            tick: session.tick,
            playerAId: left.playerId,
            playerBId: right.playerId,
          });
        }
      }
    }
    if (!correctedOverlap) {
      break;
    }
  }
}

function resolveCarouselClaims(
  state: MatchState,
  content: GameContent,
  events: CarouselEvent[],
  sharedPlayers?: PlayerState[],
): void {
  const session = state.carouselSession;
  if (!session) {
    return;
  }
  const claimDistance = CAROUSEL_BOAT_RADIUS + CAROUSEL_BOUNTY_RADIUS;
  const candidates = session.participants
    .filter(
      (participant) =>
        session.tick >= participant.releaseTick &&
        participant.claimedChoiceId === null,
    )
    .flatMap((participant) =>
      state.carouselChoices
        .filter((choice) => choice.takenByPlayerId === null)
        .map((choice) => ({
          participant,
          choice,
          distance: Math.hypot(
            participant.position.x -
              getCarouselChoicePosition(state, choice).x,
            participant.position.y -
              getCarouselChoicePosition(state, choice).y,
          ),
        })),
    )
    .filter((candidate) => candidate.distance <= claimDistance)
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.participant.playerId.localeCompare(right.participant.playerId) ||
        left.choice.id.localeCompare(right.choice.id),
    );
  for (const candidate of candidates) {
    if (
      candidate.participant.claimedChoiceId !== null ||
      candidate.choice.takenByPlayerId !== null
    ) {
      continue;
    }
    const existingPlayer = findPlayer(state, candidate.participant.playerId);
    if (!existingPlayer?.alive) {
      continue;
    }
    const player = mutableCarouselPlayer(
      state,
      candidate.participant.playerId,
      sharedPlayers,
    );
    if (!player) continue;
    grantCarouselChoice(
      player,
      candidate.choice,
      session.tick,
      candidate.participant,
    );
    events.push({
      id: `${session.tick}:claim:${player.id}:${candidate.choice.id}`,
      type: "claim",
      tick: session.tick,
      playerId: player.id,
      choiceId: candidate.choice.id,
      itemId: candidate.choice.itemId,
    });
    if (player.isBot) {
      candidate.participant.targetPosition = {
        ...candidate.participant.spawnPosition,
      };
    }
  }
  if (allCarouselParticipantsClaimed(state) && session.finishAtTick === null) {
    session.finishAtTick = session.tick + CAROUSEL_PICKUP_HOLD_TICKS;
  }
}

function autoAssignRemainingCarouselChoices(
  state: MatchState,
  content: GameContent,
  events?: CarouselEvent[],
  sharedPlayers?: PlayerState[],
): void {
  const session = state.carouselSession;
  const tick = session?.tick ?? 0;
  const assignedPlayerIds: string[] = [];
  for (const draftPlayer of carouselDraftOrder(state)) {
    if (alreadyDrafted(state, draftPlayer.id)) {
      continue;
    }
    const choice = bestCarouselChoice(state, draftPlayer, content);
    if (!choice) {
      continue;
    }
    const player = mutableCarouselPlayer(
      state,
      draftPlayer.id,
      sharedPlayers,
    );
    if (!player) continue;
    const participant = session?.participants.find(
      (candidate) => candidate.playerId === player.id,
    );
    grantCarouselChoice(player, choice, tick, participant);
    assignedPlayerIds.push(player.id);
    events?.push({
      id: `${tick}:claim:${player.id}:${choice.id}`,
      type: "claim",
      tick,
      playerId: player.id,
      choiceId: choice.id,
      itemId: choice.itemId,
    });
  }
  if (assignedPlayerIds.length > 0) {
    events?.push({
      id: `${tick}:timeout`,
      type: "timeout",
      tick,
      playerIds: assignedPlayerIds,
    });
  }
}

export function advanceCarousel(
  state: MatchState,
  ticks = 1,
  content: GameContent = DEFAULT_CONTENT,
): MatchState {
  if (state.phase !== "carousel" || !state.carouselSession) {
    return state;
  }
  const sharedPlayers = state.players;
  const next = createCarouselTickState(state);
  const session = next.carouselSession;
  if (!session) {
    return next;
  }
  const events: CarouselEvent[] = [...session.events];
  const requestedTicks = Math.max(0, Math.floor(ticks));
  for (let step = 0; step < requestedTicks; step += 1) {
    session.tick += 1;
    for (const participant of session.participants) {
      if (participant.releaseTick === session.tick) {
        events.push({
          id: `${session.tick}:release:${participant.playerId}`,
          type: "release",
          tick: session.tick,
          playerId: participant.playerId,
        });
      }
      if (session.tick < participant.releaseTick) {
        participant.moving = false;
        continue;
      }
      updateCarouselBotTarget(next, content, participant);
      const movement = moveCarouselParticipant(participant);
      if (movement) {
        events.push({
          id: `${session.tick}:move:${participant.playerId}`,
          type: "move",
          tick: session.tick,
          playerId: participant.playerId,
          ...movement,
        });
      }
    }
    resolveCarouselBoatCollisions(session, events);
    resolveCarouselClaims(next, content, events, sharedPlayers);

    if (session.tick >= session.durationTicks && session.finishAtTick === null) {
      autoAssignRemainingCarouselChoices(next, content, events, sharedPlayers);
      session.finishAtTick = session.tick + CAROUSEL_PICKUP_HOLD_TICKS;
    }
    if (session.finishAtTick !== null && session.tick >= session.finishAtTick) {
      events.push({
        id: `${session.tick}:complete`,
        type: "complete",
        tick: session.tick,
      });
      return enterPreparationAfterCarousel(next);
    }
  }
  session.events = events.slice(-CAROUSEL_EVENT_LOG_LIMIT);
  return next;
}

export function resolveLegacyCarousel(
  state: MatchState,
  content: GameContent = DEFAULT_CONTENT,
): MatchState {
  const next = cloneMatch(state);
  autoAssignRemainingCarouselChoices(next, content);
  return enterPreparationAfterCarousel(next);
}

function finishCarouselImmediately(
  state: MatchState,
  content: GameContent,
  sharedPlayers?: PlayerState[],
): MatchState {
  autoAssignRemainingCarouselChoices(state, content, undefined, sharedPlayers);
  const complete = carouselDraftOrder(state).every((player) =>
    alreadyDrafted(state, player.id),
  );
  if (!complete) {
    return state;
  }
  return enterPreparationAfterCarousel(state);
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
  state.carouselSession = null;
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
      refillEmptyShopSlots(state, player, content);
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

interface BotThreatContext {
  positions: Position[];
  lineThreats: number;
  adjacentThreats: number;
}

function lastLivingOpponent(
  state: MatchState,
  player: PlayerState,
): PlayerState | null {
  for (const opponentId of [...(player.lastOpponents ?? [])].reverse()) {
    const opponent = findPlayer(state, opponentId);
    if (opponent?.alive && opponent.id !== player.id) {
      return opponent;
    }
  }
  return null;
}

function botThreatContext(
  state: MatchState,
  player: PlayerState,
  content: GameContent,
): BotThreatContext {
  const opponent = lastLivingOpponent(state, player);
  if (!opponent) {
    return {
      positions: [],
      lineThreats: 0,
      adjacentThreats: 0,
    };
  }
  let lineThreats = 0;
  let adjacentThreats = 0;
  const positions = Object.entries(opponent.board)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([key, unitId]) => {
      const unit = opponent.units[unitId];
      const definition = unit
        ? getUnitDefinition(unit.definitionId, content)
        : null;
      if (!definition) {
        return [];
      }
      if (definition.ability.pattern === "line") {
        lineThreats += 1;
      } else if (definition.ability.pattern === "adjacent") {
        adjacentThreats += 1;
      }
      const position = parseCell(key);
      return [
        {
          x: content.config.boardWidth - 1 - position.x,
          y: content.config.boardHeight - 1 - position.y,
        },
      ];
    });
  return { positions, lineThreats, adjacentThreats };
}

function formationRowScore(
  band: BotFormationBand,
  position: Position,
  content: GameContent,
): number {
  const frontRow =
    content.config.boardHeight - content.config.deployRows;
  const backRow = content.config.boardHeight - 1;
  const middleRow = Math.round((frontRow + backRow) / 2);
  switch (band) {
    case "backline":
      return 700 - Math.abs(position.y - backRow) * 320;
    case "frontline":
      return 700 - Math.abs(position.y - frontRow) * 320;
    case "flex":
      return (
        650 -
        Math.min(
          Math.abs(position.y - frontRow),
          Math.abs(position.y - middleRow),
        ) *
          300 +
        (position.y === middleRow ? 20 : 0)
      );
    case "middle":
      return 620 - Math.abs(position.y - middleRow) * 300;
  }
}

function alignedForLine(left: Position, right: Position): boolean {
  const deltaX = Math.abs(left.x - right.x);
  const deltaY = Math.abs(left.y - right.y);
  return (
    left.x === right.x ||
    left.y === right.y ||
    (deltaX > 0 && deltaX === deltaY)
  );
}

function botCellScore(
  player: PlayerState,
  personality: BotPersonality,
  band: BotFormationBand,
  position: Position,
  placed: BotFormationPlacement[],
  threat: BotThreatContext,
  cornerX: number,
  content: GameContent,
): number {
  const frontRow =
    content.config.boardHeight - content.config.deployRows;
  let score = formationRowScore(band, position, content);

  if (personality.formation === "corner") {
    score += 180 - Math.abs(position.x - cornerX) * 34;
  } else if (personality.formation === "frontline") {
    score += 100 - Math.abs(position.y - frontRow) * 38;
  } else if (placed.length > 0) {
    const nearestDistance = Math.min(
      ...placed.map(
        (placement) =>
          Math.abs(placement.position.x - position.x) +
          Math.abs(placement.position.y - position.y),
      ),
    );
    score += nearestDistance * 24;
  }

  const adjacentWeight = Math.min(2, threat.adjacentThreats);
  const lineWeight = Math.min(2, threat.lineThreats);
  for (const placement of placed) {
    const other = placement.position;
    const chebyshevDistance = Math.max(
      Math.abs(other.x - position.x),
      Math.abs(other.y - position.y),
    );
    if (adjacentWeight > 0) {
      if (chebyshevDistance <= 1) {
        score -= 180 * adjacentWeight;
      } else if (chebyshevDistance === 2) {
        score -= 25 * adjacentWeight;
      }
    }
    if (lineWeight > 0 && alignedForLine(other, position)) {
      score -= 70 * lineWeight;
    }
  }

  if (lineWeight > 0) {
    for (const enemy of threat.positions) {
      if (enemy.x === position.x) {
        score -= 35 * lineWeight;
      }
    }
  }

  if (band === "frontline" || band === "flex") {
    const protectedBackliners = placed.filter((placement) => {
      const unit = player.units[placement.unitId];
      return unit ? botFormationBand(unit, content) === "backline" : false;
    });
    const backlinerPositions =
      protectedBackliners.length > 0
        ? protectedBackliners.map((placement) => placement.position)
        : placed.map((placement) => placement.position);
    for (const backliner of backlinerPositions) {
      score += Math.max(0, 72 - Math.abs(position.x - backliner.x) * 18);
    }
    for (const enemy of threat.positions) {
      score += Math.max(0, 36 - Math.abs(position.x - enemy.x) * 9);
    }
  }

  return score;
}

/**
 * Produces a complete deterministic deployment plan without mutating state or
 * consuming pairing/shop RNG. Only the bot's most recent still-living
 * opponent is used as scouting context; current/future pairings are ignored.
 */
export function planBotFormation(
  state: MatchState,
  playerId: string,
  content: GameContent = DEFAULT_CONTENT,
): BotFormationPlacement[] {
  const player = findPlayer(state, playerId);
  if (!player?.isBot || !player.alive) {
    return [];
  }
  const personality = botPersonality(player, content);
  const desired = desiredBotUnits(player, personality, content)
    .map((unit) => ({
      unit,
      band: botFormationBand(unit, content),
      score: botInstanceScore(unit, player, personality, content),
    }))
    .sort((left, right) => {
      const order: Record<BotFormationBand, number> = {
        backline: 0,
        frontline: 1,
        flex: 2,
        middle: 3,
      };
      return (
        order[left.band] - order[right.band] ||
        right.score - left.score ||
        left.unit.id.localeCompare(right.unit.id)
      );
    });
  const firstDeployRow =
    content.config.boardHeight - content.config.deployRows;
  const cells = Array.from(
    { length: content.config.deployRows },
    (_, rowOffset) => firstDeployRow + rowOffset,
  ).flatMap((y) =>
    Array.from({ length: content.config.boardWidth }, (_, x) => ({ x, y })),
  );
  const cornerX =
    (hashSeed(`${state.seed}:${player.id}:r${state.round}:corner`) & 1) === 0
      ? 0
      : content.config.boardWidth - 1;
  const threat = botThreatContext(state, player, content);
  const placements: BotFormationPlacement[] = [];

  for (const candidate of desired) {
    const occupied = new Set(
      placements.map((placement) =>
        cellKey(placement.position.x, placement.position.y),
      ),
    );
    const destination = cells
      .filter((position) => !occupied.has(cellKey(position.x, position.y)))
      .map((position) => ({
        position,
        score: botCellScore(
          player,
          personality,
          candidate.band,
          position,
          placements,
          threat,
          cornerX,
          content,
        ),
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.position.y - right.position.y ||
          left.position.x - right.position.x,
      )[0]?.position;
    if (destination) {
      placements.push({
        unitId: candidate.unit.id,
        position: { ...destination },
      });
    }
  }
  return placements;
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
        { type: "SELL_UNIT", unitId: replacement.unit.id },
        { actorPlayerId: playerId },
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
        shopIndex: offer.shopIndex,
      },
      { actorPlayerId: playerId },
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
  const plan = planBotFormation(next, playerId, content);
  const desiredIds = new Set(plan.map((placement) => placement.unitId));

  // First make the selected lineup legal. A benched desired unit swaps with a
  // deployed non-selected unit when the board is capped, so every transition
  // still travels through MOVE_UNIT rather than mutating board records.
  for (const placement of plan) {
    player = findPlayer(next, playerId);
    if (!player || locateUnit(player, placement.unitId)?.zone === "board") {
      continue;
    }
    const replaceable = Object.entries(player.board)
      .filter(([, deployedId]) => !desiredIds.has(deployedId))
      .sort(([left], [right]) => left.localeCompare(right))[0];
    const emptyPlannedCell = plan
      .map((candidate) => candidate.position)
      .find(
        (position) => !player!.board[cellKey(position.x, position.y)],
      );
    const destination = replaceable
      ? parseCell(replaceable[0])
      : boardUnitCount(player) < player.level
        ? emptyPlannedCell
        : undefined;
    if (!destination) {
      continue;
    }
    const result = applyCommand(
      next,
      {
        type: "MOVE_UNIT",
        unitId: placement.unitId,
        to: { zone: "board", x: destination.x, y: destination.y },
      },
      { actorPlayerId: playerId },
      content,
    );
    if (result.ok) {
      next = result.state;
    }
  }

  // With the desired lineup deployed, MOVE_UNIT swaps resolve arbitrary
  // position cycles while preserving the board cap and bench invariants.
  for (const placement of plan) {
    player = findPlayer(next, playerId);
    const location = player
      ? locateUnit(player, placement.unitId)
      : null;
    if (
      !player ||
      (location?.zone === "board" &&
        location.x === placement.position.x &&
        location.y === placement.position.y)
    ) {
      continue;
    }
    const result = applyCommand(
      next,
      {
        type: "MOVE_UNIT",
        unitId: placement.unitId,
        to: {
          zone: "board",
          x: placement.position.x,
          y: placement.position.y,
        },
      },
      { actorPlayerId: playerId },
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
  const compatibility = scoreItemForUnit(
    itemId,
    unit,
    definition,
    content,
  );
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
        unitId: selected.unitId,
        itemId: selected.itemId,
      },
      { actorPlayerId: playerId },
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
      { type: "BUY_XP" },
      { actorPlayerId: playerId },
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
      { type: "REROLL_SHOP" },
      { actorPlayerId: playerId },
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
    { type: "END_PREPARATION" },
    { actorPlayerId: playerId },
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
  const sharedPlayers = state.players;
  const next = createCarouselTickState(state);
  return finishCarouselImmediately(next, content, sharedPlayers);
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
  context: CommandContext,
): PlayerState | null {
  return findPlayer(state, context.actorPlayerId);
}

function commandAllowedInPhase(
  commandType: GameCommand["type"],
  phase: MatchPhase,
): boolean {
  switch (commandType) {
    case "BUY_UNIT":
    case "REROLL_SHOP":
    case "TOGGLE_SHOP_LOCK":
    case "BUY_XP":
    case "MOVE_UNIT":
    case "SELL_UNIT":
      return phase === "preparation" || phase === "battle";
    case "EQUIP_ITEM":
    case "END_PREPARATION":
      return phase === "preparation";
    default:
      return true;
  }
}

export function applyCommand(
  state: MatchState,
  command: GameCommand,
  context: CommandContext,
  content: GameContent = DEFAULT_CONTENT,
): CommandResult {
  if (command.type === "TIMER_EXPIRED") {
    return { ok: true, state: advanceMatchPhase(state, content) };
  }

  if (!commandAllowedInPhase(command.type, state.phase)) {
    return commandFailure(
      state,
      "WRONG_PHASE",
      "That action is not available during this phase.",
    );
  }
  if (command.type === "CHOOSE_ITEM" && state.phase !== "item-choice") {
    return commandFailure(
      state,
      "WRONG_PHASE",
      "There is no item choice right now.",
    );
  }
  if (
    command.type === "CAROUSEL_SET_TARGET" &&
    state.phase !== "carousel"
  ) {
    return commandFailure(
      state,
      "WRONG_PHASE",
      "There is no carousel right now.",
    );
  }

  const currentPlayer = validatePlanningPlayer(state, context);
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

  let next =
    command.type === "CAROUSEL_SET_TARGET" && state.carouselSession
      ? createCarouselSteeringState(state, context.actorPlayerId)
      : cloneMatch(state);
  const player = findPlayer(next, context.actorPlayerId);
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
      const source = locateUnit(player, command.unitId);
      const destination = normalizeDestination(command.to);
      if (
        next.phase === "battle" &&
        (source?.zone === "board" || destination.zone === "board")
      ) {
        return commandFailure(
          state,
          "WRONG_PHASE",
          "The fighting board cannot be rearranged during combat.",
        );
      }
      const error = moveUnit(player, command.unitId, command.to, content);
      return error
        ? { ok: false, state, error }
        : { ok: true, state: next };
    }
    case "SELL_UNIT": {
      if (
        next.phase === "battle" &&
        locateUnit(player, command.unitId)?.zone === "board"
      ) {
        return commandFailure(
          state,
          "WRONG_PHASE",
          "Units fighting on the board cannot be sold during combat.",
        );
      }
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
      reconcileProductionFormProgression(unit, content);
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
    case "CAROUSEL_SET_TARGET": {
      const session = next.carouselSession;
      const participant = session?.participants.find(
        (candidate) => candidate.playerId === player.id,
      );
      if (!session || !participant) {
        return commandFailure(
          state,
          "CAROUSEL_NOT_READY",
          "The bounty regatta is not ready.",
        );
      }
      if (player.isBot) {
        return commandFailure(
          state,
          "BOT_CONTROLLED",
          "Bot boats steer themselves.",
        );
      }
      if (session.tick < participant.releaseTick) {
        return commandFailure(
          state,
          "CAROUSEL_LOCKED",
          "Your boat has not been released yet.",
        );
      }
      if (participant.claimedChoiceId !== null) {
        return commandFailure(
          state,
          "CAROUSEL_ALREADY_CLAIMED",
          "Your boat already carries a bounty.",
        );
      }
      if (!Number.isFinite(command.x) || !Number.isFinite(command.y)) {
        return commandFailure(
          state,
          "INVALID_CAROUSEL_TARGET",
          "The sailing target must use finite coordinates.",
        );
      }
      participant.targetPosition = clampCarouselPosition({
        x: command.x,
        y: command.y,
      });
      participant.moving =
        Math.hypot(
          participant.targetPosition.x - participant.position.x,
          participant.targetPosition.y - participant.position.y,
        ) > 0.001;
      return { ok: true, state: next };
    }
  }
}
