// Shared double-click detection for wall overlay handles.

import { wallsLayer } from "./wall-coords";

export function wallDblClick(wallId: string, last: { t: number }): boolean {
  const now = Date.now();
  let result = false;
  if (now - last.t < 350 && last.t !== 0) {
    last.t = 0;
    const layer = wallsLayer();
    const wall = layer.get(wallId);
    const sheet = (wall as unknown as { sheet?: { render(f: boolean): void } })?.sheet;
    sheet?.render(true);
    result = true;
  } else {
    last.t = now;
  }
  return result;
}
