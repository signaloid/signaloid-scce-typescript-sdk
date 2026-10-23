import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: { index: "src/index.node.ts" },
		outDir: "dist/node",
		format: ["esm", "cjs"],
		platform: "node",
		target: "node18",
		dts: { entry: { index: "src/index.core.ts" } },
		sourcemap: true,
		clean: true,
		treeshake: true,
		define: { __BROWSER__: "false" },
	},
	{
		entry: { index: "src/index.browser.ts" },
		outDir: "dist/browser",
		format: ["esm"],
		platform: "browser",
		target: "es2020",
		dts: false,
		sourcemap: true,
		clean: false,
		treeshake: true,
		define: { __BROWSER__: "true" },
	},
]);
