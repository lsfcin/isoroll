// Public API for the transform module — stage, object, and coordinate transforms
export type { IsoProjection } from './constants';
export { PROJECTION_TYPES, DIMETRIC_2_1, getProjection, currentProjection } from './constants';
export { CanvasTransform } from './stage-transform';
export { getBgYScale, setBgYScaleOverride, BackgroundTransform } from './bg-transform';
export { DEBUG_COORD, drawCoordDebug } from './coord-debug';
export { ObjectTransform } from './object-transform';
export { registerRulerPatch } from './ruler-patch';
export { onRefreshTile, onUpdateTileFlags, onPreUpdateScene, onUpdateSceneGridRescale } from './tile-transform';
export type { MutMeshLike } from './tile-transform';
export { onRefreshToken } from './token-transform';
export type { P2, P3, AffineMatrix, TileMeshCoord } from './coord-types';
export { transformCoord } from './coord-map';
