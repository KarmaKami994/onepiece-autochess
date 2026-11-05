import type { PlayerState, UnitInstance } from "./types";

export type BotBuySource = "initial-buy-pass" | "post-reroll";
export type BotOfferOutcome = "purchased" | "unknown-definition" | "missing-player" | "unaffordable" | "reserve-policy" | "no-legal-replacement" | "replacement-sale-rejected" | "replacement-capacity-rejected" | "purchase-command-rejected";
export type BotRosterFact = Readonly<Pick<UnitInstance, "id" | "definitionId" | "star" | "formId"> & { items: readonly string[] }>;
export type BotOfferDecision = {
  readonly source: BotBuySource; readonly shopIndex: number; readonly rank: number;
  readonly definitionId: string; readonly cost: number | null; readonly frozenScore: number;
  readonly goldAtPassStart: number; readonly goldAtEvaluation: number | null; readonly level: number | null;
  readonly earlierPurchases: readonly string[];
  /** Null means affordability/content prevented the production reserve expression. */
  reservePassed: boolean | null;
  purchaseRule: "reserve" | "score-exception" | "tutorial-exception" | null;
  receiving: "bench-space" | "merge-capacity" | "blocked" | "not-evaluated";
  outcome: BotOfferOutcome;
  commandError?: string;
  replacementId?: string;
  replacementProtectedStars?: number;
  replacementCandidates?: { unitId: string; cost: number | null; score: number; eligible: boolean }[];
  receipt?: { before: BotRosterFact[]; after: BotRosterFact[]; inventoryBefore: string[]; inventoryAfter: string[] };
};
export type BotItemBlockReason = "unknown-content" | "duplicate-completed" | "slot-cap" | "native-trait" | "incompatible-result";
export type BotItemCandidateDiagnostic = {
  readonly itemId: string; readonly unitId: string; readonly inventoryIndex: number;
  readonly score: number | null; readonly blockReason: BotItemBlockReason | null;
  readonly recipeResultId: string | null; readonly craftReturnsToInventory: boolean;
};
export type BotItemDecision = {
  readonly inventoryBefore: readonly string[]; readonly inventoryAfter: readonly string[];
  readonly eligibleCandidates: number; readonly blockedCandidates: number;
  /** Keys are incoming-item ID + ':' + the actually encountered guard. */
  readonly blockReasons: Readonly<Record<string, number>>;
  readonly topCandidates: readonly BotItemCandidateDiagnostic[];
  readonly outcome: "equipped" | "command-rejected" | "no-legal-candidate" | "no-carrier";
  readonly selected: BotItemCandidateDiagnostic | null;
  readonly before: BotRosterFact | null; readonly after: BotRosterFact | null;
  readonly commandError?: string;
};

/** Detached reporting facts; never used to choose a command. */
export function botRosterFacts(player: PlayerState, definitionId?: string): BotRosterFact[] {
  return Object.values(player.units).filter((unit) => !definitionId || unit.definitionId === definitionId).map((unit) => ({ id: unit.id, definitionId: unit.definitionId, star: unit.star, ...(unit.formId ? { formId: unit.formId } : {}), items: [...unit.items] }));
}
