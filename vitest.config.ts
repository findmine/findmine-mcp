import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node environment for MCP server testing
    environment: 'node',

    // Include patterns for test files
    include: ['tests/**/*.test.ts'],

    // Exclude directories that shouldn't be scanned
    exclude: ['build/', 'node_modules/', 'coverage/'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Measure all source, including files no test imports.
      include: ['src/**/*.ts'],
      // The stdio bin only wires serveStdio to the factory and runs as its own process.
      exclude: ['src/index.ts', '**/*.d.ts'],
      // Floor at the measured baseline; the target is 80%. The FindMine API client
      // (src/api/findmine-client.ts) has no tests yet and is the main gap — raise these
      // when the client is rewritten with fetch-stubbed tests.
      thresholds: {
        statements: 72,
        branches: 55,
        functions: 84,
        lines: 73,
      },
    },

    // Globals for describe, it, expect, etc.
    globals: true,
  },
});
