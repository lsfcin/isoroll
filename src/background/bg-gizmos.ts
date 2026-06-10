// Interactive handles + dashed contour for background image, shown only in GridConfig.
import { startPointerDrag } from "../core";
import { currentProjection, CanvasTransform, getBgYScale, setBgYScaleOverride } from "../transform";
import { clientToGlobal, makeHandle, makeCircleHandle, makeMoveHandle, makeSquareCounterHandle } from "../gizmos";

import { drawDashedContour } from "../draw";
import { BgDrag, commitBgDrag } from "./bg-drag";
import { LayerManager, LAYER_KEYS } from "../render";
import { BgHtml } from "./bg-html";

function bgCorner(
  fx: number, fy: number, cx: number, cy: number,
  texW: number, texH: number, scX: number, scY: number, cosR: number, sinR: number,
): { x: number; y: number } {
  const lx = fx * texW * scX, ly = fy * texH * scY;
  return { x: cx + cosR * lx - sinR * ly, y: cy + sinR * lx + cosR * ly };
}

export class BackgroundGizmos {
  static activate(): void {
    BgHtml.activate(() => BackgroundGizmos.show(), () => BackgroundGizmos.clearAll());
    Hooks.on("canvasReady", BackgroundGizmos.clearAll);
  }

  private static isEnabled(): boolean { return canvas.scene != null; }

  static show(): void {
    BackgroundGizmos.clearLayer();
    if (!BackgroundGizmos.isEnabled() || !BgHtml.currentHtml) return;
    const html  = BgHtml.currentHtml;
    const layer = LayerManager.ensureLayer(LAYER_KEYS.BG_GIZMOS);
    const proj  = currentProjection();
    const isoCT = CanvasTransform.gctEffectiveEnabled() && !CanvasTransform.gctEffectiveTransformBg();
    const cosR  = isoCT ? Math.cos(proj.reverseRotation) : 1;
    const sinR  = isoCT ? Math.sin(proj.reverseRotation) : 0;
    const previewBg = BgHtml.previewBg;
    if (!previewBg) return;
    const texW = previewBg.texture?.width || 1, texH = previewBg.texture?.height || 1;
    const bgX = previewBg.x, bgY = previewBg.y, bgW = previewBg.width || 1;
    const sx   = bgW / texW;
    const bgYS = getBgYScale();
    const scX  = isoCT ? sx * proj.counterFactor : sx;
    const scY  = isoCT ? sx * proj.ratio * proj.counterFactor * bgYS : sx;
    const cx   = bgX + bgW / 2, cy = bgY + texH * sx / 2;
    const baseH = Math.max(1, texH * sx * proj.ratio * proj.counterFactor / 2);
    const [tr, tc, bl, tl, br] = [[.5,-.5],[0,-.5],[-.5,.5],[-.5,-.5],[.5,.5]]
      .map(([fx,fy]) => bgCorner(fx, fy, cx, cy, texW, texH, scX, scY, cosR, sinR));
    const wt      = canvas.app!.stage.worldTransform;
    const topSc  = Math.hypot(wt.a*cosR + wt.c*sinR, wt.b*cosR + wt.d*sinR);
    const leftSc = Math.hypot(-wt.a*sinR + wt.c*cosR, -wt.b*sinR + wt.d*cosR);
    const g = new PIXI.Graphics();
    drawDashedContour(g, [tl, tr, br, bl], 8, 5, leftSc > 0 ? 8*topSc/leftSc : 8, leftSc > 0 ? 5*topSc/leftSc : 5); layer.addChild(g);
    const form   = (html.closest('form') ?? html.querySelector('form')) as HTMLFormElement | null;
    const getEl  = (n: string) => form?.elements.namedItem?.(n) as HTMLInputElement | null;
    const shiftX = Number(getEl('shiftX')?.value) || 0;
    const shiftY = Number(getEl('shiftY')?.value) || 0;
    const scale  = Number(getEl('scale')?.value) || sx;
    const sCX    = wt.a * cx + wt.c * cy + wt.tx, sCY = wt.b * cx + wt.d * cy + wt.ty;
    const defs: [PIXI.Container, BgDrag["type"], { x: number; y: number }][] = [
      [isoCT ? makeSquareCounterHandle(0xffffff, "nesw-resize") : makeHandle(0xffffff, "nesw-resize"), "bgScale",     tr],
      [isoCT ? makeCircleHandle(0xffffff, "move")               : makeMoveHandle(0xffffff),            "bgTranslate", bl],
    ];
    if (isoCT) defs.splice(1, 0, [makeSquareCounterHandle(0xffffff, "ns-resize"), "bgYScale", tc]);
    for (const [handle, type, pos] of defs) {
      handle.x = pos.x; handle.y = pos.y;
      handle.on("pointerdown", (e: PIXI.FederatedPointerEvent) => { e.stopPropagation(); BackgroundGizmos.beginDrag(type, e.global.x, e.global.y, scale, sCX, sCY, bgYS, baseH, shiftX, shiftY); });
      layer.addChild(handle);
    }
    LayerManager.bringToTop(LAYER_KEYS.BG_GIZMOS);
  }

  private static clearLayer(): void {
    const l = LayerManager.ensureLayer(LAYER_KEYS.BG_GIZMOS);
    l.removeChildren().forEach(c => (c as PIXI.Container).destroy({ children: true }));
  }

  static clearAll(): void {
    LayerManager.clearLayer(LAYER_KEYS.BG_GIZMOS);
  }

  private static beginDrag(
    type: BgDrag["type"], gx: number, gy: number,
    startScale: number, sCX: number, sCY: number,
    startBgYS: number, startBgH: number, startSX: number, startSY: number,
  ): void {
    const drag: BgDrag = { type, startGX: gx, startGY: gy, startScale, startScreenCX: sCX, startScreenCY: sCY, startBgYScale: startBgYS, startBgHalfH: startBgH, startShiftX: startSX, startShiftY: startSY };
    startPointerDrag(drag,
      (d, e) => { const { x, y } = clientToGlobal(e.clientX, e.clientY); BackgroundGizmos.commit(d, x, y); },
      (d, e) => { const { x, y } = clientToGlobal(e.clientX, e.clientY); BackgroundGizmos.commit(d, x, y); },
    );
  }

  private static commit(drag: BgDrag, gx: number, gy: number): void {
    commitBgDrag(drag, gx, gy, BgHtml.currentHtml, (ys) => {
      setBgYScaleOverride(ys);
      BgHtml.syncYScaleInput(ys);
      BackgroundGizmos.show();
    });
  }
}
