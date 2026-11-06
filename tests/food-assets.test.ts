import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT } from "../game";

describe("B09 original food assets", () => {
  it("covers the separate food catalogue exactly with compact local SVGs and reproducible provenance", async () => {
    const root = process.cwd();
    const provenance = JSON.parse(await readFile(path.join(root, "art/ui-icons/food-provenance.json"), "utf8")) as {
      permission: string; sourcePath: string; sourceSha256: string; generatorPath: string; generatorSha256: string;
      outputs: { id: string; path: string; sha256: string }[];
    };
    const digest = async (file: string) => createHash("sha256").update(await readFile(path.join(root, file))).digest("hex");
    expect(provenance.permission).toContain("Original project-authored");
    expect(await digest(provenance.sourcePath)).toBe(provenance.sourceSha256);
    expect(await digest(provenance.generatorPath)).toBe(provenance.generatorSha256);
    expect((await readdir(path.join(root, "public/assets/food"))).sort()).toEqual((DEFAULT_CONTENT.foods ?? []).map(food => `${food.id}.svg`).sort());
    expect(provenance.outputs.map(entry => entry.id).sort()).toEqual((DEFAULT_CONTENT.foods ?? []).map(food => food.id).sort());
    for (const output of provenance.outputs) {
      const food = DEFAULT_CONTENT.foods?.find(food => food.id === output.id);
      expect(food?.assetPath).toBe(`/${output.path.replace(/^public\//, "")}`);
      expect(await digest(output.path)).toBe(output.sha256);
      const bytes = await readFile(path.join(root, output.path)); const text = bytes.toString("utf8");
      expect(bytes.length).toBeLessThan(4_096); expect(text).not.toMatch(/<script|<image|href=|onload=/i);
      expect(await sharp(bytes).metadata()).toMatchObject({ width: 96, height: 96, format: "svg" });
    }
  });
});
