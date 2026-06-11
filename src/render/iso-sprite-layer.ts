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
  visible?: boolean;
};

/** Create a PIXI.Sprite clone whose transforms mirror a PrimarySpriteMesh. */
export function cloneSprite(mesh: Mesh): PIXI.Sprite | null {
  if (!mesh.texture) return null;
  const sprite = new PIXI.Sprite(mesh.texture);
  sprite.eventMode = "passive";
  syncSprite(sprite, mesh);
  return sprite;
}

/** Sync geometry transforms from mesh onto an existing clone sprite.
 *  Does NOT copy alpha or visible — mesh.alpha is 0 (we set it); both come
 *  from the document instead so transient Foundry states don't hide the clone. */
export function syncSprite(sprite: PIXI.Sprite, mesh: Mesh): void {
  sprite.texture = mesh.texture ?? PIXI.Texture.EMPTY;
  sprite.position.set(mesh.x, mesh.y);
  if (mesh.anchor) sprite.anchor.set(mesh.anchor.x, mesh.anchor.y);
  if (mesh.skew)   sprite.skew.set(mesh.skew.x, mesh.skew.y);
  if (mesh.scale)  sprite.scale.set(mesh.scale.x, mesh.scale.y);
  sprite.rotation = mesh.rotation ?? 0;
}

// ---- clone registries ----

const tokenClones = new Map<string, PIXI.Sprite>();

function needsTokenClone(token: Token): boolean {
  return token.document.getFlag(MODULE_ID, "transformToken") !== true;
}

function docAlpha(doc: { alpha?: unknown }): number {
  return typeof doc.alpha === "number" ? doc.alpha : 1;
}

type TokenDoc = { alpha?: unknown; hidden?: unknown };

function applyDocState(clone: PIXI.Sprite, doc: TokenDoc): void {
  clone.alpha   = docAlpha(doc);
  clone.visible = !doc.hidden;
}

function createTokenClone(token: Token): void {
  removeTokenClone(token.id, token);
  const mesh = (token as unknown as { mesh?: Mesh }).mesh;
  if (!mesh?.texture) return;
  const clone = cloneSprite(mesh);
  if (!clone) return;
  applyDocState(clone, token.document as unknown as TokenDoc);
  mesh.alpha = 0;
  IsoSpriteLayer.getLayer().addChild(clone);
  tokenClones.set(token.id, clone);
}

function removeTokenClone(tokenId: string, token?: Token): void {
  const clone = tokenClones.get(tokenId);
  if (!clone) return;
  clone.parent?.removeChild(clone);
  clone.destroy();
  tokenClones.delete(tokenId);
  if (token) {
    const mesh = (token as unknown as { mesh?: Mesh }).mesh;
    if (mesh) mesh.alpha = docAlpha(token.document as unknown as { alpha?: unknown });
  }
}

export const IsoSpriteLayer = {
  activate(): void {
    Hooks.on("canvasInit",    IsoSpriteLayer._onCanvasInit);
    Hooks.on("changeScene",   IsoSpriteLayer._teardown);
    Hooks.on("drawToken",     IsoSpriteLayer._onDrawToken);
    Hooks.on("refreshToken",  IsoSpriteLayer._onRefreshToken);
    Hooks.on("destroyToken",  IsoSpriteLayer._onDestroyToken);
  },

  getLayer(): PIXI.Container {
    return LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITE_LAYER);
  },

  // ---- token hooks ----

  _onDrawToken(token: Token): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (!needsTokenClone(token)) return;
    createTokenClone(token);
  },

  _onRefreshToken(token: Token): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    const clone = tokenClones.get(token.id);
    if (!clone) return;
    if (!needsTokenClone(token)) { removeTokenClone(token.id, token); return; }
    const mesh = (token as unknown as { mesh?: Mesh }).mesh;
    if (!mesh) return;
    syncSprite(clone, mesh);
    applyDocState(clone, token.document as unknown as TokenDoc);
    mesh.alpha = 0;
  },

  _onDestroyToken(token: Token): void {
    removeTokenClone(token.id, token);
  },

  // ---- lifecycle ----

  _onCanvasInit(): void {
    tokenClones.clear();
    const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITE_LAYER);
    layer.sortableChildren = false;
    layer.eventMode = "passive";
    layer.name = "isoroll-iso-sprite-layer";
  },

  _teardown(): void {
    tokenClones.clear();
    LayerManager.clearLayer(LAYER_KEYS.ISO_SPRITE_LAYER);
  },
};
