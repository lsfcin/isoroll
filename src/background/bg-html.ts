// GridConfig HTML injection: Vertical Scale field, key/wheel handlers, _processSubmitData patch.
import { MODULE_ID } from "../flags";
import { getBgYScale, setBgYScaleOverride } from "../transform/bg-transform";

type GCApp = { _processSubmitData?: (...a: unknown[]) => Promise<unknown> };

export class BgHtml {
  static currentHtml:  HTMLElement | null = null;
  static previewBg:    PIXI.Sprite | null = null;
  private static keyHandler:   ((e: KeyboardEvent) => void) | null = null;
  private static wheelHandler: ((e: WheelEvent) => void) | null = null;
  private static onShow: (() => void) | null = null;

  static activate(onShow: () => void, onClearAll: () => void): void {
    BgHtml.onShow = onShow;
    Hooks.on("renderGridConfig", (app: GCApp, html: HTMLElement) => BgHtml.onRenderGridConfig(app, html));
    Hooks.on("closeGridConfig",  () => BgHtml.onCloseGridConfig(onClearAll));
  }

  private static onRenderGridConfig(app: GCApp, html: HTMLElement): void {
    if (canvas.scene == null) return;
    BgHtml.currentHtml = html;
    const curYS = (canvas.scene?.getFlag(MODULE_ID, "backgroundYScale") as number | undefined) ?? 1;
    setBgYScaleOverride(curYS);
    // Re-cache on every render: Reset Changes destroys + recreates the preview container,
    // making any stale previewBg reference point to a destroyed sprite.
    // BG_GIZMOS layer children are Graphics/Container, not Sprites, so the search safely
    // skips it and finds the GCT preview container's background sprite.
    BgHtml.previewBg = null;
    const kids = (canvas.app?.stage as unknown as { children: PIXI.Container[] }).children;
    for (let i = kids.length - 1; i >= 0; i--) { const c = kids[i];
      if (c instanceof PIXI.Container && c.constructor === PIXI.Container) { const bg = c.children[1]; if (bg instanceof PIXI.Sprite) BgHtml.previewBg = bg; break; }
    }
    if (!html.querySelector('#isoroll-bg-yscale')) {
      html.querySelector('[name="scale"]')?.closest('.form-group')?.insertAdjacentHTML('afterend',
        `<div class="form-group"><label for="isoroll-bg-yscale">Vertical Scale</label>` +
        `<div class="form-fields"><input type="number" id="isoroll-bg-yscale" ` +
        `step="0.001" min="0.05" max="5.00" value="${curYS.toFixed(3)}"></div>` +
        `<p class="hint">Use CTRL+Mousewheel or CTRL+Up/Down Arrow to adjust the vertical scale.</p></div>`);
      (html.querySelector('#isoroll-bg-yscale') as HTMLInputElement | null)?.addEventListener('change', (e) => {
        setBgYScaleOverride(Math.max(0.05, Math.min(5, Number((e.target as HTMLInputElement).value) || 1)));
        BgHtml.onShow?.();
      });
    }
    if (typeof app._processSubmitData === 'function') {
      const orig = app._processSubmitData.bind(app);
      app._processSubmitData = async (...a: unknown[]) => {
        await orig(...a);
        await canvas.scene?.setFlag(MODULE_ID, "backgroundYScale", getBgYScale());
      };
    }
    if (BgHtml.keyHandler)   document.removeEventListener('keydown', BgHtml.keyHandler);
    if (BgHtml.wheelHandler) document.removeEventListener('wheel',   BgHtml.wheelHandler);
    BgHtml.keyHandler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !["KeyW","ArrowUp","KeyS","ArrowDown"].includes(e.code)) return;
      e.preventDefault(); e.stopPropagation();
      BgHtml.scaleVerticalStep(["KeyW","ArrowUp"].includes(e.code) ? 1 : -1);
    };
    BgHtml.wheelHandler = (e: WheelEvent) => { if (!e.ctrlKey) return; e.preventDefault(); BgHtml.scaleVerticalStep(e.deltaY < 0 ? 1 : -1); };
    document.addEventListener('keydown', BgHtml.keyHandler);
    document.addEventListener('wheel',   BgHtml.wheelHandler, { passive: false });
    html.addEventListener('change', () => requestAnimationFrame(() => BgHtml.onShow?.()));
    BgHtml.onShow?.();
  }

  private static onCloseGridConfig(onClearAll: () => void): void {
    if (BgHtml.keyHandler)   { document.removeEventListener('keydown', BgHtml.keyHandler);   BgHtml.keyHandler   = null; }
    if (BgHtml.wheelHandler) { document.removeEventListener('wheel',   BgHtml.wheelHandler); BgHtml.wheelHandler = null; }
    setBgYScaleOverride(null);
    BgHtml.currentHtml = null;
    BgHtml.previewBg   = null;
    onClearAll();
  }

  static scaleVerticalStep(delta: number): void {
    const html = BgHtml.currentHtml; if (!html) return;
    const newYS = Math.max(0.05, Math.min(5.0, Math.round((getBgYScale() + delta * 0.01) * 1000) / 1000));
    setBgYScaleOverride(newYS);
    const input = html.querySelector('#isoroll-bg-yscale') as HTMLInputElement | null;
    if (input) input.value = newYS.toFixed(3);
    BgHtml.onShow?.();
  }

  static syncYScaleInput(ys: number): void {
    const ye = document.querySelector('#isoroll-bg-yscale') as HTMLInputElement | null;
    if (ye) ye.value = ys.toFixed(3);
  }
}
