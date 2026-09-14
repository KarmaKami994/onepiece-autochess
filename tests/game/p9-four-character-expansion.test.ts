import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  addUnitToPlayer,
  applyCommand,
  calculateLossDamage,
  createMatch,
  deserializeMatch,
  getActiveTraitBehaviorGrants,
  getActiveTraitEffectGrants,
  getActiveTraitsForUnits,
  getEffectiveUnitTraits,
  migrateMatchState,
  rollShop,
  runBotTurn,
  serializeMatch,
  simulateBattle,
  type ActiveTrait,
  type BattleEvent,
  type BattleSetupUnit,
  type BattleTeam,
  type BattleUnitSnapshot,
  type GameContent,
  type MatchState,
  type PlayerState,
  type TraitEffect,
  type UnitDefinition,
} from "../../game";
import {
  CREW_ANIMATION_MANIFEST,
  CREW_V2_ANIMATIONS,
  getCrewAnimationDefinition,
  getCrewAnimationDefinitions,
} from "../../components/crewAnimationManifest";

const P9_IDS = ["killer", "buggy", "capone-bege", "whitebeard"] as const;
const P9_ID_SET = new Set<string>(P9_IDS);
const projectRoot = path.resolve(import.meta.dirname, "../..");
const playerContext = { actorPlayerId: "player-1" };

type DamageEvent = Extract<BattleEvent, { type: "damage" }>;
type DisplaceEvent = Extract<BattleEvent, { type: "unit-displace" }>;

function definition(id: string, content = DEFAULT_CONTENT): UnitDefinition {
  const unit = content.units.find((candidate) => candidate.id === id);
  if (!unit) throw new Error(`Missing ${id} definition.`);
  return unit;
}

function human(state: MatchState): PlayerState {
  const player = state.players.find((candidate) => candidate.id === "player-1");
  if (!player) throw new Error("Missing human player.");
  return player;
}

function bot(state: MatchState): PlayerState {
  const player = state.players.find((candidate) => candidate.id === "bot-1");
  if (!player) throw new Error("Missing bot player.");
  return player;
}

function forceOffer(state: MatchState, definitionId: string): void {
  const player = human(state);
  const current = player.shop[0];
  if (current) state.pool[current] += 1;
  player.shop[0] = definitionId;
  state.pool[definitionId] -= 1;
}

