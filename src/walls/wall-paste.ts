// Tile paste/duplicate wall cloning — preserves linked walls across copy operations (B30).
import { MODULE_ID, scheduleWrap } from "../core";
import { getLinkedWallIds } from "./wall-flags";
import { extractWallDefs, applyWallDefs } from "./wall-crud";
import type { WallDef } from "./wall-types";

export const pendingPasteWalls: Map<string, WallDef[]> = new Map();

export function onPreCreateTilePaste(doc: TileDocument): void {
  const staleIds = getLinkedWallIds(doc);
  if (!staleIds.length) {
    return;
  }
  const defs = extractWallDefs(doc);
  // Clear stale IDs so preset's deleteLinkedWalls cannot reach the original tile's walls.
  (doc as unknown as { updateSource?(d: object): void }).updateSource?.({
    flags: { [MODULE_ID]: { linkedWallIds: [] } },
  });
  if (defs.length) {
    pendingPasteWalls.set(doc.id!, defs);
  }
}

export function onCreateTilePaste(doc: TileDocument): void {
  const defs = pendingPasteWalls.get(doc.id!);
  pendingPasteWalls.delete(doc.id!);
  if (!defs) {
    return;
  }
  // Only clone walls when the preset did not already apply its own walls.
  if (!getLinkedWallIds(doc).length) {
    scheduleWrap(() => applyWallDefs(doc, defs), "paste wall clone", 0);
  }
}
