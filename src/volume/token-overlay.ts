// White dashed image contour drawn on selected tokens.
import { MODULE_ID, VolumeFlags } from "./flags";
import { BLACK, DASH_LEN, GAP_LEN, drawDash } from "./overlay-geometry";

export class TokenOverlay {
  private static layer: PIXI.Container | null = null;
  private static boxes: Map<string, PIXI.Graphics> = new Map();

  static activate(): void {
    Hooks.on("canvasReady",  TokenOverlay.onCanvasReady);
    Hooks.on("updateScene",  TokenOverlay.onUpdateScene);
    Hooks.on("controlToken", TokenOverlay.onControlToken);
    Hooks.on("refreshToken", TokenOverlay.onRefreshToken);
  }

  private static isEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
  }

  private static onCanvasReady(): void { TokenOverlay.clearAll(); }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    TokenOverlay.clearAll();
  }

  private static onControlToken(token: Token, controlled: boolean): void {
    if (!TokenOverlay.isEnabled()) return;
    if (controlled) TokenOverlay.show(token);
    else TokenOverlay.hide(token.id);
  }

  private static onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
    if (!TokenOverlay.isEnabled()) return;
    if (!TokenOverlay.boxes.has(token.id)) return;
    if (flags?.["refreshMesh"] && !flags?.["refreshPosition"]) return;
    TokenOverlay.show(token);
  }

  static show(token: Token): void {
    TokenOverlay.hide(token.id);
    if (!VolumeFlags.getShowImageManipulation(token.document, true)) return;
    const layer = TokenOverlay.ensureLayer();
    const g = new PIXI.Graphics();
    g.eventMode = "passive";
    TokenOverlay.drawContour(g, token);
    layer.addChild(g);
    TokenOverlay.boxes.set(token.id, g);
    TokenOverlay.bringToTop();
  }

  static hide(tokenId: string): void {
    const g = TokenOverlay.boxes.get(tokenId);
    if (!g) return;
    TokenOverlay.layer?.removeChild(g);
    g.destroy();
    TokenOverlay.boxes.delete(tokenId);
  }

  static clearAll(): void {
    for (const id of Array.from(TokenOverlay.boxes.keys())) TokenOverlay.hide(id);
    if (TokenOverlay.layer) {
      try { (canvas.stage as unknown as PIXI.Container).removeChild(TokenOverlay.layer!); } catch { /* ok */ }
      TokenOverlay.layer.destroy({ children: true });
      TokenOverlay.layer = null;
    }
  }

  private static ensureLayer(): PIXI.Container {
    if (TokenOverlay.layer && !TokenOverlay.layer.parent) TokenOverlay.layer = null;
    if (TokenOverlay.layer) return TokenOverlay.layer;
    const layer = new PIXI.Container();
    layer.eventMode = "passive";
    (canvas.stage as unknown as PIXI.Container).addChild(layer);
    TokenOverlay.layer = layer;
    return layer;
  }

  private static bringToTop(): void {
    if (TokenOverlay.layer && !TokenOverlay.layer.parent) TokenOverlay.layer = null;
    if (!TokenOverlay.layer) return;
    const stage = canvas.stage as unknown as PIXI.Container;
    try { stage.removeChild(TokenOverlay.layer); } catch { /* ok */ }
    stage.addChild(TokenOverlay.layer);
  }

  private static drawContour(g: PIXI.Graphics, token: Token): void {
    type M = {
      x: number; y: number; rotation: number;
      scale: { x: number; y: number };
      texture?: { width: number; height: number };
      anchor?: { x: number; y: number };
    };
    const mesh = token.mesh as unknown as M | null | undefined;
    if (!mesh?.texture) return;
    const texW = mesh.texture.width, texH = mesh.texture.height;
    const ax = mesh.anchor?.x ?? 0.5, ay = mesh.anchor?.y ?? 0.5;
    const sx = mesh.scale.x, sy = mesh.scale.y;
    const cr = Math.cos(mesh.rotation), sr = Math.sin(mesh.rotation);
    const local = [
      { x: -ax * texW,      y: -ay * texH      },
      { x: (1-ax) * texW,   y: -ay * texH      },
      { x: (1-ax) * texW,   y: (1-ay) * texH   },
      { x: -ax * texW,      y: (1-ay) * texH   },
    ];
    const pts = local.map(c => ({
      x: mesh.x + cr*(c.x*sx) - sr*(c.y*sy),
      y: mesh.y + sr*(c.x*sx) + cr*(c.y*sy),
    }));
    const wt = (canvas.app as unknown as { stage: { worldTransform: { a: number; b: number; c: number; d: number } } }).stage.worldTransform;
    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[(i+1)%4];
      const dx = b.x-a.x, dy = b.y-a.y;
      const canLen = Math.sqrt(dx*dx + dy*dy);
      const scrLen = Math.sqrt((wt.a*dx + wt.c*dy)**2 + (wt.b*dx + wt.d*dy)**2);
      const s = scrLen > 0 ? canLen / scrLen : 1;
      g.lineStyle(1.5, BLACK, 0.4);  drawDash(g, a.x, a.y, b.x, b.y, DASH_LEN*s, GAP_LEN*s);
      g.lineStyle(1, 0xffffff, 0.9); drawDash(g, a.x, a.y, b.x, b.y, DASH_LEN*s, GAP_LEN*s);
    }
  }
}
