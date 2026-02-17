const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  collectCoverageFrom: ["lib/**/*.ts", "app/api/**/*.ts"],
  coveragePathIgnorePatterns: ["/node_modules/", "/.next/"],
};

module.exports = createJestConfig(config);
