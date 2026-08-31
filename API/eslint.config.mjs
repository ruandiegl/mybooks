import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.node,
      sourceType: "module",
      ecmaVersion: "latest"
    }
  },
  { rules: {
    "jsdoc/check-tag-names": "off",
    "jsdoc/require-jsdoc": "off" ,
    "jsdoc/require-param": "off",
    "jsdoc/require-returns": "off",
    "no-console": "off",
    "no-unused-vars": "off",
    "no-undef": "off",
    "quotes": ["error", "single"],
    "semi": ["error", "always"]

  } },
]);
