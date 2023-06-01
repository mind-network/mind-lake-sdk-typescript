/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx"
  ],
  "modulePaths": [
    "<rootDir>"
  ],
  moduleNameMapper: {
    '^src/(.*)': '<rootDir>/src/$1',
  },
  setupFiles: [
  ],
  testMatch: [
  ]
};
