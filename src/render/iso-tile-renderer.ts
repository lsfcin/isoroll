// IsoTileRenderer — depth-sorted iso-diagonal sliced tile sprites for the iso layer.
import { MODULE_ID, VolumeFlags, CanvasEnv } from "../core";
import { LayerManager, LAYER_KEYS } from "./layer-manager";
import { PlaceableDoc, docAlpha, applyTileFog, getViewers, tryRestoreFromStorage, maybeInvalidateRestoredTiles } from "./fog-helpers";
import type { TileRenderer } from "./tile-renderer";
import { drawSliceDebug, clearSliceDebug, clearAllSliceDebug } from "./iso-tile-debug";
import { type Mesh, type SliceState, type SliceGeom, gridMetrics, tileSliceCount, computeSliceCuts, syncSlicePos, buildSlice } from "./iso-tile-geom";
import { sliceDepthCell, depthZIndex, tileSortBand } from "./iso-tile-depth";
import { DEBUG_SLICES, DEBUG_ZORDER, logSliceZ } from "./iso-tile-zdebug";

function getMesh(obj: unknown): Mesh | undefined {
  const m = (obj as { mesh?: Mesh }).mesh;
  return m?.texture ? m : undefined;
}

export const tileSlices = new Map<string, PIXI.Sprite[]>();
export const tileSliceCuts = new Map<string, SliceState>();
const needsTileClone = (t: Tile): boolean => t.document.getFlag(MODULE_ID, "transformTile") !== true;

// Bounded cross-tile tiebreaker: rank of this tile among all tiles by (sort, id).
function _tileBand(tile: Tile): number {
  const peers: Array<{ id: string; sort: number }> = [];
  for (const t of CanvasEnv.tiles()) {
    const sort = (t.document as unknown as { sort?: number }).sort ?? 0;
    peers.push({ id: t.id, sort });
  }
  return tileSortBand(tile.id, peers);
}

function _destroySlices(id: string): void {
  const slices = tileSlices.get(id);
  if (slices) {
    for (const s of slices) {
      s.parent?.removeChild(s);
      s.destroy();
    }
    tileSlices.delete(id);
  }
  tileSliceCuts.delete(id);
}

function _createTileSlices(tile: Tile): void {
  const id = tile.id;
  const oldCount = tileSlices.get(id)?.length ?? 0;
  _destroySlices(id);
  const mesh = getMesh(tile);
  if (!mesh?.texture) {
    return;
  }
  const doc = tile.document as unknown as PlaceableDoc;
  const { Wg, Hg } = gridMetrics(tile);
  const origFrame = mesh.texture.frame;
  const elev = VolumeFlags.getTileBaseElevation(tile.document);
  const flipped = VolumeFlags.getTileFlipped(tile.document);
  const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES);
  const state = computeSliceCuts(tile, mesh, origFrame);
  tileSliceCuts.set(id, state);
  const nSlices = Math.max(1, state.cuts.length + 1);
  const slices: PIXI.Sprite[] = [];
  const gp: SliceGeom = { elev, band: _tileBand(tile) };
  if (DEBUG_ZORDER) {
    const short = id.slice(0, 8);
    console.group(`[zorder:create] tile=${short} nSlices=${nSlices} (had ${oldCount} old)`);
  }
  for (let i = 0; i < nSlices; i++) {
    const sp = buildSlice(mesh, origFrame, i, state, nSlices, gp, doc, layer);
    slices.push(sp);
    tileSlices.set(id, slices);
    if (DEBUG_ZORDER) {
      logSliceZ("  ", i, state, nSlices, sp.zIndex, "");
    }
  }
  if (DEBUG_ZORDER) {
    console.groupEnd();
  }
  mesh.alpha = 0;
  if (DEBUG_SLICES) {
    clearSliceDebug(id);
    drawSliceDebug({ id, tile, mesh, origFrame, cuts: state.cuts, rawCuts: state.rawCuts, faces: state.faces, frontierWorldPts: state.frontierWorldPts, Wg, Hg, nSlices, flipped }, layer);
  }
}

function _syncTileSlices(tile: Tile, slices: PIXI.Sprite[], state: SliceState, mesh: Mesh): void {
  const doc = tile.document as unknown as PlaceableDoc;
  const nSlices = state.cuts.length + 1;
  const elev = VolumeFlags.getTileBaseElevation(tile.document);
  const band = _tileBand(tile);
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
      const delta = prevZIndex !== slices[i].zIndex ? ` (was ${prevZIndex})` : '';
      logSliceZ("  ", i, state, nSlices, slices[i].zIndex, delta);
    }
    slices[i].alpha = docAlpha(doc);
    if (doc.hidden) {
      slices[i].visible = false;
      slices[i].tint = 0xffffff;
      slices[i].filters = null;
    }
  }
  if (DEBUG_ZORDER) {
    console.groupEnd();
  }
  mesh.alpha = 0;
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
    if (slices && mesh) {
      const state = tileSliceCuts.get(tile.id);
      const nSlices = state ? state.cuts.length + 1 : tileSliceCount(tile);
      const curRot = mesh.rotation ?? 0;
      const absCurRot = Math.abs(curRot - (state?.meshRot ?? 0));
      const curScX = Math.abs(mesh.scale?.x ?? 1);
      const absCurScX = Math.abs(curScX - (state?.meshScX ?? 1));
      const curFlipped = (mesh.scale?.x ?? 1) < 0;
      const needsRebuild = slices.length !== nSlices || !mesh.texture || !state ||
          absCurRot > 0.001 || absCurScX > 0.001 || curFlipped !== state.meshFlipped;
      if (needsRebuild) {
        IsoTileRenderer.create(tile);
      } else {
        _syncTileSlices(tile, slices, state!, mesh);
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
  onDestroy(id: string): void { IsoTileRenderer.hide(id); },
  onSightRefresh(): void {
    if (!VolumeFlags.isSceneEnabled()) {
      return;
    }
    const viewers = getViewers();
    maybeInvalidateRestoredTiles();
    tryRestoreFromStorage();
    for (const t of CanvasEnv.tiles()) {
      const slices = tileSlices.get(t.id);
      if (!slices?.length) {
        continue;
      }
      const w = t.document.width ?? 0;
      const h = t.document.height ?? 0;
      const docX = t.document.x ?? 0;
      const docY = t.document.y ?? 0;
      const { x: cx = docX, y: cy = docY } = getMesh(t) ?? {};
      const tileDoc = t.document as unknown as PlaceableDoc;
      const hideOnFog = VolumeFlags.getHideOnFog(t.document);
      applyTileFog(slices[0], tileDoc, t.id, cx - w / 2, cy - h / 2, w, h, hideOnFog, viewers);
      for (let i = 1; i < slices.length; i++) {
        slices[i].alpha = slices[0].alpha;
        slices[i].visible = slices[0].visible;
        slices[i].tint = slices[0].tint;
        slices[i].filters = slices[0].filters;
      }
    }
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
