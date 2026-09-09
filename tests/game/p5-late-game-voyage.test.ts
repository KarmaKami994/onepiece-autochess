import { describe, expect, it } from "vitest";
import {
  ACQUIRABLE_ITEM_IDS,
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  addUnitToPlayer,
  advanceMatchPhase,
  applyCommand,
  createMatch,
  deserializeMatch,
  getItemDefinition,
  getStageDefinition,
  serializeMatch,
  type MatchBattleResult,
  type MatchState,
  type PlayerState,
} from "../../game";

const PLAYER_CONTEXT = { actorPlayerId: "player-1" };
const EARLY_PVE_ROUNDS = [1, 2, 3, 9, 14, 19];
const EARLY_CAROUSEL_ROUNDS = [4, 12, 17];
const LATE_PVE_ROUNDS = [24, 28, 32, 36];
const LATE_CAROUSEL_ROUNDS = [22, 27, 34];

function human(state: MatchState): PlayerState {
  const player = state.players.find((candidate) => candidate.id === "player-1");
  if (!player) throw new Error("Missing human player fixture.");
  return player;
}

function battleResult(playerId: string, winnerId: string | null): MatchBattleResult {
  return {
    playerAId: playerId,
    playerBId: null,
    ghostOfPlayerId: null,
    winnerId,
    timedOut: false,
    playerADamage: 0,
    playerBDamage: 0,
    durationTicks: 1,
    events: [],
    initialUnits: [],
    finalUnits: [],
  };
}

function resolvePve(
  round: number,
  seed: string,
  winnerId: string | null = "player-1",
): MatchState {
  const state = createMatch(seed);
  state.round = round;
  state.stageId = getStageDefinition(round).id;
  state.phase = "battle";
  state.lastResults = state.players.map((player) =>
    battleResult(player.id, player.id === winnerId ? winnerId : null),
  );
  return advanceMatchPhase(state);
}

function enterCarousel(
  round: number,
  seed: string,
  livingPlayers = 8,
): MatchState {
  const state = createMatch(seed);
  state.players.forEach((player, index) => {
    if (index >= livingPlayers) {
      player.alive = false;
      player.hp = 0;
    }
  });
  state.round = round - 1;
  state.phase = "item-choice";
  state.pendingItemChoices = {};
  return advanceMatchPhase(state);
}

function completedItems() {
  return DEFAULT_CONTENT.items.filter((item) => item.kind === "completed");
}

