import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import pkg from "./package.json";

export default defineConfig(() => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  build: {
    // Keep a single vendor chunk to avoid circular vendor splits that broke runtime on Android
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }

          if (id.includes('/constants/leagues')) {
            return 'game-data-leagues';
          }

          if (id.includes('/constants/general') || id.includes('/constants/positionAttribute')) {
            return 'game-data-constants';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
    minify: 'esbuild',
    target: 'es2020',
    sourcemap: false,
  },
}));
