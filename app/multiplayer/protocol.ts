import type { GameCommand, MatchPhase } from "../../game/types";
import type { MatchView, StandingView } from "../selectors";

export const LOCAL_MATCH_ROOM = "mp1";
export const FRIENDS_MATCH_ROOM = "friends";
export const LOCAL_MATCH_PATH = "/mp1-socket";
export const LOCAL_SEATS = 2;
export const FRIENDS_ROOM_UPDATE_MS = 100;

export type LocalMatchCommand = Extract<GameCommand, { type:
  "BUY_UNIT" | "MOVE_UNIT" | "SELL_UNIT" | "REROLL_SHOP" | "TOGGLE_SHOP_LOCK" |
  "BUY_XP" | "EQUIP_ITEM" | "USE_FOOD" | "END_PREPARATION"
}>;

export type FriendsCommand = Exclude<GameCommand, { type: "TIMER_EXPIRED" }>;
export type FriendsCommandMessage = { round: number; phase: MatchPhase; command: FriendsCommand };

type RegattaSession = NonNullable<MatchView["carouselSession"]>;
export type FriendsRegattaFrame = Pick<RegattaSession, "tick" | "finishAtTick" | "events"> & {
  round: number;
  boats: Array<Pick<RegattaSession["participants"][number],
    "playerId" | "position" | "targetPosition" | "moving" | "claimedChoiceId">>;
  claims: Array<Pick<MatchView["choices"][number], "id" | "takenByPlayerId" | "claimedAtTick">>;
};

type StandingSnapshot = Omit<StandingView, "selectedDefinitionByUnit"> & {
  selectedDefinitionByUnit: Array<[string, NonNullable<MatchView["shop"][number]>]>;
};

type MatchSnapshot = Omit<MatchView,
  "standings" | "opponent" | "selectedDefinitionByUnit" | "itemsById"
> & {
  standings: StandingSnapshot[];
  opponent: StandingSnapshot | null;
  selectedDefinitionByUnit: Array<[string, NonNullable<MatchView["shop"][number]>]>;
  itemsById: Array<[string, MatchView["inventory"][number]]>;
};

export type LocalMatchSnapshot =
  | { status: "waiting"; captain: number }
  | { status: "lobby"; code: string; host: boolean; captains: string[] }
  | { status: "complete" }
  | {
      status: "playing";
      ready: boolean;
      durationMs: number;
      remainingMs: number;
      view: MatchSnapshot;
    };

function writeStanding(standing: StandingView): StandingSnapshot {
  return { ...standing, selectedDefinitionByUnit: [...standing.selectedDefinitionByUnit] };
}

function readStanding(standing: StandingSnapshot): StandingView {
  return { ...standing, selectedDefinitionByUnit: new Map(standing.selectedDefinitionByUnit) };
}

export function writeMatchView(view: MatchView): MatchSnapshot {
  return {
    ...view,
    standings: view.standings.map(writeStanding),
    opponent: view.opponent && writeStanding(view.opponent),
    selectedDefinitionByUnit: [...view.selectedDefinitionByUnit],
    itemsById: [...view.itemsById],
  };
}

export function readMatchView(view: MatchSnapshot): MatchView {
  return {
    ...view,
    standings: view.standings.map(readStanding),
    opponent: view.opponent && readStanding(view.opponent),
    selectedDefinitionByUnit: new Map(view.selectedDefinitionByUnit),
    itemsById: new Map(view.itemsById),
  };
}

export function applyRegattaFrame(snapshot: LocalMatchSnapshot | null, frame: FriendsRegattaFrame): LocalMatchSnapshot | null {
  if (snapshot?.status !== "playing" || snapshot.view.phase !== "carousel" || snapshot.view.round !== frame.round) return snapshot;
  const session = snapshot.view.carouselSession;
  if (!session || frame.tick < session.tick) return snapshot;
  const boats = new Map(frame.boats.map((boat) => [boat.playerId, boat]));
  const claims = new Map(frame.claims.map((claim) => [claim.id, claim]));
  return {
    ...snapshot,
    view: {
      ...snapshot.view,
      choices: snapshot.view.choices.map((choice) => ({ ...choice, ...claims.get(choice.id) })),
      carouselSession: {
        ...session,
        tick: frame.tick,
        finishAtTick: frame.finishAtTick,
        participants: session.participants.map((boat) => ({ ...boat, ...boats.get(boat.playerId) })),
        events: [...session.events, ...frame.events.filter((event) => event.tick > session.tick)].slice(-256),
      },
    },
  };
}
