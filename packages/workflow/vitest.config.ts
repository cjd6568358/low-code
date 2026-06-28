import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@low-code/workflow-bpmn': resolve(__dirname, '../workflow-bpmn/src'),
      '@low-code/workflow': resolve(__dirname, './src'),
    },
  },
});
