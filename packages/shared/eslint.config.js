const { defineConfig, globalIgnores } = require("eslint/config");
const tseslint = require("typescript-eslint");

module.exports = defineConfig([
  globalIgnores(["dist/**", "node_modules/**", "eslint.config.js"]),
  tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
]);
