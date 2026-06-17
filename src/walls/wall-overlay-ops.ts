// Per-wall IsoRenderer drawing + endpoint drag logic.

import { MODULE_ID, startPointerDrag, screenPointToCanvas, CanvasEnv } from "../core";
import { getLinkedWallIds, setLinkedWallIds } from "./wall-flags";
import { canvasToAnchor, wallsLayer, scene, imageRect, anchorToCanvas, type WallDoc, type TileDoc } from "./wall-coords";
import { WallHistory } from "./wall-history";
import { IsoRenderer, LAYER_KEYS } from "../render";
import type { DrawAPI, RenderHandle, ShapeSpec } from "../render";

// Colors matching Foundry's Wall layer rendering exactly
export const WALL_COLORS = {
  normal: 0xFFFFBB, terrain: 0x81B90C, invisible: 0x77E7E8, ethereal: 0xC880FC,
  sound: 0x00BFFF, door: 0x6666EE, secret: 0xA612D4, window: 0xC7D8FF,
};
const UNLINKED_ALPHA = 0.5, LINE_W = 1;

export function wallColor(doc: WallDoc): number {
  if (doc.door === 2) return WALL_COLORS.secret;
  if (doc.door === 1) return WALL_COLORS.door;
  const m = doc.move ?? 0, s = doc.sight ?? doc.sense ?? 0;
  if (s === 10 || s === 1) return WALL_COLORS.terrain;
  if (s === 30 || s === 40 || s === 6 || s === 3) return WALL_COLORS.window;
  if (m !== 1 && m < 10) return WALL_COLORS.ethereal;
  if (s === 0) return WALL_COLORS.invisible;
  return WALL_COLORS.normal;
}

interface WallHandles { line: RenderHandle; epA: RenderHandle; epB: RenderHandle }
interface EpDrag { wallId: string; ep: "A"|"B"; startC: number[]; tileDoc: TileDocument; handles: WallHandles; color: number }

function wallHitArea(c: number[], nw: number, ew: number): { x: number; y: number }[] {
  const dx = c[2]-c[0], dy = c[3]-c[1], l = Math.sqrt(dx*dx+dy*dy) || 1;
  const nx = (-dy/l)*nw, ny = (dx/l)*nw, ex = (dx/l)*ew, ey = (dy/l)*ew;
  return [{ x: c[0]-ex+nx, y: c[1]-ey+ny }, { x: c[2]+ex+nx, y: c[3]+ey+ny },
          { x: c[2]+ex-nx, y: c[3]+ey-ny }, { x: c[0]-ex-nx, y: c[1]-ey-ny }];
}

function epVis(color: number, r: number): ShapeSpec {
  return { kind: "lines", build: (g: DrawAPI) => {
    g.lineStyle(0); g.beginFill(0x000000, 1); g.drawCircle(0, 0, r + 1); g.endFill();
    g.beginFill(color, 0.9); g.drawCircle(0, 0, r); g.endFill();
  }};
}

function scaleEndpoints(hd: Partial<WallHandles>, color: number, r: number, s: number): void {
  hd.epA?.update({ visual: epVis(color, r * s) });
  hd.epB?.update({ visual: epVis(color, r * s) });
}

function wallDblClick(wallId: string, last: { t: number }): boolean {
  const now = Date.now();
  if (now - last.t < 350 && last.t !== 0) { last.t = 0; (wallsLayer().get(wallId) as unknown as { sheet?: { render(f: boolean): void } })?.sheet?.render(true); return true; }
  last.t = now; return false;
}

