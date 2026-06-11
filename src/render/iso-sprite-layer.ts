// Iso Sprite Layer — PIXI.Container on canvas.stage outside VisibilityFilter scope.
// Clones of counter-transformed (untransformed) tokens/tiles live here.
// Originals stay in canvas.primary at alpha=0 for hit detection.

import { MODULE_ID, VolumeFlags } from "../core";
import { LayerManager, LAYER_KEYS } from "./layer-manager";

type Mesh = PIXI.DisplayObject & {
  texture?: PIXI.Texture;
  anchor?: PIXI.ObservablePoint;
  skew?: PIXI.ObservablePoint;
  scale?: PIXI.ObservablePoint;
  alpha?: number;
  rotation?: number;
};

type PlaceableDoc = { alpha?: unknown; hidden?: unknown };

/** Create a PIXI.Sprite clone whose transforms mirror a PrimarySpriteMesh. */
export function cloneSprite(mesh: Mesh): PIXI.Sprite | null {
  if (!mesh.texture) return null;
  const sprite = new PIXI.Sprite(mesh.texture);
  sprite.eventMode = "passive";
  syncSprite(sprite, mesh);
  return sprite;
}

/** Sync geometry transforms from mesh onto an existing clone sprite.
 *  Does NOT copy alpha or visible — both come from the document. */
export function syncSprite(sprite: PIXI.Sprite, mesh: Mesh): void {
  sprite.texture = mesh.texture ?? PIXI.Texture.EMPTY;
  sprite.position.set(mesh.x, mesh.y);
  if (mesh.anchor) sprite.anchor.set(mesh.anchor.x, mesh.anchor.y);
  if (mesh.skew)   sprite.skew.set(mesh.skew.x, mesh.skew.y);
  if (mesh.scale)  sprite.scale.set(mesh.scale.x, mesh.scale.y);
  sprite.rotation = mesh.rotation ?? 0;
}

// ---- shared clone utilities ----

function getMesh(obj: unknown): Mesh | undefined { return (obj as { mesh?: Mesh }).mesh; }
function docAlpha(doc: PlaceableDoc): number { return typeof doc.alpha === "number" ? doc.alpha : 1; }
function applyDocState(s: PIXI.Sprite, doc: PlaceableDoc): void { s.alpha = docAlpha(doc); s.visible = !doc.hidden; }

