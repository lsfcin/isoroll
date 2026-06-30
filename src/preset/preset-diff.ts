// Change-detection helpers: flag-key sets and changed-field predicates.

import { MODULE_ID } from "../core";
export const TILE_PRESET_KEYS  = new Set(["boundHeight","imageScale","imageYScale","imageOffset","tileFlipped","foregroundTile","linkedWallIds"]);
export const TOKEN_PRESET_KEYS = new Set(["boundHeight","imageScale","imageYScale","imageOffset","tileFlipped"]);
export const BG_PRESET_FLAG_KEYS = new Set(["backgroundYScale"]);

export function changedFlagKeys(changes: Record<string, unknown>): Set<string> {
  const flags = changes.flags as Record<string, unknown> | undefined;
  const f = flags?.[MODULE_ID];
  let result: Set<string>;
  if (!f || typeof f !== "object") {
    result = new Set();
  } else {
    const keys = Object.keys(f as object);
    result = new Set(keys);
  }
  return result;
}

export function intersects(a: Set<string>, b: Set<string>): boolean {
  let result = false;
  for (const k of a) {
    if (b.has(k)) {
      result = true;
      break;
    }
  }
  return result;
}

export function bgNativeChanged(c: Record<string, unknown>): boolean {
  const bg = c.background as Record<string, unknown> | undefined;
  const gr = c.grid as Record<string, unknown> | undefined;
  const bgScaleX = bg?.scaleX !== undefined;
  const bgOffsetX = bg?.offsetX !== undefined;
  const bgOffsetY = bg?.offsetY !== undefined;
  const grSize = gr?.size !== undefined;
  return !!(bgScaleX || bgOffsetX || bgOffsetY || grSize);
}

export const tileNativeChanged = (c: Record<string, unknown>) => c.width !== undefined || c.height !== undefined;
