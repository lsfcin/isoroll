// iso-tile-debug-paint.ts — PIXI drawing helpers for the iso tile debug overlay.
import { CanvasEnv } from "../core";
import { currentProjection } from "../transform";
import type { P2 } from "../transform";
import type { SliceDebugParams } from "./iso-tile-debug";

type PixiGfx = {
  eventMode?: string;
  lineStyle?(w: number, c: number, a: number): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  beginFill?(c: number, a: number): void;
  drawCircle?(x: number, y: number, r: number): void;
  endFill?(): void;
  closePath?(): void;
  circle?(x: number, y: number, r: number): void;
  fill?(opts: { color: number }): void;
  rect?(x: number, y: number, w: number, h: number): void;
  drawRect?(x: number, y: number, w: number, h: number): void;
  stroke?(opts: { color: number; width: number; alpha?: number }): void;
};

type PixiContainerX = PIXI.Container & { eventMode?: string; zIndex?: number };
type PixiTextLike = PIXI.Text & { anchor?: { set(x: number, y: number): void } };

export const SLICE_COLORS = [0xff6600, 0x00cc66, 0x0088ff, 0xff00cc, 0xffcc00];

export function makeText(str: string, fill: number, size: number): PixiTextLike {
  // v7 constructor (string, style) works on both v7 and v8; v8 object-form would coerce to "[object Object]"
  const TextCtor = PIXI.Text as unknown as new (s: string, style: { fontSize: number; fill: number }) => PixiTextLike;
  return new TextCtor(str, { fontSize: size, fill });
}

export function _isV8(g: PixiGfx): boolean {
  return typeof g.stroke === "function";
}

export function drawCutLines(con: PIXI.Container, cuts: number[], fw: number, ax: number, ay: number, fh: number, sx: number, sy: number): void {
  const g = new PIXI.Graphics();
  const gx = g as unknown as PixiGfx;
  gx.eventMode = "passive";
  con.addChild(g);
  if (!_isV8(gx)) {
    gx.lineStyle!(1, 0xff6600, 1);
  }
  for (const cut of cuts) {
    const bx = (cut / fw - ax) * fw * sx;
    gx.moveTo(bx, -ay * fh * sy);
    gx.lineTo(bx, (1 - ay) * fh * sy);
  }
  if (_isV8(gx)) {
    gx.stroke!({ color: 0xff6600, width: 1 });
  }
}

export function drawCutMarkers(con: PIXI.Container, cuts: number[], rawCuts: number[], fw: number, ax: number, ay: number, fh: number, sx: number, sy: number): void {
  const midY = (0.5 - ay) * fh * sy;
  const cg = new PIXI.Graphics();
  const cga = cg as unknown as PixiGfx;
  cga.eventMode = "passive";
  con.addChild(cg);
  for (const cut of cuts) {
    const cx = (cut / fw - ax) * fw * sx;
    if (!_isV8(cga)) {
      cga.beginFill!(0xff6600, 1);
      cga.drawCircle!(cx, midY, 6);
      cga.endFill!();
    } else {
      cga.circle!(cx, midY, 6);
      cga.fill!({ color: 0xff6600 });
    }
  }
  const dg = new PIXI.Graphics();
  const dga = dg as unknown as PixiGfx;
  dga.eventMode = "passive";
  con.addChild(dg);
  if (!_isV8(dga)) {
    dga.lineStyle!(2, 0xffcc00, 1);
  }
  for (const rc of rawCuts) {
    const dx = (rc / fw - ax) * fw * sx;
    dga.moveTo(dx, midY - 8);
    dga.lineTo(dx + 8, midY);
    dga.lineTo(dx, midY + 8);
    dga.lineTo(dx - 8, midY);
    dga.closePath!();
  }
  if (_isV8(dga)) {
    dga.stroke!({ color: 0xffcc00, width: 2 });
  }
}

