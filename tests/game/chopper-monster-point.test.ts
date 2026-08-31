import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { selectBattlePresentation } from "../../app/selectors";
import { buildBattleOutcome } from "../../components/battleOutcome";
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
  type BattleResult,
  type BattleSetupUnit,
  type BattleTeam,
  type GameCommand,
  type GameContent,
  type MatchBattleResult,
  type MatchState,
  type PlayerState,
  type TraitEffect,
  type UnitInstance,
} from "../../game";

const MONSTER_POINT_FORM_ID = "chopper-monster-point";

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

function run(state: MatchState, command: GameCommand): MatchState {
  const result = applyCommand(
    state,
    command,
    { actorPlayerId: human(state).id },
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

function setupUnit(
  id: string,
  definitionId: string,
  x: number,
  y: number,
  star: 1 | 2 | 3 = 1,
  formId?: string,
  items: string[] = [],
): BattleSetupUnit {
  return {
    id,
    definitionId,
    ...(formId ? { formId } : {}),
    star,
    items,
    position: { x, y },
  };
}

function activeTrait(
  traitId: string,
  effects: TraitEffect[] = [],
  tierIndex = 0,
): ActiveTrait {
  return {
    traitId,
    count: tierIndex >= 0 ? 2 : 1,
    tierIndex,
    tier: tierIndex >= 0
      ? { required: 2, label: `${traitId} test`, effects }
      : null,
  };
}

function team(
  id: string,
  units: BattleSetupUnit[],
  activeTraits: ActiveTrait[] = [],
): BattleTeam {
  return { id, units, activeTraits };
}

function durableContent(): GameContent {
  const content = structuredClone(DEFAULT_CONTENT);
  const nami = content.units.find((unit) => unit.id === "nami");
  if (!nami) throw new Error("Missing Nami combat fixture.");
  nami.stats = {
    ...nami.stats,
    health: 100_000,
    attack: 1,
    defense: 0,
    range: 20,
    attackIntervalMs: 100_000,
    moveIntervalMs: 100_000,
  };
  return content;
}

function matchResult(
  result: BattleResult,
  playerAId: string,
  playerBId: string,
): MatchBattleResult {
  return {
    playerAId,
    playerBId,
    ghostOfPlayerId: null,
    winnerId: result.winnerId,
    timedOut: result.timedOut,
    playerADamage: 0,
    playerBDamage: 0,
    durationTicks: result.durationTicks,
    events: result.events,
    initialUnits: result.initialUnits,
    finalUnits: result.finalUnits,
  };
}

function transformEvents(result: BattleResult) {
  return result.events.filter((event) => event.type === "unit-transform");
}

describe("Chopper Monster Point production content", () => {
  it("adds exactly the locked temporary form and leaves base Chopper unchanged", () => {
    const chopper = DEFAULT_CONTENT.units.find((unit) => unit.id === "chopper");
    const form = getUnitFormDefinition(MONSTER_POINT_FORM_ID);

    expect(DEFAULT_CONTENT.version).toBe("1.15.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(DEFAULT_CONTENT.units).toHaveLength(30);
    expect([1, 2, 3, 4, 5].map((cost) =>
      DEFAULT_CONTENT.units.filter((unit) => unit.cost === cost).length
    )).toEqual([6, 7, 6, 7, 4]);
    expect(DEFAULT_CONTENT.forms.map((candidate) => candidate.id)).toEqual([
      "robin-demonio-fleur",
      "luffy-gear-4-boundman",
      "luffy-gear-4-snakeman",
      MONSTER_POINT_FORM_ID,
    ]);
    expect(form).toEqual({
      id: MONSTER_POINT_FORM_ID,
      baseDefinitionId: "chopper",
      name: "Chopper — Monster Point",
      lifecycle: "battle-temporary",
      stats: { health: 800, attack: 60, defense: 28, range: 1 },
      ability: {
        id: "monster-point-slam",
        name: "Monster Point Slam",
        description:
          "Smashes the nearest enemy cluster with overwhelming force, damaging and stunning nearby foes.",
        targeting: "nearest-enemy",
        pattern: "adjacent",
        effect: "damage",
        power: 250,
        castAnimationMs: 500,
        stunMs: 600,
      },
    });
    expect(form?.stats).not.toHaveProperty("attackIntervalMs");
    expect(form?.stats).not.toHaveProperty("moveIntervalMs");
    expect(form).not.toHaveProperty("traits");
    expect(form).not.toHaveProperty("presentation");
    expect(resolveUnitDefinition("chopper", MONSTER_POINT_FORM_ID)?.stats)
      .toEqual({
        health: 800,
        attack: 60,
        defense: 28,
        range: 1,
        attackIntervalMs: 1_300,
        moveIntervalMs: 500,
      });
    expect(chopper).toEqual({
      id: "chopper",
      name: "Chopper",
      cost: 1,
      traits: ["straw-hat", "guardian"],
      stats: {
        health: 650,
        attack: 38,
        defense: 18,
        range: 2,
        attackIntervalMs: 1_300,
        moveIntervalMs: 500,
      },
      ability: {
        id: "emergency-cure",
        name: "Emergency Cure",
        description:
          "Heals the most injured ally. Allies at 35% HP or lower also receive an emergency shield.",
        targeting: "lowest-health-ally",
        pattern: "single-ally",
        effect: "heal",
        power: 220,
        castAnimationMs: 500,
        requiresTarget: false,
        conditionalShield: { healthThresholdPercent: 35, power: 100 },
      },
      assetPath: "/assets/characters/chopper.png",
    });
  });
});

describe("Chopper Monster Point trigger", () => {
  it("keeps inactive-synergy Chopper base and using Emergency Cure", () => {
    const content = durableContent();
    const nami = content.units.find((unit) => unit.id === "nami");
    if (!nami) throw new Error("Missing Nami fixture.");
    nami.stats.attack = 100;
    const result = simulateBattle(
      team(
        "a",
        [
          setupUnit("chopper", "chopper", 0, 5),
          setupUnit("ally", "tashigi", 2, 4),
        ],
        [
          activeTrait("straw-hat", [], -1),
          activeTrait("energy-test", [{ kind: "starting-energy", value: 90 }]),
        ],
      ),
      team("b", [setupUnit("enemy", "nami", 2, 5)]),
      { seed: "monster-no-synergy", maxTicks: 90 },
      content,
    );

    expect(result.events).toContainEqual(expect.objectContaining({
      type: "cast",
      sourceId: "chopper",
      abilityId: "emergency-cure",
    }));
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "heal",
      sourceId: "chopper",
      targetId: "ally",
    }));
    expect(transformEvents(result)).toEqual([]);
    expect(result.finalUnits.find((unit) => unit.id === "chopper")?.formId)
      .toBeUndefined();
  });

  it("transforms once at the derived 8-second tick with immutable base initial state", () => {
    const content = durableContent();
    const result = simulateBattle(
      team(
        "a",
        [setupUnit("chopper", "chopper", 0, 5)],
        [activeTrait("straw-hat")],
      ),
      team("b", [setupUnit("enemy", "nami", 7, 0)]),
      { seed: "monster-active", maxTicks: 90 },
      content,
    );
    const initial = result.initialUnits.find((unit) => unit.id === "chopper");
    const final = result.finalUnits.find((unit) => unit.id === "chopper");

    expect(initial).toMatchObject({
      definitionId: "chopper",
      maxHp: 650,
      attack: 38,
      defense: 18,
      range: 2,
    });
    expect(initial?.formId).toBeUndefined();
    expect(transformEvents(result)).toEqual([{
      type: "unit-transform",
      tick: Math.ceil(8_000 / content.config.combatTickMs),
      unitId: "chopper",
      fromFormId: null,
      toFormId: MONSTER_POINT_FORM_ID,
      hp: 799,
      maxHp: 800,
    }]);
    expect(final).toMatchObject({
      definitionId: "chopper",
      formId: MONSTER_POINT_FORM_ID,
      maxHp: 800,
      attack: 60,
      defense: 28,
      range: 1,
    });
    expect(initial).not.toHaveProperty("formId");
  });

  it("does not transform a Chopper killed before the trigger", () => {
    const content = durableContent();
    const nami = content.units.find((unit) => unit.id === "nami");
    if (!nami) throw new Error("Missing Nami fixture.");
    nami.stats.attack = 10_000;
    const result = simulateBattle(
      team(
        "a",
        [setupUnit("chopper", "chopper", 0, 5)],
        [activeTrait("straw-hat")],
      ),
      team("b", [setupUnit("enemy", "nami", 0, 4)]),
      { seed: "monster-dead", maxTicks: 90 },
      content,
    );

    expect(transformEvents(result)).toEqual([]);
    expect(result.finalUnits.find((unit) => unit.id === "chopper"))
      .toMatchObject({ definitionId: "chopper", state: "dead", hp: 0 });
    expect(result.finalUnits.find((unit) => unit.id === "chopper")?.formId)
      .toBeUndefined();
  });

  it("processes a trigger-tick burn death before transformation", () => {
    const content = durableContent();
    const nami = content.units.find((unit) => unit.id === "nami");
    if (!nami) throw new Error("Missing Nami fixture.");
    nami.stats.attackIntervalMs = 6_900;
    nami.ability = {
      id: "trigger-burn",
      name: "Trigger Burn",
      description: "Combat ordering fixture.",
      targeting: "nearest-enemy",
      pattern: "single",
      effect: "damage",
      power: 1,
      castAnimationMs: 500,
      burnPower: 1_000,
      burnDurationMs: 2_000,
    };
    const result = simulateBattle(
      team(
        "a",
        [setupUnit("chopper", "chopper", 0, 5)],
        [activeTrait("straw-hat")],
      ),
      team(
        "b",
        [setupUnit("burner", "nami", 0, 4)],
        [activeTrait("burn-energy", [{ kind: "starting-energy", value: 90 }])],
      ),
      { seed: "monster-trigger-burn", maxTicks: 90 },
      content,
    );
    const tick80 = result.events.filter((event) => event.tick === 80);

    expect(tick80).toContainEqual(expect.objectContaining({
      type: "damage",
      targetId: "chopper",
      damageKind: "burn",
    }));
    expect(tick80).toContainEqual({
      type: "death",
      tick: 80,
      unitId: "chopper",
      sourceId: "burner",
    });
    expect(transformEvents(result)).toEqual([]);
  });

  it("transforms multiple Choppers in explicit ascending unit-ID order", () => {
    const result = simulateBattle(
      team(
        "a",
        [
          setupUnit("z-chopper", "chopper", 0, 5),
          setupUnit("a-chopper", "chopper", 1, 5),
        ],
        [activeTrait("straw-hat")],
      ),
      team("b", [setupUnit("enemy", "nami", 7, 0)]),
      { seed: "monster-multiple", maxTicks: 80 },
      durableContent(),
    );

    expect(transformEvents(result)).toMatchObject([
      { tick: 80, unitId: "a-chopper" },
      { tick: 80, unitId: "z-chopper" },
    ]);
  });

  it("honors explicit temporary-form setup without retriggering", () => {
    const result = simulateBattle(
      team(
        "a",
        [
          setupUnit(
            "monster",
            "chopper",
            0,
            5,
            3,
            MONSTER_POINT_FORM_ID,
          ),
        ],
        [
          activeTrait("straw-hat"),
          activeTrait("energy-test", [{ kind: "starting-energy", value: 100 }]),
        ],
      ),
      team("b", [setupUnit("enemy", "nami", 0, 4)]),
      { seed: "monster-explicit", maxTicks: 90 },
      durableContent(),
    );

    expect(result.initialUnits.find((unit) => unit.id === "monster"))
      .toMatchObject({
        definitionId: "chopper",
        formId: MONSTER_POINT_FORM_ID,
        maxHp: 2_592,
        attack: 194,
        defense: 90,
        range: 1,
      });
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "cast",
      sourceId: "monster",
      abilityId: "monster-point-slam",
    }));
    expect(transformEvents(result)).toEqual([]);
  });
});

