// Public API for the render module — central PIXI layer registry
export { LayerManager, LAYER_KEYS, destroyMapped } from './layer-manager';
export { IsoSpriteLayer, cloneSprite, syncSprite } from './iso-sprite-layer';
export { RenderGate } from './render-gate';
export type { TokenRenderer } from './token-renderer';
export type { TileRenderer } from './tile-renderer';
