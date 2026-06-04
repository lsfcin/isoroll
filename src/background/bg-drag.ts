// Drag math for BackgroundGizmos: translate, uniform scale, Y-scale.

export type BgDrag = {
  type: "bgScale" | "bgYScale" | "bgTranslate";
  startGX: number; startGY: number;
  startScale: number; startScreenCX: number; startScreenCY: number;
  startBgYScale: number; startBgHalfH: number;
  startShiftX: number; startShiftY: number;
};

export const BG_YSCALE_SNAP_PX = 12;

export function commitBgDrag(
  drag: BgDrag, gx: number, gy: number, html: HTMLElement | null,
  onYScale: (v: number) => void,
): void {
  if (!html) return;
  const form = (html.closest('form') ?? html.querySelector('form')) as HTMLFormElement | null;
  const field         = (n: string) => form?.elements.namedItem?.(n) as HTMLInputElement | null;
  const triggerChange = (n: string) => field(n)?.dispatchEvent(new Event("change", { bubbles: true }));
  const dx = gx - drag.startGX, dy = gy - drag.startGY;
  const wt    = canvas.app!.stage.worldTransform;
  const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
  if (drag.type === "bgTranslate") {
    const det = wt.a * wt.d - wt.b * wt.c;
    const xe = field('shiftX'), ye = field('shiftY');
    if (xe) xe.value = String(Math.round(drag.startShiftX - (dx * wt.d - dy * wt.c) / det));
    if (ye) ye.value = String(Math.round(drag.startShiftY - (-dx * wt.b + dy * wt.a) / det));
    triggerChange('shiftX');
  } else if (drag.type === "bgScale") {
    const rx = drag.startGX - drag.startScreenCX, ry = drag.startGY - drag.startScreenCY;
    const ref2 = rx * rx + ry * ry;
    if (ref2 > 0) {
      const dot = (gx - drag.startScreenCX) * rx + (gy - drag.startScreenCY) * ry;
      const scl = field('scale');
      if (scl) { scl.value = Math.max(0.25, Math.min(10, drag.startScale * dot / ref2)).toFixed(3); triggerChange('scale'); }
    }
  } else {
    const det = wt.a * wt.d - wt.b * wt.c;
    let ys = Math.max(0.05, (drag.startBgHalfH * drag.startBgYScale - (-dx * wt.b + dy * wt.a) / det) / drag.startBgHalfH);
    if (Math.abs(ys - 1.0) * drag.startBgHalfH * zoom < BG_YSCALE_SNAP_PX) ys = 1.0;
    onYScale(ys);
  }
}
