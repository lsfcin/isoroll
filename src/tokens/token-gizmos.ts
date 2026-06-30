// Selection overlay for tokens: image handles, volume box, image contour, elevation handle.

import { VolumeFlags, isTransformedToken, suppressTooltip, CanvasEnv } from "../core";
import { HALF, HANDLE_SIZE, imageBottomLeft, imageTopRight, imageTopCenter } from "../gizmos";
import { drawMeshContour, drawBox, drawAnchorLine, BLACK } from "../draw";
import { LAYER_KEYS, IsoGeometry, MeshAccessor, IsoRenderer } from "../render";
import type { DrawAPI, ShapeSpec } from "../render";
import { showVolHandle, beginDrag } from "./token-gizmos-drag";

export class TokenGizmos {
  private static _handleKeys: Map<string, Set<string>> = new Map();
  static lastCommittedElev:   Map<string, number>      = new Map();
  static configOpen:          Set<string>              = new Set();

  // ---- TokenRenderer interface ----

  static create(_token: Token): void { /* gizmos only appear on selection */ }

  static sync(_token: Token): void { /* gizmos have no per-frame mesh sync */ }

  static rebuild(token: Token): void {
    const tokenObj = token as unknown as { controlled?: boolean };
    const controlled = tokenObj.controlled ?? false;
    const hasSet = TokenGizmos._handleKeys.has(token.id);
    const inConfig = TokenGizmos.configOpen.has(token.id);
    if (!hasSet && !controlled && !inConfig) {
      return;
    }
    TokenGizmos.show(token);
  }

  static onControl(token: Token, controlled: boolean): void {
    if (controlled && !isTransformedToken(token)) {
      TokenGizmos.show(token);
    } else if (!TokenGizmos.configOpen.has(token.id)) {
      TokenGizmos.hide(token.id);
    }
  }

  static setConfigOpen(token: Token, open: boolean): void {
    if (open) {
      TokenGizmos.configOpen.add(token.id);
    } else {
      TokenGizmos.configOpen.delete(token.id);
    }
    if (open) {
      TokenGizmos.show(token);
    } else {
      const tokenObj = token as unknown as { controlled?: boolean };
      const controlled = tokenObj.controlled ?? false;
      if (!controlled) {
        TokenGizmos.hide(token.id);
      }
    }
  }

  private static _renderImgHandle(
    k: string, visual: ShapeSpec, cursor: string, anchor: { x: number; y: number },
    offX: number, offY: number, imgScl: number, imgYScl: number,
    tkImgHalfH: number, meshCX: number, meshCY: number,
    type: "imgOffset" | "imgScale" | "imgYScale",
    token: Token, own: { kind: "token"; id: string }, keys: Set<string>,
  ): void {
    keys.add(k);
    IsoRenderer.render({
      key: k, owner: own, visual, space: "WORLD",
      placement: { anchor },
      layer: LAYER_KEYS.TOKEN_GIZMOS, flat: true,
      interaction: {
        cursor,
        onPointerDown: (e) => {
          e.stopPropagation();
          beginDrag(type, token, e.global.x, e.global.y, offX, offY, imgScl, imgYScl, tkImgHalfH, meshCX, meshCY);
        },
      },
    });
  }

  private static _showImgHandles(token: Token, own: { kind: "token"; id: string }, keys: Set<string>): void {
    const geo = MeshAccessor.geometryOf(token);
    const meshCX  = geo?.x ?? (token.document.x ?? 0);
    const meshCY  = geo?.y ?? (token.document.y ?? 0);
    const imgOff  = VolumeFlags.getImageOffset(token.document);
    const imgScl  = VolumeFlags.getImageScale(token.document);
    const imgYScl = VolumeFlags.getImageYScale(token.document);
    const gridSize = CanvasEnv.gridSize();
    const geoHeight = geo?.height ?? 100;
    const geoScaleY = geo?.scale.y ?? 1;
    const absScaleY = Math.abs(geoScaleY);
    const absImgYScl = Math.abs(imgYScl);
    const absYScl = Math.max(0.01, absImgYScl);
    const tkImgHalfH = Math.max(1, geoHeight * absScaleY / (2 * absYScl));
    const bl = imageBottomLeft(token);
    const tr = imageTopRight(token);
    const tc = imageTopCenter(token);
    const strk = { color: BLACK, width: 0.5 };
    type ImgDef = [string, ShapeSpec, string, {x:number;y:number}|null, "imgOffset"|"imgScale"|"imgYScale"];
    const imgDefs: ImgDef[] = [
      [`token-${token.id}:imgOffset`, { kind: "circle", radius: HALF*0.945, fill: 0xffffff, fillAlpha: 0.9, stroke: strk }, "move",        bl, "imgOffset"],
      [`token-${token.id}:imgScale`,  { kind: "rect", w: HANDLE_SIZE, h: HANDLE_SIZE, fill: 0xffffff, fillAlpha: 0.9, stroke: strk },  "nesw-resize", tr, "imgScale" ],
      [`token-${token.id}:imgYScale`, { kind: "rect", w: HANDLE_SIZE, h: HANDLE_SIZE, fill: 0xffffff, fillAlpha: 0.9, stroke: strk },  "ns-resize",   tc, "imgYScale"],
    ];
    for (const [k, visual, cursor, pos, type] of imgDefs) {
      const anchor = pos ?? { x: 0, y: 0 };
      const offX = imgOff.x * gridSize;
      const offY = imgOff.y * gridSize;
      TokenGizmos._renderImgHandle(k, visual, cursor, anchor, offX, offY, imgScl, imgYScl, tkImgHalfH, meshCX, meshCY, type, token, own, keys);
    }
  }

  static show(token: Token): void {
    TokenGizmos.hide(token.id);
    const showImg = VolumeFlags.getShowImageManipulation(token.document, true);
    const showVol = VolumeFlags.getShowVolumeManipulation(token.document, true);
    if (!showImg && !showVol) {
      return;
    }
    const keys = new Set<string>();
    const own  = { kind: "token" as const, id: token.id };
    keys.add(`token-${token.id}:box`);
    IsoRenderer.render({
      key: `token-${token.id}:box`, owner: own,
      visual: { kind: "lines", build: (g) => TokenGizmos._drawBox(g, token) },
      space: "WORLD", placement: { anchor: { x: 0, y: 0 } },
      layer: LAYER_KEYS.TOKEN_GIZMOS, z: "top",
    });
    if (showVol) {
      showVolHandle(token, own, keys, TokenGizmos.lastCommittedElev);
    }
    if (showImg) {
      TokenGizmos._showImgHandles(token, own, keys);
    }
    TokenGizmos._handleKeys.set(token.id, keys);
    suppressTooltip(token);
  }

  static onDestroy(id: string): void { TokenGizmos.hide(id); }

  static hide(tokenId: string): void {
    const handleKeys = TokenGizmos._handleKeys.get(tokenId) ?? [];
    for (const k of handleKeys) {
      IsoRenderer.clear(k);
    }
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
    if (showImg) {
      const geo = MeshAccessor.geometryOf(token);
      const wt = CanvasEnv.worldTransform();
      drawMeshContour(g, geo, wt);
    }
    if (showVol) {
      const v = IsoGeometry.tokenVerts(token);
      if (v.elevation > 0) {
        drawAnchorLine(g, v);
      }
      drawBox(g, v);
      if (v.elevation < 0) {
        drawAnchorLine(g, v);
      }
    }
  }
}
