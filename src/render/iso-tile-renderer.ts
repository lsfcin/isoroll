// IsoTileRenderer — depth-sorted iso-diagonal sliced tile sprites for the iso layer.
// sync() is a RECONCILE: slice-cut state is recomputed from the CURRENT document/mesh on
// every pass and compared against the stored state — structural change rebuilds, otherwise
// fresh faces/band re-drive zIndex in place via syncTileZ. Never trust cached geometry (B35).
import { VolumeFlags, CanvasEnv } from "../core";
import { LayerManager, LAYER_KEYS } from "./layer-manager";
import { PlaceableDoc, docAlpha } from "./fog-helpers";
import type { TileRenderer } from "./tile-renderer";
import { maybeDrawSliceDebug, clearSliceDebug, clearAllSliceDebug } from "./iso-tile-debug";
import { gridMetrics, computeSliceCuts, sliceStateChanged } from "./iso-tile-geom";
import type { Mesh, SliceState } from "./iso-tile-geom";
import type { SliceGeom } from "./iso-tile-slice-build";
import { getMesh, needsTileClone, buildSlice } from "./iso-tile-slice-build";
import { tileBand, syncTileZ, schedulePeerResync } from "./iso-tile-zsync";
import {
  DEBUG_SLICES,
  DEBUG_ZORDER,
  logSliceZ,
  zorderCreateGroup,
  zorderGroupEnd,
} from "./iso-tile-zdebug";
import { tileSlices, tileSliceCuts } from "./iso-tile-state";
import { syncAllTileFog } from "./iso-tile-fog-sync";

export { tileSlices, tileSliceCuts } from "./iso-tile-state";

function _destroySlices(id: string): void {
  const slices = tileSlices.get(id);
  if (slices) {
    for (const s of slices) {
      s.parent?.removeChild(s);
      s.destroy();
    }
    tileSlices.delete(id);
    schedulePeerResync();
  }
  tileSliceCuts.delete(id);
}

function _buildAllSlices(
  tile: Tile,
  mesh: Mesh,
  state: SliceState,
  layer: PIXI.Container,
  oldCount: number,
): void {
  const doc = tile.document as unknown as PlaceableDoc;
  const elev = VolumeFlags.getTileBaseElevation(tile.document);
  const nSlices = Math.max(1, state.cuts.length + 1);
  const slices: PIXI.Sprite[] = [];
  const gp: SliceGeom = { elev, band: tileBand(tile) };
  zorderCreateGroup(tile.id, nSlices, oldCount);
  for (let i = 0; i < nSlices; i++) {
    const sp = buildSlice(mesh, mesh.texture!.frame, i, state, nSlices, gp, doc, layer);
    slices.push(sp);
    tileSlices.set(tile.id, slices);
    if (DEBUG_ZORDER) {
      logSliceZ("  ", i, state, nSlices, sp.zIndex, "");
    }
  }
  zorderGroupEnd();
}

function _createTileSlices(tile: Tile): void {
  const id = tile.id;
  const oldCount = tileSlices.get(id)?.length ?? 0;
  _destroySlices(id);
  const mesh = getMesh(tile);
  if (!mesh?.texture) {
    return;
  }
  const { Wg, Hg } = gridMetrics(tile);
  const origFrame = mesh.texture.frame;
  const flipped = VolumeFlags.getTileFlipped(tile.document);
  const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES);
  const state = computeSliceCuts(tile, mesh, origFrame);
  tileSliceCuts.set(id, state);
  const nSlices = Math.max(1, state.cuts.length + 1);
  _buildAllSlices(tile, mesh, state, layer, oldCount);
  mesh.alpha = 0;
  schedulePeerResync();
  maybeDrawSliceDebug(
    DEBUG_SLICES,
    tile,
    mesh,
    origFrame,
    state,
    { Wg, Hg, nSlices, flipped },
    layer,
  );
}

export const IsoTileRenderer: TileRenderer = {
  handlesPreview: false,
  create(tile: Tile): void {
    if (!needsTileClone(tile)) {
      return;
    }
    _createTileSlices(tile);
  },
  sync(tile: Tile): void {
    const slices = tileSlices.get(tile.id);
    const mesh = slices ? getMesh(tile) : undefined;
    if (slices && mesh && mesh.texture) {
      const prev = tileSliceCuts.get(tile.id);
      const fresh = computeSliceCuts(tile, mesh, mesh.texture.frame);
      if (!prev || sliceStateChanged(prev, fresh, slices.length)) {
        IsoTileRenderer.create(tile);
      } else {
        tileSliceCuts.set(tile.id, fresh);
        syncTileZ(tile, slices, fresh, mesh);
      }
    }
  },
  rebuild(tile: Tile): void {
    if (!needsTileClone(tile)) {
      IsoTileRenderer.hide(tile.id);
    } else if (!tileSlices.has(tile.id)) {
      IsoTileRenderer.create(tile);
    }
  },
  onControl(_tile: Tile, _controlled: boolean): void {},
  onDestroy(id: string): void {
    IsoTileRenderer.hide(id);
  },
  onSightRefresh(): void {
    syncAllTileFog();
  },
  hide(id: string): void {
    if (!tileSlices.has(id)) {
      return;
    }
    const tile = CanvasEnv.getTile(id);
    const mesh = tile ? getMesh(tile) : undefined;
    const doc = tile?.document as unknown as PlaceableDoc | undefined;
    _destroySlices(id);
    clearSliceDebug(id);
    if (mesh && doc) {
      mesh.alpha = docAlpha(doc);
    }
  },
  clearAll(): void {
    for (const id of [...tileSlices.keys()]) {
      _destroySlices(id);
    }
    clearAllSliceDebug();
  },
};
