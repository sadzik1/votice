import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // proxy /api to the api server in dev
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  test: {
    environment: "jsdom",
  },
});
