// PIXI overlay: shows linked walls when tile is selected, with select-mode picking.

import { isPreviewClone, CanvasEnv } from "../core";
import { IsoRenderer, LAYER_KEYS } from "../render";
import { drawWallDisplay, drawWallDrag, drawWallSelect } from "./wall-overlay-ops";

export { WALL_COLORS, wallColor } from "./wall-overlay-ops";

const _tileKeys: Map<string, Set<string>> = new Map();
// Drag-mode renders use "drag-" key prefix and are tracked separately to avoid polluting _tileKeys.
const _dragKeys: Map<string, Set<string>> = new Map();

export class WallOverlay {
  private static selectTile: string | null = null;
  private static altMode = false;
  private static pendingRefresh: Set<string> = new Set();
  private static rafId: number | null = null;

  // ---- TileRenderer interface ----

  static create(_tile: Tile): void {}
  static sync(_tile: Tile): void {}

  static rebuild(tile: Tile): void {
    if (isPreviewClone(tile)) {
      // Draw walls at anchor-computed positions relative to current drag doc.x/y.
      WallOverlay._showDrag(tile);
      return;
    }
    // Non-preview: clear any drag-mode renders, then rebuild static display if active.
    for (const k of _dragKeys.get(tile.id) ?? []) IsoRenderer.clear(k);
    _dragKeys.delete(tile.id);
    if (!_tileKeys.has(tile.id)) return;
    WallOverlay.refresh(tile);
  }

  private static _showDrag(tile: Tile): void {
    for (const k of _dragKeys.get(tile.id) ?? []) IsoRenderer.clear(k);
    // Hide static display renders during drag — map kept so refresh restores them at drop.
    for (const k of _tileKeys.get(tile.id) ?? []) IsoRenderer.clear(k);
    const keys = new Set<string>();
    const doc = tile.document;
    // tile.position.x/y = PIXI container top-left (follows native Foundry drag cursor);
    // adding half-size converts to center, matching the coordinate system used by imageRectAt.
    const pos = (tile as unknown as { position: { x: number; y: number } }).position;
    const cx = pos.x + (doc.width ?? 0) / 2;
    const cy = pos.y + (doc.height ?? 0) / 2;
    drawWallDrag(doc, tile.id, keys, cx, cy);
    _dragKeys.set(tile.id, keys);
  }

  static onControl(tile: Tile, controlled: boolean): void {
    if (controlled) WallOverlay.show(tile);
    else { WallOverlay.selectTile = null; WallOverlay.hide(tile.id); }
  }

  static activate(): void {
    window.addEventListener("keydown", e => { if (e.altKey) WallOverlay.setAltMode(true); });
    window.addEventListener("keyup",   e => { if (!e.altKey) WallOverlay.setAltMode(false); });
  }

  static show(tile: Tile): void {
    WallOverlay.hide(tile.id);
    const keys = new Set<string>();
    const refresh = () => WallOverlay.show(tile);
    if (WallOverlay.selectTile === tile.id) drawWallSelect(tile.document, tile.id, keys, refresh);
    else                                     drawWallDisplay(tile.document, tile.id, keys);
    _tileKeys.set(tile.id, keys);
  }

  static hide(tileId: string): void {
    for (const k of _tileKeys.get(tileId) ?? []) IsoRenderer.clear(k);
    _tileKeys.delete(tileId);
    for (const k of _dragKeys.get(tileId) ?? []) IsoRenderer.clear(k);
    _dragKeys.delete(tileId);
  }

  static clearAll(): void {
    IsoRenderer.clearLayer(LAYER_KEYS.WALL_OVERLAY);
    _tileKeys.clear();
    _dragKeys.clear();
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
