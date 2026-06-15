// Selection overlay for tokens: image handles, volume box, image contour, elevation handle/label, test sprite, ground shadow.

import { MODULE_ID, VolumeFlags, elevToCanvas, gridDistance, getElevation, isTransformedToken, suppressTooltip, canvasZoom, startPointerDrag, hasActiveClone } from "../core";
import { imageBottomLeft, imageTopRight, imageTopCenter, clientToGlobal, projectImgOffset, projectImgYScale, projectImgScale, makeCircleHandle, makeSquareCounterHandle } from "../gizmos";
import type { MeshLike } from "../draw";
import { drawMeshContour, computeTokenVerts, tokenFootprint, drawBox, drawAnchorLine, makeCounterWrapper, suppressMipmap } from "../draw";
import { beginElevDrag } from "./token-elev-drag";
import { LayerManager, LAYER_KEYS, destroyMapped } from "../render";
import { currentProjection } from "../transform";

interface TkDrag {
  type: "imgOffset" | "imgScale" | "imgYScale";
  token: Token;
  startGX: number; startGY: number;
  startImgOffX: number; startImgOffY: number;
  startImgScale: number;
  startImgYScale: number;
  startImgHalfH: number;
  startMeshCX: number; startMeshCY: number;
}

export class TokenGizmos {
  private static sets: Map<string, PIXI.Container> = new Map();
  static lastCommittedElev: Map<string, number> = new Map();

  static activate(): void {
    Hooks.on("canvasReady",  TokenGizmos.onCanvasReady);
    Hooks.on("updateScene",  TokenGizmos.onUpdateScene);
    Hooks.on("controlToken", TokenGizmos.onControlToken);
    Hooks.on("refreshToken", TokenGizmos.onRefreshToken);
  }

