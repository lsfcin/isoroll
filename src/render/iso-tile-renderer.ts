// IsoTileRenderer — depth-sorted iso-diagonal sliced tile sprites for the iso layer.
import { MODULE_ID, VolumeFlags, CanvasEnv } from "../core";
import { LayerManager, LAYER_KEYS } from "./layer-manager";
import { PlaceableDoc, docAlpha, applyDocState, applyTileFog, getViewers, tryRestoreFromStorage, maybeInvalidateRestoredTiles } from "./fog-helpers";
import type { TileRenderer } from "./tile-renderer";
import { transformCoord } from "../transform";
import type { P2 } from "../transform";
import { drawSliceDebug, clearSliceDebug, clearAllSliceDebug, drawGridDebug, clearGridDebug } from "./iso-tile-debug";

type Mesh = PIXI.DisplayObject & { texture?: PIXI.Texture; anchor?: PIXI.ObservablePoint; scale?: PIXI.ObservablePoint; alpha?: number; rotation?: number };
function getMesh(obj: unknown): Mesh | undefined { const m = (obj as { mesh?: Mesh }).mesh; return m?.texture ? m : undefined; }

export const tileSlices = new Map<string, PIXI.Sprite[]>();
// Stores computed cuts + mesh transform at create-time (detects drawTile→refreshTile timing mismatch).
interface SliceState { cuts: number[]; meshRot: number; meshScX: number; }
const tileSliceCuts = new Map<string, SliceState>();
function needsTileClone(t: Tile): boolean { return t.document.getFlag(MODULE_ID, "transformTile") !== true; }
const getTile = (id: string) => CanvasEnv.getTile(id);

export let DEBUG_SLICES = false;
export function debugSlices(on: boolean): void { DEBUG_SLICES = on; IsoTileRenderer.clearAll(); for (const t of CanvasEnv.tiles()) IsoTileRenderer.create(t); }
export function debugGrid(on: boolean): void {
  if (!on) { clearGridDebug(); return; }
  drawGridDebug(LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES));
}

export const DEPTH_SCALE = 10000;
function _cloneSliceTexture(src: PIXI.Texture, x: number, y: number, w: number, h: number): PIXI.Texture {
  const t = src.clone(); (t as unknown as { frame: PIXI.Rectangle }).frame = new PIXI.Rectangle(x, y, w, h);
  (t as unknown as { updateUvs?(): void }).updateUvs?.(); return t;
}

// kStart = min(Wg-1, Hg-1): first diagonal band that contains a frontier (south/east face) cell.
// Used by _computeSliceCuts to align cut points with frontier cell boundaries.
function _gridMetrics(tile: Tile) {
  const gs = CanvasEnv.gridSize();
  // swapSide() swaps doc.width↔height; use visual dims (pre-swap) when tileFlipped so grid footprint is correct.
  const flipped = VolumeFlags.getTileFlipped(tile.document);
  const docW = tile.document.width ?? 0, docH = tile.document.height ?? 0;
  const visW = flipped ? docH : docW, visH = flipped ? docW : docH;
  const nwX = tile.document.x - visW / 2, nwY = tile.document.y - visH / 2;
  const Wg = Math.ceil((nwX + visW) / gs) - Math.floor(nwX / gs);
  const Hg = Math.ceil((nwY + visH) / gs) - Math.floor(nwY / gs);
  return { gs, nwX, nwY, Wg, Hg, kStart: Math.min(Math.max(0, Wg - 1), Math.max(0, Hg - 1)) };
}
function _tileSliceCount(tile: Tile): number { const { Wg, Hg } = _gridMetrics(tile); return Math.max(1, Wg + Hg - 1); }
function _computeSliceCuts(tile: Tile, mesh: Mesh, nSlices: number, origFrame: PIXI.Rectangle): SliceState {
  const { gs, nwX, nwY, kStart } = _gridMetrics(tile);
  const snapX = Math.floor(nwX / gs) * gs, snapY = Math.floor(nwY / gs) * gs;
  const cuts: number[] = [];
  for (let j = 1; j < nSlices; j++) {
    const uv = transformCoord({ x: snapX + (kStart + j) * gs, y: snapY }, "WORLD", "IMAGE", { mesh }) as P2;
    cuts.push(Math.max(0, Math.min(origFrame.width - 1, Math.round(uv.x * origFrame.width))));
  }
  cuts.sort((a, b) => a - b);
  return { cuts, meshRot: mesh.rotation ?? 0, meshScX: Math.abs(mesh.scale?.x ?? 1) };
}

function _syncSlicePos(s: PIXI.Sprite, m: Mesh): void { s.position.set(m.x, m.y); if (m.scale) s.scale.set(m.scale.x, m.scale.y); s.rotation = m.rotation ?? 0; }
function _initSliceAnchor(s: PIXI.Sprite, m: Mesh, fw: number, cutLeft: number, sliceW: number): void {
  if (m.anchor) { s.anchor.x = (m.anchor.x * fw - cutLeft) / sliceW; s.anchor.y = m.anchor.y; }
}

