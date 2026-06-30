// Drag math for BackgroundGizmos: translate, uniform scale, Y-scale.

import { canvasZoom, screenToCanvas, CanvasEnv } from "../core";
export type BgDrag = {
  type: "bgScale" | "bgYScale" | "bgTranslate";
  startGX: number; startGY: number;
  startScale: number; startScreenCX: number; startScreenCY: number;
  startBgYScale: number; startBgHalfH: number;
  startShiftX: number; startShiftY: number;
};

export const BG_YSCALE_SNAP_PX = 12;

type Field = (n: string) => HTMLInputElement | null;
type TriggerChange = (n: string) => void;

function _applyTranslate(
  drag: BgDrag, dx: number, dy: number, wt: object,
  field: Field, triggerChange: TriggerChange,
): void {
  const { x: cdx, y: cdy } = screenToCanvas(dx, dy, wt);
  const xe = field('shiftX');
  const ye = field('shiftY');
  if (xe) {
    const roundedX = Math.round(drag.startShiftX - cdx);
    xe.value = String(roundedX);
  }
  if (ye) {
    const roundedY = Math.round(drag.startShiftY - cdy);
    ye.value = String(roundedY);
  }
  triggerChange('shiftX');
}

function _applyScale(
  drag: BgDrag, gx: number, gy: number,
  field: Field, triggerChange: TriggerChange,
): void {
  const rx = drag.startGX - drag.startScreenCX;
  const ry = drag.startGY - drag.startScreenCY;
  const ref2 = rx * rx + ry * ry;
  if (ref2 > 0) {
    const dot = (gx - drag.startScreenCX) * rx + (gy - drag.startScreenCY) * ry;
    const scl = field('scale');
    if (scl) {
      const rawScale    = drag.startScale * dot / ref2;
      const clampedLow  = Math.max(0.25, rawScale);
      const clampedHigh = Math.min(10, clampedLow);
      scl.value = clampedHigh.toFixed(3);
      triggerChange('scale');
    }
  }
}

function _applyYScale(
  drag: BgDrag, dx: number, dy: number, wt: object,
  zoom: number, onYScale: (v: number) => void,
): void {
  const canvasDelta = screenToCanvas(dx, dy, wt);
  const rawYs  = (drag.startBgHalfH * drag.startBgYScale - canvasDelta.y) / drag.startBgHalfH;
  let ys       = Math.max(0.05, rawYs);
  const snapDist = Math.abs(ys - 1.0) * drag.startBgHalfH * zoom;
  if (snapDist < BG_YSCALE_SNAP_PX) {
    ys = 1.0;
  }
  onYScale(ys);
}

export function commitBgDrag(
  drag: BgDrag, gx: number, gy: number, html: HTMLElement | null,
  onYScale: (v: number) => void,
): void {
  if (!html) {
    return;
  }
  const formViaClosest = html.closest('form');
  const formViaQuery   = html.querySelector('form');
  const form = (formViaClosest ?? formViaQuery) as HTMLFormElement | null;
  const field         = (n: string) => form?.elements.namedItem?.(n) as HTMLInputElement | null;
  const triggerChange = (n: string) => field(n)?.dispatchEvent(new Event("change", { bubbles: true }));
  const dx   = gx - drag.startGX;
  const dy   = gy - drag.startGY;
  const wt   = CanvasEnv.worldTransform();
  const zoom = canvasZoom();
  if (drag.type === "bgTranslate") {
    _applyTranslate(drag, dx, dy, wt, field, triggerChange);
  } else if (drag.type === "bgScale") {
    _applyScale(drag, gx, gy, field, triggerChange);
  } else {
    _applyYScale(drag, dx, dy, wt, zoom, onYScale);
  }
}
