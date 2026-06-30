// GridConfig HTML injection: Vertical Scale field, key/wheel handlers, _processSubmitData patch.

import { CanvasEnv } from "../core";
import { getBgYScale, setBgYScaleOverride, CanvasTransform, BackgroundTransform } from "../transform";
import { setupYScaleField, type GCApp } from "./bg-html-yscale";
import { buildKeyHandler, buildWheelHandler, type KeyDeps } from "./bg-html-keys";

export class BgHtml {
  static currentHtml:  HTMLElement | null = null;
  static previewBg:    PIXI.Sprite | null = null;
  private static keyHandler:   ((e: KeyboardEvent) => void) | null = null;
  private static wheelHandler: ((e: WheelEvent) => void) | null = null;
  private static onShow: (() => void) | null = null;
  private static _onClearAll: (() => void) | null = null;

  // Store callbacks without registering hooks — hooks registered in core/hook-registry.ts.
  static setup(onShow: () => void, onClearAll: () => void): void {
    BgHtml.onShow      = onShow;
    BgHtml._onClearAll = onClearAll;
  }

  // TBF = iso enabled + background NOT transformed — the only mode using vertical scale.
  private static isTBF(): boolean {
    const gctEnabled = CanvasTransform.gctEffectiveEnabled();
    const gctTransformsBg = CanvasTransform.gctEffectiveTransformBg();
    return gctEnabled && !gctTransformsBg;
  }

  private static rebindHandlers(html: HTMLElement): void {
    if (BgHtml.keyHandler) {
      document.removeEventListener('keydown', BgHtml.keyHandler, { capture: true });
    }
    if (BgHtml.wheelHandler) {
      document.removeEventListener('wheel', BgHtml.wheelHandler);
    }
    const deps: KeyDeps = {
      getHtml: () => BgHtml.currentHtml,
      isTBF: () => BgHtml.isTBF(),
      scaleVerticalStep: (d) => BgHtml.scaleVerticalStep(d),
    };
    BgHtml.keyHandler = buildKeyHandler(deps);
    BgHtml.wheelHandler = buildWheelHandler((d) => BgHtml.scaleVerticalStep(d));
    document.addEventListener('keydown', BgHtml.keyHandler, { capture: true });
    document.addEventListener('wheel', BgHtml.wheelHandler, { passive: false });
    html.addEventListener('change', BgHtml.onHtmlChange);
    BgHtml.onShow?.();
  }

  private static onHtmlChange(): void {
    requestAnimationFrame(() => BgHtml.onShow?.());
  }

  static onRenderGridConfig(app: GCApp, html: HTMLElement): void {
    const scene = CanvasEnv.scene();
    if (scene == null) {
      return;
    }
    BgHtml.currentHtml = html;
    // Re-cache on every render: Reset Changes destroys + recreates the preview container,
    // making any stale previewBg reference point to a destroyed sprite.
    BgHtml.previewBg = BackgroundTransform.findGridConfigPreviewBg();
    // Vertical Scale field — only meaningful in TBF mode (counter-transformed background).
    const yScaleExists = html.querySelector('#isoroll-bg-yscale');
    const needsYScale = BgHtml.isTBF() && !yScaleExists;
    if (needsYScale) {
      setupYScaleField(html, app, () => BgHtml.onShow?.());
    }
    BgHtml.rebindHandlers(html);
  }

  static onCloseGridConfig(): void {
    if (BgHtml.keyHandler) {
      document.removeEventListener('keydown', BgHtml.keyHandler, { capture: true });
      BgHtml.keyHandler = null;
    }
    if (BgHtml.wheelHandler) {
      document.removeEventListener('wheel', BgHtml.wheelHandler);
      BgHtml.wheelHandler = null;
    }
    setBgYScaleOverride(null);
    BgHtml.currentHtml = null;
    BgHtml.previewBg   = null;
    BgHtml._onClearAll?.();
  }

  static scaleVerticalStep(delta: number): void {
    const html = BgHtml.currentHtml;
    if (!html) {
      return;
    }
    const stepped = getBgYScale() + delta * 0.01;
    const rounded = Math.round(stepped * 1000) / 1000;
    const minVal = Math.min(5.0, rounded);
    const newYS = Math.max(0.05, minVal);
    setBgYScaleOverride(newYS);
    const input = html.querySelector('#isoroll-bg-yscale') as HTMLInputElement | null;
    if (input) {
      input.value = newYS.toFixed(3);
    }
    BgHtml.onShow?.();
  }

  static syncYScaleInput(ys: number): void {
    const ye = document.querySelector('#isoroll-bg-yscale') as HTMLInputElement | null;
    if (ye) {
      ye.value = ys.toFixed(3);
    }
  }
}
