// Renders a 3D dashed bounding box on selected tiles via a PIXI overlay layer.

import { MODULE_ID, VolumeFlags } from "../core";
import type { P, MeshLike } from "../draw";
import { computeVerts, drawGroundShadow, drawBox, drawAnchorLine, drawMeshContour } from "../draw";
import { LayerManager, LAYER_KEYS } from "../render";
import { DEBUG_COORD, drawCoordDebug } from "../transform";

export class VolumeOverlay {
  private static boxes: Map<string, PIXI.Graphics> = new Map();

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
    const g = new PIXI.Graphics();
    g.eventMode = "passive";
    VolumeOverlay.draw(g, tile);
    layer.addChild(g);
    VolumeOverlay.boxes.set(tile.id, g);
    LayerManager.bringToTop(LAYER_KEYS.VOLUME_OVERLAY);
  }

  static hide(tileId: string): void {
    const g = VolumeOverlay.boxes.get(tileId);
    if (!g) return;
    g.parent?.removeChild(g);
    g.destroy();
    VolumeOverlay.boxes.delete(tileId);
  }

  static clearAll(): void {
    for (const id of Array.from(VolumeOverlay.boxes.keys())) VolumeOverlay.hide(id);
    LayerManager.clearLayer(LAYER_KEYS.VOLUME_OVERLAY);
  }

  private static draw(g: PIXI.Graphics, tile: Tile): void {
    const showVol = VolumeFlags.getShowVolumeManipulation(tile.document, true);
    const showImg = VolumeFlags.getShowImageManipulation(tile.document, true);

    // Image contour drawn first so it appears behind the 3D box lines
    if (showImg) drawMeshContour(g, tile.mesh as unknown as MeshLike);

    const v = computeVerts(tile);

    if (showVol) {
      if (VolumeFlags.getShadowEnabled(tile.document)) {
        const gridSize = canvas.grid?.size ?? 100;
        drawGroundShadow(g, v.ground.x, v.ground.y, v.elevation, (gridSize / 2) * VolumeFlags.getShadowRadius(tile.document), VolumeFlags.getShadowOpacity(tile.document), VolumeFlags.getShadowShape(tile.document));
      }
      if (v.elevation > 0) drawAnchorLine(g, v);
      drawBox(g, v);
      if (v.elevation < 0) drawAnchorLine(g, v);
    }

    if (DEBUG_COORD) {
      drawCoordDebug(g, tile, v.baseCenter);
    }
  }

}
