import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  addUnitToPlayer,
  applyCommand,
  createMatch,
  deserializeMatch,
  getUnitFormDefinition,
  resolvePersistentFormId,
  resolveUnitDefinition,
  serializeMatch,
  simulateBattle,
  type ActiveTrait,
  type BattleSetupUnit,
  type BattleTeam,
  type GameCommand,
  type GameContent,
  type MatchState,
  type PlayerState,
  type SaveEnvelope,
  type TraitEffect,
  type UnitInstance,
} from "../../game";
import {
  selectBattlePresentation,
  selectMatchView,
} from "../../app/selectors";

const DEMONIO_FORM_ID = "robin-demonio-fleur";

function human(state: MatchState): PlayerState {
  const player = state.players.find((candidate) => !candidate.isBot);
  if (!player) throw new Error("Expected a human player fixture.");
  return player;
}

function resetRoster(player: PlayerState): void {
  player.units = {};
  player.board = {};
  player.bench = player.bench.map(() => null);
  player.finalCrew = [];
}

function placeOnBoard(
  player: PlayerState,
  instance: UnitInstance,
  cell = "0,5",
): void {
  const slot = player.bench.indexOf(instance.id);
  if (slot >= 0) player.bench[slot] = null;
  player.board[cell] = instance.id;
}