function createClone(map: Map<string, PIXI.Sprite>, id: string, mesh: Mesh | undefined, doc: PlaceableDoc): void {
  const old = map.get(id); if (old) { old.parent?.removeChild(old); old.destroy(); map.delete(id); }
  if (!mesh?.texture) return;
  const clone = cloneSprite(mesh);
  if (!clone) return;
  applyDocState(clone, doc);
  mesh.alpha = 0;
  IsoSpriteLayer.getLayer().addChild(clone);
  map.set(id, clone);
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

function createTokenClone(t: Token): void { createClone(tokenClones, t.id, getMesh(t), t.document as unknown as PlaceableDoc); }
function createTileClone(t: Tile):   void { createClone(tileClones,  t.id, getMesh(t), t.document as unknown as PlaceableDoc); }

function removeTokenClone(id: string, t?: Token): void {
  removeClone(tokenClones, id, t && getMesh(t), t?.document as unknown as PlaceableDoc | undefined);
}
function removeTileClone(id: string, t?: Tile): void {
  removeClone(tileClones, id, t && getMesh(t), t?.document as unknown as PlaceableDoc | undefined);
}

// ---- main export ----

export const IsoSpriteLayer = {
  activate(): void {
    Hooks.on("canvasInit",    IsoSpriteLayer._onCanvasInit);
    Hooks.on("canvasReady",   IsoSpriteLayer._onCanvasReady);
    Hooks.on("updateScene",   IsoSpriteLayer._onUpdateScene);
    Hooks.on("changeScene",   IsoSpriteLayer._teardown);
    Hooks.on("drawToken",     IsoSpriteLayer._onDrawToken);
    Hooks.on("refreshToken",  IsoSpriteLayer._onRefreshToken);
    Hooks.on("destroyToken",  IsoSpriteLayer._onDestroyToken);
    Hooks.on("drawTile",      IsoSpriteLayer._onDrawTile);
    Hooks.on("refreshTile",   IsoSpriteLayer._onRefreshTile);
    Hooks.on("destroyTile",   IsoSpriteLayer._onDestroyTile);
  },

  getLayer(): PIXI.Container { return LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITE_LAYER); },

  // ---- token hooks ----

  _onDrawToken(token: Token): void {
    if (!VolumeFlags.isSceneEnabled() || !needsTokenClone(token)) return;
    createTokenClone(token);
  },

  _onRefreshToken(token: Token): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    const clone = tokenClones.get(token.id); if (!clone) return;
    if (!needsTokenClone(token)) { removeTokenClone(token.id, token); return; }
    const mesh = getMesh(token); if (!mesh) return;
    syncSprite(clone, mesh);
    applyDocState(clone, token.document as unknown as PlaceableDoc);
    mesh.alpha = 0;
  },

  _onDestroyToken(token: Token): void { removeTokenClone(token.id, token); },

  // ---- tile hooks ----

  _onDrawTile(tile: Tile): void {
    if (!VolumeFlags.isSceneEnabled() || !needsTileClone(tile)) return;
    createTileClone(tile);
  },

  _onRefreshTile(tile: Tile): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    const clone = tileClones.get(tile.id); if (!clone) return;
    if (!needsTileClone(tile)) { removeTileClone(tile.id, tile); return; }
    const mesh = getMesh(tile); if (!mesh) return;
    syncSprite(clone, mesh);
    applyDocState(clone, tile.document as unknown as PlaceableDoc);
    mesh.alpha = 0;
  },

  _onDestroyTile(tile: Tile): void { removeTileClone(tile.id, tile); },

  // ---- sort ----

  /** Sort IsoSpriteLayer clones by isometric depth.
   *  Tiles: primary key = doc.sort band; secondary = bottom-right corner.
   *  Tokens: x + y + elevation, same axis as DepthSorter. */
  _sort(): void {
    const layer = IsoSpriteLayer.getLayer();
    const g = canvas.grid?.size ?? 100;
    const BAND = 1e6;
    for (const t of (canvas.tokens?.placeables ?? []) as Token[]) {
      const clone = tokenClones.get(t.id); if (!clone) continue;
      const d = t.document;
      clone.zIndex = (d.x ?? 0) / g + (d.y ?? 0) / g + ((d as unknown as { elevation?: number }).elevation ?? 0) / g;
    }
    for (const t of (canvas.tiles?.placeables ?? []) as Tile[]) {
      const clone = tileClones.get(t.id); if (!clone) continue;
      const d = t.document;
      const sort = (d as unknown as { sort?: number }).sort ?? 0;
      clone.zIndex = sort * BAND + ((d.y ?? 0) + (d.height ?? g)) / g + ((d.x ?? 0) + (d.width ?? g)) / g;
    }
    layer.sortableChildren = true;
    layer.sortChildren();
    layer.sortableChildren = false;
  },

  // ---- lifecycle ----

  _onCanvasReady(): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    for (const t of (canvas.tokens?.placeables ?? []) as Token[])
      if (needsTokenClone(t) && !tokenClones.has(t.id)) createTokenClone(t);
    for (const t of (canvas.tiles?.placeables ?? []) as Tile[])
      if (needsTileClone(t) && !tileClones.has(t.id)) createTileClone(t);
  },

  _onUpdateScene(scene: Scene): void {
    if ((scene as unknown as { id?: string }).id !== canvas.scene?.id) return;
    for (const [id, c] of tokenClones) { c.parent?.removeChild(c); c.destroy(); tokenClones.delete(id); }
    for (const [id, c] of tileClones)  { c.parent?.removeChild(c); c.destroy(); tileClones.delete(id); }
    IsoSpriteLayer._onCanvasReady();
  },

  _onCanvasInit(): void {
    tokenClones.clear(); tileClones.clear();
    const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITE_LAYER);
    layer.sortableChildren = false;
    layer.eventMode = "passive";
    layer.name = "isoroll-iso-sprite-layer";
  },

  _teardown(): void {
    tokenClones.clear(); tileClones.clear();
    LayerManager.clearLayer(LAYER_KEYS.ISO_SPRITE_LAYER);
  },
};
