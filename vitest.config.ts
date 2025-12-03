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
      exclude: [
        'node_modules/',
        'build/',
        'coverage/',
        'tests/',
        '*.config.ts',
        '**/*.d.ts',
      ],
      // Coverage thresholds - 80% target
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },

    // Globals for describe, it, expect, etc.
    globals: true,
  },
});
