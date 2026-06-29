// iso-tile-debug.ts — visual debug overlay for iso tile slices
import { CanvasEnv } from "../core";
import { transformCoord } from "../transform";
import type { P2 } from "../transform";

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
  frontierWorldPts: P2[];
  kStart: number;
  Wg: number;
  Hg: number;
  nSlices: number;
  flipped: boolean;
}

const debugContainers = new Map<string, PIXI.Container>();
// World-space dot containers: separate from mesh-local con (positioned at raw world coords on the layer).
const debugWorldContainers = new Map<string, PIXI.Container>();

function _shortId(id: string): string {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff;
  return h.toString(36).slice(-2).toUpperCase();
}

function _text(str: string, fill: number, size: number): PIXI.Text {
  // v7 constructor (string, style) works on both v7 and v8; v8 object-form would coerce to "[object Object]"
  return new (PIXI.Text as any)(str, { fontSize: size, fill }) as PIXI.Text;
}

const SLICE_COLORS = [0xff6600, 0x00cc66, 0x0088ff, 0xff00cc, 0xffcc00];

export function drawSliceDebug(p: SliceDebugParams, layer: PIXI.Container): void {
  clearSliceDebug(p.id);
  const { id, tile, mesh, origFrame, cuts, rawCuts, frontierWorldPts, kStart, Wg, Hg, nSlices, flipped } = p;
  const gs = CanvasEnv.gridSize();
  const nwX = tile.document.x - tile.document.width / 2, nwY = tile.document.y - tile.document.height / 2;
  const snapX = Math.floor(nwX / gs) * gs, snapY = Math.floor(nwY / gs) * gs;
  const gridC0 = Math.round(snapX / gs), gridR0 = Math.round(snapY / gs); // absolute grid origin of tile
  const ax = mesh.anchor?.x ?? 0, ay = mesh.anchor?.y ?? 0;
  const sx = mesh.scale?.x ?? 1, sy = mesh.scale?.y ?? 1;
  const fw = origFrame.width, fh = origFrame.height;
  const tid = _shortId(id);

  const con = new PIXI.Container();
  (con as any).eventMode = "passive"; (con as any).zIndex = 9e9;
  con.position.set(mesh.x, mesh.y); con.rotation = mesh.rotation ?? 0;
  // Add to layer immediately — graphics visible even if text creation throws later
  layer.addChild(con); debugContainers.set(id, con);

  // Orange cut lines — proven v7/v8 pattern: accumulate path, one stroke call
  const g = new PIXI.Graphics(); (g as any).eventMode = "passive"; con.addChild(g);
  const ga = g as any; const isV8 = typeof ga.stroke === "function";
  if (!isV8) ga.lineStyle(1, 0xff6600, 1);
  for (const cut of cuts) { const bx = (cut / fw - ax) * fw * sx; ga.moveTo(bx, -ay * fh * sy); ga.lineTo(bx, (1 - ay) * fh * sy); }
  if (isV8) ga.stroke({ color: 0xff6600, width: 1 });

  // Cut-point markers (mesh-local, overlaid on tile sprite).
  const midY = (0.5 - ay) * fh * sy;
  // Circles = final selected cuts (solid orange). Diamonds = all rawCuts incl. dropped boundaries (hollow yellow).
  const cg = new PIXI.Graphics(); (cg as any).eventMode = "passive"; con.addChild(cg);
  const cga = cg as any;
  for (const cut of cuts) {
    const cx = (cut / fw - ax) * fw * sx;
    if (!isV8) { cga.beginFill(0xff6600, 1); cga.drawCircle(cx, midY, 6); cga.endFill(); }
    else        { cga.circle(cx, midY, 6); cga.fill({ color: 0xff6600 }); }
  }
  const dg = new PIXI.Graphics(); (dg as any).eventMode = "passive"; con.addChild(dg);
  const dga = dg as any;
  if (!isV8) dga.lineStyle(2, 0xffcc00, 1);
  for (const rc of rawCuts) {
    const dx = (rc / fw - ax) * fw * sx;
    dga.moveTo(dx, midY - 8); dga.lineTo(dx + 8, midY); dga.lineTo(dx, midY + 8); dga.lineTo(dx - 8, midY); dga.closePath();
  }
  if (isV8) dga.stroke({ color: 0xffcc00, width: 2 });

  // World-space frontier-corner dots (magenta). Separate container on layer at raw world coords.
  const wc = new PIXI.Container(); (wc as any).eventMode = "passive"; (wc as any).zIndex = 9e9;
  layer.addChild(wc); debugWorldContainers.set(id, wc);
  const wg = new PIXI.Graphics(); (wg as any).eventMode = "passive"; wc.addChild(wg);
  const wga = wg as any;
  for (const wp of frontierWorldPts) {
    if (!isV8) { wga.beginFill(0xff00ff, 1); wga.drawCircle(wp.x, wp.y, 5); wga.endFill(); }
    else        { wga.circle(wp.x, wp.y, 5); wga.fill({ color: 0xff00ff }); }
  }

  // Per-slice colored outline (separate Graphics per slice — one shape + one stroke each)
  for (let i = 0; i < nSlices; i++) {
    const cl = i === 0 ? 0 : cuts[i - 1];
    const cr = i === nSlices - 1 ? fw : cuts[i];
    const lx1 = (cl / fw - ax) * fw * sx, lx2 = (cr / fw - ax) * fw * sx;
    const ly1 = -ay * fh * sy,            ly2 = (1 - ay) * fh * sy;
    const col = SLICE_COLORS[i % SLICE_COLORS.length];
    const sg = new PIXI.Graphics(); const sga = sg as any;
    if (!isV8) { sga.lineStyle(2, col, 0.7); sga.drawRect(lx1, ly1, lx2 - lx1, ly2 - ly1); }
    else        { sga.rect(lx1, ly1, lx2 - lx1, ly2 - ly1); sga.stroke({ color: col, width: 2, alpha: 0.7 }); }
    con.addChild(sg);
    const effectiveI = flipped ? nSlices - 1 - i : i;
    const d = kStart + effectiveI, rc = Math.min(Hg - 1, d), cc = d - rc;
    try {
      const t = _text(`${tid}·${i.toString(36).toUpperCase()}\n(${gridC0 + cc},${gridR0 + rc})`, col, 11);
      (t as any).anchor?.set(0.5, 0); t.position.set((lx1 + lx2) / 2, ly1 + 4); con.addChild(t);
    } catch { /* text failed — graphics outline still visible */ }
  }

  // Grid cell coordinate labels within tile bounds
  for (let c = 0; c < Wg; c++) {
    for (let r = 0; r < Hg; r++) {
      try {
        const uv = transformCoord({ x: snapX + (c + 0.5) * gs, y: snapY + (r + 0.5) * gs },
          "WORLD", "IMAGE", { mesh: mesh as any }) as P2;
        const t = _text(`(${gridC0 + c},${gridR0 + r})`, 0x00ffff, 10);
        (t as any).anchor?.set(0.5, 0.5);
        // abs(sx): fromWorld uses abs scale, so the UV→local mapping needs abs too (flipped tiles have sx<0).
        t.position.set((uv.x - ax) * fw * Math.abs(sx), (uv.y - ay) * fh * sy); con.addChild(t);
      } catch { /* skip */ }
    }
  }
}

