// Vite build config — bundles isoroll-module to FoundryVTT-compatible IIFE
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/core/module.ts"),
      name: "isoroll",
      fileName: "module",
      formats: ["es"],
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.names?.some((n) => n.endsWith(".css")) ? "styles.css" : "[name][extname]",
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
});
