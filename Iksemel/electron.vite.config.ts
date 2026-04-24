import { resolve } from "path";
import { readFileSync } from "fs";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

interface PackageJsonLite {
  readonly version: string;
}

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf-8"),
) as PackageJsonLite;

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, "electron/main/index.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, "electron/preload/index.ts"),
      },
    },
  },
  renderer: {
    root: __dirname,
    server: { port: 5654 },
    plugins: [react()],
    define: {
      __XFEB_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@engine": resolve(__dirname, "src/engine"),
        "@components": resolve(__dirname, "src/components"),
        "@types": resolve(__dirname, "src/types"),
        "@utils": resolve(__dirname, "src/utils"),
      },
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            engine: [
              "./src/engine/parser/index.ts",
              "./src/engine/selection/index.ts",
              "./src/engine/analysis/index.ts",
              "./src/engine/generation/index.ts",
            ],
            zip: ["jszip"],
          },
        },
      },
    },
  },
});
