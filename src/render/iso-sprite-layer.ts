// Iso Sprite Layer — PIXI.Container on canvas.stage outside VisibilityFilter scope.
// Clones of counter-transformed (untransformed) tokens/tiles live here.
// Originals stay in canvas.primary at alpha=0 for hit detection.

import { MODULE_ID, VolumeFlags } from "../core";
import { LayerManager, LAYER_KEYS } from "./layer-manager";
import { PlaceableDoc, docAlpha, applyDocState, applyTokenFog, applyTileFog, clearSeenTiles, getViewers, tryRestoreFromStorage, maybeInvalidateRestoredTiles, saveSessionToStorage } from "./fog-helpers";
import type { TokenRenderer } from "./token-renderer";
import type { TileRenderer } from "./tile-renderer";

type Mesh = PIXI.DisplayObject & {
  texture?: PIXI.Texture;
  anchor?: PIXI.ObservablePoint;
  skew?: PIXI.ObservablePoint;
  scale?: PIXI.ObservablePoint;
  alpha?: number;
  rotation?: number;
};
type Center = { x: number; y: number };

export function cloneSprite(mesh: Mesh): PIXI.Sprite | null {
  if (!mesh.texture) return null;
  const s = new PIXI.Sprite(mesh.texture); s.eventMode = "passive"; syncSprite(s, mesh); return s;
}
export function syncSprite(sprite: PIXI.Sprite, mesh: Mesh): void {
  sprite.texture = mesh.texture ?? PIXI.Texture.EMPTY;
  sprite.position.set(mesh.x, mesh.y);
  if (mesh.anchor) sprite.anchor.set(mesh.anchor.x, mesh.anchor.y);
  if (mesh.skew)   sprite.skew.set(mesh.skew.x, mesh.skew.y);
  if (mesh.scale)  sprite.scale.set(mesh.scale.x, mesh.scale.y);
  sprite.rotation = mesh.rotation ?? 0;
}

function getMesh(obj: unknown): Mesh | undefined {
  const m = (obj as { mesh?: Mesh }).mesh; return m?.texture ? m : undefined;
}
function tokenCenter(t: Token): Center { return (t as unknown as { center?: Center }).center ?? { x: t.x, y: t.y }; }

function createClone(map: Map<string, PIXI.Sprite>, id: string, mesh: Mesh | undefined, doc: PlaceableDoc): void {
  const old = map.get(id); if (old) { old.parent?.removeChild(old); old.destroy(); map.delete(id); }
  if (!mesh?.texture) return;
  const clone = cloneSprite(mesh); if (!clone) return;
  applyDocState(clone, doc); mesh.alpha = 0;
  IsoSpriteLayer.getLayer().addChild(clone); map.set(id, clone);
}
function removeClone(map: Map<string, PIXI.Sprite>, id: string, mesh?: Mesh, doc?: PlaceableDoc): void {
  const clone = map.get(id); if (!clone) return;
  clone.parent?.removeChild(clone); clone.destroy(); map.delete(id);
  if (mesh && doc) mesh.alpha = docAlpha(doc);
}

// ---- clone registries ----

const tokenClones = new Map<string, PIXI.Sprite>();
const tileClones  = new Map<string, PIXI.Sprite>();
function needsTokenClone(t: Token): boolean { return t.document.getFlag(MODULE_ID, "transformToken") !== true; }
function needsTileClone(t: Tile):   boolean { return t.document.getFlag(MODULE_ID, "transformTile")  !== true; }
const getToken = (id: string) => (canvas.tokens as unknown as { get?(id: string): Token | undefined })?.get?.(id);
const getTile  = (id: string) => (canvas.tiles  as unknown as { get?(id: string): Tile  | undefined })?.get?.(id);

// ---- token renderer ----

export const IsoTokenRenderer: TokenRenderer = {
  handlesPreview: true,
  create(token: Token): void {
    if (!needsTokenClone(token)) return;
    createClone(tokenClones, token.id, getMesh(token), token.document as unknown as PlaceableDoc);
  },
  sync(token: Token): void {
    const clone = tokenClones.get(token.id); if (!clone) return;
    const mesh  = getMesh(token); if (!mesh) return;
    syncSprite(clone, mesh); mesh.alpha = 0;
    const doc = token.document as unknown as PlaceableDoc;
    clone.alpha = docAlpha(doc);
    if (doc.hidden) clone.visible = false;
    // visible preserved — fog state owned by onSightRefresh
  },
  rebuild(token: Token): void {
    if (!needsTokenClone(token)) { IsoTokenRenderer.hide(token.id); return; }
    if (!tokenClones.has(token.id)) IsoTokenRenderer.create(token);
  },
  onControl(_token: Token, _controlled: boolean): void { /* ISO has no selection behavior */ },
  onDestroy(id: string): void { IsoTokenRenderer.hide(id); },
  onSightRefresh(): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    const viewers = getViewers();
    const viewerIds = new Set(viewers.map(v => v.id));
    for (const t of (canvas.tokens?.placeables ?? []) as Token[]) {
      const clone = tokenClones.get(t.id); if (!clone) continue;
      const doc = t.document as unknown as PlaceableDoc;
      // Viewer tokens always see themselves — never hide the token the player controls.
      if (viewerIds.has(t.id)) { applyDocState(clone, doc); continue; }
      applyTokenFog(clone, doc, tokenCenter(t), viewers);
    }
  },
  hide(id: string): void {
    removeClone(tokenClones, id, getMesh(getToken(id)), getToken(id)?.document as unknown as PlaceableDoc | undefined);
  },
  clearAll(): void { for (const [, c] of tokenClones) { c.parent?.removeChild(c); c.destroy(); } tokenClones.clear(); },
};

