//   ╔═╗╔═╗╦  ╦╔╗╔╔╦╗┬─┐┌─┐
//   ║╣ ╚═╗║  ║║║║ ║ ├┬┘│
//  o╚═╝╚═╝╩═╝╩╝╚╝ ╩ ┴└─└─┘
// Flat config for ESLint v9+. Replaces .eslintrc.js and test/.eslintrc.js.
import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default [
   // Ignore AppBuilder (not converted to ESM) and reports/scripts (browser + EJS)
   { ignores: ["AppBuilder/**", "reports/scripts/**"] },

   js.configs.recommended,

   // Main project: Node + ES2022, Prettier, custom rules
   {
      files: ["**/*.js"],
      languageOptions: {
         ecmaVersion: 2022,
         globals: { ...globals.node },
      },
      plugins: { prettier: eslintPluginPrettier },
      rules: {
         "prettier/prettier": [
            "error",
            {
               arrowParens: "always",
               endOfLine: "lf",
               printWidth: 80,
               tabWidth: 3,
               trailingComma: "all",
            },
         ],
         "no-console": "off", // allow console.log() in our services
         "no-unused-vars": [
            "error",
            { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
         ],
      },
   },

   // Test files: Mocha globals + no-unused-vars ignore for should/expect
   {
      files: ["test/**/*.js"],
      languageOptions: {
         globals: { ...globals.node, ...globals.mocha },
      },
      rules: {
         "no-unused-vars": ["error", { varsIgnorePattern: "should|expect" }],
      },
   },

   // Prettier disables conflicting rules — must be last
   eslintConfigPrettier,
];
