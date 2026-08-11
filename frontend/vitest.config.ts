import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/unit/setup.ts"],
      include: ["tests/unit/**/*.test.{ts,tsx}"],
    },
  }),
);