describe("P5 late-game content topology", () => {
  it("keeps the early schedule and declares only the approved late-game stages", () => {
    expect(DEFAULT_CONTENT.stages.filter((stage) => stage.kind === "pve").map((stage) => stage.round))
      .toEqual([...EARLY_PVE_ROUNDS, ...LATE_PVE_ROUNDS]);
    expect(DEFAULT_CONTENT.stages.filter((stage) => stage.kind === "carousel").map((stage) => stage.round))
      .toEqual([...EARLY_CAROUSEL_ROUNDS, ...LATE_CAROUSEL_ROUNDS]);
    expect(DEFAULT_CONTENT.stages.filter((stage) => stage.kind === "pve" && stage.round < 20).map((stage) => stage.round))
      .toEqual(EARLY_PVE_ROUNDS);
    expect(DEFAULT_CONTENT.stages.filter((stage) => stage.kind === "carousel" && stage.round < 20).map((stage) => stage.round))
      .toEqual(EARLY_CAROUSEL_ROUNDS);
    expect(DEFAULT_CONTENT.stages.filter((stage) => stage.kind === "pve" && stage.rewardItemKind === "completed").map((stage) => stage.round))
      .toEqual(LATE_PVE_ROUNDS);
    expect(DEFAULT_CONTENT.stages.filter((stage) => stage.kind === "carousel" && stage.rewardItemKind === "completed").map((stage) => stage.round))
      .toEqual(LATE_CAROUSEL_ROUNDS);
    expect(DEFAULT_CONTENT.stages.some((stage) => stage.round === 40)).toBe(false);
    const specialRounds = new Set(DEFAULT_CONTENT.stages.map((stage) => stage.round));
    for (let round = 1; round <= 40; round += 1) {
      if (!specialRounds.has(round)) expect(getStageDefinition(round).kind).toBe("pvp");
    }
  });

  it("keeps stage rounds and enemy ids valid and reward kinds legal", () => {
    const rounds = DEFAULT_CONTENT.stages.map((stage) => stage.round);
    const enemyIds = new Set(DEFAULT_CONTENT.enemies.map((enemy) => enemy.id));
    expect(new Set(rounds).size).toBe(rounds.length);
    for (const stage of DEFAULT_CONTENT.stages) {
      expect([undefined, "component", "completed"]).toContain(stage.rewardItemKind);
      for (const entry of stage.enemyWave ?? []) {
        expect(enemyIds.has(entry.enemyId)).toBe(true);
      }
    }
  });

  it("defines the exact late PvE waves, timing, and three completed choices", () => {
    expect(LATE_PVE_ROUNDS.map((round) => getStageDefinition(round))).toMatchObject([
      { id: "vice-admiral-vanguard", name: "Vice Admiral Vanguard", preparationSeconds: 30, battleSeconds: 45, enemyWave: [{ enemyId: "vice-admiral", count: 3 }], itemChoices: 3, rewardItemKind: "completed" },
      { id: "cipher-pol-hunt", name: "Cipher Pol Hunt", preparationSeconds: 30, battleSeconds: 45, enemyWave: [{ enemyId: "cipher-pol-agent", count: 3 }], itemChoices: 3, rewardItemKind: "completed" },
      { id: "seraphim-deployment", name: "Seraphim Deployment", preparationSeconds: 30, battleSeconds: 45, enemyWave: [{ enemyId: "seraphim", count: 3 }], itemChoices: 3, rewardItemKind: "completed" },
      { id: "world-government-onslaught", name: "World Government Onslaught", preparationSeconds: 30, battleSeconds: 45, enemyWave: [{ enemyId: "vice-admiral", count: 2 }, { enemyId: "cipher-pol-agent", count: 2 }, { enemyId: "seraphim", count: 2 }], itemChoices: 3, rewardItemKind: "completed" },
    ]);
  });

  it("defines the three approved placeholder enemies and no extra mechanics", () => {
    expect(DEFAULT_CONTENT.enemies.filter((enemy) => ["vice-admiral", "cipher-pol-agent", "seraphim"].includes(enemy.id))).toMatchObject([
      {
        id: "vice-admiral",
        name: "Vice Admiral",
        stats: { health: 3200, attack: 130, defense: 45, specialDefense: 35, range: 1, attackIntervalMs: 1000, moveIntervalMs: 400 },
        ability: { id: "haki-shockwave", name: "Haki Shockwave", targeting: "nearest-enemy", pattern: "adjacent", effect: "damage", power: 360, castAnimationMs: 500, damageType: "physical", stunMs: 500 },
        assetPath: "/assets/characters/placeholder.svg",
      },
      {
        id: "cipher-pol-agent",
        name: "Cipher Pol Agent",
        stats: { health: 2800, attack: 150, defense: 38, specialDefense: 38, range: 1, attackIntervalMs: 800, moveIntervalMs: 350 },
        ability: { id: "six-powers-assault", name: "Six Powers Assault", targeting: "nearest-enemy", pattern: "single", effect: "damage", power: 420, castAnimationMs: 500, damageType: "physical", requiresTarget: false, defensePiercePercent: 25, signatureMechanics: [{ kind: "lunge" }] },
        assetPath: "/assets/characters/placeholder.svg",
      },
      {
        id: "seraphim",
        name: "Seraphim",
        stats: { health: 4200, attack: 140, defense: 60, specialDefense: 55, range: 4, attackIntervalMs: 1100, moveIntervalMs: 450 },
        ability: { id: "lunarian-laser", name: "Lunarian Laser", targeting: "farthest-enemy", pattern: "line", effect: "damage", power: 400, castAnimationMs: 500, damageType: "special", burnPower: 20, burnDurationMs: 3000 },
        assetPath: "/assets/characters/placeholder.svg",
      },
    ]);
  });
});

