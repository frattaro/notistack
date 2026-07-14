import glob from "fast-glob";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [...glob.sync("src/index.ts")],
  deps: {
    skipNodeModulesBundle: true
  },
  format: ["esm"],
  fixedExtension: false
});