function buyForced(state: MatchState, definitionId: string): MatchState {
  forceOffer(state, definitionId);
  const result = applyCommand(
    state,
    { type: "BUY_UNIT", shopIndex: 0 },
    playerContext,
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function setupUnit(
  id: string,
  definitionId: string,
  x: number,
  y: number,
): BattleSetupUnit {
  return { id, definitionId, star: 1, items: [], position: { x, y } };
}

function effects(...values: TraitEffect[]): ActiveTrait[] {
  return [{
    traitId: "p9-test-energy",
    count: 1,
    tierIndex: 0,
    tier: {
      required: 1,
      label: "P9 test",
      effects: values,
    },
  }];
}

function team(
  id: string,
  units: BattleSetupUnit[],
  activeTraits: ActiveTrait[] = [],
): BattleTeam {
  return { id, units, activeTraits };
}

function combatContent(): GameContent {
  const content = structuredClone(DEFAULT_CONTENT);
  for (const unit of [...content.units, ...content.enemies]) {
    unit.stats = {
      ...unit.stats,
      health: 5_000,
      attack: 1,
      defense: 40,
      specialDefense: 40,
      range: 8,
      attackIntervalMs: 10_000,
      moveIntervalMs: 10_000,
    };
  }
  return content;
}

function castOnce(
  sourceId: string,
  sourcePosition: { x: number; y: number },
  enemies: BattleSetupUnit[],
  seed = `p9-${sourceId}`,
) {
  return simulateBattle(
    team("a", [setupUnit(sourceId, sourceId, sourcePosition.x, sourcePosition.y)],
      effects({ kind: "starting-energy", value: 100 })),
    team("b", enemies),
    { seed, maxTicks: 1 },
    combatContent(),
  );
}

function abilityDamage(result: ReturnType<typeof simulateBattle>, sourceId: string) {
  return result.events.filter((event): event is DamageEvent =>
    event.type === "damage" &&
    event.sourceId === sourceId &&
    event.damageKind === "ability");
}

function displacements(
  result: ReturnType<typeof simulateBattle>,
  sourceId: string,
) {
  return result.events.filter((event): event is DisplaceEvent =>
    event.type === "unit-displace" && event.sourceId === sourceId);
}

function snapshot(
  id: string,
  definitionId: string,
  star: 1 | 2 | 3,
): BattleUnitSnapshot {
  return {
    id,
    definitionId,
    teamId: "winner",
    star,
    items: [],
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    shield: 0,
    energy: 0,
    maxEnergy: 100,
    attack: 1,
    defense: 0,
    range: 1,
    state: "seek",
  };
}

describe("P9 four-character expansion content", () => {
  it("locks the four exact serializable definitions and no fifth new ID", () => {
    const expected = {
      killer: {
        name: "Killer",
        cost: 2,
        traits: ["supernova", "swordsman"],
        stats: { health: 720, attack: 72, defense: 20, specialDefense: 18, range: 1, attackIntervalMs: 900, moveIntervalMs: 400 },
        ability: { id: "punisher-blades", name: "Punisher Blades", power: 205, targeting: "nearest-enemy", pattern: "adjacent", effect: "damage", damageType: "physical", castAnimationMs: 500, defensePiercePercent: 15 },
        assetPath: "/assets/characters/killer.png",
      },
      buggy: {
        name: "Buggy",
        cost: 3,
        traits: ["emperor", "warlord", "captain"],
        stats: { health: 780, attack: 70, defense: 20, specialDefense: 22, range: 3, attackIntervalMs: 1_100, moveIntervalMs: 500 },
        ability: { id: "muggy-ball", name: "Muggy Ball", power: 260, targeting: "farthest-enemy", pattern: "adjacent", effect: "damage", damageType: "physical", castAnimationMs: 500, signatureMechanics: [{ kind: "knockback" }] },
        assetPath: "/assets/characters/buggy.png",
      },
      "capone-bege": {
        name: "Capone Bege",
        cost: 4,
        traits: ["supernova", "captain", "marksman"],
        stats: { health: 950, attack: 84, defense: 34, specialDefense: 32, range: 4, attackIntervalMs: 1_200, moveIntervalMs: 500 },
        ability: { id: "castle-cannonade", name: "Castle Cannonade", power: 190, targeting: "nearest-enemy", pattern: "all-enemies", effect: "damage", damageType: "physical", castAnimationMs: 500, defensePiercePercent: 15 },
        assetPath: "/assets/characters/capone-bege.png",
      },
      whitebeard: {
        name: "Whitebeard",
        cost: 5,
        traits: ["emperor", "captain", "guardian"],
        stats: { health: 1_300, attack: 116, defense: 44, specialDefense: 40, range: 2, attackIntervalMs: 1_100, moveIntervalMs: 450 },
        ability: { id: "seaquake", name: "Seaquake", power: 320, targeting: "nearest-enemy", pattern: "all-enemies", effect: "damage", damageType: "special", castAnimationMs: 500, signatureMechanics: [{ kind: "knockback" }] },
        assetPath: "/assets/characters/whitebeard.png",
      },
    } as const;
    expect(DEFAULT_CONTENT.version).toBe("1.31.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(DEFAULT_CONTENT.units.filter((unit) => P9_ID_SET.has(unit.id)).map((unit) => unit.id))
      .toEqual(P9_IDS);
    for (const id of P9_IDS) {
      const unit = definition(id);
      expect(unit).toMatchObject(expected[id]);
      expect(unit.ability.description.length).toBeGreaterThan(40);
      expect(JSON.parse(JSON.stringify(unit.ability))).toEqual(unit.ability);
      expect(unit.ability.hits).toBeUndefined();
      expect(unit.ability.sequentialStrike).toBeUndefined();
    }
  });

  it("locks the 34-unit cost and trait topology without changing thresholds", () => {
    expect(DEFAULT_CONTENT.units).toHaveLength(34);
    expect([1, 2, 3, 4, 5].map((cost) =>
      DEFAULT_CONTENT.units.filter((unit) => unit.cost === cost).length))
      .toEqual([6, 8, 7, 8, 5]);
    const counts = Object.fromEntries(DEFAULT_CONTENT.traits.map((trait) => [
      trait.id,
      DEFAULT_CONTENT.units.filter((unit) => unit.traits.includes(trait.id)).length,
    ]));
    expect(counts).toEqual({
      "straw-hat": 10,
      navy: 7,
      warlord: 6,
      supernova: 6,
      brotherhood: 3,
      revolutionary: 5,
      emperor: 4,
      captain: 8,
      brawler: 7,
      swordsman: 6,
      marksman: 5,
      specialist: 8,
      guardian: 7,
    });
    expect(Object.fromEntries(DEFAULT_CONTENT.traits.map((trait) => [
      trait.id,
      trait.tiers.map((tier) => tier.required),
    ]))).toEqual({
      "straw-hat": [2, 4, 6], navy: [2, 3], warlord: [2, 4],
      supernova: [2, 4], brotherhood: [2, 3], revolutionary: [1, 2],
      emperor: [1, 2], captain: [2, 3], brawler: [2, 4],
      swordsman: [2, 3], marksman: [2, 3], specialist: [2, 4], guardian: [2, 3],
    });
  });

  it("preserves the pre-P9 gameplay projection of all 30 existing definitions", () => {
    const projection = DEFAULT_CONTENT.units
      .filter((unit) => !P9_ID_SET.has(unit.id))
      .map(({ id, cost, traits, stats, ability }) => ({ id, cost, traits, stats, ability }));
    expect(projection).toHaveLength(30);
    expect(createHash("sha256").update(JSON.stringify(projection)).digest("hex"))
      .toBe("7203686f7e310981f8b55d8d5e441122486fa6d149b78ed8771960b3bc47331f");
  });

  it("uses generic effective-trait membership for every P9 holder", () => {
    expect(getEffectiveUnitTraits({ definitionId: "killer" })).toEqual(["supernova", "swordsman"]);
    expect(getEffectiveUnitTraits({ definitionId: "buggy" })).toEqual(["emperor", "warlord", "captain"]);
    expect(getEffectiveUnitTraits({ definitionId: "capone-bege" })).toEqual(["supernova", "captain", "marksman"]);
    expect(getEffectiveUnitTraits({ definitionId: "whitebeard" })).toEqual(["emperor", "captain", "guardian"]);

    const active = getActiveTraitsForUnits([
      { definitionId: "killer" }, { definitionId: "zoro" },
      { definitionId: "buggy" }, { definitionId: "crocodile" },
      { definitionId: "capone-bege" }, { definitionId: "usopp" },
      { definitionId: "whitebeard" }, { definitionId: "chopper" },
    ]);
    for (const traitId of ["supernova", "swordsman", "emperor", "warlord", "captain", "marksman", "guardian"] as const) {
      expect(active.find((trait) => trait.traitId === traitId)?.tierIndex).toBeGreaterThanOrEqual(0);
    }
    expect(getActiveTraitEffectGrants(active).some((grant) => grant.traitId === "swordsman" && grant.scope === "holders")).toBe(true);
    expect(getActiveTraitEffectGrants(active).some((grant) =>
      grant.traitId === "supernova" && grant.effect.kind === "stacking-attack-percent"))
      .toBe(true);
    expect(getActiveTraitBehaviorGrants(active).some((grant) => grant.traitId === "warlord")).toBe(true);
    expect(getActiveTraitBehaviorGrants(active).some((grant) => grant.traitId === "captain")).toBe(true);
    expect(getActiveTraitBehaviorGrants(active).some((grant) => grant.traitId === "marksman")).toBe(true);
    expect(getActiveTraitBehaviorGrants(active).some((grant) => grant.traitId === "guardian")).toBe(true);
    expect(getActiveTraitBehaviorGrants(active).some((grant) => grant.traitId === "emperor")).toBe(true);
  });
});

describe("P9 existing-combat-primitive integration", () => {
  it("resolves Killer as deterministic adjacent Physical pierce without status or displacement", () => {
    const enemies = [
      setupUnit("near", "nami", 3, 2),
      setupUnit("adjacent", "usopp", 3, 3),
      setupUnit("far", "chopper", 7, 5),
    ];
    const first = castOnce("killer", { x: 1, y: 2 }, enemies, "killer-deterministic");
    const second = castOnce("killer", { x: 1, y: 2 }, enemies, "killer-deterministic");
    expect(first).toEqual(second);
    expect(abilityDamage(first, "killer").map((event) => event.targetId)).toEqual(["adjacent", "near"]);
    expect(displacements(first, "killer")).toEqual([]);
    expect(first.events.some((event) => event.type === "status" && event.sourceId === "killer")).toBe(false);
  });

  it("uses Buggy's farthest adjacent blast and existing knockback while preserving blocked damage", () => {
    const result = castOnce("buggy", { x: 1, y: 2 }, [
      setupUnit("near", "nami", 2, 2),
      setupUnit("far", "usopp", 6, 2),
      setupUnit("far-adjacent", "chopper", 6, 3),
    ]);
    expect(abilityDamage(result, "buggy").map((event) => event.targetId)).toEqual(["far", "far-adjacent"]);
    expect(abilityDamage(result, "buggy").every((event) => event.amount > 0)).toBe(true);
    expect(displacements(result, "buggy").every((event) => event.movementKind === "knockback")).toBe(true);
  });

  it("hits every living enemy once with Capone's Physical pierce and no summons", () => {
    const result = castOnce("capone-bege", { x: 1, y: 2 }, [
      setupUnit("a", "nami", 3, 1),
      setupUnit("b", "usopp", 5, 3),
      setupUnit("c", "chopper", 7, 5),
    ]);
    expect(abilityDamage(result, "capone-bege").map((event) => event.targetId)).toEqual(["a", "b", "c"]);
    expect(new Set(result.finalUnits.map((unit) => unit.id))).toEqual(new Set(["capone-bege", "a", "b", "c"]));
    expect(displacements(result, "capone-bege")).toEqual([]);
  });

  it("hits every living enemy once with Whitebeard's Special quake and existing knockback", () => {
    const enemies = [
      setupUnit("a", "nami", 3, 1),
      setupUnit("b", "usopp", 5, 3),
      setupUnit("c", "chopper", 7, 5),
    ];
    const first = castOnce("whitebeard", { x: 1, y: 2 }, enemies, "whitebeard-deterministic");
    const second = castOnce("whitebeard", { x: 1, y: 2 }, enemies, "whitebeard-deterministic");
    expect(first).toEqual(second);
    expect(abilityDamage(first, "whitebeard").map((event) => event.targetId)).toEqual(["a", "b", "c"]);
    expect(displacements(first, "whitebeard").every((event) => event.movementKind === "knockback")).toBe(true);
    expect(first.events.some((event) => event.type === "status" && event.sourceId === "whitebeard")).toBe(false);
  });
});

describe("P9 economy, items, bots, save, and P8 integration", () => {
  it("adds all P9 definitions to the unchanged finite cost pools", () => {
    expect(DEFAULT_CONTENT.config.poolCopiesByCost).toEqual([27, 22, 18, 14, 10]);
    const state = createMatch("p9-fresh-pool");
    const expected = { killer: 22, buggy: 18, "capone-bege": 14, whitebeard: 10 } as const;
    for (const id of P9_IDS) {
      const copiesInShops = state.players.reduce((total, player) =>
        total + player.shop.filter((offer) => offer === id).length, 0);
      expect(state.pool[id] + copiesInShops).toBe(expected[id]);
    }
  });

  it("lets the normal shop authority select each P9 unit only at its cost", () => {
    for (const id of P9_IDS) {
      const content: GameContent = {
        ...structuredClone(DEFAULT_CONTENT),
        units: [structuredClone(definition(id))],
      };
      const state = createMatch(`p9-shop-${id}`);
      const player = human(state);
      player.level = 9;
      player.shop = player.shop.map(() => null);
      state.pool = { [id]: content.config.poolCopiesByCost[definition(id).cost - 1] };
      rollShop(state, player, content);
      expect(player.shop).toEqual(Array(content.config.shopSize).fill(id));
      expect(content.units[0].cost).toBe(definition(id).cost);
    }
  });

  it("uses the generic nine-copy merge, sell refund, pool return, and held-item return", () => {
    let state = createMatch("p9-killer-merge-sell");
    human(state).gold = 999;
    const poolBefore = state.pool.killer;
    for (let copy = 0; copy < 9; copy += 1) state = buyForced(state, "killer");
    const killer = Object.values(human(state).units).find((unit) => unit.definitionId === "killer");
    expect(killer).toMatchObject({ star: 3 });
    if (!killer) throw new Error("Missing merged Killer.");
    killer.items = ["black-blade"];
    const goldBefore = human(state).gold;
    const result = applyCommand(state, { type: "SELL_UNIT", unitId: killer.id }, playerContext);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.pool.killer).toBe(poolBefore);
    expect(human(result.state).gold).toBe(goldBefore + 18);
    expect(human(result.state).inventory).toContain("black-blade");
  });

  it.each([
    ["killer", "swordsmans-knot"],
    ["buggy", "emperors-jolly-roger"],
    ["capone-bege", "marksmans-thunder-dial"],
    ["whitebeard", "guardians-sea-prism-crest"],
  ] as const)("rejects redundant native trait grants for %s", (definitionId, itemId) => {
    const state = createMatch(`p9-redundant-${definitionId}`);
    const player = human(state);
    player.units = {};
    player.board = {};
    player.bench = player.bench.map(() => null);
    const unit = addUnitToPlayer(state, player, definitionId, DEFAULT_CONTENT);
    if (!unit) throw new Error("Could not add P9 item fixture.");
    player.inventory = [itemId];
    const result = applyCommand(state, { type: "EQUIP_ITEM", unitId: unit.id, itemId }, playerContext);
    expect(result.ok).toBe(false);
    expect(player.inventory).toEqual([itemId]);
    expect(unit.items).toEqual([]);
  });

  it("buys and fields a P9 unit through unchanged deterministic bot logic", () => {
    const state = createMatch("p9-bot-buy");
    const player = bot(state);
    player.gold = 50;
    player.level = 9;
    player.units = {};
    player.board = {};
    player.bench = player.bench.map(() => null);
    for (const offer of player.shop) if (offer) state.pool[offer] += 1;
    player.shop = ["whitebeard", null, null, null, null, null];
    state.pool.whitebeard -= 1;
    const first = runBotTurn(structuredClone(state), player.id);
    const second = runBotTurn(structuredClone(state), player.id);
    expect(first).toEqual(second);
    const next = bot(first);
    expect(Object.values(next.units).some((unit) => unit.definitionId === "whitebeard")).toBe(true);
    expect(Object.values(next.board).some((unitId) => next.units[unitId]?.definitionId === "whitebeard")).toBe(true);
  });

  it("backfills only missing current-content pool keys in old schema-6 saves", () => {
    const legacy = createMatch("p9-old-save");
    legacy.contentVersion = "1.27.0";
    for (const id of P9_IDS) delete legacy.pool[id];
    legacy.pool.nami = 0;
    legacy.pool.usopp = 1;
    legacy.pool.chopper = 7;
    legacy.pool["historical-unknown"] = 3;
    legacy.round = 17;
    human(legacy).gold = 43;
    const anchors = {
      rngState: legacy.rngState,
      phase: legacy.phase,
      shop: structuredClone(human(legacy).shop),
    };
    const restored = migrateMatchState(legacy);
    expect(restored.pool).toMatchObject({
      killer: 22,
      buggy: 18,
      "capone-bege": 14,
      whitebeard: 10,
      nami: 0,
      usopp: 1,
      chopper: 7,
      "historical-unknown": 3,
    });
    expect(restored).toMatchObject({
      contentVersion: "1.31.0",
      schemaVersion: 6,
      round: 17,
      phase: anchors.phase,
      rngState: anchors.rngState,
    });
    expect(human(restored).gold).toBe(43);
    expect(human(restored).shop).toEqual(anchors.shop);
  });

  it("round-trips present P9 units and modified pool keys without normalization", () => {
    const state = createMatch("p9-round-trip");
    const player = human(state);
    player.units = {};
    player.board = {};
    player.bench = player.bench.map(() => null);
    const boardUnit = addUnitToPlayer(state, player, "capone-bege", DEFAULT_CONTENT);
    const benchUnit = addUnitToPlayer(state, player, "killer", DEFAULT_CONTENT);
    if (!boardUnit || !benchUnit) throw new Error("Could not add round-trip fixtures.");
    const boardSlot = player.bench.indexOf(boardUnit.id);
    player.bench[boardSlot] = null;
    player.board["2,5"] = boardUnit.id;
    boardUnit.star = 2;
    boardUnit.items = ["black-blade"];
    state.pool.whitebeard = 3;
    const restored = deserializeMatch(serializeMatch(state));
    expect(restored).toEqual(state);
    expect(human(restored).board["2,5"]).toBe(boardUnit.id);
    expect(human(restored).bench).toContain(benchUnit.id);
    expect(restored.pool.whitebeard).toBe(3);
  });

  it("keeps one-survivor P8 Captain damage independent of P9 cost, trait, and star", () => {
    const values = [
      calculateLossDamage(12, "winner", [snapshot("killer", "killer", 1)]),
      calculateLossDamage(12, "winner", [snapshot("buggy", "buggy", 2)]),
      calculateLossDamage(12, "winner", [snapshot("whitebeard", "whitebeard", 3)]),
    ];
    expect(values).toEqual([4, 4, 4]);
  });
});

describe("P9 production asset integration", () => {
  it("ships v2-only static, portrait, token, atlas, manifest, and source entries", async () => {
    const matrix = JSON.parse(await readFile(
      path.join(projectRoot, "art/animation-v2/source-matrix.json"),
      "utf8",
    )) as { entries: Array<{ id: string; source: { sha256: string; localPath: string }; outputAssetKey: string }> };
    for (const id of P9_IDS) {
      expect(CREW_ANIMATION_MANIFEST).not.toHaveProperty(id);
      expect(getCrewAnimationDefinitions(id)).toEqual([CREW_V2_ANIMATIONS[id]]);
      expect(getCrewAnimationDefinition(id)).toMatchObject({
        contentId: id,
        version: "v2",
        frameCount: 46,
        sheetColumns: 8,
      });
      for (const kind of ["characters", "portraits", "tokens"] as const) {
        expect((await stat(path.join(projectRoot, `public/assets/${kind}/${id}.png`))).size).toBeGreaterThan(0);
      }
      const atlas = await readFile(path.join(projectRoot, `public/assets/animations/${id}-v2/${id}-v2.png`));
      expect(atlas.readUInt32BE(16)).toBe(1024);
      expect(atlas.readUInt32BE(20)).toBe(768);
      const metadata = JSON.parse(await readFile(
        path.join(projectRoot, `public/assets/animations/${id}-v2/${id}-v2.json`),
        "utf8",
      )) as { frameCount: number; clips: Record<string, unknown> };
      expect(metadata.frameCount).toBe(46);
      expect(Object.keys(metadata.clips).sort()).toEqual(["attack", "cast", "defeat", "hit", "idle", "move"]);
      const source = matrix.entries.find((entry) => entry.id === id);
      expect(source?.outputAssetKey).toBe(`${id}-v2`);
      const bytes = await readFile(path.join(projectRoot, source?.source.localPath ?? "missing"));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(source?.source.sha256);
    }
    const contactSheet = await readFile(path.join(projectRoot, "art/qa/p7-crew-contact-sheet.png"));
    expect(contactSheet.readUInt32BE(16)).toBe(1_400);
    expect(contactSheet.readUInt32BE(20)).toBe(720);
  });
});
