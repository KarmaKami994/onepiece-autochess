import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      include: [
        "game/**/*.ts",
        "components/{battleOutcome,boardAssets,boardGeometry,boardSelection,carouselGeometry,decisionSupport,resourceBar}.ts",
      ],
      exclude: [
        "game/content.ts",
        "game/index.ts",
        "game/types.ts",
        "components/*Manifest.ts",
      ],
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
