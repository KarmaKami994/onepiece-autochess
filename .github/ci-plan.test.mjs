import assert from "node:assert/strict";
import test from "node:test";
import { planChecks } from "./ci-plan.mjs";

const files = (...paths) => paths.map((filename) => ({ filename, status: "modified" }));

test("documentation does not install dependencies or run game checks", () => {
  const plan = planChecks(files("docs/ARCHITECTURE.md", "PROJECT_STATE.md"));
  assert.equal(plan.validate, false);
  assert.equal(plan.dependencies, false);
  assert.deepEqual(plan.unit, []);
  assert.deepEqual(plan.browser, []);
});

test("a changed unit or browser test runs its own suite without a production smoke", () => {
  const unit = planChecks(files("tests/phase-clock.test.ts"));
  assert.deepEqual(unit.unit, ["tests/phase-clock.test.ts"]);
  assert.deepEqual(unit.browser, []);
  assert.equal(unit.smoke || unit.build, false);
  const browser = planChecks(files("e2e/pac-hud.spec.ts"));
  assert.deepEqual(browser.unit, []);
  assert.deepEqual(browser.browser, ["e2e/pac-hud.spec.ts"]);
  assert.equal(browser.smoke, false);
});

test("lobby changes and HUD changes select their own cases and combine on mixed PRs", () => {
  const lobby = planChecks(files("server/FriendsRoom.ts"));
  assert.deepEqual(lobby.browser, ["e2e/local-multiplayer.spec.ts"]);
  assert.ok(lobby.unit.includes("tests/friends-multiplayer.test.ts"));
  assert.equal(lobby.smoke, false);
  const combined = planChecks(files("server/FriendsRoom.ts", "app/hud/one-piece-hud.css"));
  assert.ok(combined.browser.includes("e2e/pac-hud.spec.ts"));
  assert.ok(combined.browser.includes("e2e/local-multiplayer.spec.ts"));
  assert.deepEqual(combined.unit, lobby.unit);
  assert.ok(planChecks(files("app/hud/PacHud.tsx")).unit.includes("tests/pac-hud.test.ts"));
});

test("central game, dependency and uncertain changes keep the complete safety checks", () => {
  for (const entry of [files("game/combat.ts"), files("package-lock.json"), undefined]) {
    const plan = planChecks(entry);
    assert.deepEqual(plan.unit, ["coverage"]);
    assert.deepEqual(plan.browser, ["all"]);
    assert.equal(plan.smoke && plan.build && plan.assets, true);
  }
  assert.equal(planChecks(files("package-lock.json")).dependencies, true);
  assert.equal(planChecks(files("game/combat.ts")).dependencies, false);
});

test("renamed source, deleted tests, workflow routing and manual soak keep their boundaries", () => {
  const rename = planChecks([{ filename: "docs/old-rule.md", previous_filename: "game/old-rule.ts", status: "renamed" }]);
  assert.equal(rename.smoke, true);
  const deletedTest = planChecks([{ filename: "tests/phase-clock.test.ts", status: "removed" }]);
  assert.deepEqual(deletedTest.unit, ["coverage"]);
  assert.deepEqual(deletedTest.browser, []);
  const routing = planChecks(files(".github/workflows/ci.yml", ".github/ci-plan.test.mjs"));
  assert.equal(routing.routing, true);
  assert.equal(routing.validate, false);
  assert.deepEqual(planChecks(files("tests/soak.test.ts")).unit, []);
});
