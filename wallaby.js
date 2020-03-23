module.exports = function (w) {
  process.env.TSC_WATCHFILE = "UseFsEventsWithFallbackDynamicPolling"
  return {
    files: [
      '**/*.ts',
      '!**/*.d.ts',
      '!**/*.test.ts',
      '!**/node_modules',
    ],

    tests: [
      '**/*.test.ts',
      '!samples/experiment/**/*.test.ts',
      '!**/node_modules',
    ],
    // for node.js tests you need to set env property as well
    // https://wallabyjs.com/docs/integration/node.html
    env: {
      type: 'node',
      runner: 'node'
    },

    testFramework: 'jest',
    compilers: {
      '**/*.ts?(x)': w.compilers.typeScript({ isolatedModules: true })
    }
  };
};