import { getStageDefinition, getUnitDefinition } from "./content";
import { shuffleDeterministic } from "./rng";
import { addUnitToPlayer } from "./roster";
import { getEffectiveUnitTraits } from "./traits";
import type { GameContent, MatchState, PlayerState, UnitDefinition } from "./types";

function availableCandidates(
  state: MatchState,
  content: GameContent,
  cost: number,
  excluded: ReadonlySet<string>,
): UnitDefinition[] {
  return content.units
    .filter((unit) => unit.cost === cost && (state.pool[unit.id] ?? 0) > 0 && !excluded.has(unit.id))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function prepareStarterOffers(state: MatchState, content: GameContent): void {
  if (state.round !== 1 || state.voyageChoiceHistory.some(receipt => receipt.kind === "starter")) return;
  state.phase = "starter-choice";
  if (Object.keys(state.pendingVoyageRecruitOffers).length) return;
  for (const player of state.players.filter(candidate => candidate.alive)) {
    const shuffled = shuffleDeterministic(availableCandidates(state, content, 1, new Set()), state.rngState);
    state.rngState = shuffled.state;
    const offers = shuffled.values.slice(0, 3).map(unit => unit.id);
    for (const id of offers) state.pool[id] -= 1;
    state.pendingVoyageRecruitOffers[player.id] = offers;
  }
}

export function prepareVoyageRecruitOffers(
  state: MatchState,
  content: GameContent,
): void {
  const cost = getStageDefinition(state.round, content).voyageRecruitCost;
  if (!cost) return;
  if (state.voyageChoiceHistory.some(receipt => receipt.kind === "recruitment" && receipt.round === state.round)) return;
  state.phase = "voyage-choice";
  if (Object.keys(state.pendingVoyageRecruitOffers).length > 0) return;
  for (const player of state.players.filter((candidate) => candidate.alive)) {
    const ownedTraits = new Set(Object.values(player.units).flatMap((unit) =>
      getEffectiveUnitTraits(unit, content)
    ));
    const routeScore = (traits: string[]) => new Set(Object.values(player.units)
      .filter(unit => getEffectiveUnitTraits(unit, content).some(trait => traits.includes(trait)))
      .map(unit => unit.definitionId)).size;
    const route = [...content.recruitmentRoutes].sort((left, right) =>
      routeScore(right.traits) - routeScore(left.traits) || left.id.localeCompare(right.id))[0];
    if (route) state.pendingRecruitmentRoutes[player.id] = route.id;
    const selected: string[] = [];
    for (const band of [cost, cost - 1]) {
      if (selected.length >= 3) break;
      const candidates = availableCandidates(state, content, band, new Set(selected));
      const focused = candidates.filter(unit => route?.unitIds.includes(unit.id));
      const relevant = focused.filter((unit) => unit.traits.some((trait) => ownedTraits.has(trait)));
      const others = focused.filter((unit) => !relevant.includes(unit));
      const first = shuffleDeterministic(relevant, state.rngState);
      const second = shuffleDeterministic(others, first.state);
      state.rngState = second.state;
      for (const unit of [...first.values, ...second.values]) {
        if (selected.length >= 2) break;
        selected.push(unit.id);
        state.pool[unit.id] -= 1;
      }
      const wildcard = shuffleDeterministic(availableCandidates(state, content, band, new Set(selected)), state.rngState);
      state.rngState = wildcard.state;
      for (const unit of wildcard.values) {
        if (selected.length >= 3) break;
        selected.push(unit.id);
        state.pool[unit.id] -= 1;
      }
    }
    state.pendingVoyageRecruitOffers[player.id] = selected;
  }
}

export function resolveVoyageRecruit(
  state: MatchState,
  player: PlayerState,
  definitionId: string,
  content: GameContent,
): boolean {
  const offers = state.pendingVoyageRecruitOffers[player.id];
  const definition = getUnitDefinition(definitionId, content);
  const routeId = state.pendingRecruitmentRoutes[player.id];
  const price = state.phase === "starter-choice" ? definition?.cost ?? 0 : 0;
  if (!offers?.includes(definitionId) || !definition || player.gold < price) return false;
  player.gold -= price;
  for (const unselected of offers.filter((id) => id !== definitionId)) {
    state.pool[unselected] = (state.pool[unselected] ?? 0) + 1;
  }
  const received = addUnitToPlayer(state, player, definitionId, content);
  if (!received) {
    state.pool[definitionId] = (state.pool[definitionId] ?? 0) + 1;
    player.gold += getUnitDefinition(definitionId, content)?.cost ?? 0;
  }
  delete state.pendingVoyageRecruitOffers[player.id];
  delete state.pendingRecruitmentRoutes[player.id];
  state.voyageChoiceHistory.push({ round: state.round, playerId: player.id,
    kind: state.phase === "starter-choice" ? "starter" : "recruitment", choiceId: definitionId,
    paidGold: price, convertedGold: received ? 0 : definition.cost, skipped: false, definitionId, ...(routeId ? { routeId } : {}) });
  return true;
}

export function skipReservedRecruit(state: MatchState, player: PlayerState): boolean {
  const offers = state.pendingVoyageRecruitOffers[player.id];
  if (!offers) return false;
  for (const id of offers) state.pool[id] = (state.pool[id] ?? 0) + 1;
  delete state.pendingVoyageRecruitOffers[player.id];
  delete state.pendingRecruitmentRoutes[player.id];
  state.voyageChoiceHistory.push({ round: state.round, playerId: player.id,
    kind: state.phase === "starter-choice" ? "starter" : "recruitment", choiceId: "skip",
    paidGold: 0, convertedGold: 0, skipped: true });
  return true;
}
