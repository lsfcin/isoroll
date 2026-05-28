import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/module.ts"),
      name: "isoroll",
      fileName: "module",
      formats: ["es"],
    },
    rollupOptions: {
      output: {
        assetFileNames: "[name][extname]",
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
});
