// White dashed image contour drawn on selected tokens.
import { VolumeFlags } from "./flags";
import { drawMeshContour, MeshLike } from "../draw/contour";

export class TokenOverlay {
  private static layer: PIXI.Container | null = null;
  private static boxes: Map<string, PIXI.Graphics> = new Map();

  static activate(): void {
    Hooks.on("canvasReady",  TokenOverlay.onCanvasReady);
    Hooks.on("updateScene",  TokenOverlay.onUpdateScene);
    Hooks.on("controlToken", TokenOverlay.onControlToken);
    Hooks.on("refreshToken", TokenOverlay.onRefreshToken);
  }

  private static onCanvasReady(): void { TokenOverlay.clearAll(); }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    TokenOverlay.clearAll();
  }

  private static onControlToken(token: Token, controlled: boolean): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (controlled) TokenOverlay.show(token);
    else TokenOverlay.hide(token.id);
  }

  private static onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
    if (!VolumeFlags.isSceneEnabled()) return;
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
    drawMeshContour(g, token.mesh as unknown as MeshLike);
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

}
