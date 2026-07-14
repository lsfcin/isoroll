// T3 — TS twin of layout_parse.py (DSL subset): parse, validate, rotate.
// Node-only load(path) lives in ./load.ts — kept out of this file so browser bundles that reach
// parseText/rotateCw/massing (e.g. via spike-floor) never pull in "node:fs".
import { DEFAULT_WALL_H, DOOR, FLOOR, SOLID, STAIRS, VOID, WINDOW } from "./types";
import type { Layout } from "./types";
// v2 (dsl-v2-ts-twin, T4): parseText dispatches "level N:" DSL text to the v2 parser. Static,
// one-directional import (layout-dsl-v2 never imports back) — no cycle (3-arch.md module graph).
import { parseTextV2 } from "./layout-dsl-v2";

const HAS_LEVEL = /^level \d+:$/m;

const KNOWN = new Set<string>([...SOLID, FLOOR, VOID, ...STAIRS]);
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface SplitResult {
  directives: Record<string, string>;
  gridLines: string[];
}

function splitDirectives(lines: string[]): SplitResult {
  const directives: Record<string, string> = {};
  const gridLines: string[] = [];
  let inGrid = false;
  for (const raw of lines) {
    const stripped = raw.replace(/\r$/, "");
    const strippedIsBlank = stripped.trim() === "";
    if (!inGrid && strippedIsBlank) {
      continue;
    }
    const colonIdx = stripped.indexOf(":");
    const headRaw = colonIdx === -1 ? stripped : stripped.slice(0, colonIdx);
    const head = headRaw.trim();
    const isDirective = !inGrid && colonIdx !== -1 && IDENTIFIER.test(head);
    if (isDirective) {
      const valueRaw = stripped.slice(colonIdx + 1);
      const value = valueRaw.trim();
      directives[head] = value;
      continue;
    }
    inGrid = true;
    gridLines.push(stripped);
  }
  while (gridLines.length > 0) {
    const last = gridLines[gridLines.length - 1];
    const lastIsBlank = last.trim() === "";
    if (!lastIsBlank) {
      break;
    }
    gridLines.pop();
  }
  return { directives, gridLines };
}

function inWallRun(layout: Layout, u: number, v: number): boolean {
  const left = kind(layout, u - 1, v);
  const right = kind(layout, u + 1, v);
  const up = kind(layout, u, v - 1);
  const down = kind(layout, u, v + 1);
  const leftSolid = SOLID.includes(left);
  const rightSolid = SOLID.includes(right);
  const upSolid = SOLID.includes(up);
  const downSolid = SOLID.includes(down);
  const horizontal = leftSolid && rightSolid;
  const vertical = upSolid && downSolid;
  return horizontal || vertical;
}

export function validate(layout: Layout): Layout {
  for (let v = 0; v < layout.grid.length; v++) {
    const row = layout.grid[v];
    for (let u = 0; u < row.length; u++) {
      const ch = row[u];
      if (!KNOWN.has(ch)) {
        layout.errors.push(`(${u},${v}) unknown cell '${ch}'`);
      } else if ((ch === DOOR || ch === WINDOW) && !inWallRun(layout, u, v)) {
        layout.errors.push(`(${u},${v}) '${ch}' not inside a straight wall run`);
      }
    }
  }
  return layout;
}

export function parseText(text: string, name = "layout"): Layout {
  const isV2 = HAS_LEVEL.test(text);
  let layout: Layout;
  if (isV2) {
    layout = parseTextV2(text, name);
  } else {
    const lines = text.split("\n");
    const split = splitDirectives(lines);
    const directives = split.directives;
    const gridLines = split.gridLines;
    const lineLengths = gridLines.map((l) => l.length);
    const cols = lineLengths.length > 0 ? Math.max(...lineLengths) : 0;
    const grid = gridLines.map((l) => l.padEnd(cols, " "));
    const wallHRaw = directives.wall_h;
    const wallH = wallHRaw !== undefined ? parseInt(wallHRaw, 10) : DEFAULT_WALL_H;
    const layoutName = directives.name ?? name;
    const built: Layout = {
      name: layoutName,
      grid,
      wallH,
      rows: grid.length,
      cols,
      errors: [],
      warnings: [],
    };
    if (grid.length === 0) {
      built.errors.push("empty grid");
    }
    layout = validate(built);
  }
  return layout;
}

export function kind(layout: Layout, u: number, v: number): string {
  const inBounds = v >= 0 && v < layout.rows && u >= 0 && u < layout.cols;
  const row = layout.grid[v];
  const result = inBounds ? row[u] : VOID;
  return result;
}

export function rotateCw(layout: Layout, turns = 1): Layout {
  let grid = layout.grid;
  const spins = ((turns % 4) + 4) % 4;
  for (let t = 0; t < spins; t++) {
    const lineLengths = grid.map((r) => r.length);
    const width = lineLengths.length > 0 ? Math.max(...lineLengths) : 0;
    const padded = grid.map((r) => r.padEnd(width, " "));
    const rows = padded.length;
    const next: string[] = [];
    for (let r = 0; r < width; r++) {
      let row = "";
      for (let c = 0; c < rows; c++) {
        row += padded[rows - 1 - c][r];
      }
      next.push(row);
    }
    grid = next;
  }
  const newCols = grid.length > 0 ? grid[0].length : 0;
  const rotated: Layout = {
    name: layout.name,
    grid,
    wallH: layout.wallH,
    rows: grid.length,
    cols: newCols,
    errors: layout.errors,
    warnings: layout.warnings,
  };
  return rotated;
}
