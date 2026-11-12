import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT } from "../game";
import { itemVisual, STATUS_VISUALS, TRAIT_VISUALS } from "../components/gameVisualManifest";
import { crewReference } from "../app/crewReference";
import provenance from "../art/production/b12/provenance.json";

const read = (file: string) => readFile(path.join(process.cwd(), file));
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const symbols = ".0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
type Pixels = { size: number; palette: (string | null)[]; rows: string[] };

describe("B12 fixed local icon production", () => {
  it("covers the existing catalogues exactly without adding equipment, food, recipes or effects", () => {
    const ids = (family: string) => provenance.outputs.filter(r => r.family === family).map(r => r.id).sort();
    expect(ids("items")).toEqual(DEFAULT_CONTENT.items.map(i => i.id).sort());
    expect(ids("food")).toEqual(DEFAULT_CONTENT.foods!.map(f => f.id).sort());
    expect(ids("traits")).toEqual(Object.keys(TRAIT_VISUALS).sort());
    expect(ids("status")).toEqual(Object.keys(STATUS_VISUALS).sort());
    expect(crewReference(DEFAULT_CONTENT).filter(entry => entry.category === "traits").map(entry => entry.imagePath).sort()).toEqual(Object.values(TRAIT_VISUALS).map(visual => visual.imagePath).sort());
    expect(provenance.outputs).toHaveLength(93);
    expect(DEFAULT_CONTENT.items.filter(i => i.kind === "component")).toHaveLength(10);
    expect(DEFAULT_CONTENT.items.filter(i => i.kind === "completed")).toHaveLength(55);
    expect(Object.keys(DEFAULT_CONTENT.itemRecipes)).toHaveLength(55);
    for (const food of DEFAULT_CONTENT.foods!) expect(ids("items")).not.toContain(food.id);
    for (const record of provenance.outputs.filter(r => r.family === "items")) {
      const item = DEFAULT_CONTENT.items.find(i => i.id === record.id)!;
      expect(record.kind).toBe(item.kind);
      expect(record.traitBadge).toBe(item.grantedTraitId);
      expect(itemVisual(item.id, item.icon)).toMatchObject({ imagePath: `/assets/items/${item.id}.svg`, fallbackGlyph: item.icon });
    }
  });

  // A separate timed case per package keeps the normal five-second deadline
  // meaningful under coverage and slower CI storage.
  it.each(provenance.outputs)("exports $family/$id as exact 2x pixels with pinned editable sources", async record => {
    for (const pinned of [record.source, record.master, record.editableSvg, record.output]) {
      const bytes = await read(pinned.path);
      expect(bytes.length, pinned.path).toBe(pinned.bytes);
      expect(hash(bytes), pinned.path).toBe(pinned.sha256);
    }
    const source = JSON.parse((await read(record.source.path)).toString()) as Pixels;
    expect(source.size).toBe(48); expect(source.rows).toHaveLength(48);
    expect(source.rows.every(row => row.length === 48)).toBe(true);
    expect(source.palette[0]).toBeNull();
    expect(source.palette.slice(1).every(color => /^#[0-9a-f]{6}$/.test(color!))).toBe(true);
    const expected = Buffer.alloc(48 * 48 * 4);
    for (const [y, row] of source.rows.entries()) for (const [x, symbol] of [...row].entries()) {
      const index = symbols.indexOf(symbol); expect(index).toBeGreaterThanOrEqual(0);
      const color = source.palette[index];
      if (color) { const offset = (y * 48 + x) * 4; Buffer.from(color.slice(1), "hex").copy(expected, offset); expected[offset + 3] = 255; }
    }
    expect(source.rows[0]).toBe(".".repeat(48));
    const master = await sharp(await read(record.master.path)).ensureAlpha().raw().toBuffer();
    expect(master.equals(expected)).toBe(true);
    const runtime = await read(record.output.path), svg = runtime.toString();
    expect(runtime.length).toBeLessThanOrEqual(record.family === "food" ? 4096 : 12 * 1024);
    expect(svg).toContain('width="96" height="96"');
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg.replace('xmlns="http://www.w3.org/2000/svg"', "")).not.toMatch(/<image|<script|data:|https?:|href=|filter=|onload=/i);
    const rendered = await sharp(runtime).resize(48, 48, { kernel: "nearest" }).ensureAlpha().raw().toBuffer();
    expect(rendered.equals(expected)).toBe(true);
    if (record.original) {
      expect(hash(await read(record.original.path))).toBe(record.original.sha256);
      expect(svg).toBe((await read(record.original.path)).toString().replace('width="48" height="48"', 'width="96" height="96"'));
    }
  });

  it("pins authoring/export inputs and retains exactly the three accepted B10 pilots", async () => {
    for (const input of provenance.inputs) expect(hash(await read(input.path)), input.path).toBe(input.sha256);
    expect(provenance.outputs.filter(r => r.retainedPilot).map(r => r.id).sort()).toEqual(["black-blade", "emperors-jolly-roger", "sea-prism-shard"]);
  });

  it("distinguishes related objects and every status by geometry even without colour", async () => {
    const pairs = [
      ["sea-prism-shard", "sea-prism-stone"], ["black-blade-shard", "black-blade"],
      ["cola-canister", "cola-reservoir"], ["cola-reservoir", "cola-engine"],
      ["captains-logbook", "devil-fruit-codex"], ["devil-fruit-codex", "flame-flame-grimoire"],
      ["captains-sash", "jet-sash"], ["jet-sash", "armament-sash"],
    ];
    const silhouette = async (family: string, id: string) => {
      const source = JSON.parse((await read(`art/production/b12/${family}/${id}.json`)).toString()) as Pixels;
      // Ignore frames and all material colour; preserve only object vs backdrop.
      return source.rows.slice(10, 33).map(row => [...row.slice(10, 33)].map(symbol => {
        const color = source.palette[symbols.indexOf(symbol)]; return color && !["#211b29", "#151d2e", "#182136"].includes(color) ? "x" : ".";
      }).join("")).join("");
    };
    for (const [a, b] of pairs) expect(await silhouette("items", a), `${a} / ${b}`).not.toBe(await silhouette("items", b));
    const statuses = await Promise.all(Object.keys(STATUS_VISUALS).map(id => silhouette("status", id)));
    expect(new Set(statuses).size).toBe(12);
  });
});
