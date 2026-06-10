// Renders a 3D dashed bounding box on selected tiles via a PIXI overlay layer.

import { MODULE_ID, VolumeFlags } from "../core";
import type { MeshLike } from "../draw";
import { computeVerts, drawGroundShadow, drawBox, drawAnchorLine, drawMeshContour } from "../draw";
import { LayerManager, LAYER_KEYS } from "../render";
import { DEBUG_COORD, drawCoordDebug } from "../transform";

export class VolumeOverlay {
  private static boxes: Map<string, PIXI.Container> = new Map();

  static activate(): void {
    Hooks.on("canvasReady",   VolumeOverlay.onCanvasReady);
    Hooks.on("updateScene",   VolumeOverlay.onUpdateScene);
    Hooks.on("controlTile",   VolumeOverlay.onControlTile);
    Hooks.on("refreshTile",   VolumeOverlay.onRefreshTile);
  }

  private static onCanvasReady(): void { VolumeOverlay.clearAll(); }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    VolumeOverlay.clearAll();
  }

  private static onControlTile(tile: Tile, controlled: boolean): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (controlled && tile.document.getFlag(MODULE_ID, "transformTile") !== true) VolumeOverlay.show(tile);
    else VolumeOverlay.hide(tile.id);
  }

  private static onRefreshTile(tile: Tile): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (tile.document.getFlag(MODULE_ID, "transformTile") === true) { VolumeOverlay.hide(tile.id); return; }
    if (!VolumeOverlay.boxes.has(tile.id)) return;
    // Skip while drag-preview clone exists: server update fires refreshState on the original
    // tile (old doc position) before the clone is cleared, causing a 1-frame blink.
    if ((tile as unknown as { hasPreview?: boolean }).hasPreview) return;
    VolumeOverlay.show(tile);
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
    LayerManager.clearLayer(LAYER_KEYS.VOLUME_OVERLAY);
  }

  private static draw(c: PIXI.Container, tile: Tile): void {
    const showVol = VolumeFlags.getShowVolumeManipulation(tile.document, true);
    const showImg = VolumeFlags.getShowImageManipulation(tile.document, true);
    const v = computeVerts(tile);

    if (showVol && VolumeFlags.getShadowEnabled(tile.document)) {
      const gridSize = canvas.grid?.size ?? 100;
      const shadow = drawGroundShadow(v.ground.x, v.ground.y, v.elevation, (gridSize / 2) * VolumeFlags.getShadowRadius(tile.document), VolumeFlags.getShadowOpacity(tile.document), VolumeFlags.getShadowShape(tile.document));
      if (shadow) c.addChild(shadow);
    }

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
