import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/embed.ts"),
      formats: ["iife"],
      name: "GalvestonBooking",
      fileName: () => "embed.js",
    },
    cssCodeSplit: false,
    emptyOutDir: true,
    sourcemap: true,
  },
});

