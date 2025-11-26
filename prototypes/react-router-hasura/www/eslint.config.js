/**
 * This is intended to be a basic starting point for linting in your app.
 * It relies on recommended configs out of the box for simplicity, but you can
 * and should modify this configuration to best suit your team's needs.
 */

import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

import eslintJs from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import typescriptEslintPlugin from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default defineConfig([
  globalIgnores([
    "!**/.server",
    "!**/.client",
    "build/**/*",
    "src/graphql/_generated.ts",
  ]),

  // Base recommended settings from Eslint core
  eslintJs.configs.recommended,

  // Universal overrides
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.es6,
      },
    },
    rules: {
      indent: ["error", 2],
    },
  },

  // React
  {
    ...reactPlugin.configs.flat.all,
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "jsx-a11y": jsxA11yPlugin,
      react: reactPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
      formComponents: ["Form"],
      linkComponents: [
        { name: "Link", linkAttribute: "to" },
        { name: "NavLink", linkAttribute: "to" },
      ],
      "import/resolver": {
        typescript: {},
      },
    },
  },

  // Typescript
  typescriptEslintPlugin.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
  },
  // {
  //   files: ["**/*.{ts,tsx}"],
  //   plugins: {
  //     "@typescript-eslint": typescriptEslintPlugin,
  //     // import: importPlugin,
  //   },
  //   settings: {
  //     "import/internal-regex": "^~/",
  //     "import/resolver": {
  //       node: {
  //         extensions: [".ts", ".tsx"],
  //       },
  //       typescript: {
  //         alwaysTryTypes: true,
  //       },
  //     },
  //   },
  //   extends: [
  //     importPlugin.flatConfigs.recommended,
  //     importPlugin.flatConfigs.typescript,
  //   ],
  // },

  // Node
  {
    files: ["eslint.config.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]);
