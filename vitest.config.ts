import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    env: { PIXVO_LOCAL_DEV: "1", PIXVO_DATA_DIR: ".test-data/unit" },
  },
});
