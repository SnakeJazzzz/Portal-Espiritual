import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    // env-guard MUST come first: it validates DATABASE_URL_TEST and remaps
    // DATABASE_URL onto it before setup.ts imports @/db/client.
    setupFiles: ['tests/integration/env-guard.ts', 'tests/integration/setup.ts'],
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
