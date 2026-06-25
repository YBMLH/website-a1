import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, proxy API + uploads to the Express backend (default :4000) so the
// SPA can use same-origin relative URLs and avoid CORS during development.
const API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/uploads': { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
