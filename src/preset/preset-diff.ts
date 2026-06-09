// Change-detection helpers: flag-key sets and changed-field predicates.
import { MODULE_ID } from "../flags";

export const TILE_PRESET_KEYS  = new Set(["boundHeight","imageScale","imageYScale","imageOffset","tileFlipped","foregroundTile","linkedWallIds"]);
export const TOKEN_PRESET_KEYS = new Set(["boundHeight","imageScale","imageYScale","imageOffset","tileFlipped"]);
export const BG_PRESET_FLAG_KEYS = new Set(["backgroundYScale"]);

export function changedFlagKeys(changes: Record<string, unknown>): Set<string> {
  const f = (changes.flags as Record<string, unknown> | undefined)?.[MODULE_ID];
  if (!f || typeof f !== "object") return new Set();
  return new Set(Object.keys(f as object));
}
export const intersects      = (a: Set<string>, b: Set<string>) => { for (const k of a) if (b.has(k)) return true; return false; };
export const bgNativeChanged = (c: Record<string, unknown>) => { const bg = c.background as Record<string, unknown> | undefined; const gr = c.grid as Record<string, unknown> | undefined; return !!(bg?.scaleX !== undefined || bg?.offsetX !== undefined || bg?.offsetY !== undefined || gr?.size !== undefined); };
export const tileNativeChanged = (c: Record<string, unknown>) => c.width !== undefined || c.height !== undefined;
