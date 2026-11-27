const coverage = "coverage";
const allBrowsers = "all";

const assetUnit = [
  "audio-assets", "board-assets", "b10-asset-pilots", "b11-character-animation",
  "b12-icon-completion", "food-assets", "p7-major-asset-production", "v2-asset-pipeline",
];
const assetBrowser = [
  "p7-assets", "b10-asset-pilots", "b11-character-bodies", "b12-icon-completion",
  "viewport", "regatta-board-calibration",
];

// Shared or unclassified code takes the complete check set.
const featureChecks = [
  [/^(?:app\/multiplayer\/|server\/|deploy\/|scripts\/(?:run_local_multiplayer|backup_friends_voyage)\.ts$)/,
    ["friends-multiplayer", "friends-voyage", "friends-voyage-store", "hosted-friends", "local-multiplayer"],
    ["local-multiplayer"]],
  [/^(?:app\/hud\/|components\/(?:HudTooltip\.tsx|decisionSupport\.ts)$)/,
    ["pac-hud", "decision-support", "app-selectors"], ["pac-hud", "scouting", "deck-cleanup", "viewport"]],
  [/^app\/(?:chronicle(?:Storage)?\.(?:ts|css)|replayValidation\.ts|useChronicleRecorder\.ts|screens\/ChronicleScreen\.tsx)$/,
    ["chronicle", "results-lineup"], ["chronicle", "results"]],
  [/^app\/(?:phaseClock\.ts|PhaseClockDisplay\.tsx|useMatchClock\.ts)$/,
    ["phase-clock"], ["pacing", "deck-cleanup"]],
  [/^app\/(?:crewTools\.css|crewReference\.ts|planner(?:Presentation|Storage)\.ts|screens\/(?:CrewTools|TeamPlanner)Screen\.tsx)$/,
    ["crew-reference", "team-planner"], ["crew-tools"]],
  [/^(?:app\/(?:useGameAudio|audioSettings)\.ts|components\/combatReport\.ts)$/,
    ["audio-assets", "combat-report"], ["combat-report-audio"]],
  [/^app\/voyagePersistence\.ts$/,
    ["voyage-persistence", "chronicle"], ["match-flow", "pacing", "combat-economy"]],
  [/^components\/(?:board(?:Assets|Geometry|Selection|Tokens|Camera|Facing)\.ts|PhaserBoard\.tsx|BoardScene\.ts)$/,
    ["board-assets", "board-presentation", "board-interaction", "board-selection"],
    ["viewport", "regatta-board-calibration", "deck-cleanup"]],
];

const safePath = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/;
const documentation = /^(?:docs\/.*|[^/]+)\.md$/i;
const unitFile = /^tests\/.+\.test\.ts$/;
const browserFile = /^e2e\/.+\.spec\.ts$/;
const dependencyFile = /(?:^|\/)(?:package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|\.npmrc)$/;

export function planChecks(changes) {
  const uncertain = !Array.isArray(changes);
  const files = uncertain ? [] : changes.flatMap(({ filename, previous_filename, status }) => [
    { path: filename, removed: status === "removed" },
    ...(previous_filename ? [{ path: previous_filename, removed: true }] : []),
  ]);
  const unit = new Set();
  const browser = new Set();
  const plan = {
    routing: false, validate: false, lint: false, typecheck: false,
    assets: false, smoke: false, build: false, dependencies: uncertain, unit: [], browser: [],
  };
  const fullUnit = () => unit.add(coverage);
  const fullBrowser = () => browser.add(allBrowsers);

  function fullChecks() {
    plan.typecheck = plan.lint = plan.assets = plan.smoke = plan.build = true;
    fullUnit();
    fullBrowser();
  }

  if (uncertain) fullChecks();
  for (const { path, removed } of files) {
    if (dependencyFile.test(path)) plan.dependencies = true;
    if (documentation.test(path) || path === "LICENSE") continue;
    if (path === ".github/workflows/ci.yml" || /^\.github\/ci-plan(?:\.test)?\.mjs$/.test(path)) {
      plan.routing = true;
    } else if (unitFile.test(path) && safePath.test(path)) {
      plan.typecheck = plan.lint = true;
      if (path !== "tests/soak.test.ts") {
        if (removed) fullUnit();
        else unit.add(path);
      }
    } else if (path.startsWith("tests/") || path === "vitest.config.ts") {
      plan.typecheck = plan.lint = true;
      fullUnit();
    } else if (path.startsWith("e2e/") || path === "playwright.config.ts") {
      plan.typecheck = plan.lint = plan.build = true;
      if (browserFile.test(path) && safePath.test(path) && !removed) browser.add(path);
      else fullBrowser();
    } else if (path === "eslint.config.mjs") {
      plan.lint = true;
    } else if (/^(?:public\/assets\/|art\/|scripts\/(?:assets\/|licensed\/|libresprite\/|build_|validate_assets\.mjs$))/.test(path)) {
      plan.assets = plan.build = true;
      assetUnit.forEach((name) => unit.add(`tests/${name}.test.ts`));
      assetBrowser.forEach((name) => browser.add(`e2e/${name}.spec.ts`));
    } else if (path === "scripts/run_production_soak.ts") {
      plan.typecheck = plan.lint = plan.smoke = true;
      unit.add("tests/production-audit.test.ts");
    } else {
      const feature = featureChecks.find(([pattern]) => pattern.test(path));
      if (feature) {
        plan.build = true;
        if (!path.endsWith(".css")) {
          plan.typecheck = plan.lint = true;
          feature[1].forEach((name) => unit.add(`tests/${name}.test.ts`));
        }
        feature[2].forEach((name) => browser.add(`e2e/${name}.spec.ts`));
      } else if (/^(?:app|components)\//.test(path)) {
        plan.typecheck = plan.lint = plan.assets = plan.build = true;
        fullUnit();
        fullBrowser();
      } else {
        fullChecks();
      }
    }
  }
  plan.unit = unit.has(coverage) ? [coverage] : [...unit].sort();
  plan.browser = browser.has(allBrowsers) ? [allBrowsers] : [...browser].sort();
  plan.validate = Boolean(plan.typecheck || plan.lint || plan.assets || plan.smoke ||
    plan.build || plan.unit.length || plan.browser.length);
  return plan;
}