function run(
  state: MatchState,
  command: GameCommand,
  content: GameContent = DEFAULT_CONTENT,
): MatchState {
  const result = applyCommand(
    state,
    command,
    { actorPlayerId: human(state).id },
    content,
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function clearShopReservations(state: MatchState): void {
  const player = human(state);
  for (let index = 0; index < player.shop.length; index += 1) {
    const offer = player.shop[index];
    if (offer) state.pool[offer] += 1;
    player.shop[index] = null;
  }
}

function forceOffer(state: MatchState, definitionId: string): void {
  const player = human(state);
  const previous = player.shop[0];
  if (previous) state.pool[previous] += 1;
  player.shop[0] = definitionId;
  state.pool[definitionId] -= 1;
}

function buy(state: MatchState, definitionId: string): MatchState {
  forceOffer(state, definitionId);
  return run(state, { type: "BUY_UNIT", shopIndex: 0 });
}

function activeEffects(...effects: TraitEffect[]): ActiveTrait[] {
  return [{
    traitId: "robin-demonio-test",
    count: 1,
    tierIndex: 0,
    tier: { required: 1, label: "Robin Demonio test", effects },
  }];
}

function setupUnit(
  id: string,
  definitionId: string,
  x: number,
  y: number,
  star: 1 | 2 | 3 = 1,
  formId?: string,
): BattleSetupUnit {
  return {
    id,
    definitionId,
    ...(formId ? { formId } : {}),
    star,
    items: [],
    position: { x, y },
  };
}

function team(
  id: string,
  units: BattleSetupUnit[],
  effects: TraitEffect[] = [],
): BattleTeam {
  return { id, units, activeTraits: activeEffects(...effects) };
}

describe("Robin Demonio Fleur production content", () => {
  it("adds exactly the locked form while preserving base Robin and repository contracts", () => {
    const robin = DEFAULT_CONTENT.units.find((unit) => unit.id === "robin");
    const form = getUnitFormDefinition(DEMONIO_FORM_ID);

    expect(DEFAULT_CONTENT.version).toBe("1.16.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(DEFAULT_CONTENT.units).toHaveLength(30);
    expect([1, 2, 3, 4, 5].map((cost) =>
      DEFAULT_CONTENT.units.filter((unit) => unit.cost === cost).length
    )).toEqual([6, 7, 6, 7, 4]);
    expect(DEFAULT_CONTENT.forms).toHaveLength(4);
    expect(form).toEqual({
      id: DEMONIO_FORM_ID,
      baseDefinitionId: "robin",
      name: "Robin — Demonio Fleur",
      lifecycle: "persistent",
      ability: {
        id: "demonio-fleur",
        name: "Demonio Fleur",
        description:
          "Crushes the lowest-health enemy's area, stunning enemies and draining 20 Energy from survivors.",
        targeting: "lowest-health-enemy",
        pattern: "adjacent",
        effect: "damage",
        power: 180,
        castAnimationMs: 500,
        stunMs: 1_400,
        energyDrain: 20,
      },
    });
    expect(form).not.toHaveProperty("stats");
    expect(form).not.toHaveProperty("traits");
    expect(form).not.toHaveProperty("presentation");
    expect(robin).toEqual({
      id: "robin",
      name: "Robin",
      cost: 2,
      traits: ["straw-hat", "revolutionary", "specialist"],
      stats: {
        health: 620,
        attack: 48,
        defense: 16,
        range: 4,
        attackIntervalMs: 1_200,
        moveIntervalMs: 500,
      },
      ability: {
        id: "clutch",
        name: "Clutch",
        description:
          "Damages and immobilizes the enemy while draining 15 Energy from survivors.",
        targeting: "lowest-health-enemy",
        pattern: "single",
        effect: "damage",
        power: 205,
        castAnimationMs: 500,
        stunMs: 1_200,
        energyDrain: 15,
      },
      assetPath: "/assets/characters/robin.png",
    });
  });
});

describe("Robin Demonio Fleur progression and economy", () => {
  it("keeps the normal 1-star to 2-star merge and its deterministic anchor", () => {
    const state = createMatch("robin-two-star");
    const player = human(state);
    resetRoster(player);
    const anchor = addUnitToPlayer(
      state,
      player,
      "robin",
      DEFAULT_CONTENT,
      "black-blade",
    );
    if (!anchor) throw new Error("Expected Robin merge anchor.");
    placeOnBoard(player, anchor, "2,5");
    addUnitToPlayer(state, player, "robin", DEFAULT_CONTENT, "meat-platter");
    addUnitToPlayer(state, player, "robin", DEFAULT_CONTENT, "clima-tact");

    expect(Object.values(player.units)).toHaveLength(1);
    expect(player.units[anchor.id]).toBe(anchor);
    expect(anchor).toMatchObject({
      definitionId: "robin",
      star: 2,
      items: ["black-blade", "meat-platter", "clima-tact"],
      acquiredOrder: anchor.acquiredOrder,
    });
    expect(anchor).not.toHaveProperty("formId");
    expect(resolvePersistentFormId(anchor)).toBeNull();
    expect(player.board["2,5"]).toBe(anchor.id);
    expect(player.inventory).toEqual([]);
  });

  it("uses the normal nine-copy purchase chain, activates Demonio at 3-star, and sells as Robin", () => {
    let state = createMatch("robin-nine-copy");
    clearShopReservations(state);
    human(state).gold = 99;
    const poolBefore = state.pool.robin;

    state = buy(state, "robin");
    const anchor = Object.values(human(state).units).find(
      (unit) => unit.definitionId === "robin",
    );
    if (!anchor) throw new Error("Expected purchased Robin anchor.");
    const anchorOrder = anchor.acquiredOrder;
    placeOnBoard(human(state), anchor, "1,5");
    state = buy(state, "robin");
    state = buy(state, "robin");
    expect(human(state).units[anchor.id]).toMatchObject({
      definitionId: "robin",
      star: 2,
    });
    expect(human(state).units[anchor.id]).not.toHaveProperty("formId");

    for (let copy = 4; copy <= 9; copy += 1) {
      state = buy(state, "robin");
    }

    const robins = Object.values(human(state).units).filter(
      (unit) => unit.definitionId === "robin",
    );
    expect(robins).toEqual([
      expect.objectContaining({
        id: anchor.id,
        definitionId: "robin",
        star: 3,
        formId: DEMONIO_FORM_ID,
        acquiredOrder: anchorOrder,
      }),
    ]);
    expect(human(state).board["1,5"]).toBe(anchor.id);
    expect(resolveUnitDefinition("robin", robins[0].formId)).toMatchObject({
      id: "robin",
      name: "Robin — Demonio Fleur",
      ability: { id: "demonio-fleur" },
    });
    expect(state.pool.robin).toBe(poolBefore - 9);
    expect(state.pool).not.toHaveProperty(DEMONIO_FORM_ID);
    expect(human(state).gold).toBe(99 - 18);
    expect(human(state).shop).not.toContain(DEMONIO_FORM_ID);

    const goldBeforeSale = human(state).gold;
    state = run(state, { type: "SELL_UNIT", unitId: anchor.id });
    expect(state.pool.robin).toBe(poolBefore);
    expect(state.pool).not.toHaveProperty(DEMONIO_FORM_ID);
    expect(human(state).gold).toBe(goldBeforeSale + 18);
    expect(Object.values(human(state).units)).toHaveLength(0);
  });

  it("leaves a normal non-Robin 3-star merge without a form", () => {
    const state = createMatch("non-robin-three-star");
    const player = human(state);
    resetRoster(player);
    const anchor = addUnitToPlayer(state, player, "nami", DEFAULT_CONTENT);
    if (!anchor) throw new Error("Expected Nami merge anchor.");
    for (let copy = 2; copy <= 9; copy += 1) {
      addUnitToPlayer(state, player, "nami", DEFAULT_CONTENT);
    }
    expect(Object.values(player.units)).toEqual([
      expect.objectContaining({
        id: anchor.id,
        definitionId: "nami",
        star: 3,
      }),
    ]);
    expect(anchor).not.toHaveProperty("formId");
  });

  it("applies the same natural three-2-star progression to bots", () => {
    const state = createMatch("bot-robin-three-star");
    const bot = state.players.find((player) => player.isBot);
    if (!bot) throw new Error("Expected a bot player fixture.");
    resetRoster(bot);
    for (let copy = 1; copy <= 8; copy += 1) {
      addUnitToPlayer(state, bot, "robin", DEFAULT_CONTENT);
    }
    expect(Object.values(bot.units).filter((unit) => unit.star === 2))
      .toHaveLength(2);
    expect(Object.values(bot.units).filter((unit) => unit.star === 1))
      .toHaveLength(2);

    addUnitToPlayer(state, bot, "robin", DEFAULT_CONTENT);
    expect(Object.values(bot.units)).toEqual([
      expect.objectContaining({
        definitionId: "robin",
        star: 3,
        formId: DEMONIO_FORM_ID,
      }),
    ]);
  });
});

describe("Robin Demonio Fleur combat", () => {
  it("uses frozen form identity, lowest-health adjacent targeting, control, drain, and normal 3-star scaling", () => {
    const content = structuredClone(DEFAULT_CONTENT);
    for (const [id, health] of [
      ["nami", 1_000],
      ["chopper", 2_000],
      ["luffy", 3_000],
    ] as const) {
      const definition = content.units.find((unit) => unit.id === id);
      if (!definition) throw new Error(`Missing ${id} combat fixture.`);
      definition.stats = {
        ...definition.stats,
        health,
        attack: 1,
        defense: 0,
        range: 0,
        attackIntervalMs: 10_000,
        moveIntervalMs: 10_000,
      };
    }
    const robin = content.units.find((unit) => unit.id === "robin");
    if (!robin) throw new Error("Missing Robin combat fixture.");
    robin.stats.attackIntervalMs = 100;
    const result = simulateBattle(
      team(
        "a",
        [setupUnit("demonio", "robin", 2, 5, 3, DEMONIO_FORM_ID)],
        [{ kind: "starting-energy", value: 90 }],
      ),
      team(
        "b",
        [
          setupUnit("lowest", "nami", 2, 3),
          setupUnit("adjacent", "chopper", 3, 3),
          setupUnit("distant", "luffy", 5, 5),
        ],
        [{ kind: "starting-energy", value: 40 }],
      ),
      { seed: "robin-demonio-combat", maxTicks: 2 },
      content,
    );

    expect(result.initialUnits.find((unit) => unit.id === "demonio"))
      .toMatchObject({
        definitionId: "robin",
        formId: DEMONIO_FORM_ID,
        star: 3,
        maxHp: 2_008,
        attack: 155,
        defense: 51,
        range: 4,
      });
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "cast",
      sourceId: "demonio",
      abilityId: "demonio-fleur",
      targetIds: ["adjacent", "lowest"],
    }));
    expect(result.events.filter((event) =>
      event.type === "damage" &&
      event.sourceId === "demonio" &&
      event.damageKind === "ability"
    )).toMatchObject([
      { targetId: "adjacent", amount: 405, damageKind: "ability" },
      { targetId: "lowest", amount: 405, damageKind: "ability" },
    ]);
    expect(result.events.filter((event) =>
      event.type === "status" && event.status === "stun"
    )).toMatchObject([
      { targetId: "adjacent", durationTicks: 14 },
      { targetId: "lowest", durationTicks: 14 },
    ]);
    expect(result.events.filter((event) =>
      event.type === "energy" && event.reason === "ability-drain"
    )).toMatchObject([
      { unitId: "adjacent", amount: -20 },
      { unitId: "lowest", amount: -20 },
    ]);
    expect(result.events.some((event) =>
      event.type === "damage" &&
      event.damageKind === "ability" &&
      event.targetId === "distant"
    )).toBe(false);
    expect(resolveUnitDefinition("robin", undefined)?.ability.id).toBe("clutch");
  });
});

