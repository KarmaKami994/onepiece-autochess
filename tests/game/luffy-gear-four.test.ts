import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  addUnitToPlayer,
  applyCommand,
  createMatch,
  deserializeMatch,
  getUnitFormDefinition,
  reconcileProductionFormProgression,
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

const BOUNDMAN_FORM_ID = "luffy-gear-4-boundman";
const SNAKEMAN_FORM_ID = "luffy-gear-4-snakeman";

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

function runAs(
  state: MatchState,
  playerId: string,
  command: GameCommand,
  content: GameContent = DEFAULT_CONTENT,
): MatchState {
  const result = applyCommand(state, command, { actorPlayerId: playerId }, content);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function run(
  state: MatchState,
  command: GameCommand,
  content: GameContent = DEFAULT_CONTENT,
): MatchState {
  return runAs(state, human(state).id, command, content);
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

function addLuffys(
  state: MatchState,
  player: PlayerState,
  itemIds: Array<string | null>,
): UnitInstance {
  const anchor = addUnitToPlayer(
    state,
    player,
    "luffy",
    DEFAULT_CONTENT,
    itemIds[0] ?? null,
  );
  if (!anchor) throw new Error("Expected Luffy merge anchor.");
  for (const itemId of itemIds.slice(1)) {
    addUnitToPlayer(state, player, "luffy", DEFAULT_CONTENT, itemId);
  }
  return anchor;
}

function activeEffects(...effects: TraitEffect[]): ActiveTrait[] {
  return [{
    traitId: "luffy-gear-four-test",
    count: 1,
    tierIndex: 0,
    tier: { required: 1, label: "Luffy Gear 4 test", effects },
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

describe("Luffy Gear 4 production content", () => {
  it("adds only the two locked forms and leaves base Luffy unchanged", () => {
    const luffy = DEFAULT_CONTENT.units.find((unit) => unit.id === "luffy");
    const boundman = getUnitFormDefinition(BOUNDMAN_FORM_ID);
    const snakeman = getUnitFormDefinition(SNAKEMAN_FORM_ID);

    expect(DEFAULT_CONTENT.version).toBe("1.14.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(DEFAULT_CONTENT.units).toHaveLength(30);
    expect(DEFAULT_CONTENT.forms).toHaveLength(3);
    expect(DEFAULT_CONTENT.forms.map((form) => form.id)).toEqual([
      "robin-demonio-fleur",
      BOUNDMAN_FORM_ID,
      SNAKEMAN_FORM_ID,
    ]);
    expect(boundman).toEqual({
      id: BOUNDMAN_FORM_ID,
      baseDefinitionId: "luffy",
      name: "Luffy — Gear 4: Boundman",
      lifecycle: "persistent",
      stats: {
        health: 990,
        attack: 86,
        defense: 34,
        range: 1,
        attackIntervalMs: 1_000,
      },
      ability: {
        id: "kong-gun",
        name: "Kong Gun",
        description:
          "Drives a hardened fist into the nearest enemy, stunning and blasting a surviving target backward.",
        targeting: "nearest-enemy",
        pattern: "single",
        effect: "damage",
        power: 285,
        castAnimationMs: 500,
        stunMs: 600,
        signatureMechanics: [{ kind: "knockback" }],
      },
    });
    expect(snakeman).toEqual({
      id: SNAKEMAN_FORM_ID,
      baseDefinitionId: "luffy",
      name: "Luffy — Gear 4: Snakeman",
      lifecycle: "persistent",
      stats: {
        health: 850,
        attack: 78,
        defense: 24,
        range: 4,
        attackIntervalMs: 700,
      },
      ability: {
        id: "jet-culverin",
        name: "Jet Culverin",
        description:
          "Launches four accelerating strikes at a weakened enemy, redirecting remaining blows after a knockout.",
        targeting: "lowest-health-enemy",
        pattern: "single",
        effect: "damage",
        power: 300,
        castAnimationMs: 500,
        sequentialStrike: {
          hitWeightsBasisPoints: [2_500, 2_500, 2_500, 2_500],
          retargetOnKill: "nearest-in-range",
        },
      },
    });
    for (const form of [boundman, snakeman]) {
      expect(form).not.toHaveProperty("traits");
      expect(form).not.toHaveProperty("presentation");
      expect(form?.stats).not.toHaveProperty("moveIntervalMs");
    }
    expect(luffy).toEqual({
      id: "luffy",
      name: "Luffy",
      cost: 3,
      traits: ["straw-hat", "supernova", "brotherhood", "captain", "brawler"],
      stats: {
        health: 900,
        attack: 80,
        defense: 28,
        range: 2,
        attackIntervalMs: 900,
        moveIntervalMs: 400,
      },
      ability: {
        id: "gum-gum-gatling",
        name: "Gum-Gum Gatling",
        description:
          "Unleashes a rapid three-hit Gatling barrage across nearby enemies, blasting surviving targets backward.",
        targeting: "nearest-enemy",
        pattern: "adjacent",
        effect: "damage",
        power: 75,
        castAnimationMs: 500,
        hits: 3,
        signatureMechanics: [{ kind: "knockback" }],
      },
      assetPath: "/assets/characters/luffy.png",
    });
  });
});

describe("Luffy Gear 4 progression", () => {
  it("stays base through the normal merge chain when no catalyst is retained", () => {
    const state = createMatch("luffy-no-catalyst");
    const player = human(state);
    resetRoster(player);
    const anchor = addUnitToPlayer(state, player, "luffy", DEFAULT_CONTENT);
    if (!anchor) throw new Error("Expected Luffy merge anchor.");
    const acquiredOrder = anchor.acquiredOrder;
    placeOnBoard(player, anchor, "2,5");
    addUnitToPlayer(state, player, "luffy", DEFAULT_CONTENT);
    addUnitToPlayer(state, player, "luffy", DEFAULT_CONTENT);
    expect(anchor).toMatchObject({ definitionId: "luffy", star: 2 });
    expect(anchor).not.toHaveProperty("formId");
    expect(anchor.acquiredOrder).toBe(acquiredOrder);
    expect(player.board["2,5"]).toBe(anchor.id);
    expect(resolveUnitDefinition(anchor.definitionId, anchor.formId)?.ability.id)
      .toBe("gum-gum-gatling");
    for (let copy = 4; copy <= 9; copy += 1) {
      addUnitToPlayer(state, player, "luffy", DEFAULT_CONTENT);
    }
    expect(anchor).toMatchObject({ definitionId: "luffy", star: 3 });
    expect(anchor).not.toHaveProperty("formId");
    expect(anchor.acquiredOrder).toBe(acquiredOrder);
    expect(player.board["2,5"]).toBe(anchor.id);
    expect(resolvePersistentFormId(anchor)).toBeNull();
    expect(resolveUnitDefinition(anchor.definitionId, anchor.formId)?.ability)
      .toMatchObject({
        id: "gum-gum-gatling",
        power: 75,
        targeting: "nearest-enemy",
        pattern: "adjacent",
        hits: 3,
        signatureMechanics: [{ kind: "knockback" }],
      });
  });

  it("selects the first retained catalyst deterministically and locks the branch", () => {
    for (const fixture of [
      {
        seed: "boundman-first",
        items: ["armament-wraps", "sniper-goggles"],
        expected: BOUNDMAN_FORM_ID,
      },
      {
        seed: "snakeman-first",
        items: ["sniper-goggles", "armament-wraps"],
        expected: SNAKEMAN_FORM_ID,
      },
    ]) {
      const state = createMatch(fixture.seed);
      const player = human(state);
      resetRoster(player);
      const anchor = addLuffys(state, player, [
        ...fixture.items,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
      expect(anchor).toMatchObject({
        definitionId: "luffy",
        star: 3,
        formId: fixture.expected,
        items: fixture.items,
      });
      expect(resolvePersistentFormId(anchor)).toBe(fixture.expected);

      const otherCatalyst = fixture.expected === BOUNDMAN_FORM_ID
        ? "sniper-goggles"
        : "armament-wraps";
      player.inventory.push(otherCatalyst);
      const equipped = run(state, {
        type: "EQUIP_ITEM",
        unitId: anchor.id,
        itemId: otherCatalyst,
      });
      expect(human(equipped).units[anchor.id]).toMatchObject({
        formId: fixture.expected,
        items: [...fixture.items, otherCatalyst],
      });
    }
  });

  it("selects on 3-star equip, waits at 2-star, and does not consume catalysts", () => {
    let state = createMatch("luffy-equip-selection");
    const player = human(state);
    resetRoster(player);
    const anchor = addLuffys(state, player, Array(9).fill(null));
    player.inventory.push("armament-wraps");
    state = run(state, {
      type: "EQUIP_ITEM",
      unitId: anchor.id,
      itemId: "armament-wraps",
    });
    expect(human(state).units[anchor.id]).toMatchObject({
      star: 3,
      formId: BOUNDMAN_FORM_ID,
      items: ["armament-wraps"],
    });
    expect(human(state).inventory).not.toContain("armament-wraps");

    const twoStarState = createMatch("luffy-two-star-equip");
    const twoStarPlayer = human(twoStarState);
    resetRoster(twoStarPlayer);
    const twoStar = addLuffys(twoStarState, twoStarPlayer, Array(3).fill(null));
    twoStarPlayer.inventory.push("sniper-goggles");
    const equippedTwoStar = run(twoStarState, {
      type: "EQUIP_ITEM",
      unitId: twoStar.id,
      itemId: "sniper-goggles",
    });
    expect(human(equippedTwoStar).units[twoStar.id]).toMatchObject({
      star: 2,
      items: ["sniper-goggles"],
    });
    expect(human(equippedTwoStar).units[twoStar.id]).not.toHaveProperty("formId");
    for (let copy = 4; copy <= 9; copy += 1) {
      addUnitToPlayer(
        equippedTwoStar,
        human(equippedTwoStar),
        "luffy",
        DEFAULT_CONTENT,
      );
    }
    expect(human(equippedTwoStar).units[twoStar.id]).toMatchObject({
      star: 3,
      formId: SNAKEMAN_FORM_ID,
      items: ["sniper-goggles"],
    });

    const directSnakemanState = createMatch("luffy-direct-snakeman-equip");
    const directSnakemanPlayer = human(directSnakemanState);
    resetRoster(directSnakemanPlayer);
    const directSnakeman = addLuffys(
      directSnakemanState,
      directSnakemanPlayer,
      Array(9).fill(null),
    );
    directSnakemanPlayer.inventory.push("sniper-goggles");
    const selectedSnakeman = run(directSnakemanState, {
      type: "EQUIP_ITEM",
      unitId: directSnakeman.id,
      itemId: "sniper-goggles",
    });
    expect(human(selectedSnakeman).units[directSnakeman.id]).toMatchObject({
      star: 3,
      formId: SNAKEMAN_FORM_ID,
      items: ["sniper-goggles"],
    });
  });

  it("selects only from retained merge items and returns overflow catalysts", () => {
    const state = createMatch("luffy-overflow-catalyst");
    const player = human(state);
    resetRoster(player);
    const anchor = addLuffys(state, player, [
      "black-blade",
      "meat-platter",
      "clima-tact",
      "armament-wraps",
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(anchor).toMatchObject({
      star: 3,
      items: ["black-blade", "meat-platter", "clima-tact"],
    });
    expect(anchor).not.toHaveProperty("formId");
    expect(player.inventory).toContain("armament-wraps");
  });

  it("clears only invalid known low-star forms and preserves unknown IDs", () => {
    const lowBoundman: UnitInstance = {
      id: "low-boundman",
      definitionId: "luffy",
      formId: BOUNDMAN_FORM_ID,
      star: 2,
      items: ["armament-wraps"],
      acquiredOrder: 1,
    };
    const unknown: UnitInstance = {
      id: "future-luffy",
      definitionId: "luffy",
      formId: "future-luffy-form",
      star: 3,
      items: ["armament-wraps"],
      acquiredOrder: 2,
    };
    reconcileProductionFormProgression(lowBoundman);
    reconcileProductionFormProgression(unknown);
    expect(lowBoundman).not.toHaveProperty("formId");
    expect(unknown.formId).toBe("future-luffy-form");
  });

  it("uses the same natural retained-catalyst merge path for bots", () => {
    const state = createMatch("bot-luffy-gear-four");
    const bot = state.players.find((player) => player.isBot);
    if (!bot) throw new Error("Expected a bot player fixture.");
    resetRoster(bot);
    const anchor = addLuffys(state, bot, [
      "sniper-goggles",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(bot.units[anchor.id]).toMatchObject({
      definitionId: "luffy",
      star: 3,
      formId: SNAKEMAN_FORM_ID,
      items: ["sniper-goggles"],
    });
  });

  it("leaves non-Luffy merges unchanged and preserves Robin's production rule", () => {
    const state = createMatch("other-form-progression");
    const player = human(state);
    resetRoster(player);
    const nami = addUnitToPlayer(state, player, "nami", DEFAULT_CONTENT);
    if (!nami) throw new Error("Expected Nami merge anchor.");
    for (let copy = 2; copy <= 9; copy += 1) {
      addUnitToPlayer(state, player, "nami", DEFAULT_CONTENT);
    }
    expect(nami).toMatchObject({ definitionId: "nami", star: 3 });
    expect(nami).not.toHaveProperty("formId");

    resetRoster(player);
    const robin = addUnitToPlayer(state, player, "robin", DEFAULT_CONTENT);
    if (!robin) throw new Error("Expected Robin merge anchor.");
    for (let copy = 2; copy <= 9; copy += 1) {
      addUnitToPlayer(state, player, "robin", DEFAULT_CONTENT);
    }
    expect(robin).toMatchObject({
      definitionId: "robin",
      star: 3,
      formId: "robin-demonio-fleur",
    });
  });
});

describe("Luffy Gear 4 economy", () => {
  it("keeps both branches on base Luffy shop, pool, purchase, and sell accounting", () => {
    for (const fixture of [
      { seed: "boundman-economy", catalyst: "armament-wraps", formId: BOUNDMAN_FORM_ID },
      { seed: "snakeman-economy", catalyst: "sniper-goggles", formId: SNAKEMAN_FORM_ID },
    ]) {
      let state = createMatch(fixture.seed);
      clearShopReservations(state);
      human(state).gold = 99;
      const poolBefore = state.pool.luffy;
      state = buy(state, "luffy");
      const anchor = Object.values(human(state).units).find(
        (unit) => unit.definitionId === "luffy",
      );
      if (!anchor) throw new Error("Expected purchased Luffy anchor.");
      state = buy(state, "luffy");
      state = buy(state, "luffy");
      human(state).inventory.push(fixture.catalyst);
      state = run(state, {
        type: "EQUIP_ITEM",
        unitId: anchor.id,
        itemId: fixture.catalyst,
      });
      for (let copy = 4; copy <= 9; copy += 1) state = buy(state, "luffy");

      expect(human(state).units[anchor.id]).toMatchObject({
        definitionId: "luffy",
        star: 3,
        formId: fixture.formId,
        items: [fixture.catalyst],
      });
      expect(state.pool.luffy).toBe(poolBefore - 9);
      expect(state.pool).not.toHaveProperty(fixture.formId);
      expect(human(state).shop).not.toContain(fixture.formId);
      expect(human(state).gold).toBe(72);

      const goldBeforeSale = human(state).gold;
      state = run(state, { type: "SELL_UNIT", unitId: anchor.id });
      expect(state.pool.luffy).toBe(poolBefore);
      expect(human(state).gold).toBe(goldBeforeSale + 27);
      expect(human(state).inventory).toContain(fixture.catalyst);
    }
  });
});

describe("Luffy Gear 4 combat", () => {
  it("resolves Boundman stats, single-target Kong Gun, stun, and knockback", () => {
    const content = structuredClone(DEFAULT_CONTENT);
    for (const id of ["nami", "chopper"] as const) {
      const enemy = content.units.find((unit) => unit.id === id);
      if (!enemy) throw new Error(`Missing ${id} combat fixture.`);
      enemy.stats = {
        ...enemy.stats,
        health: 2_000,
        attack: 1,
        defense: 0,
        range: 0,
        attackIntervalMs: 10_000,
        moveIntervalMs: 10_000,
      };
    }
    const result = simulateBattle(
      team(
        "a",
        [setupUnit("boundman", "luffy", 2, 5, 3, BOUNDMAN_FORM_ID)],
        [{ kind: "starting-energy", value: 100 }],
      ),
      team("b", [
        setupUnit("primary", "nami", 2, 4),
        setupUnit("adjacent", "chopper", 3, 4),
      ]),
      { seed: "boundman-combat", maxTicks: 1 },
      content,
    );

    expect(resolveUnitDefinition("luffy", BOUNDMAN_FORM_ID)?.stats).toEqual({
      health: 990,
      attack: 86,
      defense: 34,
      range: 1,
      attackIntervalMs: 1_000,
      moveIntervalMs: 400,
    });
    expect(result.initialUnits.find((unit) => unit.id === "boundman"))
      .toMatchObject({
        formId: BOUNDMAN_FORM_ID,
        maxHp: 3_207,
        attack: 278,
        defense: 110,
        range: 1,
      });
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "cast",
      sourceId: "boundman",
      abilityId: "kong-gun",
      targetIds: ["primary"],
    }));
    expect(result.events.filter((event) =>
      event.type === "damage" &&
      event.sourceId === "boundman" &&
      event.damageKind === "ability"
    )).toMatchObject([{ targetId: "primary", amount: 641 }]);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "status",
      sourceId: "boundman",
      targetId: "primary",
      status: "stun",
      durationTicks: 6,
    }));
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "unit-displace",
      sourceId: "boundman",
      unitId: "primary",
      abilityId: "kong-gun",
      movementKind: "knockback",
    }));
    expect(result.events.some((event) =>
      event.type === "damage" && event.targetId === "adjacent"
    )).toBe(false);
  });

  it("uses Snakeman's lowest-health four-strike budget and retargets after a knockout", () => {
    const content = structuredClone(DEFAULT_CONTENT);
    const form = content.forms.find((candidate) => candidate.id === SNAKEMAN_FORM_ID);
    if (!form?.stats) throw new Error("Missing Snakeman form fixture.");
    form.stats.attackIntervalMs = 100;
    for (const [id, health] of [["nami", 350], ["chopper", 2_000]] as const) {
      const enemy = content.units.find((unit) => unit.id === id);
      if (!enemy) throw new Error(`Missing ${id} combat fixture.`);
      enemy.stats = {
        ...enemy.stats,
        health,
        attack: 1,
        defense: 0,
        range: 0,
        attackIntervalMs: 10_000,
        moveIntervalMs: 10_000,
      };
    }
    const result = simulateBattle(
      team(
        "a",
        [setupUnit("snakeman", "luffy", 2, 5, 3, SNAKEMAN_FORM_ID)],
        [{ kind: "starting-energy", value: 90 }],
      ),
      team("b", [
        setupUnit("weak", "nami", 2, 3),
        setupUnit("next", "chopper", 5, 5),
      ]),
      { seed: "snakeman-combat", maxTicks: 2 },
      content,
    );

    expect(resolveUnitDefinition("luffy", SNAKEMAN_FORM_ID)?.stats).toEqual({
      health: 850,
      attack: 78,
      defense: 24,
      range: 4,
      attackIntervalMs: 700,
      moveIntervalMs: 400,
    });
    expect(result.initialUnits.find((unit) => unit.id === "snakeman"))
      .toMatchObject({
        formId: SNAKEMAN_FORM_ID,
        maxHp: 2_754,
        attack: 252,
        defense: 77,
        range: 4,
      });
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "cast",
      sourceId: "snakeman",
      abilityId: "jet-culverin",
      targetIds: ["weak"],
    }));
    expect(result.events.filter((event) => event.type === "ability-hit"))
      .toMatchObject([
        { targetId: "weak", hitIndex: 1, hitCount: 4, finisher: false },
        { targetId: "next", hitIndex: 2, hitCount: 4, finisher: false },
        { targetId: "next", hitIndex: 3, hitCount: 4, finisher: false },
        { targetId: "next", hitIndex: 4, hitCount: 4, finisher: false },
      ]);
    const abilityDamage = result.events.filter((event) =>
      event.type === "damage" &&
      event.sourceId === "snakeman" &&
      event.damageKind === "ability"
    );
    expect(abilityDamage).toMatchObject([
      { targetId: "weak", amount: 98 },
      { targetId: "next", amount: 168 },
      { targetId: "next", amount: 168 },
      { targetId: "next", amount: 171 },
    ]);
    expect(abilityDamage.reduce(
      (sum, event) => sum + (event.type === "damage" ? event.amount : 0),
      0,
    )).toBe(605);
    expect(result.events.some((event) =>
      event.type === "unit-displace" || event.type === "status"
    )).toBe(false);
    expect(result.events.some((event) =>
      event.type === "energy" && event.reason === "ability-drain"
    )).toBe(false);
  });
});

