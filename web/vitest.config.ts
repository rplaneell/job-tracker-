import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Measured where the logic lives. Screens have no browser tests yet, so they are left out on purpose.
    coverage: { provider: "v8", include: ["src/lib/**"], exclude: ["**/*.test.ts", "src/lib/supabase/**"], thresholds: { lines: 90, functions: 90, branches: 80 } },
  },
});
