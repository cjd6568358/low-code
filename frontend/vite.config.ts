import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  resolve: {
    alias: {
      '@low-code/shared': path.resolve(__dirname, '../packages/shared/src'),
      '@low-code/computation': path.resolve(__dirname, '../packages/computation/src'),
      '@low-code/renderer': path.resolve(__dirname, '../packages/renderer/src'),
      '@low-code/auto-rendering': path.resolve(__dirname, '../packages/auto-rendering/src'),
      '@low-code/data': path.resolve(__dirname, '../packages/data/src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
