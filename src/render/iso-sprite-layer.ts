// Iso Sprite Layer — PIXI.Container on canvas.stage outside VisibilityFilter scope.
// Counter-transformed token/tile clones live here; originals stay in canvas.primary at alpha=0.

import { LayerManager, LAYER_KEYS } from "./layer-manager";

type Mesh = PIXI.DisplayObject & {
  texture?: PIXI.Texture;
  anchor?: PIXI.ObservablePoint;
  skew?: PIXI.ObservablePoint;
  scale?: PIXI.ObservablePoint;
  alpha?: number;
};

/** Create a PIXI.Sprite clone whose transforms mirror a PrimarySpriteMesh. */
export function cloneSprite(mesh: Mesh): PIXI.Sprite | null {
  if (!mesh.texture) return null;
  const sprite = new PIXI.Sprite(mesh.texture);
  sprite.eventMode = "passive";
  syncSprite(sprite, mesh);
  return sprite;
}

/** Sync all visual transforms from mesh onto an existing clone sprite. */
export function syncSprite(sprite: PIXI.Sprite, mesh: Mesh): void {
  sprite.texture = mesh.texture ?? PIXI.Texture.EMPTY;
  sprite.position.set(mesh.x, mesh.y);
  if (mesh.anchor) sprite.anchor.set(mesh.anchor.x, mesh.anchor.y);
  if (mesh.skew)   sprite.skew.set(mesh.skew.x, mesh.skew.y);
  if (mesh.scale)  sprite.scale.set(mesh.scale.x, mesh.scale.y);
  // rotation is in radians; angle (degrees) derives from it — set rotation directly
  sprite.rotation = (mesh as { rotation?: number }).rotation ?? 0;
  sprite.alpha = mesh.alpha ?? 1;
}

export const IsoSpriteLayer = {
  activate(): void {
    Hooks.on("canvasInit", IsoSpriteLayer._onCanvasInit);
    Hooks.on("changeScene", IsoSpriteLayer._teardown);
  },

  getLayer(): PIXI.Container {
    return LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITE_LAYER);
  },

  _onCanvasInit(): void {
    const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITE_LAYER);
    layer.sortableChildren = false;
    layer.eventMode = "passive";
    layer.name = "isoroll-iso-sprite-layer";
  },

  _teardown(): void {
    LayerManager.clearLayer(LAYER_KEYS.ISO_SPRITE_LAYER);
  },
};