describe("Chopper Monster Point live state transition", () => {
  it("applies only star-scaled deltas while preserving items, trait effects, resources, and status", () => {
    const content = durableContent();
    const nami = content.units.find((unit) => unit.id === "nami");
    if (!nami) throw new Error("Missing Nami fixture.");
    nami.ability = {
      id: "long-stun",
      name: "Long Stun",
      description: "Combat continuity fixture.",
      targeting: "nearest-enemy",
      pattern: "single",
      effect: "damage",
      power: 1,
      castAnimationMs: 500,
      stunMs: 10_000,
    };
    const result = simulateBattle(
      team(
        "a",
        [
          setupUnit(
            "chopper",
            "chopper",
            0,
            5,
            2,
            undefined,
            ["meat-platter", "armament-wraps", "sniper-goggles"],
          ),
        ],
        [
          activeTrait("straw-hat", [
            { kind: "max-health-percent", value: 10 },
            { kind: "attack-percent", value: 20 },
            { kind: "defense-flat", value: 7 },
            { kind: "range-flat", value: 2 },
            { kind: "starting-energy", value: 35 },
            { kind: "shield-flat", value: 90 },
          ]),
        ],
      ),
      team(
        "b",
        [setupUnit("stunner", "nami", 0, 4)],
        [activeTrait("stun-energy", [{ kind: "starting-energy", value: 100 }])],
      ),
      { seed: "monster-live-deltas", maxTicks: 80 },
      content,
    );
    const initial = result.initialUnits.find((unit) => unit.id === "chopper");
    const final = result.finalUnits.find((unit) => unit.id === "chopper");

    expect(initial).toMatchObject({
      items: ["meat-platter", "armament-wraps", "sniper-goggles"],
      maxHp: 1_617,
      attack: 98,
      defense: 53,
      range: 5,
      energy: 35,
      shield: 90,
    });
    expect(final).toMatchObject({
      formId: MONSTER_POINT_FORM_ID,
      items: ["meat-platter", "armament-wraps", "sniper-goggles"],
      maxHp: 1_887,
      hp: 1_887,
      attack: 138,
      defense: 71,
      range: 4,
      energy: 50,
      shield: 89,
      state: "stunned",
    });
    expect(result.events.some((event) =>
      event.tick === 80 &&
      event.type === "energy" &&
      event.unitId === "chopper"
    )).toBe(false);
  });

  it("preserves absolute health damage instead of health percentage", () => {
    const content = durableContent();
    const nami = content.units.find((unit) => unit.id === "nami");
    if (!nami) throw new Error("Missing Nami fixture.");
    nami.stats.attack = 100;
    const result = simulateBattle(
      team(
        "a",
        [setupUnit("chopper", "chopper", 0, 5)],
        [activeTrait("straw-hat")],
      ),
      team("b", [setupUnit("enemy", "nami", 0, 4)]),
      { seed: "monster-damage-preservation", maxTicks: 80 },
      content,
    );
    const damage = result.events.find((event) =>
      event.type === "damage" &&
      event.targetId === "chopper" &&
      event.healthDamage > 0
    );
    const final = result.finalUnits.find((unit) => unit.id === "chopper");
    if (!damage || damage.type !== "damage") {
      throw new Error("Expected pre-transform Chopper damage.");
    }
    expect(transformEvents(result)).toMatchObject([{
      hp: 800 - damage.healthDamage,
      maxHp: 800,
    }]);

    expect(final).toMatchObject({
      formId: MONSTER_POINT_FORM_ID,
      maxHp: 800,
      hp: 800 - damage.healthDamage,
    });
  });

  it("transforms before an action-ready same-tick Monster Point cast without an extra cost", () => {
    const content = durableContent();
    const chopper = content.units.find((unit) => unit.id === "chopper");
    if (!chopper) throw new Error("Missing Chopper fixture.");
    chopper.stats.attackIntervalMs = 7_900;
    const result = simulateBattle(
      team(
        "a",
        [setupUnit("chopper", "chopper", 0, 5)],
        [
          activeTrait("straw-hat"),
          activeTrait("energy-test", [{ kind: "starting-energy", value: 90 }]),
        ],
      ),
      team("b", [setupUnit("enemy", "nami", 0, 4)]),
      { seed: "monster-same-tick", maxTicks: 80 },
      content,
    );
    const tick80 = result.events.filter((event) => event.tick === 80);
    const transformIndex = tick80.findIndex(
      (event) => event.type === "unit-transform",
    );
    const castIndex = tick80.findIndex((event) =>
      event.type === "cast" &&
      event.sourceId === "chopper" &&
      event.abilityId === "monster-point-slam"
    );

    expect(transformIndex).toBeGreaterThanOrEqual(0);
    expect(castIndex).toBeGreaterThan(transformIndex);
    expect(tick80.filter((event) =>
      event.type === "energy" && event.unitId === "chopper"
    )).toMatchObject([{ reason: "cast-reset", amount: -100, value: 0 }]);
    expect(tick80.filter((event) =>
      event.type === "cast" && event.sourceId === "chopper"
    )).toHaveLength(1);
  });
});

