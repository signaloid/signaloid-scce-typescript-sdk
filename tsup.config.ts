// tsup.config.ts
import path from "node:path";
import { defineConfig } from "tsup";

export default defineConfig([
  // ===== Node bundle (ESM + CJS) =====
  {
    entry: { index: "src/index.node.ts" },
    outDir: "dist/node",
    platform: "node",
    target: "node18",
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    define: { __BROWSER__: "false" },
    esbuildOptions(o) {
      // map the virtual id to the Node runtime source (build-time only)
      (o as any).alias = {
        "#ws-runtime": path.resolve(__dirname, "src/runtime/ws.node.ts"),
      };
    },
  },

  // ===== Browser bundle (ESM) =====
  {
    entry: { index: "src/index.browser.ts" },
    outDir: "dist/browser",
    platform: "browser",
    target: "es2020",
    format: ["esm"],
    dts: false,
    sourcemap: true,
    clean: false,
    define: { __BROWSER__: "true" },
    esbuildOptions(o) {
      // map the same id to the Browser runtime source
      (o as any).alias = {
        "#ws-runtime": path.resolve(__dirname, "src/runtime/ws.browser.ts"),
      };
    },
  },
]);
