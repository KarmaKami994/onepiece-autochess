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

export function prepareVoyageRecruitOffers(
  state: MatchState,
  content: GameContent,
): void {
  const cost = getStageDefinition(state.round, content).voyageRecruitCost;
  if (!cost) return;
  state.phase = "voyage-choice";
  if (Object.keys(state.pendingVoyageRecruitOffers).length > 0) return;
  for (const player of state.players.filter((candidate) => candidate.alive)) {
    const ownedTraits = new Set(Object.values(player.units).flatMap((unit) =>
      getEffectiveUnitTraits(unit, content)
    ));
    const selected: string[] = [];
    for (const band of [cost, cost - 1]) {
      if (selected.length >= 3) break;
      const candidates = availableCandidates(state, content, band, new Set(selected));
      const relevant = candidates.filter((unit) => unit.traits.some((trait) => ownedTraits.has(trait)));
      const others = candidates.filter((unit) => !relevant.includes(unit));
      const first = shuffleDeterministic(relevant, state.rngState);
      const second = shuffleDeterministic(others, first.state);
      state.rngState = second.state;
      for (const unit of [...first.values, ...second.values]) {
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
  if (!offers?.includes(definitionId)) return false;
  for (const unselected of offers.filter((id) => id !== definitionId)) {
    state.pool[unselected] = (state.pool[unselected] ?? 0) + 1;
  }
  if (!addUnitToPlayer(state, player, definitionId, content)) {
    state.pool[definitionId] = (state.pool[definitionId] ?? 0) + 1;
    player.gold += getUnitDefinition(definitionId, content)?.cost ?? 0;
  }
  delete state.pendingVoyageRecruitOffers[player.id];
  return true;
}
