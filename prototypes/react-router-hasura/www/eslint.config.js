// cSpell: ignore nonblock

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
      // disable deprecated formatting rules
      "array-bracket-newline": "off",
      "array-bracket-spacing": "off",
      "array-element-newline": "off",
      "arrow-parens": "off",
      "arrow-spacing": "off",
      "block-spacing": "off",
      "brace-style": "off",
      "comma-dangle": "off",
      "comma-spacing": "off",
      "comma-style": "off",
      "computed-property-spacing": "off",
      "dot-location": "off",
      "eol-last": "off",
      "func-call-spacing": "off",
      "function-call-argument-newline": "off",
      "function-paren-newline": "off",
      "generator-star-spacing": "off",
      "implicit-arrow-linebreak": "off",
      indent: "off",
      "jsx-quotes": "off",
      "key-spacing": "off",
      "keyword-spacing": "off",
      "linebreak-style": "off",
      "lines-between-class-members": "off",
      "lines-around-comment": "off",
      "max-len": "off",
      "max-statements-per-line": "off",
      "multiline-ternary": "off",
      "new-parens": "off",
      "newline-per-chained-call": "off",
      "no-confusing-arrow": "off",
      "no-extra-parens": "off",
      "no-extra-semi": "off",
      "no-floating-decimal": "off",
      "no-mixed-operators": "off",
      "no-mixed-spaces-and-tabs": "off",
      "no-multi-spaces": "off",
      "no-multiple-empty-lines": "off",
      "no-tabs": "off",
      "no-trailing-spaces": "off",
      "no-whitespace-before-property": "off",
      "nonblock-statement-body-position": "off",
      "object-curly-newline": "off",
      "object-curly-spacing": "off",
      "object-property-newline": "off",
      "one-var-declaration-per-line": "off",
      "operator-linebreak": "off",
      "padded-blocks": "off",
      "padding-line-between-statements": "off",
      "quote-props": "off",
      quotes: "off",
      "rest-spread-spacing": "off",
      semi: "off",
      "semi-spacing": "off",
      "semi-style": "off",
      "space-before-blocks": "off",
      "space-before-function-paren": "off",
      "space-in-parens": "off",
      "space-infix-ops": "off",
      "space-unary-ops": "off",
      "spaced-comment": "off",
      "switch-colon-spacing": "off",
      "template-curly-spacing": "off",
      "template-tag-spacing": "off",
      "wrap-iife": "off",
      "wrap-regex": "off",
      "yield-star-spacing": "off",
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
