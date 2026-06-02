// PIXI overlay: shows linked walls when tile is selected, with select-mode picking.
import { getLinkedWallIds, wallsLayer } from "./wall-core";
import type { WallDoc } from "./wall-core";
import { addEndpointHandles, addMidHandle, addSelectInteraction } from "./wall-overlay-ops";

// Match Foundry's Wall layer rendering colors exactly
export const WALL_COLORS = {
  normal:    0xFFFFBB,
  terrain:   0x7CFC00,
  invisible: 0x7777EE,
  ethereal:  0x00AAFF,
  sound:     0x00BFFF,
  door:      0xFFCC00,
  secret:    0x81AE2A,
};
const UNLINKED_ALPHA = 0.35;
const LINE_W = 1;  // thin, matching Wall layer

export function wallColor(doc: WallDoc): number {
  if (doc.door === 2) return WALL_COLORS.secret;
  if (doc.door === 1) return WALL_COLORS.door;
  if (doc.move === 2) return WALL_COLORS.ethereal;
  if (doc.sense === 6) return WALL_COLORS.terrain;
  if (doc.sense >= 1) return WALL_COLORS.invisible;
  if (doc.sound >= 1) return WALL_COLORS.sound;
  return WALL_COLORS.normal;
}

export class WallOverlay {
  private static _layer: PIXI.Container | null = null;
  private static _boxes: Map<string, PIXI.Container> = new Map();
  private static _selectTile: string | null = null;

  static activate(): void {
    Hooks.on("canvasReady", () => WallOverlay.clearAll());
    Hooks.on("controlTile", (tile: Tile, controlled: boolean) => {
      if (controlled) WallOverlay.show(tile);
      else { WallOverlay._selectTile = null; WallOverlay.hide(tile.id); }
    });
    Hooks.on("refreshTile", (tile: Tile) => {
      if (WallOverlay._boxes.has(tile.id)) WallOverlay.show(tile);
    });
  }

  static show(tile: Tile): void {
    WallOverlay.hide(tile.id);
    const layer = WallOverlay._ensureLayer();
    const ctr   = new PIXI.Container();
    if (WallOverlay._selectTile === tile.id) {
      ctr.eventMode = "static";
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
    for (const id of getLinkedWallIds(doc)) {
      const wall = wallsLayer().get(id);
      if (!wall) continue;
      const wdoc  = wall.document as WallDoc;
      const c     = wdoc.c;
      const color = wallColor(wdoc);
      const g     = new PIXI.Graphics();
      g.name      = `line-${id}`;
      g.eventMode = "passive";
      g.lineStyle(LINE_W, color, 1);
      g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
      g.lineStyle(0);
      ctr.addChild(g);
      addEndpointHandles(ctr, c, id, doc, color);
      addMidHandle(ctr, (c[0] + c[2]) / 2, (c[1] + c[3]) / 2, id);
    }
  }

  private static _drawSelect(ctr: PIXI.Container, doc: TileDocument): void {
    const linked = new Set(getLinkedWallIds(doc));
    for (const wall of wallsLayer().placeables) {
      const id    = wall.document.id ?? "";
      const wdoc  = wall.document as WallDoc;
      const c     = wdoc.c;
      const isLnk = linked.has(id);
      const col   = wallColor(wdoc);
      const g     = new PIXI.Graphics();
      g.lineStyle(isLnk ? LINE_W + 1 : LINE_W, col, isLnk ? 1 : UNLINKED_ALPHA);
      g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
      g.lineStyle(10, 0x000000, 0.001);
      g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]);
      g.lineStyle(0);
      addSelectInteraction(g, doc, id, c, () => {
        const tile = (canvas.tiles as unknown as { get(id: string): Tile | undefined }).get(doc.id ?? "");
        if (tile) WallOverlay.show(tile);
      });
      ctr.addChild(g);
    }
  }
}