export function drawFrontierDots(id: string, frontierWorldPts: P2[], layer: PIXI.Container, worldContainers: Map<string, PIXI.Container>): void {
  const wc = new PIXI.Container() as PixiContainerX;
  wc.eventMode = "passive";
  wc.zIndex = 9e9;
  layer.addChild(wc);
  worldContainers.set(id, wc);
  const wg = new PIXI.Graphics();
  const wga = wg as unknown as PixiGfx;
  wga.eventMode = "passive";
  wc.addChild(wg);
  for (const wp of frontierWorldPts) {
    if (!_isV8(wga)) {
      wga.beginFill!(0xff00ff, 1);
      wga.drawCircle!(wp.x, wp.y, 5);
      wga.endFill!();
    } else {
      wga.circle!(wp.x, wp.y, 5);
      wga.fill!({ color: 0xff00ff });
    }
  }
}

export function drawSliceOutlines(con: PIXI.Container, p: SliceDebugParams, fw: number, ax: number, ay: number, fh: number, sx: number, sy: number, tid: string): void {
  const { cuts, nSlices, kStart, Hg, flipped, tile } = p;
  const gs = CanvasEnv.gridSize();
  const nwX = tile.document.x - tile.document.width / 2;
  const nwY = tile.document.y - tile.document.height / 2;
  const gridC0 = Math.floor(nwX / gs);
  const gridR0 = Math.floor(nwY / gs);
  for (let i = 0; i < nSlices; i++) {
    const cl = i === 0 ? 0 : cuts[i - 1];
    const cr = i === nSlices - 1 ? fw : cuts[i];
    const lx1 = (cl / fw - ax) * fw * sx;
    const lx2 = (cr / fw - ax) * fw * sx;
    const ly1 = -ay * fh * sy;
    const ly2 = (1 - ay) * fh * sy;
    const col = SLICE_COLORS[i % SLICE_COLORS.length];
    const sg = new PIXI.Graphics();
    const sga = sg as unknown as PixiGfx;
    if (!_isV8(sga)) {
      sga.lineStyle!(2, col, 0.7);
      sga.drawRect!(lx1, ly1, lx2 - lx1, ly2 - ly1);
    } else {
      sga.rect!(lx1, ly1, lx2 - lx1, ly2 - ly1);
      sga.stroke!({ color: col, width: 2, alpha: 0.7 });
    }
    con.addChild(sg);
    const effectiveI = flipped ? nSlices - 1 - i : i;
    const d = kStart + effectiveI;
    const rc = Math.min(Hg - 1, d);
    const cc = d - rc;
    try {
      const sliceHex = i.toString(36);
      const label = `${tid}·${sliceHex.toUpperCase()}\n(${gridC0 + cc},${gridR0 + rc})`;
      const t = makeText(label, col, 11);
      t.anchor?.set(0.5, 0);
      t.position.set((lx1 + lx2) / 2, ly1 + 4);
      con.addChild(t);
    } catch { /* text failed — graphics outline still visible */ }
  }
}

export function drawCellLabels(wc: PIXI.Container, p: SliceDebugParams, snapX: number, snapY: number, gridC0: number, gridR0: number): void {
  const { Wg, Hg } = p;
  const gs = CanvasEnv.gridSize();
  const proj = currentProjection();
  for (let c = 0; c < Wg; c++) {
    for (let r = 0; r < Hg; r++) {
      try {
        const wx = snapX + (c + 0.5) * gs;
        const wy = snapY + (r + 0.9) * gs;
        const t = makeText(`(${gridC0 + c},${gridR0 + r})`, 0x00ffff, 8);
        t.anchor?.set(0.5, 0.5);
        t.position.set(wx, wy);
        t.rotation = proj.reverseRotation;
        t.scale.set(proj.counterFactor, proj.ratio * proj.counterFactor);
        wc.addChild(t);
      } catch { /* skip */ }
    }
  }
}
