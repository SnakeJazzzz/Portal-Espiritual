import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    setupFiles: ['tests/integration/setup.ts'],
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
