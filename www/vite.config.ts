/// <reference types="vitest" />

import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  build: {
    sourcemap: true,
  },
  test: {
    includeSource: ["src/**/*.{js,ts}"],
  },
  define: {
    "import.meta.vitest": "undefined",
  },
});
