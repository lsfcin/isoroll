// IsoTileRenderer — depth-sorted iso-diagonal sliced tile sprites for the iso layer.
import { MODULE_ID, VolumeFlags, CanvasEnv } from "../core";
import { LayerManager, LAYER_KEYS } from "./layer-manager";
import { PlaceableDoc, docAlpha, applyDocState, applyTileFog, getViewers, tryRestoreFromStorage, maybeInvalidateRestoredTiles } from "./fog-helpers";
import type { TileRenderer } from "./tile-renderer";

type Mesh = PIXI.DisplayObject & {
  texture?: PIXI.Texture;
  anchor?: PIXI.ObservablePoint;
  scale?: PIXI.ObservablePoint;
  alpha?: number;
  rotation?: number;
};

function getMesh(obj: unknown): Mesh | undefined {
  if (!obj) return undefined;
  const m = (obj as { mesh?: Mesh }).mesh; return m?.texture ? m : undefined;
}

export const tileSlices = new Map<string, PIXI.Sprite[]>();
function needsTileClone(t: Tile): boolean { return t.document.getFlag(MODULE_ID, "transformTile") !== true; }
const getTile = (id: string) => CanvasEnv.getTile(id);

// ---- depth-sort helpers ----

export const DEPTH_SCALE = 10000;

function _cloneSliceTexture(src: PIXI.Texture, x: number, y: number, w: number, h: number): PIXI.Texture {
  const t = src.clone();
  (t as unknown as { frame: PIXI.Rectangle }).frame = new PIXI.Rectangle(x, y, w, h);
  (t as unknown as { updateUvs?(): void }).updateUvs?.();
  return t;
}
function _tileSliceCount(tile: Tile): number {
  const gs = CanvasEnv.gridSize();
  const W = Math.max(1, Math.round(tile.document.width / gs));
  const H = Math.max(1, Math.round(tile.document.height / gs));
  return W + H - 1;
}
function _tileBaseDepth(tile: Tile): number {
  const gs = CanvasEnv.gridSize();
  const nwX = (tile.document.x - tile.document.width  / 2) / gs;
  const nwY = (tile.document.y - tile.document.height / 2) / gs;
  return nwX + nwY + VolumeFlags.getTileBaseElevation(tile.document);
}
function _syncSlice(sprite: PIXI.Sprite, mesh: Mesh, i: number, nSlices: number): void {
  sprite.position.set(mesh.x, mesh.y);
  if (mesh.anchor) { sprite.anchor.x = mesh.anchor.x * nSlices - i; sprite.anchor.y = mesh.anchor.y; }
  if (mesh.scale)  sprite.scale.set(mesh.scale.x, mesh.scale.y);
  sprite.rotation = mesh.rotation ?? 0;
}
function _createTileSlices(tile: Tile): void {
  const id  = tile.id;
  const old = tileSlices.get(id);
  if (old) { for (const s of old) { s.parent?.removeChild(s); s.destroy(); } tileSlices.delete(id); }
  const mesh = getMesh(tile); if (!mesh?.texture) return;
  const doc      = tile.document as unknown as PlaceableDoc;
  const nSlices  = _tileSliceCount(tile);
  const baseDepth = _tileBaseDepth(tile);
  const origFrame = mesh.texture.frame;
  const sliceW    = origFrame.width / nSlices;
  const layer     = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES);
  const slices: PIXI.Sprite[] = [];
  for (let i = 0; i < nSlices; i++) {
    const t      = _cloneSliceTexture(mesh.texture, origFrame.x + sliceW * i, origFrame.y, sliceW, origFrame.height);
    const sprite = new PIXI.Sprite(t);
    sprite.eventMode = "passive";
    _syncSlice(sprite, mesh, i, nSlices);
    sprite.zIndex = (baseDepth + i / nSlices) * DEPTH_SCALE;
    applyDocState(sprite, doc);
    layer.addChild(sprite);
    slices.push(sprite);
  }
  mesh.alpha = 0;
  tileSlices.set(id, slices);
}

// ---- tile renderer ----

export const IsoTileRenderer: TileRenderer = {
  handlesPreview: true,
  create(tile: Tile): void {
    if (!needsTileClone(tile)) return;
    _createTileSlices(tile);
  },
  sync(tile: Tile): void {
    const slices = tileSlices.get(tile.id); if (!slices) return;
    const mesh   = getMesh(tile); if (!mesh) return;
    const nSlices = _tileSliceCount(tile);
    // Recreate if tile was resized or source texture changed
    if (slices.length !== nSlices || !mesh.texture ||
        Math.abs(slices[0].texture.frame.width * nSlices - mesh.texture.frame.width) > 0.5) {
      IsoTileRenderer.create(tile); return;
    }
    const doc = tile.document as unknown as PlaceableDoc;
    const baseDepth = _tileBaseDepth(tile);
    for (let i = 0; i < nSlices; i++) {
      _syncSlice(slices[i], mesh, i, nSlices);
      slices[i].zIndex = (baseDepth + i / nSlices) * DEPTH_SCALE;
      slices[i].alpha  = docAlpha(doc);
      if (doc.hidden) { slices[i].visible = false; slices[i].tint = 0xffffff; slices[i].filters = null; }
      // visible/tint/filters preserved when not hidden — fog state owned by onSightRefresh
    }
    mesh.alpha = 0;
  },
  rebuild(tile: Tile): void {
    if (!needsTileClone(tile)) { IsoTileRenderer.hide(tile.id); return; }
    if (!tileSlices.has(tile.id)) IsoTileRenderer.create(tile);
  },
  onControl(_tile: Tile, _controlled: boolean): void { /* ISO has no selection behavior */ },
  onDestroy(id: string): void { IsoTileRenderer.hide(id); },
  onSightRefresh(): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    maybeInvalidateRestoredTiles(); // clear restored data if in-session fog reset detected
    tryRestoreFromStorage();         // one-time: populate restoredTileIds from localStorage after F5
    const viewers = getViewers();
    for (const t of CanvasEnv.tiles()) {
      const slices = tileSlices.get(t.id); if (!slices?.length) continue;
      const w = t.document.width ?? 0, h = t.document.height ?? 0;
      // v14: doc.x/y is center; top-left = center - size/2
      // Apply fog state machine once on slices[0] (handles seenTileIds tracking), then propagate
      applyTileFog(slices[0], t.document as unknown as PlaceableDoc, t.id,
        (t.document.x ?? 0) - w / 2, (t.document.y ?? 0) - h / 2, w, h,
        VolumeFlags.getHideOnFog(t.document), viewers);
      for (let i = 1; i < slices.length; i++) {
        slices[i].alpha   = slices[0].alpha;
        slices[i].visible = slices[0].visible;
        slices[i].tint    = slices[0].tint;
        slices[i].filters = slices[0].filters;
      }
    }
  },
  hide(id: string): void {
    const slices = tileSlices.get(id); if (!slices) return;
    const tile = getTile(id);
    const mesh = tile ? getMesh(tile) : undefined;
    const doc  = tile?.document as unknown as PlaceableDoc | undefined;
    for (const s of slices) { s.parent?.removeChild(s); s.destroy(); }
    tileSlices.delete(id);
    if (mesh && doc) mesh.alpha = docAlpha(doc);
  },
  clearAll(): void {
    for (const [, slices] of tileSlices) { for (const s of slices) { s.parent?.removeChild(s); s.destroy(); } }
    tileSlices.clear();
  },
};
