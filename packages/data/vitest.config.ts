import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@low-code/shared': resolve(__dirname, '../shared/src'),
      '@low-code/data': resolve(__dirname, './src'),
    },
  },
});
