// Implementation helpers for WallManager hook handlers (split out to stay under 200 lines).

import { MODULE_ID, VolumeFlags, scheduleWrap, CanvasEnv } from "../core";
import { getLinkedWallIds } from "./wall-flags";
import { updateLinkedWallPositions, flipLinkedWallAnchorsX } from "./wall-sync";
import { canvasToAnchor, scene, type TileDoc } from "./wall-coords";
import { applyDoorBehavior } from "./wall-door";
import { WallOverlay } from "./wall-overlay";
import { upsertTile, debounced, tileUpsertTimers } from "../preset";

function wrap(fn: () => Promise<void>, label: string): void {
  scheduleWrap(fn, label, 0);
}

export function handleNativeSizeChange(
  doc: TileDocument,
  changes: Record<string, unknown>,
  isoFlags: Record<string, unknown>,
  options: Record<string, unknown>,
  preSizes: Map<string, { w: number; h: number }>,
): boolean {
  const sizeChanged        = "width" in changes || "height" in changes;
  const tileFlippedChanged = "tileFlipped" in isoFlags;
  const boundHChanged      = "boundHeight" in isoFlags;
  let tileHadWalls = false;
  if (sizeChanged && !tileFlippedChanged && !boundHChanged && !options.isoroll) {
    const pre = preSizes.get(doc.id!);
    preSizes.delete(doc.id!);
    if (pre) {
      const oldMax = Math.max(pre.w, pre.h);
      const newMax = Math.max(doc.width ?? 0, doc.height ?? 0);
      if (oldMax > 0 && Math.abs(newMax / oldMax - 1) > 1e-4) {
        const ratio    = newMax / oldMax;
        const newBoundH = VolumeFlags.getTileHeight(doc) * ratio;
        wrap(async () => {
          await doc.update({
            [`flags.${MODULE_ID}.boundHeight`]:     newBoundH,
            [`flags.${MODULE_ID}.boundHeightBase`]: { w: doc.width ?? 0, h: doc.height ?? 0 },
          }, { isoroll: "gizmoDrag", isUndo: true });
        }, "boundH rescale");
        tileHadWalls = !!getLinkedWallIds(doc).length;
      }
    }
  }
  return tileHadWalls;
}

export function scheduleWallUpdate(
  doc: TileDocument,
  changes: Record<string, unknown>,
  isoFlags: Record<string, unknown>,
  tileFlippedChanged: boolean,
  boundHChanged: boolean,
): void {
  const posOrSize         = "x" in changes || "y" in changes || "width" in changes || "height" in changes;
  const elevChanged       = "elevation" in changes;
  const imagePropsChanged = "imageOffset" in isoFlags || "imageScale" in isoFlags;
  if (tileFlippedChanged) {
    const sizeSwapped = "width" in changes && "height" in changes;
    wrap(() => flipLinkedWallAnchorsX(doc, sizeSwapped), "wall flip");
  } else if (posOrSize || elevChanged || imagePropsChanged || boundHChanged) {
    wrap(() => updateLinkedWallPositions(doc), "wall position update");
  }
}

export function doUpdateWall(
  doc: WallDocument,
  changes: Record<string, unknown>,
  options: Record<string, unknown>,
  tileId: string,
  tileObj: Tile,
): void {
  // User manually moved wall in Walls layer → recompute stored anchor.
  // Skipped during grid rescale: Foundry rescales wall c-coords before our tile update fires.
  const noRescale   = !CanvasEnv.isGridRescaling();
  const notWallMove = options.isoroll !== "wallMove" && options.isoroll !== "wallEndpointDrag";
  if (noRescale && notWallMove && "c" in changes) {
    const docWithC = doc as unknown as { c: number[]; updateSource?(d: object): void };
    const c = docWithC.c;
    const anchor = canvasToAnchor(tileObj.document as TileDoc, c);
    // Sync: update in-memory anchor so the RAF-deferred show() reads the new anchor.
    docWithC.updateSource?.({ flags: { [MODULE_ID]: { tileAnchor: anchor } } });
    wrap(async () => {
      const sc = scene();
      await sc.updateEmbeddedDocuments("Wall",
        [{ _id: doc.id, flags: { [MODULE_ID]: { tileAnchor: anchor } } }],
        { isoroll: "anchorUpdate" });
    }, "wall anchor sync");
  }
  WallOverlay.refresh(tileObj);
  debounced(tileUpsertTimers, tileId, () => upsertTile(tileObj.document));
  if ("ds" in changes) {
    wrap(() => applyDoorBehavior(tileObj.document, (changes.ds as number) > 0), "door behavior");
  }
}
