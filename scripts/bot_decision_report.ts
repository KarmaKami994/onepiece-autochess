import type { BotTurnDiagnostic } from "../game/engine";
import type { BotItemDecision, BotOfferDecision } from "../game/botDecisionDiagnostics";

type OfferBucket = { offers: number; purchased: number; reserveChecks: number; reserveExceptions: number; unaffordableAfterEarlierPurchases: number; receivingBlocked: number; outcomes: Record<string, number> };
const bucket = (): OfferBucket => ({ offers: 0, purchased: 0, reserveChecks: 0, reserveExceptions: 0, unaffordableAfterEarlierPurchases: 0, receivingBlocked: 0, outcomes: {} });
const increment = (counts: Record<string, number>, key: string, amount = 1) => { counts[key] = (counts[key] ?? 0) + amount; };
type Example<T> = { seed: string; round: number; playerId: string; personalityId: string; decision: T };
export type BotDecisionDiagnosticsReport = {
  diagnosticVersion: 2; offers: OfferBucket; byCost: Record<string, OfferBucket>; byPersonality: Record<string, OfferBucket>; byRoundBucket: Record<string, OfferBucket>; byPass: Record<string, OfferBucket>;
  items: { decisions: number; outcomes: Record<string, number>; blockedCandidateReasons: Record<string, number>; crafts: number; craftReturnsToInventory: number; formUnlocks: Record<string, number> };
  merges: { consumedInstances: number; returnedItems: number; formUnlocks: Record<string, number> };
  offerExamples: Record<string, Example<BotOfferDecision>[]>; itemExamples: Record<string, Example<BotItemDecision>[]>; mergeExamples: Example<BotOfferDecision>[];
};
function addOffer(target: OfferBucket, decision: BotOfferDecision) {
  target.offers += 1; increment(target.outcomes, decision.outcome);
  if (decision.outcome === "purchased") target.purchased += 1;
  if (decision.reservePassed !== null) target.reserveChecks += 1;
  if (decision.outcome === "purchased" && decision.reservePassed === false) target.reserveExceptions += 1;
  if (decision.outcome === "unaffordable" && decision.cost !== null && decision.goldAtPassStart >= decision.cost && decision.earlierPurchases.length > 0) target.unaffordableAfterEarlierPurchases += 1;
  if (decision.receiving === "blocked") target.receivingBlocked += 1;
}
export function summarizeBotDecisionDiagnostics(diagnostics: readonly BotTurnDiagnostic[]): BotDecisionDiagnosticsReport {
  const report: BotDecisionDiagnosticsReport = { diagnosticVersion: 2, offers: bucket(), byCost: {}, byPersonality: {}, byRoundBucket: {}, byPass: {}, items: { decisions: 0, outcomes: {}, blockedCandidateReasons: {}, crafts: 0, craftReturnsToInventory: 0, formUnlocks: {} }, merges: { consumedInstances: 0, returnedItems: 0, formUnlocks: {} }, offerExamples: {}, itemExamples: {}, mergeExamples: [] };
  for (const diagnostic of diagnostics) {
    const context = { seed: diagnostic.seed, round: diagnostic.round, playerId: diagnostic.playerId, personalityId: diagnostic.personalityId };
    for (const decision of diagnostic.offerDecisions) {
      for (const target of [report.offers, report.byCost[String(decision.cost)] ??= bucket(), report.byPersonality[diagnostic.personalityId] ??= bucket(), report.byRoundBucket[String(Math.floor(diagnostic.round / 10) * 10)] ??= bucket(), report.byPass[decision.source] ??= bucket()]) addOffer(target, decision);
      const key = `${decision.cost}:${decision.outcome}`;
      const examples = report.offerExamples[key] ??= []; if (examples.length < 3) examples.push({ ...context, decision });
      const receipt = decision.receipt;
      if (receipt) {
        const consumed = Math.max(0, receipt.before.length + 1 - receipt.after.length);
        report.merges.consumedInstances += consumed;
        report.merges.returnedItems += Math.max(0, receipt.inventoryAfter.length - receipt.inventoryBefore.length);
        for (const unit of receipt.after) if (unit.formId && !receipt.before.some((before) => before.id === unit.id && before.formId === unit.formId)) increment(report.merges.formUnlocks, unit.formId);
        if (consumed > 0 && report.mergeExamples.length < 6) report.mergeExamples.push({ ...context, decision });
      }
    }
    for (const decision of diagnostic.itemDecisions) {
      report.items.decisions += 1; increment(report.items.outcomes, decision.outcome);
      for (const [reason, count] of Object.entries(decision.blockReasons)) increment(report.items.blockedCandidateReasons, reason, count);
      if (decision.outcome === "equipped") {
        if (decision.selected?.recipeResultId) report.items.crafts += 1;
        if (decision.selected?.craftReturnsToInventory) report.items.craftReturnsToInventory += 1;
        if (decision.after?.formId && decision.after.formId !== decision.before?.formId) increment(report.items.formUnlocks, decision.after.formId);
      }
      const key = decision.outcome;
      const examples = report.itemExamples[key] ??= []; if (examples.length < 3) examples.push({ ...context, decision });
    }
  }
  return report;
}