export function drawWallDisplay(doc: TileDocument, tileId: string, isDrag: boolean, keys: Set<string>): void {
  const rect = isDrag ? imageRect(doc as TileDoc) : null;
  const own = { kind: "tile" as const, id: tileId };
  let first = true;
  for (const id of getLinkedWallIds(doc)) {
    const wall = wallsLayer().get(id);
    if (!wall) continue;
    const wdoc = wall.document as WallDoc;
    const a = isDrag && (wdoc.getFlag(MODULE_ID, "tileAnchor") as { ax: number; ay: number; bx: number; by: number } | undefined);
    const c = (a && rect) ? anchorToCanvas(rect.icx, rect.icy, rect.sw, rect.sh, a) : wdoc.c as number[];
    const color = wallColor(wdoc), r = 2;
    const hd: Partial<WallHandles> = {};
    const lastLC = { t: 0 };
    hd.line = IsoRenderer.render({
      key: `tile-${tileId}:wall-${id}:line`, owner: own,
      visual: { kind: "lines", build: (g) => {
        g.lineStyle(LINE_W + 1.5, 0x000000, 1); g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
        g.lineStyle(LINE_W, color, 1);           g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]); g.lineStyle(0);
      }},
      hitArea: wallHitArea(c, 5, 4), space: "WORLD", placement: { anchor: { x: 0, y: 0 } },
      layer: LAYER_KEYS.WALL_OVERLAY, z: first ? "top" : undefined,
      interaction: { cursor: "pointer",
        onPointerOver: () => scaleEndpoints(hd, color, r, 1.3), onPointerOut: () => scaleEndpoints(hd, color, r, 1),
        onPointerDown: () => wallDblClick(id, lastLC),
      },
    });
    keys.add(`tile-${tileId}:wall-${id}:line`);
    first = false;
    const lastAC = { t: 0 };
    hd.epA = IsoRenderer.render({
      key: `tile-${tileId}:wall-${id}:epA`, owner: own, visual: epVis(color, r),
      space: "WORLD", placement: { anchor: { x: c[0], y: c[1] } }, layer: LAYER_KEYS.WALL_OVERLAY,
      interaction: { cursor: "pointer",
        onPointerOver: () => scaleEndpoints(hd, color, r, 1.3), onPointerOut: () => scaleEndpoints(hd, color, r, 1),
        onPointerDown: (e) => { e.stopPropagation(); if (!wallDblClick(id, lastAC)) startEndpointDrag("A", id, doc, hd as WallHandles, color); },
      },
    });
    keys.add(`tile-${tileId}:wall-${id}:epA`);
    const lastBC = { t: 0 };
    hd.epB = IsoRenderer.render({
      key: `tile-${tileId}:wall-${id}:epB`, owner: own, visual: epVis(color, r),
      space: "WORLD", placement: { anchor: { x: c[2], y: c[3] } }, layer: LAYER_KEYS.WALL_OVERLAY,
      interaction: { cursor: "pointer",
        onPointerOver: () => scaleEndpoints(hd, color, r, 1.3), onPointerOut: () => scaleEndpoints(hd, color, r, 1),
        onPointerDown: (e) => { e.stopPropagation(); if (!wallDblClick(id, lastBC)) startEndpointDrag("B", id, doc, hd as WallHandles, color); },
      },
    });
    keys.add(`tile-${tileId}:wall-${id}:epB`);
  }
}

export function drawWallSelect(doc: TileDocument, tileId: string, keys: Set<string>, refresh: () => void): void {
  const linked = new Set(getLinkedWallIds(doc));
  const own = { kind: "tile" as const, id: tileId };
  let first = true;
  for (const wall of wallsLayer().placeables) {
    const id = wall.document.id ?? "", wdoc = wall.document as WallDoc;
    const c = wdoc.c as number[], isLnk = linked.has(id), col = wallColor(wdoc);
    const alpha = isLnk ? 1 : UNLINKED_ALPHA;
    const lastClick = { t: 0 };
    IsoRenderer.render({
      key: `tile-${tileId}:wall-${id}:sel`, owner: own,
      visual: { kind: "lines", build: (g) => {
        g.lineStyle(LINE_W + 1.5, 0x000000, alpha); g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
        g.lineStyle(LINE_W, col, alpha);             g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]); g.lineStyle(0);
        for (const [ix, iy] of [[0,1],[2,3]] as [number,number][]) {
          g.beginFill(0x000000, alpha); g.drawCircle(c[ix], c[iy], 3); g.endFill();
          g.beginFill(col, alpha);     g.drawCircle(c[ix], c[iy], 2); g.endFill();
        }
      }},
      hitArea: wallHitArea(c, 6, 5), space: "WORLD", placement: { anchor: { x: 0, y: 0 } },
      layer: LAYER_KEYS.WALL_OVERLAY, z: first ? "top" : undefined,
      interaction: { cursor: "pointer",
        onPointerDown: (e) => {
          e.stopPropagation(); if (wallDblClick(id, lastClick)) return;
          const ne = (e as unknown as { nativeEvent?: Event }).nativeEvent;
          ne?.stopPropagation?.(); ne?.stopImmediatePropagation?.();
          toggleWallLink(doc, id, c, refresh);
        },
      },
    });
    keys.add(`tile-${tileId}:wall-${id}:sel`);
    first = false;
  }
}

