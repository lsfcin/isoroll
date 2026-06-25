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
  kStart: number;
  Wg: number;
  Hg: number;
  nSlices: number;
}

const debugContainers = new Map<string, PIXI.Container>();

function _shortId(id: string): string {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff;
  return h.toString(36).slice(-2).toUpperCase();
}

function _text(str: string, fill: number, size: number, isV8: boolean): PIXI.Text {
  const T = PIXI.Text as any;
  if (isV8) return new T({ text: str, style: { fontSize: size, fill, stroke: { color: 0x000000, width: 3 } } });
  return new T(str, { fontSize: size, fill, stroke: 0x000000, strokeThickness: 3 });
}

const SLICE_COLORS = [0xff6600, 0x00cc66, 0x0088ff, 0xff00cc, 0xffcc00];

export function drawSliceDebug(p: SliceDebugParams, layer: PIXI.Container): void {
  clearSliceDebug(p.id);
  const { id, tile, mesh, origFrame, cuts, kStart, Wg, Hg, nSlices } = p;
  const gs = CanvasEnv.gridSize();
  const nwX = tile.document.x - tile.document.width / 2, nwY = tile.document.y - tile.document.height / 2;
  const snapX = Math.floor(nwX / gs) * gs, snapY = Math.floor(nwY / gs) * gs;
  const ax = mesh.anchor?.x ?? 0, ay = mesh.anchor?.y ?? 0;
  const sx = mesh.scale?.x ?? 1, sy = mesh.scale?.y ?? 1;
  const fw = origFrame.width, fh = origFrame.height;

  const con = new PIXI.Container();
  (con as any).eventMode = "passive"; (con as any).zIndex = 9e9;
  con.position.set(mesh.x, mesh.y); con.rotation = mesh.rotation ?? 0;
  const g = new PIXI.Graphics(); (g as any).eventMode = "passive"; con.addChild(g);
  const ga = g as any, isV8 = typeof ga.stroke === "function";
  const tid = _shortId(id);

  for (let i = 0; i < nSlices; i++) {
    const cl = i === 0 ? 0 : cuts[i - 1];
    const cr = i === nSlices - 1 ? fw : cuts[i];
    const lx1 = (cl / fw - ax) * fw * sx, lx2 = (cr / fw - ax) * fw * sx;
    const ly1 = -ay * fh * sy,            ly2 = (1 - ay) * fh * sy;
    const col = SLICE_COLORS[i % SLICE_COLORS.length];
    if (!isV8) { ga.lineStyle(2, col, 0.85); ga.drawRect(lx1, ly1, lx2 - lx1, ly2 - ly1); }
    else        { ga.rect(lx1, ly1, lx2 - lx1, ly2 - ly1); ga.stroke({ color: col, width: 2, alpha: 0.85 }); }
    const d = kStart + i, rc = Math.min(Hg - 1, d), cc = d - rc;
    const t = _text(`${tid}·${i.toString(36).toUpperCase()}\n(${cc},${rc})`, col, 11, isV8);
    (t as any).anchor?.set(0.5, 0); t.position.set((lx1 + lx2) / 2, ly1 + 4);
    con.addChild(t);
  }

  for (let c = 0; c < Wg; c++) {
    for (let r = 0; r < Hg; r++) {
      const uv = transformCoord({ x: snapX + (c + 0.5) * gs, y: snapY + (r + 0.5) * gs },
        "WORLD", "IMAGE", { mesh: mesh as any }) as P2;
      const t = _text(`(${c},${r})`, 0x00ffff, 10, isV8);
      (t as any).anchor?.set(0.5, 0.5);
      t.position.set((uv.x - ax) * fw * sx, (uv.y - ay) * fh * sy);
      con.addChild(t);
    }
  }

  layer.addChild(con); debugContainers.set(id, con);
}

export function clearSliceDebug(id: string): void {
  const c = debugContainers.get(id);
  if (c) { c.parent?.removeChild(c); (c as any).destroy({ children: true }); debugContainers.delete(id); }
}

export function clearAllSliceDebug(): void {
  for (const [, c] of debugContainers) { c.parent?.removeChild(c); (c as any).destroy({ children: true }); }
  debugContainers.clear();
}