  private static onCanvasReady(): void {
    TokenGizmos.clearAll();
    if (!VolumeFlags.isSceneEnabled()) return;
    for (const token of (canvas.tokens?.placeables ?? []) as Token[]) {
      if (isTransformedToken(token)) continue;
      if ((token as unknown as { controlled?: boolean }).controlled) TokenGizmos.show(token);
    }
  }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    TokenGizmos.clearAll();
  }

  private static onControlToken(token: Token, controlled: boolean): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (hasActiveClone(token)) return; // original firing during drag — stale doc position
    if (controlled && !isTransformedToken(token)) TokenGizmos.show(token);
    else TokenGizmos.hide(token.id);
  }

  private static onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (isTransformedToken(token)) { TokenGizmos.hide(token.id); return; }
    if (!TokenGizmos.sets.has(token.id)) return;
    if (hasActiveClone(token)) return; // original firing during drag — stale doc position
    if (flags?.["refreshMesh"] && !flags?.["refreshPosition"]) return;
    TokenGizmos.show(token);
  }

  static show(token: Token): void {
    TokenGizmos.hide(token.id);
    const showImg = VolumeFlags.getShowImageManipulation(token.document, true);
    const showVol = VolumeFlags.getShowVolumeManipulation(token.document, true);
    if (!showImg && !showVol) return;

    // Selection overlay + handles (TOKEN_GIZMOS layer)
    const layer     = LayerManager.ensureLayer(LAYER_KEYS.TOKEN_GIZMOS);
    const container = new PIXI.Container();

    // Graphics: image dashed contour + volume box lines
    const g = new PIXI.Graphics();
    g.eventMode = "passive";
    if (showImg) drawMeshContour(g, token.mesh as unknown as MeshLike);
    if (showVol) {
      const v = computeTokenVerts(token);
      if (v.elevation > 0) drawAnchorLine(g, v);
      drawBox(g, v);
      if (v.elevation < 0) drawAnchorLine(g, v);
    }
    container.addChild(g);

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

      // Elevation handle — orange circle, drag to change elevation
      const seMidX = tx + tw + heightDir.x * (elevPx + elevTopPx) / 2;
      const seMidY = ty + th + heightDir.y * (elevPx + elevTopPx) / 2;
      const elevHandle = makeCircleHandle(0xff9829);
      elevHandle.x = seMidX; elevHandle.y = seMidY;
      elevHandle.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        beginElevDrag(TokenGizmos.lastCommittedElev, token, e.global.x, e.global.y, elev);
      });
      container.addChild(elevHandle);

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
      container.addChild(labelWrap);

      // DIAGNOSTIC: test sprite with mesh transforms (fog-free layer validation — remove when done)
      type Pt = { x: number; y: number };
      type MeshT = { x?: number; y?: number; anchor?: Pt; scale?: Pt; rotation?: number; skew?: Pt };
      const mesh = token.mesh as unknown as MeshT | null | undefined;
      const _testTex    = PIXI.Texture.from(`modules/${MODULE_ID}/assets/chars/rogue/rogue_idle_SE.png`);
      const _testSprite = new PIXI.Sprite(_testTex);
      _testSprite.position.set((mesh?.x ?? tx) - tw, mesh?.y ?? ty);
      if (mesh?.anchor) _testSprite.anchor.set(mesh.anchor.x, mesh.anchor.y);
      if (mesh?.skew)   _testSprite.skew.set(mesh.skew.x, mesh.skew.y);
      if (mesh?.scale)  _testSprite.scale.set(mesh.scale.x, mesh.scale.y);
      _testSprite.rotation = mesh?.rotation ?? 0;
      _testSprite.eventMode = "none";
      container.addChild(_testSprite);
    }

    // Image manipulation handles (white circle + 2 squares)
    const tkMesh   = token.mesh as unknown as MeshLike | null | undefined;
    const meshCX   = tkMesh?.x ?? (token.document.x ?? 0);
    const meshCY   = tkMesh?.y ?? (token.document.y ?? 0);
    const tkTexH   = tkMesh?.texture?.height ?? 100;
    const tkScaleY = tkMesh?.scale?.y ?? 1;
    const imgOff   = VolumeFlags.getImageOffset(token.document);
    const imgScl   = VolumeFlags.getImageScale(token.document);
    const imgYScl  = VolumeFlags.getImageYScale(token.document);
    const gridSize = canvas.grid?.size ?? 100;
    const tkImgHalfH = Math.max(1, tkTexH * Math.abs(tkScaleY) / (2 * Math.max(0.01, Math.abs(imgYScl))));
    const bl = imageBottomLeft(token);
    const tr = imageTopRight(token);
    const tc = imageTopCenter(token);
    const defs: Array<[PIXI.Container, "imgOffset" | "imgScale" | "imgYScale", { x: number; y: number } | null]> = [
      [makeCircleHandle(0xffffff, "move"),               "imgOffset", bl],
      [makeSquareCounterHandle(0xffffff, "nesw-resize"), "imgScale",  tr],
      [makeSquareCounterHandle(0xffffff, "ns-resize"),   "imgYScale", tc],
    ];
    for (const [handle, type, pos] of defs) {
      if (pos) { handle.x = pos.x; handle.y = pos.y; }
      handle.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        TokenGizmos.beginDrag(type, token, e.global.x, e.global.y, imgOff.x * gridSize, imgOff.y * gridSize, imgScl, imgYScl, tkImgHalfH, meshCX, meshCY);
      });
      container.addChild(handle);
    }

    layer.addChild(container);
    TokenGizmos.sets.set(token.id, container);
    LayerManager.bringToTop(LAYER_KEYS.TOKEN_GIZMOS);
    suppressTooltip(token);
  }

  static hide(tokenId: string): void {
    destroyMapped(TokenGizmos.sets, tokenId);
    TokenGizmos.lastCommittedElev.delete(tokenId);
  }

  static clearAll(): void {
    for (const id of Array.from(TokenGizmos.sets.keys())) destroyMapped(TokenGizmos.sets, id);
    TokenGizmos.lastCommittedElev.clear();
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_GIZMOS);
  }

  private static beginDrag(
    type: "imgOffset" | "imgScale" | "imgYScale", token: Token,
    gx: number, gy: number, imgOffX: number, imgOffY: number, imgScale: number,
    imgYScale = 1, imgHalfH = 100, meshCX = 0, meshCY = 0,
  ): void {
    const drag: TkDrag = { type, token, startGX: gx, startGY: gy, startImgOffX: imgOffX, startImgOffY: imgOffY, startImgScale: imgScale, startImgYScale: imgYScale, startImgHalfH: imgHalfH, startMeshCX: meshCX, startMeshCY: meshCY };
    startPointerDrag(drag,
      (d, e) => { const { x, y } = clientToGlobal(e.clientX, e.clientY); TokenGizmos.commit(d, x, y); },
      (d, e) => { const { x, y } = clientToGlobal(e.clientX, e.clientY); TokenGizmos.pushHistory(d); TokenGizmos.commit(d, x, y); },
    );
  }

  private static pushHistory(drag: TkDrag): void {
    const id = drag.token.id;
    if (!id) return;
    const gridSize = canvas.grid?.size ?? 100;
    const original: Record<string, unknown> = { _id: id };
    if (drag.type === "imgOffset") original[`flags.${MODULE_ID}.imageOffset`] = { x: drag.startImgOffX / gridSize, y: drag.startImgOffY / gridSize };
    else if (drag.type === "imgYScale") original[`flags.${MODULE_ID}.imageYScale`] = drag.startImgYScale;
    else original[`flags.${MODULE_ID}.imageScale`] = drag.startImgScale;
    const layer = canvas.tokens as unknown as { history: { type: string; data: unknown[]; options: object }[] };
    layer.history.push({ type: "update", data: [original], options: { isUndo: true } });
    console.debug(`[isoroll] storeDragHistory | type=${drag.type} token=${id}`, original);
  }

  private static commit(drag: TkDrag, gx: number, gy: number): void {
    const dx = gx - drag.startGX, dy = gy - drag.startGY;
    const wt = canvas.app!.stage.worldTransform;
    const opts = { isUndo: true };
    if (drag.type === "imgOffset") {
      const gridSize = canvas.grid?.size ?? 100;
      const { x, y } = projectImgOffset(dx, dy, wt, drag.startImgOffX, drag.startImgOffY);
      void drag.token.document.update({ [`flags.${MODULE_ID}.imageOffset`]: { x: x / gridSize, y: y / gridSize } }, opts);
    } else if (drag.type === "imgYScale") {
      void drag.token.document.update({ [`flags.${MODULE_ID}.imageYScale`]:
        projectImgYScale(dx, dy, wt, canvasZoom(), drag.startImgYScale, drag.startImgHalfH) }, opts);
    } else {
      void drag.token.document.update({ [`flags.${MODULE_ID}.imageScale`]:
        projectImgScale(gx, gy, drag.startGX, drag.startGY, drag.startImgScale, drag.startMeshCX, drag.startMeshCY, wt) }, opts);
    }
  }
}
