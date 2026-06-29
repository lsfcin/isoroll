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
// rawCuts: all projected frontier corners (texture px) BEFORE sort/drop — for debug visualization.
// frontierWorldPts: the raw world-space vertices fed to transformCoord — for debug world-space dots.
interface SliceState { cuts: number[]; rawCuts: number[]; frontierWorldPts: P2[]; meshRot: number; meshScX: number; meshFlipped: boolean; }
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
// Used by depth assignment in _createTileSlices, NOT by cut computation (cuts use frontier corners now).
function _gridMetrics(tile: Tile) {
  const gs = CanvasEnv.gridSize();
  const docW = tile.document.width ?? 0, docH = tile.document.height ?? 0;
  const visW = docW, visH = docH;
  const nwX = tile.document.x - visW / 2, nwY = tile.document.y - visH / 2;
  const Wg = Math.ceil((nwX + visW) / gs) - Math.floor(nwX / gs);
  const Hg = Math.ceil((nwY + visH) / gs) - Math.floor(nwY / gs);
  return { gs, nwX, nwY, Wg, Hg, kStart: Math.min(Math.max(0, Wg - 1), Math.max(0, Hg - 1)) };
}
function _tileSliceCount(tile: Tile): number { const { Wg, Hg } = _gridMetrics(tile); return Math.max(1, Wg + Hg - 1); }

// Bottom-cell corner collection: the V-shaped frontier facing the camera.
// Bottom-cell = cell closest to camera = (gridC0, gridR0 + Hg-1) for the SW viewpoint.
// Its two lateral corners (W and E) are cut points.
// Propagating UP the left column (frontier on the viewer's left), each cell's W corner is a cut.
// Propagating RIGHT along the bottom row (frontier on the viewer's right), each cell's E corner is a cut.
// Total = 2 + (Hg-1) + (Wg-1) = Wg+Hg corners. After projection+sort we drop the min & max
// (tile texture boundaries), leaving Wg+Hg-2 = nSlices-1 internal cuts.
//
// ORIENTATION-ROTATION HOOK: when the iso viewpoint rotates (8+1 multiview strategy), the bottom-cell
// and the propagation directions change. Adapt this helper then — keep the corner-collection shape
// identical (list of world points), so _computeSliceCuts needs no change.
function _frontierCorners(Wg: number, Hg: number, gridC0: number, gridR0: number, gs: number): P2[] {
  const pts: P2[] = [];
  const botR = gridR0 + Hg - 1;              // bottom row of the tile footprint
  // WEST corner = leftmost diamond vertex = NW corner of grid square (c*gs, r*gs)
  // EAST corner = rightmost diamond vertex = SE corner of grid square ((c+1)*gs, (r+1)*gs)
  // In iso projection (rot -45°), screen-x ∝ world.x + world.y, so NW=min(leftmost), SE=max(rightmost).
  // bottom-cell at (gridC0, botR): both lateral corners
  pts.push({ x: gridC0 * gs,         y: botR * gs });            // WEST corner
  pts.push({ x: (gridC0 + 1) * gs,   y: (botR + 1) * gs });      // EAST corner
  // left propagation: cells above bottom-cell in the same column → WEST corner of each
  for (let r = botR - 1; r >= gridR0; r--) {
    pts.push({ x: gridC0 * gs,       y: r * gs });                // WEST corner
  }
  // right propagation: cells to the right of bottom-cell in the bottom row → EAST corner of each
  for (let c = gridC0 + 1; c < gridC0 + Wg; c++) {
    pts.push({ x: (c + 1) * gs,      y: (botR + 1) * gs });       // EAST corner
  }
  return pts;
}

function _computeSliceCuts(tile: Tile, mesh: Mesh, nSlices: number, origFrame: PIXI.Rectangle): SliceState {
  const { gs, nwX, nwY, Wg, Hg } = _gridMetrics(tile);
  const flipped = VolumeFlags.getTileFlipped(tile.document);
  const ax = mesh.anchor?.x ?? 0.5;
  const gridC0 = Math.floor(nwX / gs), gridR0 = Math.floor(nwY / gs);
  const corners = _frontierCorners(Wg, Hg, gridC0, gridR0, gs);
  // Project each frontier corner to IMAGE space; flip-mirror around anchor (texture is mirrored when scale.x<0).
  const projected = corners.map(p => {
    const uv = transformCoord(p, "WORLD", "IMAGE", { mesh }) as P2;
    const uvx = flipped ? 2 * ax - uv.x : uv.x;
    return Math.max(0, Math.min(origFrame.width - 1, Math.round(uvx * origFrame.width)));
  });
  const rawCuts = [...projected];
  projected.sort((a, b) => a - b);
  // Drop texture boundaries (global min & max). Internal cuts = projected[1 .. n-2].
  const cuts = projected.slice(1, projected.length - 1);
  return { cuts, rawCuts, frontierWorldPts: corners, meshRot: mesh.rotation ?? 0, meshScX: Math.abs(mesh.scale?.x ?? 1), meshFlipped: (mesh.scale?.x ?? 1) < 0 };
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
    tileSlices.set(id, slices);
  }
  mesh.alpha = 0;
  if (DEBUG_SLICES) { clearSliceDebug(id); drawSliceDebug({ id, tile, mesh, origFrame, cuts: state.cuts, rawCuts: state.rawCuts, frontierWorldPts: state.frontierWorldPts, kStart, Wg, Hg, nSlices, flipped }, layer); }
}

export const IsoTileRenderer: TileRenderer = {
  handlesPreview: false,
  create(tile: Tile): void { if (!needsTileClone(tile)) return; _createTileSlices(tile); },
  sync(tile: Tile): void {
    const slices = tileSlices.get(tile.id); if (!slices) return;
    const mesh = getMesh(tile); if (!mesh) return;
    const nSlices = _tileSliceCount(tile), state = tileSliceCuts.get(tile.id);
    const curRot = mesh.rotation ?? 0, curScX = Math.abs(mesh.scale?.x ?? 1), curFlipped = (mesh.scale?.x ?? 1) < 0;
    if (slices.length !== nSlices || !mesh.texture || !state ||
        Math.abs(curRot - state.meshRot) > 0.001 || Math.abs(curScX - state.meshScX) > 0.001 || curFlipped !== state.meshFlipped) {
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
