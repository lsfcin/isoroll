// PIXI overlay: shows linked walls when tile is selected, with select-mode picking.

import { isPreviewClone, CanvasEnv } from "../core";
import { IsoRenderer, LAYER_KEYS } from "../render";
import { drawWallDisplay, drawWallSelect } from "./wall-overlay-ops";

export { WALL_COLORS, wallColor } from "./wall-overlay-ops";

const _tileKeys: Map<string, Set<string>> = new Map();

export class WallOverlay {
  private static selectTile: string | null = null;
  private static altMode = false;
  private static pendingRefresh: Set<string> = new Set();
  private static rafId: number | null = null;

  // ---- TileRenderer interface ----

  static create(_tile: Tile): void {}
  static sync(_tile: Tile): void {}

  static rebuild(tile: Tile): void {
    if (!_tileKeys.has(tile.id)) return;
    if (isPreviewClone(tile)) { WallOverlay.show(tile, true); return; }
    WallOverlay.refresh(tile);
  }

  static onControl(tile: Tile, controlled: boolean): void {
    if (controlled) WallOverlay.show(tile);
    else { WallOverlay.selectTile = null; WallOverlay.hide(tile.id); }
  }

  static activate(): void {
    window.addEventListener("keydown", e => { if (e.altKey) WallOverlay.setAltMode(true); });
    window.addEventListener("keyup",   e => { if (!e.altKey) WallOverlay.setAltMode(false); });
  }

  static show(tile: Tile, isDrag = false): void {
    WallOverlay.hide(tile.id);
    const keys = new Set<string>();
    const refresh = () => WallOverlay.show(tile);
    if (WallOverlay.selectTile === tile.id) drawWallSelect(tile.document, tile.id, keys, refresh);
    else                                     drawWallDisplay(tile.document, tile.id, isDrag, keys);
    _tileKeys.set(tile.id, keys);
  }

  static hide(tileId: string): void {
    for (const k of _tileKeys.get(tileId) ?? []) IsoRenderer.clear(k);
    _tileKeys.delete(tileId);
  }

  static clearAll(): void {
    IsoRenderer.clearLayer(LAYER_KEYS.WALL_OVERLAY);
    _tileKeys.clear();
    WallOverlay.selectTile = null;
  }

  static enterSelect(tile: Tile): void { WallOverlay.selectTile = tile.id; WallOverlay.show(tile); }
  static exitSelect(tile: Tile): void  { WallOverlay.selectTile = null;    WallOverlay.show(tile); }
  static isSelectMode(tileId: string): boolean { return WallOverlay.selectTile === tileId; }

  static showIfActive(tile: Tile): void {
    if (_tileKeys.has(tile.id)) WallOverlay.show(tile);
  }

  static refresh(tile: Tile): void {
    if (!_tileKeys.has(tile.id)) return;
    WallOverlay.pendingRefresh.add(tile.id);
    if (WallOverlay.rafId !== null) return;
    WallOverlay.rafId = requestAnimationFrame(() => {
      WallOverlay.rafId = null;
      for (const id of WallOverlay.pendingRefresh) {
        if (!_tileKeys.has(id)) continue;
        const t = CanvasEnv.getTile(id);
        if (t) WallOverlay.show(t);
      }
      WallOverlay.pendingRefresh.clear();
    });
  }

  private static setAltMode(active: boolean): void {
    if (WallOverlay.altMode === active) return;
    WallOverlay.altMode = active;
    for (const id of [..._tileKeys.keys()]) {
      const tile = CanvasEnv.getTile(id);
      if (tile) WallOverlay.show(tile);
    }
  }
}
