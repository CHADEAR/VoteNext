import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vercel + Render friendly config
export default defineConfig({
  base: "/",      // important for SPA + assets
  plugins: [react()],
  build: {
    outDir: "dist",   // Vercel expects dist
    sourcemap: true,  // useful for debug
  },
});
