// 3D bounding box overlay drawn on selected tokens.
import { VolumeFlags } from "./flags";
import { computeTokenVerts, drawBox, drawAnchorLine } from "./overlay-geometry";

type TokenVolumeState = { x: number; y: number; elev: number; boundH: number };

export class TokenVolumeOverlay {
  private static layer: PIXI.Container | null = null;
  private static boxes: Map<string, PIXI.Graphics> = new Map();
  private static lastState: Map<string, TokenVolumeState> = new Map();

  static activate(): void {
    Hooks.on("canvasReady",  TokenVolumeOverlay.onCanvasReady);
    Hooks.on("updateScene",  TokenVolumeOverlay.onUpdateScene);
    Hooks.on("controlToken", TokenVolumeOverlay.onControlToken);
    Hooks.on("refreshToken", TokenVolumeOverlay.onRefreshToken);
  }

  private static onCanvasReady(): void { TokenVolumeOverlay.clearAll(); }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    TokenVolumeOverlay.clearAll();
  }

  private static onControlToken(token: Token, controlled: boolean): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (controlled) TokenVolumeOverlay.show(token);
    else TokenVolumeOverlay.hide(token.id);
  }

  private static onRefreshToken(token: Token): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (!TokenVolumeOverlay.boxes.has(token.id)) return;
    // The 3D box is positioned by document values (not animated mesh). During movement
    // animation the document is already at the destination, so skip redundant redraws.
    const x = token.document.x ?? 0, y = token.document.y ?? 0;
    const elev = (token.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH = VolumeFlags.getTokenHeight(token.document);
    const last = TokenVolumeOverlay.lastState.get(token.id);
    if (last && last.x === x && last.y === y && last.elev === elev && last.boundH === boundH) return;
    TokenVolumeOverlay.lastState.set(token.id, { x, y, elev, boundH });
    TokenVolumeOverlay.show(token);
  }

  static show(token: Token): void {
    TokenVolumeOverlay.hide(token.id);
    if (!VolumeFlags.getShowVolumeManipulation(token.document, true)) return;
    const layer = TokenVolumeOverlay.ensureLayer();
    const g = new PIXI.Graphics();
    g.eventMode = "passive";
    const v = computeTokenVerts(token);
    if (v.elevation > 0) drawAnchorLine(g, v);
    drawBox(g, v);
    if (v.elevation < 0) drawAnchorLine(g, v);
    layer.addChild(g);
    TokenVolumeOverlay.boxes.set(token.id, g);
    TokenVolumeOverlay.bringToTop();
  }

  static hide(tokenId: string): void {
    const g = TokenVolumeOverlay.boxes.get(tokenId);
    if (!g) return;
    TokenVolumeOverlay.layer?.removeChild(g);
    g.destroy();
    TokenVolumeOverlay.boxes.delete(tokenId);
    TokenVolumeOverlay.lastState.delete(tokenId);
  }

  static clearAll(): void {
    for (const id of Array.from(TokenVolumeOverlay.boxes.keys())) TokenVolumeOverlay.hide(id);
    TokenVolumeOverlay.lastState.clear();
    if (TokenVolumeOverlay.layer) {
      try { (canvas.stage as unknown as PIXI.Container).removeChild(TokenVolumeOverlay.layer!); } catch { /* ok */ }
      TokenVolumeOverlay.layer.destroy({ children: true });
      TokenVolumeOverlay.layer = null;
    }
  }

  private static ensureLayer(): PIXI.Container {
    if (TokenVolumeOverlay.layer && !TokenVolumeOverlay.layer.parent) TokenVolumeOverlay.layer = null;
    if (TokenVolumeOverlay.layer) return TokenVolumeOverlay.layer;
    const layer = new PIXI.Container();
    layer.eventMode = "passive";
    (canvas.stage as unknown as PIXI.Container).addChild(layer);
    TokenVolumeOverlay.layer = layer;
    return layer;
  }

  private static bringToTop(): void {
    if (TokenVolumeOverlay.layer && !TokenVolumeOverlay.layer.parent) TokenVolumeOverlay.layer = null;
    if (!TokenVolumeOverlay.layer) return;
    const stage = canvas.stage as unknown as PIXI.Container;
    try { stage.removeChild(TokenVolumeOverlay.layer); } catch { /* ok */ }
    stage.addChild(TokenVolumeOverlay.layer);
  }
}
