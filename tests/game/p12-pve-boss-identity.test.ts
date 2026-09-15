import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getCrewAnimationDefinition } from "../../components/crewAnimationManifest";
import { DEFAULT_CONTENT, getStageDefinition } from "../../game";

const root = path.resolve(import.meta.dirname, "..", "..");

const sourceProfiles = {
  arlong: "sea-king",
  "fish-man-raider": "pirate-raider",
  enel: "pacifista",
  "skypiea-priest": "rifle-marine",
  "rob-lucci": "pacifista",
  "cp9-elite-laser": "pacifista",
  "cp9-elite-tidal": "sea-king",
  magellan: "vice-admiral",
  "impel-down-guard": "vice-admiral",
  "hody-jones": "cipher-pol-agent",
  "new-fish-man-officer": "cipher-pol-agent",
  "caesar-clown": "seraphim",
  "punk-hazard-guard": "seraphim",
  pica: "vice-admiral",
  "donquixote-officer-vanguard": "vice-admiral",
  "donquixote-officer-assault": "cipher-pol-agent",
  "donquixote-officer-artillery": "seraphim",
  kaido: "seraphim",
  "beast-pirate-vanguard": "vice-admiral",
  "beast-pirate-assault": "cipher-pol-agent",
  "beast-pirate-artillery": "seraphim",
} as const;

const waves = [
  [9, "Arlong Park", ["arlong", "fish-man-raider", "fish-man-raider"]],
  [14, "Skypiea Judgment", ["enel", "skypiea-priest", "skypiea-priest"]],
  [19, "Enies Lobby Showdown", ["rob-lucci", "cp9-elite-laser", "cp9-elite-tidal"]],
  [24, "Impel Down", ["magellan", "impel-down-guard", "impel-down-guard"]],
  [28, "Fish-Man Island Uprising", ["hody-jones", "new-fish-man-officer", "new-fish-man-officer"]],
  [32, "Punk Hazard", ["caesar-clown", "punk-hazard-guard", "punk-hazard-guard"]],
  [36, "Dressrosa Siege", ["pica", "donquixote-officer-vanguard", "donquixote-officer-assault", "donquixote-officer-assault", "donquixote-officer-artillery", "donquixote-officer-artillery"]],
  [40, "Onigashima Final Stand", ["kaido", "beast-pirate-vanguard", "beast-pirate-vanguard", "beast-pirate-assault", "beast-pirate-assault", "beast-pirate-artillery", "beast-pirate-artillery"]],
] as const;

function mechanics(ability: object) {
  return Object.fromEntries(Object.entries(ability).filter(([key]) =>
    key !== "id" && key !== "name" && key !== "description"));
}

describe("P12 named PvE encounters", () => {
  it("keeps the eight encounter rounds and exact boss/faction compositions", () => {
    expect(DEFAULT_CONTENT.version).toBe("1.31.0");
    for (const [round, name, expectedIds] of waves) {
      const stage = getStageDefinition(round);
      expect(stage.kind).toBe("pve");
      expect(stage.name).toBe(name);
      expect(stage.enemyWave?.flatMap(({ enemyId, count }) => Array(count).fill(enemyId))).toEqual(expectedIds);
    }
  });

  it("changes visual and ability identity without changing the existing PvE combat profiles", () => {
    expect(DEFAULT_CONTENT.enemies).toHaveLength(29);
    const abilityIds = new Set<string>();
    for (const [id, sourceId] of Object.entries(sourceProfiles)) {
      const enemy = DEFAULT_CONTENT.enemies.find((entry) => entry.id === id);
      const source = DEFAULT_CONTENT.enemies.find((entry) => entry.id === sourceId);
      expect(enemy, id).toBeDefined();
      expect(source, sourceId).toBeDefined();
      expect(enemy?.stats).toEqual(source?.stats);
      expect(mechanics(enemy!.ability!)).toEqual(mechanics(source!.ability!));
      expect(enemy?.ability?.id).toBe(`${id}-signature`);
      expect(enemy?.ability?.name).not.toBe(source?.ability?.name);
      abilityIds.add(enemy!.ability!.id);
    }
    expect(abilityIds.size).toBe(Object.keys(sourceProfiles).length);
  });

  it("resolves every named enemy to a local static image and a 46-frame v2 atlas", async () => {
    for (const id of Object.keys(sourceProfiles)) {
      const enemy = DEFAULT_CONTENT.enemies.find((entry) => entry.id === id)!;
      const animation = getCrewAnimationDefinition(id);
      expect(animation).toMatchObject({ contentId: id, kind: "pve", version: "v2", frameCount: 46 });
      await access(path.join(root, "public", enemy.assetPath.slice(1)));
      await access(path.join(root, "public/assets/portraits", `${id}.png`));
      await access(path.join(root, "public/assets/tokens", `${id}.png`));
      await access(path.join(root, "public", animation!.sheetPath.slice(1)));
      const metadataPath = path.join(root, "public/assets/animations", animation!.assetKey, `${animation!.assetKey}.json`);
      const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
      expect(metadata.frameCount).toBe(46);
      expect(animation!.idleVisualTopPx).toBe(metadata.frame.idleVisualTopPx);
    }
    expect(getCrewAnimationDefinition("cp9-elite-laser")?.assetKey).toBe("cp9-elite-v2");
    expect(getCrewAnimationDefinition("donquixote-officer-artillery")?.assetKey).toBe("donquixote-officer-v2");
    expect(getCrewAnimationDefinition("beast-pirate-assault")?.assetKey).toBe("beast-pirate-v2");
  });

  it("records every P12 source, processing rule, and permission basis", async () => {
    const matrix = JSON.parse(await readFile(path.join(root, "art/animation-v2/source-matrix.json"), "utf8"));
    const p12Sources = matrix.entries.filter((entry: { id: string }) =>
      ["arlong", "enel", "rob-lucci", "magellan", "hody-jones", "caesar-clown", "pica", "kaido", "fish-man-raider", "skypiea-priest", "cp9-elite", "impel-down-guard", "new-fish-man-officer", "punk-hazard-guard", "donquixote-officer", "beast-pirate"].includes(entry.id));
    expect(p12Sources).toHaveLength(16);
    for (const entry of p12Sources) {
      expect(entry.kind).toBe("pve");
      expect(entry.source.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(["confirmed", "project-owned"]).toContain(entry.permission.status);
      await access(path.join(root, entry.source.localPath));
    }
    await access(path.join(root, "art/qa/p12-pve-contact-sheet.png"));
  });
});
