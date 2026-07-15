// T1 — pure types for the painter edit model (3-arch.md painter-mvp-1, Loop 4a seam). No logic.
import type { Layout, Level } from "../assemble/types";

export type PaintTool = "wall" | "floor" | "door" | "window" | "erase";

export interface Cell {
  u: number;
  v: number;
}

// One committed drag gesture. `slice` pins which Level (v2 Layout) the stroke edits; `h` is the
// wall/door/window height (voxels), `fh` is the floor height (ft, 0-2 per C2) — both carried on
// every Stroke regardless of tool so PainterModel.applyStroke stays a single switch, not five
// signatures (3-arch.md model.ts prose: "wall->#/h, floor->./fh").
export interface Stroke {
  tool: PaintTool;
  cells: Cell[];
  slice: number;
  h: number;
  fh: number;
}

// Per-stroke undo unit — deep copy of the one Level a Stroke touches, pushed onto
// PainterModel's undoStack BEFORE the stroke mutates it (3-arch.md PIN: undo unit = one stroke).
export interface Snapshot {
  slice: number;
  level: Level;
}

// PaintModel shape (3-arch.md T1 prose) = editable v2 Layout + undo stack. Re-stated here as a
// named type so model.ts's constructor signature has a home; PainterModel itself owns the
// mutation logic (Loop 4b), this is data shape only.
export interface PaintModel {
  layout: Layout;
  undoStack: Snapshot[];
}
