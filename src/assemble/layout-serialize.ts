// T6 (dsl-v2-ts-twin, .loop/dsl-v2-ts-twin/3-arch.md) — Layout -> canonical DSL v2 text, TS twin
// of layout_serialize.py (ported from rig.frag updateDsl L1088-1119). Round-trip contract (C2):
// toDsl(parseTextV2(text)) == text, compared per-line-rstripped (PIN-2).
import { ENCLOSE, ROOF_FORMS, SIDE_NAME, STAIR_TYPES } from "./layout-groups";
import type { Group, Layout, Level } from "./types";

const ATTR_NAMES = ["side", "type", "wmat", "fh"] as const;

function groupLine(group: Group): string {
  const kindWord = group.kind === "stair" ? "stair" : "roof";
  const rs = group.cells.map(([r]) => r);
  const cs = group.cells.map(([, c]) => c);
  const rMin = Math.min(...rs);
  const cMin = Math.min(...cs);
  const rMax = Math.max(...rs);
  const cMax = Math.max(...cs);
  const formName = group.kind === "stair" ? STAIR_TYPES[group.form] : ROOF_FORMS[group.form];
  let line =
    `${kindWord}: ${rMin},${cMin} ${rMax},${cMax} ` +
    `form=${formName} dir=${SIDE_NAME[group.dir]} incl=${group.incl}ft z=${group.z}`;
  if (group.kind === "roof") {
    line += ` enclose=${ENCLOSE[group.enclose ?? 0]}`;
  }
  return line;
}

function attrRows(level: Level, attrName: (typeof ATTR_NAMES)[number]): string[] | null {
  const attr = level[attrName];
  let result: string[] | null = null;
  if (attr && Object.keys(attr).length > 0) {
    const firstRow = level.g[0];
    const cols = level.g.length > 0 ? firstRow.length : 0;
    const rows: string[] = [];
    for (let r = 0; r < level.g.length; r++) {
      let row = "";
      for (let c = 0; c < cols; c++) {
        const v = attr[`${r},${c}`];
        row += v !== undefined ? String(v) : ".";
      }
      rows.push(row);
    }
    result = rows;
  }
  return result;
}

function levelLines(lvl: number, level: Level): string[] {
  const lines = [`level ${lvl}:`, ...level.g];
  for (const attrName of ATTR_NAMES) {
    const rows = attrRows(level, attrName);
    if (rows !== null) {
      lines.push(`layer ${attrName}:`);
      lines.push(...rows);
    }
  }
  return lines;
}

export function toDsl(layout: Layout): string {
  const lines = [`name: ${layout.name}`];
  const levels = layout.levels;
  if (levels && Object.keys(levels).length > 0) {
    const levelKeyStrings = Object.keys(levels);
    const levelKeys = levelKeyStrings.map(Number);
    levelKeys.sort((a, b) => a - b);
    for (const lvl of levelKeys) {
      lines.push("");
      const oneLevelLines = levelLines(lvl, levels[lvl]);
      lines.push(...oneLevelLines);
    }
    for (const group of layout.groups ?? []) {
      const line = groupLine(group);
      lines.push(line);
    }
  } else {
    lines.push(...layout.grid);
  }
  return lines.join("\n");
}
