// Iso Sprite Layer — PIXI.Container on canvas.stage outside VisibilityFilter scope.
// Clones of counter-transformed (untransformed) tokens/tiles live here.
// Originals stay in canvas.primary at alpha=0 for hit detection.

import { MODULE_ID, VolumeFlags, CanvasEnv } from "../core";
import { LayerManager, LAYER_KEYS } from "./layer-manager";
import { PlaceableDoc, docAlpha, applyDocState, applyTokenFog, clearSeenTiles, getViewers, saveSessionToStorage } from "./fog-helpers";
import type { TokenRenderer } from "./token-renderer";
import { tileSlices, IsoTileRenderer, DEPTH_SCALE } from "./iso-tile-renderer";

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
  if (!obj) return undefined;
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
function needsTokenClone(t: Token): boolean { return t.document.getFlag(MODULE_ID, "transformToken") !== true; }
const getToken = (id: string) => CanvasEnv.getToken(id);
const getTile  = (id: string) => CanvasEnv.getTile(id);

function _updateTokenZIndex(token: Token): void {
  const clone = tokenClones.get(token.id); if (!clone) return;
  const gs   = CanvasEnv.gridSize();
  const elev = (token.document.elevation ?? 0) / gs;
  // Depth = row - col (y/gs - x/gs): NE-camera viewpoint where SW face is closest.
  // Replace with view-dependent formula when implementing the 8+1 multiview strategy.
  // +0.5 places token strictly between adjacent tile slice depths — eliminates insertion-order ties.
  clone.zIndex = (token.y / gs - token.x / gs + elev + 0.5) * DEPTH_SCALE;
}

// ---- token renderer ----

export const IsoTokenRenderer: TokenRenderer = {
  handlesPreview: true,
  create(token: Token): void {
    if (!needsTokenClone(token)) return;
    createClone(tokenClones, token.id, getMesh(token), token.document as unknown as PlaceableDoc);
    _updateTokenZIndex(token);
  },
  sync(token: Token): void {
    const clone = tokenClones.get(token.id); if (!clone) return;
    const mesh  = getMesh(token); if (!mesh) return;
    syncSprite(clone, mesh); mesh.alpha = 0;
    _updateTokenZIndex(token);
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
    for (const t of CanvasEnv.tokens()) {
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

// ---- layer infrastructure ----

export const IsoSpriteLayer = {
  token: IsoTokenRenderer,
  tile:  IsoTileRenderer,
  getLayer(): PIXI.Container { return LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES); },
  _onTick(): void {
    LayerManager.enforceOrder();
    const gs = CanvasEnv.gridSize();
    // Tile._refreshState() resets mesh.alpha=1 on every render flag cycle.
    // This ticker runs at priority -25 (after _refreshState at OBJECTS:23, after sightRefresh at PERCEPTION:2,
    // but before the GPU render), so it's the last word on mesh.alpha before each frame is drawn.
    for (const [id] of tileSlices) {
      const tile = getTile(id);
      const mesh = tile ? getMesh(tile) : undefined;
      if (mesh) (mesh as unknown as { alpha: number }).alpha = 0;
    }
    // Update token zIndex every tick using animated token.x/y (not document.x/y) so depth tracks
    // the visual position during movement animations rather than the committed destination.
    for (const [id, clone] of tokenClones) {
      const token = getToken(id);
      if (!token) continue;
      const elev = (token.document.elevation ?? 0) / gs;
      clone.zIndex = (token.y / gs - token.x / gs + elev + 0.5) * DEPTH_SCALE;
    }
    // PIXI v8 doesn't auto-call sortChildren() from sortableChildren alone — force it every tick.
    IsoSpriteLayer.getLayer().sortChildren();
  },
  _onCanvasInit(): void {
    IsoTokenRenderer.clearAll(); IsoTileRenderer.clearAll(); clearSeenTiles();
    const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES);
    layer.sortableChildren = true; layer.eventMode = "passive";
    layer.name = "isoroll-iso-sprite-layer"; layer.zIndex = 500;
  },
  _teardown(): void {
    IsoTokenRenderer.clearAll(); IsoTileRenderer.clearAll();
    CanvasEnv.appTicker().remove(IsoSpriteLayer._onTick);
    LayerManager.clearLayer(LAYER_KEYS.ISO_SPRITES);
  },
  _sort(): void {},
  onCanvasReady(): void {
    CanvasEnv.appTicker().remove(IsoSpriteLayer._onTick);
    CanvasEnv.appTicker().add(IsoSpriteLayer._onTick, null, -25);
  },
  onResetFogOfWar(): void { clearSeenTiles(); IsoTileRenderer.onSightRefresh(); },
  activate(): void {
    // Hooks registered in core/hook-registry.ts. Non-hook setup only:
    // Save explored tile set before F5/reload so restored tiles appear darkened without the 2-sec fog save debounce.
    window.addEventListener("beforeunload", saveSessionToStorage);
  },
};