describe("Luffy Gear 4 battle-economy freeze", () => {
  it("keeps the active base timeline frozen when the ninth purchase creates Boundman", () => {
    let state = createMatch("luffy-active-battle-freeze");
    clearShopReservations(state);
    human(state).gold = 99;
    state = buy(state, "luffy");
    const anchor = Object.values(human(state).units).find(
      (unit) => unit.definitionId === "luffy",
    );
    if (!anchor) throw new Error("Expected Luffy battle anchor.");
    placeOnBoard(human(state), anchor, "0,5");
    state = buy(state, "luffy");
    state = buy(state, "luffy");
    human(state).inventory.push("armament-wraps");
    state = run(state, {
      type: "EQUIP_ITEM",
      unitId: anchor.id,
      itemId: "armament-wraps",
    });
    for (let copy = 4; copy <= 8; copy += 1) state = buy(state, "luffy");
    expect(human(state).units[anchor.id]).toMatchObject({ star: 2 });
    expect(human(state).units[anchor.id]).not.toHaveProperty("formId");
    forceOffer(state, "luffy");
    state = run(state, { type: "END_PREPARATION" });

    const frozenResults = structuredClone(state.lastResults);
    const before = state.lastResults
      .flatMap((result) => result.initialUnits)
      .find((unit) => unit.id.endsWith(`:${anchor.id}`));
    expect(before).toMatchObject({ definitionId: "luffy", star: 2 });
    expect(before).not.toHaveProperty("formId");

    state = run(state, { type: "BUY_UNIT", shopIndex: 0 });
    expect(human(state).units[anchor.id]).toMatchObject({
      definitionId: "luffy",
      star: 3,
      formId: BOUNDMAN_FORM_ID,
      items: ["armament-wraps"],
    });
    expect(state.lastResults).toEqual(frozenResults);
    const after = state.lastResults
      .flatMap((result) => result.initialUnits)
      .find((unit) => unit.id === before?.id);
    expect(after).toMatchObject({ definitionId: "luffy", star: 2 });
    expect(after).not.toHaveProperty("formId");
    expect(resolveUnitDefinition(after?.definitionId ?? "", after?.formId)?.ability.id)
      .toBe("gum-gum-gatling");
    const presentation = selectBattlePresentation(state, human(state).id);
    expect(presentation?.boardUnits.find((unit) => unit.id === after?.id))
      .toMatchObject({ name: "Luffy", star: 2 });
  });
});

