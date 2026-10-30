import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
      // React's server-only guard throws outside a React Server environment.
      "server-only": `${import.meta.dirname}/tests/stubs/empty.ts`,
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // next-intl's ESM build imports "next/navigation" without an extension;
    // inlining lets Vite resolve it.
    server: { deps: { inline: ["next-intl"] } },
  },
});