describe("Robin Demonio Fleur battle-economy freeze", () => {
  it("keeps the active 2-star base snapshot frozen when the ninth purchase creates persistent Demonio", () => {
    let state = createMatch("robin-active-battle-freeze");
    clearShopReservations(state);
    human(state).gold = 99;
    state = buy(state, "robin");
    const anchor = Object.values(human(state).units).find(
      (unit) => unit.definitionId === "robin",
    );
    if (!anchor) throw new Error("Expected Robin battle anchor.");
    placeOnBoard(human(state), anchor, "0,5");
    for (let copy = 2; copy <= 8; copy += 1) {
      state = buy(state, "robin");
    }
    expect(human(state).units[anchor.id]).toMatchObject({ star: 2 });
    expect(human(state).units[anchor.id]).not.toHaveProperty("formId");
    forceOffer(state, "robin");
    state = run(state, { type: "END_PREPARATION" });

    const frozenResults = structuredClone(state.lastResults);
    const initial = state.lastResults
      .flatMap((result) => result.initialUnits)
      .find((unit) => unit.id.endsWith(`:${anchor.id}`));
    expect(initial).toMatchObject({ definitionId: "robin", star: 2 });
    expect(initial).not.toHaveProperty("formId");

    state = run(state, { type: "BUY_UNIT", shopIndex: 0 });
    expect(human(state).units[anchor.id]).toMatchObject({
      definitionId: "robin",
      star: 3,
      formId: DEMONIO_FORM_ID,
    });
    expect(state.lastResults).toEqual(frozenResults);
    const stillFrozen = state.lastResults
      .flatMap((result) => result.initialUnits)
      .find((unit) => unit.id.endsWith(`:${anchor.id}`));
    expect(stillFrozen).toMatchObject({ definitionId: "robin", star: 2 });
    expect(stillFrozen).not.toHaveProperty("formId");
    expect(resolveUnitDefinition(
      stillFrozen?.definitionId ?? "",
      stillFrozen?.formId,
    )?.ability.id).toBe("clutch");
    const presentation = selectBattlePresentation(state, human(state).id);
    expect(presentation?.boardUnits.find((unit) => unit.id === stillFrozen?.id))
      .toMatchObject({ name: "Robin", star: 2 });
    expect(presentation?.traits).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "straw-hat", count: 1 }),
      expect.objectContaining({ id: "revolutionary", count: 1 }),
      expect.objectContaining({ id: "specialist", count: 1 }),
    ]));
  });
});

