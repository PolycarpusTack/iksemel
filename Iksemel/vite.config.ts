import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { readFileSync } from "fs";

interface PackageJsonLite {
  readonly version: string;
}

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf-8"),
) as PackageJsonLite;

export default defineConfig({
  server: {
    port: 5653,
  },
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
    target: "es2020",
    sourcemap: true,
    rollupOptions: {
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
});
