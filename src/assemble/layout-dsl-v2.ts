// T4 (dsl-v2-ts-twin, .craft/dsl-v2-ts-twin/3-arch.md) — "level N:"/"layer X:"/"roof:"/"stair:"
// grammar -> Layout. TS twin of layout_dsl_v2.py. Imports from ./types + ./layout-groups +
// ./layout-dsl-v2-validate only (never from ./layout-parse -> no cycle; layout-parse imports
// this module, one-directional). Validation split into layout-dsl-v2-validate.ts (line-gate).
import { COMPASS_TO_ARROW, DEFAULT_WALL_H } from "./types";
import type { Group, Layout, Level } from "./types";
import { ENCLOSE, ROOF_FORMS, STAIR_TYPES } from "./layout-groups";
import { validateGroups, validateLevel } from "./layout-dsl-v2-validate";

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const LEVEL_RE = /^level (\d+):$/;
const LAYER_RE = /^layer (side|type|wmat|fh):$/;
const GROUP_RE =
  /^(roof|stair): (\d+),(\d+) (\d+),(\d+) form=(\w+) dir=([NESW]) incl=([\d.]+)ft z=(-?[\d.]+)(?: enclose=(\w+))?$/;

function num(s: string): number {
  const hasDot = s.includes(".");
  let result: number;
  if (hasDot) {
    result = parseFloat(s);
  } else {
    result = parseInt(s, 10);
  }
  return result;
}

function isHeader(line: string): boolean {
  const stripped = line.trim();
  const isLevel = LEVEL_RE.test(stripped);
  const isLayer = LAYER_RE.test(stripped);
  const isGroup = GROUP_RE.test(stripped);
  return isLevel || isLayer || isGroup;
}

// Raw content lines from i until a boundary. A v2 grid/attr row is never a zero-length string
// (VOID is a literal " ", length >= 1) so an empty line unambiguously means a block separator.
function readBlock(lines: string[], start: number): [string[], number] {
  const rows: string[] = [];
  let i = start;
  while (i < lines.length && lines[i] !== "" && !isHeader(lines[i])) {
    rows.push(lines[i]);
    i++;
  }
  return [rows, i];
}

function readDirectives(lines: string[]): [Record<string, string>, number] {
  const directives: Record<string, string> = {};
  let i = 0;
  while (i < lines.length) {
    const stripped = lines[i].trim();
    if (stripped === "") {
      i++;
      continue;
    }
    if (isHeader(lines[i])) {
      break;
    }
    const colonIdx = stripped.indexOf(":");
    const headRaw = colonIdx === -1 ? stripped : stripped.slice(0, colonIdx);
    const head = headRaw.trim();
    if (colonIdx === -1 || !IDENTIFIER.test(head)) {
      break;
    }
    const valueRaw = stripped.slice(colonIdx + 1);
    directives[head] = valueRaw.trim();
    i++;
  }
  return [directives, i];
}

function makeGroup(m: RegExpMatchArray): Group {
  const kind = m[1] === "stair" ? "stair" : "roof";
  const r0 = parseInt(m[2], 10);
  const c0 = parseInt(m[3], 10);
  const r1 = parseInt(m[4], 10);
  const c1 = parseInt(m[5], 10);
  const cells: [number, number][] = [];
  for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) {
    for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) {
      cells.push([r, c]);
    }
  }
  const formNames: readonly string[] = kind === "stair" ? STAIR_TYPES : ROOF_FORMS;
  const encloseName = m[10];
  const enclose =
    kind === "roof"
      ? encloseName
        ? (ENCLOSE as readonly string[]).indexOf(encloseName)
        : 0
      : null;
  const form = formNames.indexOf(m[6]);
  const dir = COMPASS_TO_ARROW[m[7]];
  const incl = num(m[8]);
  const z = num(m[9]);
  return { kind, cells, form, dir, incl, z, enclose };
}

function parseLevelBlock(lines: string[], start: number): [Level, number] {
  const [gridRows, afterGrid] = readBlock(lines, start);
  let i = afterGrid;
  const rowLengths = gridRows.map((r) => r.length);
  const cols = gridRows.length > 0 ? Math.max(...rowLengths) : 0;
  const level: Level = { g: gridRows.map((r) => r.padEnd(cols, " ")) };
  while (i < lines.length && lines[i] !== "") {
    const currentLine = lines[i].trim();
    const layerM = LAYER_RE.exec(currentLine);
    if (!layerM) {
      break;
    }
    const attrName = layerM[1] as "side" | "type" | "wmat" | "fh";
    const [attrRows, afterAttr] = readBlock(lines, i + 1);
    i = afterAttr;
    const target: Record<string, string | number> = {};
    for (let r = 0; r < attrRows.length; r++) {
      const row = attrRows[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch !== "." && ch !== " ") {
          target[`${r},${c}`] = ch;
        }
      }
    }
    level[attrName] = target;
  }
  return [level, i];
}

function parseBody(lines: string[], start: number): [Record<number, Level>, Group[]] {
  const levels: Record<number, Level> = {};
  const groups: Group[] = [];
  let i = start;
  while (i < lines.length) {
    if (lines[i] === "") {
      i++;
      continue;
    }
    const trimmed = lines[i].trim();
    const levelM = LEVEL_RE.exec(trimmed);
    if (levelM) {
      const [level, ni] = parseLevelBlock(lines, i + 1);
      levels[parseInt(levelM[1], 10)] = level;
      i = ni;
      continue;
    }
    const groupM = GROUP_RE.exec(trimmed);
    if (groupM) {
      const group = makeGroup(groupM);
      groups.push(group);
      i++;
      continue;
    }
    i++; // stray/unrecognized line — ignored, not fatal
  }
  return [levels, groups];
}

export function parseTextV2(text: string, name = "layout"): Layout {
  const rawLines = text.split("\n");
  const lines = rawLines.map((l) => l.replace(/\r$/, ""));
  const [directives, bodyStart] = readDirectives(lines);
  const [levels, groups] = parseBody(lines, bodyStart);
  const levelKeyStrings = Object.keys(levels);
  const levelKeys = levelKeyStrings.map(Number);
  levelKeys.sort((a, b) => a - b);
  const minLevel = levelKeys.length > 0 ? levelKeys[0] : undefined;
  const baseGrid = minLevel !== undefined ? levels[minLevel].g : [];
  const wallHRaw = directives.wall_h;
  const wallH = wallHRaw !== undefined ? parseInt(wallHRaw, 10) : DEFAULT_WALL_H;
  const layout: Layout = {
    name: directives.name ?? name,
    grid: baseGrid,
    wallH,
    rows: baseGrid.length,
    cols: baseGrid.length > 0 ? baseGrid[0].length : 0,
    errors: [],
    warnings: [],
    levels,
    groups,
  };
  if (levelKeys.length === 0) {
    layout.errors.push("empty grid");
  }
  validateGroups(layout);
  for (const lvl of levelKeys) {
    validateLevel(layout, lvl, levels[lvl]);
  }
  return layout;
}
