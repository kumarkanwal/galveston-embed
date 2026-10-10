import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    env: { TZ: "Asia/Tokyo" },
    exclude: ["tests/dist-contents.test.ts", "**/node_modules/**"],
    pool: "forks",
    fileParallelism: false,
    isolate: false,
    restoreMocks: true,
  },
});

