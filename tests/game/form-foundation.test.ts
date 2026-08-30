import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  addUnitToPlayer,
  applyCommand,
  createMatch,
  deserializeMatch,
  getActiveTraits,
  getUnitFormDefinition,
  resolvePersistentFormId,
  resolveUnitDefinition,
  serializeMatch,
  simulateBattle,
  type AbilityDefinition,
  type BattleTeam,
  type GameCommand,
  type GameContent,
  type MatchState,
  type PlayerState,
  type UnitFormDefinition,
  type UnitInstance,
} from "../../game";
import {
  selectBattlePresentation,
  selectMatchView,
} from "../../app/selectors";
import { preservesActiveBattleTimeline } from "../../components/PhaserBoard";

const persistentAbility: AbilityDefinition = {
  id: "thunderbolt-tempo",
  name: "Persistent Fixture Technique",
  description: "A complete replacement ability used only by tests.",
  targeting: "nearest-enemy",
  pattern: "single",
  effect: "damage",
  power: 41,
  castAnimationMs: 250,
  sequentialStrike: { hitWeightsBasisPoints: [5_000, 5_000] },
};

const temporaryAbility: AbilityDefinition = {
  id: "fixture-temporary-technique",
  name: "Temporary Fixture Technique",
  description: "A temporary complete replacement used only by tests.",
  targeting: "nearest-enemy",
  pattern: "adjacent",
  effect: "damage",
  power: 23,
  castAnimationMs: 300,
};

const fixtureForms: UnitFormDefinition[] = [
  {
    id: "fixture-persistent-form",
    baseDefinitionId: "nami",
    name: "Persistent Fixture Form",
    lifecycle: "persistent",
    stats: { health: 700, attack: 60 },
    ability: persistentAbility,
    traits: ["navy", "marksman"],
    presentation: {
      portrait: "/fixture/persistent-portrait.png",
      token: "/fixture/persistent-token.png",
    },
  },
  {
    id: "fixture-persistent-alternate",
    baseDefinitionId: "nami",
    name: "Alternate Fixture Form",
    lifecycle: "persistent",
    traits: ["navy"],
  },
  {
    id: "fixture-temporary-form",
    baseDefinitionId: "nami",
    name: "Temporary Fixture Form",
    lifecycle: "battle-temporary",
    stats: { health: 800, attack: 70, attackIntervalMs: 100 },
    ability: temporaryAbility,
    traits: ["warlord"],
  },
  {
    id: "fixture-foreign-form",
    baseDefinitionId: "zoro",
    name: "Foreign Fixture Form",
    lifecycle: "persistent",
  },
];

function fixtureContent(): GameContent {
  const content = structuredClone(DEFAULT_CONTENT);
  content.forms = structuredClone(fixtureForms);
  return content;
}

function human(state: MatchState): PlayerState {
  const player = state.players.find((candidate) => !candidate.isBot);
  if (!player) throw new Error("Expected a human player fixture.");
  return player;
}

function resetRoster(player: PlayerState): void {
  player.units = {};
  player.board = {};
  player.bench = player.bench.map(() => null);
}

function placeOnBoard(
  player: PlayerState,
  instance: UnitInstance,
  cell = "0,5",
): void {
  const benchSlot = player.bench.indexOf(instance.id);
  if (benchSlot >= 0) player.bench[benchSlot] = null;
  player.board[cell] = instance.id;
}

