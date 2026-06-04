// Shared async scheduling utility.
export function scheduleWrap(fn: () => Promise<void>, label: string, delay = 0): void {
  setTimeout(() => fn().catch(e => console.warn(`isoroll | ${label} failed`, e)), delay);
}

export function canvasZoom(): number {
  return (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
}

export function gridDistance(): number {
  return (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;
}

export function elevToCanvas(elev: number, gs: number, gd: number): number {
  return elev * gs / gd;
}

export function screenToCanvas(
  dx: number, dy: number,
  wt: { a: number; b: number; c: number; d: number },
): { x: number; y: number } {
  const det = wt.a * wt.d - wt.b * wt.c;
  return { x: (dx * wt.d - dy * wt.c) / det, y: (-dx * wt.b + dy * wt.a) / det };
}

// Full inverse-affine: converts an absolute screen point to canvas coordinates.
export function screenPointToCanvas(
  sx: number, sy: number,
  wt: { a: number; b: number; c: number; d: number; tx: number; ty: number },
): { x: number; y: number } {
  const det = wt.a * wt.d - wt.b * wt.c;
  return {
    x: ( (sx - wt.tx) * wt.d - (sy - wt.ty) * wt.c) / det,
    y: (-(sx - wt.tx) * wt.b + (sy - wt.ty) * wt.a) / det,
  };
}

export function startPointerDrag<T>(
  drag: T,
  onMove: (drag: T, e: PointerEvent) => void,
  onUp:   (drag: T, e: PointerEvent) => void,
): void {
  const handleMove = (e: PointerEvent) => { e.preventDefault(); onMove(drag, e); };
  const handleUp   = (e: PointerEvent) => {
    window.removeEventListener("pointermove", handleMove);
    onUp(drag, e);
  };
  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup",   handleUp, { once: true });
}
