import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    linterOptions: {
      reportUnusedDisableDirectives: false
    }
  },
  {
    ignores: [
      ".next/**",
      ".amm-run/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "output/**",
      "public/**",
      "docs/**",
      "scripts/**",
      "node_modules/**"
    ]
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly"
      }
    },
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin
    },
    settings: {
      next: {
        rootDir: "."
      }
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooksPlugin.configs.recommended.rules,

      "@next/next/no-img-element": "off",

      // This codebase intentionally keeps a few pragmatic any/unknown-style
      // edges around browser globals, payload normalization, and safe fallbacks.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-unused-vars": "off",
      "no-useless-assignment": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
      "react-hooks/set-state-in-effect": "off"
    }
  }
];