describe("P5 completed-item rewards", () => {
  it.each(LATE_PVE_ROUNDS)("builds deterministic constrained choices at PvE round %i", (round) => {
    const first = resolvePve(round, `p5-pve-${round}`);
    const second = resolvePve(round, `p5-pve-${round}`);
    const choices = first.pendingItemChoices["player-1"];
    expect(choices).toEqual(second.pendingItemChoices["player-1"]);
    expect(first.rngState).toBe(second.rngState);
    expect(first.rngState).not.toBe(createMatch(`p5-pve-${round}`).rngState);
    expect(choices).toHaveLength(3);
    expect(new Set(choices)).toHaveLength(3);
    expect(choices.every((id) => getItemDefinition(id)?.kind === "completed")).toBe(true);
    expect(choices.slice(0, 2).every((id) => !getItemDefinition(id)?.grantedTraitId)).toBe(true);
    expect(choices.filter((id) => getItemDefinition(id)?.grantedTraitId).length).toBeLessThanOrEqual(1);
  });

  it.each(LATE_PVE_ROUNDS)("awards no item after a loss at PvE round %i", (round) => {
    const state = resolvePve(round, `p5-pve-loss-${round}`, "bot-1");
    expect(state.pendingItemChoices["player-1"]).toBeUndefined();
    expect(human(state).inventory).toEqual([]);
  });

  it.each(LATE_CAROUSEL_ROUNDS)("builds one deterministic distinct completed deck at carousel round %i", (round) => {
    const first = enterCarousel(round, `p5-carousel-${round}`);
    const second = enterCarousel(round, `p5-carousel-${round}`);
    const ids = first.carouselChoices.map((choice) => choice.itemId);
    expect(first.carouselChoices).toEqual(second.carouselChoices);
    expect(ids).toHaveLength(10);
    expect(new Set(ids)).toHaveLength(ids.length);
    expect(ids.every((id) => getItemDefinition(id)?.kind === "completed")).toBe(true);
    expect(ids.filter((id) => getItemDefinition(id)?.grantedTraitId).length).toBeLessThanOrEqual(4);
  });

  it("uses the completed-carousel living-player count bounds", () => {
    expect(enterCarousel(22, "p5-carousel-min", 2).carouselChoices).toHaveLength(6);
    expect(enterCarousel(22, "p5-carousel-mid", 4).carouselChoices).toHaveLength(8);
    expect(enterCarousel(22, "p5-carousel-max", 8).carouselChoices).toHaveLength(10);
  });

  it.each(EARLY_CAROUSEL_ROUNDS)("keeps the early component carousel contract at round %i", (round) => {
    const carousel = enterCarousel(round, `p5-early-carousel-${round}`, 4);
    const ids = carousel.carouselChoices.map((choice) => choice.itemId);
    const counts = new Map<string, number>();
    ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    expect(ids).toHaveLength(7);
    expect(ids.every((id) => getItemDefinition(id)?.kind === "component")).toBe(true);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    expect(enterCarousel(round, `p5-early-carousel-${round}`, 4).carouselChoices)
      .toEqual(carousel.carouselChoices);
  });

  it.each(EARLY_PVE_ROUNDS)("keeps three deterministic component rewards at early PvE round %i", (round) => {
    const first = resolvePve(round, `p5-early-pve-${round}`);
    const second = resolvePve(round, `p5-early-pve-${round}`);
    const choices = first.pendingItemChoices["player-1"];
    expect(choices).toEqual(second.pendingItemChoices["player-1"]);
    expect(choices).toHaveLength(3);
    expect(choices.every((id) => getItemDefinition(id)?.kind === "component")).toBe(true);
  });

  it("preserves representative early acquisition output and carousel counts", () => {
    expect(resolvePve(1, "p4a-reward-1").pendingItemChoices["player-1"]).toEqual([
      "jet-dial",
      "sniper-lens",
      "devil-fruit-essence",
    ]);
    const earlyCarousel = enterCarousel(4, "p4a-carousel-1");
    expect(earlyCarousel.carouselChoices.map((choice) => choice.itemId)).toEqual([
      "armament-plate",
      "devil-fruit-essence",
      "black-blade-shard",
      "jolly-roger-fragment",
      "black-blade-shard",
      "sniper-lens",
      "jolly-roger-fragment",
      "devil-fruit-essence",
      "cola-canister",
    ]);
    expect(enterCarousel(4, "p5-early-min", 2).carouselChoices).toHaveLength(5);
    expect(DEFAULT_CONTENT.acquirableItemIds).toEqual(ACQUIRABLE_ITEM_IDS);
  });

  it("offers the full stable completed pool without changing component acquisition", () => {
    expect(completedItems()).toHaveLength(55);
    expect(completedItems().map((item) => item.id)).toEqual(
      expect.arrayContaining(enterCarousel(22, "p5-pool").carouselChoices.map((choice) => choice.itemId)),
    );
    expect(DEFAULT_CONTENT.acquirableItemIds).toEqual(ACQUIRABLE_ITEM_IDS);
  });
});

