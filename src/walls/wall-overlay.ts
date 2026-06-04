// PIXI overlay: shows linked walls when tile is selected, with select-mode picking.
import { MODULE_ID } from "../volume/flags";
import { getLinkedWallIds, wallsLayer, imageRect, anchorToCanvas } from "./wall-core";
import type { WallDoc, TileDoc } from "./wall-core";
import { addEndpointHandles, addLineHover, addSelectInteraction, addWallDblClick } from "./wall-overlay-ops";
import { LayerManager, LAYER_KEYS } from "../render/layer-manager";

// Colors matching Foundry's Wall layer rendering exactly
export const WALL_COLORS = {
  normal: 0xFFFFBB, terrain: 0x81B90C, invisible: 0x77E7E8, ethereal: 0xC880FC,
  sound: 0x00BFFF, door: 0x6666EE, secret: 0xA612D4, window: 0xC7D8FF,
};
const UNLINKED_ALPHA = 0.5;
const LINE_W = 1;

export function wallColor(doc: WallDoc): number {
  if (doc.door === 2) return WALL_COLORS.secret;
  if (doc.door === 1) return WALL_COLORS.door;
  const m = doc.move ?? 0;
  // v14 renamed "sense" → "sight"; fall back to sense for older versions
  const s = doc.sight ?? doc.sense ?? 0;
  // Terrain: v14 DISTANCE=30/PROXIMITY=40, v13 TERRAIN=3/DISTANCE=6
  if (s === 10 || s === 1) return WALL_COLORS.terrain;
  // Window: v14 LIMITED=10, v13 LIMITED=1
  if (s === 30 || s === 40 || s === 6 || s === 3) return WALL_COLORS.window;
  // Ethereal: movement passes through
  // v14: NORMAL=10 blocks; NONE=0 doesn't (ethereal). v13: NORMAL=1 blocks; ETHEREAL=2 doesn't.
  const moveBlocks = m === 1 || m >= 10;
  if (!moveBlocks) return WALL_COLORS.ethereal;
  // Invisible: movement blocks, sight passes (NONE=0)
  if (s === 0) return WALL_COLORS.invisible;
  return WALL_COLORS.normal;
}

export class WallOverlay {
  private static _boxes: Map<string, PIXI.Container> = new Map();
  private static _selectTile: string | null = null;
  private static _altMode = false;
  private static _pendingRefresh: Set<string> = new Set();
  private static _rafId: number | null = null;

  static activate(): void {
    Hooks.on("canvasReady", () => WallOverlay.clearAll());
    Hooks.on("controlTile", (tile: Tile, controlled: boolean) => {
      if (controlled) WallOverlay.show(tile);
      else { WallOverlay._selectTile = null; WallOverlay.hide(tile.id); }
    });
    Hooks.on("refreshTile", (rawTile: unknown) => {
      if (WallOverlay._boxes.size > 0) LayerManager.bringToTop(LAYER_KEYS.WALL_OVERLAY);
      // Preview clone fires refreshTile with drag-updated doc.x/y — redraw walls at new position.
      const t = rawTile as { id: string; hasPreview?: boolean; isPreview?: boolean };
      if (WallOverlay._boxes.has(t.id) && !t.hasPreview && t.isPreview) WallOverlay.show(rawTile as any, true);
    });
    window.addEventListener("keydown", e => { if (e.altKey) WallOverlay._setAltMode(true); });
    window.addEventListener("keyup",   e => { if (!e.altKey) WallOverlay._setAltMode(false); });
  }

  static show(tile: Tile, isDrag = false): void {
    WallOverlay.hide(tile.id);
    const layer = LayerManager.ensureLayer(LAYER_KEYS.WALL_OVERLAY);
    const ctr   = new PIXI.Container();
    ctr.eventMode = "auto";
    if (WallOverlay._selectTile === tile.id) WallOverlay._drawSelect(ctr, tile.document);
    else WallOverlay._drawDisplay(ctr, tile.document, isDrag);
    layer.addChild(ctr);
    WallOverlay._boxes.set(tile.id, ctr);
    LayerManager.bringToTop(LAYER_KEYS.WALL_OVERLAY);
  }

  static hide(tileId: string): void {
    const ctr = WallOverlay._boxes.get(tileId);
    if (!ctr) return;
    ctr.parent?.removeChild(ctr);
    ctr.destroy({ children: true });
    WallOverlay._boxes.delete(tileId);
  }

  static clearAll(): void {
    for (const id of [...WallOverlay._boxes.keys()]) WallOverlay.hide(id);
    WallOverlay._selectTile = null;
    LayerManager.clearLayer(LAYER_KEYS.WALL_OVERLAY);
  }