describe("Monster Point Slam", () => {
  it("uses nearest adjacent damage, normal 3-star scaling, and only the locked stun", () => {
    const content = durableContent();
    for (const id of ["nami", "tashigi", "luffy"] as const) {
      const definition = content.units.find((unit) => unit.id === id);
      if (!definition) throw new Error(`Missing ${id} fixture.`);
      definition.stats = {
        ...definition.stats,
        health: 2_000,
        attack: 1,
        defense: 0,
        range: 0,
        attackIntervalMs: 100_000,
        moveIntervalMs: 100_000,
      };
    }
    const result = simulateBattle(
      team(
        "a",
        [
          setupUnit(
            "monster",
            "chopper",
            2,
            5,
            3,
            MONSTER_POINT_FORM_ID,
          ),
        ],
        [activeTrait("energy-test", [{ kind: "starting-energy", value: 100 }])],
      ),
      team("b", [
        setupUnit("primary", "nami", 2, 4),
        setupUnit("adjacent", "tashigi", 3, 4),
        setupUnit("distant", "luffy", 5, 4),
      ]),
      { seed: "monster-slam", maxTicks: 1 },
      content,
    );

    expect(result.events).toContainEqual(expect.objectContaining({
      type: "cast",
      sourceId: "monster",
      abilityId: "monster-point-slam",
      targetIds: ["adjacent", "primary"],
    }));
    expect(result.events.filter((event) =>
      event.type === "damage" && event.sourceId === "monster"
    )).toMatchObject([
      { targetId: "adjacent", amount: 562, damageKind: "ability" },
      { targetId: "primary", amount: 562, damageKind: "ability" },
    ]);
    expect(result.events.filter((event) =>
      event.type === "status" && event.sourceId === "monster"
    )).toMatchObject([
      { targetId: "adjacent", status: "stun", durationTicks: 6 },
      { targetId: "primary", status: "stun", durationTicks: 6 },
    ]);
    expect(result.events.some((event) =>
      (event.type === "damage" && event.targetId === "distant") ||
      event.type === "heal" ||
      event.type === "shield" ||
      event.type === "unit-displace" ||
      event.type === "ability-hit" ||
      (event.type === "energy" && event.reason === "ability-drain") ||
      (event.type === "status" && event.status === "burn")
    )).toBe(false);
  });

  it("is deterministic without consuming transformation RNG", () => {
    const content = durableContent();
    const teamA = team(
      "a",
      [setupUnit("chopper", "chopper", 0, 5)],
      [activeTrait("straw-hat")],
    );
    const teamB = team("b", [setupUnit("enemy", "nami", 7, 0)]);

    expect(simulateBattle(teamA, teamB, {
      seed: "monster-determinism",
      maxTicks: 90,
    }, content)).toEqual(simulateBattle(teamA, teamB, {
      seed: "monster-determinism",
      maxTicks: 90,
    }, content));
  });
});