function _createTileSlices(tile: Tile): void {
  const id = tile.id, old = tileSlices.get(id);
  if (old) { for (const s of old) { s.parent?.removeChild(s); s.destroy(); } tileSlices.delete(id); }
  tileSliceCuts.delete(id);
  const mesh = getMesh(tile); if (!mesh?.texture) return;
  const doc = tile.document as unknown as PlaceableDoc;
  const { gs, nwX, nwY, Wg, Hg, kStart } = _gridMetrics(tile);
  const nSlices = Math.max(1, Wg + Hg - 1), origFrame = mesh.texture.frame;
  const gridC0 = Math.floor(nwX / gs), gridR0 = Math.floor(nwY / gs);
  const elev = VolumeFlags.getTileBaseElevation(tile.document);
  const flipped = VolumeFlags.getTileFlipped(tile.document);
  const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES);
  const state = _computeSliceCuts(tile, mesh, nSlices, origFrame); tileSliceCuts.set(id, state);
  const slices: PIXI.Sprite[] = [];
  for (let i = 0; i < nSlices; i++) {
    const cutLeft = i === 0 ? 0 : state.cuts[i - 1];
    const cutRight = i === nSlices - 1 ? origFrame.width : state.cuts[i];
    const sliceW = Math.max(1, cutRight - cutLeft);
    const sp = new PIXI.Sprite(_cloneSliceTexture(mesh.texture, origFrame.x + cutLeft, origFrame.y, sliceW, origFrame.height));
    sp.eventMode = "passive"; _syncSlicePos(sp, mesh); _initSliceAnchor(sp, mesh, origFrame.width, cutLeft, sliceW);
    // Depth = fr - fc (row minus col): encodes NE-camera viewpoint where SW face is closest.
    // Replace with view-dependent formula when implementing the 8+1 multiview strategy.
    // flipped: texture is rendered mirrored (scale.x<0), so slice i covers the visual column (nSlices-1-i).
    const effectiveI = flipped ? nSlices - 1 - i : i;
    const d = kStart + effectiveI, rc = Math.min(Hg - 1, d), cc = d - rc;
    sp.zIndex = ((gridR0 + rc) - (gridC0 + cc) + elev) * DEPTH_SCALE; applyDocState(sp, doc); layer.addChild(sp); slices.push(sp);
  }
  mesh.alpha = 0; tileSlices.set(id, slices);
  if (DEBUG_SLICES) { clearSliceDebug(id); drawSliceDebug({ id, tile, mesh, origFrame, cuts: state.cuts, kStart, Wg, Hg, nSlices, flipped }, layer); }
}

export const IsoTileRenderer: TileRenderer = {
  handlesPreview: false,
  create(tile: Tile): void { if (!needsTileClone(tile)) return; _createTileSlices(tile); },
  sync(tile: Tile): void {
    const slices = tileSlices.get(tile.id); if (!slices) return;
    const mesh = getMesh(tile); if (!mesh) return;
    const nSlices = _tileSliceCount(tile), state = tileSliceCuts.get(tile.id);
    const curRot = mesh.rotation ?? 0, curScX = Math.abs(mesh.scale?.x ?? 1);
    if (slices.length !== nSlices || !mesh.texture || !state ||
        Math.abs(curRot - state.meshRot) > 0.001 || Math.abs(curScX - state.meshScX) > 0.001) {
      IsoTileRenderer.create(tile); return;
    }
    const doc = tile.document as unknown as PlaceableDoc;
    const { gs, nwX, nwY, kStart, Hg } = _gridMetrics(tile);
    const gridC0 = Math.floor(nwX / gs), gridR0 = Math.floor(nwY / gs);
    const elev = VolumeFlags.getTileBaseElevation(tile.document);
    const flipped = VolumeFlags.getTileFlipped(tile.document);
    for (let i = 0; i < nSlices; i++) {
      const effectiveI = flipped ? nSlices - 1 - i : i;
      const d = kStart + effectiveI, rc = Math.min(Hg - 1, d), cc = d - rc;
      _syncSlicePos(slices[i], mesh); slices[i].zIndex = ((gridR0 + rc) - (gridC0 + cc) + elev) * DEPTH_SCALE;
      slices[i].alpha = docAlpha(doc);
      if (doc.hidden) { slices[i].visible = false; slices[i].tint = 0xffffff; slices[i].filters = null; }
    }
    mesh.alpha = 0;
  },
  rebuild(tile: Tile): void { if (!needsTileClone(tile)) { IsoTileRenderer.hide(tile.id); return; } if (!tileSlices.has(tile.id)) IsoTileRenderer.create(tile); },
  onControl(_tile: Tile, _controlled: boolean): void {},
  onDestroy(id: string): void { IsoTileRenderer.hide(id); },
  onSightRefresh(): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    maybeInvalidateRestoredTiles(); tryRestoreFromStorage();
    const viewers = getViewers();
    for (const t of CanvasEnv.tiles()) {
      const slices = tileSlices.get(t.id); if (!slices?.length) continue;
      const w = t.document.width ?? 0, h = t.document.height ?? 0;
      applyTileFog(slices[0], t.document as unknown as PlaceableDoc, t.id,
        (t.document.x ?? 0) - w / 2, (t.document.y ?? 0) - h / 2, w, h,
        VolumeFlags.getHideOnFog(t.document), viewers);
      for (let i = 1; i < slices.length; i++) { slices[i].alpha = slices[0].alpha; slices[i].visible = slices[0].visible; slices[i].tint = slices[0].tint; slices[i].filters = slices[0].filters; }
    }
  },
  hide(id: string): void {
    const slices = tileSlices.get(id); if (!slices) return;
    const tile = getTile(id), mesh = tile ? getMesh(tile) : undefined, doc = tile?.document as unknown as PlaceableDoc | undefined;
    for (const s of slices) { s.parent?.removeChild(s); s.destroy(); }
    tileSlices.delete(id); tileSliceCuts.delete(id); clearSliceDebug(id);
    if (mesh && doc) mesh.alpha = docAlpha(doc);
  },
  clearAll(): void {
    for (const [, slices] of tileSlices) { for (const s of slices) { s.parent?.removeChild(s); s.destroy(); } }
    tileSlices.clear(); tileSliceCuts.clear(); clearAllSliceDebug();
  },
};