function command(
  state: MatchState,
  gameCommand: GameCommand,
  content: GameContent,
): MatchState {
  const result = applyCommand(
    state,
    gameCommand,
    { actorPlayerId: human(state).id },
    content,
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

describe("character form resolver foundation", () => {
  it("falls back safely and resolves matching overlays without changing economic identity", () => {
    const content = fixtureContent();
    expect(DEFAULT_CONTENT.forms).toEqual([]);
    const base = resolveUnitDefinition("nami", undefined, content);
    if (!base) throw new Error("Missing fixture base definition.");
    const sourceBefore = structuredClone({
      base: content.units.find((unit) => unit.id === "nami"),
      forms: content.forms,
    });

    expect(resolveUnitDefinition("nami", undefined, content)).toBe(base);
    expect(resolveUnitDefinition("nami", "unknown-form", content)).toBe(base);
    expect(resolveUnitDefinition("nami", "fixture-foreign-form", content)).toBe(base);
    expect(getUnitFormDefinition("fixture-persistent-form", content)?.id).toBe(
      "fixture-persistent-form",
    );
    expect(getUnitFormDefinition("missing", content)).toBeNull();

    const effective = resolveUnitDefinition(
      "nami",
      "fixture-persistent-form",
      content,
    );
    expect(effective).toMatchObject({
      id: "nami",
      cost: base.cost,
      name: "Persistent Fixture Form",
      traits: ["navy", "marksman"],
      stats: {
        health: 700,
        attack: 60,
        defense: base.stats.defense,
        moveIntervalMs: base.stats.moveIntervalMs,
      },
      ability: persistentAbility,
    });
    expect({
      base: content.units.find((unit) => unit.id === "nami"),
      forms: content.forms,
    }).toEqual(sourceBefore);
  });

  it("accepts only matching persistent forms on UnitInstance", () => {
    const content = fixtureContent();
    const instance: UnitInstance = {
      id: "fixture-unit",
      definitionId: "nami",
      formId: "fixture-persistent-form",
      star: 1,
      items: [],
      acquiredOrder: 1,
    };

    expect(resolvePersistentFormId(instance, content)).toBe(
      "fixture-persistent-form",
    );
    expect(resolvePersistentFormId({
      ...instance,
      formId: "fixture-temporary-form",
    }, content)).toBeNull();
    expect(resolvePersistentFormId({
      ...instance,
      formId: "fixture-foreign-form",
    }, content)).toBeNull();
    expect(resolvePersistentFormId({
      ...instance,
      formId: "unknown-form",
    }, content)).toBeNull();
    expect(resolveUnitDefinition(
      "nami",
      "fixture-temporary-form",
      content,
    )?.name).toBe("Temporary Fixture Form");
  });
});

describe("character form trait identity", () => {
  it("uses replacement traits while counting each base definition once per trait", () => {
    const content = fixtureContent();
    const state = createMatch("form-traits", content);
    const player = human(state);
    resetRoster(player);
    player.units = {
      "nami-a": {
        id: "nami-a",
        definitionId: "nami",
        formId: "fixture-persistent-form",
        star: 1,
        items: [],
        acquiredOrder: 1,
      },
      "nami-b": {
        id: "nami-b",
        definitionId: "nami",
        formId: "fixture-persistent-alternate",
        star: 1,
        items: [],
        acquiredOrder: 2,
      },
      smoker: {
        id: "smoker",
        definitionId: "smoker",
        star: 1,
        items: [],
        acquiredOrder: 3,
      },
    };
    player.board = { "0,5": "nami-a", "1,5": "nami-b", "2,5": "smoker" };

    const traits = getActiveTraits(player, content);
    expect(traits.find((trait) => trait.traitId === "navy")?.count).toBe(2);
    expect(traits.find((trait) => trait.traitId === "straw-hat")?.count).toBe(0);
    expect(traits.find((trait) => trait.traitId === "marksman")?.count).toBe(1);

    delete player.units.smoker;
    delete player.board["2,5"];
    expect(
      getActiveTraits(player, content).find((trait) => trait.traitId === "navy")
        ?.count,
    ).toBe(1);
  });
});

describe("character form combat snapshots", () => {
  it("applies an explicit temporary form before star, item, and deterministic combat resolution", () => {
    const content = fixtureContent();
    const persistentInstance: UnitInstance = {
      id: "persistent-source",
      definitionId: "nami",
      star: 2,
      items: ["meat-platter"],
      acquiredOrder: 1,
    };
    const startingEnergy = [{
      traitId: "fixture-energy",
      count: 1,
      tierIndex: 0,
      tier: {
        required: 1,
        effects: [{ kind: "starting-energy" as const, value: 100 }],
        label: "Fixture energy",
      },
    }];
    const teamA: BattleTeam = {
      id: "a",
      activeTraits: startingEnergy,
      units: [{
        id: "a:nami",
        definitionId: "nami",
        formId: "fixture-temporary-form",
        star: persistentInstance.star,
        items: [...persistentInstance.items],
        position: { x: 0, y: 0 },
      }],
    };
    const teamB: BattleTeam = {
      id: "b",
      units: [{
        id: "b:zoro",
        definitionId: "zoro",
        star: 1,
        items: [],
        position: { x: 1, y: 0 },
      }],
    };

    const first = simulateBattle(teamA, teamB, { seed: "form-combat" }, content);
    const second = simulateBattle(teamA, teamB, { seed: "form-combat" }, content);
    const initial = first.initialUnits.find((unit) => unit.id === "a:nami");
    expect(first).toEqual(second);
    expect(initial).toMatchObject({
      definitionId: "nami",
      formId: "fixture-temporary-form",
      star: 2,
      maxHp: 1_740,
      hp: 1_740,
      attack: 126,
    });
    expect(first.finalUnits.find((unit) => unit.id === "a:nami")?.formId).toBe(
      "fixture-temporary-form",
    );
    expect(first.events).toContainEqual(expect.objectContaining({
      type: "cast",
      sourceId: "a:nami",
      abilityId: temporaryAbility.id,
    }));
    expect(persistentInstance).not.toHaveProperty("formId");
  });
});

describe("character form economy and merge invariants", () => {
  it("keeps forms out of pool/shop/purchases and uses base sell value", () => {
    const content = fixtureContent();
    let state = createMatch("form-economy", content);
    let player = human(state);
    const formIds = new Set(content.forms.map((form) => form.id));
    const unitIds = new Set(content.units.map((unit) => unit.id));
    expect(Object.keys(state.pool).some((id) => formIds.has(id))).toBe(false);
    expect(player.shop.every((id) => id === null || unitIds.has(id))).toBe(true);

    player.gold = 20;
    player.shop[0] = "nami";
    state = command(state, { type: "BUY_UNIT", shopIndex: 0 }, content);
    player = human(state);
    const purchased = Object.values(player.units).find(
      (unit) => unit.definitionId === "nami",
    );
    expect(purchased).toBeDefined();
    expect(purchased).not.toHaveProperty("formId");
    if (!purchased) return;
    purchased.formId = "fixture-persistent-form";
    const goldBeforeSale = player.gold;
    state = command(state, { type: "SELL_UNIT", unitId: purchased.id }, content);
    expect(human(state).gold - goldBeforeSale).toBe(
      content.units.find((unit) => unit.id === "nami")?.cost,
    );
  });

  it("merges by base definition and star while preserving the anchor object", () => {
    const content = fixtureContent();
    const state = createMatch("form-merge", content);
    const player = human(state);
    resetRoster(player);
    const anchor = addUnitToPlayer(state, player, "nami", content);
    if (!anchor) throw new Error("Expected merge anchor.");
    anchor.formId = "fixture-persistent-form";
    addUnitToPlayer(state, player, "nami", content);
    addUnitToPlayer(state, player, "nami", content);

    expect(Object.values(player.units)).toEqual([
      expect.objectContaining({
        id: anchor.id,
        definitionId: "nami",
        formId: "fixture-persistent-form",
        star: 2,
      }),
    ]);
  });
});

describe("character form schema-6 persistence", () => {
  it("round-trips persistent, unknown, and frozen battle form IDs without a schema bump", () => {
    const content = fixtureContent();
    const state = createMatch("form-persistence", content);
    const player = human(state);
    resetRoster(player);
    const persistent = addUnitToPlayer(state, player, "nami", content);
    const unknown = addUnitToPlayer(state, player, "zoro", content);
    if (!persistent || !unknown) throw new Error("Expected persistence fixtures.");
    persistent.formId = "fixture-persistent-form";
    unknown.formId = "unknown-future-form";
    placeOnBoard(player, persistent);
    const battle = command(state, { type: "END_PREPARATION" }, content);
    const battleSnapshot = battle.lastResults
      .flatMap((result) => result.initialUnits)
      .find((unit) => unit.id.endsWith(`:${persistent.id}`));
    expect(battleSnapshot?.formId).toBe("fixture-persistent-form");

    const restored = deserializeMatch(serializeMatch(battle, "fixture"), content);
    const restoredPlayer = human(restored);
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(restored.schemaVersion).toBe(6);
    expect(restored.contentVersion).toBe("1.12.0");
    expect(restoredPlayer.units[persistent.id].formId).toBe(
      "fixture-persistent-form",
    );
    expect(restoredPlayer.units[unknown.id].formId).toBe("unknown-future-form");
    expect(
      restored.lastResults.flatMap((result) => result.initialUnits)
        .find((unit) => unit.id.endsWith(`:${persistent.id}`))?.formId,
    ).toBe("fixture-persistent-form");
  });

  it("loads old schema-6 instances and battle snapshots without formId as base form", () => {
    const content = fixtureContent();
    const state = createMatch("legacy-form-persistence", content);
    const player = human(state);
    resetRoster(player);
    const instance = addUnitToPlayer(state, player, "nami", content);
    if (!instance) throw new Error("Expected legacy fixture.");
    placeOnBoard(player, instance);
    const battle = command(state, { type: "END_PREPARATION" }, content);
    const raw = JSON.parse(serializeMatch(battle, "legacy")) as {
      match: MatchState;
    };
    for (const savedPlayer of raw.match.players) {
      for (const savedUnit of Object.values(savedPlayer.units)) {
        delete savedUnit.formId;
      }
    }
    for (const result of raw.match.lastResults) {
      for (const snapshot of [...result.initialUnits, ...result.finalUnits]) {
        delete snapshot.formId;
      }
    }

    const restored = deserializeMatch(JSON.stringify(raw), content);
    expect(human(restored).units[instance.id]).not.toHaveProperty("formId");
    expect(restored.schemaVersion).toBe(6);
    expect(restored.lastResults.flatMap((result) => result.initialUnits))
      .not.toContainEqual(expect.objectContaining({ formId: expect.any(String) }));
  });
});

describe("character form selector and battle freeze", () => {
  it("resolves persistent planning presentation while keeping the shop base-only", () => {
    const content = fixtureContent();
    const state = createMatch("form-selector-planning", content);
    const player = human(state);
    resetRoster(player);
    const instance = addUnitToPlayer(state, player, "nami", content);
    if (!instance) throw new Error("Expected selector fixture.");
    instance.formId = "fixture-persistent-form";
    placeOnBoard(player, instance);
    player.shop[0] = "nami";

    const view = selectMatchView(state, content);
    const boardUnit = view.boardUnits.find((unit) => unit.id === instance.id);
    const unitView = view.selectedDefinitionByUnit.get(instance.id);
    const base = content.units.find((unit) => unit.id === "nami");
    expect(boardUnit).toMatchObject({
      contentId: "nami",
      formId: "fixture-persistent-form",
      name: "Persistent Fixture Form",
      maxHp: 700,
      portrait: "/fixture/persistent-token.png",
    });
    expect(unitView).toMatchObject({
      id: "nami",
      name: "Persistent Fixture Form",
      portrait: "/fixture/persistent-portrait.png",
      token: "/fixture/persistent-token.png",
      traits: ["navy", "marksman"],
      stats: { health: 700, attack: 60 },
      ability: { name: persistentAbility.name, power: persistentAbility.power },
    });
    expect(view.shop[0]).toMatchObject({
      id: "nami",
      name: base?.name,
      stats: { health: base?.stats.health },
    });
    expect(view.shop[0]?.name).not.toBe("Persistent Fixture Form");
  });

  it("uses the frozen snapshot form and treats legacy snapshots as base", () => {
    const content = fixtureContent();
    const state = createMatch("form-selector-freeze", content);
    const player = human(state);
    resetRoster(player);
    const instance = addUnitToPlayer(state, player, "nami", content);
    if (!instance) throw new Error("Expected freeze fixture.");
    instance.formId = "fixture-persistent-form";
    placeOnBoard(player, instance);
    const battle = command(state, { type: "END_PREPARATION" }, content);
    const result = battle.lastResults.find(
      (candidate) => candidate.playerAId === player.id,
    );
    const snapshot = result?.initialUnits.find((unit) =>
      unit.id.endsWith(`:${instance.id}`),
    );
    if (!result || !snapshot) throw new Error("Expected frozen battle snapshot.");
    const before = selectBattlePresentation(battle, player.id, content);
    human(battle).units[instance.id].formId = "fixture-persistent-alternate";
    const after = selectBattlePresentation(battle, player.id, content);
    const frozen = after?.boardUnits.find((unit) => unit.id === snapshot.id);
    expect(frozen).toMatchObject({
      formId: "fixture-persistent-form",
      name: "Persistent Fixture Form",
      portrait: "/fixture/persistent-token.png",
    });
    expect(after?.traits).toContainEqual(expect.objectContaining({
      id: "marksman",
      count: 1,
    }));
    expect(preservesActiveBattleTimeline(
      {
        units: before?.boardUnits ?? [],
        selectedId: null,
        interactionMode: "none",
        phase: "battle",
        capacity: 1,
        boardSkin: "pirate-ship",
      },
      {
        units: after?.boardUnits ?? [],
        selectedId: null,
        interactionMode: "none",
        phase: "battle",
        capacity: 1,
        boardSkin: "pirate-ship",
      },
    )).toBe(true);

    const enemy = result.initialUnits.find((unit) => unit.teamId !== player.id);
    const baseSnapshot = {
      ...snapshot,
      id: `${player.id}:base-form-source`,
    };
    delete baseSnapshot.formId;
    result.initialUnits.push(baseSnapshot);
    result.finalUnits.push(structuredClone(baseSnapshot));
    result.events = [
      {
        type: "cast",
        tick: 0,
        sourceId: baseSnapshot.id,
        abilityId: persistentAbility.id,
        targetIds: enemy ? [enemy.id] : [],
      },
      {
        type: "cast",
        tick: 1,
        sourceId: snapshot.id,
        abilityId: persistentAbility.id,
        targetIds: enemy ? [enemy.id] : [],
      },
    ];
    const abilityPresentation = selectBattlePresentation(
      battle,
      player.id,
      content,
    );
    expect(abilityPresentation?.events).toContainEqual(expect.objectContaining({
      kind: "cast",
      sourceId: baseSnapshot.id,
      abilityId: persistentAbility.id,
      abilityName: "Thunderbolt Tempo",
      telegraph: "area",
      deferImpactToAbilityHits: false,
    }));
    expect(abilityPresentation?.events).toContainEqual(expect.objectContaining({
      kind: "cast",
      sourceId: snapshot.id,
      abilityId: persistentAbility.id,
      abilityName: persistentAbility.name,
      telegraph: "target",
      deferImpactToAbilityHits: true,
    }));

    delete snapshot.formId;
    const finalSnapshot = result.finalUnits.find((unit) => unit.id === snapshot.id);
    if (finalSnapshot) delete finalSnapshot.formId;
    const legacy = selectBattlePresentation(battle, player.id, content);
    const legacyUnit = legacy?.boardUnits.find((unit) => unit.id === snapshot.id);
    expect(legacyUnit?.formId).toBeUndefined();
    expect(legacyUnit?.name).toBe(
      content.units.find((unit) => unit.id === "nami")?.name,
    );
    expect(legacy?.traits.some((trait) => trait.id === "marksman")).toBe(false);
    expect(legacy?.traits).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "straw-hat", count: 1 }),
      expect.objectContaining({ id: "specialist", count: 1 }),
    ]));
  });
});
