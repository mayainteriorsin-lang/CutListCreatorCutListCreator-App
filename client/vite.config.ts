import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  // Make sure Vite serves FROM this client folder
  root: ".",
  publicDir: "public",

  server: {
    port: 5173,
    strictPort: false,
    // Proxy API requests to backend server
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, "../shared")
      ],
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../dist/public"),
    emptyOutDir: true,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
});
