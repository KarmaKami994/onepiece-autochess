import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT, createMatch, createMemoryStorage, getActiveTraitsForUnits, simulateBattle } from "../game";
import { createTeamPlan, parseTeamPlan, simulateTeamPlan, validateTeamPlan, type TeamPlan } from "../game/teamPlanner";
import { deleteTeamPlan, readTeamPlans, storeTeamPlan, TEAM_PLANS_KEY } from "../app/plannerStorage";
import { plannerPresentation } from "../app/plannerPresentation";

function plan(): TeamPlan {
  const value = createTeamPlan();
  value.teams.a = [{ id: "crew-1", definitionId: "luffy", star: 3, items: ["armament-wraps"], position: { x: 0, y: 3 } }];
  value.teams.b = [{ id: "crew-1", definitionId: "robin", star: 3, items: [], position: { x: 7, y: 3 } }];
  return value;
}

describe("isolated team planner", () => {
  it("uses production progression, traits and exact simulation with deterministic mirrored teams", () => {
    const input = plan();
    const before = structuredClone(input);
    const match = createMatch("unrelated-voyage");
    const matchBefore = structuredClone(match);
    const result = simulateTeamPlan(input);
    if (!result.ok) throw new Error(result.errors.join(" "));
    expect(result.teamA.units[0].formId).toBe("luffy-gear-4-boundman");
    expect(result.teamB.units[0].formId).toBe("robin-demonio-fleur");
    expect(result.teamB.units[0].position).toEqual({ x: 0, y: 2 });
    expect(result.teamA.units[0].id).not.toBe(result.teamB.units[0].id);
    expect(result.teamA.activeTraits).toEqual(getActiveTraitsForUnits(result.teamA.units));
    expect(result.result).toEqual(simulateBattle(result.teamA, result.teamB, { seed: input.seed, recordEvents: true }));
    expect(simulateTeamPlan(input)).toEqual(result);
    expect(input).toEqual(before);
    expect(match).toEqual(matchBefore);
    const rendered = plannerPresentation(result, DEFAULT_CONTENT);
    expect(rendered.presentation?.boardUnits.filter((unit) => unit.zone === "board")).toHaveLength(2);
    expect(rendered.recapA?.finalCrew[0].name).toBe("Luffy — Gear 4: Boundman");
    expect(rendered.recapB?.finalCrew[0].name).toBe("Robin — Demonio Fleur");
  });

  it("accepts an explicitly chosen legal branch with both catalysts and rejects a missing catalyst", () => {
    const value = plan();
    value.teams.a[0].items.push("sniper-goggles");
    value.teams.a[0].formId = "luffy-gear-4-snakeman";
    expect(validateTeamPlan(value).ok).toBe(true);
    value.teams.a[0].items = ["armament-wraps"];
    expect(validateTeamPlan(value).ok).toBe(false);
  });

  it.each([
    ["foreign crew", (value: TeamPlan) => { value.teams.a[0].definitionId = "kaido"; }],
    ["foreign item", (value: TeamPlan) => { value.teams.a[0].items = ["missing"]; }],
    ["duplicate completed item", (value: TeamPlan) => { value.teams.a[0].items = ["armament-wraps", "armament-wraps"]; }],
    ["uncrafted components", (value: TeamPlan) => { value.teams.a[0].items = ["cola-canister", "jet-dial"]; }],
    ["redundant trait grant", (value: TeamPlan) => { value.teams.a[0].items = ["straw-hat-token"]; }],
    ["item cap", (value: TeamPlan) => { value.teams.a[0].items = ["armament-wraps", "sniper-goggles", "sea-prism-stone", "black-blade"]; }],
    ["temporary form", (value: TeamPlan) => { value.teams.a[0].definitionId = "chopper"; value.teams.a[0].formId = "chopper-monster-point"; }],
    ["wrong base form", (value: TeamPlan) => { value.teams.a[0].formId = "robin-demonio-fleur"; }],
    ["wrong stars", (value: TeamPlan) => { value.teams.a[0].star = 1; value.teams.a[0].formId = "luffy-gear-4-boundman"; }],
    ["outside deployment", (value: TeamPlan) => { value.teams.a[0].position.y = 0; }],
    ["fractional cell", (value: TeamPlan) => { value.teams.a[0].position.x = 0.5; }],
    ["duplicate cell", (value: TeamPlan) => { value.teams.a.push({ ...value.teams.a[0], id: "other" }); }],
    ["duplicate unit ID", (value: TeamPlan) => { value.teams.a.push({ ...value.teams.a[0], position: { x: 1, y: 3 } }); }],
    ["excess capacity", (value: TeamPlan) => { value.teams.a = Array.from({ length: 10 }, (_, i) => ({ ...value.teams.a[0], id: `u${i}`, position: { x: i % 8, y: 3 + Math.floor(i / 8) } })); }],
    ["content mismatch", (value: TeamPlan) => { value.contentVersion = "old-content"; }],
    ["blank seed", (value: TeamPlan) => { value.seed = " "; }],
  ])("rejects %s without modifying the input", (_, change) => {
    const value = plan(); change(value);
    const before = structuredClone(value);
    expect(validateTeamPlan(value).ok).toBe(false);
    expect(simulateTeamPlan(value).ok).toBe(false);
    expect(value).toEqual(before);
  });

  it("round-trips a detached whitelist, rejects malformed/oversized documents and requires two nonempty combat teams", () => {
    const value = plan();
    const checked = parseTeamPlan(JSON.stringify({ ...value, match: createMatch("not-imported"), unexpected: true }));
    if (!checked.ok) throw new Error(checked.errors.join(" "));
    expect(checked.plan).not.toHaveProperty("match");
    expect(checked.plan).not.toHaveProperty("unexpected");
    expect(parseTeamPlan(JSON.stringify(checked.plan))).toEqual(checked);
    checked.plan.teams.a[0].items.push("test-only");
    expect(value.teams.a[0].items).toEqual(["armament-wraps"]);
    for (const raw of ["not json", "null", "[]", "{}", JSON.stringify({ ...value, teams: { a: [null], b: [] } }), " ".repeat(100_001)]) expect(parseTeamPlan(raw).ok).toBe(false);
    expect(validateTeamPlan(createTeamPlan()).ok).toBe(true);
    expect(simulateTeamPlan(createTeamPlan()).ok).toBe(false);
  });

  it("counts duplicate definitions once for bond thresholds", () => {
    const value = plan();
    value.teams.a[0].definitionId = "zoro";
    value.teams.a[0].items = [];
    value.teams.a.push({ ...value.teams.a[0], id: "duplicate", position: { x: 1, y: 3 } });
    const result = simulateTeamPlan(value);
    if (!result.ok) throw new Error(result.errors.join(" "));
    expect(result.teamA.activeTraits?.find((trait) => trait.traitId === "straw-hat")?.count).toBe(1);
  });
});

