// Selection overlay for tokens: image handles, volume box, image contour, elevation handle/label, test sprite, ground shadow.

import { MODULE_ID, VolumeFlags, elevToCanvas, gridDistance, getElevation, isTransformedToken, suppressTooltip, canvasZoom, startPointerDrag, CanvasEnv } from "../core";
import { imageBottomLeft, imageTopRight, imageTopCenter, clientToGlobal, projectImgOffset, projectImgYScale, projectImgScale, makeCircleHandle, makeSquareCounterHandle } from "../gizmos";
import { drawMeshContour, drawBox, drawAnchorLine } from "../draw";
import { beginElevDrag } from "./token-elev-drag";
import { LayerManager, LAYER_KEYS, destroyMapped, IsoGeometry, MeshAccessor } from "../render";
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
  static configOpen: Set<string> = new Set();

  // ---- TokenRenderer interface ----

  static create(_token: Token): void { /* gizmos only appear on selection */ }

  static sync(_token: Token): void { /* gizmos have no per-frame mesh sync */ }

  static rebuild(token: Token): void {
    const controlled = (token as unknown as { controlled?: boolean }).controlled ?? false;
    const hasSet = TokenGizmos.sets.has(token.id), inConfig = TokenGizmos.configOpen.has(token.id);
    if (!hasSet && !controlled && !inConfig) return;
    TokenGizmos.show(token);
  }

  static onControl(token: Token, controlled: boolean): void {
    if (controlled && !isTransformedToken(token)) TokenGizmos.show(token);
    else if (!TokenGizmos.configOpen.has(token.id)) TokenGizmos.hide(token.id);
  }

  static setConfigOpen(token: Token, open: boolean): void {
    open ? TokenGizmos.configOpen.add(token.id) : TokenGizmos.configOpen.delete(token.id);
    if (open) TokenGizmos.show(token);
    else if (!((token as unknown as { controlled?: boolean }).controlled ?? false)) TokenGizmos.hide(token.id);
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
    if (showImg) drawMeshContour(g, MeshAccessor.geometryOf(token), CanvasEnv.worldTransform());
    if (showVol) {
      const v = IsoGeometry.tokenVerts(token);
      if (v.elevation > 0) drawAnchorLine(g, v);
      drawBox(g, v);
      if (v.elevation < 0) drawAnchorLine(g, v);
    }
    container.addChild(g);

    if (showVol) {
      const { tx, ty, tw, th } = IsoGeometry.footprint(token);
      const gridSize  = CanvasEnv.gridSize();
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
    }

    // Image manipulation handles (white circle + 2 squares)
    if (showImg) {
      const geo      = MeshAccessor.geometryOf(token);
      const meshCX   = geo?.x ?? (token.document.x ?? 0);
      const meshCY   = geo?.y ?? (token.document.y ?? 0);
      const tkTexH   = geo?.height ?? 100;
      const tkScaleY = geo?.scale.y ?? 1;
      const imgOff   = VolumeFlags.getImageOffset(token.document);
      const imgScl   = VolumeFlags.getImageScale(token.document);
      const imgYScl  = VolumeFlags.getImageYScale(token.document);
      const gridSize = CanvasEnv.gridSize();
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
    const gridSize = CanvasEnv.gridSize();
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
    const wt = CanvasEnv.worldTransform();
    const opts = { isUndo: true };
    if (drag.type === "imgOffset") {
      const gridSize = CanvasEnv.gridSize();
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
