import { createMatch, getStageDefinition, hashCanonicalValue, hashGameContent, type GameContent, type MatchState, type PlayerState, type MatchBattleResult, type MatchPhase, type HarborOffer, type VoyageChoiceReceipt } from "../game";

export const REPLAY_FORMAT = "grand-line-voyage-replay";
export const MAX_REPLAY_BYTES = 32 * 1024 * 1024;
export const MAX_ARCHIVE_BYTES = 96 * 1024 * 1024;
export const MAX_ARCHIVE_RECORDS = 10;
export type CollectionFacts = { crewDiscovered: string[]; crewOwned: string[]; crewDeployed: string[]; itemsDiscovered: string[]; itemsOwned: string[]; itemsDeployed: string[]; formsReached: string[] };
export type ReplayFrame = { round: number; phase: MatchPhase; stageId: string; players: PlayerState[]; battles: MatchBattleResult[]; itemOffers: Record<string, string[]>; recruitOffers: Record<string, string[]>; harborOffers?: Record<string, HarborOffer[]>; recruitmentRoutes?: Record<string, string> };
export type VoyageReplay = {
  format: typeof REPLAY_FORMAT; formatVersion: 1; id: string; seed: string; startedAt: number; completedAt: number | null;
  contentVersion: string; contentHash: string; configHash: string; schemaVersion: number; playerId: string;
  fromStart: boolean; frames: ReplayFrame[]; collection: CollectionFacts;
  choiceHistory?: VoyageChoiceReceipt[];
  peaks: { round: number; level: number; gold: number; deployed: number };
};
export type StoredReplay = { id: string; replay: VoyageReplay; origin: "local" | "imported" };
export const emptyCollection = (): CollectionFacts => ({ crewDiscovered: [], crewOwned: [], crewDeployed: [], itemsDiscovered: [], itemsOwned: [], itemsDeployed: [], formsReached: [] });
export function mergeCollection(left: CollectionFacts, right: CollectionFacts): CollectionFacts {
  return Object.fromEntries(Object.keys(left).map((key) => [key, [...new Set([...left[key as keyof CollectionFacts], ...right[key as keyof CollectionFacts]])].sort()])) as CollectionFacts;
}
export function replayCompatible(replay: VoyageReplay, content: GameContent): boolean {
  return replay.schemaVersion === 6 && replay.contentVersion === content.version && replay.contentHash === hashGameContent(content) && replay.configHash === hashCanonicalValue(content.config);
}
export function newVoyageReplay(state: MatchState, content: GameContent, id: string, now: number): VoyageReplay {
  return { format: REPLAY_FORMAT, formatVersion: 1, id, seed: state.seed, startedAt: now, completedAt: null, contentVersion: state.contentVersion,
    contentHash: hashGameContent(content), configHash: hashCanonicalValue(content.config), schemaVersion: state.schemaVersion,
    playerId: state.players.find((player) => !player.isBot)?.id ?? state.players[0].id, fromStart: state.round === 1 && (state.phase === "preparation" || state.phase === "starter-choice"), frames: [], collection: emptyCollection(), peaks: { round: 0, level: 0, gold: 0, deployed: 0 } };
}
export function observeVoyage(replay: VoyageReplay, state: MatchState, now: number): VoyageReplay {
  if (replay.completedAt !== null || replay.seed !== state.seed) return replay;
  const player = state.players.find((entry) => entry.id === replay.playerId);
  if (!player) return replay;
  const own = [...Object.values(player.units), ...player.finalCrew];
  const fighters = state.phase === "battle" ? state.lastResults.flatMap((battle) => battle.initialUnits.filter((unit) => unit.teamId === player.id)) : [];
  const held = [...player.inventory, ...own.flatMap((unit) => unit.items)];
  const facts: CollectionFacts = {
    crewDiscovered: [...own.map((unit) => unit.definitionId), ...player.shop.filter((id): id is string => id !== null), ...(state.pendingVoyageRecruitOffers[player.id] ?? [])],
    crewOwned: own.map((unit) => unit.definitionId), crewDeployed: fighters.map((unit) => unit.definitionId),
    itemsDiscovered: [...held, ...(state.pendingItemChoices[player.id] ?? []), ...(state.pendingHarborOffers[player.id] ?? []).map(offer => offer.itemId), ...state.carouselChoices.map((choice) => choice.itemId)],
    itemsOwned: held, itemsDeployed: fighters.flatMap((unit) => unit.items ?? []),
    formsReached: [...own.flatMap((unit) => unit.formId ? [unit.formId] : []), ...fighters.flatMap((unit) => unit.formId ? [unit.formId] : []),
      ...state.lastResults.flatMap((battle) => battle.events.flatMap((event) => event.type === "unit-transform" && battle.initialUnits.some((unit) => unit.id === event.unitId && unit.teamId === player.id) ? [event.toFormId] : []))],
  };
  const index = replay.frames.findIndex((frame) => frame.round === state.round && frame.phase === state.phase);
  const previous = replay.frames[index];
  const frame: ReplayFrame = { round: state.round, phase: state.phase, stageId: state.stageId, players: structuredClone(state.players),
    battles: state.phase === "battle" ? previous?.battles ?? structuredClone(state.lastResults) : [], itemOffers: structuredClone(state.pendingItemChoices), recruitOffers: structuredClone(state.pendingVoyageRecruitOffers), harborOffers: structuredClone(state.pendingHarborOffers), recruitmentRoutes: structuredClone(state.pendingRecruitmentRoutes) };
  const frames = [...replay.frames];
  if (index < 0) frames.push(frame); else frames[index] = frame;
  const peaks = { round: Math.max(replay.peaks.round, player.alive || replay.peaks.round === 0 ? state.round : 0), level: Math.max(replay.peaks.level, player.level), gold: Math.max(replay.peaks.gold, player.gold), deployed: Math.max(replay.peaks.deployed, fighters.length, Object.keys(player.board).length) };
  return { ...replay, frames, peaks, choiceHistory: structuredClone(state.voyageChoiceHistory), collection: mergeCollection(replay.collection, facts), completedAt: state.phase === "game-over" || (!player.alive && player.placement !== null) ? now : null };
}