describe("separate local plan library", () => {
  it("saves, replaces, loads and deletes plans without touching voyage/settings keys", () => {
    const storage = createMemoryStorage({ voyage: "canonical-save", settings: "settings" });
    const value = plan();
    storeTeamPlan(storage, value, DEFAULT_CONTENT);
    value.seed = "changed";
    storeTeamPlan(storage, value, DEFAULT_CONTENT);
    expect(readTeamPlans(storage, DEFAULT_CONTENT)).toHaveLength(1);
    expect(readTeamPlans(storage, DEFAULT_CONTENT)[0].seed).toBe("changed");
    expect(deleteTeamPlan(storage, value.name, DEFAULT_CONTENT)).toEqual([]);
    expect(storage.getItem("voyage")).toBe("canonical-save");
    expect(storage.getItem("settings")).toBe("settings");
  });

  it("preserves unreadable libraries and fails cleanly on unavailable storage", () => {
    const storage = createMemoryStorage({ [TEAM_PLANS_KEY]: "broken-json" });
    expect(() => storeTeamPlan(storage, plan(), DEFAULT_CONTENT)).toThrow();
    expect(storage.getItem(TEAM_PLANS_KEY)).toBe("broken-json");
    expect(() => storeTeamPlan({ ...storage, getItem: () => null, setItem: () => { throw new Error("quota"); } }, plan(), DEFAULT_CONTENT)).toThrow("quota");
  });
});
