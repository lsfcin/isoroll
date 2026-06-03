// Renders a 3D dashed bounding box on selected tiles via a PIXI overlay layer.
import { VolumeFlags } from "./flags";
import {
  BLACK, DASH_LEN, GAP_LEN,
  P, computeVerts, drawDash, drawBox, drawAnchorLine,
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
    if (showImg) VolumeOverlay.drawImageContour(g, tile);

    if (showVol) {
      const v = computeVerts(tile);
      if (v.elevation > 0) drawAnchorLine(g, v);
      drawBox(g, v);
      if (v.elevation < 0) drawAnchorLine(g, v);
    }
  }

  private static drawImageContour(g: PIXI.Graphics, tile: Tile): void {
    type M = {
      x: number; y: number; rotation: number;
      scale: { x: number; y: number };
      texture?: { width: number; height: number };
      anchor?: { x: number; y: number };
    };
    const mesh = tile.mesh as unknown as M | null | undefined;
    if (!mesh?.texture) return;

    const texW = mesh.texture.width, texH = mesh.texture.height;
    const ax = mesh.anchor?.x ?? 0.5, ay = mesh.anchor?.y ?? 0.5;
    const sx = mesh.scale.x, sy = mesh.scale.y;
    const cr = Math.cos(mesh.rotation), sr = Math.sin(mesh.rotation);

    // Four corners in mesh local space (relative to anchor), scaled then rotated into canvas space
    const local = [
      { x: -ax * texW,       y: -ay * texH      },
      { x: (1-ax) * texW,    y: -ay * texH      },
      { x: (1-ax) * texW,    y: (1-ay) * texH   },
      { x: -ax * texW,       y: (1-ay) * texH   },
    ];
    const pts = local.map(c => ({
      x: mesh.x + cr * (c.x * sx) - sr * (c.y * sy),
      y: mesh.y + sr * (c.x * sx) + cr * (c.y * sy),
    }));

    // Adapt dash length per edge so dashes are uniform in screen pixels across all directions
    const wt = (canvas.app as unknown as { stage: { worldTransform: { a: number; b: number; c: number; d: number } } }).stage.worldTransform;
    const screenAdapt = (dx: number, dy: number): number => {
      const canLen = Math.sqrt(dx * dx + dy * dy);
      const scrLen = Math.sqrt((wt.a*dx + wt.c*dy) ** 2 + (wt.b*dx + wt.d*dy) ** 2);
      return scrLen > 0 ? canLen / scrLen : 1;
    };

    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[(i + 1) % 4];
      const s = screenAdapt(b.x - a.x, b.y - a.y);
      g.lineStyle(1.5, BLACK, 0.4);   drawDash(g, a.x, a.y, b.x, b.y, DASH_LEN * s, GAP_LEN * s);
      g.lineStyle(1,   0xffffff, 0.9); drawDash(g, a.x, a.y, b.x, b.y, DASH_LEN * s, GAP_LEN * s);
    }
  }
}
