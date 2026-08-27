import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ALL_CREW_ANIMATION_DEFINITIONS,
  CREW_ANIMATION_MANIFEST,
  LUFFY_V2_ANIMATION,
  getCrewAnimationDefinitions,
} from "../components/crewAnimationManifest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const characterSlugs = [
  "ace",
  "chopper",
  "crocodile",
  "doflamingo",
  "garp",
  "hancock",
  "kid",
  "law",
  "luffy",
  "mihawk",
  "nami",
  "robin",
  "sabo",
  "sanji",
  "smoker",
  "tashigi",
  "usopp",
  "zoro",
];
const enemySlugs = [
  "marine-recruit",
  "pacifista",
  "pirate-raider",
  "rifle-marine",
  "sea-king",
];
const allSpriteSlugs = [...characterSlugs, ...enemySlugs].sort();

async function sourceFiles(directory: string): Promise<string[]> {
  const absolute = path.join(projectRoot, directory);
  const entries = await readdir(absolute, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const relative = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(relative);
      return /\.(?:ts|tsx|css)$/.test(entry.name) ? [relative] : [];
    }),
  );
  return nested.flat();
}

describe("local-only product boundary", () => {
  it("keeps crew animation manifests complete and within their sheets", () => {
    expect(Object.keys(CREW_ANIMATION_MANIFEST).sort()).toEqual(characterSlugs);
    for (const definition of Object.values(CREW_ANIMATION_MANIFEST)) {
      expect(Object.keys(definition.clips).sort()).toEqual([
        "attack",
        "cast",
        "defeat",
        "hit",
        "idle",
        "move",
      ]);
      const coveredFrames = Object.values(definition.clips).flatMap((clip) =>
        Array.from(
          { length: clip.end - clip.start + 1 },
          (_, offset) => clip.start + offset,
        ),
      );
      expect([...new Set(coveredFrames)].sort((a, b) => a - b)).toEqual(
        Array.from({ length: definition.frameCount }, (_, index) => index),
      );
      expect(definition.sheetPath).toMatch(/^\/assets\/animations\//);
    }
  });

  it("pins Phaser 4.2.1 and exposes the one-command local scripts", async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, "package.json"), "utf8"),
    ) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };

    expect(packageJson.dependencies.phaser).toBe("4.2.1");
    expect(packageJson.scripts["assets:luffy:v2"]).toContain(
      "build_v2_assets.mjs",
    );
    expect(packageJson.scripts.dev).toBe("vinext dev");
    expect(packageJson.scripts.build).toBe("vinext build");
  });

  it("keeps the domain and local session independent of networking", async () => {
    const files = (
      await Promise.all(
        ["game"].map(async (directory) => {
          try {
            return await sourceFiles(directory);
          } catch {
            return [];
          }
        }),
      )
    ).flat();

    for (const file of files) {
      const source = await readFile(path.join(projectRoot, file), "utf8");
      expect(source, `${file} must not call fetch`).not.toMatch(/\bfetch\s*\(/);
      expect(source, `${file} must not open sockets`).not.toMatch(
        /\b(?:WebSocket|EventSource)\s*\(/,
      );
    }
    const localSession = await readFile(
      path.join(projectRoot, "app", "useLocalGameSession.ts"),
      "utf8",
    );
    expect(localSession).not.toMatch(/\bfetch\s*\(/);
    expect(localSession).not.toMatch(/\b(?:WebSocket|EventSource)\s*\(/);
  });

  it("keeps nondeterministic randomness outside the engine", async () => {
    let files: string[] = [];
    try {
      files = await sourceFiles("game");
    } catch {
      return;
    }

    for (const file of files) {
      const source = await readFile(path.join(projectRoot, file), "utf8");
      expect(source, `${file} uses Math.random`).not.toMatch(/\bMath\.random\s*\(/);
    }
  });

  it("bundles every canonical sprite and both derived gameplay sizes", async () => {
    const assetRoot = path.join(projectRoot, "public", "assets");
    const namesIn = async (directory: string) =>
      (await readdir(path.join(assetRoot, directory)))
        .filter((name) => name.endsWith(".png"))
        .sort();

    expect(await namesIn("characters")).toEqual(
      characterSlugs.map((slug) => `${slug}.png`),
    );
    expect(await namesIn("enemies")).toEqual(
      enemySlugs.map((slug) => `${slug}.png`),
    );
    expect(await namesIn("portraits")).toEqual(
      allSpriteSlugs.map((slug) => `${slug}.png`),
    );
    expect(await namesIn("tokens")).toEqual(
      allSpriteSlugs.map((slug) => `${slug}.png`),
    );

    const requiredFiles = [
      ...characterSlugs.map((slug) =>
        path.join(assetRoot, "characters", `${slug}.png`),
      ),
      ...enemySlugs.map((slug) =>
        path.join(assetRoot, "enemies", `${slug}.png`),
      ),
      ...allSpriteSlugs.flatMap((slug) => [
        path.join(assetRoot, "portraits", `${slug}.png`),
        path.join(assetRoot, "tokens", `${slug}.png`),
      ]),
      path.join(projectRoot, "public", "og.png"),
    ];
    for (const file of requiredFiles) {
      const bytes = await readFile(file);
      expect(bytes.length, `${file} is unexpectedly small`).toBeGreaterThan(100);
      expect([...bytes.subarray(0, 8)], `${file} is not a PNG`).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
      if (file.endsWith("public\\og.png") || file.endsWith("public/og.png")) {
        expect(bytes.readUInt32BE(16)).toBe(1200);
        expect(bytes.readUInt32BE(20)).toBe(630);
      }
    }
  });

  it("records provenance for every generated source asset", async () => {
    const notes = await readFile(
      path.join(projectRoot, "ASSET_PROVENANCE.md"),
      "utf8",
    );
    for (const slug of characterSlugs) {
      expect(notes).toContain(
        `Final asset: \`public/assets/characters/${slug}.png\``,
      );
    }
    for (const slug of enemySlugs) {
      expect(notes).toContain(
        `Final asset: \`public/assets/enemies/${slug}.png\``,
      );
    }
    expect(notes).toContain("Final asset: `public/og.png`");
  });

  it("bundles every manifest-driven character animation", async () => {
    for (const definition of Object.values(CREW_ANIMATION_MANIFEST)) {
      const animationRoot = path.join(
        projectRoot,
        "public",
        "assets",
        "animations",
        definition.contentId,
      );
      const sheet = await readFile(
        path.join(animationRoot, `${definition.contentId}.png`),
      );
      expect([...sheet.subarray(0, 8)]).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
      expect(sheet.readUInt32BE(16)).toBe(
        definition.frameWidth * definition.frameCount,
      );
      expect(sheet.readUInt32BE(20)).toBe(definition.frameHeight);

      const metadata = JSON.parse(
        await readFile(
          path.join(animationRoot, `${definition.contentId}.json`),
          "utf8",
        ),
      ) as { frames: unknown[] };
      expect(metadata.frames).toHaveLength(definition.frameCount);

      const source = await readFile(
        path.join(
          projectRoot,
          "art",
          "libresprite",
          `${definition.contentId}-pilot.aseprite`,
        ),
      );
      expect(source.length).toBeGreaterThan(1_000);
    }
  });

  it("bundles the licensed Luffy v2 pilot with a reproducible source map", async () => {
    expect(
      ALL_CREW_ANIMATION_DEFINITIONS.map((definition) => definition.assetKey),
    ).toHaveLength(
      new Set(
        ALL_CREW_ANIMATION_DEFINITIONS.map(
          (definition) => definition.assetKey,
        ),
      ).size,
    );
    expect(
      getCrewAnimationDefinitions("luffy").map(
        (definition) => definition.assetKey,
      ),
    ).toEqual(["luffy", "luffy-v2"]);
    expect(LUFFY_V2_ANIMATION.frameCount).toBe(46);
    expect(LUFFY_V2_ANIMATION.frameWidth).toBe(128);
    expect(LUFFY_V2_ANIMATION.frameHeight).toBe(128);
    expect(LUFFY_V2_ANIMATION.sheetColumns).toBe(8);

    const animationRoot = path.join(
      projectRoot,
      "public",
      "assets",
      "animations",
      "luffy-v2",
    );
    const sheet = await readFile(path.join(animationRoot, "luffy-v2.png"));
    expect([...sheet.subarray(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(sheet.readUInt32BE(16)).toBe(128 * 8);
    expect(sheet.readUInt32BE(20)).toBe(128 * 6);

    const metadata = JSON.parse(
      await readFile(path.join(animationRoot, "luffy-v2.json"), "utf8"),
    ) as {
      sourceSha256: string;
      frameCount: number;
      frames: unknown[];
    };
    expect(metadata.frameCount).toBe(46);
    expect(metadata.frames).toHaveLength(46);

    const source = await readFile(
      path.join(
        projectRoot,
        "art",
        "licensed-reference",
        "gigant-battle",
        "MonkeyDLuffy.png",
      ),
    );
    const sourceHash = createHash("sha256").update(source).digest("hex");
    expect(sourceHash).toBe(
      "d77e40b80168e4533a27d22e2da55208435034267c9210597ecc5193d272113d",
    );
    expect(metadata.sourceSha256).toBe(sourceHash);

    const editable = await readFile(
      path.join(projectRoot, "art", "libresprite", "luffy-v2.aseprite"),
    );
    expect(editable.length).toBeGreaterThan(10_000);
  });
});
