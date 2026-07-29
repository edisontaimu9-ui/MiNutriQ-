import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'react-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'react-src/main.jsx',
      output: {
        entryFileNames: 'oasis-react.js',
        assetFileNames: 'oasis-react.[ext]',
        format: 'iife',
        name: 'OasisReact'
      }
    }
  }
});
