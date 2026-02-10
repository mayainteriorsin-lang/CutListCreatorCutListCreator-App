/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Use object-based manualChunks to avoid circular dependency issues
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-xlsx': ['xlsx'],
          'vendor-jspdf': ['jspdf', 'jspdf-autotable'],
          'vendor-html2canvas': ['html2canvas'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
      allow: [
        path.resolve(import.meta.dirname, "shared"),
        path.resolve(import.meta.dirname, "attached_assets"),
      ],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./client/src/test/setup.ts'],
  },
});
