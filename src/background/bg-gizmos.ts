// Interactive handles + dashed contour for background image, shown only in GridConfig.
import { getProjection } from "../transform/constants";
import { CanvasTransform } from "../transform/stage-transform";
import { MODULE_ID } from "../flags";
import { clientToGlobal } from "../tiles/tile-drag";
import { makeElevHandle, makeSquareCounterHandle, bgCorner, drawDashedContour } from "../gizmos/handle-factories";
import { BgDrag, commitBgDrag } from "./bg-drag";
import { LayerManager, LAYER_KEYS } from "../render/layer-manager";

type GCApp = { _processSubmitData?: (...a: unknown[]) => Promise<unknown> };

export class BackgroundGizmos {
  private static previewBg:    PIXI.Sprite | null = null;
  private static bgYScaleTemp: number | null = null;
  private static currentHtml:  HTMLElement | null = null;
  private static drag:         BgDrag | null = null;
  private static keyHandler:   ((e: KeyboardEvent) => void) | null = null;
  private static wheelHandler: ((e: WheelEvent) => void) | null = null;
  private static readonly onMove = (e: PointerEvent) => BackgroundGizmos.handleMove(e);
  private static readonly onUp   = (e: PointerEvent) => BackgroundGizmos.handleUp(e);

  static activate(): void {
    Hooks.on("renderGridConfig", BackgroundGizmos.onRenderGridConfig);
    Hooks.on("closeGridConfig",  BackgroundGizmos.onCloseGridConfig);
    Hooks.on("canvasReady",      BackgroundGizmos.clearAll);
  }

  static getTempYScale(): number {
    return BackgroundGizmos.bgYScaleTemp
      ?? (canvas.scene?.getFlag(MODULE_ID, "backgroundYScale") as number | undefined) ?? 1;
  }

  private static isEnabled(): boolean { return canvas.scene != null; }

