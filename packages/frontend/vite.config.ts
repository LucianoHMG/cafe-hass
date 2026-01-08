import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin({
      topExecutionPriority: false,
      jsAssetsFilterFunction: function customJsAssetsfilterFunction(outputChunk) {
        return outputChunk.isEntry;
      }
    })
  ],
  base: '/cafe_static/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
