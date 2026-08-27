import type {
  CarouselChoice,
  MatchState,
  PlayerState,
  Position,
} from "./types";

export const CAROUSEL_TICK_MS = 50;
export const CAROUSEL_ARENA_WIDTH = 1520;
export const CAROUSEL_ARENA_HEIGHT = 840;
export const CAROUSEL_BOAT_RADIUS = 34;
export const CAROUSEL_BOUNTY_RADIUS = 30;
export const CAROUSEL_ORBIT_RADIUS_X = 260;
export const CAROUSEL_ORBIT_RADIUS_Y = 190;
export const CAROUSEL_ORBIT_RADIANS_PER_TICK = 0.02;

const CAROUSEL_CENTER: Position = {
  x: CAROUSEL_ARENA_WIDTH / 2,
  y: CAROUSEL_ARENA_HEIGHT / 2,
};

function roundCarouselCoordinate(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export function clampCarouselPosition(position: Position): Position {
  return {
    x: roundCarouselCoordinate(
      Math.max(
        CAROUSEL_BOAT_RADIUS,
        Math.min(CAROUSEL_ARENA_WIDTH - CAROUSEL_BOAT_RADIUS, position.x),
      ),
    ),
    y: roundCarouselCoordinate(
      Math.max(
        CAROUSEL_BOAT_RADIUS,
        Math.min(CAROUSEL_ARENA_HEIGHT - CAROUSEL_BOAT_RADIUS, position.y),
      ),
    ),
  };
}

export function getCarouselChoicePosition(
  state: MatchState,
  choice: CarouselChoice,
  tick = state.carouselSession?.tick ?? 0,
): Position {
  const choiceCount = Math.max(1, state.carouselChoices.length);
  const angle =
    (choice.orbitIndex / choiceCount) * Math.PI * 2 +
    tick * CAROUSEL_ORBIT_RADIANS_PER_TICK;
  return {
    x: roundCarouselCoordinate(
      CAROUSEL_CENTER.x + Math.cos(angle) * CAROUSEL_ORBIT_RADIUS_X,
    ),
    y: roundCarouselCoordinate(
      CAROUSEL_CENTER.y + Math.sin(angle) * CAROUSEL_ORBIT_RADIUS_Y,
    ),
  };
}

export function createCarouselTickState(state: MatchState): MatchState {
  if (!state.carouselSession) return state;
  return {
    ...state,
    carouselChoices: state.carouselChoices.map((choice) => ({ ...choice })),
    carouselSession: {
      ...state.carouselSession,
      participants: state.carouselSession.participants.map((participant) => ({
        ...participant,
        spawnPosition: { ...participant.spawnPosition },
        position: { ...participant.position },
        targetPosition: { ...participant.targetPosition },
      })),
      events: [...state.carouselSession.events],
    },
  };
}

export function createCarouselSteeringState(
  state: MatchState,
  actorPlayerId: string,
): MatchState {
  if (!state.carouselSession) return state;
  return {
    ...state,
    carouselSession: {
      ...state.carouselSession,
      participants: state.carouselSession.participants.map((participant) =>
        participant.playerId === actorPlayerId
          ? { ...participant, targetPosition: { ...participant.targetPosition } }
          : participant,
      ),
    },
  };
}

export function mutableCarouselPlayer(
  state: MatchState,
  playerId: string,
  sharedPlayers?: PlayerState[],
): PlayerState | null {
  const playerIndex = state.players.findIndex((player) => player.id === playerId);
  if (playerIndex < 0) return null;
  if (sharedPlayers && state.players === sharedPlayers) {
    state.players = [...sharedPlayers];
  }
  if (sharedPlayers && state.players[playerIndex] === sharedPlayers[playerIndex]) {
    const current = state.players[playerIndex];
    state.players[playerIndex] = {
      ...current,
      inventory: [...current.inventory],
    };
  }
  return state.players[playerIndex];
}
