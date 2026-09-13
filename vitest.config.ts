import { defineConfig } from "vitest/config";
import path from "node:path";

// NOTE: no @vitejs/plugin-react on purpose — its bundled vite conflicts with
// vitest 3's vite types. esbuild (via tsconfig "jsx": "react-jsx") already
// transforms JSX for `vitest run`; Fast Refresh is irrelevant for tests.

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
            // "server-only" throws outside RSC; stub it for tests.
            "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
          },
        },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
        },
      },
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
            "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
          },
        },
        test: {
          name: "component",
          environment: "jsdom",
          include: ["tests/component/**/*.test.{ts,tsx}"],
          setupFiles: ["./tests/setup.ts"],
        },
      },
    ],
  },
});
