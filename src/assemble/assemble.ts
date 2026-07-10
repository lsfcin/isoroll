// T5 — TS twin of scene_assemble.assemble, returning the pure plan (no rasterization).
import { massing } from "./massing";
import { rotateCw } from "./layout-parse";
import type { AssemblyPlan, Box, KitMeta, Layout, Placement, View } from "./types";

const VIEW_TURNS: Record<View, number> = { SW: 0, SE: 1, NE: 2, NW: 3 };
const MARGIN = 16;

interface PlacedPiece {
  name: string;
  left: number;
  top: number;
  w: number;
  h: number;
}

interface Bounds {
  width: number;
  height: number;
  dx: number;
  dy: number;
}

export function pieceFor(box: Box): string | null {
  let result: string | null = null;
  if (box.kind === "floor") {
    result = "floor";
  } else if (box.kind === "wall") {
    const hasOpening = box.openings.length > 0;
    if (hasOpening) {
      const opening = box.openings[0];
      result = `${opening.kind}_${box.axis}`;
    } else {
      result = "wall";
    }
  }
  return result; // steps: unsupported in assembly v1
}

function comparePaintOrder(a: Box, b: Box): number {
  const aElevated = a.h > 0 ? 1 : 0;
  const bElevated = b.h > 0 ? 1 : 0;
  let result = aElevated - bElevated;
  if (result === 0) {
    const aSum = a.u0 + a.v0;
    const bSum = b.u0 + b.v0;
    result = aSum - bSum;
  }
  return result;
}

function paintOrderBoxes(layout: Layout, view: View): Box[] {
  const turnCount = VIEW_TURNS[view];
  const turned = rotateCw(layout, turnCount);
  const rawBoxes = massing(turned);
  return [...rawBoxes].sort(comparePaintOrder);
}

function projectBox(box: Box, kit: KitMeta, scale: number): PlacedPiece | null {
  const name = pieceFor(box);
  let result: PlacedPiece | null = null;
  if (name !== null && name in kit.pieces) {
    const meta = kit.pieces[name];
    const px = (box.u0 - box.v0) * scale;
    const py = ((box.u0 + box.v0) * scale) / 2;
    const origin = meta.origin;
    const ox = origin[0];
    const oy = origin[1];
    const left = px - ox;
    const top = py - oy;
    const size = meta.size;
    const w = size[0];
    const h = size[1];
    result = { name, left, top, w, h };
  }
  return result;
}

function computeBounds(xs: number[], ys: number[]): Bounds {
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.trunc(maxX - minX) + 2 * MARGIN;
  const height = Math.trunc(maxY - minY) + 2 * MARGIN;
  const dx = MARGIN - minX;
  const dy = MARGIN - minY;
  return { width, height, dx, dy };
}

export function planScene(layout: Layout, kit: KitMeta, view: View): AssemblyPlan {
  const boxes = paintOrderBoxes(layout, view);
  const scale = kit.px_per_unit;
  const placements: Placement[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (const box of boxes) {
    const placed = projectBox(box, kit, scale);
    if (placed !== null) {
      xs.push(placed.left, placed.left + placed.w);
      ys.push(placed.top, placed.top + placed.h);
      placements.push({ piece: placed.name, left: placed.left, top: placed.top });
    }
  }
  const bounds = computeBounds(xs, ys);
  const plan: AssemblyPlan = {
    placements,
    width: bounds.width,
    height: bounds.height,
    dx: bounds.dx,
    dy: bounds.dy,
  };
  return plan;
}
