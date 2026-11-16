/// <reference types="vitest/config" />

import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // The React Router plugin builds the app; tests import modules directly.
  plugins: [!process.env.VITEST && reactRouter(), tsconfigPaths()],
  build: {
    sourcemap: true,
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    includeSource: ["src/**/*.{js,ts}"],
    // Each test file gets its own migrated in-memory SQLite database.
    env: {
      NODE_ENV: "test",
      COOKIE_SECRETS: "test-cookie-secret",
      DEV_AUTOLOGIN: "false",
      DATABASE_PATH: ":memory:",
    },
  },
  define: {
    "import.meta.vitest": "undefined",
  },
});