describe("Luffy Gear 4 schema-6 persistence", () => {
  it("round-trips selected forms and reconciles legacy persistent state without rewriting frozen results", () => {
    let state = createMatch("legacy-luffy-forms");
    const player = human(state);
    resetRoster(player);
    const instances: UnitInstance[] = [
      { id: "bound", definitionId: "luffy", formId: BOUNDMAN_FORM_ID, star: 3, items: ["sniper-goggles"], acquiredOrder: 1 },
      { id: "snake", definitionId: "luffy", formId: SNAKEMAN_FORM_ID, star: 3, items: ["armament-wraps"], acquiredOrder: 2 },
      { id: "legacy-arm", definitionId: "luffy", star: 3, items: ["armament-wraps"], acquiredOrder: 3 },
      { id: "legacy-scope", definitionId: "luffy", star: 3, items: ["sniper-goggles"], acquiredOrder: 4 },
      { id: "legacy-both-arm", definitionId: "luffy", star: 3, items: ["armament-wraps", "sniper-goggles"], acquiredOrder: 5 },
      { id: "legacy-both-scope", definitionId: "luffy", star: 3, items: ["sniper-goggles", "armament-wraps"], acquiredOrder: 6 },
      { id: "legacy-none", definitionId: "luffy", star: 3, items: [], acquiredOrder: 7 },
      { id: "low-bound", definitionId: "luffy", formId: BOUNDMAN_FORM_ID, star: 2, items: ["armament-wraps"], acquiredOrder: 8 },
      { id: "low-snake", definitionId: "luffy", formId: SNAKEMAN_FORM_ID, star: 1, items: ["sniper-goggles"], acquiredOrder: 9 },
      { id: "unknown", definitionId: "luffy", formId: "future-luffy-form", star: 3, items: ["armament-wraps"], acquiredOrder: 10 },
      { id: "legacy-robin", definitionId: "robin", star: 3, items: [], acquiredOrder: 11 },
    ];
    player.units = Object.fromEntries(instances.map((instance) => [instance.id, instance]));
    placeOnBoard(player, player.units["legacy-scope"]);
    player.bench = player.bench.map(() => null);
    player.bench[0] = "bound";
    player.bench[1] = "snake";
    player.finalCrew = instances.map((instance) => ({
      ...structuredClone(instance),
      id: `final-${instance.id}`,
    }));
    state = run(state, { type: "END_PREPARATION" });
    const frozen = state.lastResults
      .flatMap((result) => result.initialUnits)
      .find((unit) => unit.id.endsWith(":legacy-scope"));
    expect(frozen).toMatchObject({ definitionId: "luffy", star: 3 });
    expect(frozen).not.toHaveProperty("formId");

    const raw = JSON.parse(serializeMatch(state, "legacy")) as SaveEnvelope;
    raw.contentVersion = "1.13.0";
    raw.match.contentVersion = "1.13.0";
    const restored = deserializeMatch(JSON.stringify(raw));
    const restoredPlayer = human(restored);

    expect(restored.schemaVersion).toBe(6);
    expect(restored.contentVersion).toBe("1.14.0");
    expect(restoredPlayer.units.bound.formId).toBe(BOUNDMAN_FORM_ID);
    expect(restoredPlayer.units.snake.formId).toBe(SNAKEMAN_FORM_ID);
    expect(restoredPlayer.units["legacy-arm"].formId).toBe(BOUNDMAN_FORM_ID);
    expect(restoredPlayer.units["legacy-scope"].formId).toBe(SNAKEMAN_FORM_ID);
    expect(restoredPlayer.units["legacy-both-arm"].formId).toBe(BOUNDMAN_FORM_ID);
    expect(restoredPlayer.units["legacy-both-scope"].formId).toBe(SNAKEMAN_FORM_ID);
    expect(restoredPlayer.units["legacy-none"]).not.toHaveProperty("formId");
    expect(restoredPlayer.units["low-bound"]).not.toHaveProperty("formId");
    expect(restoredPlayer.units["low-snake"]).not.toHaveProperty("formId");
    expect(restoredPlayer.units.unknown.formId).toBe("future-luffy-form");
    expect(restoredPlayer.units["legacy-robin"].formId).toBe("robin-demonio-fleur");
    expect(restoredPlayer.finalCrew.find((unit) => unit.id === "final-legacy-arm")?.formId)
      .toBe(BOUNDMAN_FORM_ID);
    expect(restoredPlayer.finalCrew.find((unit) => unit.id === "final-legacy-scope")?.formId)
      .toBe(SNAKEMAN_FORM_ID);
    const frozenAfterLoad = restored.lastResults
      .flatMap((result) => result.initialUnits)
      .find((unit) => unit.id === frozen?.id);
    expect(frozenAfterLoad).toMatchObject({ definitionId: "luffy", star: 3 });
    expect(frozenAfterLoad).not.toHaveProperty("formId");

    const roundTripped = deserializeMatch(serializeMatch(restored, "current"));
    expect(human(roundTripped).units.bound.formId).toBe(BOUNDMAN_FORM_ID);
    expect(human(roundTripped).units.snake.formId).toBe(SNAKEMAN_FORM_ID);
  });
});

