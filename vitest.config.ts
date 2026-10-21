import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // node:sqlite is newer than Vite 5's built-in list; route it through a runtime shim.
      'node:sqlite': fileURLToPath(new URL('./tests/sqlite-shim.mjs', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
