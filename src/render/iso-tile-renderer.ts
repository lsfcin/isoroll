// IsoTileRenderer — depth-sorted iso-diagonal sliced tile sprites for the iso layer.
import { MODULE_ID, VolumeFlags, CanvasEnv } from "../core";
import { LayerManager, LAYER_KEYS } from "./layer-manager";
import { PlaceableDoc, docAlpha, applyTileFog, getViewers, tryRestoreFromStorage, maybeInvalidateRestoredTiles } from "./fog-helpers";
import type { TileRenderer } from "./tile-renderer";
import { drawSliceDebug, clearSliceDebug, clearAllSliceDebug, drawGridDebug, clearGridDebug } from "./iso-tile-debug";
import { Mesh, SliceState, SliceGeom, gridMetrics, tileSliceCount, computeSliceCuts, DEPTH_SCALE, syncSlicePos, buildSlice } from "./iso-tile-geom";

export { Mesh, DEPTH_SCALE } from "./iso-tile-geom";

function getMesh(obj: unknown): Mesh | undefined {
  const m = (obj as { mesh?: Mesh }).mesh;
  return m?.texture ? m : undefined;
}

export const tileSlices = new Map<string, PIXI.Sprite[]>();
const tileSliceCuts = new Map<string, SliceState>();
function needsTileClone(t: Tile): boolean {
  return t.document.getFlag(MODULE_ID, "transformTile") !== true;
}
const getTile = (id: string) => CanvasEnv.getTile(id);

export let DEBUG_SLICES = false;
export function debugSlices(on: boolean): void {
  DEBUG_SLICES = on;
  IsoTileRenderer.clearAll();
  for (const t of CanvasEnv.tiles()) {
    IsoTileRenderer.create(t);
  }
}
export function debugGrid(on: boolean): void {
  if (!on) {
    clearGridDebug();
    return;
  }
  const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES);
  drawGridDebug(layer);
}

function _createTileSlices(tile: Tile): void {
  const id = tile.id;
  const old = tileSlices.get(id);
  if (old) {
    for (const s of old) {
      s.parent?.removeChild(s);
      s.destroy();
    }
    tileSlices.delete(id);
  }
  tileSliceCuts.delete(id);
  const mesh = getMesh(tile);
  if (!mesh?.texture) {
    return;
  }
  const doc = tile.document as unknown as PlaceableDoc;
  const { gs, nwX, nwY, Wg, Hg, kStart } = gridMetrics(tile);
  const nSlices = Math.max(1, Wg + Hg - 1);
  const origFrame = mesh.texture.frame;
  const gridC0 = Math.floor(nwX / gs);
  const gridR0 = Math.floor(nwY / gs);
  const elev = VolumeFlags.getTileBaseElevation(tile.document);
  const flipped = VolumeFlags.getTileFlipped(tile.document);
  const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES);
  const state = computeSliceCuts(tile, mesh, origFrame);
  tileSliceCuts.set(id, state);
  const slices: PIXI.Sprite[] = [];
  const gp: SliceGeom = { gridC0, gridR0, kStart, Hg, elev, flipped };
  for (let i = 0; i < nSlices; i++) {
    const sp = buildSlice(mesh, origFrame, i, state, nSlices, gp, doc, layer);
    slices.push(sp);
    tileSlices.set(id, slices);
  }
  mesh.alpha = 0;
  if (DEBUG_SLICES) {
    clearSliceDebug(id);
    drawSliceDebug({ id, tile, mesh, origFrame, cuts: state.cuts, rawCuts: state.rawCuts, frontierWorldPts: state.frontierWorldPts, kStart, Wg, Hg, nSlices, flipped }, layer);
  }
}

function _syncTileSlices(tile: Tile, slices: PIXI.Sprite[], nSlices: number, mesh: Mesh): void {
  const doc = tile.document as unknown as PlaceableDoc;
  const { gs, nwX, nwY, kStart, Hg } = gridMetrics(tile);
  const gridC0 = Math.floor(nwX / gs);
  const gridR0 = Math.floor(nwY / gs);
  const elev = VolumeFlags.getTileBaseElevation(tile.document);
  const flipped = VolumeFlags.getTileFlipped(tile.document);
  for (let i = 0; i < nSlices; i++) {
    const effectiveI = flipped ? nSlices - 1 - i : i;
    const d = kStart + effectiveI;
    const rc = Math.min(Hg - 1, d);
    const cc = d - rc;
    syncSlicePos(slices[i], mesh);
    slices[i].zIndex = ((gridR0 + rc) - (gridC0 + cc) + elev) * DEPTH_SCALE;
    slices[i].alpha = docAlpha(doc);
    if (doc.hidden) {
      slices[i].visible = false;
      slices[i].tint = 0xffffff;
      slices[i].filters = null;
    }
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
      const nSlices = tileSliceCount(tile);
      const state = tileSliceCuts.get(tile.id);
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
        _syncTileSlices(tile, slices, nSlices, mesh);
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
      const tileDoc = t.document as unknown as PlaceableDoc;
      const hideOnFog = VolumeFlags.getHideOnFog(t.document);
      applyTileFog(slices[0], tileDoc, t.id, docX - w / 2, docY - h / 2, w, h, hideOnFog, viewers);
      for (let i = 1; i < slices.length; i++) {
        slices[i].alpha = slices[0].alpha;
        slices[i].visible = slices[0].visible;
        slices[i].tint = slices[0].tint;
        slices[i].filters = slices[0].filters;
      }
    }
  },
  hide(id: string): void {
    const slices = tileSlices.get(id);
    if (!slices) {
      return;
    }
    const tile = getTile(id);
    const mesh = tile ? getMesh(tile) : undefined;
    const doc = tile?.document as unknown as PlaceableDoc | undefined;
    for (const s of slices) {
      s.parent?.removeChild(s);
      s.destroy();
    }
    tileSlices.delete(id);
    tileSliceCuts.delete(id);
    clearSliceDebug(id);
    if (mesh && doc) {
      mesh.alpha = docAlpha(doc);
    }
  },
  clearAll(): void {
    for (const [, slices] of tileSlices) {
      for (const s of slices) {
        s.parent?.removeChild(s);
        s.destroy();
      }
    }
    tileSlices.clear();
    tileSliceCuts.clear();
    clearAllSliceDebug();
  },
};
