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
    // Tests never talk to a real Hasura; route tests mock `~/api.server`.
    env: {
      NODE_ENV: "test",
      COOKIE_SECRET: "test-cookie-secret",
      DEV_AUTOLOGIN: "false",
      GRAPHQL_API_URL: "http://graphql.invalid/v1/graphql",
      HASURA_GRAPHQL_ADMIN_SECRET: "test-admin-secret",
      HASURA_GRAPHQL_JWT_SECRET_KEY:
        "test-only-HS256-secret-key-that-is-long-enough-for-jose",
    },
  },
  define: {
    "import.meta.vitest": "undefined",
  },
});
