// Vertical Scale field injection + _processSubmitData patch for GridConfig, extracted from bg-html.ts.
import { CanvasEnv } from "../core";
import { getBgYScale, setBgYScaleOverride } from "../transform";

export type GCApp = { _processSubmitData?: (...a: unknown[]) => Promise<unknown> };

function insertYScaleField(html: HTMLElement, curYS: number): void {
  const scaleField = html.querySelector('[name="scale"]');
  const scaleGroup = scaleField?.closest('.form-group');
  const fieldHtml = `<div class="form-group"><label for="isoroll-bg-yscale">Vertical Scale</label>` +
    `<div class="form-fields"><input type="number" id="isoroll-bg-yscale" ` +
    `step="0.001" min="0.05" max="5.00" value="${curYS.toFixed(3)}"></div>` +
    `<p class="hint">Use CTRL+Mousewheel or CTRL+Up/Down Arrow to adjust the vertical scale.</p></div>`;
  scaleGroup?.insertAdjacentHTML('afterend', fieldHtml);
}

function bindYScaleInput(html: HTMLElement, onShow: () => void): void {
  const input = html.querySelector('#isoroll-bg-yscale') as HTMLInputElement | null;
  input?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    const raw = Number(target.value) || 1;
    const minClamped = Math.min(5, raw);
    const clamped = Math.max(0.05, minClamped);
    setBgYScaleOverride(clamped);
    onShow();
  });
}

function patchSubmitData(app: GCApp): void {
  const hasHook = typeof app._processSubmitData === 'function';
  if (hasHook) {
    const orig = app._processSubmitData!.bind(app);
    app._processSubmitData = async (...a: unknown[]) => {
      await orig(...a);
      const ys = getBgYScale();
      await CanvasEnv.setSceneFlag("backgroundYScale", ys);
    };
  }
}

export function setupYScaleField(html: HTMLElement, app: GCApp, onShow: () => void): void {
  const curYS = CanvasEnv.sceneFlag<number>("backgroundYScale") ?? 1;
  setBgYScaleOverride(curYS);
  insertYScaleField(html, curYS);
  bindYScaleInput(html, onShow);
  patchSubmitData(app);
}
