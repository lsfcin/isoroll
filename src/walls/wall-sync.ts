// Linked-wall position synchronization when a tile moves or flips.
import { MODULE_ID } from "../volume/flags";
import type { TileAnchor } from "./wall-types";
import { wallsLayer, scene, imageRect, anchorToCanvas, type TileDoc } from "./wall-coords";
import { getLinkedWallIds } from "./wall-flags";

export async function updateLinkedWallPositions(doc: TileDocument): Promise<void> {
  const ids = getLinkedWallIds(doc);
  if (!ids.length) return;
  const { icx, icy, sw, sh } = imageRect(doc as TileDoc);
  const updates: { _id: string; c: [number, number, number, number] }[] = [];
  for (const id of ids) {
    const wall = wallsLayer().get(id);
    if (!wall) continue;
    const anchor = wall.document.getFlag(MODULE_ID, "tileAnchor") as TileAnchor | undefined;
    if (!anchor) continue;
    updates.push({ _id: id, c: anchorToCanvas(icx, icy, sw, sh, anchor) });
  }
  if (!updates.length) return;
  await scene().updateEmbeddedDocuments("Wall", updates, { isoroll: "wallMove" });
}

// swapSide mirrors the tile image in screen-X through the tile center.
// In all isoroll projections screen_x ∝ (cx+cy), so mirroring screen-X maps:
//   new_canvas_x = doc.x + doc.y - old_canvas_y
//   new_canvas_y = doc.x + doc.y - old_canvas_x
// swapSide also swaps doc.width↔doc.height, so re-anchoring in the new footprint gives:
//   new_ax = 1 - old_ay,  new_ay = 1 - old_ax  (and same for b endpoint)
// dimensionsSwapped=false (pure flip, no size change): simple canvas-X mirror → new_ax = 1-ax.
export async function flipLinkedWallAnchorsX(doc: TileDocument, dimensionsSwapped: boolean): Promise<void> {
  const ids = getLinkedWallIds(doc);
  if (!ids.length) return;
  const { icx, icy, sw, sh } = imageRect(doc as TileDoc);
  const updates: { _id: string; c: [number, number, number, number]; flags: object }[] = [];
  for (const id of ids) {
    const wall = wallsLayer().get(id);
    if (!wall) continue;
    const anchor = wall.document.getFlag(MODULE_ID, "tileAnchor") as TileAnchor | undefined;
    if (!anchor) continue;
    const flipped: TileAnchor = dimensionsSwapped
      ? { ax: 1 - anchor.ay, ay: 1 - anchor.ax, bx: 1 - anchor.by, by: 1 - anchor.bx }
      : { ax: 1 - anchor.ax, ay: anchor.ay,       bx: 1 - anchor.bx, by: anchor.by };
    updates.push({
      _id: id,
      c: anchorToCanvas(icx, icy, sw, sh, flipped),
      flags: { [MODULE_ID]: { tileAnchor: flipped } },
    });
  }
  if (!updates.length) return;
  await scene().updateEmbeddedDocuments("Wall", updates, { isoroll: "wallMove" });
}
