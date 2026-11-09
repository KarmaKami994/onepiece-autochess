import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT, getStageDefinition } from "../game";
import { crewReference, filterReference } from "../app/crewReference";
import { createItemView, createUnitReferenceView } from "../app/selectors";

describe("content-driven crew reference", () => {
  it("covers all crew, items, recipes, bonds, forms and PvE without missing presentation assets", () => {
    const entries = crewReference(DEFAULT_CONTENT);
    for (const [category, expected] of [["crew", 34], ["items", 65], ["food", 3], ["traits", 13], ["forms", 4], ["status", 12], ["pve", DEFAULT_CONTENT.enemies.length], ["rounds", 40]] as const) {
      expect(entries.filter((entry) => entry.category === category)).toHaveLength(expected);
    }
    for (const entry of entries) if (entry.imagePath) expect(existsSync(path.join(process.cwd(), "public", entry.imagePath))).toBe(true);
    const completed = entries.filter((entry) => entry.category === "items" && entry.kind === "completed");
    expect(completed).toHaveLength(55);
    for (const item of completed) expect(item.details).toContain(`Recipe: ${createItemView(item.id, DEFAULT_CONTENT).recipeComponents?.map((part) => part.name).join(" + ")}`);
    expect(entries.find((entry) => entry.id === "chopper-monster-point")?.description).toContain("8 seconds");
  });

  it("uses the same unit/item descriptions as Inspector and reflects current star/config values", () => {
    const one = crewReference(DEFAULT_CONTENT, 1).find((entry) => entry.category === "crew" && entry.id === "nami")!;
    const three = crewReference(DEFAULT_CONTENT, 3).find((entry) => entry.category === "crew" && entry.id === "nami")!;
    const unit = DEFAULT_CONTENT.units.find((entry) => entry.id === "nami")!;
    expect(one.description).toBe(createUnitReferenceView(unit, DEFAULT_CONTENT).description);
    expect(three.details[0]).toContain(`HP ${Math.floor(unit.stats.health * DEFAULT_CONTENT.config.starStatBasisPoints[2] / 10_000)}`);
    expect(three.details.join(" ")).toContain("special");
    expect(crewReference(DEFAULT_CONTENT, 3).find((entry) => entry.category === "crew" && entry.id === "robin")).toMatchObject({
      name: "Robin — Demonio Fleur", imagePath: "/assets/forms/robin-demonio-fleur/portrait.svg",
    });
    expect(filterReference(crewReference(DEFAULT_CONTENT), { category: "crew", query: "nami thunder", cost: 1, trait: "straw-hat" })).toHaveLength(1);
    expect(filterReference(crewReference(DEFAULT_CONTENT), { category: "items", query: "", kind: "completed" })).toHaveLength(55);
  });

  it("derives exact stage/reward topology and includes new definitions automatically", () => {
    const custom = structuredClone(DEFAULT_CONTENT);
    custom.units.push({ ...custom.units[0], id: "future-crew", name: "Future Crew" });
    expect(crewReference(custom).some((entry) => entry.id === "future-crew")).toBe(true);
    const rounds = crewReference(DEFAULT_CONTENT).filter((entry) => entry.category === "rounds");
    for (let round = 1; round <= 40; round += 1) expect(rounds[round - 1].kind).toBe(getStageDefinition(round).kind);
    expect(rounds[9].details.join(" ")).toContain("No combat or item reward");
    expect(rounds[19].details.join(" ")).toContain("cost-5");
    expect(rounds[23].details.join(" ")).toContain("completed");
  });
});
