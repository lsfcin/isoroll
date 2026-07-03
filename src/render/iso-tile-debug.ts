// iso-tile-debug.ts — visual debug overlay for iso tile slices
import { CanvasEnv } from "../core";
import {
  drawCutLines,
  drawCutMarkers,
  drawFrontierDots,
  drawSliceOutlines,
  drawCellLabels,
  makeText,
} from "./iso-tile-debug-paint";
import { drawCellMarkers } from "./iso-tile-debug-cells";

type Mesh = PIXI.DisplayObject & {
  texture?: PIXI.Texture;
  anchor?: PIXI.ObservablePoint;
  scale?: PIXI.ObservablePoint;
  rotation?: number;
};

export interface SliceDebugParams {
  id: string;
  tile: Tile;
  mesh: Mesh;
  origFrame: PIXI.Rectangle;
  cuts: number[];
  rawCuts: number[];
  faces: import("./iso-tile-depth").SliceFace[];
  frontierWorldPts: import("../transform").P2[];
  Wg: number;
  Hg: number;
  nSlices: number;
  flipped: boolean;
}

const debugContainers = new Map<string, PIXI.Container>();
// World-space dot containers: separate from mesh-local con (positioned at raw world coords on the layer).
const debugWorldContainers = new Map<string, PIXI.Container>();

type PixiContainerX = PIXI.Container & { eventMode?: string; zIndex?: number };
type DestroyableContainer = { destroy(o: object): void };

function _shortId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) & 0xffffff;
  }
  const hex = h.toString(36);
  const short = hex.slice(-2);
  return short.toUpperCase();
}

export function drawSliceDebug(p: SliceDebugParams, layer: PIXI.Container): void {
  clearSliceDebug(p.id);
  const { id, tile, mesh, origFrame, cuts, rawCuts, frontierWorldPts } = p;
  const gs = CanvasEnv.gridSize();
  const nwX = tile.document.x - tile.document.width / 2;
  const nwY = tile.document.y - tile.document.height / 2;
  const snapX = Math.floor(nwX / gs) * gs;
  const snapY = Math.floor(nwY / gs) * gs;
  const gridC0 = Math.round(snapX / gs);
  const gridR0 = Math.round(snapY / gs);
  const ax = mesh.anchor?.x ?? 0.5;
  const ay = mesh.anchor?.y ?? 0.5;
  const sx = mesh.scale?.x ?? 1;
  const sy = mesh.scale?.y ?? 1;
  const fw = origFrame.width;
  const fh = origFrame.height;
  const tid = _shortId(id);

  const con = new PIXI.Container() as PixiContainerX;
  con.eventMode = "passive";
  con.zIndex = 9e9;
  con.position.set(mesh.x, mesh.y);
  con.rotation = mesh.rotation ?? 0;
  // Add to layer immediately — graphics visible even if text creation throws later
  layer.addChild(con);
  debugContainers.set(id, con);

  drawCutLines(con, cuts, fw, ax, ay, fh, sx, sy);
  drawCutMarkers(con, cuts, rawCuts, fw, ax, ay, fh, sx, sy);
  drawFrontierDots(id, frontierWorldPts, layer, debugWorldContainers);
  const wc = debugWorldContainers.get(id);
  if (wc) {
    drawCellMarkers(wc, p);
    drawCellLabels(wc, p, snapX, snapY, gridC0, gridR0);
  }
  drawSliceOutlines(con, p, fw, ax, ay, fh, sx, sy, tid);
}

// Draw the per-slice overlay for a freshly created tile when enabled (caller passes the
// flag to avoid an import cycle with iso-tile-zdebug, which owns the DEBUG_SLICES switch).
// Assembles SliceDebugParams here so callers stay within function-length limits.
export function maybeDrawSliceDebug(
  enabled: boolean,
  tile: Tile,
  mesh: SliceDebugParams["mesh"],
  origFrame: PIXI.Rectangle,
  state: Pick<SliceDebugParams, "cuts" | "rawCuts" | "faces" | "frontierWorldPts">,
  dims: Pick<SliceDebugParams, "Wg" | "Hg" | "nSlices" | "flipped">,
  layer: PIXI.Container,
): void {
  if (enabled) {
    const p: SliceDebugParams = {
      id: tile.id,
      tile,
      mesh,
      origFrame,
      cuts: state.cuts,
      rawCuts: state.rawCuts,
      faces: state.faces,
      frontierWorldPts: state.frontierWorldPts,
      Wg: dims.Wg,
      Hg: dims.Hg,
      nSlices: dims.nSlices,
      flipped: dims.flipped,
    };
    clearSliceDebug(p.id);
    drawSliceDebug(p, layer);
  }
}

export function clearSliceDebug(id: string): void {
  const c = debugContainers.get(id);
  if (c) {
    c.parent?.removeChild(c);
    (c as unknown as DestroyableContainer).destroy({ children: true });
    debugContainers.delete(id);
  }
  const wc = debugWorldContainers.get(id);
  if (wc) {
    wc.parent?.removeChild(wc);
    (wc as unknown as DestroyableContainer).destroy({ children: true });
    debugWorldContainers.delete(id);
  }
}

export function clearAllSliceDebug(): void {
  for (const [, c] of debugContainers) {
    c.parent?.removeChild(c);
    (c as unknown as DestroyableContainer).destroy({ children: true });
  }
  debugContainers.clear();
  for (const [, wc] of debugWorldContainers) {
    wc.parent?.removeChild(wc);
    (wc as unknown as DestroyableContainer).destroy({ children: true });
  }
  debugWorldContainers.clear();
}

type GlobalCanvas = {
  canvas?: {
    dimensions?: { sceneX?: number; sceneY?: number; sceneWidth?: number; sceneHeight?: number };
  };
};
let gridDebugContainer: PIXI.Container | null = null;

export function drawGridDebug(layer: PIXI.Container): void {
  clearGridDebug();
  const gs = CanvasEnv.gridSize();
  const dims = (globalThis as unknown as GlobalCanvas).canvas?.dimensions;
  const x0 = dims?.sceneX ?? 0;
  const y0 = dims?.sceneY ?? 0;
  const x1 = x0 + (dims?.sceneWidth ?? 4000);
  const y1 = y0 + (dims?.sceneHeight ?? 4000);
  const con = new PIXI.Container() as PixiContainerX;
  con.eventMode = "passive";
  con.zIndex = 8e9;
  layer.addChild(con);
  gridDebugContainer = con;
  for (let c = Math.floor(x0 / gs); c < Math.ceil(x1 / gs); c++) {
    for (let r = Math.floor(y0 / gs); r < Math.ceil(y1 / gs); r++) {
      try {
        const t = makeText(`(${c},${r})`, 0xffffff, 12);
        t.anchor?.set(0.5, 0.5);
        t.position.set((c + 0.5) * gs, (r + 0.5) * gs);
        con.addChild(t);
      } catch {
        /* skip */
      }
    }
  }
}

export function clearGridDebug(): void {
  if (!gridDebugContainer) {
    return;
  }
  gridDebugContainer.parent?.removeChild(gridDebugContainer);
  (gridDebugContainer as unknown as DestroyableContainer).destroy({ children: true });
  gridDebugContainer = null;
}
