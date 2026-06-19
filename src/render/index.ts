// Public API for the render module — central PIXI layer registry
export { LayerManager, LAYER_KEYS, destroyMapped } from './layer-manager';
export { IsoSpriteLayer, cloneSprite, syncSprite } from './iso-sprite-layer';
export { RenderGate } from './render-gate';
export type { TokenRenderer } from './token-renderer';
export type { TileRenderer } from './tile-renderer';
export { IsoRenderer } from './iso-renderer';
export type { RenderSpec, RenderHandle, ShapeSpec, Interaction, Placement, DrawAPI, P2, P3, Color, Stroke, TextStyleSpec, TextureRef, CSSCursor, CoordSystem, LayerKey, VisibilityMode } from './iso-renderer';
export { IsoGeometry } from './iso-geometry';
export type { WorldBoxVerts, TileFootprint, P2 as GeomP2 } from './iso-geometry';
export { MeshAccessor } from './mesh-accessor';
export type { MeshGeometry } from './mesh-accessor';
export * from './render-lifecycle';