  private static onRenderGridConfig(app: GCApp, html: HTMLElement): void {
    if (!BackgroundGizmos.isEnabled()) return;
    BackgroundGizmos.currentHtml = html;
    const curYS = (canvas.scene?.getFlag(MODULE_ID, "backgroundYScale") as number | undefined) ?? 1;
    BackgroundGizmos.bgYScaleTemp = curYS;
    // Cache preview bg BEFORE our layer exists — reverse-search would find our layer otherwise.
    if (!BackgroundGizmos.previewBg) {
      const kids = (canvas.app?.stage as unknown as { children: PIXI.Container[] }).children;
      for (let i = kids.length - 1; i >= 0; i--) { const c = kids[i];
        if (c instanceof PIXI.Container && c.constructor === PIXI.Container) { const bg = c.children[1]; if (bg instanceof PIXI.Sprite) BackgroundGizmos.previewBg = bg; break; }
      }
    }
    if (!html.querySelector('#isoroll-bg-yscale')) {
      html.querySelector('[name="scale"]')?.closest('.form-group')?.insertAdjacentHTML('afterend',
        `<div class="form-group"><label for="isoroll-bg-yscale">Vertical Scale</label>` +
        `<div class="form-fields"><input type="number" id="isoroll-bg-yscale" ` +
        `step="0.001" min="0.05" max="5.00" value="${curYS.toFixed(3)}"></div>` +
        `<p class="hint">Use CTRL+Mousewheel or CTRL+Up Arrow and CTRL+Down Arrow to adjust the vertical scale.</p></div>`);
      (html.querySelector('#isoroll-bg-yscale') as HTMLInputElement | null)?.addEventListener('change', (e) => {
        BackgroundGizmos.bgYScaleTemp = Math.max(0.05, Math.min(5, Number((e.target as HTMLInputElement).value) || 1));
        BackgroundGizmos.show();
      });
    }
    if (typeof app._processSubmitData === 'function') {
      const orig = app._processSubmitData.bind(app);
      app._processSubmitData = async (...a: unknown[]) => {
        await orig(...a);
        const ys = BackgroundGizmos.bgYScaleTemp;
        if (ys !== null) await canvas.scene?.setFlag(MODULE_ID, "backgroundYScale", ys);
      };
    }
    if (BackgroundGizmos.keyHandler) document.removeEventListener('keydown', BackgroundGizmos.keyHandler);
    if (BackgroundGizmos.wheelHandler) document.removeEventListener('wheel', BackgroundGizmos.wheelHandler);
    BackgroundGizmos.keyHandler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !["KeyW","ArrowUp","KeyS","ArrowDown"].includes(e.code)) return;
      e.preventDefault(); e.stopPropagation();
      BackgroundGizmos.scaleVerticalStep(["KeyW","ArrowUp"].includes(e.code) ? 1 : -1);
    };
    BackgroundGizmos.wheelHandler = (e: WheelEvent) => { if (!e.ctrlKey) return; e.preventDefault(); BackgroundGizmos.scaleVerticalStep(e.deltaY < 0 ? 1 : -1); };
    document.addEventListener('keydown', BackgroundGizmos.keyHandler);
    document.addEventListener('wheel', BackgroundGizmos.wheelHandler, { passive: false });
    html.addEventListener('change', () => requestAnimationFrame(() => BackgroundGizmos.show()));
    BackgroundGizmos.show();
  }

  private static onCloseGridConfig(): void {
    if (BackgroundGizmos.keyHandler) { document.removeEventListener('keydown', BackgroundGizmos.keyHandler); BackgroundGizmos.keyHandler = null; }
    if (BackgroundGizmos.wheelHandler) { document.removeEventListener('wheel', BackgroundGizmos.wheelHandler); BackgroundGizmos.wheelHandler = null; }
    BackgroundGizmos.bgYScaleTemp = null; BackgroundGizmos.currentHtml = null;
    BackgroundGizmos.previewBg = null; BackgroundGizmos.clearAll();
  }

  static show(): void {
    BackgroundGizmos.clearLayer();
    if (!BackgroundGizmos.isEnabled() || !BackgroundGizmos.currentHtml) return;
    const html  = BackgroundGizmos.currentHtml;
    const layer = LayerManager.ensureLayer(LAYER_KEYS.BG_GIZMOS);
    const proj  = getProjection(canvas.scene);
    const _po   = CanvasTransform.previewOverride;
    const isoCT = (_po?.enabled ?? (canvas.scene?.getFlag(MODULE_ID, "enabled") === true)) && !(_po?.transformBg ?? (canvas.scene?.getFlag(MODULE_ID, "transformBackground") === true));
    const cosR  = isoCT ? Math.cos(proj.reverseRotation) : 1;
    const sinR  = isoCT ? Math.sin(proj.reverseRotation) : 0;
    const previewBg = BackgroundGizmos.previewBg;
    if (!previewBg) return;
    const texW = previewBg.texture?.width || 1, texH = previewBg.texture?.height || 1;
    const bgX = previewBg.x, bgY = previewBg.y, bgW = previewBg.width || 1;
    const sx   = bgW / texW;
    const bgYS = BackgroundGizmos.bgYScaleTemp ?? 1;
    const scX  = isoCT ? sx * proj.counterFactor : sx;
    const scY  = isoCT ? sx * proj.ratio * proj.counterFactor * bgYS : sx;
    const cx   = bgX + bgW / 2, cy = bgY + texH * sx / 2;
    const baseH = Math.max(1, texH * sx * proj.ratio * proj.counterFactor / 2);
    const [tr, tc, bl, tl, br] = [[.5,-.5],[0,-.5],[-.5,.5],[-.5,-.5],[.5,.5]]
      .map(([fx,fy]) => bgCorner(fx, fy, cx, cy, texW, texH, scX, scY, cosR, sinR));
    const m      = canvas.app!.stage.worldTransform;
    const topSc  = Math.hypot(m.a*cosR + m.c*sinR, m.b*cosR + m.d*sinR);
    const leftSc = Math.hypot(-m.a*sinR + m.c*cosR, -m.b*sinR + m.d*cosR);
    const g = new PIXI.Graphics();
    drawDashedContour(g, [tl, tr, br, bl], 8, 5, leftSc > 0 ? 8*topSc/leftSc : 8, leftSc > 0 ? 5*topSc/leftSc : 5); layer.addChild(g);
    const form   = (html.closest('form') ?? html.querySelector('form')) as HTMLFormElement | null;
    const getEl  = (n: string) => form?.elements.namedItem?.(n) as HTMLInputElement | null;
    const shiftX = Number(getEl('shiftX')?.value) || 0;
    const shiftY = Number(getEl('shiftY')?.value) || 0;
    const scale  = Number(getEl('scale')?.value) || sx;
    const sCX    = m.a * cx + m.c * cy + m.tx, sCY = m.b * cx + m.d * cy + m.ty;
    const defs: [PIXI.Container, BgDrag["type"], { x: number; y: number }][] = [
      [makeSquareCounterHandle(0xffffff, "nwse-resize"), "bgScale",     tr],
      [makeElevHandle(0xffffff, "move"),                 "bgTranslate", bl],
    ];
    if (isoCT) defs.splice(1, 0, [makeSquareCounterHandle(0xffffff, "ns-resize"), "bgYScale", tc]);
    for (const [handle, type, pos] of defs) {
      handle.x = pos.x; handle.y = pos.y;
      handle.on("pointerdown", (e: PIXI.FederatedPointerEvent) => { e.stopPropagation(); BackgroundGizmos.beginDrag(type, e.global.x, e.global.y, scale, sCX, sCY, bgYS, baseH, shiftX, shiftY); });
      layer.addChild(handle);
    }
    LayerManager.bringToTop(LAYER_KEYS.BG_GIZMOS);
  }

  private static scaleVerticalStep(delta: number): void {
    const html = BackgroundGizmos.currentHtml; if (!html) return;
    BackgroundGizmos.bgYScaleTemp = Math.max(0.05, Math.min(5.0, Math.round(((BackgroundGizmos.bgYScaleTemp ?? 1) + delta * 0.01) * 1000) / 1000));
    const el = html.querySelector('#isoroll-bg-yscale') as HTMLInputElement | null;
    if (el) el.value = BackgroundGizmos.bgYScaleTemp.toFixed(3);
    BackgroundGizmos.show();
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
    BackgroundGizmos.drag = { type, startGX: gx, startGY: gy, startScale, startScreenCX: sCX, startScreenCY: sCY, startBgYScale: startBgYS, startBgHalfH: startBgH, startShiftX: startSX, startShiftY: startSY };
    window.addEventListener("pointermove", BackgroundGizmos.onMove);
    window.addEventListener("pointerup",   BackgroundGizmos.onUp, { once: true });
  }

  private static commit(drag: BgDrag, gx: number, gy: number): void {
    commitBgDrag(drag, gx, gy, BackgroundGizmos.currentHtml, (ys) => {
      BackgroundGizmos.bgYScaleTemp = ys;
      const ye = document.querySelector('#isoroll-bg-yscale') as HTMLInputElement | null;
      if (ye) ye.value = ys.toFixed(3);
      BackgroundGizmos.show();
    });
  }

  private static handleMove(e: PointerEvent): void {
    if (!BackgroundGizmos.drag) return;
    e.preventDefault();
    const { x: gx, y: gy } = clientToGlobal(e.clientX, e.clientY);
    BackgroundGizmos.commit(BackgroundGizmos.drag, gx, gy);
  }

  private static handleUp(e: PointerEvent): void {
    window.removeEventListener("pointermove", BackgroundGizmos.onMove);
    const drag = BackgroundGizmos.drag; BackgroundGizmos.drag = null;
    if (!drag) return;
    const { x: gx, y: gy } = clientToGlobal(e.clientX, e.clientY);
    BackgroundGizmos.commit(drag, gx, gy);
  }
}
