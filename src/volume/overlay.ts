// Renders a 3D dashed bounding box on selected tiles via a PIXI overlay layer.
import { MODULE_ID } from "./flags";
import {
  ORANGE, BLACK,
  ALPHA_FRONT_OUTLINE, ALPHA_FRONT_FILL, ALPHA_BACK_OUTLINE, ALPHA_BACK_FILL,
  P, computeVerts,
} from "./overlay-geometry";

export class VolumeOverlay {
  private static layer: PIXI.Container | null = null;
  private static boxes: Map<string, PIXI.Graphics> = new Map();

  static activate(): void {
    Hooks.on("canvasReady",   VolumeOverlay.onCanvasReady);
    Hooks.on("updateScene",   VolumeOverlay.onUpdateScene);
    Hooks.on("controlTile",   VolumeOverlay.onControlTile);
    Hooks.on("refreshTile",   VolumeOverlay.onRefreshTile);
  }

  private static isEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
  }

  private static onCanvasReady(): void { VolumeOverlay.clearAll(); }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    VolumeOverlay.clearAll();
  }

  private static onControlTile(tile: Tile, controlled: boolean): void {
    if (!VolumeOverlay.isEnabled()) return;
    if (controlled) VolumeOverlay.show(tile);
    else VolumeOverlay.hide(tile.id);
  }

  private static onRefreshTile(tile: Tile): void {
    if (!VolumeOverlay.isEnabled()) return;
    if (!VolumeOverlay.boxes.has(tile.id)) return;
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
    const v = computeVerts(tile);

    // back=true for the 3 edges meeting at the NE corner (far/hidden from SE camera)
    const edges: Array<[P, P, boolean]> = [
      [v.SE_base, v.NE_base, true],   // base right  — SE→NE  (back: touches NE)
      [v.SE_base, v.SW_base, false],  // base bottom — SE→SW
      [v.NW_base, v.NE_base, true],   // base top    — NW→NE  (back: touches NE)
      [v.NW_base, v.SW_base, false],  // base left   — NW→SW
      [v.SW_base, v.SW_top,  false],  // vert SW
      [v.SE_base, v.SE_top,  false],  // vert SE
      [v.NW_base, v.NW_top,  false],  // vert NW
      [v.NE_base, v.NE_top,  true],   // vert NE     (back: is NE)
      [v.NE_top,  v.SE_top,  false],  // top right   — NE→SE
      [v.SW_top,  v.SE_top,  false],  // top bottom  — SW→SE
      [v.SW_top,  v.NW_top,  false],  // top left    — SW→NW
      [v.NE_top,  v.NW_top,  false],  // top top     — NE→NW
    ];

    // Two-pass solid lines: thin black outline first, thin orange on top
    for (const [a, b, back] of edges) {
      g.lineStyle(2, BLACK, back ? ALPHA_BACK_OUTLINE : ALPHA_FRONT_OUTLINE);
      g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
    }
    for (const [a, b, back] of edges) {
      g.lineStyle(1, ORANGE, back ? ALPHA_BACK_FILL : ALPHA_FRONT_FILL);
      g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
    }

    g.endFill();

    // DEBUG: 8 colored circles at each box corner for reference
    const corners: Array<[P, number, string]> = [
      [v.NW_base, 0xff0000, "NW_base"],
      [v.NE_base, 0xff8800, "NE_base"],
      [v.SW_base, 0xffff00, "SW_base"],
      [v.SE_base, 0x00ff00, "SE_base"],
      [v.NW_top,  0x00ffff, "NW_top"],
      [v.NE_top,  0x0088ff, "NE_top"],
      [v.SW_top,  0x9900ff, "SW_top"],
      [v.SE_top,  0xff00ff, "SE_top"],
    ];
    for (const [pt, color] of corners) {
      g.lineStyle(0);
      g.beginFill(color, 1);
      g.drawCircle(pt.x, pt.y, 4);
      g.endFill();
    }
  }
}
