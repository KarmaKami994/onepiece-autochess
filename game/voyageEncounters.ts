import { getItemDefinition } from "./content";
import { getAcquirableItems, isComponentItem } from "./items";
import { shuffleDeterministic } from "./rng";
import type { GameContent, MatchState, PlayerState } from "./types";

export function getHarborEncounter(round: number, content: GameContent) {
  return content.harborEncounters.find(encounter => encounter.rounds.includes(round)) ?? null;
}

export function harborDurationSeconds(alivePlayers: number, content: GameContent): number {
  return content.voyageTiming.harborBaseSeconds + Math.max(0, alivePlayers) * content.voyageTiming.harborPerPlayerSeconds;
}

export function prepareHarborOffers(state: MatchState, content: GameContent): void {
  const encounter = getHarborEncounter(state.round, content);
  if (!encounter || state.voyageChoiceHistory.some(receipt => receipt.kind === "harbor" && receipt.round === state.round)) return;
  state.phase = "harbor-choice";
  if (Object.keys(state.pendingHarborOffers).length) return;
  const components = getAcquirableItems(content).filter(isComponentItem).map(item => item.id).sort();
  for (const player of state.players.filter(candidate => candidate.alive)) {
    const shuffled = shuffleDeterministic(components, state.rngState);
    state.rngState = shuffled.state;
    state.pendingHarborOffers[player.id] = shuffled.values.slice(0, encounter.offerCount).map(itemId => ({
      id: `harbor-${state.nextChoiceSerial++}`, itemId, goldCost: encounter.goldCost,
    }));
  }
}

export function resolveHarborOffer(state: MatchState, player: PlayerState, choiceId: string, content: GameContent): boolean {
  const offers = state.pendingHarborOffers[player.id];
  if (!offers) return false;
  const offer = offers.find(candidate => candidate.id === choiceId);
  if (choiceId !== "skip" && (!offer || !getItemDefinition(offer.itemId, content) ||
    !Number.isFinite(offer.goldCost) || offer.goldCost < 0 || player.gold < offer.goldCost)) return false;
  if (offer) {
    player.gold -= offer.goldCost;
    player.inventory.push(offer.itemId);
  }
  state.voyageChoiceHistory.push({ round: state.round, playerId: player.id, kind: "harbor", choiceId,
    paidGold: offer?.goldCost ?? 0, convertedGold: 0, skipped: !offer,
    ...(offer ? { itemId: offer.itemId } : {}), encounterId: getHarborEncounter(state.round, content)?.id });
  delete state.pendingHarborOffers[player.id];
  return true;
}
