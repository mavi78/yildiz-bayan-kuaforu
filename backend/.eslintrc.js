/**
 * NestJS ESLint configuration
 *
 * Bu dosya NestJS 10 projesi için ESLint kurallarını tanımlar.
 * Türkçe JSDoc zorunluluğu anayasa gereği ek kurallarla desteklenecektir.
 */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"],
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint/eslint-plugin"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended",
  ],
  env: {
    node: true,
    jest: true,
    es2021: true,
  },
  ignorePatterns: ["dist", ".eslintrc.js", "prisma/schema.prisma"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },
};
