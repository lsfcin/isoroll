// PIXI overlay: shows linked walls when tile is selected, with select-mode picking.
import { getLinkedWallIds, wallsLayer } from "./wall-core";
import type { WallDoc } from "./wall-core";
import { addEndpointHandles, addLineHover, addSelectInteraction, hideWallHud } from "./wall-overlay-ops";

// Colors matching Foundry's Wall layer rendering exactly
export const WALL_COLORS = {
  normal:    0xFFFFBB,  // cream yellow
  terrain:   0x81B90C,  // olive green
  invisible: 0x77E7E8,  // cyan (sight passes)
  ethereal:  0xC880FC,  // purple (movement passes)
  sound:     0x00BFFF,  // sky blue (sound-only)
  door:      0x6666EE,  // blue
  secret:    0xA612D4,  // dark purple (secret door)
  window:    0xC7D8FF,  // pale blue (limited sight)
};
const UNLINKED_ALPHA = 0.7;
const LINE_W = 1;

export function wallColor(doc: WallDoc): number {
  if (doc.door === 2) return WALL_COLORS.secret;
  if (doc.door === 1) return WALL_COLORS.door;
  // Ethereal: movement passes through (v14: move=20, older: move=2)
  if ((doc.move ?? 0) > 1) return WALL_COLORS.ethereal;
  const s = doc.sense ?? 0;
  // Terrain: DISTANCE=40/PROXIMITY=30 (v14) or TERRAIN=3/6 (older)
  if (s >= 30 || s === 6 || s === 3) return WALL_COLORS.terrain;
  // Window: LIMITED=10 (v14) or LIMITED=1 (older)
  if (s === 10 || s === 1) return WALL_COLORS.window;
  // Any other non-zero sight value: sight passes (invisible walls)
  if (s > 1) return WALL_COLORS.invisible;
  if ((doc.sound ?? 0) > 0) return WALL_COLORS.sound;
  return WALL_COLORS.normal;
}

export class WallOverlay {
  private static _layer: PIXI.Container | null = null;
  private static _boxes: Map<string, PIXI.Container> = new Map();
  private static _selectTile: string | null = null;
  private static _altMode = false;

  static activate(): void {
    Hooks.on("canvasReady", () => WallOverlay.clearAll());
    Hooks.on("controlTile", (tile: Tile, controlled: boolean) => {
      if (controlled) WallOverlay.show(tile);
      else { WallOverlay._selectTile = null; hideWallHud(); WallOverlay.hide(tile.id); }
    });
    window.addEventListener("keydown", e => { if (e.altKey) WallOverlay._setAltMode(true); });
    window.addEventListener("keyup",   e => { if (!e.altKey) WallOverlay._setAltMode(false); });
  }

  static show(tile: Tile): void {
    WallOverlay.hide(tile.id);
    const layer = WallOverlay._ensureLayer();
    const ctr   = new PIXI.Container();
    if (WallOverlay._selectTile === tile.id) {
      ctr.eventMode = "auto";
      WallOverlay._drawSelect(ctr, tile.document);
    } else {
      ctr.eventMode = "auto";
      WallOverlay._drawDisplay(ctr, tile.document);
    }
    layer.addChild(ctr);
    WallOverlay._boxes.set(tile.id, ctr);
    WallOverlay._bringToTop();
  }

  static hide(tileId: string): void {
    const ctr = WallOverlay._boxes.get(tileId);
    if (!ctr) return;
    WallOverlay._layer?.removeChild(ctr);
    ctr.destroy({ children: true });
    WallOverlay._boxes.delete(tileId);
  }

  static clearAll(): void {
    for (const id of [...WallOverlay._boxes.keys()]) WallOverlay.hide(id);
    WallOverlay._selectTile = null;
    hideWallHud();
    if (WallOverlay._layer) {
      try { (canvas.stage as unknown as PIXI.Container).removeChild(WallOverlay._layer); } catch { /* ok */ }
      WallOverlay._layer.destroy({ children: true });
      WallOverlay._layer = null;
    }
  }

