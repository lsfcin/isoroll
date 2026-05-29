// Renders a 3D dashed bounding box on selected tiles via a PIXI overlay layer.
import { MODULE_ID } from "./flags";
import {
  ORANGE, BLACK, DASH_LEN, GAP_LEN,
  ALPHA_FRONT_OUTLINE, ALPHA_FRONT_FILL, ALPHA_BACK_OUTLINE, ALPHA_BACK_FILL,
  P, computeVerts, drawDash,
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

  private static drawAnchorLine(g: PIXI.Graphics, v: ReturnType<typeof computeVerts>): void {
    if (Math.abs(v.elevation) < 0.01) return;
    const dx = v.baseCenter.x - v.ground.x;
    const dy = v.baseCenter.y - v.ground.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 4) return;
    const ux = dx / len, uy = dy / len;
    const gap = 7; // canvas px — leaves space so line doesn't visually overlap circles
    const x1 = v.ground.x + ux * gap,      y1 = v.ground.y + uy * gap;
    const x2 = v.baseCenter.x - ux * gap,  y2 = v.baseCenter.y - uy * gap;
    g.lineStyle(2, BLACK, 0.3);
    g.moveTo(x1, y1); g.lineTo(x2, y2);
    g.lineStyle(1, ORANGE, 0.7);
    g.moveTo(x1, y1); g.lineTo(x2, y2);
  }

  private static draw(g: PIXI.Graphics, tile: Tile): void {
    const v = computeVerts(tile);

    // Image contour drawn first so it appears behind the 3D box lines
    VolumeOverlay.drawImageContour(g, tile);

    // Anchor line: behind box when elevated (+), in front when below ground (-)
    if (v.elevation > 0) VolumeOverlay.drawAnchorLine(g, v);

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

    // Anchor line in front of box when below ground
    if (v.elevation < 0) VolumeOverlay.drawAnchorLine(g, v);
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
