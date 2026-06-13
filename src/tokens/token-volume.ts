// 3D volume overlay for selected tokens: box, image contour, elevation handle, elevation label.

import { MODULE_ID, VolumeFlags, elevToCanvas, gridDistance, getElevation, isTransformedToken, suppressTooltip } from "../core";
import type { MeshLike } from "../draw";
import { drawMeshContour, computeTokenVerts, tokenFootprint, drawBox, drawAnchorLine, makeCounterWrapper, suppressMipmap } from "../draw";
import { makeCircleHandle } from "../gizmos";
import { beginElevDrag } from "./token-elev-drag";
import { LayerManager, LAYER_KEYS, destroyMapped } from "../render";
import { currentProjection } from "../transform";

export class TokenVolume {
  private static items: Map<string, PIXI.Container> = new Map();
  static lastCommittedElev: Map<string, number> = new Map();

  static activate(): void {
    Hooks.on("canvasReady",  TokenVolume.onCanvasReady);
    Hooks.on("updateScene",  TokenVolume.onUpdateScene);
    Hooks.on("controlToken", TokenVolume.onControlToken);
    Hooks.on("refreshToken", TokenVolume.onRefreshToken);
    Hooks.on("destroyToken", (t: Token) => TokenVolume.hide(t.id));
  }

  private static onCanvasReady(): void {
    TokenVolume.clearAll();
    if (!VolumeFlags.isSceneEnabled()) return;
    for (const token of (canvas.tokens?.placeables ?? []) as Token[]) {
      suppressTooltip(token);
      if (isTransformedToken(token)) continue;
      if ((token as unknown as { controlled?: boolean }).controlled) TokenVolume.show(token);
    }
  }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    TokenVolume.clearAll();
  }

  private static onControlToken(token: Token, controlled: boolean): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (controlled && !isTransformedToken(token)) TokenVolume.show(token);
    else TokenVolume.hide(token.id);
  }

  private static onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (isTransformedToken(token)) { TokenVolume.hide(token.id); return; }
    if (!TokenVolume.items.has(token.id)) return;
    if (flags?.["refreshMesh"] && !flags?.["refreshPosition"]) return;
    TokenVolume.show(token);
  }

  static show(token: Token): void {
    TokenVolume.hide(token.id);
    const showImg = VolumeFlags.getShowImageManipulation(token.document, true);
    const showVol = VolumeFlags.getShowVolumeManipulation(token.document, true);
    if (!showImg && !showVol) return;

    const layer   = LayerManager.ensureLayer(LAYER_KEYS.TOKEN_OVERLAY);
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

    if (showVol) {
      const { tx, ty, tw, th } = tokenFootprint(token);
      const gridSize  = canvas.grid?.size ?? 100;
      const gridDist  = gridDistance();
      const proj      = currentProjection();
      const elev      = getElevation(token.document);
      const boundH    = VolumeFlags.getTokenHeight(token.document);
      const elevPx    = elevToCanvas(elev, gridSize, gridDist);
      const elevTopPx = elevPx + boundH * gridSize;
      const heightDir = proj.heightDir;

      // Elevation handle — orange circle, drag up/down to change elevation
      const seMidX = tx + tw + heightDir.x * (elevPx + elevTopPx) / 2;
      const seMidY = ty + th + heightDir.y * (elevPx + elevTopPx) / 2;
      const handle = makeCircleHandle(0xff9829);
      handle.x = seMidX; handle.y = seMidY;
      handle.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        beginElevDrag(TokenVolume.lastCommittedElev, token, e.global.x, e.global.y, elev);
      });
      wrapper.addChild(handle);

      // Elevation label — counter-transformed so it reads upright in screen space
      const gridUnits = (canvas.grid as unknown as { units?: string }).units ?? "ft";
      const label = new PIXI.Text(`${elev} ${gridUnits}`, new PIXI.TextStyle({
        fontFamily: "Signika, sans-serif", fontSize: 14,
        fill: 0xffffff, stroke: 0x000000, strokeThickness: 3, lineJoin: "round",
      }));
      label.anchor.set(0.5, 0.5); label.eventMode = "none";
      label.visible = elev !== 0;
      suppressMipmap(label.texture);
      const labelWrap = makeCounterWrapper(proj, tx + tw / 2 + heightDir.x * elevPx, ty + th + heightDir.y * elevPx);
      labelWrap.addChild(label);
      wrapper.addChild(labelWrap);

      // DIAGNOSTIC: test sprite using mesh transforms (fog-free layer validation — remove when done)
      type Pt = { x: number; y: number };
      type MeshT = { x?: number; y?: number; anchor?: Pt; scale?: Pt; rotation?: number; skew?: Pt };
      const mesh = token.mesh as unknown as MeshT | null | undefined;
      const _testTex = PIXI.Texture.from(`modules/${MODULE_ID}/assets/chars/rogue/rogue_idle_SE.png`);
      const _testSprite = new PIXI.Sprite(_testTex);
      _testSprite.position.set((mesh?.x ?? tx) - tw, mesh?.y ?? ty);
      if (mesh?.anchor) _testSprite.anchor.set(mesh.anchor.x, mesh.anchor.y);
      if (mesh?.skew)   _testSprite.skew.set(mesh.skew.x, mesh.skew.y);
      if (mesh?.scale)  _testSprite.scale.set(mesh.scale.x, mesh.scale.y);
      _testSprite.rotation = mesh?.rotation ?? 0;
      _testSprite.eventMode = "none";
      wrapper.addChild(_testSprite);
    }

    layer.addChild(wrapper);
    TokenVolume.items.set(token.id, wrapper);
    LayerManager.bringToTop(LAYER_KEYS.TOKEN_OVERLAY);
    suppressTooltip(token);
  }

  static hide(tokenId: string): void {
    destroyMapped(TokenVolume.items, tokenId);
    TokenVolume.lastCommittedElev.delete(tokenId);
  }

  static clearAll(): void {
    for (const id of [...TokenVolume.items.keys()]) TokenVolume.hide(id);
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_OVERLAY);
  }
}
