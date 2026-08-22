import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'public',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:4380',
    },
  },
});
