import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  advanceMatchPhase,
  applyCommand,
  createMatch,
  deserializeMatch,
  getItemDefinition,
  getStageDefinition,
  scoreItemForPlayer,
  selectStageItemReward,
  serializeMatch,
  type MatchBattleResult,
  type MatchState,
} from "../../game";

const PVE_ROUNDS = [1, 2, 3, 9, 10, 14, 19, 20, 24, 28, 32, 36, 40];
const CAROUSEL_ROUNDS = [4, 12, 17, 22, 27, 34];
const SUPPLY_ROUNDS = [5, 8, 11];
const PVE_CHOICE_ROUNDS = [2, 14, 24, 28, 32, 36];
const AUTO_COMPONENT_ROUNDS = [1, 3, 9];

function player(state: MatchState, id = "player-1") {
  const found = state.players.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing player ${id}`);
  return found;
}

function resolvedRound(
  round: number,
  seed: string,
  humanWins = true,
): { before: MatchState; after: MatchState } {
  const before = createMatch(seed);
  before.round = round;
  before.stageId = getStageDefinition(round).id;
  before.phase = "battle";
  before.lastResults = before.players.map((candidate): MatchBattleResult => ({
    playerAId: candidate.id,
    playerBId: null,
    ghostOfPlayerId: null,
    winnerId: candidate.id === "player-1" && !humanWins ? null : candidate.id,
    timedOut: false,
    playerADamage: 0,
    playerBDamage: 0,
    durationTicks: 1,
    events: [],
    initialUnits: [],
    finalUnits: [],
  }));
  return { before, after: advanceMatchPhase(before) };
}

function itemKinds(ids: readonly string[]) {
  return ids.map((id) => getItemDefinition(id)?.kind);
}

describe("P10 fixed cadence and reward content", () => {
  it("locks exact stage topologies, version, schema, and catalogue counts", () => {
    expect(DEFAULT_CONTENT.stages.filter((stage) => stage.kind === "pve").map((stage) => stage.round))
      .toEqual(PVE_ROUNDS);
    expect(DEFAULT_CONTENT.stages.filter((stage) => stage.kind === "carousel").map((stage) => stage.round))
      .toEqual(CAROUSEL_ROUNDS);
    expect(DEFAULT_CONTENT.stages.filter((stage) => stage.itemReward?.trigger === "stage-complete").map((stage) => stage.round))
      .toEqual(SUPPLY_ROUNDS);
    expect(DEFAULT_CONTENT.stages.filter((stage) => stage.kind === "carousel").map((stage) => stage.carouselItemKind))
      .toEqual(["component", "component", "component", "completed", "completed", "completed"]);
    expect(DEFAULT_CONTENT.items.filter((item) => item.kind === "component")).toHaveLength(10);
    expect(DEFAULT_CONTENT.items.filter((item) => item.kind === "completed")).toHaveLength(55);
    expect(DEFAULT_CONTENT.version).toBe("1.29.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
  });

  it("uses preceding enemy waves for no-reward PvE bridges", () => {
    for (const [bridge, preceding] of [[10, 9], [20, 19]]) {
      expect(getStageDefinition(bridge)).toMatchObject({ kind: "pve" });
      expect(getStageDefinition(bridge).enemyWave).toEqual(getStageDefinition(preceding).enemyWave);
      expect(getStageDefinition(bridge).itemReward).toBeUndefined();
      const { after } = resolvedRound(bridge, `p10-bridge-${bridge}`);
      const repeat = resolvedRound(bridge, `p10-bridge-${bridge}`).after;
      expect(after.round).toBe(bridge + 1);
      expect(player(after).inventory).toEqual([]);
      expect(after.rngState).toBe(repeat.rngState);
      expect(player(after).recentBattles).toEqual([]);
    }
  });

  it("declares every locked reward mode explicitly", () => {
    const reward = (round: number) => getStageDefinition(round).itemReward;
    for (const round of AUTO_COMPONENT_ROUNDS) {
      expect(reward(round)).toEqual({
        trigger: "pve-win", mode: "grant", itemKind: "component", amount: 1,
      });
    }
    for (const round of [2, 14]) {
      expect(reward(round)).toEqual({
        trigger: "pve-win", mode: "choice", itemKind: "component",
        amount: 1, offerCount: 3, distinct: true,
      });
    }
    for (const round of SUPPLY_ROUNDS) {
      expect(reward(round)).toEqual({
        trigger: "stage-complete", mode: "choice", itemKind: "component",
        amount: 1, offerCount: 3, distinct: true,
      });
    }
    expect(reward(19)).toEqual({
      trigger: "pve-win", mode: "grant", itemKind: "component", amount: 2, distinct: true,
    });
    for (const round of [24, 28, 32, 36]) {
      expect(reward(round)).toEqual({
        trigger: "pve-win", mode: "choice", itemKind: "completed",
        amount: 1, offerCount: 3, distinct: true,
      });
    }
    expect(reward(40)).toEqual({
      trigger: "pve-win", mode: "grant", itemKind: "completed", amount: 3,
      distinct: true, excludeTraitGrantItems: true,
    });
  });

  it.each(AUTO_COMPONENT_ROUNDS)("grants one component without a choice at round %i", (round) => {
    const { after } = resolvedRound(round, `p10-auto-${round}`);
    expect(after.phase).toBe(round === 3 ? "carousel" : "preparation");
    expect(player(after).inventory).toHaveLength(1);
    expect(itemKinds(player(after).inventory)).toEqual(["component"]);
    expect(after.pendingItemChoices).toEqual({});
  });

  it("grants two different components at 19 and three non-trait completed items at 40", () => {
    const mid = resolvedRound(19, "p10-mid-grant").after;
    const final = resolvedRound(40, "p10-final-grant").after;
    expect(mid.phase).toBe("preparation");
    expect(player(mid).inventory).toHaveLength(2);
    expect(new Set(player(mid).inventory).size).toBe(2);
    expect(itemKinds(player(mid).inventory)).toEqual(["component", "component"]);
    expect(final.phase).toBe("preparation");
    expect(player(final).inventory).toHaveLength(3);
    expect(new Set(player(final).inventory).size).toBe(3);
    expect(itemKinds(player(final).inventory)).toEqual(["completed", "completed", "completed"]);
    expect(player(final).inventory.every((id) => !getItemDefinition(id)?.grantedTraitId)).toBe(true);
    expect(final.pendingItemChoices).toEqual({});
    expect(getStageDefinition(40).enemyWave).toEqual([
      { enemyId: "vice-admiral", count: 2 },
      { enemyId: "cipher-pol-agent", count: 2 },
      { enemyId: "seraphim", count: 3 },
    ]);
  });

  it("keeps the round-40 automatic grant when that victory also ends the match", () => {
    const { before } = resolvedRound(40, "p10-terminal-grant");
    for (const candidate of before.players.slice(1)) candidate.hp = 1;
    before.lastResults = before.lastResults.map((result) => result.playerAId === "player-1"
      ? result
      : { ...result, winnerId: null, playerADamage: 1 });
    const after = advanceMatchPhase(before);
    expect(after.phase).toBe("game-over");
    expect(after.winnerId).toBe("player-1");
    expect(player(after).inventory).toHaveLength(3);
    expect(new Set(player(after).inventory).size).toBe(3);
    expect(player(after).inventory.every((id) => !getItemDefinition(id)?.grantedTraitId)).toBe(true);
  });

  it.each([...AUTO_COMPONENT_ROUNDS, ...PVE_CHOICE_ROUNDS, 19, 40])(
    "does not grant a PvE reward to a loser at round %i",
    (round) => {
      const { after } = resolvedRound(round, `p10-loss-${round}`, false);
      expect(player(after).inventory).toEqual([]);
      expect(after.pendingItemChoices["player-1"]).toBeUndefined();
    },
  );

  it.each(SUPPLY_ROUNDS)("offers component supplies after PvP victory or loss at round %i", (round) => {
    const won = resolvedRound(round, `p10-supply-${round}`, true).after;
    const lost = resolvedRound(round, `p10-supply-${round}`, false).after;
    expect(won.phase).toBe("item-choice");
    expect(lost.phase).toBe("item-choice");
    expect(won.pendingItemChoices["player-1"]).toEqual(lost.pendingItemChoices["player-1"]);
    expect(won.pendingItemChoices["player-1"]).toHaveLength(3);
    expect(new Set(won.pendingItemChoices["player-1"]).size).toBe(3);
    expect(itemKinds(won.pendingItemChoices["player-1"])).toEqual([
      "component", "component", "component",
    ]);
  });

  it.each(PVE_CHOICE_ROUNDS)("offers a valid one-of-three choice at PvE round %i", (round) => {
    const { after } = resolvedRound(round, `p10-choice-${round}`);
    const choices = after.pendingItemChoices["player-1"];
    const kind = round < 20 ? "component" : "completed";
    expect(after.phase).toBe("item-choice");
    expect(choices).toHaveLength(3);
    expect(new Set(choices).size).toBe(3);
    expect(itemKinds(choices)).toEqual([kind, kind, kind]);
    if (kind === "completed") {
      expect(choices.slice(0, 2).every((id) => !getItemDefinition(id)?.grantedTraitId)).toBe(true);
      expect(choices.filter((id) => getItemDefinition(id)?.grantedTraitId).length).toBeLessThanOrEqual(1);
    }
    const invalid = applyCommand(after, { type: "CHOOSE_ITEM", choiceId: "not-offered" }, { actorPlayerId: "player-1" });
    expect(invalid).toMatchObject({ ok: false, error: { code: "INVALID_ITEM_CHOICE" } });
    expect(invalid.state).toEqual(after);
    const chosen = applyCommand(after, { type: "CHOOSE_ITEM", choiceId: choices[1] }, { actorPlayerId: "player-1" });
    expect(chosen.ok).toBe(true);
    if (chosen.ok) {
      expect(player(chosen.state).inventory).toEqual([choices[1]]);
      expect(chosen.state.pendingItemChoices).toEqual({});
    }
  });

  it("repeats offers and RNG exactly for the same seed, but varies valid offers across seeds", () => {
    const first = resolvedRound(24, "p10-repeat").after;
    const second = resolvedRound(24, "p10-repeat").after;
    expect(first.pendingItemChoices).toEqual(second.pendingItemChoices);
    expect(first.rngState).toBe(second.rngState);
    const offers = new Set(
      Array.from({ length: 8 }, (_, index) =>
        resolvedRound(24, `p10-varied-${index}`).after.pendingItemChoices["player-1"].join(","),
      ),
    );
    expect(offers.size).toBeGreaterThan(1);
  });

  it("bots pick from the same offers using generic scoring and do not block progression", () => {
    const { before, after } = resolvedRound(24, "p10-bot-choice");
    const reward = getStageDefinition(24).itemReward;
    if (!reward) throw new Error("Missing P10 reward");
    const humanOffer = selectStageItemReward(reward, DEFAULT_CONTENT, before.rngState);
    const botOffer = selectStageItemReward(reward, DEFAULT_CONTENT, humanOffer.rngState);
    const bot = player(before, "bot-1");
    const expected = [...botOffer.itemIds].sort((left, right) =>
      scoreItemForPlayer(right, bot, DEFAULT_CONTENT) -
        scoreItemForPlayer(left, bot, DEFAULT_CONTENT) ||
      left.localeCompare(right),
    )[0];
    expect(player(after, "bot-1").inventory).toEqual([expected]);
    expect(after.pendingItemChoices["bot-1"]).toBeUndefined();
    expect(after.pendingItemChoices["player-1"]).toEqual(humanOffer.itemIds);
    expect(advanceMatchPhase(after).round).toBe(25);
  });

  it("round-trips early, supply, late, and bridge checkpoints without duplicate rewards", () => {
    for (const round of [2, 5, 24]) {
      const offered = resolvedRound(round, `p10-save-${round}`).after;
      const restored = deserializeMatch(serializeMatch(offered));
      expect(restored.schemaVersion).toBe(6);
      expect(restored.pendingItemChoices).toEqual(offered.pendingItemChoices);
      expect(restored.rngState).toBe(offered.rngState);
      expect(advanceMatchPhase(restored)).toEqual(advanceMatchPhase(offered));
    }
    const beforeBridge = createMatch("p10-bridge-save");
    beforeBridge.round = 10;
    beforeBridge.stageId = getStageDefinition(10).id;
    const restoredBefore = deserializeMatch(serializeMatch(beforeBridge));
    expect(restoredBefore).toEqual(beforeBridge);
    const afterBridge = resolvedRound(10, "p10-bridge-after").after;
    expect(deserializeMatch(serializeMatch(afterBridge))).toEqual(afterBridge);
    const grant = resolvedRound(19, "p10-grant-save").after;
    const restoredGrant = deserializeMatch(serializeMatch(grant));
    expect(player(restoredGrant).inventory).toEqual(player(grant).inventory);
    expect(advanceMatchPhase(restoredGrant).players.map((candidate) => candidate.inventory))
      .toEqual(advanceMatchPhase(grant).players.map((candidate) => candidate.inventory));
  });
});