function toggleWallLink(doc: TileDocument, wallId: string, c: number[], refresh: () => void): void {
  const ids = getLinkedWallIds(doc), isLinked = ids.includes(wallId);
  WallHistory.push({ k: "toggle", tileId: doc.id ?? "", wallId, prevIds: ids, wasLinked: isLinked });
  if (isLinked) {
    setLinkedWallIds(doc, ids.filter(x => x !== wallId)).then(refresh).catch(console.warn);
  } else {
    const anchor = canvasToAnchor(doc as TileDoc, [...c]);
    scene()
      .updateEmbeddedDocuments("Wall", [{ _id: wallId, flags: { [MODULE_ID]: { parentTileId: doc.id, tileAnchor: anchor } } }])
      .then(() => setLinkedWallIds(doc, [...ids, wallId])).then(refresh).catch(console.warn);
  }
}

function snapQuarter(x: number, y: number): { x: number; y: number } {
  const q = CanvasEnv.gridSize() / 4;
  return { x: Math.round(x / q) * q, y: Math.round(y / q) * q };
}

function toSnapCanvas(e: PointerEvent): { x: number; y: number } {
  const wt = CanvasEnv.worldTransform(), rect = CanvasEnv.appView().getBoundingClientRect();
  const { x, y } = screenPointToCanvas(e.clientX - rect.left, e.clientY - rect.top, wt);
  return snapQuarter(x, y);
}

function updatePreview(d: EpDrag, sx: number, sy: number): void {
  const { ep, handles: hd, startC, color } = d;
  if (ep === "A") hd.epA.update({ placement: { anchor: { x: sx, y: sy } } });
  else            hd.epB.update({ placement: { anchor: { x: sx, y: sy } } });
  const ax = ep === "A" ? sx : startC[0], ay = ep === "A" ? sy : startC[1];
  const bx = ep === "B" ? sx : startC[2], by = ep === "B" ? sy : startC[3];
  hd.line.update({ visual: { kind: "lines", build: (g) => {
    g.lineStyle(2.5, 0x000000, 0.8); g.moveTo(ax, ay); g.lineTo(bx, by);
    g.lineStyle(1, color, 1);        g.moveTo(ax, ay); g.lineTo(bx, by); g.lineStyle(0);
  }}});
}

function commitEndpointDrag(d: EpDrag, sx: number, sy: number): void {
  const c = [...d.startC];
  if (d.ep === "A") { c[0] = sx; c[1] = sy; } else { c[2] = sx; c[3] = sy; }
  WallHistory.push({ k: "move", wallId: d.wallId, prevC: d.startC });
  scene().updateEmbeddedDocuments("Wall",
    [{ _id: d.wallId, c, flags: { [MODULE_ID]: { tileAnchor: canvasToAnchor(d.tileDoc as TileDoc, c) } } }],
    { isoroll: "wallEndpointDrag" },
  ).catch(console.warn);
}

function startEndpointDrag(wallId: string, ep: "A"|"B", tileDoc: TileDocument, hd: WallHandles, color: number): void {
  const wall = wallsLayer().get(wallId); if (!wall) return;
  const drag: EpDrag = { wallId, ep, startC: [...wall.document.c], tileDoc, handles: hd, color };
  startPointerDrag(drag,
    (d, e) => { const s = toSnapCanvas(e); updatePreview(d, s.x, s.y); },
    (d, e) => { const s = toSnapCanvas(e); commitEndpointDrag(d, s.x, s.y); },
  );
}