// ---- tile renderer ----

export const IsoTileRenderer: TileRenderer = {
  handlesPreview: true,
  create(tile: Tile): void {
    if (!needsTileClone(tile)) return;
    createClone(tileClones, tile.id, getMesh(tile), tile.document as unknown as PlaceableDoc);
  },
  sync(tile: Tile): void {
    const clone = tileClones.get(tile.id); if (!clone) return;
    const mesh  = getMesh(tile); if (!mesh) return;
    syncSprite(clone, mesh); mesh.alpha = 0;
    const doc = tile.document as unknown as PlaceableDoc;
    clone.alpha = docAlpha(doc);
    if (doc.hidden) { clone.visible = false; clone.tint = 0xffffff; clone.filters = null; }
    // visible/tint/filters preserved — fog state owned by onSightRefresh
  },
  rebuild(tile: Tile): void {
    if (!needsTileClone(tile)) { IsoTileRenderer.hide(tile.id); return; }
    if (!tileClones.has(tile.id)) IsoTileRenderer.create(tile);
  },
  onControl(_tile: Tile, _controlled: boolean): void { /* ISO has no selection behavior */ },
  onDestroy(id: string): void { IsoTileRenderer.hide(id); },
  onSightRefresh(): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    maybeInvalidateRestoredTiles(); // clear restored data if in-session fog reset detected
    tryRestoreFromStorage();         // one-time: populate restoredTileIds from localStorage after F5
    const viewers = getViewers();
    for (const t of (canvas.tiles?.placeables ?? []) as Tile[]) {
      const clone = tileClones.get(t.id); if (!clone) continue;
      const w = t.document.width ?? 0, h = t.document.height ?? 0;
      const mesh = getMesh(t);
      console.log(`[isoroll sr-before] id=${t.id} mesh.alpha=${(mesh as unknown as {alpha?:number})?.alpha} clone.visible=${clone.visible}`);
      // v14: doc.x/y is center; top-left = center - size/2
      applyTileFog(clone, t.document as unknown as PlaceableDoc, t.id,
        (t.document.x ?? 0) - w / 2, (t.document.y ?? 0) - h / 2, w, h,
        VolumeFlags.getHideOnFog(t.document), viewers);
      console.log(`[isoroll sr-after] id=${t.id} mesh.alpha=${(mesh as unknown as {alpha?:number})?.alpha} clone.visible=${clone.visible}`);
    }
  },
  hide(id: string): void {
    removeClone(tileClones, id, getMesh(getTile(id)), getTile(id)?.document as unknown as PlaceableDoc | undefined);
  },
  clearAll(): void { for (const [, c] of tileClones) { c.parent?.removeChild(c); c.destroy(); } tileClones.clear(); },
};

// ---- layer infrastructure ----

export const IsoSpriteLayer = {
  token: IsoTokenRenderer,
  tile:  IsoTileRenderer,
  getLayer(): PIXI.Container { return LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES); },
  _onTick(): void {
    LayerManager.enforceOrder();
    // Tile._refreshState() resets mesh.alpha=1 on every render flag cycle.
    // This ticker runs at priority -25 (after _refreshState at OBJECTS:23, after sightRefresh at PERCEPTION:2,
    // but before the GPU render), so it's the last word on mesh.alpha before each frame is drawn.
    for (const [id] of tileClones) {
      const tile = getTile(id);
      const mesh = tile ? getMesh(tile) : undefined;
      if (mesh) (mesh as unknown as { alpha: number }).alpha = 0;
    }
  },
  _onCanvasInit(): void {
    IsoTokenRenderer.clearAll(); IsoTileRenderer.clearAll(); clearSeenTiles();
    const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES);
    layer.sortableChildren = false; layer.eventMode = "passive";
    layer.name = "isoroll-iso-sprite-layer"; layer.zIndex = 500;
  },
  _teardown(): void {
    IsoTokenRenderer.clearAll(); IsoTileRenderer.clearAll();
    canvas.app?.ticker.remove(IsoSpriteLayer._onTick);
    LayerManager.clearLayer(LAYER_KEYS.ISO_SPRITES);
  },
  activate(): void {
    Hooks.on("canvasInit",  IsoSpriteLayer._onCanvasInit);
    Hooks.on("canvasReady", () => {
      canvas.app?.ticker.remove(IsoSpriteLayer._onTick);
      canvas.app?.ticker.add(IsoSpriteLayer._onTick, null, -25);
    });
    Hooks.on("changeScene", IsoSpriteLayer._teardown);
    Hooks.on("resetFogOfWar", () => { clearSeenTiles(); IsoTileRenderer.onSightRefresh(); });
    // Save explored tile set before F5/reload so restored tiles appear darkened without the 2-sec fog save debounce.
    window.addEventListener("beforeunload", saveSessionToStorage);
  },
};
