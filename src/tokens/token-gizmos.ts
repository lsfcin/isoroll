// Selection overlay for tokens: image handles, volume box, image contour, elevation handle.

import { MODULE_ID, VolumeFlags, elevToCanvas, gridDistance, getElevation, isTransformedToken, suppressTooltip, canvasZoom, startPointerDrag, CanvasEnv } from "../core";
import { HALF, HANDLE_SIZE, imageBottomLeft, imageTopRight, imageTopCenter, clientToGlobal, projectImgOffset, projectImgYScale, projectImgScale } from "../gizmos";
import { drawMeshContour, drawBox, drawAnchorLine, BLACK, ORANGE } from "../draw";
import { beginElevDrag } from "./token-elev-drag";
import { LAYER_KEYS, IsoGeometry, MeshAccessor, IsoRenderer } from "../render";
import type { DrawAPI, ShapeSpec } from "../render";
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
  private static _handleKeys: Map<string, Set<string>> = new Map();
  static lastCommittedElev:   Map<string, number>      = new Map();
  static configOpen:          Set<string>              = new Set();

  // ---- TokenRenderer interface ----

  static create(_token: Token): void { /* gizmos only appear on selection */ }

  static sync(_token: Token): void { /* gizmos have no per-frame mesh sync */ }

  static rebuild(token: Token): void {
    const controlled = (token as unknown as { controlled?: boolean }).controlled ?? false;
    const hasSet = TokenGizmos._handleKeys.has(token.id), inConfig = TokenGizmos.configOpen.has(token.id);
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

    const keys = new Set<string>();
    const own  = { kind: "token" as const, id: token.id };
    const strk = { color: BLACK, width: 0.5 };

    keys.add(`token-${token.id}:box`);
    IsoRenderer.render({
      key: `token-${token.id}:box`, owner: own,
      visual: { kind: "lines", build: (g) => TokenGizmos._drawBox(g, token) },
      space: "WORLD", placement: { anchor: { x: 0, y: 0 } },
      layer: LAYER_KEYS.TOKEN_GIZMOS, z: "top",
    });

    if (showVol) {
      const { tx, ty, tw, th } = IsoGeometry.footprint(token);
      const gridSize = CanvasEnv.gridSize(), gridDist = gridDistance();
      const elev = getElevation(token.document);
      const boundH = VolumeFlags.getTokenHeight(token.document);
      const elevPx = elevToCanvas(elev, gridSize, gridDist);
      const heightDir = currentProjection().heightDir;
      const seMidX = tx + tw + heightDir.x * (elevPx + elevPx + boundH * gridSize) / 2;
      const seMidY = ty + th + heightDir.y * (elevPx + elevPx + boundH * gridSize) / 2;
      keys.add(`token-${token.id}:elev`);
      IsoRenderer.render({
        key: `token-${token.id}:elev`, owner: own,
        visual: { kind: "circle", radius: HALF * 0.945, fill: ORANGE, fillAlpha: 0.9, stroke: strk },
        space: "WORLD", placement: { anchor: { x: seMidX, y: seMidY } },
        layer: LAYER_KEYS.TOKEN_GIZMOS, flat: true,
        interaction: { cursor: "n-resize",
          onPointerDown: (e) => { e.stopPropagation(); beginElevDrag(TokenGizmos.lastCommittedElev, token, e.global.x, e.global.y, elev); } },
      });
    }

    if (showImg) {
      const geo     = MeshAccessor.geometryOf(token);
      const meshCX  = geo?.x ?? (token.document.x ?? 0);
      const meshCY  = geo?.y ?? (token.document.y ?? 0);
      const imgOff  = VolumeFlags.getImageOffset(token.document);
      const imgScl  = VolumeFlags.getImageScale(token.document);
      const imgYScl = VolumeFlags.getImageYScale(token.document);
      const gridSize = CanvasEnv.gridSize();
      const tkImgHalfH = Math.max(1, (geo?.height ?? 100) * Math.abs(geo?.scale.y ?? 1) / (2 * Math.max(0.01, Math.abs(imgYScl))));
      const bl = imageBottomLeft(token), tr = imageTopRight(token), tc = imageTopCenter(token);
      type ImgDef = [string, ShapeSpec, string, {x:number;y:number}|null, "imgOffset"|"imgScale"|"imgYScale"];
      const imgDefs: ImgDef[] = [
        [`token-${token.id}:imgOffset`, { kind: "circle", radius: HALF*0.945, fill: 0xffffff, fillAlpha: 0.9, stroke: strk }, "move",        bl, "imgOffset"],
        [`token-${token.id}:imgScale`,  { kind: "rect", w: HANDLE_SIZE, h: HANDLE_SIZE, fill: 0xffffff, fillAlpha: 0.9, stroke: strk },  "nesw-resize", tr, "imgScale" ],
        [`token-${token.id}:imgYScale`, { kind: "rect", w: HANDLE_SIZE, h: HANDLE_SIZE, fill: 0xffffff, fillAlpha: 0.9, stroke: strk },  "ns-resize",   tc, "imgYScale"],
      ];
      for (const [k, visual, cursor, pos, type] of imgDefs) {
        keys.add(k);
        IsoRenderer.render({
          key: k, owner: own, visual, space: "WORLD",
          placement: { anchor: pos ?? { x: 0, y: 0 } },
          layer: LAYER_KEYS.TOKEN_GIZMOS, flat: true,
          interaction: { cursor,
            onPointerDown: (e) => { e.stopPropagation(); TokenGizmos.beginDrag(type, token, e.global.x, e.global.y, imgOff.x * gridSize, imgOff.y * gridSize, imgScl, imgYScl, tkImgHalfH, meshCX, meshCY); } },
        });
      }
    }

    TokenGizmos._handleKeys.set(token.id, keys);
    suppressTooltip(token);
  }

  static onDestroy(id: string): void { TokenGizmos.hide(id); }

  static hide(tokenId: string): void {
    for (const k of TokenGizmos._handleKeys.get(tokenId) ?? []) IsoRenderer.clear(k);
    TokenGizmos._handleKeys.delete(tokenId);
    TokenGizmos.lastCommittedElev.delete(tokenId);
  }

  static clearAll(): void {
    IsoRenderer.clearLayer(LAYER_KEYS.TOKEN_GIZMOS);
    TokenGizmos._handleKeys.clear();
    TokenGizmos.lastCommittedElev.clear();
  }

  private static _drawBox(g: DrawAPI, token: Token): void {
    const showVol = VolumeFlags.getShowVolumeManipulation(token.document, true);
    const showImg = VolumeFlags.getShowImageManipulation(token.document, true);
    if (showImg) drawMeshContour(g, MeshAccessor.geometryOf(token), CanvasEnv.worldTransform());
    if (showVol) {
      const v = IsoGeometry.tokenVerts(token);
      if (v.elevation > 0) drawAnchorLine(g, v);
      drawBox(g, v);
      if (v.elevation < 0) drawAnchorLine(g, v);
    }
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
    CanvasEnv.pushTokensHistory({ type: "update", data: [original], options: { isUndo: true } });
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
