module.exports = {
  collectCoverage: false,
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    "^@e/(.*)$": "<rootDir>/src/$1",
  },
  watchPathIgnorePatterns: ["data/*", "router-schema.json"],
  globals: {
    "ts-jest": {
      diagnostics: false,
    },
  },
  testRegex: "(/__tests__/.*|(\\.|/)test)\\.(jsx?|tsx?)$",
  testURL: "http://localhost:8110",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
}