describe("Robin Demonio Fleur schema-6 persistence", () => {
  it("reconciles persistent current state while preserving frozen battles and unrelated unknown IDs", () => {
    let state = createMatch("legacy-robin-form");
    const player = human(state);
    resetRoster(player);
    const legacy: UnitInstance = {
      id: "legacy-robin",
      definitionId: "robin",
      star: 3,
      items: [],
      acquiredOrder: 1,
    };
    player.units = {
      [legacy.id]: legacy,
      "invalid-robin": {
        id: "invalid-robin",
        definitionId: "robin",
        formId: DEMONIO_FORM_ID,
        star: 2,
        items: [],
        acquiredOrder: 2,
      },
      "unknown-nami": {
        id: "unknown-nami",
        definitionId: "nami",
        formId: "unknown-future-form",
        star: 1,
        items: [],
        acquiredOrder: 3,
      },
    };
    player.bench[0] = "invalid-robin";
    player.bench[1] = "unknown-nami";
    placeOnBoard(player, legacy);
    player.finalCrew = [
      { ...legacy, id: "final-legacy-robin" },
      {
        ...legacy,
        id: "final-invalid-robin",
        star: 1,
        formId: DEMONIO_FORM_ID,
      },
      {
        ...legacy,
        id: "final-unknown-zoro",
        definitionId: "zoro",
        star: 2,
        formId: "unknown-future-form",
      },
    ];
    state = run(state, { type: "END_PREPARATION" });
    const legacySnapshot = state.lastResults
      .flatMap((result) => result.initialUnits)
      .find((unit) => unit.id.endsWith(`:${legacy.id}`));
    expect(legacySnapshot).toMatchObject({ definitionId: "robin", star: 3 });
    expect(legacySnapshot).not.toHaveProperty("formId");

    const raw = JSON.parse(serializeMatch(state, "legacy")) as SaveEnvelope;
    raw.contentVersion = "1.12.0";
    raw.match.contentVersion = "1.12.0";
    const restored = deserializeMatch(JSON.stringify(raw));
    const restoredPlayer = human(restored);

    expect(restored.schemaVersion).toBe(6);
    expect(restored.contentVersion).toBe("1.16.0");
    expect(restoredPlayer.units[legacy.id]).toMatchObject({
      definitionId: "robin",
      star: 3,
      formId: DEMONIO_FORM_ID,
    });
    expect(restoredPlayer.units["invalid-robin"]).not.toHaveProperty("formId");
    expect(restoredPlayer.units["unknown-nami"].formId).toBe(
      "unknown-future-form",
    );
    expect(restoredPlayer.finalCrew.find(
      (unit) => unit.id === "final-legacy-robin",
    )).toMatchObject({ formId: DEMONIO_FORM_ID });
    expect(restoredPlayer.finalCrew.find(
      (unit) => unit.id === "final-invalid-robin",
    )).not.toHaveProperty("formId");
    expect(restoredPlayer.finalCrew.find(
      (unit) => unit.id === "final-unknown-zoro",
    )).toMatchObject({ formId: "unknown-future-form" });
    const frozenAfterLoad = restored.lastResults
      .flatMap((result) => result.initialUnits)
      .find((unit) => unit.id === legacySnapshot?.id);
    expect(frozenAfterLoad).toMatchObject({ definitionId: "robin", star: 3 });
    expect(frozenAfterLoad).not.toHaveProperty("formId");

    const roundTripped = deserializeMatch(serializeMatch(restored, "current"));
    expect(human(roundTripped).units[legacy.id].formId).toBe(DEMONIO_FORM_ID);
  });
});

