// T1 — painter edit model (3-arch.md painter-mvp-1). Loop 4b: model.ts's only frozen contract is
// the per-tool `g` grid char + toLayout() round-trip (PIN D1) — Level.side/type/wmat/fh attr maps
// are deliberately NOT populated here: massing() only ever reads Level.g (see ../assemble/massing.ts),
// and PIN D1 states the attr encoding is unpinned until a real downstream consumer needs it.
import type { Layout, Level } from "../assemble/types";
import { DOOR, FLOOR, VOID, WALL, WINDOW } from "../assemble/types";
import type { Cell, PaintTool, Snapshot, Stroke } from "./types";

const CHAR_FOR_TOOL: Record<PaintTool, string> = {
  wall: WALL,
  floor: FLOOR,
  door: DOOR,
  window: WINDOW,
  erase: VOID,
};

function setChar(row: string, index: number, ch: string): string {
  const before = row.slice(0, index);
  const after = row.slice(index + 1);
  return before + ch + after;
}

function writeCell(level: Level, cell: Cell, ch: string): void {
  const row = level.g[cell.v];
  const updated = setChar(row, cell.u, ch);
  level.g[cell.v] = updated;
}

function cloneLevel(level: Level): Level {
  const clone: Level = { g: [...level.g] };
  if (level.side) {
    clone.side = { ...level.side };
  }
  if (level.type) {
    clone.type = { ...level.type };
  }
  if (level.wmat) {
    clone.wmat = { ...level.wmat };
  }
  if (level.fh) {
    clone.fh = { ...level.fh };
  }
  return clone;
}

function levelTemplateDims(levels: Record<number, Level>): { rows: number; cols: number } {
  const keys = Object.keys(levels);
  let rows = 0;
  let cols = 0;
  if (keys.length > 0) {
    const template = levels[Number(keys[0])];
    const templateRows = template.g;
    rows = templateRows.length;
    if (rows > 0) {
      const firstRow = templateRows[0];
      cols = firstRow.length;
    }
  }
  return { rows, cols };
}

function blankLevel(dims: { rows: number; cols: number }): Level {
  const blankRow = " ".repeat(dims.cols);
  const g: string[] = [];
  for (let i = 0; i < dims.rows; i++) {
    g.push(blankRow);
  }
  return { g };
}

function getOrCreateLevel(layout: Layout, slice: number): Level {
  const levels = layout.levels as Record<number, Level>;
  let level = levels[slice];
  if (!level) {
    const dims = levelTemplateDims(levels);
    level = blankLevel(dims);
    levels[slice] = level;
  }
  return level;
}

export class PainterModel {
  private readonly layout: Layout;
  private readonly undoStack: Snapshot[] = [];
  private currentSlice = 0;

  constructor(layout: Layout) {
    this.layout = layout;
    if (!this.layout.levels) {
      this.layout.levels = {};
    }
  }

  get slice(): number {
    return this.currentSlice;
  }

  setSlice(n: number): void {
    this.currentSlice = n;
  }

  applyStroke(s: Stroke): void {
    const level = getOrCreateLevel(this.layout, s.slice);
    const snapshot = cloneLevel(level);
    this.undoStack.push({ slice: s.slice, level: snapshot });
    const ch = CHAR_FOR_TOOL[s.tool];
    for (const cell of s.cells) {
      writeCell(level, cell, ch);
    }
  }

  undo(): void {
    const snapshot = this.undoStack.pop();
    if (snapshot) {
      const levels = this.layout.levels as Record<number, Level>;
      levels[snapshot.slice] = snapshot.level;
    }
  }

  toLayout(): Layout {
    return this.layout;
  }
}