describe("Monster Point persistence and economy isolation", () => {
  it("freezes battle results through economy actions and schema-6 round trips, then starts base next battle", () => {
    const content = durableContent();
    let state = createMatch("monster-persistence");
    const player = human(state);
    const opponent = state.players.find((candidate) => candidate.isBot);
    if (!opponent) throw new Error("Expected bot fixture.");
    resetRoster(player);
    const chopper = addUnitToPlayer(state, player, "chopper", DEFAULT_CONTENT);
    if (!chopper) throw new Error("Expected persistent Chopper fixture.");
    placeOnBoard(player, chopper);
    const battle = simulateBattle(
      team(
        player.id,
        [setupUnit(`${player.id}:${chopper.id}`, "chopper", 0, 5)],
        [activeTrait("straw-hat")],
      ),
      team(opponent.id, [setupUnit(`${opponent.id}:enemy`, "nami", 7, 0)]),
      { seed: "monster-frozen-result", maxTicks: 90 },
      content,
    );
    state.phase = "battle";
    state.lastResults = [matchResult(battle, player.id, opponent.id)];
    player.gold = 20;
    const frozen = structuredClone(state.lastResults);

    state = run(state, { type: "REROLL_SHOP" });
    expect(human(state).gold).toBe(20 - DEFAULT_CONTENT.config.rerollCost);
    expect(state.lastResults).toEqual(frozen);
    expect(human(state).units[chopper.id]).toMatchObject({
      definitionId: "chopper",
      star: 1,
    });
    expect(human(state).units[chopper.id].formId).toBeUndefined();
    expect(resolvePersistentFormId(human(state).units[chopper.id])).toBeNull();

    const restored = deserializeMatch(serializeMatch(state, "monster-roundtrip"));
    const restoredResult = restored.lastResults[0];
    expect(restored.schemaVersion).toBe(6);
    expect(restored.contentVersion).toBe("1.15.0");
    expect(restoredResult).toEqual(frozen[0]);
    expect(restoredResult.initialUnits.find((unit) =>
      unit.definitionId === "chopper"
    )?.formId).toBeUndefined();
    expect(restoredResult.finalUnits.find((unit) =>
      unit.definitionId === "chopper"
    )?.formId).toBe(MONSTER_POINT_FORM_ID);
    expect(restoredResult.events).toContainEqual(expect.objectContaining({
      type: "unit-transform",
      tick: 80,
      toFormId: MONSTER_POINT_FORM_ID,
      hp: 799,
      maxHp: 800,
    }));
    expect(human(restored).units[chopper.id].formId).toBeUndefined();

    const nextBattle = simulateBattle(
      team(
        player.id,
        [setupUnit("next-chopper", chopper.definitionId, 0, 5, chopper.star)],
        [activeTrait("straw-hat")],
      ),
      team(opponent.id, [setupUnit("next-enemy", "nami", 7, 0)]),
      { seed: "monster-next-battle", maxTicks: 80 },
      content,
    );
    expect(nextBattle.initialUnits.find((unit) => unit.id === "next-chopper")
      ?.formId).toBeUndefined();
    expect(transformEvents(nextBattle)).toMatchObject([{
      tick: 80,
      unitId: "next-chopper",
    }]);

    const oldSchemaSix = createMatch("old-schema-six");
    oldSchemaSix.lastResults = [];
    expect(deserializeMatch(serializeMatch(oldSchemaSix)).schemaVersion).toBe(6);
  });

  it("keeps Monster Point out of shops, pools, purchases, merges, and sales", () => {
    let state = createMatch("monster-economy");
    clearShopReservations(state);
    human(state).gold = 20;
    const poolBefore = state.pool.chopper;
    expect(state.pool).not.toHaveProperty(MONSTER_POINT_FORM_ID);
    expect(human(state).shop).not.toContain(MONSTER_POINT_FORM_ID);

    forceOffer(state, "chopper");
    state = run(state, { type: "BUY_UNIT", shopIndex: 0 });
    const purchased = Object.values(human(state).units).find(
      (unit) => unit.definitionId === "chopper",
    );
    if (!purchased) throw new Error("Expected purchased Chopper.");
    expect(purchased.formId).toBeUndefined();
    expect(state.pool.chopper).toBe(poolBefore - 1);

    state = run(state, { type: "SELL_UNIT", unitId: purchased.id });
    expect(state.pool.chopper).toBe(poolBefore);
    expect(state.pool).not.toHaveProperty(MONSTER_POINT_FORM_ID);
  });
});