  static enterSelect(tile: Tile): void { WallOverlay._selectTile = tile.id; WallOverlay.show(tile); }
  static exitSelect(tile: Tile): void  { WallOverlay._selectTile = null;    WallOverlay.show(tile); }
  static isSelectMode(tileId: string): boolean { return WallOverlay._selectTile === tileId; }
  static refresh(tile: Tile): void {
    if (!WallOverlay._boxes.has(tile.id)) return;
    WallOverlay._pendingRefresh.add(tile.id);
    if (WallOverlay._rafId !== null) return;
    WallOverlay._rafId = requestAnimationFrame(() => {
      WallOverlay._rafId = null;
      for (const id of WallOverlay._pendingRefresh) {
        if (!WallOverlay._boxes.has(id)) continue;
        const t = (canvas.tiles as unknown as { get(id: string): Tile | undefined }).get(id);
        if (t) WallOverlay.show(t);
      }
      WallOverlay._pendingRefresh.clear();
    });
  }

  private static _setAltMode(active: boolean): void {
    if (WallOverlay._altMode === active) return;
    WallOverlay._altMode = active;
    for (const id of [...WallOverlay._boxes.keys()]) { // snapshot: show() mutates _boxes
      const tile = (canvas.tiles as unknown as { get(id: string): Tile | undefined }).get(id);
      if (tile) WallOverlay.show(tile);
    }
  }

  private static _drawDisplay(ctr: PIXI.Container, doc: TileDocument, isDrag = false): void {
    const r = 2;
    const rect = isDrag ? imageRect(doc as TileDoc) : null;
    for (const id of getLinkedWallIds(doc)) {
      const wall = wallsLayer().get(id);
      if (!wall) continue;
      const wdoc = wall.document as WallDoc;
      const a = isDrag && (wdoc.getFlag(MODULE_ID, "tileAnchor") as { ax: number; ay: number; bx: number; by: number } | undefined);
      const c = (a && rect) ? anchorToCanvas(rect.icx, rect.icy, rect.sw, rect.sh, a) : wdoc.c as [number, number, number, number];
      const color = wallColor(wdoc);
      const g = new PIXI.Graphics();
      g.name = `line-${id}`;
      g.eventMode = "static"; g.cursor = "pointer";
      g.lineStyle(LINE_W + 1.5, 0x000000, 1.0);
      g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
      g.lineStyle(LINE_W, color, 1);
      g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
      g.lineStyle(0);
      { const dx=c[2]-c[0], dy=c[3]-c[1], l=Math.sqrt(dx*dx+dy*dy)||1, nx=(-dy/l)*5, ny=(dx/l)*5, ex=(dx/l)*4, ey=(dy/l)*4;
        g.hitArea = new PIXI.Polygon([c[0]-ex+nx,c[1]-ey+ny, c[2]+ex+nx,c[3]+ey+ny, c[2]+ex-nx,c[3]+ey-ny, c[0]-ex-nx,c[1]-ey-ny]); }
      ctr.addChild(g);
      addEndpointHandles(ctr, c, id, doc, color, r);
      addLineHover(g, id, ctr);
      addWallDblClick(g, id);
    }
  }

  private static _drawSelect(ctr: PIXI.Container, doc: TileDocument): void {
    const linked = new Set(getLinkedWallIds(doc));
    const r = 2;
    for (const wall of wallsLayer().placeables) {
      const id    = wall.document.id ?? "";
      const wdoc  = wall.document as WallDoc;
      const c     = wdoc.c;
      const isLnk = linked.has(id);
      const col   = wallColor(wdoc);
      const g     = new PIXI.Graphics();
      { const dx=c[2]-c[0], dy=c[3]-c[1], l=Math.sqrt(dx*dx+dy*dy)||1, nx=(-dy/l)*6, ny=(dx/l)*6, ex=(dx/l)*5, ey=(dy/l)*5;
        g.hitArea = new PIXI.Polygon([c[0]-ex+nx,c[1]-ey+ny, c[2]+ex+nx,c[3]+ey+ny, c[2]+ex-nx,c[3]+ey-ny, c[0]-ex-nx,c[1]-ey-ny]); }
      const la = isLnk ? 1 : UNLINKED_ALPHA;
      g.lineStyle(LINE_W + 1.5, 0x000000, la);
      g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
      g.lineStyle(LINE_W, col, la);
      g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
      g.lineStyle(0);
      // Endpoint circles (visual only, matches Wall layer appearance)
      for (const [ix, iy] of [[0,1],[2,3]] as [number,number][]) {
        const a = isLnk ? 1 : UNLINKED_ALPHA;
        g.lineStyle(0); g.beginFill(0x000000, a); g.drawCircle(c[ix], c[iy], r+1); g.endFill();
        g.beginFill(col, a); g.drawCircle(c[ix], c[iy], r); g.endFill();
      }
      addSelectInteraction(g, doc, id, c, () => {
        const tile = (canvas.tiles as unknown as { get(id: string): Tile | undefined }).get(doc.id ?? "");
        if (tile) WallOverlay.show(tile);
      });
      addWallDblClick(g, id);
      ctr.addChild(g);
    }
  }
}
