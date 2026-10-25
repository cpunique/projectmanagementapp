import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Matches the "@/" paths the app code uses.
    alias: [{ find: /^@\//, replacement: fileURLToPath(new URL('./', import.meta.url)) }],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
