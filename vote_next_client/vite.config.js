import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",              //สำคัญสำหรับ deploy (SPA routing)
  plugins: [react()],
  build: {
    outDir: "dist",       // Vercel ใช้ dist โดย default
  },
});
