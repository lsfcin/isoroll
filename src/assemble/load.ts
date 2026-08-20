// Node-only file loader for the layout DSL. Split out of layout-parse.ts so browser bundles
// (src/core/module.ts, which now reaches parseText/rotateCw/massing via spike-floor) never pull
// in "node:fs" — Vite externalizes node builtins for the browser target and errors at bind time
// if any module in the graph has a top-level named import from them, even if unused at runtime.
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";

import type { Layout } from "./types";
import { parseText } from "./layout-parse";

export function load(path: string): Layout {
  const text = readFileSync(path, "utf-8");
  const ext = extname(path);
  const name = basename(path, ext);
  return parseText(text, name);
}
