// Iso Sprite Layer — PIXI.Container on canvas.stage outside VisibilityFilter scope.
// Clones of counter-transformed (untransformed) tokens/tiles live here.
// Originals stay in canvas.primary at alpha=0 for hit detection.

import { MODULE_ID, VolumeFlags } from "../core";
import { LayerManager, LAYER_KEYS } from "./layer-manager";
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

type PlaceableDoc = { alpha?: unknown; hidden?: unknown };
type Center = { x: number; y: number };

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

function getMesh(obj: unknown): Mesh | undefined {
  const m = (obj as { mesh?: Mesh }).mesh;
  return m?.texture ? m : undefined;
}
function docAlpha(doc: PlaceableDoc): number { return typeof doc.alpha === "number" ? doc.alpha : 1; }
function applyDocState(s: PIXI.Sprite, doc: PlaceableDoc): void { s.alpha = docAlpha(doc); s.visible = !doc.hidden; }
function tokenCenter(t: Token): Center { return (t as unknown as { center?: Center }).center ?? { x: t.x, y: t.y }; }
function tileCenter(t: Tile): Center   { return { x: t.x + (t.w ?? 0) / 2, y: t.y + (t.h ?? 0) / 2 }; }

/** Fog-aware visibility. Only call from sightRefresh — testVisibility is expensive per-frame. */
function applyFogState(s: PIXI.Sprite, doc: PlaceableDoc, p: Center, obj: Token | Tile): void {
  if (doc.hidden) { s.visible = false; return; }
  s.alpha = docAlpha(doc);
  s.visible = !canvas.scene?.tokenVision || !!(game.user as { isGM?: boolean })?.isGM
    || !!(canvas.visibility?.testVisibility(p, { object: obj }));
}

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

function getToken(id: string): Token | undefined {
  return (canvas.tokens as unknown as { get?(id: string): Token | undefined })?.get?.(id);
}
function getTile(id: string): Tile | undefined {
  return (canvas.tiles as unknown as { get?(id: string): Tile | undefined })?.get?.(id);
}

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
    syncSprite(clone, mesh);
    applyDocState(clone, token.document as unknown as PlaceableDoc);
    mesh.alpha = 0;
  },

  rebuild(token: Token): void {
    if (!needsTokenClone(token)) { IsoTokenRenderer.hide(token.id); return; }
    if (!tokenClones.has(token.id)) IsoTokenRenderer.create(token);
  },

  onControl(_token: Token, _controlled: boolean): void { /* ISO has no selection behavior */ },

  onDestroy(id: string): void { IsoTokenRenderer.hide(id); },

  onSightRefresh(): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    for (const t of (canvas.tokens?.placeables ?? []) as Token[]) {
      const clone = tokenClones.get(t.id); if (!clone) continue;
      applyFogState(clone, t.document as unknown as PlaceableDoc, tokenCenter(t), t);
    }
  },

  hide(id: string): void {
    const token = getToken(id);
    removeClone(tokenClones, id, getMesh(token), token?.document as unknown as PlaceableDoc | undefined);
  },

  clearAll(): void {
    for (const [, c] of tokenClones) { c.parent?.removeChild(c); c.destroy(); }
    tokenClones.clear();
  },
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
    syncSprite(clone, mesh);
    applyDocState(clone, tile.document as unknown as PlaceableDoc);
    mesh.alpha = 0;
  },

  rebuild(tile: Tile): void {
    if (!needsTileClone(tile)) { IsoTileRenderer.hide(tile.id); return; }
    if (!tileClones.has(tile.id)) IsoTileRenderer.create(tile);
  },

  onControl(_tile: Tile, _controlled: boolean): void { /* ISO has no selection behavior */ },

  onDestroy(id: string): void { IsoTileRenderer.hide(id); },

  onSightRefresh(): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    for (const t of (canvas.tiles?.placeables ?? []) as Tile[]) {
      const clone = tileClones.get(t.id); if (!clone) continue;
      applyFogState(clone, t.document as unknown as PlaceableDoc, tileCenter(t), t);
    }
  },

  hide(id: string): void {
    const tile = getTile(id);
    removeClone(tileClones, id, getMesh(tile), tile?.document as unknown as PlaceableDoc | undefined);
  },

  clearAll(): void {
    for (const [, c] of tileClones) { c.parent?.removeChild(c); c.destroy(); }
    tileClones.clear();
  },
};

// ---- layer infrastructure ----

export const IsoSpriteLayer = {
  token: IsoTokenRenderer,
  tile:  IsoTileRenderer,

  getLayer(): PIXI.Container { return LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITE_LAYER); },

  /** Runs every frame at LOW priority — after Foundry adds fog containers — to keep isoroll layers above fog. */
  _onTick(): void { LayerManager.enforceOrder(); },

  _onCanvasInit(): void {
    IsoTokenRenderer.clearAll();
    IsoTileRenderer.clearAll();
    const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITE_LAYER);
    layer.sortableChildren = false;
    layer.eventMode = "passive";
    layer.name = "isoroll-iso-sprite-layer";
    layer.zIndex = 500;
  },

  _teardown(): void {
    IsoTokenRenderer.clearAll();
    IsoTileRenderer.clearAll();
    canvas.app?.ticker.remove(IsoSpriteLayer._onTick);
    LayerManager.clearLayer(LAYER_KEYS.ISO_SPRITE_LAYER);
  },

  /** Registers ticker (layer-order enforcement) and infrastructure hooks only.
   *  Foundry render hooks are handled by the gate via IsoSpriteLayer.token / .tile. */
  activate(): void {
    Hooks.on("canvasInit",  IsoSpriteLayer._onCanvasInit);
    Hooks.on("canvasReady", () => {
      canvas.app?.ticker.remove(IsoSpriteLayer._onTick);
      canvas.app?.ticker.add(IsoSpriteLayer._onTick, null, -25);
    });
    Hooks.on("changeScene", IsoSpriteLayer._teardown);
  },
};
