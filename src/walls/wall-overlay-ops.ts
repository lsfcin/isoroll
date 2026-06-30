// Per-wall IsoRenderer drawing + endpoint drag logic.

import { MODULE_ID, startPointerDrag, screenPointToCanvas, CanvasEnv } from "../core";
import { getLinkedWallIds } from "./wall-flags";
import { imageRect, anchorToCanvas, wallsLayer, scene, type WallDoc, type TileDoc } from "./wall-coords";
import type { TileAnchor } from "./wall-types";
import { WallHistory } from "./wall-history";
import { IsoRenderer, LAYER_KEYS } from "../render";
import type { DrawAPI, RenderHandle, ShapeSpec } from "../render";
import { wallDblClick } from "./wall-dblclick";

export const WALL_COLORS = {
  normal: 0xFFFFBB, terrain: 0x81B90C, invisible: 0x77E7E8, ethereal: 0xC880FC,
  sound: 0x00BFFF, door: 0x6666EE, secret: 0xA612D4, window: 0xC7D8FF,
};
const LINE_W = 1;
const EP_OUTER = 3, EP_INNER = 2, EP_OUTER_HOV = 4.5, EP_INNER_HOV = 3;

export function wallColor(doc: WallDoc): number {
  let result = WALL_COLORS.normal;
  if (doc.door === 2) {
    result = WALL_COLORS.secret;
  } else if (doc.door === 1) {
    result = WALL_COLORS.door;
  } else {
    const m = doc.move ?? 0;
    const s = doc.sight ?? doc.sense ?? 0;
    if (s === 10 || s === 1) {
      result = WALL_COLORS.terrain;
    } else if (s === 30 || s === 40 || s === 6 || s === 3) {
      result = WALL_COLORS.window;
    } else if (m !== 1 && m < 10) {
      result = WALL_COLORS.ethereal;
    } else if (s === 0) {
      result = WALL_COLORS.invisible;
    }
  }
  return result;
}

export function drawEpDot(g: DrawAPI, col: number, alpha: number, x: number, y: number, outer = EP_OUTER, inner = EP_INNER): void {
  g.beginFill(0x000000, alpha);
  g.drawCircle(x, y, outer);
  g.endFill();
  g.beginFill(col, alpha);
  g.drawCircle(x, y, inner);
  g.endFill();
}

export function drawWallLine(g: DrawAPI, c: number[], col: number, alpha: number): void {
  g.lineStyle(LINE_W + 1.5, 0x000000, alpha);
  g.moveTo(c[0], c[1]);
  g.lineTo(c[2], c[3]);
  g.lineStyle(LINE_W, col, alpha);
  g.moveTo(c[0], c[1]);
  g.lineTo(c[2], c[3]);
  g.lineStyle(0);
}

// ---- Endpoint drag ----

type EpDrag = { wallId: string; ep: "A"|"B"; c: number[]; epH: RenderHandle; lineH: RenderHandle; col: number };

export function lineVis(c: number[], col: number): ShapeSpec {
  return { kind: "lines", build: (g) => drawWallLine(g, c, col, 1) };
}

export function toCanvas(ev: PointerEvent): { x: number; y: number } {
  const transform = CanvasEnv.worldTransform();
  const raw = screenPointToCanvas(ev.clientX, ev.clientY, transform);
  let x = raw.x;
  let y = raw.y;
  if (!ev.shiftKey) {
    const s = CanvasEnv.gridSize() / 4;
    x = Math.round(x / s) * s;
    y = Math.round(y / s) * s;
  }
  return { x, y };
}

function epMove(d: EpDrag, ev: PointerEvent): void {
  const { x, y } = toCanvas(ev);
  const eh = d.epH;
  eh.update({ placement: { anchor: { x, y } } });
  const nc = [...d.c];
  if (d.ep === "A") {
    nc[0] = x;
    nc[1] = y;
  } else {
    nc[2] = x;
    nc[3] = y;
  }
  const vis = lineVis(nc, d.col);
  const lh = d.lineH;
  lh.update({ visual: vis });
}

function epUp(d: EpDrag, ev: PointerEvent): void {
  const { x, y } = toCanvas(ev);
  const nc = [...d.c];
  if (d.ep === "A") {
    nc[0] = x;
    nc[1] = y;
  } else {
    nc[2] = x;
    nc[3] = y;
  }
  WallHistory.push({ k: "move", wallId: d.wallId, prevC: d.c });
  const sc = scene();
  const p = sc.updateEmbeddedDocuments("Wall", [{ _id: d.wallId, c: nc }]);
  p.catch(console.warn);
}

