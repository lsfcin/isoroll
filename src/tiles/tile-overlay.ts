// Renders a 3D bounding box on selected tiles (VOLUME_OVERLAY) + always-on shadow (TILE_SHADOW).

import { MODULE_ID, VolumeFlags, CanvasEnv } from "../core";
import { drawGroundShadow, drawBox, drawAnchorLine, drawMeshContour } from "../draw";
import { LayerManager, LAYER_KEYS, IsoGeometry, MeshAccessor, IsoRenderer } from "../render";
import type { DrawAPI, RenderHandle } from "../render";
import { DEBUG_COORD, drawCoordDebug } from "../transform";

export class VolumeOverlay {
  private static _handles:    Map<string, RenderHandle>      = new Map();
  private static shadows:     Map<string, PIXI.DisplayObject> = new Map();
  private static shadowState: Map<string, string>             = new Map();

  // ---- TileRenderer interface ----

  static create(tile: Tile): void {
    if (tile.document.getFlag(MODULE_ID, "transformTile") === true) return;
    VolumeOverlay.showShadow(tile);
  }

  static sync(_tile: Tile): void { /* shadow is doc-data driven, not mesh-tracked per-frame */ }

  static rebuild(tile: Tile): void {
    // Force re-render if the shadow sprite was orphaned (its layer was cleared externally)
    const existing = VolumeOverlay.shadows.get(tile.id);
    if (existing && !existing.parent) VolumeOverlay.shadowState.delete(tile.id);
    const snap = VolumeOverlay.shadowSnap(tile);
    if (VolumeOverlay.shadowState.get(tile.id) !== snap) VolumeOverlay.showShadow(tile);
    if (VolumeOverlay._handles.has(tile.id)) VolumeOverlay.show(tile);
  }

  static onControl(tile: Tile, controlled: boolean): void {
    if (controlled) VolumeOverlay.show(tile);
    else VolumeOverlay.removeBox(tile.id);
  }

  static onDestroy(id: string): void { VolumeOverlay.hide(id); }

  // ---- PIXI helpers ----

  private static shadowSnap(tile: Tile): string {
    const d = tile.document;
    return `${d.x},${d.y},${d.width},${d.height},${(d as unknown as {elevation?:number}).elevation??0},${+VolumeFlags.getShadowEnabled(d,false)},${VolumeFlags.getShadowShape(d,"rect")},${VolumeFlags.getShadowRadius(d)},${VolumeFlags.getShadowOpacity(d,0.5)}`;
  }

  private static showShadow(tile: Tile): void {
    VolumeOverlay.hideShadow(tile.id);
    const snap = VolumeOverlay.shadowSnap(tile);
    VolumeOverlay.shadowState.set(tile.id, snap);
    const d = tile.document;
    if (!VolumeFlags.getShadowEnabled(d, false)) return;
    const v  = IsoGeometry.tileVerts(tile);
    const rx = (d.width  ?? 0) / 2 * VolumeFlags.getShadowRadius(d);
    const ry = (d.height ?? 0) / 2 * VolumeFlags.getShadowRadius(d);
    const s  = drawGroundShadow(v.ground.x, v.ground.y, v.elevation, rx, ry, VolumeFlags.getShadowOpacity(d, 0.5), VolumeFlags.getShadowShape(d, "rect"));
    if (s) { LayerManager.ensureLayer(LAYER_KEYS.TILE_SHADOW).addChild(s); VolumeOverlay.shadows.set(tile.id, s); }
  }

  private static hideShadow(id: string): void {
    const s = VolumeOverlay.shadows.get(id);
    if (s) { s.parent?.removeChild(s); (s as PIXI.Container).destroy?.(); VolumeOverlay.shadows.delete(id); }
    VolumeOverlay.shadowState.delete(id);
  }

  private static removeBox(tileId: string): void {
    VolumeOverlay._handles.get(tileId)?.remove();
    VolumeOverlay._handles.delete(tileId);
  }

  static show(tile: Tile): void {
    const handle = IsoRenderer.render({
      key:       `tile-${tile.id}:box`,
      owner:     { kind: "tile", id: tile.id },
      visual:    { kind: "lines", build: (g) => VolumeOverlay._drawInto(g, tile) },
      space:     "WORLD",
      placement: { anchor: { x: 0, y: 0 } },
      layer:     LAYER_KEYS.TILE_OVERLAY,
      z:         "top",
    });
    VolumeOverlay._handles.set(tile.id, handle);
  }

  // Full cleanup — hides both box and shadow (used by gate for disabled/transformed tiles).
  static hide(tileId: string): void {
    VolumeOverlay.removeBox(tileId);
    VolumeOverlay.hideShadow(tileId);
  }

  static clearAll(): void {
    IsoRenderer.clearLayer(LAYER_KEYS.TILE_OVERLAY);
    VolumeOverlay._handles.clear();
    for (const id of Array.from(VolumeOverlay.shadows.keys())) VolumeOverlay.hideShadow(id);
  }

  private static _drawInto(g: DrawAPI, tile: Tile): void {
    const showVol = VolumeFlags.getShowVolumeManipulation(tile.document, true);
    const showImg = VolumeFlags.getShowImageManipulation(tile.document, true);
    const v = IsoGeometry.tileVerts(tile);
    if (showImg) drawMeshContour(g, MeshAccessor.geometryOf(tile), CanvasEnv.worldTransform());
    if (showVol) {
      if (v.elevation > 0) drawAnchorLine(g, v);
      drawBox(g, v);
      if (v.elevation < 0) drawAnchorLine(g, v);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (DEBUG_COORD) drawCoordDebug(g as any, tile, v.baseCenter);
  }
}