/** Disposable read-only adapter. No recorded data enters the active session. */
export function replayFrameState(replay: VoyageReplay, frame: ReplayFrame, content: GameContent): MatchState {
  if (!replayCompatible(replay, content)) throw new Error("Replay content/config/schema differs from this build. Export or delete it; playback is disabled.");
  return { ...createMatch("replay-view-only", content), seed: replay.seed, round: frame.round, phase: frame.phase, stageId: frame.stageId,
    players: frame.players, winnerId: frame.players.find((player) => player.placement === 1)?.id ?? null, lastResults: frame.battles, pairings: frame.battles.map((battle) => ({ playerAId: battle.playerAId, playerBId: battle.playerBId, ghostOfPlayerId: battle.ghostOfPlayerId })), pendingItemChoices: frame.itemOffers, pendingVoyageRecruitOffers: frame.recruitOffers, pendingHarborOffers: frame.harborOffers ?? {}, pendingRecruitmentRoutes: frame.recruitmentRoutes ?? {} };
}
export function replayStageName(frame: ReplayFrame, content: GameContent): string { return frame.phase === "starter-choice" ? "First Crew" : frame.phase === "harbor-choice" ? content.harborEncounters.find(encounter => encounter.rounds.includes(frame.round))?.name ?? "Harbor" : getStageDefinition(frame.round, content).name; }

export const ACHIEVEMENTS = [
  ["first-voyage", "First log", "Complete a local voyage."], ["victory", "Pirate king", "Finish first."],
  ["top-four", "Grand Line contender", "Finish in the top four."], ["three-star", "Rising star", "Deploy a 3-star fighter."],
  ["form", "A new form", "Reach a persistent or battle form."], ["equipment", "Fully equipped", "Deploy a completed item."],
  ["round-20", "New World voyager", "Reach round 20."],
] as const;
export type CaptainProfile = { formatVersion: 1; name: string; completedIds: string[]; placements: number[]; bestPlacement: number | null; highestRound: number; highestLevel: number; highestGold: number; largestCrew: number; collection: CollectionFacts; achievements: string[] };
export function emptyProfile(name = "Captain"): CaptainProfile { return { formatVersion: 1, name, completedIds: [], placements: Array(8).fill(0), bestPlacement: null, highestRound: 0, highestLevel: 0, highestGold: 0, largestCrew: 0, collection: emptyCollection(), achievements: [] }; }
export function creditVoyage(profile: CaptainProfile, replay: VoyageReplay, content: GameContent): CaptainProfile {
  if (replay.completedAt === null || profile.completedIds.includes(replay.id)) return profile;
  if (profile.completedIds.length >= 10_000) throw new Error("Profile limit reached (10,000 voyages). Export and reset it before recording more credit.");
  const players = replay.frames.flatMap((frame) => frame.players.filter((player) => player.id === replay.playerId));
  const placement = players.at(-1)?.placement;
  if (!placement) return profile;
  const fighters = replay.frames.flatMap((frame) => frame.battles.flatMap((battle) => battle.initialUnits.filter((unit) => unit.teamId === replay.playerId)));
  const highestRound = replay.peaks.round;
  const unlocked = ["first-voyage", ...(placement === 1 ? ["victory"] : []), ...(placement <= 4 ? ["top-four"] : []),
    ...(fighters.some((unit) => unit.star === 3) ? ["three-star"] : []), ...(replay.collection.formsReached.length ? ["form"] : []),
    ...(replay.collection.itemsDeployed.some((id) => content.items.some((item) => item.id === id && item.kind === "completed")) ? ["equipment"] : []), ...(highestRound >= 20 ? ["round-20"] : [])];
  const placements = [...profile.placements]; placements[placement - 1] += 1;
  return { ...profile, completedIds: [...profile.completedIds, replay.id], placements, bestPlacement: Math.min(profile.bestPlacement ?? 8, placement),
    highestRound: Math.max(profile.highestRound, highestRound), highestLevel: Math.max(profile.highestLevel, replay.peaks.level), highestGold: Math.max(profile.highestGold, replay.peaks.gold),
    largestCrew: Math.max(profile.largestCrew, replay.peaks.deployed), collection: mergeCollection(profile.collection, replay.collection), achievements: [...new Set([...profile.achievements, ...unlocked])].sort() };
}