export function clearSliceDebug(id: string): void {
  const c = debugContainers.get(id);
  if (c) { c.parent?.removeChild(c); (c as any).destroy({ children: true }); debugContainers.delete(id); }
  const wc = debugWorldContainers.get(id);
  if (wc) { wc.parent?.removeChild(wc); (wc as any).destroy({ children: true }); debugWorldContainers.delete(id); }
}

export function clearAllSliceDebug(): void {
  for (const [, c] of debugContainers) { c.parent?.removeChild(c); (c as any).destroy({ children: true }); }
  debugContainers.clear();
  for (const [, wc] of debugWorldContainers) { wc.parent?.removeChild(wc); (wc as any).destroy({ children: true }); }
  debugWorldContainers.clear();
}

let gridDebugContainer: PIXI.Container | null = null;

export function drawGridDebug(layer: PIXI.Container): void {
  clearGridDebug();
  const gs = CanvasEnv.gridSize();
  const dims = (globalThis as any).canvas?.dimensions;
  const x0 = dims?.sceneX ?? 0, y0 = dims?.sceneY ?? 0;
  const x1 = x0 + (dims?.sceneWidth ?? 4000), y1 = y0 + (dims?.sceneHeight ?? 4000);
  const con = new PIXI.Container();
  (con as any).eventMode = "passive"; (con as any).zIndex = 8e9;
  layer.addChild(con); gridDebugContainer = con;
  for (let c = Math.floor(x0 / gs); c < Math.ceil(x1 / gs); c++) {
    for (let r = Math.floor(y0 / gs); r < Math.ceil(y1 / gs); r++) {
      try {
        const t = _text(`(${c},${r})`, 0xffffff, 12);
        (t as any).anchor?.set(0.5, 0.5); t.position.set((c + 0.5) * gs, (r + 0.5) * gs);
        con.addChild(t);
      } catch { /* skip */ }
    }
  }
}

export function clearGridDebug(): void {
  if (!gridDebugContainer) return;
  gridDebugContainer.parent?.removeChild(gridDebugContainer);
  (gridDebugContainer as any).destroy({ children: true });
  gridDebugContainer = null;
}
