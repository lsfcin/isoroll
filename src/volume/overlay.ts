// Renders a 3D dashed bounding box on selected tiles via a PIXI overlay layer.
import { VolumeFlags } from "./flags";
import { P, computeVerts, drawBox, drawAnchorLine } from "./overlay-geometry";
import { drawMeshContour, MeshLike } from "../draw/contour";

export class VolumeOverlay {
  private static layer: PIXI.Container | null = null;
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
    if (controlled) VolumeOverlay.show(tile);
    else VolumeOverlay.hide(tile.id);
  }

  private static onRefreshTile(tile: Tile): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (!VolumeOverlay.boxes.has(tile.id)) return;
    // Skip while drag-preview clone exists: server update fires refreshState on the original
    // tile (old doc position) before the clone is cleared, causing a 1-frame blink.
    if ((tile as unknown as { hasPreview?: boolean }).hasPreview) return;
    VolumeOverlay.show(tile);
  }

  static show(tile: Tile): void {
    VolumeOverlay.hide(tile.id);
    const layer = VolumeOverlay.ensureLayer();
    const g = new PIXI.Graphics();
    g.eventMode = "passive";
    VolumeOverlay.draw(g, tile);
    layer.addChild(g);
    VolumeOverlay.boxes.set(tile.id, g);
    VolumeOverlay.bringToTop();
  }

  static hide(tileId: string): void {
    const g = VolumeOverlay.boxes.get(tileId);
    if (!g) return;
    VolumeOverlay.layer?.removeChild(g);
    g.destroy();
    VolumeOverlay.boxes.delete(tileId);
  }

  static clearAll(): void {
    for (const id of Array.from(VolumeOverlay.boxes.keys())) VolumeOverlay.hide(id);
    if (VolumeOverlay.layer) {
      try { (canvas.stage as unknown as PIXI.Container).removeChild(VolumeOverlay.layer!); } catch { /* ok */ }
      VolumeOverlay.layer.destroy({ children: true });
      VolumeOverlay.layer = null;
    }
  }

  private static getLayer(): PIXI.Container | null {
    if (VolumeOverlay.layer && !VolumeOverlay.layer.parent) VolumeOverlay.layer = null;
    return VolumeOverlay.layer;
  }

  private static ensureLayer(): PIXI.Container {
    const existing = VolumeOverlay.getLayer();
    if (existing) return existing;
    const layer = new PIXI.Container();
    layer.eventMode = "passive";
    (canvas.stage as unknown as PIXI.Container).addChild(layer);
    VolumeOverlay.layer = layer;
    return layer;
  }

  private static bringToTop(): void {
    const layer = VolumeOverlay.getLayer();
    if (!layer) return;
    const stage = canvas.stage as unknown as PIXI.Container;
    if (!stage) return;
    try { stage.removeChild(layer); } catch { /* ok */ }
    stage.addChild(layer);
  }

  private static draw(g: PIXI.Graphics, tile: Tile): void {
    const showVol = VolumeFlags.getShowVolumeManipulation(tile.document, true);
    const showImg = VolumeFlags.getShowImageManipulation(tile.document, true);

    // Image contour drawn first so it appears behind the 3D box lines
    if (showImg) drawMeshContour(g, tile.mesh as unknown as MeshLike);

    if (showVol) {
      const v = computeVerts(tile);
      if (v.elevation > 0) drawAnchorLine(g, v);
      drawBox(g, v);
      if (v.elevation < 0) drawAnchorLine(g, v);
    }
  }

}
