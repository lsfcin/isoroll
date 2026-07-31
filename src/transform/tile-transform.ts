// Tile counter-transform hooks: refreshTile, flag-change trigger, flip mirroring, grid rescale.
// The geometry (scale, anchor, position) lives in tile-mesh-place.ts.

import { MODULE_ID, VolumeFlags } from "../core";
import { CanvasTransform } from "./stage-transform";
import { applyMeshTransform, EPS, type MutMeshLike } from "./tile-mesh-place";

export { onPreUpdateScene, onUpdateSceneGridRescale } from "./tile-transform-rescale";
export { EPS } from "./tile-mesh-place";
export type { MutMeshLike } from "./tile-mesh-place";

const DEBUG_ANCHOR = false;

// setFlag() updates don't set any Tile render flags → refreshTile never fires.
// Detect isoroll flag changes and manually trigger refreshMesh (fires refreshTile without resetting mesh.x/y).
export function onUpdateTileFlags(doc: unknown, changes: Record<string, unknown>): void {
  const flagChanges = (changes as { flags?: Record<string, unknown> }).flags;
  if (flagChanges?.[MODULE_ID]) {
    const tile = (doc as { object?: unknown }).object;
    if (DEBUG_ANCHOR) {
      console.log(
        "[isoroll] onUpdateTileFlags: isoroll flags changed",
        flagChanges[MODULE_ID],
        "tile object:",
        tile ? "found" : "null",
      );
    }
    if (tile) {
      type HasRenderFlags = { renderFlags?: { set(f: Record<string, boolean>): void } };
      const t = tile as HasRenderFlags;
      if (t.renderFlags) {
        t.renderFlags.set({ refreshMesh: true });
      }
    }
  }
}

// preUpdateTile: toggling tileFlipped without a deliberate imageOffset change (TileConfig
// form path) must mirror the offset, or the art jumps ~2x the offset and users hand-patch
// docs/offsets into corrupted calibrations (B34). swapSide sends a changed offset -> skip.
export function onPreUpdateTileFlip(doc: unknown, changes: Record<string, unknown>): void {
  const iso = (changes as { flags?: Record<string, Record<string, unknown>> }).flags?.[MODULE_ID];
  const hasFlip = iso !== undefined && "tileFlipped" in iso;
  if (hasFlip) {
    const fd = doc as { getFlag(s: string, k: string): unknown };
    const current = VolumeFlags.getTileFlipped(fd as never);
    const next = !!iso.tileFlipped;
    const currOff = VolumeFlags.getImageOffset(fd);
    const nextOff = iso.imageOffset as { x: number; y: number } | undefined;
    let offChanged = false;
    if (nextOff !== undefined) {
      const dx = Math.abs(nextOff.x - currOff.x);
      const dy = Math.abs(nextOff.y - currOff.y);
      offChanged = dx > EPS || dy > EPS;
    }
    if (next !== current && !offChanged) {
      iso.imageOffset = VolumeFlags.mirrorImageOffset(currOff);
    }
  }
}

type HasRefresh = { _refreshRotation(): void; _refreshSize(): void; _refreshPosition(): void };

function applyNativeRefresh(tile: Tile): void {
  const t = tile as unknown as HasRefresh;
  if (t._refreshRotation) {
    t._refreshRotation();
  }
  if (t._refreshSize) {
    t._refreshSize();
  }
  if (t._refreshPosition) {
    t._refreshPosition();
  }
}

export function onRefreshTile(tile: Tile, _flags?: Record<string, boolean>): void {
  if (CanvasTransform.effectiveEnabled()) {
    if (tile.document.getFlag(MODULE_ID, "transformTile") === true) {
      // Reset mesh to native Foundry state: undo any counter-transform (rotation, scale, position
      // offset) that may have been left by a prior transformTile=false refresh.
      applyNativeRefresh(tile);
    } else {
      const mesh = tile.mesh as unknown as MutMeshLike | null | undefined;
      if (mesh) {
        applyMeshTransform(tile, mesh);
      }
    }
  }
}
