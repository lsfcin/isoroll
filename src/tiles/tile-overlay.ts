// Renders a 3D bounding box on selected tiles (VOLUME_OVERLAY) + always-on shadow (TOKEN_SHADOW).

import { MODULE_ID, VolumeFlags } from "../core";
import type { MeshLike } from "../draw";
import { computeVerts, drawGroundShadow, drawBox, drawAnchorLine, drawMeshContour } from "../draw";
import { LayerManager, LAYER_KEYS } from "../render";
import { DEBUG_COORD, drawCoordDebug } from "../transform";

export class VolumeOverlay {
  private static boxes:       Map<string, PIXI.Container>    = new Map();
  private static shadows:     Map<string, PIXI.DisplayObject> = new Map();
  private static shadowState: Map<string, string>             = new Map();

  static activate(): void {
    Hooks.on("canvasReady",   VolumeOverlay.onCanvasReady);
    Hooks.on("updateScene",   VolumeOverlay.onUpdateScene);
    Hooks.on("drawTile",      VolumeOverlay.onDrawTile);
    Hooks.on("controlTile",   VolumeOverlay.onControlTile);
    Hooks.on("refreshTile",   VolumeOverlay.onRefreshTile);
  }

  private static onCanvasReady(): void {
    VolumeOverlay.clearAll();
    if (!VolumeFlags.isSceneEnabled()) return;
    for (const tile of (canvas.tiles?.placeables ?? []) as Tile[]) {
      if (tile.document.getFlag(MODULE_ID, "transformTile") === true) continue;
      VolumeOverlay.showShadow(tile);
    }
  }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    VolumeOverlay.clearAll();
  }

  private static onDrawTile(tile: Tile): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (tile.document.getFlag(MODULE_ID, "transformTile") === true) return;
    VolumeOverlay.showShadow(tile);
  }

  private static onControlTile(tile: Tile, controlled: boolean): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (controlled && tile.document.getFlag(MODULE_ID, "transformTile") !== true) VolumeOverlay.show(tile);
    else VolumeOverlay.hide(tile.id);
  }

  private static onRefreshTile(tile: Tile): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (tile.document.getFlag(MODULE_ID, "transformTile") === true) { VolumeOverlay.hide(tile.id); VolumeOverlay.hideShadow(tile.id); return; }
    // Shadow always-on: redraw when state changed
    const snap = VolumeOverlay.shadowSnap(tile);
    if (VolumeOverlay.shadowState.get(tile.id) !== snap) VolumeOverlay.showShadow(tile);
    // Box overlay selected-only
    if (!VolumeOverlay.boxes.has(tile.id)) return;
    if ((tile as unknown as { hasPreview?: boolean }).hasPreview) return;
    VolumeOverlay.show(tile);
  }

  private static shadowSnap(tile: Tile): string {
    const d = tile.document;
    return `${d.x},${d.y},${d.width},${d.height},${(d as unknown as {elevation?:number}).elevation??0},${+VolumeFlags.getShadowEnabled(d)},${VolumeFlags.getShadowShape(d)},${VolumeFlags.getShadowRadius(d)},${VolumeFlags.getShadowOpacity(d)}`;
  }

  private static showShadow(tile: Tile): void {
    VolumeOverlay.hideShadow(tile.id);
    const snap = VolumeOverlay.shadowSnap(tile);
    VolumeOverlay.shadowState.set(tile.id, snap);
    const d = tile.document;
    if (!VolumeFlags.getShadowEnabled(d)) return;
    const v  = computeVerts(tile);
    const rx = (d.width  ?? 0) / 2 * VolumeFlags.getShadowRadius(d);
    const ry = (d.height ?? 0) / 2 * VolumeFlags.getShadowRadius(d);
    const s  = drawGroundShadow(v.ground.x, v.ground.y, v.elevation, rx, ry, VolumeFlags.getShadowOpacity(d), VolumeFlags.getShadowShape(d));
    if (s) { LayerManager.ensureLayer(LAYER_KEYS.TOKEN_SHADOW).addChild(s); VolumeOverlay.shadows.set(tile.id, s); }
  }

  private static hideShadow(id: string): void {
    const s = VolumeOverlay.shadows.get(id);
    if (s) { s.parent?.removeChild(s); (s as PIXI.Container).destroy?.(); VolumeOverlay.shadows.delete(id); }
    VolumeOverlay.shadowState.delete(id);
  }

  static show(tile: Tile): void {
    VolumeOverlay.hide(tile.id);
    const layer = LayerManager.ensureLayer(LAYER_KEYS.VOLUME_OVERLAY);
    const c = new PIXI.Container();
    c.eventMode = "passive";
    VolumeOverlay.draw(c, tile);
    layer.addChild(c);
    VolumeOverlay.boxes.set(tile.id, c);
    LayerManager.bringToTop(LAYER_KEYS.VOLUME_OVERLAY);
  }

  static hide(tileId: string): void {
    const c = VolumeOverlay.boxes.get(tileId);
    if (!c) return;
    c.parent?.removeChild(c);
    c.destroy({ children: true });
    VolumeOverlay.boxes.delete(tileId);
  }

  static clearAll(): void {
    for (const id of Array.from(VolumeOverlay.boxes.keys())) VolumeOverlay.hide(id);
    for (const id of Array.from(VolumeOverlay.shadows.keys())) VolumeOverlay.hideShadow(id);
    LayerManager.clearLayer(LAYER_KEYS.VOLUME_OVERLAY);
  }

  private static draw(c: PIXI.Container, tile: Tile): void {
    const showVol = VolumeFlags.getShowVolumeManipulation(tile.document, true);
    const showImg = VolumeFlags.getShowImageManipulation(tile.document, true);
    const v = computeVerts(tile);
    const g = new PIXI.Graphics();
    g.eventMode = "none";
    if (showImg) drawMeshContour(g, tile.mesh as unknown as MeshLike);
    if (showVol) {
      if (v.elevation > 0) drawAnchorLine(g, v);
      drawBox(g, v);
      if (v.elevation < 0) drawAnchorLine(g, v);
    }
    if (DEBUG_COORD) drawCoordDebug(g, tile, v.baseCenter);
    c.addChild(g);
  }

}
