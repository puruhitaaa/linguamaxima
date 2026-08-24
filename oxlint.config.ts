import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";

const safeReact = {
  ...react,
  rules: Object.fromEntries(
    Object.entries(react.rules || {}).filter(
      ([key]) => key !== "react/react-compiler" && key !== "react-compiler"
    )
  ),
};

export default defineConfig({
  extends: [core, safeReact, tanstack],
  rules: {
    "func-style": "off",
    "sort-keys": "off",
    "no-use-before-define": "off",
    "no-shadow": "off",
    "no-inline-comments": "off",
    "no-negated-condition": "off",
    "unicorn/no-negated-condition": "off",
  },
  ignorePatterns: [
    ...core.ignorePatterns,
    "**/routeTree.gen.ts",
    "packages/ui/src/components/**",
    "apps/api/**",
  ],
});
