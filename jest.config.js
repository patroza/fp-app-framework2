module.exports = {
  "collectCoverage": false,
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "moduleNameMapper": {
    "^@c/(.*)$": "<rootDir>/samples/classic/src/$1",
    "^@e/(.*)$": "<rootDir>/samples/effect/src/$1"
  },
  globals: {
    'ts-jest': {
      diagnostics: false
    }
  },
  "testRegex": "(/__tests__/.*|(\\.|/)test)\\.(jsx?|tsx?)$",
  "testURL": "http://localhost:8110",
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ],
  "testPathIgnorePatterns": ["/node_modules/"]
}