describe("Luffy Gear 4 selectors and presentation", () => {
  it("shows both forms in planning, battle, and final crew while keeping shop identity base-only", () => {
    let state = createMatch("luffy-form-presentation");
    const player = human(state);
    resetRoster(player);
    const boundman: UnitInstance = {
      id: "boundman-view",
      definitionId: "luffy",
      formId: BOUNDMAN_FORM_ID,
      star: 3,
      items: ["armament-wraps"],
      acquiredOrder: 1,
    };
    const snakeman: UnitInstance = {
      id: "snakeman-view",
      definitionId: "luffy",
      formId: SNAKEMAN_FORM_ID,
      star: 3,
      items: ["sniper-goggles"],
      acquiredOrder: 2,
    };
    player.units = { [boundman.id]: boundman, [snakeman.id]: snakeman };
    placeOnBoard(player, boundman, "0,5");
    placeOnBoard(player, snakeman, "1,5");
    player.shop[0] = "luffy";

    const planning = selectMatchView(state);
    expect(planning.boardUnits).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: boundman.id,
        contentId: "luffy",
        formId: BOUNDMAN_FORM_ID,
        name: "Luffy — Gear 4: Boundman",
        portrait: "/assets/tokens/luffy.png",
      }),
      expect.objectContaining({
        id: snakeman.id,
        contentId: "luffy",
        formId: SNAKEMAN_FORM_ID,
        name: "Luffy — Gear 4: Snakeman",
        portrait: "/assets/tokens/luffy.png",
      }),
    ]));
    expect(planning.selectedDefinitionByUnit.get(boundman.id)).toMatchObject({
      id: "luffy",
      name: "Luffy — Gear 4: Boundman",
      portrait: "/assets/portraits/luffy.png",
      token: "/assets/tokens/luffy.png",
      traits: ["straw-hat", "supernova", "brotherhood", "captain", "brawler"],
      stats: { health: 990, attack: 86, defense: 34, range: 1 },
      ability: { name: "Kong Gun", power: 285 },
    });
    expect(planning.selectedDefinitionByUnit.get(snakeman.id)).toMatchObject({
      name: "Luffy — Gear 4: Snakeman",
      stats: { health: 850, attack: 78, defense: 24, range: 4 },
      ability: { name: "Jet Culverin", power: 300 },
    });
    expect(planning.shop[0]).toMatchObject({
      id: "luffy",
      name: "Luffy",
      ability: { name: "Gum-Gum Gatling", power: 75 },
    });

    state = run(state, { type: "END_PREPARATION" });
    const battle = selectBattlePresentation(state, player.id);
    expect(battle?.boardUnits).toEqual(expect.arrayContaining([
      expect.objectContaining({ formId: BOUNDMAN_FORM_ID, name: "Luffy — Gear 4: Boundman" }),
      expect.objectContaining({ formId: SNAKEMAN_FORM_ID, name: "Luffy — Gear 4: Snakeman" }),
    ]));

    const resultState = structuredClone(state);
    const resultPlayer = human(resultState);
    resultPlayer.finalCrew = [structuredClone(boundman), structuredClone(snakeman)];
    resultPlayer.units = {};
    resultPlayer.board = {};
    resultState.phase = "game-over";
    expect(selectMatchView(resultState).resultCrew).toEqual(expect.arrayContaining([
      expect.objectContaining({ formId: BOUNDMAN_FORM_ID, name: "Luffy — Gear 4: Boundman" }),
      expect.objectContaining({ formId: SNAKEMAN_FORM_ID, name: "Luffy — Gear 4: Snakeman" }),
    ]));
  });
});
