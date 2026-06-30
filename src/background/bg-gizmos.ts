// Interactive handles + dashed contour for background image, shown only in GridConfig.
import { startPointerDrag, CanvasEnv } from "../core";
import { CanvasTransform, setBgYScaleOverride } from "../transform";
import { clientToGlobal, HANDLE_SIZE, HALF } from "../gizmos";
import { drawDashedContour, BLACK } from "../draw";
import type { ShapeSpec } from "../render";
import { IsoRenderer, LAYER_KEYS } from "../render";
import { BgDrag, commitBgDrag } from "./bg-drag";
import { BgHtml } from "./bg-html";
import { computeBgGeom, type BgGeom } from "./bg-gizmos-geom";

const BG_OWNER = { kind: "background" as const, id: "bg" };

export class BackgroundGizmos {
  static activate(): void {
    BgHtml.setup(() => BackgroundGizmos.show(), () => BackgroundGizmos.clearAll());
    // canvasReady hook registered in core/hook-registry.ts
  }

  private static isEnabled(): boolean { return CanvasEnv.scene() != null; }

  private static _renderContour(geom: BgGeom): void {
    const { tl, tr, bl, br, topSc, leftSc } = geom;
    const scX = leftSc > 0 ? 8 * topSc / leftSc : 8;
    const scY = leftSc > 0 ? 5 * topSc / leftSc : 5;
    IsoRenderer.render({
      key: "bg:contour", owner: BG_OWNER,
      visual: { kind: "lines", build: (g) => drawDashedContour(g, [tl, tr, br, bl], 8, 5, scX, scY) },
      space: "WORLD", placement: { anchor: { x: 0, y: 0 } },
      layer: LAYER_KEYS.BG_GIZMOS,
    });
  }

  private static _renderHandles(geom: BgGeom, form: HTMLFormElement | null, isoCT: boolean): void {
    const { tc, bl, tr, sx, sCX, sCY, bgYS, baseH } = geom;
    const getEl  = (n: string) => form?.elements.namedItem?.(n) as HTMLInputElement | null;
    const shiftXEl = getEl('shiftX');
    const shiftYEl = getEl('shiftY');
    const scaleEl  = getEl('scale');
    const shiftX = Number(shiftXEl?.value) || 0;
    const shiftY = Number(shiftYEl?.value) || 0;
    const scale  = Number(scaleEl?.value) || sx;
    const strk   = { color: BLACK, width: 0.5 };
    const defs: [string, ShapeSpec, string, { x: number; y: number }, BgDrag["type"]][] = [
      ["bg:scale",     { kind: "rect",   w: HANDLE_SIZE, h: HANDLE_SIZE, fill: 0xffffff, fillAlpha: 0.9, stroke: strk }, "nesw-resize", tr, "bgScale"],
      ["bg:translate", { kind: "circle", radius: HALF * 0.945,           fill: 0xffffff, fillAlpha: 0.9, stroke: strk }, "move",        bl, "bgTranslate"],
    ];
    if (isoCT) {
      defs.splice(1, 0, ["bg:yscale", { kind: "rect", w: HANDLE_SIZE, h: HANDLE_SIZE, fill: 0xffffff, fillAlpha: 0.9, stroke: strk }, "ns-resize", tc, "bgYScale"]);
    }
    for (const [k, visual, cursor, pos, type] of defs) {
      IsoRenderer.render({
        key: k, owner: BG_OWNER, visual, space: "WORLD",
        placement: { anchor: pos },
        layer: LAYER_KEYS.BG_GIZMOS, flat: isoCT,
        interaction: { cursor, onPointerDown: (e) => {
          e.stopPropagation();
          BackgroundGizmos.beginDrag(type, e.global.x, e.global.y, scale, sCX, sCY, bgYS, baseH, shiftX, shiftY);
        } },
      });
    }
  }

  static show(): void {
    IsoRenderer.clearLayer(LAYER_KEYS.BG_GIZMOS);
    const ready = BackgroundGizmos.isEnabled() && !!BgHtml.currentHtml && !!BgHtml.previewBg;
    if (ready) {
      const html = BgHtml.currentHtml as HTMLElement;
      const geom = computeBgGeom(BgHtml.previewBg as PIXI.Sprite);
      BackgroundGizmos._renderContour(geom);
      const formEl = html.closest('form');
      const form = (formEl ?? html.querySelector('form')) as HTMLFormElement | null;
      const gctEnabled = CanvasTransform.gctEffectiveEnabled();
      const gctTransformsBg = CanvasTransform.gctEffectiveTransformBg();
      const isoCT = gctEnabled && !gctTransformsBg;
      BackgroundGizmos._renderHandles(geom, form, isoCT);
    }
  }

  static clearAll(): void {
    IsoRenderer.clearLayer(LAYER_KEYS.BG_GIZMOS);
  }

  private static beginDrag(
    type: BgDrag["type"], gx: number, gy: number,
    startScale: number, sCX: number, sCY: number,
    startBgYS: number, startBgH: number, startSX: number, startSY: number,
  ): void {
    const drag: BgDrag = { type, startGX: gx, startGY: gy, startScale, startScreenCX: sCX, startScreenCY: sCY, startBgYScale: startBgYS, startBgHalfH: startBgH, startShiftX: startSX, startShiftY: startSY };
    const onDragStep = (d: BgDrag, e: PointerEvent): void => {
      const pos = clientToGlobal(e.clientX, e.clientY);
      BackgroundGizmos.commit(d, pos.x, pos.y);
    };
    startPointerDrag(drag, onDragStep, onDragStep);
  }

  private static commit(drag: BgDrag, gx: number, gy: number): void {
    commitBgDrag(drag, gx, gy, BgHtml.currentHtml, (ys) => {
      setBgYScaleOverride(ys);
      BgHtml.syncYScaleInput(ys);
      BackgroundGizmos.show();
    });
  }
}
