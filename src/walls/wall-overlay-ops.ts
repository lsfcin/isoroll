// Per-wall IsoRenderer drawing + endpoint drag logic.

import { MODULE_ID, startPointerDrag, screenPointToCanvas, CanvasEnv } from "../core";
import { getLinkedWallIds, setLinkedWallIds } from "./wall-flags";
import { canvasToAnchor, wallsLayer, scene, type WallDoc, type TileDoc } from "./wall-coords";
import { WallHistory } from "./wall-history";
import { IsoRenderer, LAYER_KEYS } from "../render";
import type { DrawAPI, RenderHandle, ShapeSpec } from "../render";

export const WALL_COLORS = {
  normal: 0xFFFFBB, terrain: 0x81B90C, invisible: 0x77E7E8, ethereal: 0xC880FC,
  sound: 0x00BFFF, door: 0x6666EE, secret: 0xA612D4, window: 0xC7D8FF,
};
const UNLINKED_ALPHA = 0.5, LINE_W = 1;
const EP_OUTER = 3, EP_INNER = 2, EP_OUTER_HOV = 4.5, EP_INNER_HOV = 3;

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

// ---- Shared wall visuals (single source for both display and select modes) ----

function drawEpDot(g: DrawAPI, col: number, alpha: number, x: number, y: number, outer = EP_OUTER, inner = EP_INNER): void {
  g.beginFill(0x000000, alpha); g.drawCircle(x, y, outer); g.endFill();
  g.beginFill(col, alpha);     g.drawCircle(x, y, inner); g.endFill();
}

function drawWallLine(g: DrawAPI, c: number[], col: number, alpha: number): void {
  g.lineStyle(LINE_W + 1.5, 0x000000, alpha); g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
  g.lineStyle(LINE_W, col, alpha);             g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]); g.lineStyle(0);
}

// ---- Endpoint drag ----

type EpDrag = { wallId: string; ep: "A"|"B"; c: number[]; epH: RenderHandle; lineH: RenderHandle; col: number };

function lineVis(c: number[], col: number): ShapeSpec {
  return { kind: "lines", build: (g) => drawWallLine(g, c, col, 1) };
}

function epMove(d: EpDrag, ev: PointerEvent): void {
  const { x, y } = screenPointToCanvas(ev.clientX, ev.clientY, CanvasEnv.worldTransform());
  d.epH.update({ placement: { anchor: { x, y } } });
  const nc = [...d.c]; if (d.ep === "A") { nc[0] = x; nc[1] = y; } else { nc[2] = x; nc[3] = y; }
  d.lineH.update({ visual: lineVis(nc, d.col) });
}

function epUp(d: EpDrag, ev: PointerEvent): void {
  const { x, y } = screenPointToCanvas(ev.clientX, ev.clientY, CanvasEnv.worldTransform());
  const nc = [...d.c]; if (d.ep === "A") { nc[0] = x; nc[1] = y; } else { nc[2] = x; nc[3] = y; }
  scene().updateEmbeddedDocuments("Wall", [{ _id: d.wallId, c: nc }]).catch(console.warn);
}

export function drawWallDisplay(doc: TileDocument, tileId: string, keys: Set<string>): void {
  const own = { kind: "tile" as const, id: tileId };
  for (const id of getLinkedWallIds(doc)) {
    const wall = wallsLayer().get(id); if (!wall) continue;
    const wdoc = wall.document as WallDoc, c = wdoc.c as number[], col = wallColor(wdoc);
    const lineKey = `tile-${tileId}:wall-${id}:line`;
    const lineH = IsoRenderer.render({ key: lineKey, owner: own, visual: lineVis(c, col),
      space: "WORLD", placement: { anchor: { x: 0, y: 0 } }, layer: LAYER_KEYS.WALL_OVERLAY });
    keys.add(lineKey);
    for (const [ep, xi, yi] of [["A", 0, 1], ["B", 2, 3]] as ["A"|"B", number, number][]) {
      const x = c[xi], y = c[yi], key = `tile-${tileId}:wall-${id}:ep${ep}`;
      const drag: EpDrag = { wallId: id, ep, c: [...c], epH: null!, lineH, col };
      const epH = IsoRenderer.render({ key, owner: own,
        visual: { kind: "lines", build: (g) => drawEpDot(g, col, 1, 0, 0) },
        hitArea: [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }],
        space: "WORLD", placement: { anchor: { x, y } },
        layer: LAYER_KEYS.WALL_OVERLAY, z: ep === "A" ? "top" : undefined,
        interaction: { cursor: "move",
          onPointerDown: (e) => { e.stopPropagation(); startPointerDrag(drag, epMove, epUp); },
          onPointerOver: () => { drag.epH.update({ visual: { kind: "lines", build: (g) => drawEpDot(g, drag.col, 1, 0, 0, EP_OUTER_HOV, EP_INNER_HOV) } }); },
          onPointerOut:  () => { drag.epH.update({ visual: { kind: "lines", build: (g) => drawEpDot(g, drag.col, 1, 0, 0) } }); },
        },
      });
      drag.epH = epH; keys.add(key);
    }
  }
}

// ---- Wall select mode (unchanged) ----

function wallHitArea(c: number[], nw: number, ew: number): { x: number; y: number }[] {
  const dx = c[2]-c[0], dy = c[3]-c[1], l = Math.sqrt(dx*dx+dy*dy) || 1;
  const nx = (-dy/l)*nw, ny = (dx/l)*nw, ex = (dx/l)*ew, ey = (dy/l)*ew;
  return [{ x: c[0]-ex+nx, y: c[1]-ey+ny }, { x: c[2]+ex+nx, y: c[3]+ey+ny },
          { x: c[2]+ex-nx, y: c[3]+ey-ny }, { x: c[0]-ex-nx, y: c[1]-ey-ny }];
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

function wallDblClick(wallId: string, last: { t: number }): boolean {
  const now = Date.now();
  if (now - last.t < 350 && last.t !== 0) { last.t = 0; (wallsLayer().get(wallId) as unknown as { sheet?: { render(f: boolean): void } })?.sheet?.render(true); return true; }
  last.t = now; return false;
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
        drawWallLine(g, c, col, alpha);
        for (const [ix, iy] of [[0,1],[2,3]] as [number,number][]) drawEpDot(g, col, alpha, c[ix], c[iy]);
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