describe("Robin Demonio Fleur selectors and presentation", () => {
  it("shows the form for persistent, battle, and final-crew identity while keeping the shop base-only", () => {
    let state = createMatch("robin-form-presentation");
    const player = human(state);
    resetRoster(player);
    const instance: UnitInstance = {
      id: "demonio-robin",
      definitionId: "robin",
      formId: DEMONIO_FORM_ID,
      star: 3,
      items: [],
      acquiredOrder: 1,
    };
    player.units[instance.id] = instance;
    placeOnBoard(player, instance);
    player.shop[0] = "robin";

    const planning = selectMatchView(state);
    expect(planning.boardUnits.find((unit) => unit.id === instance.id))
      .toMatchObject({
        contentId: "robin",
        formId: DEMONIO_FORM_ID,
        name: "Robin — Demonio Fleur",
        star: 3,
        portrait: "/assets/tokens/robin.png",
      });
    expect(planning.selectedDefinitionByUnit.get(instance.id)).toMatchObject({
      id: "robin",
      name: "Robin — Demonio Fleur",
      portrait: "/assets/portraits/robin.png",
      token: "/assets/tokens/robin.png",
      traits: ["straw-hat", "revolutionary", "specialist"],
      stats: { health: 620, attack: 48, defense: 16 },
      ability: { name: "Demonio Fleur", power: 180 },
    });
    expect(planning.shop[0]).toMatchObject({
      id: "robin",
      name: "Robin",
      ability: { name: "Clutch", power: 205 },
    });

    state = run(state, { type: "END_PREPARATION" });
    const snapshot = state.lastResults
      .flatMap((result) => result.initialUnits)
      .find((unit) => unit.id.endsWith(`:${instance.id}`));
    expect(snapshot).toMatchObject({
      definitionId: "robin",
      formId: DEMONIO_FORM_ID,
      star: 3,
    });
    expect(selectBattlePresentation(state, player.id)?.boardUnits.find(
      (unit) => unit.id === snapshot?.id,
    )).toMatchObject({
      formId: DEMONIO_FORM_ID,
      name: "Robin — Demonio Fleur",
      portrait: "/assets/tokens/robin.png",
    });

    const resultState = structuredClone(state);
    const resultPlayer = human(resultState);
    resultPlayer.finalCrew = [structuredClone(resultPlayer.units[instance.id])];
    resultPlayer.units = {};
    resultPlayer.board = {};
    resultState.phase = "game-over";
    const resultView = selectMatchView(resultState);
    expect(resultView.resultCrew).toEqual([
      expect.objectContaining({
        contentId: "robin",
        formId: DEMONIO_FORM_ID,
        name: "Robin — Demonio Fleur",
        star: 3,
        portrait: "/assets/tokens/robin.png",
      }),
    ]);
    expect(resultView.selectedDefinitionByUnit.get(`final:${instance.id}`))
      .toMatchObject({
        name: "Robin — Demonio Fleur",
        ability: { name: "Demonio Fleur" },
      });
  });
});
