// iso-tile-zsync.ts — per-slice z/visibility assignment and cross-tile peer band resync.
// syncTileZ is the single place slice zIndex is (re)driven outside creation; the peer
// resync re-runs it for every tile when the tile set changes (bands are peer-relative).
import { VolumeFlags, CanvasEnv, scheduleWrap } from "../core";
import { PlaceableDoc, docAlpha } from "./fog-helpers";
import { sliceDepthCell, depthZIndex, tileSortBand } from "./iso-tile-depth";
import type { Mesh, SliceState } from "./iso-tile-geom";
import { syncSlicePos, getMesh } from "./iso-tile-slice-build";
import { tileSlices, tileSliceCuts } from "./iso-tile-state";
import { DEBUG_ZORDER, logSliceZ } from "./iso-tile-zdebug";

// Bounded cross-tile tiebreaker: rank of this tile among all tiles by (sort, id).
export function tileBand(tile: Tile): number {
  const peers: Array<{ id: string; sort: number }> = [];
  for (const t of CanvasEnv.tiles()) {
    const sort = (t.document as unknown as { sort?: number }).sort ?? 0;
    peers.push({ id: t.id, sort });
  }
  return tileSortBand(tile.id, peers);
}

export function syncTileZ(tile: Tile, slices: PIXI.Sprite[], state: SliceState, mesh: Mesh): void {
  const doc = tile.document as unknown as PlaceableDoc;
  const nSlices = state.cuts.length + 1;
  const elev = VolumeFlags.getTileBaseElevation(tile.document);
  const band = tileBand(tile);
  if (DEBUG_ZORDER) {
    const short = tile.id.slice(0, 8);
    console.group(`[zorder:sync] tile=${short} nSlices=${nSlices}`);
  }
  for (let i = 0; i < nSlices; i++) {
    syncSlicePos(slices[i], mesh);
    const cell = sliceDepthCell(i, nSlices, state.cuts, state.fw, state.faces);
    const prevZIndex = DEBUG_ZORDER ? slices[i].zIndex : 0;
    slices[i].zIndex = depthZIndex(cell.row, cell.col, elev, band);
    if (DEBUG_ZORDER) {
      const delta = prevZIndex !== slices[i].zIndex ? ` (was ${prevZIndex})` : "";
      logSliceZ("  ", i, state, nSlices, slices[i].zIndex, delta);
    }
    slices[i].alpha = docAlpha(doc);
    if (doc.hidden) {
      slices[i].visible = false;
      slices[i].tint = 0xffffff;
      slices[i].filters = null;
    } else if (!slices[i].visible) {
      // B33: un-hiding must restore slice visibility (fog pass re-hides if warranted).
      slices[i].visible = true;
    }
  }
  if (DEBUG_ZORDER) {
    console.groupEnd();
  }
  mesh.alpha = 0;
}

// Peer bands shift whenever the tile set changes (create/destroy) — re-drive every tile's
// zIndex once, next tick, from its STORED state (valid for untouched tiles; a tile's own
// geometry changes are reconciled by IsoTileRenderer.sync when it refreshes).
let _peerResyncQueued = false;
export function schedulePeerResync(): void {
  if (!_peerResyncQueued) {
    _peerResyncQueued = true;
    scheduleWrap(
      async () => {
        _peerResyncQueued = false;
        for (const t of CanvasEnv.tiles()) {
          const slices = tileSlices.get(t.id);
          const state = tileSliceCuts.get(t.id);
          const mesh = getMesh(t);
          if (slices && state && mesh) {
            syncTileZ(t, slices, state, mesh);
          }
        }
      },
      "iso tile peer z-resync",
      0,
    );
  }
}
