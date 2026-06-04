// White dashed image contour drawn on selected tokens.
import { VolumeFlags } from "./flags";
import { drawMeshContour, MeshLike } from "../draw/contour";
import { LayerManager, LAYER_KEYS } from "../render/layer-manager";

export class TokenOverlay {
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
    const layer = LayerManager.ensureLayer(LAYER_KEYS.TOKEN_OVERLAY);
    const g = new PIXI.Graphics();
    g.eventMode = "passive";
    drawMeshContour(g, token.mesh as unknown as MeshLike);
    layer.addChild(g);
    TokenOverlay.boxes.set(token.id, g);
    LayerManager.bringToTop(LAYER_KEYS.TOKEN_OVERLAY);
  }

  static hide(tokenId: string): void {
    const g = TokenOverlay.boxes.get(tokenId);
    if (!g) return;
    g.parent?.removeChild(g);
    g.destroy();
    TokenOverlay.boxes.delete(tokenId);
  }

  static clearAll(): void {
    for (const id of Array.from(TokenOverlay.boxes.keys())) TokenOverlay.hide(id);
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_OVERLAY);
  }

}