describe("P5 item, bot, and save compatibility", () => {
  it("grants a completed item directly, equips it without crafting, and returns it on sale", () => {
    let state = resolvePve(24, "p5-direct-item");
    const selected = state.pendingItemChoices["player-1"][0];
    const chosen = applyCommand(state, { type: "CHOOSE_ITEM", choiceId: selected }, PLAYER_CONTEXT);
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    state = chosen.state;
    const unit = addUnitToPlayer(state, human(state), "zoro", DEFAULT_CONTENT);
    if (!unit) throw new Error("Could not add P5 item holder.");
    const equipped = applyCommand(state, { type: "EQUIP_ITEM", unitId: unit.id, itemId: selected }, PLAYER_CONTEXT);
    expect(equipped.ok).toBe(true);
    if (!equipped.ok) return;
    expect(human(equipped.state).units[unit.id].items).toEqual([selected]);
    const sold = applyCommand(equipped.state, { type: "SELL_UNIT", unitId: unit.id }, PLAYER_CONTEXT);
    expect(sold.ok).toBe(true);
    if (sold.ok) expect(human(sold.state).inventory).toContain(selected);
  });

  it("keeps duplicate native-trait legality for a trait grant obtained from late PvE", () => {
    let reward: MatchState | null = null;
    let traitItemId = "";
    let nativeUnitId = "";
    for (let index = 0; index < 2_000 && !reward; index += 1) {
      const candidate = resolvePve(24, `p5-trait-${index}`);
      for (const itemId of candidate.pendingItemChoices["player-1"]) {
        const traitId = getItemDefinition(itemId)?.grantedTraitId;
        const nativeUnit = DEFAULT_CONTENT.units.find((unit) => traitId && unit.traits.includes(traitId));
        if (traitId && nativeUnit) {
          reward = candidate;
          traitItemId = itemId;
          nativeUnitId = nativeUnit.id;
          break;
        }
      }
    }
    expect(reward).not.toBeNull();
    if (!reward) return;
    const chosen = applyCommand(reward, { type: "CHOOSE_ITEM", choiceId: traitItemId }, PLAYER_CONTEXT);
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const unit = addUnitToPlayer(
      chosen.state,
      human(chosen.state),
      nativeUnitId,
      DEFAULT_CONTENT,
    );
    if (!unit) throw new Error("Could not add native-trait holder.");
    const equipped = applyCommand(chosen.state, { type: "EQUIP_ITEM", unitId: unit.id, itemId: traitItemId }, PLAYER_CONTEXT);
    expect(equipped).toMatchObject({ ok: false, error: { code: "ITEM_TRAIT_DUPLICATE" } });
    expect(human(equipped.state).inventory).toContain(traitItemId);
  });

  it("keeps Mystery Treasure Chest eligibility anchors unchanged", () => {
    const traitGrantIds = completedItems().filter((item) => item.grantedTraitId).map((item) => item.id);
    expect(traitGrantIds).toHaveLength(10);
    expect(getItemDefinition("mystery-treasure-chest")).toMatchObject({ kind: "completed" });
    expect(getItemDefinition("mystery-treasure-chest")?.grantedTraitId).toBeUndefined();
  });

  it("lets bots deterministically accept completed PvE and carousel rewards", () => {
    const firstPve = resolvePve(24, "p5-bot-pve", "bot-1");
    const secondPve = resolvePve(24, "p5-bot-pve", "bot-1");
    const firstBotItem = firstPve.players.find((player) => player.id === "bot-1")?.inventory.at(-1);
    expect(firstBotItem).toBe(secondPve.players.find((player) => player.id === "bot-1")?.inventory.at(-1));
    expect(getItemDefinition(firstBotItem ?? "")?.kind).toBe("completed");

    const firstCarousel = advanceMatchPhase(enterCarousel(22, "p5-bot-carousel"));
    const secondCarousel = advanceMatchPhase(enterCarousel(22, "p5-bot-carousel"));
    expect(firstCarousel.players.map((player) => player.inventory)).toEqual(
      secondCarousel.players.map((player) => player.inventory),
    );
    expect(firstCarousel.players.every((player) => getItemDefinition(player.inventory.at(-1) ?? "")?.kind === "completed")).toBe(true);
  });

  it("round-trips pre-P5 state and resolves round 22 from current content", () => {
    const state = createMatch("p5-save");
    state.round = 21;
    state.stageId = getStageDefinition(21).id;
    state.phase = "item-choice";
    state.pendingItemChoices = {};
    human(state).inventory = ["black-blade", "jet-dial"];
    const restored = deserializeMatch(serializeMatch(state));
    expect(restored.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(restored.contentVersion).toBe("1.25.0");
    expect(human(restored).inventory).toEqual(["black-blade", "jet-dial"]);
    const next = advanceMatchPhase(restored);
    expect(next).toMatchObject({ round: 22, phase: "carousel", stageId: "new-world-exchange" });
    expect(next.carouselChoices.every((choice) => getItemDefinition(choice.itemId)?.kind === "completed")).toBe(true);
  });

  it("keeps GameContent 1.25.0 and save schema 6", () => {
    expect(DEFAULT_CONTENT.version).toBe("1.25.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
  });
});
