/**
 * PHASE 6: E2E Test Configuration
 *
 * Separate config for E2E smoke tests.
 * These tests require a running server.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 15000,
  },
});