  static enterSelect(tile: Tile): void { WallOverlay._selectTile = tile.id; WallOverlay.show(tile); }
  static exitSelect(tile: Tile): void  { WallOverlay._selectTile = null;    WallOverlay.show(tile); }
  static isSelectMode(tileId: string): boolean { return WallOverlay._selectTile === tileId; }
  static refresh(tile: Tile): void { if (WallOverlay._boxes.has(tile.id)) WallOverlay.show(tile); }

  private static _setAltMode(active: boolean): void {
    if (WallOverlay._altMode === active) return;
    WallOverlay._altMode = active;
    for (const [id] of WallOverlay._boxes) {
      const tile = (canvas.tiles as unknown as { get(id: string): Tile | undefined }).get(id);
      if (tile) WallOverlay.show(tile);
    }
  }

  private static _ensureLayer(): PIXI.Container {
    if (WallOverlay._layer && !WallOverlay._layer.parent) WallOverlay._layer = null;
    if (!WallOverlay._layer) {
      const l = new PIXI.Container();
      l.eventMode = "passive";
      (canvas.stage as unknown as PIXI.Container).addChild(l);
      WallOverlay._layer = l;
    }
    return WallOverlay._layer;
  }

  private static _bringToTop(): void {
    const l = WallOverlay._layer;
    if (!l) return;
    const s = canvas.stage as unknown as PIXI.Container;
    try { s.removeChild(l); } catch { /* ok */ }
    s.addChild(l);
  }

  private static _drawDisplay(ctr: PIXI.Container, doc: TileDocument): void {
    const r = WallOverlay._altMode ? 3 : 2;
    for (const id of getLinkedWallIds(doc)) {
      const wall = wallsLayer().get(id);
      if (!wall) continue;
      const wdoc  = wall.document as WallDoc;
      const c     = wdoc.c;
      const color = wallColor(wdoc);
      const g     = new PIXI.Graphics();
      g.name      = `line-${id}`;
      g.eventMode = "auto";
      g.lineStyle(LINE_W, color, 1);
      g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
      g.lineStyle(0);
      ctr.addChild(g);
      addEndpointHandles(ctr, c, id, doc, color, r);
      addLineHover(g, id, (c[0] + c[2]) / 2, (c[1] + c[3]) / 2);
    }
  }

  private static _drawSelect(ctr: PIXI.Container, doc: TileDocument): void {
    const linked = new Set(getLinkedWallIds(doc));
    const r      = WallOverlay._altMode ? 3 : 2;
    for (const wall of wallsLayer().placeables) {
      const id    = wall.document.id ?? "";
      const wdoc  = wall.document as WallDoc;
      const c     = wdoc.c;
      const isLnk = linked.has(id);
      const col   = wallColor(wdoc);
      const g     = new PIXI.Graphics();
      // Wall line
      g.lineStyle(isLnk ? LINE_W + 1 : LINE_W, col, isLnk ? 1 : UNLINKED_ALPHA);
      g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
      // Wide invisible hit area
      g.lineStyle(16, 0x000000, 0.001);
      g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
      g.lineStyle(0);
      // Endpoint circles (visual only, matches Wall layer appearance)
      for (const [ix, iy] of [[0,1],[2,3]] as [number,number][]) {
        g.lineStyle(0.5, 0x000000, 0.6);
        g.beginFill(col, isLnk ? 1 : UNLINKED_ALPHA);
        g.drawCircle(c[ix], c[iy], r);
        g.endFill();
        g.lineStyle(0);
      }
      addSelectInteraction(g, doc, id, c, () => {
        const tile = (canvas.tiles as unknown as { get(id: string): Tile | undefined }).get(doc.id ?? "");
        if (tile) WallOverlay.show(tile);
      });
      ctr.addChild(g);
    }
  }
}
