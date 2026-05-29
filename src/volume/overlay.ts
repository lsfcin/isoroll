// Renders a 3D dashed bounding box on selected tiles via a PIXI overlay layer.
import { MODULE_ID } from "./flags";
import {
  ORANGE, BLACK, DASH_LEN, GAP_LEN, ANCHOR_DASH, ANCHOR_GAP,
  ALPHA_FRONT_OUTLINE, ALPHA_FRONT_FILL, ALPHA_BACK_OUTLINE, ALPHA_BACK_FILL,
  P, drawDash, computeVerts,
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
    // DIAGNOSTIC: solid red rect = tile footprint; remove once positioning confirmed
    const tw = tile.document.width ?? 100, th = tile.document.height ?? 100;
    const tx = (tile.document.x ?? 0) - tw / 2, ty = (tile.document.y ?? 0) - th / 2;
    const gs = canvas.grid?.size ?? 100;
    console.log(
      `isoroll | tile: x=${tx} y=${ty} w=${tw} h=${th}` +
      `  grid col=${Math.floor(tx/gs)} row=${Math.floor(ty/gs)} size=${gs}` +
      `  gridUnits: ${Math.round(tw/gs*10)/10}×${Math.round(th/gs*10)/10}`,
    );
    g.lineStyle(2, 0xff0000, 1); g.drawRect(tx, ty, tw, th); g.endFill();

    const v = computeVerts(tile);
    const edges: Array<[P, P, boolean]> = [
      [v.SE_base, v.NE_base, true],  [v.SE_base, v.SW_base, true],
      [v.NW_base, v.NE_base, false], [v.NW_base, v.SW_base, false],
      [v.SW_base, v.SW_top,  true],  [v.SE_base, v.SE_top,  true],
      [v.NW_base, v.NW_top,  false], [v.NE_base, v.NE_top,  false],
      [v.NE_top,  v.SE_top,  true],  [v.SW_top,  v.SE_top,  true],
      [v.SW_top,  v.NW_top,  true],  [v.NE_top,  v.NW_top,  true],
    ];

    for (const [a, b, front] of edges) {
      g.lineStyle(3, BLACK, front ? ALPHA_FRONT_OUTLINE : ALPHA_BACK_OUTLINE);
      drawDash(g, a.x, a.y, b.x, b.y, DASH_LEN, GAP_LEN);
    }
    for (const [a, b, front] of edges) {
      g.lineStyle(1.5, ORANGE, front ? ALPHA_FRONT_FILL : ALPHA_BACK_FILL);
      drawDash(g, a.x, a.y, b.x, b.y, DASH_LEN, GAP_LEN);
    }

    if (Math.abs(v.elevation) > 0.01) {
      const target = v.elevation >= 0 ? v.baseCenter : v.topCenter;
      g.lineStyle(1.5, BLACK, 0.25);
      drawDash(g, v.ground.x, v.ground.y, target.x, target.y, ANCHOR_DASH, ANCHOR_GAP);
      g.lineStyle(1, ORANGE, 0.5);
      drawDash(g, v.ground.x, v.ground.y, target.x, target.y, ANCHOR_DASH, ANCHOR_GAP);
    }

    g.endFill();
  }
}