describe("Monster Point presentation", () => {
  it("replays the generic cue and transformed ability for player and spectator", () => {
    const content = durableContent();
    const chopper = content.units.find((unit) => unit.id === "chopper");
    if (!chopper) throw new Error("Missing Chopper fixture.");
    chopper.stats.attackIntervalMs = 7_900;
    const state = createMatch("monster-presentation");
    const player = human(state);
    const opponent = state.players.find((candidate) => candidate.isBot);
    if (!opponent) throw new Error("Expected bot fixture.");
    const battle = simulateBattle(
      team(
        player.id,
        [setupUnit(`${player.id}:chopper`, "chopper", 0, 5)],
        [
          activeTrait("straw-hat"),
          activeTrait("energy-test", [{ kind: "starting-energy", value: 90 }]),
        ],
      ),
      team(opponent.id, [setupUnit(`${opponent.id}:enemy`, "nami", 0, 4)]),
      { seed: "monster-presentation-battle", maxTicks: 80 },
      content,
    );
    state.phase = "battle";
    state.lastResults = [matchResult(battle, player.id, opponent.id)];
    const transform = battle.events.find(
      (event) => event.type === "unit-transform",
    );
    if (!transform || transform.type !== "unit-transform") {
      throw new Error("Expected Monster Point transform fixture.");
    }

    for (const perspectiveId of [player.id, opponent.id]) {
      const presentation = selectBattlePresentation(
        state,
        perspectiveId,
        content,
      );
      expect(presentation?.events).toContainEqual(expect.objectContaining({
        kind: "transform",
        sourceId: `${player.id}:chopper`,
        unitId: `${player.id}:chopper`,
        fromFormId: null,
        toFormId: MONSTER_POINT_FORM_ID,
        hp: transform.hp,
        maxHp: transform.maxHp,
        label: "Chopper — Monster Point",
      }));
      expect(presentation?.events).toContainEqual(expect.objectContaining({
        kind: "cast",
        sourceId: `${player.id}:chopper`,
        abilityId: "monster-point-slam",
        abilityName: "Monster Point Slam",
        telegraph: "area",
      }));
    }
    expect(buildBattleOutcome({
      state,
      playerId: player.id,
      content,
    })?.finalCrew).toContainEqual(expect.objectContaining({
      definitionId: "chopper",
      name: "Chopper — Monster Point",
    }));

    const phaserSource = readFileSync(
      resolve(process.cwd(), "components/PhaserBoard.tsx"),
      "utf8",
    );
    expect(phaserSource).toContain('event.kind === "transform" && source');
    expect(phaserSource).toContain('showCastName(source, event.label ?? "Monster Point")');
    expect(phaserSource).toMatch(
      /showCastName\(source, event\.label \?\? "Monster Point"\);\s+if \(!reduceMotion\)/,
    );
  });
});
