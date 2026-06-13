// Image contour and 3D volume box overlay for selected tokens (merged from two classes).

import { MODULE_ID, VolumeFlags } from "../core";
import type { MeshLike } from "../draw";
import { drawMeshContour, computeTokenVerts, drawBox, drawAnchorLine } from "../draw";
import { LayerManager, LAYER_KEYS } from "../render";
import { TokenElevGizmo } from "./token-elev-gizmo";

export class TokenOverlay {
  private static boxes: Map<string, PIXI.Container> = new Map();

  static activate(): void {
    Hooks.on("canvasReady",  TokenOverlay.onCanvasReady);
    Hooks.on("updateScene",  TokenOverlay.onUpdateScene);
    Hooks.on("controlToken", TokenOverlay.onControlToken);
    Hooks.on("refreshToken", TokenOverlay.onRefreshToken);
  }

  private static onCanvasReady(): void {
    TokenOverlay.clearAll();
    if (!VolumeFlags.isSceneEnabled()) return;
    for (const token of (canvas.tokens?.placeables ?? []) as Token[]) {
      if (token.document.getFlag(MODULE_ID, "transformToken") === true) continue;
      if ((token as unknown as { controlled?: boolean }).controlled) TokenOverlay.show(token);
    }
  }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    TokenOverlay.clearAll();
  }

  private static onControlToken(token: Token, controlled: boolean): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (controlled && token.document.getFlag(MODULE_ID, "transformToken") !== true) TokenOverlay.show(token);
    else TokenOverlay.hide(token.id);
  }

  private static onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) { TokenOverlay.hide(token.id); return; }
    if (!TokenOverlay.boxes.has(token.id)) return;
    // Skip pure animation frames: mesh moves but document position unchanged.
    if (flags?.["refreshMesh"] && !flags?.["refreshPosition"]) return;
    TokenOverlay.show(token);
  }

  static show(token: Token): void {
    TokenOverlay.hide(token.id);
    const showImg = VolumeFlags.getShowImageManipulation(token.document, true);
    const showVol = VolumeFlags.getShowVolumeManipulation(token.document, true);
    if (!showImg && !showVol) return;
    const layer = LayerManager.ensureLayer(LAYER_KEYS.TOKEN_OVERLAY);
    const wrapper = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.eventMode = "passive";
    if (showImg) drawMeshContour(g, token.mesh as unknown as MeshLike);
    if (showVol) {
      const v = computeTokenVerts(token);
      if (v.elevation > 0) drawAnchorLine(g, v);
      drawBox(g, v);
      if (v.elevation < 0) drawAnchorLine(g, v);
    }
    wrapper.addChild(g);
    if (showVol) TokenElevGizmo.buildSelectedHandles(token, wrapper);
    layer.addChild(wrapper);
    TokenOverlay.boxes.set(token.id, wrapper);
    LayerManager.bringToTop(LAYER_KEYS.TOKEN_OVERLAY);
  }

  static hide(tokenId: string): void {
    const c = TokenOverlay.boxes.get(tokenId);
    if (!c) return;
    c.parent?.removeChild(c);
    c.destroy({ children: true });
    TokenOverlay.boxes.delete(tokenId);
  }

  static clearAll(): void {
    for (const id of Array.from(TokenOverlay.boxes.keys())) TokenOverlay.hide(id);
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_OVERLAY);
  }
}
