import type { GameCommand } from "../../game/types";
import type { MatchView, StandingView } from "../selectors";

export const LOCAL_MATCH_ROOM = "mp1";
export const FRIENDS_MATCH_ROOM = "friends";
export const LOCAL_MATCH_PATH = "/mp1-socket";
export const LOCAL_SEATS = 2;

export type LocalMatchCommand = Extract<GameCommand, { type:
  "BUY_UNIT" | "MOVE_UNIT" | "SELL_UNIT" | "REROLL_SHOP" | "TOGGLE_SHOP_LOCK" |
  "BUY_XP" | "EQUIP_ITEM" | "USE_FOOD" | "END_PREPARATION"
}>;

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