export function wallHitArea(c: number[], nw: number, ew: number): { x: number; y: number }[] {
  const dx = c[2] - c[0], dy = c[3] - c[1];
  const l = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = (-dy / l) * nw, ny = (dx / l) * nw;
  const ex = (dx / l) * ew, ey = (dy / l) * ew;
  return [
    { x: c[0] - ex + nx, y: c[1] - ey + ny },
    { x: c[2] + ex + nx, y: c[3] + ey + ny },
    { x: c[2] + ex - nx, y: c[3] + ey - ny },
    { x: c[0] - ex - nx, y: c[1] - ey - ny },
  ];
}

function renderWallEndpoint(
  ep: "A"|"B", c: number[], xi: number, yi: number,
  id: string, tileId: string, lastClick: { t: number },
  lineH: RenderHandle, col: number,
  own: { kind: "tile"; id: string }, keys: Set<string>,
): void {
  const x = c[xi], y = c[yi];
  const key = `tile-${tileId}:wall-${id}:ep${ep}`;
  const drag: EpDrag = { wallId: id, ep, c: [...c], epH: null!, lineH, col };
  const epH = IsoRenderer.render({
    key, owner: own,
    visual: { kind: "lines", build: (g) => drawEpDot(g, col, 1, 0, 0) },
    hitArea: [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }],
    space: "WORLD", placement: { anchor: { x, y } },
    layer: LAYER_KEYS.WALL_OVERLAY, z: ep === "A" ? "top" : undefined,
    interaction: { cursor: "pointer",
      onPointerDown: (e) => {
        e.stopPropagation();
        if (!wallDblClick(id, lastClick)) {
          startPointerDrag(drag, epMove, epUp);
        }
      },
      onPointerOver: () => {
        const eh = drag.epH;
        eh.update({ visual: { kind: "lines", build: (g) => drawEpDot(g, drag.col, 1, 0, 0, EP_OUTER_HOV, EP_INNER_HOV) } });
      },
      onPointerOut: () => {
        const eh = drag.epH;
        eh.update({ visual: { kind: "lines", build: (g) => drawEpDot(g, drag.col, 1, 0, 0) } });
      },
    },
  });
  drag.epH = epH;
  keys.add(key);
}

export function drawWallDisplay(tile: Tile, tileId: string, keys: Set<string>): void {
  const doc = tile.document;
  const own = { kind: "tile" as const, id: tileId };
  const layer = wallsLayer();
  for (const id of getLinkedWallIds(doc)) {
    const wall = layer.get(id);
    if (!wall) {
      continue;
    }
    const wdoc = wall.document as WallDoc;
    const col = wallColor(wdoc);
    // Compute from stored anchor + live doc.x/y so walls follow tile during native Foundry drag
    const anchor = wdoc.getFlag(MODULE_ID, "tileAnchor") as TileAnchor | undefined;
    const rect = imageRect(doc as TileDoc);
    const c = anchor ? anchorToCanvas(rect.icx, rect.icy, rect.sw, rect.sh, anchor) : wdoc.c as number[];
    const lineKey = `tile-${tileId}:wall-${id}:line`;
    const lastClick = { t: 0 };
    const hitArea = wallHitArea(c, 6, 5);
    const vis = lineVis(c, col);
    const lineH = IsoRenderer.render({
      key: lineKey, owner: own, visual: vis, hitArea,
      space: "WORLD", placement: { anchor: { x: 0, y: 0 } }, layer: LAYER_KEYS.WALL_OVERLAY,
      interaction: { cursor: "pointer", onPointerDown: (e) => {
        e.stopPropagation();
        const ne = (e as unknown as { nativeEvent?: { stopImmediatePropagation?(): void } }).nativeEvent;
        ne?.stopImmediatePropagation?.();
        wallDblClick(id, lastClick);
      }},
    });
    keys.add(lineKey);
    for (const [ep, xi, yi] of [["A", 0, 1], ["B", 2, 3]] as ["A"|"B", number, number][]) {
      renderWallEndpoint(ep, c, xi, yi, id, tileId, lastClick, lineH, col, own, keys);
    }
  }
}
