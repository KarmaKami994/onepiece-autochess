import { describe, expect, it, vi } from "vitest";
import {
  CONTENT,
  DEFAULT_CONTENT,
  createMatch,
  getStageDefinition,
  hashSeed,
  migrateMatchState,
  nextRandom,
  randomInt,
  shuffleDeterministic,
} from "../../game";

describe("canonical game content", () => {
  it("adds the four B15 pool keys when resuming a B14 voyage without advancing the shop RNG", () => {
    const recruits = { pudding: 27, cracker: 18, katakuri: 14, "big-mom": 10 };
    const saved = createMatch("b15-big-mom-pool-backfill", {
      ...DEFAULT_CONTENT,
      version: "1.40.0",
      units: DEFAULT_CONTENT.units.filter(unit => !Object.hasOwn(recruits, unit.id)).map(unit =>
        unit.id === "pekoms" ? { ...unit, traits: ["minks", "guardian"] } : unit,
      ),
      traits: DEFAULT_CONTENT.traits.filter(trait => trait.id !== "big-mom-pirates"),
    });
    const restored = migrateMatchState(saved, DEFAULT_CONTENT);
    expect(restored).toMatchObject({ schemaVersion: 6, contentVersion: "1.41.0", rngState: saved.rngState });
    expect(restored.players.map(player => player.shop)).toEqual(saved.players.map(player => player.shop));
    expect(restored.pool).toEqual({ ...saved.pool, ...recruits });
  });

  it("adds the five B14 pool keys to a B13 save without changing the existing shop or RNG", () => {
    const newIds = new Set(["heat", "wire", "shachi", "penguin", "jean-bart"]);
    const saved = createMatch("b14-crews-pool-backfill", {
      ...DEFAULT_CONTENT,
      version: "1.39.0",
      units: DEFAULT_CONTENT.units.filter(unit => !newIds.has(unit.id)),
      traits: DEFAULT_CONTENT.traits.filter(trait => !["kid-pirates", "heart-pirates"].includes(trait.id)),
    });
    const restored = migrateMatchState(saved, DEFAULT_CONTENT);
    expect(restored).toMatchObject({ schemaVersion: 6, contentVersion: "1.41.0", rngState: saved.rngState });
    expect(restored.players.map(player => player.shop)).toEqual(saved.players.map(player => player.shop));
    expect(restored.pool).toEqual({ ...saved.pool, heat: 22, wire: 27, shachi: 22, penguin: 27, "jean-bart": 18 });
  });

  it("backfills only the four B13 pool entries when resuming a 1.38 voyage", () => {
    const newIds = new Set(["bepo", "carrot", "pedro", "pekoms"]);
    const saved = createMatch("minks-pool-backfill", {
      ...DEFAULT_CONTENT,
      version: "1.38.0",
      units: DEFAULT_CONTENT.units.filter(unit => !newIds.has(unit.id)),
      traits: DEFAULT_CONTENT.traits.filter(trait => trait.id !== "minks"),
    });
    const restored = migrateMatchState(saved, DEFAULT_CONTENT);
    expect(restored).toMatchObject({ schemaVersion: 6, contentVersion: "1.41.0", rngState: saved.rngState });
    expect(restored.players.map(player => player.shop)).toEqual(saved.players.map(player => player.shop));
    expect(restored.pool).toEqual({ ...saved.pool, bepo: 22, carrot: 22, pedro: 18, pekoms: 27 });
  });

  it("fills the new shared pool entries when resuming an existing schema-6 voyage", () => {
    const newIds = ["hatchan", "kuroobi", "fisher-tiger"];
    const previousContent = {
      ...DEFAULT_CONTENT,
      version: "1.38.0",
      units: DEFAULT_CONTENT.units.filter(unit => !newIds.includes(unit.id)).map(unit =>
        unit.id === "jinbe" ? { ...unit, traits: ["straw-hat", "guardian"] } : unit,
      ),
      traits: DEFAULT_CONTENT.traits.filter(trait => trait.id !== "fish-man"),
    };
    const saved = createMatch("fish-man-pool-backfill", previousContent);
    const restored = migrateMatchState(saved, DEFAULT_CONTENT);
    expect(restored.schemaVersion).toBe(6);
    expect(restored.rngState).toBe(saved.rngState);
    expect(restored.players.map(player => player.shop)).toEqual(saved.players.map(player => player.shop));
    expect(restored.pool).toEqual({ ...saved.pool, hatchan: 27, kuroobi: 22, "fisher-tiger": 18 });
  });

  it("contains the complete requested roster and supporting content", () => {
    expect(CONTENT).toBe(DEFAULT_CONTENT);
    expect(DEFAULT_CONTENT.units.map((unit) => unit.id)).toEqual([
      "nami",
      "usopp",
      "chopper",
      "tashigi",
      "koby",
      "koala",
      "sanji",
      "robin",
      "smoker",
      "sabo",
      "franky",
      "brook",
      "ivankov",
      "killer",
      "luffy",
      "zoro",
      "kid",
      "crocodile",
      "jinbe",
      "kuma",
      "buggy",
      "law",
      "ace",
      "hancock",
      "doflamingo",
      "kizaru",
      "kuzan",
      "akainu",
      "capone-bege",
      "garp",
      "mihawk",
      "shanks",
      "blackbeard",
      "whitebeard",
      "hatchan",
      "kuroobi",
      "fisher-tiger",
      "bepo",
      "carrot",
      "pedro",
      "pekoms",
      "heat",
      "wire",
      "shachi",
      "penguin",
      "jean-bart",
      "pudding",
      "cracker",
      "katakuri",
      "big-mom",
    ]);
    expect(DEFAULT_CONTENT.units.map((unit) => unit.cost)).toEqual([
      1, 1, 1, 1, 1, 1,
      2, 2, 2, 2, 2, 2, 2, 2,
      3, 3, 3, 3, 3, 3, 3,
      4, 4, 4, 4, 4, 4, 4, 4,
      5, 5, 5, 5, 5,
      1, 2, 3,
      2, 2, 3, 1,
      2, 1, 2, 1, 3,
      1, 3, 4, 5,
    ]);
    expect(DEFAULT_CONTENT.traits).toHaveLength(18);
    expect(DEFAULT_CONTENT.items).toHaveLength(65);
    expect(DEFAULT_CONTENT.enemies).toHaveLength(29);
    expect(
      DEFAULT_CONTENT.stages
        .filter((stage) => stage.kind === "pve")
        .map((stage) => stage.round),
    ).toEqual([1, 2, 3, 9, 14, 19, 24, 28, 32, 36, 40]);
    expect(
      DEFAULT_CONTENT.stages
        .filter((stage) => stage.kind === "carousel")
        .map((stage) => stage.round),
    ).toEqual([4, 12, 17, 22, 27, 34]);
    expect(
      DEFAULT_CONTENT.units.every((unit) =>
        unit.assetPath.startsWith("/assets/characters/"),
      ),
    ).toBe(true);
    expect(
      DEFAULT_CONTENT.enemies.every((enemy) =>
        enemy.assetPath.startsWith("/assets/enemies/"),
      ),
    ).toBe(true);
  });

  it("keeps every canonical content name exact and every trait tier reachable", () => {
    expect(DEFAULT_CONTENT.units.map((unit) => unit.ability.name)).toEqual([
      "Thunderbolt Tempo",
      "Exploding Star",
      "Emergency Cure",
      "Flash Cut",
      "Shave Strike",
      "Fish-Man Karate",
      "Diable Jambe",
      "Clutch",
      "White Blow",
      "Dragon Claw",
      "Coup de Vent",
      "Soul Solid",
      "Healing Hormone",
      "Punisher Blades",
      "Gum-Gum Gatling",
      "Oni Giri",
      "Magnetic Crush",
      "Desert Spada",
      "Fish-Man Shockwave",
      "Ursus Shock",
      "Muggy Ball",
      "ROOM/Shambles",
      "Fire Fist",
      "Mero Mero",
      "String Bind",
      "Sacred Jewel",
      "Ice Age",
      "Great Eruption",
      "Castle Cannonade",
      "Galaxy Impact",
      "Black Blade Wave",
      "Divine Departure",
      "Black Hole",
      "Seaquake",
      "Six-Arm Sweep",
      "Tidal Palm",
      "Sun Pirates' Vow",
      "Polar Roundhouse",
      "Electro Claw",
      "Jaguar Lightning Blade",
      "Shell Charge",
      "Flame Breath",
      "Trident Hook",
      "Emergency Rescue",
      "Covering Guard",
      "Iron Bodyguard",
      "Memory Edit",
      "Biscuit Guard",
      "Mochi Barrage",
      "Ikoku Sovereignty",
    ]);
    expect(DEFAULT_CONTENT.traits.map((trait) => trait.name)).toEqual([
      "Big Mom Pirates",
      "Kid Pirates",
      "Heart Pirates",
      "Minks",
      "Fish-Man",
      "Straw Hat",
      "Navy",
      "Warlord",
      "Supernova",
      "Brotherhood",
      "Revolutionary",
      "Emperor",
      "Captain",
      "Brawler",
      "Swordsman",
      "Marksman",
      "Specialist",
      "Guardian",
    ]);
    expect(DEFAULT_CONTENT.items.map((item) => item.name)).toEqual([
      "Black Blade",
      "Meat Platter",
      "Clima-Tact",
      "Sniper Goggles",
      "Sea Prism Stone",
      "Armament Wraps",
      "Den Den Mushi",
      "Cola Engine",
      "Jolly Roger Fragment",
      "Devil Fruit Essence",
      "Cola Canister",
      "Jet Dial",
      "Sniper Lens",
      "Sea King Meat",
      "Sea-Prism Shard",
      "Black Blade Shard",
      "Armament Plate",
      "Captain's Sash",
      "Emperor's Jolly Roger",
      "Specialist's Log Pose",
      "Marine Justice Coat",
      "Marksman's Thunder Dial",
      "Captain's Logbook",
      "Brawler's Rumble Emblem",
      "Guardian's Sea-Prism Crest",
      "Revolutionary Flame",
      "Straw Hat Token",
      "Swordsman's Knot",
      "Devil Fruit Codex",
      "Observation Haki Mantle",
      "Barrier Bubble",
      "Reflect Dial",
      "Flame-Flame Grimoire",
      "Sea-Prism Boots",
      "Lucky Pirate Ribbon",
      "Cola Reservoir",
      "Energy-Siphon Scope",
      "Healing Bubble",
      "Star Shield Dial",
      "Shark Tooth Charm",
      "Miracle Talisman",
      "Efficient Bandanna",
      "Observation Goggles",
      "Armor-Piercing Scope",
      "Rush Flag",
      "Ricochet Dial",
      "Impact Dial",
      "Jet Sash",
      "Mystery Treasure Chest",
      "Smoke-Star Escape",
      "Gas Mask",
      "Armament Sash",
      "Spiked Armament",
      "Impact-Proof Gauntlets",
      "Phoenix Feather",
      "Banquet Belt",
      "Healing Dial",
      "Guard Point Dummy",
      "Reversal Band",
      "Advanced Armament Orb",
      "Mera Mera Ember",
      "Bombardier Band",
      "Iron Pirate Helm",
      "Bodyguard Band",
      "Nullification Bandanna",
    ]);
    for (const trait of DEFAULT_CONTENT.traits) {
      const rosterCount = DEFAULT_CONTENT.units.filter((unit) =>
        unit.traits.includes(trait.id),
      ).length;
      const highestTier = Math.max(
        ...trait.tiers.map((tier) => tier.required),
      );
      expect(
        highestTier,
        `${trait.name} has an unreachable tier`,
      ).toBeLessThanOrEqual(rosterCount);
    }
  });

  it("exposes the requested timer schedule", () => {
    expect(getStageDefinition(1).preparationSeconds).toBe(20);
    expect(getStageDefinition(5).preparationSeconds).toBe(40);
    expect(getStageDefinition(10).preparationSeconds).toBe(50);
    expect(getStageDefinition(6).preparationSeconds).toBe(30);
    expect(getStageDefinition(20).battleSeconds).toBe(0);
    expect(getStageDefinition(20).kind).toBe("voyage-choice");
  });

  it("pins the level rarity table and shared-pool sizes", () => {
    expect(DEFAULT_CONTENT.config.poolCopiesByCost).toEqual([
      27, 22, 18, 14, 10,
    ]);
    expect(DEFAULT_CONTENT.config.shopOddsByLevel).toEqual({
      "2": [1, 0, 0, 0, 0],
      "3": [0.7, 0.3, 0, 0, 0],
      "4": [0.5, 0.4, 0.1, 0, 0],
      "5": [0.36, 0.42, 0.2, 0.02, 0],
      "6": [0.25, 0.4, 0.3, 0.05, 0],
      "7": [0.16, 0.33, 0.35, 0.15, 0.01],
      "8": [0.11, 0.27, 0.35, 0.22, 0.05],
      "9": [0.05, 0.2, 0.35, 0.3, 0.1],
    });
  });
});

describe("seeded random source", () => {
  it("repeats exactly and stays in range", () => {
    const seed = hashSeed("grand-line");
    expect(nextRandom(seed)).toEqual(nextRandom(seed));
    expect(randomInt(seed, 3, 8).value).toBeGreaterThanOrEqual(3);
    expect(randomInt(seed, 3, 8).value).toBeLessThan(8);
    expect(shuffleDeterministic([1, 2, 3, 4], seed)).toEqual(
      shuffleDeterministic([1, 2, 3, 4], seed),
    );
  });

  it("never depends on Math.random", () => {
    const randomSpy = vi
      .spyOn(Math, "random")
      .mockImplementation(() => {
        throw new Error("Math.random must not be called");
      });
    expect(() => createMatch("no-global-rng")).not.toThrow();
    randomSpy.mockRestore();
  });

  it("creates byte-for-byte deterministic matches", () => {
    expect(createMatch("same-seed")).toEqual(createMatch("same-seed"));
    expect(createMatch("same-seed").rngState).not.toBe(
      createMatch("different-seed").rngState,
    );
  });
});
